# Tasks: User Authentication & Per-User Data Isolation

**Input**: Design documents from `/specs/002-user-auth/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/api.md ✅, quickstart.md ✅

**Tests**: Mandatory per Constitution Principle VII. Unit tests and integration tests included for all user story phases.

**Organization**: Tasks grouped by user story for independent implementation and testing. Backend path: `backend/ReadyWealth.Api/`, Frontend path: `frontend/src/`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Wire auth middleware, DI registrations, and cookie configuration into the existing project before any feature work begins.

- [X] T001 Register `IHttpContextAccessor` in `backend/ReadyWealth.Api/Program.cs` (framework type — safe to register before DI services are defined)
- [X] T002 Add JWT Bearer authentication middleware with cookie extraction in `backend/ReadyWealth.Api/Program.cs` (reads `rw_auth` cookie via `OnMessageReceived`)
- [X] T003 [P] Add `appsettings.Development.json` entries: `SproutAuth`, `AppSettings:Secret`, `ReadyWealth:InitialWalletBalance`, `Cookie` section in `backend/ReadyWealth.Api/appsettings.Development.json`
- [X] T004 [P] Create `frontend/src/stores/auth.ts` Pinia store skeleton (`user`, `isAuthenticated`, `setUser`, `clearUser`, `fetchMe`)
- [X] T005 [P] Create `frontend/src/services/AuthService.ts` with `login()`, `logout()`, `fetchMe()` stubs (axios calls to `/api/v1/auth/*`)
- [X] T006 Add `/login` route and global `router.beforeEach` auth guard in `frontend/src/router/index.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema changes and `ICurrentUserService` that ALL user stories depend on. Must be complete before any story work.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T007 Create `User` entity in `backend/ReadyWealth.Api/Models/User.cs` (`Id`, `DomainName`, `Username`, `FirstName`, `LastName`, `ClientId`, `CreatedAt`, `LastLoginAt`)
- [X] T008 Create `ICurrentUserService` interface in `backend/ReadyWealth.Api/Services/ICurrentUserService.cs` (property: `string UserId`)
- [X] T009 Create `CurrentUserService` implementation in `backend/ReadyWealth.Api/Services/CurrentUserService.cs` (reads `SessionDataClaim.EmployeeId` from `IHttpContextAccessor`)
- [X] T009b Register `ICurrentUserService` → `CurrentUserService` as scoped service in `backend/ReadyWealth.Api/Program.cs` (depends on T008, T009)
- [X] T010 Add `UserId` (nullable `string`) FK column to `Wallet`, `Position`, and `Transaction` entities in `backend/ReadyWealth.Api/Models/` (Migration 1 & 2 prep)
- [X] T011 Add `Users` DbSet and configure `User` entity in `backend/ReadyWealth.Api/Data/ReadyWealthDbContext.cs`; inject `ICurrentUserService` into `DbContext` constructor
- [X] T012 Add EF Core Global Query Filters for `Wallet`, `Position`, and `Transaction` in `ReadyWealthDbContext.OnModelCreating` (filter by `UserId == _currentUserService.UserId`)
- [X] T013 Generate EF migration 1 (Add User table): `dotnet ef migrations add AddUserTable` in `backend/ReadyWealth.Api/`
- [X] T014 Generate EF migration 2 (Add UserId nullable columns): `dotnet ef migrations add AddUserIdColumns` in `backend/ReadyWealth.Api/`
- [X] T015 Generate EF migration 3 (Clear dev data): `dotnet ef migrations add ClearDevData` — `DELETE FROM Wallets; DELETE FROM Positions; DELETE FROM Transactions;` in `backend/ReadyWealth.Api/`
- [X] T016 Generate EF migration 4 (Make UserId NOT NULL + FK + indexes): `dotnet ef migrations add MakeUserIdNotNull` with table rebuild for SQLite in `backend/ReadyWealth.Api/`

**Checkpoint**: Foundation ready — database is user-scoped, middleware is wired, DI registered. User story implementation can now begin.

---

## Phase 3: User Story 1 — Login with Sprout Credentials (Priority: P1) 🎯 MVP

**Goal**: Any page visit redirects unauthenticated users to `/login`. Submitting valid Sprout credentials (domain + username + password) authenticates the user, sets an HttpOnly cookie, and redirects to the dashboard. Invalid credentials show a clear error. Logout clears the session.

**Independent Test**: Navigate to `/` → redirected to `/login`. Enter valid Sprout credentials → reach dashboard. Enter wrong password → see error message. Click Sign Out → return to `/login`. Verify `rw_auth` cookie is HttpOnly in DevTools.

### Tests for User Story 1 (MANDATORY)

> **Write these tests FIRST, ensure they FAIL before implementing**

- [X] T017 [P] [US1] Integration test — happy-path login sets cookie and returns user profile in `backend/ReadyWealth.Tests/Integration/Auth/AuthEndpointsTests.cs`
- [X] T018 [P] [US1] Integration test — invalid credentials returns 401 in `backend/ReadyWealth.Tests/Integration/Auth/AuthEndpointsTests.cs`
- [X] T019 [P] [US1] Integration test — Sprout auth unreachable returns 503 in `backend/ReadyWealth.Tests/Integration/Auth/AuthEndpointsTests.cs`
- [X] T020 [P] [US1] Integration test — logout clears cookie in `backend/ReadyWealth.Tests/Integration/Auth/AuthEndpointsTests.cs`
- [X] T021 [P] [US1] Integration test — `GET /me` returns profile when cookie valid; 401 when absent in `backend/ReadyWealth.Tests/Integration/Auth/AuthEndpointsTests.cs`
- [X] T022 [P] [US1] Unit test — `SproutAuthService` forwards credentials and parses token in `backend/ReadyWealth.Tests/Unit/Auth/SproutAuthServiceTests.cs`
- [X] T023 [P] [US1] Unit test — `CurrentUserService` extracts `EmployeeId` from `IHttpContextAccessor` in `backend/ReadyWealth.Tests/Unit/Auth/CurrentUserServiceTests.cs`
- [X] T023b [P] [US1] Unit test — `AuthEndpoints` business logic: first-login user upsert, wallet provisioning, `SessionDataClaim` extraction, `rw_auth` cookie attribute assertions (HttpOnly, SameSite, MaxAge) in `backend/ReadyWealth.Tests/Integration/Auth/AuthEndpointsTests.cs`
- [X] T024 [P] [US1] Frontend unit test — `authStore` `setUser`, `clearUser`, `fetchMe` in `frontend/src/test/stores/auth.test.ts`
- [X] T025 [P] [US1] Frontend unit test — router auth guard redirects unauthenticated users to `/login` in `frontend/src/test/router/authGuard.test.ts`
- [X] T026 [P] [US1] Frontend component test — `LoginView` renders three fields, shows error on 401, redirects on 200 in `frontend/src/test/views/LoginView.test.ts`
- [X] T026b [P] [US1] Unit test — `useAuth` composable: `user`/`isAuthenticated` refs, `login()` and `logout()` delegate to authStore correctly in `frontend/src/test/composables/useAuth.test.ts`

### Implementation for User Story 1

- [X] T027 [P] [US1] Create `ISproutAuthService` interface in `backend/ReadyWealth.Api/Auth/ISproutAuthService.cs`
- [X] T028 [P] [US1] Create `LoginRequest` model in `backend/ReadyWealth.Api/Auth/LoginRequest.cs` (`Domain`, `Username`, `Password`)
- [X] T029 [US1] Implement `SproutAuthService` in `backend/ReadyWealth.Api/Auth/SproutAuthService.cs` — POSTs `application/x-www-form-urlencoded` to `/connect/token`, parses `SessionDataClaim` from response JWT (depends on T027, T028)
- [X] T030a [US1] Implement `POST /api/v1/auth/login` handler in `backend/ReadyWealth.Api/Auth/AuthEndpoints.cs` — validate `LoginRequest`, call `SproutAuthService`, upsert `User` record, provision `Wallet` on first login, set HttpOnly `rw_auth` cookie, return user profile JSON (depends on T029, T011, T023b)
- [X] T030b [US1] Implement `POST /api/v1/auth/logout` handler in `backend/ReadyWealth.Api/Auth/AuthEndpoints.cs` — delete `rw_auth` cookie, return `{ "message": "Logged out successfully." }` (depends on T002)
- [X] T030c [US1] Implement `GET /api/v1/auth/me` handler in `backend/ReadyWealth.Api/Auth/AuthEndpoints.cs` — validate cookie JWT, decode `SessionDataClaim`, return user profile or 401 (depends on T002)
- [X] T031 [US1] Register `AuthEndpoints` route group and `SproutAuthService` DI in `backend/ReadyWealth.Api/Program.cs` (depends on T030a, T030b, T030c)
- [X] T032 [US1] Implement `LoginView.vue` in `frontend/src/views/LoginView.vue` — three `SprInput` fields (domain, username, password) + submit button, calls `AuthService.login()`, handles 401/503/400 error states, redirects to `?redirect` or `/` on success
- [X] T033 [US1] Implement `AuthService.ts` in `frontend/src/services/AuthService.ts` — `login()` POSTs to `/api/v1/auth/login`, `logout()` POSTs to `/api/v1/auth/logout`, `fetchMe()` GETs `/api/v1/auth/me`
- [X] T034 [US1] Implement `authStore` in `frontend/src/stores/auth.ts` — `fetchMe()` calls `AuthService.fetchMe()`, sets `user`/`isAuthenticated`; `login()` calls service then `setUser`; `logout()` calls service then `clearUser()` + router push to `/login`
- [X] T035 [US1] Implement router auth guard in `frontend/src/router/index.ts` — `beforeEach` calls `auth.fetchMe()` if not authenticated, redirects unauthenticated users to `/login?redirect=<path>`
- [X] T036 [US1] Add axios 401 interceptor in `frontend/src/services/AuthService.ts` or `frontend/src/main.ts` — any 401 response clears auth store and redirects to `/login?redirect=<current path>`
- [X] T037 [US1] Create `useAuth.ts` composable in `frontend/src/composables/useAuth.ts` — wraps `authStore` for convenience (`user`, `isAuthenticated`, `login`, `logout`)
- [X] T038 [US1] Add "Sign Out" button/action to `frontend/src/App.vue` sidebar or header — calls `authStore.logout()`

**Checkpoint**: US1 fully functional. Can log in with Sprout credentials, cookie is HttpOnly, logout works, unauthenticated redirects work. All unit tests (T022, T023, T023b, T024, T025, T026, T026b) and integration tests (T017–T021) pass.

---

## Phase 4: User Story 2 — Per-User Wallet Isolation (Priority: P2)

**Goal**: Every user has their own wallet with an initial ₱300,000 balance. Wallet reads and writes are automatically scoped to the authenticated user via Global Query Filters. No cross-user balance leakage.

**Independent Test**: Log in as User A (first time) → wallet shows ₱300,000. Log in as User B (first time) → also sees ₱300,000 independently. User A places a trade reducing their balance → User B's balance is unaffected.

### Tests for User Story 2 (MANDATORY)

- [X] T039 [P] [US2] Integration test — `GET /api/v1/wallet` returns only the authenticated user's wallet in `backend/ReadyWealth.Tests/Data/UserScopingTests.cs`
- [X] T040 [P] [US2] Integration test — first-time login provisions wallet with ₱300,000 in `backend/ReadyWealth.Tests/Data/UserScopingTests.cs`
- [X] T041 [P] [US2] Integration test — `GET /api/v1/wallet` returns 401 when no cookie in `backend/ReadyWealth.Tests/Data/UserScopingTests.cs`
- [X] T042 [P] [US2] Integration test — User A wallet changes do not affect User B wallet in `backend/ReadyWealth.Tests/Data/UserScopingTests.cs`

### Implementation for User Story 2

- [X] T043 [US2] Require `[Authorize]` on `GET /api/v1/wallet` endpoint in `backend/ReadyWealth.Api/` — return 401 if cookie absent/invalid (depends on T002, T016)
- [X] T044 [US2] Verify Global Query Filter on `Wallet` entity is active and tested via `UserScopingTests` — ensure `ReadyWealthDbContext` injects `ICurrentUserService` correctly (depends on T012)
- [X] T045 [US2] Clear `localStorage` wallet data on login in `frontend/src/stores/auth.ts` or `frontend/src/stores/wallet.ts` — call `walletStore.$reset()` + `localStorage.removeItem('rw_wallet_balance')` after successful login (implements FR-015)
- [X] T046 [US2] Update `frontend/src/stores/wallet.ts` — remove any localStorage seed data; wallet state sourced exclusively from `GET /api/v1/wallet`

**Checkpoint**: US2 fully functional. Each user has isolated ₱300,000 wallet, first-login provisioning works, no cross-user leakage, all 4 tests pass.

---

## Phase 5: User Story 3 — Per-User Positions & Transaction Isolation (Priority: P3)

**Goal**: Positions and transactions are fully scoped to the authenticated user. User A's trades are invisible to User B. All order creation tags records with the authenticated user's ID.

**Independent Test**: User A places and closes a trade. Log in as User B → portfolio empty, transaction history empty. User A's history intact on re-login.

### Tests for User Story 3 (MANDATORY)

- [X] T047 [P] [US3] Integration test — `GET /api/v1/positions` returns only authenticated user's positions in `backend/ReadyWealth.Tests/Data/UserScopingTests.cs`
- [X] T048 [P] [US3] Integration test — `GET /api/v1/transactions` returns only authenticated user's transactions in `backend/ReadyWealth.Tests/Data/UserScopingTests.cs`
- [X] T049 [P] [US3] Integration test — `POST /api/v1/orders` creates position and transaction tagged with authenticated user's `UserId` in `backend/ReadyWealth.Tests/Data/UserScopingTests.cs`
- [X] T050 [P] [US3] Integration test — `POST /api/v1/positions/{id}/close` returns 403 when position belongs to a different user in `backend/ReadyWealth.Tests/Data/UserScopingTests.cs`
- [X] T051 [P] [US3] Integration test — protected position/transaction endpoints return 401 when no cookie in `backend/ReadyWealth.Tests/Data/UserScopingTests.cs`
- [X] T051b [P] [US3] Unit test — owner-check logic: closing a position with a mismatched `UserId` returns 403; closing own position succeeds — isolated from HTTP stack in `backend/ReadyWealth.Tests/Data/UserScopingTests.cs`

### Implementation for User Story 3

- [X] T052 [US3] Require `[Authorize]` on `GET /api/v1/positions`, `POST /api/v1/orders`, `POST /api/v1/positions/{id}/close`, `GET /api/v1/transactions` in `backend/ReadyWealth.Api/` (depends on T002, T016)
- [X] T053 [US3] Tag new `Position` and `Transaction` records with `UserId = _currentUserService.UserId` in order creation logic in `backend/ReadyWealth.Api/` (depends on T009, T016)
- [X] T054 [US3] Add owner check in `POST /api/v1/positions/{id}/close` — return 403 if `position.UserId != _currentUserService.UserId` in `backend/ReadyWealth.Api/`
- [X] T055 [US3] Verify Global Query Filters on `Position` and `Transaction` entities are active and tested (depends on T012)
- [X] T056 [US3] Clear `localStorage` positions and transactions data on login in `frontend/src/stores/auth.ts` — call `positionsStore.$reset()`, `transactionsStore.$reset()`, remove respective `localStorage` keys (implements FR-015; depends on T045 — extends the same post-login clear block in `auth.ts`)
- [X] T057 [US3] Update `frontend/src/stores/positions.ts` — remove any localStorage seed data; positions sourced exclusively from `GET /api/v1/positions`
- [X] T058 [US3] Update `frontend/src/stores/transactions.ts` — remove any localStorage seed data; transactions sourced exclusively from `GET /api/v1/transactions`

**Checkpoint**: All three user stories functional. Full per-user data isolation in place for wallet, positions, and transactions. All 5 tests pass.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Hardening, UX edge cases, and validation across all stories.

- [X] T059 [P] Add `[AllowAnonymous]` to `POST /api/v1/auth/login` and `GET /api/v1/market` to ensure they remain accessible without a cookie in `backend/ReadyWealth.Api/`
- [X] T060 [P] Add composite index on `(UserId, Ticker)` for `Positions` table and index on `(UserId, Date DESC)` for `Transactions` table in EF migration in `backend/ReadyWealth.Api/Data/Migrations/`
- [X] T061 [P] Add session-expiry toast inside the existing 401 interceptor created in T036 — call `useSnack()` with "Session expired, please log in" before the redirect fires in `frontend/src/services/AuthService.ts` or `frontend/src/main.ts` (depends on T036; do NOT create a second interceptor)
- [X] T062 [P] Add loading state to `LoginView.vue` — disable submit button and show spinner while authenticating in `frontend/src/views/LoginView.vue`
- [X] T063 [P] Add error display for 503 "auth service unavailable" in `LoginView.vue` — distinct from 401 invalid credentials message in `frontend/src/views/LoginView.vue`
- [X] T064 Validate `redirect` query param on login success — ensure it is a relative path (prevent open redirect) in `frontend/src/router/index.ts`
- [X] T065 [P] Run full test suite: `dotnet test --collect:"XPlat Code Coverage"` in `backend/` and `npm test` in `frontend/` — verify all tests pass with ≥ 80% coverage
- [ ] T065b [P] Add XML documentation comments to `AuthEndpoints.cs` and verify Swagger/OpenAPI UI at `/swagger` shows all three auth endpoints and all five modified protected endpoints with correct request/response schemas — Principle V in `backend/ReadyWealth.Api/Auth/AuthEndpoints.cs`
- [ ] T065c [P] Verify `LoginView.vue` renders fully and is usable at 320 px, 768 px, and 1024 px breakpoints: all three input fields visible, submit button ≥ 44 px touch target, no horizontal scroll — Principle IV in `frontend/src/views/LoginView.vue`
- [X] T066 Update `CLAUDE.md` agent context with auth infrastructure additions (cookie auth, `ICurrentUserService`, auth store, route guard)
- [ ] T067 Run quickstart.md validation steps — log in as two users, confirm wallet isolation and portfolio isolation; additionally clear the `rw_auth` cookie mid-session and re-login to verify wallet balance and trade history are intact (SC-006) per `specs/002-user-auth/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundation)**: Depends on Phase 1 — **BLOCKS all user stories**
- **Phase 3 (US1 — Login)**: Depends on Phase 2
- **Phase 4 (US2 — Wallet)**: Depends on Phase 2; can run in parallel with Phase 3 if staffed
- **Phase 5 (US3 — Portfolio/Transactions)**: Depends on Phase 2; ideally after Phase 3 (auth guard needed)
- **Phase 6 (Polish)**: Depends on Phase 3, 4, and 5 complete

### User Story Dependencies

- **US1 (P1)**: Only depends on Foundation. No dependency on US2 or US3.
- **US2 (P2)**: Only depends on Foundation + `ICurrentUserService` (T009). Independent of US3. First-login provisioning (T030a) overlaps with US1.
- **US3 (P3)**: Only depends on Foundation + `ICurrentUserService` (T009). Auth guard from US1 recommended before US3 endpoints.

### Within Each User Story

- Tests written FIRST and verified to FAIL before implementation starts
- Backend models → services → endpoints → frontend store → frontend view
- Story complete before merging; no failing tests allowed

### Parallel Opportunities

Within Phase 2 — all can run in parallel:
- T007 (User entity) ‖ T008+T009 (CurrentUserService) ‖ T010 (FK columns)

Within Phase 3 — test tasks T017–T026 all [P]; implementation T027+T028 [P]:
- All 10 test stubs written concurrently; T029+T030a depend on T027+T028

Across stories after Phase 2 complete:
- Dev A: US1 (Phase 3); Dev B: US2 (Phase 4); Dev C: US3 (Phase 5) — all in parallel

---

## Parallel Example: User Story 1 (Login)

```bash
# Write all test stubs in parallel first:
T017: Integration test — happy-path login
T018: Integration test — invalid credentials 401
T019: Integration test — Sprout unavailable 503
T020: Integration test — logout clears cookie
T021: Integration test — GET /me
T022: Unit test — SproutAuthService
T023: Unit test — CurrentUserService
T024: Frontend — authStore tests
T025: Frontend — router guard tests
T026: Frontend — LoginView component tests

# Then implement in parallel where possible:
T027: ISproutAuthService interface  ‖  T028: LoginRequest model

# Then sequential:
T029: SproutAuthService impl  →  T030a + T030b + T030c (auth endpoint handlers, parallelizable)  →  T031: Register in Program.cs
T032: LoginView.vue  →  T033: AuthService.ts  →  T034: authStore  →  T035: router guard
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundation (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1 (Login)
4. **STOP and VALIDATE**: Log in with Sprout credentials, check cookie is HttpOnly, verify redirect, test logout
5. Demo: authenticated dashboard with working login/logout

### Incremental Delivery

1. Phase 1 + Phase 2 → Auth infrastructure ready
2. Phase 3 (US1) → Login/logout working, cookie auth, route guard → **Demo-able MVP**
3. Phase 4 (US2) → Per-user wallet, first-login provisioning → **Multi-user wallets**
4. Phase 5 (US3) → Per-user positions + transactions → **Full data isolation**
5. Phase 6 (Polish) → Hardening, edge cases, coverage validation → **Production-ready**

### Parallel Team Strategy

With 3 developers (after Phase 2 complete):
- **Dev A**: Phase 3 (US1 — Login)
- **Dev B**: Phase 4 (US2 — Wallet isolation)
- **Dev C**: Phase 5 (US3 — Portfolio/transaction isolation)

Stories integrate at Polish phase.

---

## Notes

- **[P]** tasks operate on different files with no incomplete dependencies — safe to parallelize
- **[US1/US2/US3]** labels map each task to a user story for traceability
- `[AllowAnonymous]` on `POST /api/v1/auth/login` and `GET /api/v1/market` are mandatory (T059)
- SQLite migrations 3 and 4 clear existing dev data — this is intentional per data-model.md clarification Q5
- HttpOnly cookie name: `rw_auth`; `Secure = false` in dev (HTTP), `true` in production
- Global Query Filters are applied in `DbContext.OnModelCreating` — scoped `ICurrentUserService` must be constructor-injected
- Frontend `localStorage` clear (FR-015) happens in `authStore` post-login, not in individual stores
- Stop at each phase checkpoint to validate the story independently before continuing
- T066 (update CLAUDE.md) is a maintenance task with no direct requirement traceability — it updates agent context and is not mapped to any user story; safe to skip if time-constrained
