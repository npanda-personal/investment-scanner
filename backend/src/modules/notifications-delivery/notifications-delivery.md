# Notifications Delivery

## Ownership

`notifications-delivery` owns user notification preferences, delivery records, and local/free notification delivery for alerts and digests.

It does not own alert rule evaluation, copilot insight generation, portfolio intelligence, marketing automation, SMS, push notifications, or paid provider integrations.

## Endpoints

Mounted under `/api/v1` and protected by `auth-identity`:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/notifications/preferences` | Get current user notification preferences |
| PATCH | `/notifications/preferences` | Update notification preferences |
| GET | `/notifications/events` | List recent delivery records |
| GET | `/notifications/provider-status` | Show active provider and SMTP configuration status |
| POST | `/notifications/test-email` | Send a local/log test notification |
| POST | `/notifications/send-alert-digest` | Send unread/critical alert digest when preferences allow |
| POST | `/notifications/send-daily-digest` | Send daily digest when preferences allow |
| POST | `/notifications/send-weekly-digest` | Send weekly digest when preferences allow |

## Data Models

Prisma models:

- `NotificationPreference`: one row per user with email, alert, daily, weekly, and quiet-hours preferences.
- `NotificationEvent`: append-only delivery history with type, channel, title, message, payload, status, error, created timestamp, and sent timestamp.

## Channels

Supported MVP channels:

- `IN_APP`: used for skipped preference-blocked deliveries.
- `EMAIL_LOG`: default local/dev email provider. It logs a concise delivery preview and records a `SENT` event.
- `SMTP_EMAIL`: reserved for a future SMTP provider. SMTP env vars are detected in provider status, but no SMTP transport dependency is required or active in this MVP.

## Provider Behavior

The active provider is `LogEmailProvider`.

SMTP-related environment variables are documented for future use:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`

If these variables are missing, provider status explicitly reports local log mode. If they are present, the MVP still uses log mode until a free/open-source SMTP transport is intentionally added.

## Preferences

Defaults are safe and quiet:

- `emailNotificationsEnabled = false`
- `alertEmailsEnabled = false`
- `dailyDigestEnabled = false`
- `weeklyDigestEnabled = false`

Manual test notifications ignore preference toggles so users can verify the delivery path. Alert, daily, and weekly digests are skipped when their preferences are disabled, and a `SKIPPED` delivery record is persisted.

## Digest Contents

Alert digest:

- unread alert count
- critical alert count
- warning alert count
- up to five unread alert lines

Daily digest:

- deterministic alert digest summary from AI Copilot
- deterministic market brief summary from AI Copilot

Weekly digest:

- deterministic alert and portfolio-review style summary
- deterministic market context summary

Copilot summaries remain deterministic and cost-free by default.

## Subscription Behavior

Subscription gating is not enforced for local/log notification delivery in this MVP. Future SMTP or external delivery providers should be gated centrally through `subscription-billing` rather than duplicating plan logic in this module.

## Known Limitations

- No SMTP transport is active yet.
- No SMS, WhatsApp, mobile push, browser push, or websocket notifications.
- No scheduler or cron worker; digests are sent manually through API/UI.
- Alert digest uses the current Alerts Monitoring event surface.
- Quiet hours are stored but not enforced until scheduled delivery exists.

## Verification

Run from `backend`:

- `npx.cmd prisma generate`
- `npm.cmd run build`
- `npm.cmd test -- notifications-delivery --runInBand`

Run from `frontend`:

- `npm.cmd run build`
