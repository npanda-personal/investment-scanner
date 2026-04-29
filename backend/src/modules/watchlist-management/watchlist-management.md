# Watchlist Management

## Ownership

Watchlist Management owns MVP watchlists and idea pipeline tracking for stocks the user is interested in but does not necessarily own.

It owns watchlist CRUD, item CRUD, item notes/tags, duplicate prevention, and dashboard enrichment. It does not own alerts, portfolio holdings, signal generation, or conviction scoring.

## Endpoints

Mounted under `/api/v1`:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/watchlists` | List watchlists |
| POST | `/watchlists` | Create watchlist |
| GET | `/watchlists/:id` | Watchlist detail with enriched items |
| PATCH | `/watchlists/:id` | Rename/update watchlist |
| DELETE | `/watchlists/:id` | Delete watchlist |
| POST | `/watchlists/:id/items` | Add instrument to watchlist |
| PATCH | `/watchlists/:id/items/:itemId` | Update item notes/tags |
| DELETE | `/watchlists/:id/items/:itemId` | Remove item |

`GET /watchlists/:id` supports `sort`:

- `recentlyAdded`
- `signalScoreDesc`
- `dailyChangeDesc`
- `dailyChangeAsc`
- `symbolAsc`

## Data Models

Prisma models:

- `Watchlist`: name, optional description, timestamps.
- `WatchlistItem`: watchlist/instrument reference, symbol snapshot, company name snapshot, optional notes, optional tags JSON array, timestamps.

Items reference `Stock` from Market Data Foundation by `instrumentId`.

## Item Enrichment

Each watchlist item is enriched at response time using public module services:

- Market Data Foundation: instrument metadata and latest/historical prices.
- Signal Generation Engine: latest signal score, direction, confidence, and generated timestamp.

Returned enriched fields include sector, country, currency, current price, daily change, daily change percent, latest signal, and `researchUrl`.

## Duplicate Behavior

Duplicate instruments are prevented per watchlist with a database unique constraint on `(watchlistId, instrumentId)`.

The service also checks for duplicates before insert and returns:

`This stock already exists in this watchlist.`

## Fallback Behavior

If latest price or signal data is unavailable, the affected fields return `null`. The watchlist response still succeeds.

## Frontend

Frontend feature root:

- `frontend/src/features/watchlist-management`

Route:

- `/watchlists`
- `/watchlists/:id`

The feature exposes a reusable `AddToWatchlistDialog` used by Signal Generation and Stock Research Workbench.

## Known Limitations

- Subscription Billing now gates watchlist creation by plan limits. Existing watchlists remain supported and ownership is nullable until real auth is introduced.

- No alerts, notification rules, conviction scoring, or idea-stage workflow yet.
- Tags are stored as a simple JSON string array.
- No dedicated watchlist analytics beyond current price, daily move, and latest signal.

## Verification

Run from `backend`:

- `npx.cmd prisma generate`
- `npm.cmd run build`
- `npm.cmd test -- watchlist-management --runInBand`
- `npm.cmd test -- --runInBand`

Run from `frontend`:

- `npm.cmd run build`
