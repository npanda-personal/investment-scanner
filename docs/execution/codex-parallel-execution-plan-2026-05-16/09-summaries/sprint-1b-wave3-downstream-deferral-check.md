# Sprint 1B Wave 3 Downstream Deferral Check

Date: 2026-05-17

Status: Workstream C documentation-only deferral check.

## 1. Source Inputs

Reviewed active execution evidence:
- `09-summaries/sprint-1b-wave1-portfolio-alerts-copilot-dq-dependency-audit.md`
- `09-summaries/sprint-1b-wave2-downstream-blocklist-refresh.md`
- `06-contracts/market-data-dq-readiness-contract.md`

No downstream source files were modified. No alerts, portfolio, watchlist, copilot, strategy-decision, backtesting, or trade-plan implementation was approved or performed.

## 2. Deferral Decision

Alerts, portfolio, watchlist, and copilot remain blocked.

Reason:
- Wave 3 characterizes only the strict Data Quality filter path inside `signal-generation-engine`.
- Wave 3 does not prove trusted enforcement for stored or later-consumed signals.
- Wave 3 does not prove user-facing modules block or label untrusted signals.
- Wave 3 does not prove downstream modules preserve Data Quality explanations.

## 3. Modules Still Blocked

The following modules remain blocked from treating Market Data / Data Quality as trusted input:
- `signal-generation-engine`
- `signal-quality-lab`
- `signal-calibration-engine`
- `strategy-decision-engine`
- `backtesting-strategy-lab`
- `trade-plan-risk-engine`
- `portfolio-intelligence`
- `watchlist-management`
- `alerts-monitoring`
- `ai-investment-copilot`

## 4. Wave 4 Recommendation

Recommended Wave 4:
- Implement or decide a narrow `signal-generation-engine` Data Quality fail-closed gate.

Why:
- Current signal generation can still run with Data Quality filtering disabled.
- Missing Data Quality can still be warning-processed unless strict options are supplied.
- If Data Quality filtering fails, the current service warns and continues.
- Alerts, portfolio, watchlist, and copilot should not be tested as trusted downstream consumers until the signal-generation trusted path is hardened or explicitly classified.

Fallback if source changes are not approved:
- Run a documentation-only architecture decision on strict signal-generation DQ policy before additional downstream tests.

## 5. Exclusions Preserved

Still excluded:
- Angel One.
- Live providers.
- Provider-heavy tests.
- Broker credentials.
- Startup/backfill behavior.
- UI changes.
- Prisma/schema changes.
- Route registry changes.
- Shared utility or shared UI changes.
- Package changes.

