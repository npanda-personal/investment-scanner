# Portfolio Management

## Ownership

Portfolio Management owns manual portfolios, holdings, transactions, portfolio valuation, allocation summaries, and lightweight signal display for holdings.

The module lives in `backend/src/modules/portfolio-management` and follows the flat backend module structure. It does not import legacy code or another module's repository directly.

## Public API

Mounted under `/api/v1`:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/portfolios` | List portfolios |
| POST | `/portfolios` | Create portfolio |
| GET | `/portfolios/:id` | Portfolio detail with holdings |
| PATCH | `/portfolios/:id` | Rename/update portfolio metadata |
| DELETE | `/portfolios/:id` | Delete portfolio |
| POST | `/portfolios/:id/holdings` | Add holding |
| PATCH | `/portfolios/:id/holdings/:holdingId` | Edit holding |
| DELETE | `/portfolios/:id/holdings/:holdingId` | Remove holding |
| GET | `/portfolios/:id/summary` | Portfolio valuation summary |
| GET | `/portfolios/:id/allocation` | Allocation by holding, sector, country, and currency |
| GET | `/portfolios/:id/transactions` | List transactions |
| POST | `/portfolios/:id/transactions` | Add transaction |

## Data Models

Prisma models:

- `Portfolio`: name, base currency, optional description, timestamps.
- `PortfolioHolding`: portfolio/instrument reference, symbol snapshot, company name snapshot, quantity, average cost, currency, notes, timestamps.
- `PortfolioTransaction`: manual ledger entries for `BUY`, `SELL`, `CASH_IN`, and `CASH_OUT`.

Holdings reference `Stock` from Market Data Foundation by `instrumentId`.

## Valuation Formulas

Per holding:

- `currentPrice`: latest adjusted close when available, otherwise latest close.
- `marketValue = quantity * currentPrice`.
- `investedAmount = quantity * averageCost`.
- `unrealizedPnL = marketValue - investedAmount`.
- `unrealizedPnLPercent = unrealizedPnL / investedAmount`.
- `dailyChange = currentPrice - previousClose`.
- `dailyChangePercent = dailyChange / previousClose`.
- `allocationPercent = holding marketValue / portfolio totalValue`.

If latest price is missing, the holding remains in the response with `currentPrice = null`, `marketValue = 0`, and portfolio `dataStatus = PARTIAL`.

## Allocation Formulas

Allocation buckets sum holding market values and divide each bucket by total portfolio value:

- by holding symbol
- by sector
- by country
- by currency

Missing sector/country values are grouped as `Unknown`.

## Signal Integration

The module uses the Signal Generation Engine public service export to attach the latest signal to each holding:

- score
- direction
- confidence
- generated timestamp

If a signal is missing or the signal service fails, the holding returns `signal = null`. Portfolio responses do not fail because of unavailable signal data.

The Signal Generation Engine frontend can add a signaled stock to a portfolio by consuming Portfolio Management public frontend API exports and calling the existing add-holding endpoint. No extra backend endpoint is required for this workflow.

## Transaction Scope

The MVP ledger stores manual transactions only. Validation rules:

- `BUY` and `SELL` require `instrumentId`, `quantity > 0`, and `price >= 0`.
- `CASH_IN` and `CASH_OUT` require `amount > 0`.
- All transactions require `currency` and a valid `transactionDate`.

## Realized P&L Scope

Realized P&L and FIFO accounting are intentionally out of scope for this MVP.

## Known Limitations

- No multi-currency FX conversion is applied yet; values are calculated in the holding currency and portfolio base currency is metadata only.
- No broker sync, rebalancing, recommendations, tax logic, optimization, or advanced attribution.
- Duplicate holdings for the same portfolio/instrument are prevented; users should edit the existing holding instead.

## Verification

Run from `backend`:

- `npx.cmd prisma generate`
- `npm.cmd run build`
- `npm.cmd test -- portfolio-management`

Run from `frontend`:

- `npm.cmd run build`
