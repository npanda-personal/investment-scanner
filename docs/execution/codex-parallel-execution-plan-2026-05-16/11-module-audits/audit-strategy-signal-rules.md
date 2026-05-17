# Audit: Strategy / Signal / Rules

Date: 2026-05-17

Mode: Read-only Audit Team B. No files modified by audit stream.

Authority: latest Product Owner prompt and root `AGENTS.md`; `docs/AGENTS.md` absent/deleted; `docs/codex-agent-team-plan/**` historical only.

## Scope Inspected

- `backend/src/modules/strategy-framework/**`
- `backend/src/modules/signal-generation-engine/**`
- `backend/src/modules/signal-quality-lab/**`
- `backend/src/modules/signal-calibration-engine/**`
- `backend/src/modules/strategy-decision-engine/**`
- Related `backend/tests/modules/**`
- Active execution docs under `docs/execution/codex-parallel-execution-plan-2026-05-16/**`

No builds, tests, servers, providers, UI checks, staging, commits, or file writes were run by the audit stream.

## Key Findings

1. Signal / trigger object contract is incomplete. `SignalResultDto` does not yet satisfy the root trigger contract for canonical asset class, region, strategy id/version, trigger type/price/timestamp, timeframe, rule ids, reason summary, passed/failed conditions, formal data quality status, lifecycle status, and timestamps.
2. Signal Generation DQ enforcement remains opt-in/fail-open by default. Strict behavior exists only when callers opt into `useDataQualityFilter=true` and `missingQualityBehavior='SKIP'`.
3. Strategy matching can synthesize DQ from raw signal `data_status`, which can make strategy enrichment appear DQ-aware without Data Quality Engine provenance.
4. Strategy Framework blocks explicit `NOT_READY`, `UNUSABLE`, and `ILLIQUID`, but missing DQ and `LIMITED`/`THIN`/`UNKNOWN` are not hard blockers everywhere.
5. Strategy Decision has a framework-backed DQ demotion gap where missing DQ can lower confidence without necessarily blocking candidate promotion.
6. Signal Quality Lab DQ filters are optional and query-driven.
7. Signal Calibration records DQ but treats it as penalty evidence, not a hard gate.
8. No-target-price violation exists in Strategy Decision through `targetPrice = latestPrice * 1.15` and wording such as `Target price achieved.`
9. Strategy versioning is present but not durable enough; definitions are code-keyed and rule declarations have no rule version.
10. Strategy categories are narrower than root `AGENTS.md`; code supports `ENTRY`, `EXIT`, `FILTER`, and `GATE`, while root instructions also define `RISK`, `CALIBRATION`, and `DIAGNOSTIC`.

## Downstream Blockers

- Do not treat `signal-generation-engine` output as trusted trigger events until DQ is fail-closed for trusted runs and trigger contract mapping is approved.
- Keep `signal-quality-lab` and `signal-calibration-engine` reliability/calibration outputs research-only unless DQ readiness is required or visibly marked untrusted.
- Keep `strategy-decision-engine` blocked for downstream trade-plan/risk use until target-price fields are removed/reframed and DQ-missing framework decisions cannot promote entry candidates.
- Alerts, portfolio, watchlists, copilot, backtesting, and trade-plan/risk remain blocked from trusted consumption until accepted DQ and trigger contract evidence exists.

## Candidate Stories

- `CF-W1-SIG-01`: Harden Signal Generation trusted runs to fail closed on missing/unavailable DQ.
- `CF-W1-SIG-02`: Define additive `TriggerEventDto` contract for raw signal outputs without schema changes first.
- `CF-W1-STRAT-01`: Replace Strategy Decision `targetPrice` and `Target price achieved` with rule-based exit/invalidation conditions.
- `CF-W1-STRAT-02`: Add Strategy Framework rule versioning and DQ gate policy before changing rule behavior.
- `CF-W1-SQLAB-01`: Require DQ-ready or explicit untrusted labels in Signal Quality dashboards and summaries.
- `CF-W1-CAL-01`: Require `eligibleForCalibration` before calibration can have downstream influence `NORMAL`.

