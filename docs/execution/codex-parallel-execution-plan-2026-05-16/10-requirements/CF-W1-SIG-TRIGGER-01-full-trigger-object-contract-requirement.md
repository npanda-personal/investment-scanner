# CF-W1-SIG-TRIGGER-01 - Full Trigger Object Contract Requirement

Date: 2026-05-17

## Status

Requirement refined. Not Ready for Implementation.

This requirement is docs-ready for architecture-contract and QA-plan preparation only. It must not move to app-code implementation until the trigger object contract, QA plan, exact work packet, file reservations, and ready-queue entry are accepted.

## Product Value

Downstream modules can only trust signal outputs when each trigger is explainable, auditable, scoped, versioned, and backed by Data Quality evidence. A complete trigger object contract is required before Signal Quality, Calibration, Strategy Decision, Alerts, Portfolio, Watchlists, Trade Plan, Research, or Copilot workflows treat Signal Generation output as contract-complete trigger evidence.

## Current Evidence

Latest inputs:

- `11-module-audits/audit-strategy-signal-rules.md`
- `11-module-audits/daemon-cycle-readiness-audit-2026-05-17.md`
- `17-team-outboxes/TEAM-06-strategy-signal-risk-daemon-2026-05-17-iteration-2.md`
- `03-architecture/next-contracts-to-prepare.md`
- `04-qa/next-validation-plans.md`
- `06-contracts/contract-inventory.md`
- completed bounded signal slices: `CF-W2-SIG-01A`, `CF-W1-SIG-01B`, and `CF-W1-SIG-LATEST-01`

Observed gaps:

- Current trigger/signal output evidence is missing or incomplete for `asset_class`, `region`, canonical `strategy_id`, `strategy_version`, `trigger_type`, formal `trigger_price`, formal `trigger_timestamp`, `timeframe`, rule ids, rule versions, canonical passed/failed conditions, lifecycle `status`, exposed `created_at`, and exposed `updated_at`.
- Completed Signal Generation DQ slices do not complete the root trigger object contract.
- Downstream consumers remain blocked from treating generated signals as full trigger events until the object contract and QA coverage are accepted.
- Strategy and rule provenance remains incomplete where rule versioning is not durable enough.

## Required Contract Scope

Architecture must define an additive, canonical trigger object contract before source changes. The contract must cover at least:

- `signal_id` or `trigger_id`
- `symbol` or `instrument_id`
- `asset_class`
- `region`
- `strategy_id`
- `strategy_version`
- `signal_type` or `trigger_type`
- `trigger_price`
- `trigger_timestamp`
- `timeframe`
- `entry_rule_id` where applicable
- `exit_rule_id` where applicable
- `invalidation_rule_id` where applicable
- rule name and rule version for every rule that produces or validates the trigger
- `reason_summary`
- `passed_conditions`
- `failed_conditions`
- `data_quality_status`
- lifecycle `status`
- `created_at`
- `updated_at`

Preferred fields should be included where supported or explicitly marked unavailable:

- `indicator_values_used`
- `source_data_timestamp`
- `scan_run_id`
- `signal_quality_score`
- `calibration_version`
- `risk_level`
- `journal_status`
- `portfolio_context_status`
- `watchlist_context_status`

Allowed lifecycle states must align with root `AGENTS.md`:

- `detected`
- `validated`
- `published`
- `active`
- `watching`
- `warning`
- `exit_triggered`
- `closed`
- `invalidated`
- `expired`
- `archived`

The contract must preserve research-support language and must not introduce arbitrary target prices, black-box trade-instruction language, return-assurance language, broker execution, or direct financial advice.

## Exact Dependencies

- Architecture must define the canonical trigger object field dictionary, source mapping, lifecycle semantics, and additive compatibility strategy.
- Product Owner and Architect must accept how existing `SignalResult` / `SignalResultDto` fields map to trigger fields and which missing fields require future strategy/rule contract work.
- QA must prepare a trigger object contract plan that validates field completeness, rule provenance, DQ status, lifecycle status, audit path, and backward compatibility.
- Data Quality evidence must come from accepted Data Quality outputs or existing accepted signal-row DQ evidence; Signal Generation must not duplicate DQ scoring logic.
- Orchestrator must reserve exact docs/source/test files and split downstream consumer work into separate requirements.
- The ready queue must explicitly move a scoped work packet before implementation starts.

Non-dependencies:

- This requirement does not reopen completed bounded slices `CF-W2-SIG-01A`, `CF-W1-SIG-01B`, or `CF-W1-SIG-LATEST-01`.
- This requirement does not implement Signal Quality, Calibration, Strategy Decision, Alerts, Portfolio, Watchlist, Trade Plan, Research, or Copilot consumer behavior.
- This requirement does not solve Strategy Framework rule-version persistence by itself; if durable rule versioning is needed, stop and split a strategy/rule requirement.
- This requirement does not approve Prisma schema, route registry, shared utility, package, provider, or frontend changes.

## Candidate Acceptance Criteria

Future accepted implementation must satisfy all approved contract details, including:

- Public trigger output includes all required root trigger fields or explicitly documented non-applicable fields.
- Every trigger has strategy id, strategy version, rule name, rule version, trigger price, trigger timestamp, reason summary, Data Quality status, lifecycle status, created timestamp, updated timestamp, and an audit path.
- Entry, exit, invalidation, risk, bullish, and bearish trigger types use research-support language and do not imply direct trade instructions.
- Trigger price is the observed rule-triggering price, not an arbitrary target price.
- Passed and failed conditions are structured enough for audit and QA verification.
- Data Quality status is derived from accepted Data Quality evidence and fail-closed signal-generation behavior where trusted trigger output is claimed.
- Missing or untrusted Data Quality evidence prevents trusted trigger classification or clearly marks the trigger as untrusted/diagnostic under the accepted contract.
- Existing trusted Signal Generation run/read/latest DQ gates remain intact.
- Backward compatibility is documented for existing consumers and persisted signal rows.
- Downstream modules are not silently changed to consume the new contract until their own requirements are accepted.
- Module docs are updated if Signal Generation public output semantics change.
- QA, code review, Architect signoff, and Product Owner acceptance are recorded before release.

## Current Allowed Files

For this documentation-only requirement pass:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-SIG-TRIGGER-01-full-trigger-object-contract-requirement.md`

## Future Allowed Files For Contract Prep Only

After Orchestrator assignment, the next safe work remains active execution documentation only, likely under:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/**`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/**`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/**`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/**`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/**`

These are not source reservations.

## Future Implementation Areas After Approval

Possible future source/test areas only after accepted contract, QA plan, exact work packet, and ready-queue promotion:

- `backend/src/modules/signal-generation-engine/**`
- `backend/tests/modules/signal-generation-engine/**`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.md`

Any downstream consumer changes must be split into separate requirements and work packets.

## Forbidden Without Separate Approval

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- generated Prisma/types
- `backend/src/api/routes.ts`
- `frontend/src/app/routes.tsx`
- shared backend utilities or shared frontend components
- Strategy Framework rule-version persistence changes
- Signal Quality, Calibration, Strategy Decision, Alerts, Portfolio, Watchlist, Backtesting, Trade Plan, Research, Copilot, or UI consumer changes
- package manifests, providers, schedulers, startup/backfill, Angel One, broker, live-provider, paid/cloud, or telemetry files
- root `AGENTS.md`, `docs/AGENTS.md`, or `docs/codex-agent-team-plan/**`

## Shared-File Risk

Risk: High.

The trigger object is a cross-module contract consumed by quality, calibration, strategy decisions, alerts, research, portfolio/watchlist context, trade-plan/risk, and copilot workflows. Contract work can proceed in docs, but source implementation must be narrow, single-writer controlled, and downstream adoption must be split.

## Stop Conditions

- The canonical trigger field dictionary, lifecycle states, rule provenance, or DQ evidence mapping remains ambiguous.
- Implementation requires Prisma schema, route registry, shared utility, generated type, package, provider, frontend, or downstream consumer changes without explicit approval.
- Rule versioning cannot be represented without changing Strategy Framework ownership.
- Trigger output would omit rule name, rule version, trigger price, reason summary, Data Quality status, lifecycle status, or audit path.
- Proposed language introduces trade-instruction language, arbitrary target prices, return-assurance language, broker actions, or financial-advice framing.
- Tests would only check that a page or route loads instead of proving trigger field completeness and auditability.

## Next Gate

Architecture contract preparation for the canonical trigger object, followed by a focused QA plan. This requirement cannot move to implementation readiness until the contract, QA plan, work packet, file reservations, and ready-queue promotion are all accepted.
