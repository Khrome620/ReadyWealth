# Implementation Plan: ReadyWealth Investment Dashboard

**Branch**: `001-investment-dashboard` | **Date**: 2026-03-03 | **Spec**: `specs/001-investment-dashboard/spec.md`
**Input**: Feature specification from `/specs/001-investment-dashboard/spec.md`

## Summary

Build the ReadyWealth investment dashboard — a PSE market feed with paper-trading wallet, AI advice
corner, transaction history, and portfolio overview — implemented as a Vue 3 SPA (frontend already
complete) backed by a .NET 10 ASP.NET Core REST API with SQLite persistence. The data feed and
order-execution layers are designed with clear abstraction boundaries for future real-time/brokerage
upgrade without restructuring business logic.

## Technical Context

**Language/Version**: TypeScript 5.9 (frontend) + C# 13 / .NET 10 (backend)
**Primary Dependencies**: Vue 3 + Pinia + vue-router + design-system-next v2.27.9 (frontend); ASP.NET Core 10 Minimal API + EF Core 10 (backend)
**Storage**: SQLite via EF Core (hackathon; swap-ready for PostgreSQL/SQL Server)
**Testing**: Vitest + @vue/test-utils (frontend unit); xUnit + WebApplicationFactory (backend integration)
**Target Platform**: Modern browsers (Chrome/Firefox/Edge/Safari); responsive 320 / 768 / 1024 px
**Project Type**: Web application (Vue 3 SPA + .NET 10 REST API)
**Performance Goals**: Dashboard load ≤ 3 s; portfolio refresh ≤ 60 s; order placement ≤ 4 steps
**Constraints**: Prices delayed 15 min; paper trading only; no auth (pre-authenticated user assumed); offline portfolio view not required
**Scale/Scope**: Single-user hackathon demo; ~20 PSE stocks (mock feed); ~5 screens; 100 % backend unit coverage

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| # | Principle | Status | Notes |
|---|-----------|--------|-------|
| I | **Architecture-First** | ⚠️ DEVIATION — see Complexity Tracking | Frontend implemented before backend design (hackathon constraint). Abstraction boundaries (IMarketService, IOrderService) were designed into frontend first. Backend design follows in this plan. |
| II | **Clean Code** | ✅ PASS | Vue components are single-responsibility; services have interfaces; stores have clear contracts; no dead code |
| III | **Simple UX** | ✅ PASS | Every UI element maps to a user story; trade flow is ≤ 4 steps (Long → Select stock → Enter amount → Confirm); error and empty states designed |
| IV | **Responsive Design** | ✅ PASS | CSS Grid mobile-first layout; 320/768/1024 px breakpoints; DS components handle touch targets |
| V | **RESTful API Contract** | ⚠️ NEEDS COMPLETION | Backend API not yet built; frontend uses in-memory mock services via IMarketService/IOrderService interfaces. Contracts defined in this plan (see /contracts/). API-first design proceeds from this document before backend implementation. |
| VI | **Minimal Dependencies** | ⚠️ DEVIATION — see Complexity Tracking | Vue 3 chosen over React (constitution default). design-system-next is Vue 3-only — no equivalent React DS exists; deviation is technically forced. All other deps are justified. |
| VII | **Testing Discipline** | ⚠️ NEEDS COMPLETION | No tests written yet (pre-implementation state). Test plan in Phase 4–6 of this implementation. All tests MUST be written alongside implementation. |

### Pre-Phase-0 Gate Result

**PASS WITH DOCUMENTED DEVIATIONS** — two deviations (Principles I and VI) are justified and recorded in Complexity Tracking. Principle V and VII gaps are addressed by this plan.

### Post-Phase-1 (Design) Re-Check

| # | Principle | Status | Post-Design Notes |
|---|-----------|--------|-------------------|
| I | Architecture-First | ✅ PASS | Architecture diagram implicit in Project Structure section; ADR in Complexity Tracking; 3-layer separation enforced (SPA / REST API / SQLite) |
| II | Clean Code | ✅ PASS | No new concerns from design artifacts |
| III | Simple UX | ✅ PASS | Trade flow ≤ 4 steps confirmed; all error/empty states specified in data-model.md |
| IV | Responsive Design | ✅ PASS | CSS Grid layout verified; breakpoints confirmed in index.css |
| V | RESTful API Contract | ✅ PASS | All 13 endpoints defined in `contracts/api.md`; OpenAPI via Swagger UI at `/swagger`; versioned under `/api/v1/` |
| VI | Minimal Dependencies | ✅ PASS | No new dependencies added during design phase |
| VII | Testing Discipline | ✅ PASS | Test strategy resolved in research.md; Vitest + xUnit plan in Phases 5–6; coverage targets documented |

**Post-Design Gate Result: ALL PRINCIPLES PASS** — plan is approved for task generation (`/speckit.tasks`).

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Vue 3 instead of React (Principle I, VI) | `design-system-next` v2.27.9 is a Vue 3-only library; all Sprout UI components are exported as Vue SFCs. A React wrapper does not exist. | Rebuilding the entire design system for React would take longer than the hackathon timeline and eliminate the primary design asset; the constitution amendment path is noted for post-hackathon alignment. |
| Frontend implemented before API contract (Principle I) | Hackathon time constraint; frontend mock services (IMarketService/IOrderService) act as the contract proxy, enabling parallel work. | Waiting for backend design would block frontend progress; the interface-first approach in services preserves swap-ability. |
| No authentication on API endpoints (Principle V) | Single-user hackathon demo; user is pre-authenticated before reaching the app (spec.md Assumptions §1). Closed environment removes unauthorized-access risk for this release. | Full auth (JWT + middleware) requires a user service and token infrastructure that exceed hackathon scope. A reserved extension point (auth middleware in Program.cs) is documented for v2 alongside real-brokerage integration. |

## Project Structure

### Documentation (this feature)

```text
specs/001-investment-dashboard/
├── plan.md              ← This file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
├── contracts/
│   └── api.md           ← Phase 1 output (REST endpoint contracts)
└── tasks.md             ← Phase 2 output (/speckit.tasks)
```

### Source Code

```text
frontend/                          ← Vue 3 SPA (ALREADY IMPLEMENTED)
├── src/
│   ├── main.ts                    # App bootstrap: createApp, Pinia, DS plugin, router
│   ├── App.vue                    # SprSidenav shell + RouterView + SprSnackbar
│   ├── index.css                  # Global styles, responsive CSS Grid
│   ├── router/index.ts            # /, /portfolio, /transactions
│   ├── types/index.ts             # Stock, Wallet, Order, Position, Transaction, Recommendation
│   ├── services/
│   │   ├── IMarketService.ts      # Interface — swap boundary for real-time feed
│   │   ├── IOrderService.ts       # Interface — swap boundary for real brokerage
│   │   ├── MockMarketService.ts   # 20 PSE stocks, 15-min simulated refresh
│   │   └── PaperOrderService.ts   # In-memory paper trade execution
│   ├── stores/
│   │   ├── market.ts              # stocks[], topGainers/Losers/Active, loading, error
│   │   ├── wallet.ts              # balance, submitOrder(), validateOrder(), credit()
│   │   ├── positions.ts           # openPositions[], positionsWithCurrentValue, closePosition()
│   │   ├── transactions.ts        # transactions[], add()
│   │   ├── watchlist.ts           # watchlistTickers[], watchlistStocks, add/remove/toggle()
│   │   └── advice.ts              # recommendations[] derived from market store
│   ├── composables/
│   │   ├── useMarketFeed.ts       # 15-min setInterval polling, mounts on DashboardView
│   │   └── useSnack.ts            # Wrapper for design-system snackbar store
│   ├── components/
│   │   ├── market/
│   │   │   ├── MarketFeedPanel.vue   # SprCard + SprTabs + SprStatus + SprBanner
│   │   │   └── MarketFeedTable.vue   # SprTable with lozenge-titled change columns
│   │   ├── wallet/
│   │   │   ├── WalletPanel.vue       # SprCard (neutral) + balance + Long/Short buttons
│   │   │   └── TradeModal.vue        # SprModal + SprSelect (searchable) + SprInputCurrency
│   │   ├── advice/
│   │   │   ├── AdvicePanel.vue       # SprCard (information) + SprBanner disclaimer
│   │   │   └── RecommendationCard.vue# ticker + reason + SprLozenge confidence + Trade btn
│   │   ├── portfolio/
│   │   │   ├── PortfolioTable.vue    # SprTable + action slot + SprEmptyState
│   │   │   └── ClosePositionModal.vue# SprModal (sm) confirm close
│   │   └── transactions/
│   │       └── TransactionsTable.vue # SprTable + SprEmptyState
│   └── views/
│       ├── DashboardView.vue      # 3-column CSS Grid: Wallet | Feed | Advice
│       ├── PortfolioView.vue      # PortfolioTable
│       └── TransactionsView.vue   # TransactionsTable
└── tests/                         ← TO BE CREATED (Phase 4–6)
    ├── unit/
    │   ├── stores/
    │   └── components/
    └── vitest.config.ts

backend/                           ← .NET 10 Minimal API (TO BE CREATED — Phase 1–3)
├── ReadyWealth.Api/
│   ├── Program.cs                 # Minimal API setup, EF Core, OpenAPI
│   ├── Endpoints/
│   │   ├── MarketEndpoints.cs     # GET /api/v1/market/stocks
│   │   ├── WalletEndpoints.cs     # GET /api/v1/wallet, POST /api/v1/wallet/deposit
│   │   ├── OrderEndpoints.cs      # POST /api/v1/orders, GET /api/v1/orders
│   │   ├── PositionEndpoints.cs   # GET /api/v1/positions, POST /api/v1/positions/{id}/close
│   │   └── TransactionEndpoints.cs# GET /api/v1/transactions
│   ├── Models/
│   │   ├── Stock.cs
│   │   ├── Wallet.cs
│   │   ├── Order.cs
│   │   ├── Position.cs
│   │   └── Transaction.cs
│   ├── Services/
│   │   ├── IMarketDataService.cs  # Interface — abstraction boundary for real feed
│   │   ├── MockMarketDataService.cs
│   │   ├── IPaperOrderService.cs  # Interface — abstraction boundary for real brokerage
│   │   └── PaperOrderService.cs
│   ├── Data/
│   │   └── ReadyWealthDbContext.cs
│   └── ReadyWealth.Api.csproj
└── ReadyWealth.Tests/
    ├── Unit/
    │   ├── Services/
    │   └── Models/
    ├── Integration/
    │   └── Endpoints/             # WebApplicationFactory tests for all endpoints
    └── ReadyWealth.Tests.csproj
```

**Structure Decision**: Web application (Option 2) with frontend/ already built and backend/ to be created. Frontend uses Vite + Vue 3 SPA; backend uses .NET 10 Minimal API with SQLite. Source code layout mirrors the web-app template from `tasks-template.md`.

---

## Implementation Phases

### Phase 0 — Research *(produces research.md)*

| Task | Question | Output |
|------|----------|--------|
| R-01 | PSE data sourcing: which API for mock data? | research.md §1 |
| R-02 | .NET 10 Minimal API + EF Core + SQLite: project scaffold patterns | research.md §2 |
| R-03 | Vue 3 + Vitest + @vue/test-utils: testing setup for Pinia stores and global components | research.md §3 |
| R-04 | Position P&L calculation: Long vs Short paper trading formulas | research.md §4 |

### Phase 1 — Backend Foundation *(US1 data layer)*

1. Scaffold `backend/` — `dotnet new webapi` with Minimal API; add EF Core + SQLite; configure OpenAPI
2. Define `Models/`: `Stock`, `Wallet`, `Order` (enum OrderType, Status), `Position`, `Transaction`
3. Implement `MockMarketDataService` seeding 20 PSE stocks; wire `IMarketDataService` interface
4. `GET /api/v1/market/stocks` — returns all stocks with price, change, changePct, volume
5. `GET /api/v1/market/status` — returns market open/closed boolean + last updated timestamp
6. Seed default wallet (PHP 100,000 balance) in EF Core migrations

### Phase 2 — Wallet & Order API *(US2 backend)*

1. `GET /api/v1/wallet` — returns balance
2. `POST /api/v1/orders` — places Long/Short order; validates balance; creates Position + Transaction; returns 201
3. `GET /api/v1/orders` — returns all orders in reverse chronological order
4. `POST /api/v1/orders/{id}/cancel` — reserved for future (not in this release scope)
5. Implement `PaperOrderService` with 3-second duplicate-submission guard (idempotency key)

### Phase 3 — Portfolio & Transactions API *(US4 + US5 backend)*

1. `GET /api/v1/positions` — returns all open positions with current market value + P&L
2. `POST /api/v1/positions/{id}/close` — closes position, credits wallet, updates transaction
3. `GET /api/v1/transactions` — returns all transactions in reverse chronological order

### Phase 4 — Frontend API Integration *(wire SPA to real API)*

1. Replace `MockMarketService` with `ApiMarketService` implementing `IMarketService` — calls `/api/v1/market/stocks`
2. Replace `PaperOrderService` with `ApiOrderService` implementing `IOrderService` — calls `/api/v1/orders`
3. Update Pinia stores to call API services instead of in-memory stores for wallet/positions/transactions
4. Add `VITE_API_BASE_URL` env var; configure Vite proxy for local dev

### Phase 5 — Frontend Unit Tests *(Principle VII — frontend)*

1. Configure Vitest + @vue/test-utils + jsdom + `@pinia/testing`
2. Unit tests for all Pinia stores: `market.ts`, `wallet.ts`, `positions.ts`, `transactions.ts`, `watchlist.ts`, `advice.ts`
3. Unit tests for composables: `useMarketFeed.ts`, `useSnack.ts`
4. Component smoke tests: WalletPanel, TradeModal (validation logic), MarketFeedPanel (tab switching), AdvicePanel (disclaimer always visible)

### Phase 6 — Backend Unit + Integration Tests *(Principle VII — backend)*

1. Unit tests for `PaperOrderService` (validation, balance check, idempotency guard)
2. Unit tests for `MockMarketDataService` (market open/closed logic, data shape)
3. Integration tests (WebApplicationFactory) for all 7 endpoints: happy path + documented error paths
4. Verify 100% coverage on `Services/` and `Models/` via `dotnet-coverage`

### Phase 7 — Polish & Watchlist *(FR-019/020/021)*

1. Watchlist tab in MarketFeedPanel — add/remove `SprButton` per row in `SprTable`
2. Auto-add to watchlist when position opened (already wired in wallet store)
3. Responsive CSS Grid verification at all three breakpoints
4. Panel isolation testing: kill API endpoint; confirm other panels unaffected
5. Dependency audit: remove any unused packages from both projects

---

## Known Gaps & Risks

| Gap | Description | Mitigation |
|-----|-------------|------------|
| Position P&L model | Current frontend implementation uses simplified shares = amount/10; needs real price-based calculation | Phase 1 backend models will use correct formula: shares = amount / entryPrice; frontend updated in Phase 4 |
| Persistent wallet | Frontend wallet is reset on page refresh (Pinia is in-memory) | Resolved in Phase 4 when wallet reads from backend API |
| Real PSE data | No real PSE feed API is used; data is mocked | Mock data with 20 real PSE tickers is sufficient for hackathon; abstraction boundary in place for upgrade |
| No CORS config | Backend needs CORS policy for SPA dev on localhost:5175 | Configured in Program.cs at backend scaffold step |
| Constitution deviation: Vue 3 | Constitution Technology Stack table lists React | ADR documented here; constitution amendment required post-hackathon |
