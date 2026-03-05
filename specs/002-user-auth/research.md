# Research: User Authentication & Per-User Data Isolation

**Branch**: `002-user-auth` | **Date**: 2026-03-04

---

## R-01: Sprout HR Auth Login Flow

**Decision**: Call the Sprout HR Auth IdentityServer4 token endpoint from the ReadyWealth backend using the Resource Owner Password grant.

**Endpoint pattern** (confirmed from TimeAttendance codebase):
```
POST {HrAuthBaseAddress}/connect/token
Content-Type: application/x-www-form-urlencoded

client_id=<CLIENT_ID>
client_secret=<CLIENT_SECRET>
username=<USERNAME>
password=<PASSWORD>
grant_type=password
```

The `username` field carries the Sprout login name. The `domain` the user supplies in the ReadyWealth login form is used to resolve the correct `HrDatabaseName` / tenant within Sprout — it is passed as part of the credential payload (confirmed via `SessionDataHr.DomainName` in GenericClaimAccessor).

**JWT claims returned** (from `ResourceOwnerPasswordValidator` + `ProfileService`):
- `SessionDataClaim` — JSON-serialized object with: `EmployeeId`, `EmpIdNo`, `ClientId`, `CompanyId`, `DepartmentId`, `HrDatabaseName`, `DomainName`, `FirstName`, `LastName`, `Username`, `IsActive`, `PayrollDatabase`, `ScheduleTypeId`, `TotalWorkHours`
- `sub` — subject identifier

**Token lifetime**: 3600 seconds (1 hour); refresh token valid 15 days.

**ReadyWealth user identity key**: `SessionDataClaim.EmployeeId` (int) — globally unique per Sprout employee. Used as the foreign-key reference on all ReadyWealth data entities.

**Rationale**: Using the existing IdentityServer4 ROPC flow requires zero changes to Sprout infrastructure. ReadyWealth acts as a confidential client — it holds `client_id` and `client_secret` server-side, never exposing them to the browser.

**Alternatives considered**:
- Keycloak `/realms/{domain}/protocol/openid-connect/token` — same grant type but different URL pattern; not confirmed for the production Sprout environment; stick with `/connect/token`.
- OAuth2 authorization code flow (SSO redirect) — rejected per clarification Q1 (user prefers hosted login form).

---

## R-02: HttpOnly Cookie Token Storage

**Decision**: After validating credentials against Sprout, the ReadyWealth backend sets the JWT in an HttpOnly, Secure, SameSite=Strict cookie. The raw token is never sent to the frontend.

**Implementation pattern** (.NET 10 Minimal API):
```csharp
context.Response.Cookies.Append("rw_auth", jwt, new CookieOptions
{
    HttpOnly  = true,
    Secure    = true,
    SameSite  = SameSiteMode.Strict,
    Expires   = DateTimeOffset.UtcNow.AddSeconds(3600)
});
```

**JWT validation from cookie** — configure `JwtBearerEvents.OnMessageReceived` to extract token from the `rw_auth` cookie:
```csharp
options.Events = new JwtBearerEvents
{
    OnMessageReceived = ctx =>
    {
        if (ctx.Request.Cookies.TryGetValue("rw_auth", out var token))
            ctx.Token = token;
        return Task.CompletedTask;
    }
};
```

**Validation parameters**: Same `AppSettings:Secret` symmetric key as the Sprout LocalAuth scheme. `ValidateIssuer = false`, `ValidateAudience = false`, `ValidateLifetime = true`.

**Logout**: Backend calls `context.Response.Cookies.Delete("rw_auth")`.

**Rationale**: HttpOnly prevents JavaScript/XSS token theft. SameSite=Strict provides CSRF protection without a separate CSRF token. No new dependencies needed — `Microsoft.AspNetCore.Authentication.JwtBearer` is already a standard ASP.NET Core package.

**Alternatives considered**:
- `localStorage` — rejected per clarification Q2 (XSS risk).
- `sessionStorage` — tab-scoped, loses session on tab close; poor UX for a trading dashboard.

---

## R-03: Vue 3 Auth Route Guard

**Decision**: Use a global `router.beforeEach` navigation guard. Protected routes are marked with `meta: { requiresAuth: true }`. Auth state is held in a new `useAuthStore` Pinia store.

**Pattern**:
```typescript
router.beforeEach(async (to) => {
  if (!to.meta.requiresAuth) return true
  const auth = useAuthStore()
  if (!auth.isAuthenticated) {
    // Verify session via GET /api/v1/auth/me (handles page refresh)
    await auth.fetchMe()
  }
  if (!auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
})
```

`fetchMe()` calls `GET /api/v1/auth/me` — the backend reads the cookie and returns the current user profile. On 401 the store marks the user as unauthenticated.

**On login**: After `POST /api/v1/auth/login` succeeds, the cookie is set server-side; frontend receives only user profile JSON. `authStore.setUser(profile)` hydrates the store.

**On logout**: `POST /api/v1/auth/logout` → cookie deleted server-side → `authStore.clearUser()` → redirect to `/login`.

**On session expiry**: Any API call returns 401 → `axios` interceptor catches → redirect to `/login?redirect=<current path>`.

**Rationale**: Cookie-based sessions mean the guard cannot read the token from JS; the lightweight `GET /api/v1/auth/me` ping (cached in Pinia) avoids redundant calls on every navigation.

**Alternatives considered**:
- Check cookie presence in JS — impossible with HttpOnly cookies.
- Store auth flag in localStorage — survives page refresh but is a stale indicator; `fetchMe` is more reliable.

---

## R-04: EF Core User-Scoped Data & Migration

**Decision**: Add a `User` entity and a `UserId` (string, stores `EmployeeId.ToString()`) foreign key to `Wallet`, `Position`, and `Transaction`. Use EF Core Global Query Filters to enforce row-level isolation automatically.

**Migration approach for SQLite** (cannot add FK to existing column in one step):
1. Add `UserId` as nullable string to all three tables.
2. Delete all existing seed/dev rows (no migration needed — dev data is discarded per clarification Q5).
3. Make `UserId` NOT NULL via table rebuild migration.
4. Add FK constraints.

**Global Query Filter** (scoped per request via `ICurrentUserService`):
```csharp
modelBuilder.Entity<Wallet>()
    .HasQueryFilter(w => w.UserId == _currentUserService.UserId);
```

**`ICurrentUserService`**: Scoped service that reads `SessionDataClaim.EmployeeId` from `IHttpContextAccessor`. Injected into `ReadyWealthDbContext` constructor.

**First-login provisioning**: After `User` is created, a `Wallet` row is inserted with `Balance = 300_000m`. All in a single DB transaction.

**Rationale**: Global Query Filters enforce isolation at the ORM layer — no risk of a developer forgetting to add a `.Where(x => x.UserId == userId)` clause. `ICurrentUserService` is the single source of truth for the current user identity across all services.

**Alternatives considered**:
- Per-query filtering — rejected (error-prone; easy to forget).
- Row-Level Security at DB level — overkill for SQLite hackathon scope.

---

## R-05: No New Dependencies Required

All required capabilities are covered by the existing stack:
- `Microsoft.AspNetCore.Authentication.JwtBearer` — already in ASP.NET Core
- `System.Net.Http` (`HttpClient` / `IHttpClientFactory`) — standard runtime
- `Microsoft.EntityFrameworkCore` — already in use
- `IHttpContextAccessor` — standard ASP.NET Core

No new NuGet packages needed. Frontend: no new npm packages — `axios` interceptors and Vue Router `beforeEach` are already available.
