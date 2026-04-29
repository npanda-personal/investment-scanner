# Smart Money Intelligence

## Ownership

`smart-money-intelligence` owns MVP smart-money style context for stocks and sectors. It analyzes available local/free market data to show whether price-volume behavior looks more like accumulation, neutral activity, or distribution.

This module does not own portfolio management, signal generation, backtesting, broker execution, options flow, paid institutional data, prediction modeling, alerts, or recommendations.

## Backend Structure

Backend files are intentionally flat:

- `smart-money-intelligence.module.ts`
- `smart-money-intelligence.router.ts`
- `smart-money-intelligence.controller.ts`
- `smart-money-intelligence.service.ts`
- `smart-money-intelligence.repository.ts`
- `smart-money-intelligence.validation.ts`
- `smart-money-intelligence.types.ts`
- `smart-money-intelligence.provider.ts`
- `smart-money-intelligence.md`
- `index.ts`

The service consumes Market Data Foundation through public exports only.

## Endpoints

Mounted under `/api/v1`:

| Endpoint | Purpose |
| --- | --- |
| `GET /smart-money/stocks/:instrumentId` | Stock-level smart money summary |
| `GET /smart-money/sectors` | Sector-level smart money aggregation |
| `GET /smart-money/top` | Top accumulation candidates |
| `GET /smart-money/distribution` | Top distribution warnings |
| `GET /smart-money/health` | Module health and data coverage notes |

Query params:

- `limit`: clamped from 1 to 100
- `range`: `1M`, `3M`, or `6M`; defaults to `3M`
- `sector`: optional for top/distribution lists

## Data Sources

MVP real data:

- historical price and volume from Market Data Foundation

Placeholder data:

- insider activity
- institutional ownership

The placeholder provider returns `MISSING` and a clear explanation. The module does not fake unavailable insider or institutional data.

## Scoring Methodology

Signals include:

- unusual volume vs 20-day average
- price up on above-average volume
- price down on above-average volume
- close near high on high volume
- close near low on high volume
- multi-day accumulation pattern
- multi-day distribution pattern

Score starts at 50:

- accumulation signal strength raises the score
- distribution signal strength lowers the score
- insider/ownership is not scored while unavailable

Thresholds:

- `score >= 70`: `ACCUMULATION`
- `score <= 35`: `DISTRIBUTION`
- otherwise: `NEUTRAL`
- insufficient usable bars/volume: `INSUFFICIENT_DATA`

Because insider/ownership data is unavailable in the free MVP provider, stock summaries normally return `PARTIAL` data status and lower confidence.

## Sector Aggregation

Sector summaries group stock summaries by sector and return:

- average smart money score
- accumulation count
- distribution count
- unusual volume count
- instrument count
- sector status

Sector status:

- average score `>= 65`: `ACCUMULATING`
- average score `<= 40`: `DISTRIBUTING`
- otherwise: `NEUTRAL`

## Frontend

Frontend feature:

- `frontend/src/features/smart-money-intelligence`

Route:

- `/smart-money`

Dashboard sections:

- Top Accumulation Candidates
- Top Distribution Warnings
- Sector Smart Money View
- Stock Smart Money Detail
- Data Coverage / Limitations

## Persistence

Smart-money summaries are calculated on demand from existing market data inside this module.

Historical stock-level smart-money context is persisted by `historical-context-snapshots`, which calls this module through public exports and stores daily/on-demand `SmartMoneyContextSnapshot` rows for later signal quality analysis.

## Known Limitations

- No paid institutional feeds.
- No options flow.
- No dark pool data.
- No real-time tape reading.
- No prediction model.
- Insider and institutional ownership are placeholders until a free provider is configured.
- Sector aggregation is capped to the current Market Data Foundation list page for runtime safety.

## Verification

Expected verification commands:

- `npm run build` in `backend`
- `npm test -- smart-money-intelligence --runInBand` in `backend`
- `npm test -- --runInBand` in `backend`
- `npm run build` in `frontend`
