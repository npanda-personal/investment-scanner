# Trade Journal

## Purpose

Trade Journal records the human trader's own decisions and realized outcomes so the question
"has MY process worked?" is answerable from persisted history — not from signal backtests alone.

The signal score has no proven alpha; this module captures the **human loop**: what was reviewed,
what was acted on, and what the actual outcome was.

This module is **research-support only**. It does not issue buy/sell recommendations or compute
forward-looking price targets.

## Ownership

Trade Journal owns:
- CRUD for `TradeJournalEntry` records (per-user, user-scoped)
- Direction-aware `realizedReturnPct` computation on PATCH (persisted immediately)
- Post-mortem summary computed entirely from persisted `trade_journal_entries` rows

It does NOT own: signal generation, price data, portfolio holdings, or calibration.

## Endpoints

Mounted under `/api/v1`:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/trade-journal` | Record a new decision (ACTED / SKIPPED / WATCHING) |
| GET | `/trade-journal` | List entries for the user; filters: decision, outcomeStatus, symbol, fromDate, toDate; paginated |
| GET | `/trade-journal/:id` | Get a single entry |
| PATCH | `/trade-journal/:id` | Update entry — recording exit triggers direction-aware return computation |
| DELETE | `/trade-journal/:id` | Delete entry |
| GET | `/trade-journal/post-mortem` | Summary metrics from persisted rows (read-only, no signal re-compute) |

All routes require authentication (`requireAuth`). `userId` is resolved from
`req.user.id` (set by the Auth Identity middleware), falling back to `'default-user'`
during development.

## Data Model

`TradeJournalEntry` in `trade_journal_entries`:

| Field | Type | Notes |
| --- | --- | --- |
| id | cuid | PK |
| userId | String | Indexed; entry owner |
| instrumentId | String? | Optional FK to `stocks.id` |
| symbol | String | NSE/BSE symbol; normalized to uppercase |
| sourceSignalId | String? | Optional FK to `signal_results.id` — the signal that prompted this review |
| direction | LONG \| SHORT | |
| decision | ACTED \| SKIPPED \| WATCHING | |
| reviewedAt | DateTime | Indexed; when the human reviewed this signal |
| entryPrice | Decimal? | |
| stopPrice | Decimal? | |
| targetPrice | Decimal? | |
| thesis | String? | Free-text rationale |
| conviction | Decimal? | 1–10 self-rated conviction |
| outcomeStatus | OPEN \| CLOSED \| INVALIDATED \| null | |
| exitPrice | Decimal? | |
| exitAt | DateTime? | |
| realizedReturnPct | Decimal? | Computed on PATCH: LONG=(exit-entry)/entry; SHORT=(entry-exit)/entry |
| notes | String? | |
| tags | Json | String array |
| createdAt | DateTime | |
| updatedAt | DateTime | |

Indexes: `userId`, `(userId, reviewedAt)`, `instrumentId`.

## Direction-Aware Return Formula

On every PATCH that provides `exitPrice` (or uses an already-stored `exitPrice`):

```
LONG:  realizedReturnPct = (exitPrice - entryPrice) / entryPrice
SHORT: realizedReturnPct = (entryPrice - exitPrice) / entryPrice
```

Returns `null` when `entryPrice` is missing or zero.

Implemented in `trade-journal.repository.ts` → `computeRealizedReturnPct` (exported for tests).

## Post-Mortem

`GET /api/v1/trade-journal/post-mortem` reads ONLY from persisted `trade_journal_entries` rows.

Metrics returned (all labelled with sample sizes):
- `totalEntries`
- `byDecision`: count per ACTED / SKIPPED / WATCHING
- `byOutcome`: count per OPEN / CLOSED / INVALIDATED / NONE
- `actedClosedCount`, `actedWinCount`, `actedWinRate` (null if sample < 1)
- `actedAvgReturnPct` (null if no return data)
- `missedAvoidedCount`: SKIPPED/WATCHING entries linked to a `sourceSignalId` — directional
  awareness, not a quantified edge claim
- `dataNote`: always surfaced, labels sample sizes and research-support intent

## Verification

Run from `backend`:

```
npx.cmd prisma generate
npm.cmd run build
npx.cmd jest tests/modules/trade-journal/ --runInBand
npx.cmd tsc --noEmit
```
