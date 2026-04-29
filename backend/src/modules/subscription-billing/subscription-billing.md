# Subscription Billing

## Ownership

`subscription-billing` owns MVP SaaS readiness for plans, user subscriptions, feature gates, and usage counters.

It does not own enterprise IAM, SSO, invoices, taxes, seat management, Stripe as a mandatory dependency, or advanced RBAC.

## Plans

Supported plans:

- `FREE`
- `PRO`
- `ADMIN`

Subscription statuses:

- `ACTIVE`
- `TRIAL`
- `CANCELED`
- `EXPIRED`

Authenticated flows use the current `auth-identity` user id. The legacy `default-user` remains only as a fallback for tests or unauthenticated internal calls.

## Feature Gates

Central gates:

| Feature | FREE | PRO | ADMIN |
| --- | ---: | ---: | --- |
| Portfolios | 1 | 25 | Unlimited |
| Watchlists | 1 | 25 | Unlimited |
| Alerts | 5 | 100 | Unlimited |
| Backtest runs per month | 5 | 100 | Unlimited |
| Copilot summaries per day | 10 | 100 | Unlimited |

Integrated checks:

- portfolio creation
- watchlist creation
- alert rule creation
- backtest run creation
- copilot summary generation

The gate error message is user-facing and points users to the billing page.

## Usage Counters

MVP usage is tracked with `UsageCounter` for:

- `BACKTEST_RUNS_MONTH`
- `COPILOT_SUMMARIES_DAY`

Count-based features use current database counts:

- portfolios
- watchlists
- alert rules

## Persistence

Prisma models:

- `AppUser`
- `SubscriptionPlan`
- `UserSubscription`
- `UsageCounter`

Nullable ownership columns were added to:

- `Portfolio`
- `Watchlist`
- `AlertRule`
- `BacktestStrategy`
- `BacktestRun`

Existing rows remain valid because ownership is nullable. New MVP-created records use `default-user` where practical.

## Endpoints

Mounted under `/api/v1`:

| Endpoint | Purpose |
| --- | --- |
| `GET /subscription/me` | Current default/user subscription, plan, and feature limits |
| `GET /subscription/plans` | Available plans |
| `POST /subscription/change-plan` | Manual plan change for current/default user |
| `GET /subscription/usage` | Usage counters and limits |
| `GET /subscription/features` | Feature gating status |
| `GET /subscription/provider` | Billing provider status |
| `PATCH /subscription/users/:userId/plan` | Admin-ready plan change endpoint |

## Billing Provider

External billing is disabled by default. The provider abstraction returns manual mode status.

Future Stripe integration should be:

- env-configured
- disabled by default
- graceful when keys are absent
- never required for local development

## Frontend

Frontend feature:

- `frontend/src/features/subscription-billing`

Route:

- `/billing`

The page shows:

- current plan
- status
- usage counters
- available plans
- upgrade/downgrade actions
- feature limits

## Known Limitations

- No external billing provider yet.
- No organizations or multi-tenant hierarchy.
- No Stripe checkout.
- No invoices, tax, coupons, seat management, or SSO.
- Admin endpoint uses `ADMIN_API_KEY` only when configured.

## Verification

Expected verification commands:

- `npx prisma generate`
- `npm run build` in `backend`
- `npm test -- subscription-billing --runInBand` in `backend`
- `npm test -- --runInBand` in `backend`
- `npm run build` in `frontend`
