# Market Context Intelligence

## Ownership

Market Context Intelligence owns broad market environment summaries for stock and portfolio decision support.

It covers MVP market regime, sector rotation, breadth, country/region strength, macro placeholder context, and key takeaways. It does not own backtesting, optimization, smart money, analyst research, or prediction modeling.

## Endpoints

Mounted under `/api/v1`:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/market-context/summary` | Aggregated market context |
| GET | `/market-context/regime` | Market regime summary |
| GET | `/market-context/sectors` | Sector rotation ranking |
| GET | `/market-context/breadth` | Breadth indicators |
| GET | `/market-context/countries` | Country/region strength ranking |
| GET | `/market-context/macro` | Macro snapshot |
| POST | `/market-context/refresh` | Recalculate summary on demand |

## Methodology

The module calculates current/on-demand context. Historical persistence is owned by `historical-context-snapshots`, which calls this module's public service and stores daily/on-demand snapshots for later signal quality grouping.

### Regime

Regime is one of:

- `RISK_ON`
- `NEUTRAL`
- `RISK_OFF`

Inputs:

- sampled broad instrument return
- percent above SMA50
- percent above SMA200
- sector leadership score

Score thresholds:

- `>= 65`: `RISK_ON`
- `<= 40`: `RISK_OFF`
- otherwise: `NEUTRAL`

### Sector Rotation

Sectors are grouped from available instrument metadata and ranked by relative strength using 1M, 3M, and 6M returns.

Leadership statuses:

- `LEADING`
- `IMPROVING`
- `WEAKENING`
- `LAGGING`

Signal counts are included when Signal Generation Engine data is available.

### Breadth

Breadth includes:

- percent above SMA50
- percent above SMA200
- advance/decline approximation from latest daily move
- 52-week high/low counts
- bullish/bearish signal counts

### Country Ranking

Countries are ranked similarly to sectors using 1M, 3M, and 6M returns plus available signal counts.

### Macro

Macro data is a clean placeholder in the MVP. No paid provider is added. Macro status returns `UNKNOWN` with `MISSING` data status until free/local proxy ingestion is added.

## Data Status

Because metrics are calculated from currently available instruments and persisted prices, most responses are `PARTIAL` unless no usable sample exists, in which case `MISSING` is returned.

## Frontend

Frontend feature root:

- `frontend/src/features/market-context-intelligence`

Route:

- `/market-context`

Dashboard sections:

- Market Regime Card
- Sector Rotation
- Breadth Indicators
- Country/Region Strength
- Macro Snapshot
- Key Takeaways

Cross-feature integration:

- Signal Generation Dashboard shows a compact current market regime widget.

Portfolio exposure vs leading sectors is documented as a follow-up.

## Known Limitations

- No persistence inside this module; historical persistence is handled by `historical-context-snapshots`.
- Instrument sample is limited for MVP performance.
- Macro snapshot is a placeholder until free proxy data is available.
- No benchmark/volatility provider beyond available persisted price history.

## Verification

Run from `backend`:

- `npm.cmd run build`
- `npm.cmd test -- market-context-intelligence --runInBand`
- `npm.cmd test -- --runInBand`

Run from `frontend`:

- `npm.cmd run build`
