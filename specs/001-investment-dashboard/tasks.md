# Tasks: ReadyWealth Investment Dashboard

**Input**: Design documents from `specs/001-investment-dashboard/`
**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/api.md ✅

**Tests**: MANDATORY per Constitution Principle VII. Every user story phase includes unit tests
and integration tests written alongside implementation.

**Organization**: Tasks are grouped by user story for independent implementation and testing.
Frontend (`frontend/`) is already implemented with mock services. Tasks cover:
(a) backend scaffolding, (b) API endpoints per story, (c) frontend API integration, (d) tests.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no blocking dependencies)
- **[Story]**: User story this task belongs to (US1–US5)
- Exact file paths included in every task

## Path Conventions

```
backend/ReadyWealth.Api/          ← .NET 10 Minimal API (TO BE CREATED)
backend/ReadyWealth.Tests/        ← xUnit test project (TO BE CREATED)
frontend/src/                     ← Vue 3 SPA (ALREADY IMPLEMENTED — mock services)
frontend/tests/unit/              ← Vitest tests (TO BE CREATED)
frontend/src/test/setup.ts        ← Vitest global stubs + Pinia isolation (TO BE CREATED)
```

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Scaffold the backend project and configure the frontend test infrastructure.
No user story work can begin until this phase is complete.

- [x] T001 Scaffold backend/ReadyWealth.Api/ using `dotnet new webapi --use-minimal-apis` and backend/ReadyWealth.Tests/ using `dotnet new xunit`; add solution file backend/ReadyWealth.sln linking both projects
- [x] T002 Add NuGet packages to backend/ReadyWealth.Api/ReadyWealth.Api.csproj: `Microsoft.EntityFrameworkCore.Sqlite`, `Microsoft.EntityFrameworkCore.Design`, `Swashbuckle.AspNetCore`
- [x] T003 [P] Add NuGet packages to backend/ReadyWealth.Tests/ReadyWealth.Tests.csproj: `Microsoft.AspNetCore.Mvc.Testing`, `Microsoft.Data.Sqlite`, `Microsoft.EntityFrameworkCore.Sqlite`, `coverlet.collector`
- [x] T004 [P] Install frontend Vitest dependencies: `npm install -D vitest @vue/test-utils jsdom @pinia/testing @vitest/coverage-v8` in frontend/; update frontend/package.json scripts with `test`, `test:watch`, `test:coverage`
- [x] T005 [P] Add Vitest test block to frontend/vite.config.ts: `{ environment: 'jsdom', globals: true, setupFiles: ['./src/test/setup.ts'], coverage: { provider: 'v8', reporter: ['text', 'lcov'] } }`
- [x] T006 [P] Create frontend/src/test/setup.ts with global `Spr*` stubs for all design-system components and `beforeEach(() => setActivePinia(createPinia()))` Pinia isolation pattern (per research.md R-03)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core backend infrastructure — domain models, database, DI wiring, service interfaces.
**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T007 Create backend/ReadyWealth.Api/Domain/ with C# record types: `Stock`, `Wallet`, `Order`, `Position`, `Transaction`, `WatchlistEntry`; add enums `OrderType { Long, Short }`, `OrderStatus { Pending, Open, Closed }`, `TransactionStatus { Pending, Open, Closed }`, `ConfidenceLevel { High, Medium, Low }` in backend/ReadyWealth.Api/Domain/Enums.cs
- [x] T008 Implement backend/ReadyWealth.Api/Persistence/AppDbContext.cs with EF Core 10 config for Wallet, Order, Transaction, WatchlistEntry (Stock is in-memory, not stored as a table); configure decimal precision (scale 4 for prices, scale 2 for balance); add `Data Source=readywealth.db` connection string to backend/ReadyWealth.Api/appsettings.json
- [x] T009 Run `dotnet ef migrations add InitialCreate` to generate the schema migration; run `dotnet ef database update` to apply it; seed **1 Wallet record only** (well-known GUID, balance = PHP 100,000) via `AppDbContext.OnModelCreating` HasData — **do NOT seed Stock records** (Stocks are in-memory only, initialized inside MockMarketDataService constructor; see data-model.md EF Schema Notes: "Stock records are refreshed in-memory by MockMarketDataService; the DB stores the seed snapshot" refers to the service, not a DB table)
- [x] T010 [P] Implement backend/ReadyWealth.Api/Services/IMarketDataService.cs interface with `GetAllStocksAsync()`, `GetMarketStatusAsync()`, and computed views `GetGainersAsync()`, `GetLosersAsync()`, `GetMostActiveAsync()`
- [x] T011 [P] Implement backend/ReadyWealth.Api/Services/MockMarketDataService.cs: 20 PSE stocks with ±0.2% random price fluctuation; PSE market-hours logic Mon–Fri 09:30–15:30 PHT; `asOf` timestamp on each Stock (per R-01)
- [x] T012 [P] Define service interfaces in backend/ReadyWealth.Api/Services/: `IPaperOrderService.cs` (`PlaceOrderAsync(PlaceOrderRequest)`, `GetOrdersAsync()`, `ClosePositionAsync(Guid orderId)`); `IRecommendationService.cs` (`GetRecommendationsAsync()` → `IEnumerable<Recommendation>`); `IWatchlistService.cs` (`GetAllAsync()`, `AddAsync(string ticker, bool isAutoAdded)`, `RemoveAsync(string ticker)`); define all request/response DTOs in backend/ReadyWealth.Api/Dtos/
- [x] T013 Register initial services in backend/ReadyWealth.Api/Program.cs: DI registrations for AppDbContext (SQLite) and `IMarketDataService → MockMarketDataService` only (the only concrete implementation that exists by Phase 2); configure CORS policy allowing `http://localhost:5175`; add `app.UseSwaggerUI()` in development; add `public partial class Program {}` at end of file (WebApplicationFactory requirement from R-02) — remaining service registrations are added alongside each implementation in later phases

**Checkpoint**: Backend compiles with `dotnet build`; `dotnet ef database update` creates readywealth.db with seed data.

---

## Phase 3: User Story 1 — Live PSE Market Feed (Priority: P1) 🎯 MVP

**Goal**: Dashboard loads and displays real-time (mock) PSE stock data from the backend API.
Market status, top gainers/losers/active tabs, and "Prices delayed 15 min" notice all functional.

**Independent Test**: Load the dashboard and confirm stock data appears at the top with ticker,
price, change, and percentage. Verify green/red highlighting. Kill the backend and verify the
error state shows the last known timestamp.

### Tests for User Story 1 (MANDATORY)

- [x] T014 [P] [US1] Unit tests for MockMarketDataService: verify 20 stocks returned, market open/closed logic respects PHT timezone, top-gainers sorted by changePct desc, top-losers sorted asc, most-active sorted by volume desc — in backend/ReadyWealth.Tests/Unit/Services/MockMarketDataServiceTests.cs
- [x] T015 [P] [US1] Integration tests (WebApplicationFactory) for GET /api/v1/stocks, /api/v1/stocks/gainers, /api/v1/stocks/losers, /api/v1/stocks/active: verify 200 response shape, `marketOpen` boolean present, `lastUpdated` timestamp present — in backend/ReadyWealth.Tests/Integration/Endpoints/StocksEndpointsTests.cs
- [x] T016 [P] [US1] Unit tests for frontend useMarketStore: loading state, error state with lastKnown timestamp, topGainers/topLosers/topActive derived arrays — in frontend/tests/unit/stores/market.test.ts
- [x] T017 [P] [US1] Component test for MarketFeedPanel: tab switching between Gainers/Losers/Active/Watchlist, "Prices delayed 15 min" badge always visible, market Open/Closed status indicator renders "Market Open" when `marketStore.marketOpen === true` and "Market Closed" when false, error banner shown when store has error — in frontend/tests/unit/components/MarketFeedPanel.test.ts
- [x] T017a [P] [US1] Unit tests for useMarketFeed composable: interval is set to 15 minutes (900,000 ms) on mount, `marketStore.fetchStocks()` is called immediately on mount and on each interval tick, error from fetchStocks propagates to marketStore.error state, interval is cleared on unmount (no memory leak) — in frontend/tests/unit/composables/useMarketFeed.test.ts
- [x] T017b [P] [US1] Unit tests for useSnack composable: `showSuccess(message)` invokes the DS snackbar store with the correct message and success variant, `showError(message)` invokes with error variant — in frontend/tests/unit/composables/useSnack.test.ts

### Implementation for User Story 1

- [x] T018 [P] [US1] Implement backend/ReadyWealth.Api/Endpoints/StocksEndpoints.cs: `GET /api/v1/stocks` returning all stocks + marketOpen + lastUpdated; `GET /api/v1/stocks/gainers`, `/losers`, `/active` (filtered/sorted views); `503` error shape when IMarketDataService throws
- [x] T019 [US1] Add `VITE_API_BASE_URL=http://localhost:5000` to frontend/.env.local and configure Vite proxy in frontend/vite.config.ts: `/api` → `VITE_API_BASE_URL` (avoids CORS in dev)
- [x] T020 [US1] Create frontend/src/services/ApiMarketService.ts implementing IMarketService; calls `GET /api/v1/stocks` (all stocks) using `fetch`; maps response to `Stock[]`; sets `marketOpen` and `lastUpdated`
- [x] T021 [US1] Update frontend/src/main.ts to inject `ApiMarketService` instead of `MockMarketService` when `import.meta.env.VITE_USE_MOCK !== 'true'`; preserve mock mode via `.env.local` flag for offline development
- [x] T022 [US1] Update frontend/src/stores/market.ts `fetchStocks()` to call the injected IMarketService and propagate `error`, `lastUpdated`, and `marketOpen` state; bind `marketOpen` in frontend/src/components/market/MarketFeedPanel.vue to display a "Market Open" / "Market Closed" status badge alongside the "Prices delayed 15 min" notice (implements FR-015)

**Checkpoint**: `npm run dev` with backend running shows live stock data. `npm test` (backend) passes MockMarketDataService and Stocks endpoint tests. `npm test` (frontend) passes market store and MarketFeedPanel tests.

---

## Phase 4: User Story 2 — Investment Wallet & Trade Execution (Priority: P2)

**Goal**: Investor can view wallet balance, place Long/Short orders, and see balance decrease.
Duplicate submission within 3 seconds is blocked. Insufficient funds error shown.

**Independent Test**: View wallet balance (PHP 100,000). Place a Long order for SM, ₱9,000.
Confirm balance reads ₱91,000. Attempt to place a second order exceeding balance — confirm
"Insufficient funds" error. Place same order twice within 3 seconds — confirm 409 / duplicate blocked.

### Tests for User Story 2 (MANDATORY)

- [x] T023 [P] [US2] Unit tests for PaperOrderService: valid Long/Short order reduces wallet and creates Order+Transaction, invalid ticker returns 400, amount > balance returns 400, duplicate idempotencyKey within 3 s returns 409, shares = amount/entryPrice — in backend/ReadyWealth.Tests/Unit/Services/PaperOrderServiceTests.cs
- [x] T024 [P] [US2] Integration tests for GET /api/v1/wallet and POST /api/v1/orders: verify 200 wallet shape, 201 order shape with walletBalance, 400 error envelope on validation failure, 409 on duplicate key — in backend/ReadyWealth.Tests/Integration/Endpoints/WalletOrdersEndpointsTests.cs
- [x] T025 [P] [US2] Unit tests for frontend useWalletStore: `submitOrder()` decrements balance, `validateOrder()` returns false when amount > balance with error message, `credit()` adds to balance — in frontend/tests/unit/stores/wallet.test.ts
- [x] T026 [P] [US2] Component tests for TradeModal: Long/Short form renders, stock select populated, amount validation shows "Insufficient funds", submit calls submitOrder, duplicate rapid-click blocked — in frontend/tests/unit/components/TradeModal.test.ts

### Implementation for User Story 2

- [x] T027 [US2] Implement backend/ReadyWealth.Api/Services/PaperOrderService.cs: validate ticker exists in IMarketDataService, validate amount ≤ wallet.balance, compute `shares = amount / entryPrice`, write Order (status=Open) + Transaction (status=Open) to AppDbContext, deduct wallet balance, enforce 3-second idempotency guard using `ConcurrentDictionary<string, (DateTime, PlaceOrderResponse)>`
- [x] T028 [US2] Implement backend/ReadyWealth.Api/Endpoints/WalletEndpoints.cs: `GET /api/v1/wallet` reads single Wallet row from AppDbContext; implement backend/ReadyWealth.Api/Endpoints/OrderEndpoints.cs: `POST /api/v1/orders` delegates to IPaperOrderService; `GET /api/v1/orders` returns all orders reverse-chronological; add `builder.Services.AddScoped<IPaperOrderService, PaperOrderService>()` to backend/ReadyWealth.Api/Program.cs
- [x] T029 [US2] Create frontend/src/services/ApiOrderService.ts implementing IOrderService: `placeOrder()` calls `POST /api/v1/orders` with ticker, type, amount, idempotencyKey (generated UUID); `getOrders()` calls `GET /api/v1/orders`
- [x] T030 [US2] Update frontend/src/stores/wallet.ts: on mount, read balance from `GET /api/v1/wallet`; `submitOrder()` calls ApiOrderService and refreshes balance from API response `walletBalance` field
- [x] T031 [US2] Auto-add ticker to watchlist store on successful order placement in frontend/src/stores/wallet.ts (calls `watchlistStore.addIfAbsent(ticker)`)

**Checkpoint**: Place an order end-to-end — frontend posts to backend, backend deducts from SQLite wallet, frontend updates balance. Backend `dotnet test` passes all wallet/order tests. Frontend `npm test` passes wallet store and TradeModal tests.

---

## Phase 5: User Story 3 — AI Advice Corner (Priority: P3)

**Goal**: Advice panel displays ≥3 stock recommendations with ticker, rationale, and confidence level.
Disclaimer "Not financial advice — for informational purposes only" is always visible and non-dismissible.
Clicking a recommendation pre-fills the trade form.

**Independent Test**: Load the dashboard and verify ≥3 recommendations appear in the right panel,
each with ticker, reason, and High/Medium/Low confidence. Confirm disclaimer is present.
Click a recommendation and verify the trade modal opens with that stock pre-selected.

### Tests for User Story 3 (MANDATORY)

- [x] T032 [P] [US3] Unit tests for RecommendationService: top-3 by changePct with "Strong upward momentum" reason, top-2 by volume (not already in set) with "High trading activity" reason, result is deduped to max 5 items, confidence = High (>3%), Medium (1-3%), Low (<1%) — in backend/ReadyWealth.Tests/Unit/Services/RecommendationServiceTests.cs
- [x] T033 [P] [US3] Integration test for GET /api/v1/recommendations: verify 200 response with recommendations array, `generatedAt` timestamp, `disclaimer` field; verify 503 shape when insufficient market data — in backend/ReadyWealth.Tests/Integration/Endpoints/RecommendationsEndpointsTests.cs
- [x] T034 [P] [US3] Unit tests for frontend useAdviceStore: recommendations computed from market data, loading/error states, empty state when data unavailable — in frontend/tests/unit/stores/advice.test.ts
- [x] T035 [P] [US3] Component test for AdvicePanel: disclaimer always rendered and not conditionally hidden, ≥3 recommendation cards rendered, clicking a card emits event that opens TradeModal with pre-filled stock — in frontend/tests/unit/components/AdvicePanel.test.ts

### Implementation for User Story 3

- [x] T036 [P] [US3] Implement backend/ReadyWealth.Api/Services/RecommendationService.cs: inject IMarketDataService, apply generation rules from data-model.md (top 3 by positive changePct + top 2 by volume dedup), map confidence from changePct thresholds, return `IRecommendationService` interface result
- [x] T037 [US3] Implement backend/ReadyWealth.Api/Endpoints/RecommendationsEndpoints.cs: `GET /api/v1/recommendations` — returns recommendations + generatedAt + disclaimer string; `503` when IMarketDataService unavailable; add `builder.Services.AddScoped<IRecommendationService, RecommendationService>()` to backend/ReadyWealth.Api/Program.cs
- [x] T038 [US3] Update frontend/src/stores/advice.ts to fetch from `GET /api/v1/recommendations`; map response to `Recommendation[]`; expose `generatedAt` and `unavailableUntil` for error state

**Checkpoint**: Advice panel shows API-sourced recommendations. Disclaimer is always visible. Clicking "Trade" on a recommendation pre-fills TradeModal. Backend and frontend tests pass.

---

## Phase 6: User Story 4 — Transaction History (Priority: P4)

**Goal**: Transaction history view shows all past orders in reverse-chronological order with
ticker, type (Long/Short), amount, date, and status (Open/Closed). Empty state message shown
when no transactions exist.

**Independent Test**: Place one order, navigate to `/transactions`, confirm the order appears
with all required fields. Confirm status shows "Open". Close the position and refresh — confirm
status updates to "Closed" with realized P&L recorded.

### Tests for User Story 4 (MANDATORY)

- [x] T039 [P] [US4] Integration test for GET /api/v1/transactions: verify reverse-chronological order, all fields present including `realizedPnl` (null for open, numeric for closed), `closingPrice` field — in backend/ReadyWealth.Tests/Integration/Endpoints/TransactionsEndpointsTests.cs
- [x] T040 [P] [US4] Unit tests for frontend useTransactionsStore: `transactions` sorted newest-first, `add()` prepends, empty-state computed property — in frontend/tests/unit/stores/transactions.test.ts
- [x] T041 [P] [US4] Component test for TransactionsTable: renders all transaction fields, displays "Open"/"Closed"/"Pending" status, SprEmptyState shown when no transactions — in frontend/tests/unit/components/TransactionsTable.test.ts

### Implementation for User Story 4

- [x] T042 [US4] Implement backend/ReadyWealth.Api/Endpoints/TransactionEndpoints.cs: `GET /api/v1/transactions` — queries AppDbContext.Transactions ordered by `createdAt` descending; returns full transaction shape per contracts/api.md
- [x] T043 [US4] Update frontend/src/stores/transactions.ts to fetch from `GET /api/v1/transactions` on mount; replace in-memory `add()` with API refresh call after each order placement in wallet store

**Checkpoint**: `/transactions` route shows API-sourced transaction history. Backend and frontend tests pass.

---

## Phase 7: User Story 5 — Investment Portfolio Overview (Priority: P5)

**Goal**: Portfolio view shows all open positions with invested amount, current market value, and
unrealized P&L (Long: currentValue − investedAmount; Short: investedAmount − currentValue).
P&L values shown in green (gain) or red (loss). "Close Position" action credits wallet and marks
position Closed. Empty state shown when no open positions.

**Independent Test**: Place a Long order. View `/portfolio` — confirm position shows correct
shares, entry price, current value, and P&L. Click "Close Position" — confirm wallet is credited
with `shares × currentPrice` and position disappears from portfolio.

### Tests for User Story 5 (MANDATORY)

- [x] T044 [P] [US5] Integration tests for GET /api/v1/positions (verify P&L computed fields) and POST /api/v1/positions/{orderId}/close (verify wallet credited, order status = Closed, 404 on already-closed): in backend/ReadyWealth.Tests/Integration/Endpoints/PositionsEndpointsTests.cs
- [x] T045 [P] [US5] Unit tests for frontend usePositionsStore: `positionsWithCurrentValue` computed (Long and Short P&L formulas from R-04), `positionsWithCurrentValue` recomputes when `marketStore.stocks` updates (FR-012), `closePosition()` calls API and credits wallet store — in frontend/tests/unit/stores/positions.test.ts
- [x] T046 [P] [US5] Component tests for PortfolioTable (P&L shown green/red, SprEmptyState when no positions) and ClosePositionModal (confirm button calls closePosition, cancel dismisses) — in frontend/tests/unit/components/PortfolioTable.test.ts

### Implementation for User Story 5

- [x] T047 [US5] Implement backend/ReadyWealth.Api/Endpoints/PositionEndpoints.cs: `GET /api/v1/positions` — queries open Orders from AppDbContext, joins with IMarketDataService.GetAllStocksAsync() to compute `currentPrice`, `currentValue`, `unrealizedPnl`, `unrealizedPnlPct` (Long and Short formulas from data-model.md); `POST /api/v1/positions/{orderId}/close` — calculates realizedPnl at current delayed price, credits Wallet, sets Order.status = Closed + Order.closedAt, updates Transaction record
- [x] T048 [US5] Fix P&L calculation in frontend/src/stores/positions.ts: replace simplified `shares = amount / 10` with `shares = amount / entryPrice` from API response; update `positionsWithCurrentValue` computed to use Long/Short formulas from research.md R-04
- [x] T048a [US5] Wire market data updates to automatic portfolio re-valuation in frontend/src/stores/positions.ts: add `watch(() => marketStore.stocks, fetchPositions)` so that whenever the 15-min market feed refreshes, open position P&L values recalculate without a manual page reload (implements FR-012, SC-004 ≤60 s refresh requirement)
- [x] T049 [US5] Update frontend/src/stores/positions.ts `closePosition()`: call `POST /api/v1/positions/{id}/close`, then refresh wallet balance and positions list from API; show success/error snack via useSnack composable

**Checkpoint**: Portfolio view reflects live P&L from backend. Close Position flow credits wallet, removes position. All backend and frontend tests pass.

---

## Phase 8: Polish & Cross-Cutting Concerns (Watchlist + FR-019/020/021)

**Purpose**: Watchlist feature, responsive layout verification, coverage audit, and cleanup.

### Watchlist Backend + Tests

- [x] T050 [P] Integration tests for GET /api/v1/watchlist (all entries with current stock data), POST /api/v1/watchlist (201 created, 409 conflict), DELETE /api/v1/watchlist/{ticker} (204, 404) — in backend/ReadyWealth.Tests/Integration/Endpoints/WatchlistEndpointsTests.cs
- [x] T051 [P] Implement backend/ReadyWealth.Api/Services/WatchlistService.cs implementing IWatchlistService: `GetAllAsync()` queries AppDbContext.WatchlistEntries joined with IMarketDataService stock data; `AddAsync(ticker, isAutoAdded)` inserts WatchlistEntry returning 409 if already present; `RemoveAsync(ticker)` deletes entry returning 404 if absent; add `builder.Services.AddScoped<IWatchlistService, WatchlistService>()` to backend/ReadyWealth.Api/Program.cs; implement backend/ReadyWealth.Api/Endpoints/WatchlistEndpoints.cs delegating GET/POST/DELETE routes to IWatchlistService

### Watchlist Frontend + Tests

- [x] T052 [P] Unit tests for frontend useWatchlistStore: `addIfAbsent()` prevents duplicates, `toggle()` adds/removes, `watchlistStocks` computed joins with market store data — in frontend/tests/unit/stores/watchlist.test.ts
- [x] T053 [P] Update frontend/src/stores/watchlist.ts to sync with `GET /api/v1/watchlist` on mount; `add()` calls `POST /api/v1/watchlist`; `remove()` calls `DELETE /api/v1/watchlist/{ticker}`

### Responsive + Coverage + Cleanup

- [x] T054 [P] Verify responsive CSS Grid layout in frontend/src/index.css at 320 px (single column), 768 px (two column), 1024 px (three column) breakpoints; confirm wallet/feed/advice panels all visible and functional at each breakpoint
- [x] T055 [P] Run `dotnet-coverage collect dotnet test` in backend/ReadyWealth.Tests/ and verify 100% line coverage on `Services/` and `Domain/` per Constitution Principle VII; fix any gaps
- [x] T056 [P] Run `npm run test:coverage` in frontend/ and verify all 6 Pinia stores and both composables covered; fix any gaps
- [x] T057 [P] Dependency audit: run `dotnet list backend/ReadyWealth.Api/ package --outdated` and `npm outdated` in frontend/; remove any unused packages from ReadyWealth.Api.csproj and frontend/package.json
- [x] T058 Run quickstart.md validation: `npm run dev` (frontend mock mode), `dotnet run` (backend), `npm test` (frontend), `dotnet test` (backend), `npm run build` (frontend production build) — all must pass without errors

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion — **BLOCKS all user stories**
- **User Stories (Phase 3–7)**: All depend on Phase 2 completion; can proceed in priority order (P1 → P5) or in parallel if staffed
- **Polish (Phase 8)**: Depends on all user story phases complete

### User Story Dependencies

- **US1 (P1)**: First — backends stocks endpoint + frontend API integration. No dependencies on other stories.
- **US2 (P2)**: Requires US1 (stock data needed to validate tickers in PaperOrderService and populate the stock select in TradeModal)
- **US3 (P3)**: Requires US1 (RecommendationService reads from IMarketDataService); independent of US2
- **US4 (P4)**: Requires US2 (transactions created by order placement)
- **US5 (P5)**: Requires US2 (positions derived from orders) and US1 (P&L uses current stock price)

### Within Each User Story

- Tests MUST be written first and verified to FAIL before implementation
- Domain models before services
- Services before endpoints
- Endpoints before frontend API service
- Frontend service before store update
- Story complete and checkpointed before moving to next priority

### Parallel Opportunities

- Phase 1: T003–T006 all run in parallel (different projects/files)
- Phase 2: T010–T012 run in parallel (different service files); T007–T009 must precede T013
- Each user story phase: all `[P]` test tasks run in parallel before implementation starts
- Phase 8: T050–T057 all run in parallel (different files, coverage/audit tasks)

---

## Parallel Example: User Story 2

```bash
# Step 1 — Write tests in parallel (all different files):
T023: backend/ReadyWealth.Tests/Unit/Services/PaperOrderServiceTests.cs
T024: backend/ReadyWealth.Tests/Integration/Endpoints/WalletOrdersEndpointsTests.cs
T025: frontend/tests/unit/stores/wallet.test.ts
T026: frontend/tests/unit/components/TradeModal.test.ts

# Step 2 — Verify tests FAIL (no implementation yet)

# Step 3 — Implement sequentially:
T027: PaperOrderService.cs  →  T028: WalletEndpoints + OrderEndpoints
T029: ApiOrderService.ts    →  T030: wallet.ts store update  →  T031: auto-add watchlist

# Step 4 — Re-run tests, verify PASS
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T006)
2. Complete Phase 2: Foundational (T007–T013) — CRITICAL: blocks everything
3. Complete Phase 3: User Story 1 (T014–T022)
4. **STOP AND VALIDATE**: `dotnet test` passes; `npm test` passes; dashboard shows live stock data
5. Demo-ready: market feed with real backend, mock wallet

### Incremental Delivery

1. Phase 1 + 2 → Backend compiles; seed data in SQLite
2. Phase 3 (US1) → Dashboard shows live stock data (MVP demo)
3. Phase 4 (US2) → Investor can place and view orders
4. Phase 5 (US3) → Advice corner pulls from API
5. Phase 6 (US4) → Transaction history persisted
6. Phase 7 (US5) → Portfolio with live P&L + Close Position
7. Phase 8 → Watchlist, responsive QA, 100% coverage, cleanup

### Parallel Team Strategy

With two developers:

1. Both complete Phase 1 + 2 together
2. Developer A: US1 backend endpoints + tests; Developer B: US1 frontend API service + tests
3. Developer A: US2 backend (PaperOrderService + endpoints + tests); Developer B: US3 backend (RecommendationService + tests)
4. Merge — both stories independently testable

---

## Notes

- `[P]` tasks operate on different files with no blocking dependencies — safe to parallelize
- `[Story]` label maps every task to a user story for traceability to spec.md
- Each user story is independently completable, testable, and demo-able
- Write tests first, verify they FAIL, implement, verify they PASS
- Commit after each task or logical group
- Pause at every **Checkpoint** to validate story independently before moving on
- Frontend mock mode (`VITE_USE_MOCK=true`) is preserved throughout — offline dev always works
