# CF-W1-SIG-TRIGGER-01 QA Plan

Date: 2026-05-17

Owner: Team 04 QA Factory

Status: QA planning only. Do not run commands until the full trigger object architecture contract is accepted and a scoped implementation handoff exists.

## Scope

Focused backend validation for completing the root signal/trigger object contract in Signal Generation Engine and any explicitly approved downstream consumer boundary.

In scope after approval:
- trigger object required fields,
- rule and strategy provenance,
- data-quality status propagation,
- lifecycle status validation,
- trigger price and trigger timestamp semantics,
- auditability fields and generation/run traceability,
- no target-price or direct-advice language in trigger outputs,
- backward-compatible API behavior unless contract approval explicitly allows a breaking change.

Out of scope:
- frontend/UI changes,
- broad downstream consumer migrations,
- signal quality scoring or calibration behavior unless the accepted contract reserves it,
- Trade Plan target/no-target migration,
- alert generation/readiness suppression,
- provider/live market-data checks,
- startup, scheduler, or backfill behavior,
- Prisma/schema, route registry, package, shared utility, or shared UI changes unless separately approved.

## Required Trigger Contract Assertions

Every trusted generated trigger must include the accepted contract equivalent of:

- `trigger_id` or `signal_id`,
- `symbol` or `instrument_id`,
- `asset_class`,
- `region`,
- `strategy_id`,
- `strategy_version`,
- `trigger_type`,
- `trigger_price`,
- `trigger_timestamp`,
- `timeframe`,
- applicable `entry_rule_id`,
- applicable `exit_rule_id`,
- applicable `invalidation_rule_id`,
- `reason_summary`,
- `passed_conditions`,
- `failed_conditions`,
- `data_quality_status`,
- lifecycle `status`,
- `created_at`,
- `updated_at`.

Preferred fields should be tested when the accepted contract includes them:

- `indicator_values_used`,
- `source_data_timestamp`,
- `scan_run_id` or generation run id,
- `signal_quality_score`,
- `calibration_version`,
- `risk_level`,
- `journal_status`,
- `portfolio_context_status`,
- `watchlist_context_status`.

## Required QA Assertions

- A generated bullish entry trigger includes rule, strategy, version, price, timestamp, timeframe, reason, passed conditions, failed conditions, data-quality status, and audit/run traceability.
- A generated bearish, exit, invalidation, or risk-warning trigger uses the accepted trigger type and lifecycle status values without direct buy/sell instruction language.
- Trigger lifecycle status is constrained to the root allowed state set or the accepted architecture enum.
- Trigger price is the documented market/rule trigger price, not an arbitrary target price or profit objective.
- Trigger timestamp reflects the accepted event/source-data timing rule and is not silently replaced by unrelated creation time.
- Strategy and rule provenance include stable IDs and versions; names alone are not sufficient unless explicitly accepted by Architect.
- Data-quality status is sourced from the approved Data Quality Engine output or accepted Signal Generation DQ contract, not duplicated ad hoc scoring.
- Unready, stale, missing, unsupported, or limited data-quality states cannot produce trusted triggers unless the contract explicitly marks them warning/research-only.
- `passed_conditions` and `failed_conditions` are deterministic, structured enough for audit, and cover the rule path used to create or block the trigger.
- Persisted and returned trigger fields are additive/backward-compatible unless a breaking response-shape change is approved.
- Existing accepted Signal Generation DQ fail-closed and trusted read-path behavior does not regress.
- No broker, paid/cloud, provider-heavy, live market-data, startup/backfill, UI, package, route-registry, shared-component, or arbitrary target-price behavior is required.

## Focused Command Guidance

Commands below are guidance only. They were not run during this documentation-only planning task.

Blocked until trigger contract acceptance and implementation handoff:

```powershell
cd backend
npm.cmd test -- signal-generation-engine.service.test.ts signal-generation-engine.repository.test.ts signal-generation-engine.routes.test.ts signal-generation-engine.validation.test.ts signal-generation-dq-enforcement.invariants.test.ts --runInBand
```

Only if the accepted contract reserves Strategy Decision provenance behavior:

```powershell
cd backend
npm.cmd test -- strategy-decision-engine.service.test.ts strategy-decision-engine.repository.test.ts --runInBand
```

Only if Signal Quality fields are included in the accepted trigger contract:

```powershell
cd backend
npm.cmd test -- signal-quality-lab.service.test.ts signal-quality-lab.routes.test.ts --runInBand
```

## Stop Conditions

Stop QA and return to Orchestrator/Architect if validation requires:
- defining the trigger object contract during QA,
- changing Prisma schema or generated types without approval,
- route registry changes,
- shared utility or shared fixture changes,
- frontend/UI changes,
- broad backend suites,
- provider/live market-data calls,
- startup flows, schedulers, or backfills,
- target-price semantics,
- direct financial-advice language,
- package changes.

## Evidence Required Later

- Accepted architecture trigger contract reference.
- Implementation handoff with exact changed files.
- Exact focused command output.
- Field-level contract assertion notes.
- DQ state coverage notes.
- Product-language check for no direct advice or arbitrary target prices.
- Confirmation that forbidden scopes were not touched.
- Skipped checks and reasons.

## QA Blockers

- Full root trigger object architecture contract is not yet accepted.
- Field names, lifecycle enum mapping, rule-version provenance, and timestamp semantics need Architect approval.
- Downstream consumer scope must be split before implementation if the trigger contract touches modules outside Signal Generation Engine.
