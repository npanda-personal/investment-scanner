# Stock Research Workbench

## Placement Decision

Epic 2 is implemented as a dedicated `stock-research-workbench` module and frontend feature.

Reason:

- The workbench is an investor-facing research workflow, not raw market data ownership.
- Market Data Foundation remains the source of truth for instruments, prices, fundamentals, corporate actions, FX, and trust metadata.
- The workbench consumes Market Data Foundation through public exports/APIs and does not import legacy scanner, backtester, watchlist, smart-money, service, or page code.

## Backend Structure

Backend files are flat:

- `stock-research-workbench.module.ts`
- `stock-research-workbench.router.ts`
- `stock-research-workbench.controller.ts`
- `stock-research-workbench.service.ts`
- `stock-research-workbench.types.ts`
- `stock-research-workbench.validation.ts`
- `stock-research-workbench.md`
- `index.ts`

No nested backend folders are used.

## Reused Source

Reused through public Market Data Foundation exports:

- `MarketDataFoundationService`
- instrument APIs
- latest price APIs
- historical price APIs
- persisted fundamentals APIs
- persisted corporate actions APIs

No legacy folders are imported.

## Endpoints

Mounted under `/api/v1`:

| Endpoint | Purpose |
| --- | --- |
| `GET /api/v1/research/stocks/:instrumentId/overview` | Stock overview header data |
| `GET /api/v1/research/stocks/:instrumentId/performance` | Performance metrics for a requested range |
| `GET /api/v1/research/stocks/:instrumentId/peers` | Same sector/industry peer comparison |
| `GET /api/v1/research/stocks/:instrumentId/relative-strength` | Relative strength using peer-average fallback |
| `GET /api/v1/research/stocks/:instrumentId/workbench` | Aggregated workbench response |

## Metric Definitions

- `1D`, `1W`, `1M`, `1Y`: latest adjusted close return versus an approximate trading-day offset.
- `YTD`: latest adjusted close return versus first available price after January 1 of the latest price year.
- `3Y CAGR`: annualized return over roughly `252 * 3` trading days.
- `Max drawdown`: largest percentage decline from prior peak in the selected range.
- `Volatility`: annualized standard deviation of daily returns in the selected range.

If history is insufficient, metrics return `null`.

## Peer And Valuation Logic

- Peers are selected from available instruments with the same industry first, falling back to same sector.
- The workbench uses up to 10 peers sorted by market cap.
- Valuation context includes stock P/E, peer average P/E, stock dividend yield, peer average dividend yield, and market cap rank among available peers.
- If no peers are available, the frontend displays an empty state.

## Relative Strength Logic

MVP relative strength uses peer-average fallback:

- `stock_return`: selected range return.
- `peer_average_return`: average peer 1Y return where available.
- `relative_to_peer_average`: stock return minus peer average return.

Benchmark symbols are not required for MVP and do not block the page.

## Frontend Feature

Frontend feature root:

- `frontend/src/features/stock-research-workbench`

Route:

- `/research/stocks/:id`

The existing Market Data Foundation instrument detail page links to this route with a `Research` button.

## Known Limitations

- Peer selection depends on instruments having sector/industry metadata from Epic 1.
- Benchmark-relative strength is not yet implemented beyond the peer-average fallback.
- No DCF, analyst estimates, transcripts, conviction scoring, portfolio intelligence, or future-epic features are included.
- Frontend tests were not added because the project does not currently have a frontend test runner configured.

## Verification

Run:

- `backend`: `npm.cmd run build`
- `backend`: `npm.cmd test -- stock-research-workbench.service.test.ts stock-research-workbench.routes.test.ts --runInBand --forceExit`
- `frontend`: `npm.cmd run build`
