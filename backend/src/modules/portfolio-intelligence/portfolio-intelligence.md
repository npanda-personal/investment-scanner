# Portfolio Intelligence

## Ownership

Portfolio Intelligence owns MVP portfolio health scoring, holding review labels, red flag detection, review ranking, good/bad/needs-attention grouping, and signal overlay summaries.

It is calculation-only in the MVP. It consumes Portfolio Management through public service exports and does not import another module's repository directly.

## Endpoints

Mounted under `/api/v1`:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/portfolios/:id/intelligence` | Full portfolio intelligence response |
| GET | `/portfolios/:id/red-flags` | Red flag subset |
| GET | `/portfolios/:id/review` | Holding review ranking subset |

## Scoring Model

Health score is `0-100`.

Inputs:

- concentration risk
- unrealized P&L health
- latest signal quality
- data completeness
- sector concentration

Weighted breakdown:

- concentration: 20%
- P&L health: 25%
- signal quality: 25%
- data completeness: 20%
- sector concentration: 10%

Status thresholds:

- `75-100`: `HEALTHY`
- `50-74`: `WATCH`
- `0-49`: `AT_RISK`

## Thresholds

Defaults:

- loss threshold: `-15%`
- daily drop threshold: `-5%`
- top holding concentration: `25%`
- sector concentration: `50%`
- country concentration: `80%`
- minimum holdings: `5`
- stale signal age: `7 days`

Thresholds live in `portfolio-intelligence.validation.ts` for easy adjustment.

## Holding Decisions

Labels:

- `GOOD`: positive P&L, reasonable allocation, and bullish or neutral signal.
- `WATCH`: small loss, neutral/missing signal, or mild concentration.
- `REVIEW`: bearish signal, stale signal, or loss beyond review threshold.
- `HIGH_RISK`: major loss, high allocation concentration, missing price, or bearish signal plus large loss.

Action suggestions:

- `HOLD`
- `REVIEW`
- `REDUCE_RISK`

The module avoids direct sell-now language.

## Red Flag Rules

Holding-level flags:

- unrealized loss worse than threshold
- daily drop worse than threshold
- bearish signal
- missing latest price
- missing or stale signal
- allocation above threshold

Portfolio-level flags:

- top holding concentration
- sector concentration
- country concentration
- too few holdings
- elevated bearish signal exposure
- missing valuation data

Each flag includes severity, category, title, description, and affected holdings where applicable.

## Frontend

Frontend feature root:

- `frontend/src/features/portfolio-intelligence`

The feature exposes a `PortfolioIntelligencePanel` through its public index. Portfolio Management embeds this panel in the portfolio detail page.

The panel shows:

- health score and status badge
- score breakdown
- signal overlay
- red flags
- review ranking
- strong holdings
- weak holdings
- needs review
- data issues

## Known Limitations

- No optimizer, rebalance engine, tax engine, portfolio backtesting, or advanced risk engine.
- No correlation, volatility, beta, or factor exposure analysis yet.
- Fundamentals red flags are limited by what Portfolio Management summary exposes.
- Stale price age is not evaluated yet because the portfolio summary currently exposes price value, not price timestamp.

## Verification

Run from `backend`:

- `npm.cmd run build`
- `npm.cmd test -- portfolio-intelligence --runInBand`
- `npm.cmd test -- --runInBand`

Run from `frontend`:

- `npm.cmd run build`
