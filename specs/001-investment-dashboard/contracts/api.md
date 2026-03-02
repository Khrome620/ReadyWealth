# REST API Contract: ReadyWealth Investment Dashboard

**Version**: v1 | **Base URL**: `/api/v1` | **Date**: 2026-03-03
**Format**: JSON (all request/response bodies unless noted)
**Auth**: None (single-user, pre-authenticated; to be added in future release)

---

## Market

### `GET /api/v1/stocks`

Returns the current (15-min delayed) snapshot of all PSE stocks.

**Response `200 OK`**

```json
{
  "stocks": [
    {
      "ticker":    "SM",
      "name":      "SM Investments Corp.",
      "price":     912.00,
      "change":    12.00,
      "changePct": 1.33,
      "volume":    1245300,
      "asOf":      "2026-03-03T09:45:00+08:00"
    }
  ],
  "marketOpen":   true,
  "lastUpdated":  "2026-03-03T09:45:00+08:00"
}
```

**Error `503 Service Unavailable`** — when market data source is unreachable

```json
{ "error": "Market data unavailable", "lastKnownAt": "2026-03-03T09:30:00+08:00" }
```

---

### `GET /api/v1/stocks/gainers`

Returns top 10 stocks by positive `changePct` descending.

**Response `200 OK`** — same shape as `/api/v1/stocks` but `stocks` filtered and sorted.

---

### `GET /api/v1/stocks/losers`

Returns top 10 stocks by negative `changePct` ascending.

**Response `200 OK`** — same shape as `/api/v1/stocks` filtered/sorted.

---

### `GET /api/v1/stocks/active`

Returns top 10 stocks by `volume` descending.

**Response `200 OK`** — same shape as `/api/v1/stocks` filtered/sorted.

---

## Wallet

### `GET /api/v1/wallet`

Returns the user's current wallet balance.

**Response `200 OK`**

```json
{
  "id":        "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "balance":   100000.00,
  "updatedAt": "2026-03-03T09:00:00+08:00"
}
```

---

## Orders

### `POST /api/v1/orders`

Places a new Long or Short paper-trading order.

**Request body**

```json
{
  "ticker":         "SM",
  "type":           "long",
  "amount":         9120.00,
  "idempotencyKey": "client-uuid-v4"
}
```

| Field | Type | Constraints |
|-------|------|-------------|
| `ticker` | string | required; must be a valid PSE ticker |
| `type` | `"long"` \| `"short"` | required |
| `amount` | number | > 0; ≤ wallet.balance |
| `idempotencyKey` | string | optional; max 64 chars; if provided, duplicate requests within 3 s return the original response |

**Response `201 Created`**

```json
{
  "orderId":       "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "ticker":        "SM",
  "type":          "long",
  "amount":        9120.00,
  "shares":        10.00,
  "entryPrice":    912.00,
  "status":        "open",
  "placedAt":      "2026-03-03T09:47:00+08:00",
  "walletBalance": 90880.00
}
```

**Error `400 Bad Request`** — validation failure

```json
{
  "errors": {
    "ticker": ["Ticker 'XYZ' is not a valid PSE-listed stock."],
    "amount": ["Amount exceeds available wallet balance of ₱90,880.00."]
  }
}
```

**Error `409 Conflict`** — duplicate idempotencyKey within 3 s (returns original order)

```json
{
  "orderId":  "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "duplicate": true
}
```

---

### `GET /api/v1/orders`

Returns all orders in reverse chronological order.

**Response `200 OK`**

```json
{
  "orders": [
    {
      "orderId":    "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "ticker":     "SM",
      "type":       "long",
      "amount":     9120.00,
      "shares":     10.00,
      "entryPrice": 912.00,
      "status":     "open",
      "placedAt":   "2026-03-03T09:47:00+08:00",
      "closedAt":   null
    }
  ]
}
```

---

## Positions

### `GET /api/v1/positions`

Returns all open positions with live P&L calculated from current market prices.

**Response `200 OK`**

```json
{
  "positions": [
    {
      "orderId":          "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "ticker":           "SM",
      "type":             "long",
      "investedAmount":   9120.00,
      "shares":           10.00,
      "entryPrice":       912.00,
      "currentPrice":     924.00,
      "currentValue":     9240.00,
      "unrealizedPnl":    120.00,
      "unrealizedPnlPct": 1.32
    }
  ]
}
```

---

### `POST /api/v1/positions/{orderId}/close`

Closes an open position. Calculates realized P&L at current delayed price and credits the wallet.

**Path parameter**: `orderId` — UUID of the order/position to close

**Request body**: none

**Response `200 OK`**

```json
{
  "orderId":        "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "ticker":         "SM",
  "type":           "long",
  "closingPrice":   924.00,
  "realizedPnl":    120.00,
  "walletBalance":  91000.00,
  "closedAt":       "2026-03-03T14:30:00+08:00"
}
```

**Error `404 Not Found`** — position does not exist or is already closed

```json
{ "error": "Position not found or already closed.", "orderId": "9b1deb4d-..." }
```

---

## Transactions

### `GET /api/v1/transactions`

Returns all transactions in reverse chronological order.

**Response `200 OK`**

```json
{
  "transactions": [
    {
      "id":           "b3d9c4e0-1234-5678-abcd-ef0123456789",
      "orderId":      "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "ticker":       "SM",
      "type":         "long",
      "amount":       9120.00,
      "status":       "open",
      "realizedPnl":  null,
      "closingPrice": null,
      "createdAt":    "2026-03-03T09:47:00+08:00",
      "updatedAt":    "2026-03-03T09:47:00+08:00"
    }
  ]
}
```

---

## Watchlist

### `GET /api/v1/watchlist`

Returns all watchlist entries with current stock data.

**Response `200 OK`**

```json
{
  "watchlist": [
    {
      "ticker":      "SM",
      "name":        "SM Investments Corp.",
      "price":       912.00,
      "change":      12.00,
      "changePct":   1.33,
      "volume":      1245300,
      "isAutoAdded": true,
      "addedAt":     "2026-03-03T09:47:00+08:00"
    }
  ]
}
```

---

### `POST /api/v1/watchlist`

Manually adds a stock to the watchlist.

**Request body**

```json
{ "ticker": "GLO" }
```

**Response `201 Created`**

```json
{ "ticker": "GLO", "isAutoAdded": false, "addedAt": "2026-03-03T10:00:00+08:00" }
```

**Error `409 Conflict`** — already in watchlist

```json
{ "error": "Ticker 'GLO' is already in the watchlist." }
```

---

### `DELETE /api/v1/watchlist/{ticker}`

Removes a stock from the watchlist.

**Response `204 No Content`**

**Error `404 Not Found`**

```json
{ "error": "Ticker 'GLO' is not in the watchlist." }
```

---

## Advice / Recommendations

### `GET /api/v1/recommendations`

Returns up to 5 AI-derived stock recommendations from current market data.

**Response `200 OK`**

```json
{
  "recommendations": [
    {
      "ticker":       "SM",
      "name":         "SM Investments Corp.",
      "currentPrice": 912.00,
      "reason":       "Strong upward momentum",
      "confidence":   "high"
    }
  ],
  "generatedAt":  "2026-03-03T09:45:00+08:00",
  "disclaimer":   "Not financial advice — for informational purposes only."
}
```

**Error `503 Service Unavailable`** — insufficient market data

```json
{
  "error":       "Recommendations unavailable — insufficient market data.",
  "retryAfter":  "2026-03-03T10:00:00+08:00"
}
```

---

## Common Error Shapes

All error responses follow this envelope:

```json
{
  "error":  "Human-readable description of what went wrong",
  "detail": "Optional technical context (dev mode only)"
}
```

HTTP status codes used:

| Code | Meaning |
|------|---------|
| `200` | Success |
| `201` | Resource created |
| `204` | No content (DELETE success) |
| `400` | Validation error |
| `404` | Resource not found |
| `409` | Conflict (duplicate idempotency key, already-in-watchlist) |
| `503` | External data source unavailable |

---

## OpenAPI / Swagger

The backend will expose Swagger UI at `/swagger` in development (via `app.UseSwaggerUI()`).
OpenAPI spec will be auto-generated at `/swagger/v1/swagger.json`.
