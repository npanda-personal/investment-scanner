# Sprint 1B Wave 2 Downstream Blocklist Refresh

Date: 2026-05-17

Status: Workstream C documentation-only refresh.

## 1. Source Inputs

Reviewed active execution evidence:
- `docs/execution/codex-parallel-execution-plan-2026-05-16/09-summaries/sprint-1b-wave1-strategy-signal-dq-dependency-audit.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/09-summaries/sprint-1b-wave1-portfolio-alerts-copilot-dq-dependency-audit.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/market-data-dq-readiness-contract.md`

No downstream source files were inspected in Wave 2. No downstream code or tests were modified.

## 2. Downstream Blocklist

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

## 3. Reason They Remain Blocked

Wave 2 adds upstream Market Data storage/readiness characterization only.

It does not prove:
- Downstream modules fail closed on missing Data Quality evaluations.
- `LIMITED`, `NOT_READY`, `UNUSABLE`, stale, illiquid, or blocked inputs are excluded from trusted downstream runs.
- Signal, strategy, backtest, trade-plan, portfolio, watchlist, alert, or copilot outputs preserve readiness evidence.
- User-facing reliability claims are gated by `READY` evidence.

## 4. Lane 2 Refresh

Lane 2 modules remain blocked because Wave 1 found optional or softened Data Quality enforcement:
- `signal-generation-engine` can run with Data Quality filtering disabled.
- `signal-quality-lab` can measure outcomes without strict readiness filters.
- `signal-calibration-engine` can treat Data Quality issues as penalties rather than hard blockers.
- `strategy-decision-engine` enforcement is not fully proven across all paths.
- `backtesting-strategy-lab` can run with Data Quality filtering disabled.
- `trade-plan-risk-engine` still needs clearer blocking for every non-ready signal-readiness state.

## 5. Lane 3 Refresh

Lane 3 modules remain blocked because Wave 1 found user-facing leak risks:
- `portfolio-intelligence` does not clearly gate health/risk outputs on Data Quality readiness.
- `watchlist-management` does not clearly include readiness blocker evidence in enriched rows.
- `alerts-monitoring` can create action-like alert events without proven instrument-level `READY`.
- `ai-investment-copilot` can mark source data complete when local calls return data, not when Data Quality readiness is proven.

## 6. Recommended Next Wave Direction

Recommendation:
- Move to one narrow downstream contract test next, after committing Wave 2.

Preferred Wave 3 candidate:
- Backend-only `signal-generation-engine` Data Quality enforcement characterization tests.

Reason:
- It is the first downstream dependency after Market Data and Data Quality.
- It directly affects whether unreliable data can become signal candidates.
- It should be proven before signal quality, calibration, strategy decision, backtesting, trade-plan, portfolio, watchlist, alert, or copilot work is trusted.

Secondary candidate:
- Backend-only `alerts-monitoring` readiness consumer tests.

Reason:
- Alerts are the highest-risk user-facing path, but they should follow signal-generation gate characterization unless Product Owner prioritizes user-facing leakage first.

## 7. Exclusions Preserved

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
