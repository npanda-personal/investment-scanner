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

- `Selected range return`: latest adjusted close return versus the oldest available price in the selected range.
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
- `peer_average_return`: average peer selected-range return where available.
- `relative_to_peer_average`: stock return minus peer average return.
- `fallback_used`: `peer_average`.

Benchmark symbols are not required for MVP and do not block the page.

Chart, selected range return, max drawdown, volatility, peer selected returns, and relative strength all use the same `range` query parameter. Fixed horizon metrics such as `1D`, `1W`, `1M`, `1Y`, and `3Y CAGR` remain explicitly labeled as fixed-horizon context.

## Frontend Feature

Frontend feature root:

- `frontend/src/features/stock-research-workbench`

Route:

- `/research/stocks/:id`

The existing Market Data Foundation instrument detail page links to this route with a `Research` button.

Implemented MVP UX:

- Overview header shows symbol, company, exchange, country, sector, industry, currency, market cap context, latest price, daily change, source, last updated timestamp, and status chip.
- Overview header exposes an `Add to Watchlist` action through the Watchlist Management public frontend feature.
- Overview header exposes a `Create Price Alert` action through the Alerts & Monitoring public frontend feature.
- Price chart supports `1W`, `1M`, `3M`, `6M`, `YTD`, `1Y`, `3Y`, `5Y`, and `MAX`.
- Performance panel displays selected range return plus fixed horizon metrics.
- Fundamentals, valuation, peers, and corporate actions render clear empty states when data is missing.
- Major sections expose trust metadata through source, last updated timestamp, and data status chips.
- Peer comparison cards navigate to `/research/stocks/:id` for that peer.

## Epic 2 Readiness Checks

| Check | Status | Notes |
| --- | --- | --- |
| Range consistency | Done | Chart, selected range return, max drawdown, volatility, peer returns, and relative strength use the selected range. |
| Relative strength | Done | Uses selected-range peer-average fallback; not hardcoded to `1Y`. |
| Trust metadata visible | Done | Header and major sections show source, last updated timestamp, and data status. |
| Missing-data UX | Done | Fundamentals, valuation, peers, and corporate actions have clean empty states. |
| Peer navigation | Done | Peer cards open that peer's research route. |
| Backend tests | Done | Workbench shape, range handling, CAGR, drawdown, volatility, peer valuation, relative strength fallback, validation, and route coverage are tested. |
| Build verification | Done | Backend build, frontend build, and targeted workbench tests pass. |

## Known Limitations

- Peer selection depends on instruments having sector/industry metadata from Epic 1.
- Benchmark-relative strength is not yet implemented beyond the peer-average fallback.
- Caching, frontend component tests, watchlist CTAs, DCF, analyst estimates, earnings transcripts, conviction scoring, portfolio intelligence, and other future-epic features are intentionally outside Epic 2 MVP.
- Frontend tests were not added because the project does not currently have a frontend test runner configured.

## Verification

Commands run:

- `backend`: `npm.cmd run build`
- `backend`: `npm.cmd test -- stock-research-workbench.service.test.ts stock-research-workbench.routes.test.ts stock-research-workbench.validation.test.ts market-data.routes.test.ts --runInBand --forceExit`
- `frontend`: `npm.cmd run build`

Latest result:

- Backend build passed.
- Frontend build passed.
- Targeted backend tests passed: 4 suites, 9 tests.
