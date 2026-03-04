# Feature Specification: ReadyWealth Investment Dashboard

**Feature Branch**: `001-investment-dashboard`
**Created**: 2026-03-03
**Status**: Draft
**Input**: User description: "the app is called ReadyWealth, for the initial page setup, i want to
make a dashboard where in the top there's an update of the current day Movements of Stocks from
Philippine Stock Exchange. in the left side theres a 'wallet' view where he can see his current
money for investment and theres a button for buying Long or Short investments. in the right is where
an advice corner that predicts what stocks are great for investment at the moment. there is also a
view for his transactions and investment portfolio."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Live PSE Market Feed (Priority: P1)

An investor opens ReadyWealth and immediately sees today's stock price movements from the
Philippine Stock Exchange displayed prominently at the top of the dashboard. The feed shows each
stock's ticker symbol, current price, price change, and percentage change for the day. The investor
can scan the market at a glance without leaving the app.

**Why this priority**: The market feed is the foundational context for every other action on the
dashboard. Without current market data, the wallet, advice corner, and portfolio views lose their
meaning. This is the minimum viable view that delivers standalone value to any investor.

**Independent Test**: Can be fully tested by loading the dashboard and verifying that stock data
from PSE appears at the top with price and movement indicators, without needing a wallet or account.

**Acceptance Scenarios**:

1. **Given** the dashboard loads, **When** the market is open on a trading day, **Then** the top
   section displays a scrollable/paginated list of PSE-listed stocks with ticker, price, change
   amount, and change percentage for the current day.
2. **Given** the market feed is displayed, **When** a stock has risen in price, **Then** it is
   visually highlighted in green with a positive change indicator.
3. **Given** the market feed is displayed, **When** a stock has fallen in price, **Then** it is
   visually highlighted in red with a negative change indicator.
4. **Given** the dashboard loads, **When** the market data cannot be retrieved, **Then** the feed
   section shows a clear error message and the last known data timestamp.
5. **Given** the investor has open positions or manually added stocks, **When** they view the
   Watchlist tab within the market feed, **Then** all watched stocks are shown with current price,
   day change, and a quick-trade button.
6. **Given** the investor opens a new position, **When** the order is confirmed, **Then** that
   stock is automatically added to the Watchlist if not already present.

---

### User Story 2 - Investment Wallet & Trade Execution (Priority: P2)

An investor views their available investment balance in the wallet panel on the left side of the
dashboard. When ready to invest, they click either the "Long" or "Short" button to open a trade
entry form. They select a stock, enter an amount, confirm the order, and see their wallet balance
update to reflect the committed funds.

**Why this priority**: The wallet and trade execution capability is the core transactional function
of the app. Without it, ReadyWealth is purely informational. This story is what converts a market
watcher into an active investor within the platform.

**Independent Test**: Can be fully tested by viewing the wallet balance, placing a Long or Short
order for a stock with a specified amount, and confirming the wallet balance decreases and a new
transaction record appears.

**Acceptance Scenarios**:

1. **Given** the user is on the dashboard, **When** they view the left wallet panel, **Then** they
   see their current available investment balance displayed clearly.
2. **Given** the user clicks the "Long" button, **When** the trade form appears, **Then** they can
   select a stock from the PSE list, enter an investment amount, and submit the order.
3. **Given** the user clicks the "Short" button, **When** the trade form appears, **Then** the
   same flow applies but the order is recorded as a Short position.
4. **Given** the user submits a Long or Short order, **When** the order is confirmed, **Then** the
   wallet balance decreases by the invested amount and the transaction appears in transaction history.
5. **Given** the user enters an amount that exceeds their wallet balance, **When** they attempt to
   submit the order, **Then** the system prevents submission and displays an "Insufficient funds"
   message.

---

### User Story 3 - AI Advice Corner (Priority: P3)

An investor checks the advice corner on the right side of the dashboard to see which stocks the
system currently recommends for investment. Each recommendation shows the stock ticker, a brief
rationale (e.g., upward momentum, high volume), and a confidence indicator. The investor uses this
as a starting point for deciding where to deploy funds.

**Why this priority**: The advice corner differentiates ReadyWealth from a plain market ticker. It
adds analytical value on top of raw data. It is lower priority than the wallet because investing
without advice is still possible, but advice without a wallet has no actionable outcome.

**Independent Test**: Can be fully tested by viewing the right-side advice panel and confirming
that at least three stock recommendations appear, each with a ticker, a reason, and a confidence
level, all derived from the current day's market data.

**Acceptance Scenarios**:

1. **Given** the dashboard loads, **When** the advice corner renders, **Then** it displays a ranked
   list of recommended stocks based on current-day market movement patterns and indicators.
2. **Given** a stock recommendation is displayed, **When** the investor views it, **Then** they see
   the stock ticker, current price, a short plain-language reason for the recommendation, and a
   confidence level (e.g., High / Medium / Low).
3. **Given** the advice corner is displayed, **When** the investor clicks a recommended stock,
   **Then** the Long/Short trade form pre-fills with that stock selected.
4. **Given** insufficient market data exists to generate recommendations, **When** the advice corner
   loads, **Then** it displays a message explaining that recommendations are unavailable and when
   they will refresh.
5. **Given** the advice corner is visible at any time, **When** the investor views it, **Then** a
   persistent "Not financial advice — for informational purposes only" disclaimer is displayed and
   cannot be dismissed or hidden.

---

### User Story 4 - Transaction History (Priority: P4)

An investor reviews a chronological list of all their past Long and Short investment orders placed
through ReadyWealth. Each entry shows the stock, order type, amount invested, date/time, and
current status. The investor can use this view to audit their trading activity and understand their
decision history.

**Why this priority**: Transaction history is essential for accountability and self-review but does
not block any other capability. It can be added after the wallet and trade flow are working.

**Independent Test**: Can be fully tested by placing at least one order via the wallet, then
navigating to the transaction history view and confirming the order appears with all expected fields.

**Acceptance Scenarios**:

1. **Given** the user navigates to the transaction history view, **When** they have past orders,
   **Then** all orders are listed in reverse chronological order with stock ticker, order type
   (Long/Short), amount, date, and status.
2. **Given** a transaction is displayed, **When** the investor views it, **Then** the status
   reflects whether the position is Open, Closed, or Pending.
3. **Given** the user has no transaction history, **When** they view the transactions tab, **Then**
   an empty-state message is shown encouraging them to make their first investment.

---

### User Story 5 - Investment Portfolio Overview (Priority: P5)

An investor views a summary of all their current open positions in the portfolio view. They can
see each held stock, the amount invested, current market value, and unrealized gain or loss.
The portfolio gives them a snapshot of how their investments are performing as a whole.

**Why this priority**: Portfolio view requires both trades and live market data to be meaningful.
It is the last building block, synthesizing data from all previous stories into a performance
summary.

**Independent Test**: Can be fully tested by placing at least one open order, then viewing the
portfolio to confirm the position appears with invested amount, current value, and P&L calculation
based on live market price.

**Acceptance Scenarios**:

1. **Given** the user views the portfolio, **When** they have open positions, **Then** each
   position is shown with stock ticker, order type (Long/Short), amount invested, current market
   value, and unrealized gain/loss in both absolute and percentage terms.
2. **Given** the portfolio is displayed, **When** a position is profitable, **Then** the
   unrealized gain is shown in green; when at a loss, it is shown in red.
3. **Given** the portfolio is displayed, **When** the market price updates, **Then** the portfolio
   values refresh to reflect the latest prices without requiring a manual page reload.
4. **Given** the user has no open positions, **When** they view the portfolio, **Then** an
   empty-state message is shown with a prompt to start investing.
5. **Given** the user views an open position in the portfolio, **When** they click "Close
   Position", **Then** the position is marked Closed, the realized P&L is calculated at the
   current delayed price, the wallet is credited accordingly, and the transaction history
   reflects the final Closed status.

---

### Edge Cases

- What happens when the PSE market is closed (weekends, holidays)? The feed must clearly indicate
  the market is closed and display the most recent closing prices with the date they were last updated.
- What happens when a stock from the user's portfolio is suspended or delisted? The position must
  remain visible with a "Suspended" or "Delisted" status and the last known price.
- What happens when the user has a Long position and the stock price drops to zero? The position
  shows a 100% loss and the user cannot close it for a positive amount.
- What happens when the advice corner and the wallet panel fail to load simultaneously? Each panel
  MUST fail independently — a broken advice corner MUST NOT prevent the wallet from functioning.
- What happens if the user rapidly clicks Long/Short multiple times? The system MUST prevent
  duplicate order submission for the same action within a 3-second window.
- What happens when a Watchlist stock is delisted or suspended? The stock remains in the Watchlist
  with a "Suspended" / "Delisted" badge and the last known price; it MUST NOT be removed
  automatically as the user may still hold an open position in it.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display current-day PSE stock price data (ticker, price, day change, day
  change percentage) in the dashboard header area. The feed MUST default to a curated view with
  three sections: Top Gainers, Top Losers, and Most Active by Volume. A full PSE stock list MUST
  be searchable when the investor selects a stock during trade entry.
- **FR-002**: System MUST visually distinguish rising stocks (green) from falling stocks (red) in
  the market feed.
- **FR-003**: System MUST display the user's available investment wallet balance in the left panel.
- **FR-004**: Users MUST be able to initiate a Long investment order from the wallet panel by
  selecting a stock and entering an amount.
- **FR-005**: Users MUST be able to initiate a Short investment order from the wallet panel by
  selecting a stock and entering an amount.
- **FR-006**: System MUST validate that the order amount does not exceed the available wallet
  balance before confirming any order.
- **FR-007**: System MUST record every confirmed order as a transaction with stock, type, amount,
  timestamp, and status.
- **FR-008**: System MUST display at least three stock recommendations in the advice corner, each
  with a plain-language rationale and a confidence level, derived from current market indicators.
- **FR-009**: Users MUST be able to pre-fill the trade form by clicking a recommended stock in the
  advice corner.
- **FR-010**: System MUST display a transaction history list showing all past orders in reverse
  chronological order.
- **FR-011**: System MUST display a portfolio view showing all open positions with current market
  value and unrealized gain/loss.
- **FR-012**: System MUST refresh portfolio position values whenever market price data updates.
- **FR-013**: System MUST handle market data unavailability gracefully by showing a clear error
  state with the last successful data timestamp.
- **FR-014**: System MUST prevent duplicate order submissions triggered within a 3-second window.
- **FR-022**: The Advice Corner and any screen displaying stock recommendations MUST show a
  persistent, clearly visible disclaimer: "Not financial advice — for informational purposes only."
  This notice MUST NOT be dismissible and MUST be present on every render of the recommendations
  surface.

- **FR-019**: System MUST provide a personal Watchlist accessible within the market feed area.
  Any stock in which the user holds an active open position MUST be automatically added to the
  Watchlist. Users MUST also be able to manually add or remove any PSE-listed stock from the
  Watchlist at any time.
- **FR-020**: The Watchlist MUST display the same data columns as the main market feed (ticker,
  price, day change, day change percentage) and MUST update on the same 15-minute delayed cycle.
- **FR-021**: Users MUST be able to initiate a Long or Short trade directly from a Watchlist entry,
  pre-filling the stock selection in the trade form.

- **FR-018**: Users MUST be able to close an open position from the portfolio view via an explicit
  "Close Position" action. Upon closing, the wallet MUST be credited with the invested amount
  adjusted by the realized gain or loss at the closing price. The transaction record MUST be
  updated to Closed status with the final P&L recorded.
- **FR-015**: System MUST display the market status (Open / Closed) alongside the PSE feed at all
  times.
- **FR-016**: Investment execution (Long/Short orders) MUST operate as simulated paper trading for
  this release — wallet funds are virtual and no real brokerage connection is established. The
  order execution layer MUST be designed with a clear abstraction boundary so that a real-money
  brokerage integration can be substituted in a future release without restructuring the wallet,
  portfolio, or transaction modules.
- **FR-017**: System MUST source PSE market data from a 15-minute delayed feed for this release.
  The data feed layer MUST be designed with a clear abstraction boundary so that a real-time
  feed subscription can be substituted in a future release (alongside real-money brokerage
  integration) without restructuring the market display, advice engine, or portfolio valuation
  modules. The dashboard MUST display a visible "Prices delayed 15 min" notice at all times.

### Key Entities

- **Stock**: A PSE-listed security identified by ticker symbol, with current price, day change,
  and day change percentage.
- **Wallet**: The user's available investment balance, reduced on order placement and updated on
  position close.
- **Order**: A user's investment instruction specifying stock, direction (Long/Short), amount, and
  timestamp; transitions through Pending → Open → Closed states. Closes only on explicit user
  action ("Close Position"); no automatic end-of-day close occurs.
- **Position**: An open Order that holds a current market value and an unrealized gain/loss
  calculated against the entry price. Exposes a "Close Position" action that settles the
  realized P&L and returns funds to the Wallet.
- **Recommendation**: An advice corner entry consisting of a stock reference, a plain-language
  rationale, and a confidence level generated from market indicators.
- **Transaction**: The immutable historical record of every order event with status and timestamp.
- **Watchlist**: A user-curated collection of PSE-listed stocks displayed within the market feed
  area. Automatically includes stocks with active open positions; the user may add or remove any
  additional stock manually. Shares the same price data and update cadence as the main feed.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The dashboard loads and displays PSE market data within 3 seconds on a standard
  broadband connection.
- **SC-002**: An investor can place a Long or Short order in 4 steps or fewer from the moment they
  decide to invest.
- **SC-003**: The advice corner displays updated stock recommendations within 5 minutes of
  significant market movement during trading hours.
- **SC-004**: Portfolio values visually update within 60 seconds of a market price change without
  requiring a manual page refresh.
- **SC-005**: 90% of first-time users can locate the wallet balance, place an order, and view
  their transaction history without assistance.
- **SC-006**: The dashboard remains fully functional on mobile (≥320 px), tablet (≥768 px), and
  desktop (≥1024 px) viewports, with no loss of core functionality at any breakpoint.
- **SC-007**: Each dashboard panel (market feed, wallet, advice corner) fails independently —
  a failure in one panel MUST NOT prevent the others from rendering.

## Clarifications

### Session 2026-03-03

- Q: Is the investment execution (Long/Short orders) simulated paper trading or connected to a real brokerage? → A: Paper trading (simulated) for this release; order execution layer must be abstracted to allow real-money brokerage substitution in a future release without restructuring wallet, portfolio, or transaction modules.
- Q: Should the PSE market data feed be real-time or 15-minute delayed? → A: 15-minute delayed for this release; data feed layer must be abstracted for real-time upgrade alongside future brokerage integration; dashboard must always display a "Prices delayed 15 min" notice.
- Q: How does an Open position transition to Closed — user-initiated or automatic? → A: User-initiated only; investor explicitly clicks "Close Position" on the portfolio; wallet is credited with the invested amount adjusted by realized P&L; no auto-close at end of day.
- Q: Should the market feed show all PSE stocks or a curated subset? → A: Curated default (top gainers, top losers, most active by volume) with full PSE search available when placing a trade; plus a personal watchlist where stocks from active investments are auto-added and the user can manually add/remove additional stocks.
- Q: Should the Advice Corner display a financial disclaimer? → A: Yes — a persistent "Not financial advice / for informational purposes only" notice must be always visible on the Advice Corner and any other screen that surfaces stock recommendations.

## Assumptions

- The user is already authenticated before reaching the dashboard; login/registration is out of
  scope for this feature.
- Wallet funds are pre-loaded manually for this phase; bank transfers or payment gateway
  integration are out of scope.
- The AI advice corner uses technical market indicators (price momentum, volume trends, moving
  averages) computed from the PSE data feed — no external ML service is required for the MVP.
- PSE data is sourced from a compatible third-party market data provider; the specific provider
  will be selected during the planning phase.
- "Long" means the investor profits if the stock price rises; "Short" means the investor profits
  if the stock price falls — standard financial definitions apply.
- Transaction history and portfolio data persist across sessions; data is not session-only.
