# Implementation Plan: User Authentication & Per-User Data Isolation

**Branch**: `002-user-auth` | **Date**: 2026-03-04 | **Spec**: `specs/002-user-auth/spec.md`
**Input**: Feature specification from `/specs/002-user-auth/spec.md`

## Summary

Add Sprout HR Auth-based login to ReadyWealth: a three-field login form (domain, username, password) posts to a new backend endpoint that proxies to the Sprout IdentityServer4 `/connect/token` endpoint, stores the resulting JWT in an HttpOnly cookie, and provisions a ₱300,000 wallet for first-time users. All existing data endpoints (wallet, positions, transactions) are retrofitted with user-scoped EF Core Global Query Filters so every query is automatically isolated to the authenticated user. localStorage mock data is discarded; all state moves server-side.

## Technical Context

**Language/Version**: TypeScript 5.9 (frontend) + C# 13 / .NET 10 (backend)
**Primary Dependencies**: Vue 3 + Pinia + vue-router + design-system-next v2.27.9 (frontend); ASP.NET Core 10 Minimal API + EF Core 10 + `Microsoft.AspNetCore.Authentication.JwtBearer` (backend)
**Storage**: SQLite via EF Core (dev); migrations add `User` table + `UserId` FK columns
**Testing**: Vitest + @vue/test-utils (frontend); xUnit + WebApplicationFactory (backend)
**Target Platform**: Modern browsers; responsive 320 / 768 / 1024 px
**Project Type**: Web application (Vue 3 SPA + .NET 10 REST API)
**Performance Goals**: Login round-trip ≤ 5 s (SC-001); auth check (GET /me) ≤ 1 s (SC-005)
**Constraints**: HttpOnly cookie only (no localStorage token); zero cross-user data leakage (SC-002); no new NuGet/npm packages beyond existing stack
**Scale/Scope**: Hackathon multi-user demo; existing ~20 PSE stocks; adds 1 login screen + 3 auth endpoints + 4 DB migrations

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| # | Principle | Status | Notes |
|---|-----------|--------|-------|
| I | **Architecture-First** | ✅ PASS | Auth designed as shared infrastructure (ICurrentUserService, Global Query Filters, cookie middleware) before any implementation. 3-layer separation maintained. |
| II | **Clean Code** | ✅ PASS | `ICurrentUserService` is a single-responsibility service; auth logic isolated to `AuthEndpoints`; no business logic in controllers. |
| III | **Simple UX** | ✅ PASS | Login flow: enter 3 fields → submit → redirect to dashboard (3 steps, well within 5-step limit). Error states designed for all failure modes (401, 503, 400). |
| IV | **Responsive Design** | ✅ PASS | Login form uses DS `SprCard` + `SprInput` components; inherits DS responsive behaviour; tested at 320/768/1024 px. |
| V | **RESTful API Contract** | ✅ PASS | 3 new endpoints defined in `contracts/api.md`; versioned under `/api/v1/`; OpenAPI via existing Swagger setup; all request/response shapes documented. |
| VI | **Minimal Dependencies** | ✅ PASS | No new packages. `JwtBearer` is already part of ASP.NET Core; `IHttpClientFactory` is standard runtime; no new npm packages. |
| VII | **Testing Discipline** | ⚠️ NEEDS COMPLETION | No tests written yet (pre-implementation). Test plan in Phase 3. All tests written alongside implementation. |

### Pre-Phase-0 Gate Result

**PASS WITH ONE OPEN ITEM** — Principle VII gap addressed by test plan in Phase 3. No deviations requiring Complexity Tracking entries. Vue 3 deviation already documented in `001-investment-dashboard` plan.

### Post-Phase-1 (Design) Re-Check

| # | Principle | Status | Post-Design Notes |
|---|-----------|--------|-------------------|
| I | Architecture-First | ✅ PASS | `ICurrentUserService` + Global Query Filters defined in `data-model.md`; ADR embedded in `research.md` R-04; 3-layer boundary intact |
| II | Clean Code | ✅ PASS | No new concerns from design artifacts |
| III | Simple UX | ✅ PASS | Login ≤ 3 steps confirmed; all error/loading states specified in contracts |
| IV | Responsive Design | ✅ PASS | DS components handle responsiveness; login form is a single card |
| V | RESTful API Contract | ✅ PASS | 3 endpoints + modified existing endpoints fully documented in `contracts/api.md` |
| VI | Minimal Dependencies | ✅ PASS | No new dependencies added during design |
| VII | Testing Discipline | ✅ PASS | Test strategy defined in Phase 3; coverage targets set |

**Post-Design Gate Result: ALL PRINCIPLES PASS** — plan approved for task generation (`/speckit.tasks`).

## Project Structure

### Documentation (this feature)

```text
specs/002-user-auth/
├── plan.md              # This file
├── research.md          # Phase 0 output ✅
├── data-model.md        # Phase 1 output ✅
├── quickstart.md        # Phase 1 output ✅
├── contracts/
│   └── api.md           # Phase 1 output ✅
├── checklists/
│   └── requirements.md  # Spec quality checklist ✅
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
backend/ReadyWealth.Api/
├── Auth/
│   ├── AuthEndpoints.cs          # POST /login, POST /logout, GET /me
│   ├── LoginRequest.cs           # Request model
│   ├── SproutAuthService.cs      # IHttpClientFactory wrapper for /connect/token
│   └── ISproutAuthService.cs
├── Services/
│   ├── ICurrentUserService.cs    # Interface: UserId property
│   └── CurrentUserService.cs     # Reads EmployeeId from IHttpContextAccessor
├── Models/
│   └── User.cs                   # New EF entity
├── Data/
│   └── Migrations/               # 4 new EF migrations (User table + FK columns)
└── Program.cs                    # Add auth middleware, cookie config, DI registrations

frontend/src/
├── views/
│   └── LoginView.vue             # New login page (domain, username, password fields)
├── stores/
│   └── auth.ts                   # New Pinia store (user profile, isAuthenticated)
├── services/
│   └── AuthService.ts            # login(), logout(), fetchMe() API calls
├── router/
│   └── index.ts                  # Add /login route + beforeEach auth guard
└── composables/
    └── useAuth.ts                # Convenience composable wrapping authStore

tests/
backend/ReadyWealth.Api.Tests/
├── Auth/
│   ├── AuthEndpointsTests.cs     # Integration tests (login happy path, 401, 503)
│   ├── SproutAuthServiceTests.cs # Unit tests (mocked HTTP client)
│   └── CurrentUserServiceTests.cs
└── Data/
    └── UserScopingTests.cs       # Verify Global Query Filters isolate data per user

frontend/src/test/
├── stores/auth.test.ts
├── views/LoginView.test.ts
└── router/authGuard.test.ts
```

**Structure Decision**: Web application (Option 2). Extends existing `backend/` and `frontend/` directory layout. Auth is a cross-cutting concern — isolated in `backend/Auth/` and `frontend/stores/auth.ts` rather than scattered across feature modules.

## Complexity Tracking

No constitution violations requiring justification. Vue 3 deviation already documented in `001-investment-dashboard` plan (Complexity Tracking, Principle VI).
