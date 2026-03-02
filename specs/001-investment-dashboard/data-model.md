# Data Model: ReadyWealth Investment Dashboard

**Feature**: 001-investment-dashboard | **Date**: 2026-03-03

---

## Entities

### Stock

Represents a PSE-listed security at a point in time (delayed ~15 min).

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `ticker` | `string` | PK, max 10 chars, uppercase | PSE ticker symbol (e.g., `SM`, `ALI`) |
| `name` | `string` | required, max 200 chars | Full company name |
| `price` | `decimal` | > 0, scale 4 | Current (delayed) price in PHP |
| `change` | `decimal` | scale 4 | Absolute price change from previous close (PHP) |
| `changePct` | `decimal` | scale 4 | Percentage price change from previous close |
| `volume` | `long` | ≥ 0 | Shares traded today |
| `asOf` | `DateTimeOffset` | required | Timestamp of the data point |

**Derived views** (computed, not stored):
- `topGainers` — `changePct > 0` sorted descending, top 10
- `topLosers` — `changePct < 0` sorted ascending, top 10
- `mostActive` — sorted by `volume` descending, top 10

---

### Wallet

One wallet per user (single-user hackathon scope; no UserId FK required in MVP).

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `Guid` | PK | |
| `balance` | `decimal` | ≥ 0, scale 2 | Available PHP balance |
| `updatedAt` | `DateTimeOffset` | required | Last mutation timestamp |

**Business rules**:
- Balance is reduced by `order.amount` on order placement.
- Balance is increased by `position.currentValue` (calculated at delayed price) on position close.
- Balance MUST NOT go below 0 — validated before every order.

---

### Order

Represents an investor's investment instruction. Transitions:
`Pending` → `Open` → `Closed`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `Guid` | PK | |
| `ticker` | `string` | FK → Stock.ticker | PSE ticker |
| `type` | `OrderType` | `Long` \| `Short` | Direction |
| `amount` | `decimal` | > 0, ≤ wallet.balance at time of placement, scale 2 | PHP invested |
| `shares` | `decimal` | computed: `amount / entryPrice`, scale 6 | Units purchased |
| `entryPrice` | `decimal` | > 0, scale 4 | Market price at order time |
| `status` | `OrderStatus` | `Pending` → `Open` → `Closed` | Current state |
| `idempotencyKey` | `string?` | nullable, max 64 chars | Client-generated key; rejects duplicate within 3 s |
| `placedAt` | `DateTimeOffset` | required | Order timestamp |
| `closedAt` | `DateTimeOffset?` | nullable | Set when position is closed |

**Business rules**:
- `shares = amount / entryPrice` at time of placement.
- Order status transitions to `Open` immediately after successful placement (paper trading — no async settlement).
- `closedAt` is set when the investor explicitly closes the position; wallet is credited.
- No automatic end-of-day close.

---

### Position

An open Order viewed through the lens of current market price. A `Position` is the live
projection of an `Order`; it does not have its own storage row — it is derived from Orders +
current Stock prices.

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| `orderId` | `Guid` | Order.id | Reference to the underlying order |
| `ticker` | `string` | Order.ticker | |
| `type` | `OrderType` | Order.type | |
| `investedAmount` | `decimal` | Order.amount | Original PHP invested |
| `shares` | `decimal` | Order.shares | Units held |
| `entryPrice` | `decimal` | Order.entryPrice | Price at placement |
| `currentPrice` | `decimal` | Stock.price (live) | Current delayed price |
| `currentValue` | `decimal` | `shares × currentPrice` | Current market value in PHP |
| `unrealizedPnl` | `decimal` | `currentValue − investedAmount` | Unrealized gain/loss in PHP |
| `unrealizedPnlPct` | `decimal` | `unrealizedPnl / investedAmount × 100` | Unrealized gain/loss % |

**Note on Short positions**: For paper trading, Short P&L is inverted:
- `unrealizedPnl (Short) = investedAmount − currentValue`

---

### Transaction

Immutable historical record of every order event. Created at placement; updated to `Closed`
when position is explicitly closed.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `Guid` | PK | |
| `orderId` | `Guid` | FK → Order.id | |
| `ticker` | `string` | required | |
| `type` | `OrderType` | `Long` \| `Short` | |
| `amount` | `decimal` | > 0, scale 2 | PHP invested |
| `status` | `TransactionStatus` | `Pending`, `Open`, `Closed` | Mirrors Order status |
| `realizedPnl` | `decimal?` | nullable, scale 2 | Set only when status = `Closed` |
| `closingPrice` | `decimal?` | nullable, scale 4 | Delayed price at close |
| `createdAt` | `DateTimeOffset` | required | |
| `updatedAt` | `DateTimeOffset` | required | |

---

### Recommendation

Ephemeral — derived at runtime from current Stock data; never persisted.

| Field | Type | Description |
|-------|------|-------------|
| `ticker` | `string` | PSE ticker |
| `name` | `string` | Company name |
| `currentPrice` | `decimal` | Delayed price at generation time |
| `reason` | `string` | Plain-language rationale (e.g., "Strong upward momentum") |
| `confidence` | `ConfidenceLevel` | `High` (changePct > 3%), `Medium` (1–3%), `Low` (< 1%) |

**Generation rules** (computed by advice engine from market data):
1. Top 3 by positive `changePct` → reason = "Strong upward momentum"
2. Top 2 by `volume` (not already in set 1) → reason = "High trading activity"
3. Return first 5, deduplicated by ticker.

---

### Watchlist

A user-curated set of tickers. Backed by a simple join table.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `Guid` | PK | |
| `ticker` | `string` | FK → Stock.ticker | |
| `addedAt` | `DateTimeOffset` | required | |
| `isAutoAdded` | `bool` | default false | True if added automatically from position open |

**Business rules**:
- On order placement: if `ticker` not already in Watchlist, insert with `isAutoAdded = true`.
- User may manually add any PSE-listed ticker.
- User may remove any ticker (auto-added or manual) at any time.
- Watchlist displays same data columns as main market feed, same 15-min update cadence.

---

## Enumerations

```csharp
public enum OrderType      { Long, Short }
public enum OrderStatus    { Pending, Open, Closed }
public enum TransactionStatus { Pending, Open, Closed }
public enum ConfidenceLevel { High, Medium, Low }
```

---

## State Transitions

```
Order Placement:
  [User clicks Long/Short]
    → validate: amount > 0 AND amount ≤ wallet.balance
    → deduct wallet.balance by amount
    → create Order { status = Open, entryPrice = Stock.price }
    → create Transaction { status = Open }
    → auto-add ticker to Watchlist if not present
    → emit success snack

Position Close:
  [User clicks "Close Position"]
    → currentValue = order.shares × Stock.price (delayed)
    → realizedPnl = currentValue − order.amount (Long)
                  = order.amount − currentValue (Short)
    → credit wallet.balance += currentValue
    → update Order { status = Closed, closedAt = now }
    → update Transaction { status = Closed, realizedPnl, closingPrice }
    → emit success snack
```

---

## EF Core Schema Notes

- `ReadyWealthDbContext` targets SQLite for hackathon; connection string via `appsettings.json`
- Migrations: `dotnet ef migrations add InitialCreate`
- Seed data: 1 Wallet record (PHP 100,000 balance), 20 Stock records (mock PSE data)
- `Stock` records are refreshed in-memory by `MockMarketDataService`; the DB stores the seed snapshot

---

## Frontend Type Mapping (`src/types/index.ts`)

```typescript
export interface Stock {
  ticker: string; name: string; price: number;
  change: number; changePct: number; volume: number;
}
export interface Wallet       { balance: number }
export type    OrderType      = 'long' | 'short'
export interface Order        { ticker: string; type: OrderType; amount: number }
export interface Position     { id: string; ticker: string; type: OrderType;
                                investedAmount: number; shares: number;
                                entryPrice: number; currentPrice: number }
export interface Transaction  { id: string; ticker: string; type: OrderType;
                                amount: number; date: string;
                                status: 'pending' | 'completed' | 'failed' }
export interface Recommendation { ticker: string; name: string; currentPrice: number;
                                   reason: string; confidence: 'high' | 'medium' | 'low' }
```
