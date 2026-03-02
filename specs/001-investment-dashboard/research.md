# Research: ReadyWealth Investment Dashboard

**Feature**: 001-investment-dashboard | **Date**: 2026-03-03

---

## R-01 — PSE Market Data Sourcing

**Decision**: Keep the existing `MockMarketService.ts` (20 PSE blue-chip stocks with ±0.2%
random price fluctuation simulation) as the primary data source for this release. No external
API dependency required.

**Rationale**: The mock service already implements `IMarketService`, uses real PSE tickers
and realistic prices, simulates the 15-min delayed cadence, and includes correct PSE market-
hours logic (Mon–Fri 09:30–15:30 PHT). For a hackathon demo, deterministic mock data is far
more reliable than a third-party feed.

**Live data option (optional future)**: Yahoo Finance supports PSE via the `.PS` ticker suffix
(e.g., `SM.PS`, `ALI.PS`). The backend can expose a thin proxy endpoint
`GET /api/v1/stocks/live/{ticker}` calling Yahoo Finance from .NET to avoid CORS.

**Alternatives considered**:

| Option | Verdict |
|--------|---------|
| Yahoo Finance (`.PS` suffix) | Free but unofficial, no SLA, rate-limited |
| Alpha Vantage | Only 25 req/day on free tier; limited PSE coverage |
| PSE Edge API (reverse-engineered) | Too fragile for hackathon |
| Stooq (CSV download) | No JSON, poor DX |

---

## R-02 — .NET 10 Minimal API + Persistence

**Decision**: Vertical-slice Minimal API in `ReadyWealth.Api/`; EF Core 10 with SQLite
(`Data Source=readywealth.db` in dev; `Data Source=:memory:` in tests).

**Rationale**: EF Core InMemory is explicitly discouraged by the EF Core team for test suites
involving business logic — it does not enforce FK constraints or SQL semantics, producing
false-positive tests. SQLite `:memory:` provides true SQL behaviour with zero infrastructure.
Migration to PostgreSQL/SQL Server later requires changing one line (`options.UseSqlite` →
`options.UseNpgsql`).

**Project layout**:

```
ReadyWealth.Api/
  Program.cs          — app bootstrap, DI registration, CORS, OpenAPI/Swagger
  Domain/             — pure C# domain records (no EF attributes)
  Persistence/        — AppDbContext, EF config, seed data
  Endpoints/          — one file per resource group (StocksEndpoints, OrdersEndpoints…)

ReadyWealth.Api.Tests/
  TestWebAppFactory.cs           — WebApplicationFactory<Program> + SQLite :memory:
  Endpoints/{Resource}Tests.cs   — integration tests per endpoint
  Unit/{Service}Tests.cs         — unit tests for domain services
```

**`public partial class Program {}` trick** at end of `Program.cs` exposes the type to
`WebApplicationFactory<Program>` in the test project.

**SQLite `:memory:` shared connection pattern** (keeps the in-memory DB alive for the test
lifetime — critical because SQLite `:memory:` drops when the connection closes):

```csharp
// TestWebAppFactory.cs
private SqliteConnection? _connection;
protected override void ConfigureWebHost(IWebHostBuilder builder)
{
    builder.ConfigureServices(services =>
    {
        _connection = new SqliteConnection("Data Source=:memory:");
        _connection.Open();   // open ONCE, kept alive for entire test session
        // replace real DbContext registration
        services.AddDbContext<AppDbContext>(o => o.UseSqlite(_connection));
    });
}
```

**NuGet packages (test project)**:
`Microsoft.AspNetCore.Mvc.Testing`, `Microsoft.Data.Sqlite`, `Microsoft.EntityFrameworkCore.Sqlite`,
`xunit`, `xunit.runner.visualstudio`, `coverlet.collector`

---

## R-03 — Vue 3 + Vitest Testing Setup

**Decision**: Vitest + `@vue/test-utils` + `jsdom` + `@pinia/testing`. Global DS component stubs
in `src/test/setup.ts` via `config.global.stubs`.

**Install**:

```bash
npm install -D vitest @vue/test-utils jsdom @pinia/testing @vitest/coverage-v8
```

**`vite.config.ts`** test block addition:

```typescript
test: {
  environment: 'jsdom',
  globals: true,
  setupFiles: ['./src/test/setup.ts'],
  coverage: { provider: 'v8', reporter: ['text', 'lcov'] },
}
```

**`src/test/setup.ts`** — globally stub all `Spr*` components so unit tests
don't need to install the full DS plugin:

```typescript
import { config } from '@vue/test-utils'
config.global.stubs = {
  SprTable: true, SprButton: true, SprCard: true, SprInput: true,
  SprBadge: true, SprLozenge: true, SprModal: true, SprTabs: true,
  SprStatus: true, SprBanner: true, SprSnackbar: true, SprSelect: true,
  SprInputCurrency: true, SprEmptyState: true,
}
```

**Pinia store isolation pattern** (prevents state leakage between tests):

```typescript
import { setActivePinia, createPinia } from 'pinia'
beforeEach(() => { setActivePinia(createPinia()) })
```

**Component test strategy**:
- Use `mount()` with `global.stubs` (or `shallowMount`) for component logic tests.
- Use `@pinia/testing`'s `createTestingPinia()` when testing components that interact with stores — it gives full control over initial store state and action spying.

**`package.json` scripts**:

```json
"test":          "vitest run",
"test:watch":    "vitest",
"test:coverage": "vitest run --coverage"
```

---

## R-04 — Position P&L Calculation

**Decision**: Use standard financial paper-trading formulas. Both Long and Short positions
track `shares` (fractional allowed for paper trading) and compute P&L from current price.

**Long position**:

```
shares          = amount / entryPrice
currentValue    = shares × currentPrice
unrealizedPnl   = currentValue − amount
unrealizedPnlPct = unrealizedPnl / amount × 100
```

Example: Bought SM at ₱912 for ₱9,120 → 10 shares. Price moves to ₱950 →
currentValue = ₱9,500, P&L = +₱380 (+4.17%)

**Short position** (paper trading — investor profits when price falls):

```
shares          = amount / entryPrice       (units "borrowed")
currentValue    = shares × currentPrice     (cost to buy back)
unrealizedPnl   = amount − currentValue     (profit = entry − current)
unrealizedPnlPct = unrealizedPnl / amount × 100
```

Example: Shorted ALI at ₱28.50 for ₱2,850 → 100 shares. Price falls to ₱27.00 →
currentValue = ₱2,700, P&L = +₱150 (+5.26%)

**Close position settlement**:

```
realizedPnl (Long)  = closingPrice × shares − amount
realizedPnl (Short) = amount − closingPrice × shares
walletCredit        = amount + realizedPnl   (= shares × closingPrice for Long)
```

**Known gap in current frontend**: `positions.ts` uses `shares = amount / 10` (simplified);
this will be corrected in Phase 4 when the backend calculates `shares = amount / entryPrice`
and the frontend reads positions from the API.

---

## Summary of Decisions

| # | Topic | Decision |
|---|-------|----------|
| R-01 | PSE data | Keep `MockMarketService.ts`; Yahoo Finance `.PS` optional future live proxy |
| R-02 | Backend persistence | SQLite via EF Core; `:memory:` in tests; `public partial class Program {}` for WAF |
| R-03 | Frontend testing | Vitest + `@vue/test-utils` + jsdom; global stubs; `setActivePinia(createPinia())` per test |
| R-04 | P&L formula | Standard financial formulas; Short P&L inverted; wallet credited at close |
