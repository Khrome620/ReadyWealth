# ReadyWealth Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-03-03

## Active Technologies
- TypeScript 5.9 (frontend) + C# 13 / .NET 10 (backend) + Vue 3 + Pinia + vue-router + design-system-next v2.27.9 (frontend); ASP.NET Core 10 Minimal API + EF Core 10 + `Microsoft.AspNetCore.Authentication.JwtBearer` (backend) (002-user-auth)
- SQLite via EF Core (dev); migrations add `User` table + `UserId` FK columns (002-user-auth)

- TypeScript 5.9 (frontend) + C# 13 / .NET 10 (backend) + Vue 3 + Pinia + vue-router + design-system-next v2.27.9 (frontend); ASP.NET Core 10 Minimal API + EF Core 10 (backend) (001-investment-dashboard)

## Project Structure

```text
backend/
frontend/
tests/
```

## Commands

npm test; npm run lint

## Code Style

TypeScript 5.9 (frontend) + C# 13 / .NET 10 (backend): Follow standard conventions

## Recent Changes
- 002-user-auth: Added TypeScript 5.9 (frontend) + C# 13 / .NET 10 (backend) + Vue 3 + Pinia + vue-router + design-system-next v2.27.9 (frontend); ASP.NET Core 10 Minimal API + EF Core 10 + `Microsoft.AspNetCore.Authentication.JwtBearer` (backend)

- 001-investment-dashboard: Added TypeScript 5.9 (frontend) + C# 13 / .NET 10 (backend) + Vue 3 + Pinia + vue-router + design-system-next v2.27.9 (frontend); ASP.NET Core 10 Minimal API + EF Core 10 (backend)

<!-- MANUAL ADDITIONS START -->

## Architecture Notes

- **Frontend**: Vue 3 SPA (NOT React — see constitution deviation in plan.md). Design system (`design-system-next`) is installed as a Vue plugin via `app.use(DesignSystem)` — all `Spr*` components are globally registered. **Do NOT import Spr* components in `<script setup>`**.
- **Backend**: .NET 10 Minimal API. Target path: `backend/ReadyWealth.Api/`.
- **Data layers are abstracted**: `IMarketService` (frontend) / `IMarketDataService` (backend) are swap boundaries for real-time PSE feed. `IOrderService` / `IPaperOrderService` are swap boundaries for real brokerage.
- **Persistence**: SQLite (dev) / SQLite `:memory:` (tests). Swap to PostgreSQL by changing one line.

## Auth Infrastructure (002-user-auth)

- **Cookie auth**: JWT is stored in HttpOnly `rw_auth` cookie set by `POST /api/v1/auth/login`. JwtBearer middleware reads it via `OnMessageReceived` event.
- **ICurrentUserService**: Scoped service that reads `SessionDataClaim.EmployeeId` from the authenticated JWT principal. Inject it wherever the current user's ID is needed. **Never use `HttpContextAccessor` directly.**
- **Global Query Filters**: `AppDbContext` applies EF Core query filters on `Wallet`, `Order`, and `Transaction` using `ICurrentUserService.UserId`. All queries are automatically user-scoped — no manual `WHERE UserId = ?` needed.
- **`IgnoreQueryFilters()`**: Use when you need to bypass the filter for an explicit owner check (e.g., close-position 403 guard).
- **Auth store**: `frontend/src/stores/auth.ts` — `user`, `isAuthenticated`, `login()`, `logout()`, `fetchMe()`.
- **Route guard**: `router.beforeEach` in `frontend/src/router/index.ts` calls `fetchMe()` once and redirects unauthenticated users to `/login?redirect=<path>`.
- **401 interceptor**: `frontend/src/main.ts` wires `setup401Interceptor` — shows "Session expired" toast only when already authenticated, then redirects to login.
- **AuthenticatedTestFactory**: Integration test factory in `backend/ReadyWealth.Tests/TestHelpers/`. Seeds a test User + Wallet (₱300,000) and registers `FakeCurrentUserService("test-user-1")` as `ICurrentUserService`.

## Key File Paths

| Path | Purpose |
|------|---------|
| `frontend/src/main.ts` | Vue app bootstrap + 401 interceptor |
| `frontend/src/stores/` | 7 Pinia stores: market, wallet, positions, transactions, watchlist, advice, **auth** |
| `frontend/src/services/AuthService.ts` | axios login/logout/fetchMe + 401 interceptor setup |
| `frontend/src/composables/useAuth.ts` | Thin wrapper around authStore |
| `frontend/src/views/LoginView.vue` | Login page (domain + username + password) |
| `frontend/src/services/` | IMarketService, IOrderService + Mock/Paper implementations |
| `frontend/src/composables/useSnack.ts` | Toast notifications via DS snackbar store |
| `backend/ReadyWealth.Api/Auth/AuthEndpoints.cs` | POST /login, POST /logout, GET /me |
| `backend/ReadyWealth.Api/Auth/SproutAuthService.cs` | Resource Owner Password grant to Sprout HR |
| `backend/ReadyWealth.Api/Services/CurrentUserService.cs` | Reads EmployeeId from JWT SessionDataClaim |
| `backend/ReadyWealth.Api/Persistence/AppDbContext.cs` | Global Query Filters on Wallet/Order/Transaction |
| `backend/ReadyWealth.Api/Migrations/` | `InitialCreate` + `AddUserAuthSchema` |
| `backend/ReadyWealth.Tests/TestHelpers/AuthenticatedTestFactory.cs` | Shared test factory with seeded user |
| `backend/ReadyWealth.Tests/TestHelpers/FakeCurrentUserService.cs` | Test double for ICurrentUserService |
| `specs/001-investment-dashboard/plan.md` | Full implementation plan |
| `specs/001-investment-dashboard/contracts/api.md` | REST API endpoint contracts |
| `specs/001-investment-dashboard/data-model.md` | All domain entity definitions |
| `.specify/memory/constitution.md` | Project constitution v1.1.0 |

## Frontend Dev Commands

```bash
cd frontend
npm run dev        # Vite dev server (mock mode, no backend needed)
npm run build      # Production build → dist/
npm test           # Vitest unit tests
npm run lint       # ESLint
```

## Backend Dev Commands

```bash
cd backend/ReadyWealth.Api
dotnet run                    # Start API server (port 5124)
dotnet test ../ReadyWealth.Tests/  # Run all tests
dotnet ef migrations add <Name>   # Add migration (server must be stopped first)
```

## Constitution Deviations (documented)

| Deviation | Justification |
|-----------|---------------|
| Vue 3 instead of React | `design-system-next` is Vue 3-only; no React equivalent exists |
| Frontend before API contract | Hackathon constraint; `IMarketService`/`IOrderService` interfaces proxy the contract |

<!-- MANUAL ADDITIONS END -->
