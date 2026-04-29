# Alerts & Monitoring

## Ownership

Alerts & Monitoring owns in-app alert rules, manual/batch evaluation, and alert event inbox state.

It monitors stocks, signals, portfolios, and watchlists through public module services. It does not own email, push notifications, real-time streaming, broker execution, or scheduling in the MVP.

## Endpoints

Mounted under `/api/v1`:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/alerts/rules` | List alert rules |
| POST | `/alerts/rules` | Create alert rule |
| GET | `/alerts/rules/:id` | Get alert rule |
| PATCH | `/alerts/rules/:id` | Update or enable/disable alert rule |
| DELETE | `/alerts/rules/:id` | Delete alert rule |
| POST | `/alerts/evaluate` | Manually evaluate enabled rules |
| GET | `/alerts/events` | List alert inbox events |
| PATCH | `/alerts/events/:id/read` | Mark event read |
| PATCH | `/alerts/events/:id/dismiss` | Dismiss event |
| POST | `/alerts/events/mark-all-read` | Mark active events read |
| GET | `/alerts/summary` | Basic unread/critical counts |

## Data Models

Prisma models:

- `AlertRule`: name, type, scope, optional instrument/portfolio/watchlist reference, condition JSON, enabled state, timestamps.
- `AlertEvent`: generated inbox event with severity, title, message, context references, metadata, triggered/read/dismissed timestamps.

## Alert Types

Supported MVP types:

- `PRICE_ABOVE`
- `PRICE_BELOW`
- `DAILY_MOVE_ABOVE`
- `DAILY_MOVE_BELOW`
- `SIGNAL_SCORE_ABOVE`
- `SIGNAL_DIRECTION_CHANGED`
- `PORTFOLIO_HOLDING_DRAWDOWN`
- `PORTFOLIO_BEARISH_SIGNAL`
- `WATCHLIST_SIGNAL_SCORE_ABOVE`
- `WATCHLIST_PRICE_ABOVE`
- `WATCHLIST_PRICE_BELOW`

Scopes:

- `STOCK`
- `PORTFOLIO`
- `WATCHLIST`

## Condition Schema

MVP conditions use JSON:

- price alerts: `{ "threshold": 150 }`
- daily move alerts: `{ "threshold": -0.05 }`
- signal score alerts: `{ "threshold": 80 }`
- signal direction changed: `{ "direction": "BULLISH" }`
- portfolio drawdown: `{ "threshold": -0.15 }`

## Event Lifecycle

Events are created by `POST /alerts/evaluate`.

User actions:

- mark read
- dismiss
- mark all read

Dismissed events remain persisted but are hidden by the frontend inbox.

## Duplicate Suppression

Before creating an event, the service checks whether an unread and undismissed event already exists for the same rule with identical metadata. If so, the duplicate is skipped.

## Frontend

Frontend feature root:

- `frontend/src/features/alerts-monitoring`

Route:

- `/alerts`

The page includes alert inbox, rule list, create rule form, evaluate-now action, enable/disable, delete, read, dismiss, and mark-all-read actions.

Cross-feature entry points:

- Signal cards can create a stock signal score alert.
- Stock Research Workbench can create a stock price alert.

## Known Limitations

- Subscription Billing now gates alert rule creation by plan limits. Existing alert rules remain supported and ownership is nullable until real auth is introduced.

- Manual evaluation only; no scheduler, WebSocket, email, or push.
- No historical crossing-state memory beyond duplicate active-event suppression.
- Rule form is MVP-oriented and expects IDs for portfolio/watchlist rules.
- Alert count badge in global navigation is not implemented yet.

## Verification

Run from `backend`:

- `npx.cmd prisma generate`
- `npm.cmd run build`
- `npm.cmd test -- alerts-monitoring --runInBand`
- `npm.cmd test -- --runInBand`

Run from `frontend`:

- `npm.cmd run build`
