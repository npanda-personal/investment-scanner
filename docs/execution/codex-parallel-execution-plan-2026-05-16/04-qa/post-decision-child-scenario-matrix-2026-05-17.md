# Post-Decision Child Scenario Matrix

Date: 2026-05-17

Owner: Team 04 QA Factory

Mode: docs-only QA scenario refresh after Product Owner decisions and Team 03 architecture refresh.

## Scope

This matrix refreshes QA scenarios for:

- `CF-W1-L3-DQ-01`: Lane 3 readiness consumer policy.
- `CF-W1-TP-01A`: Trade Plan no-target compatibility and Data Quality hard-block behavior.
- `CF-W1-MD-02`: durable Market Data readiness evidence ADR direction.

This file does not approve application source changes, test implementation, executable validation, Prisma/schema changes, route registry changes, shared UI/utility edits, package changes, generated type changes, providers, startup/backfill, live services, Playwright, UI smoke, broad test suites, Angel One, broker flows, paid/cloud services, staging, commits, or pushes.

## Inputs Inspected

- `AGENTS.md`
- `00-control/active-work-board.md`
- `10-requirements/refinement-queue.md`
- `12-ready-queue/ready-for-implementation.md`
- `12-ready-queue/blocked-by-decision.md`
- `12-ready-queue/blocked-by-shared-file.md`
- `12-ready-queue/blocked-by-upstream-dependency.md`
- `15-automation-prompts/AUTO-04-qa-factory.md`
- `16-team-inboxes/TEAM-03-post-decision-child-contracts.md`
- `17-team-outboxes/TEAM-03-architecture-factory.md`
- `17-team-outboxes/TEAM-04-qa-factory.md`
- `99-decision-inbox/open-decisions.md`
- `03-architecture/CF-W1-L3-DQ-01-architecture-review.md`
- `03-architecture/CF-W1-TP-01A-architecture-review.md`
- `03-architecture/CF-W1-MD-02-architecture-review.md`
- `06-contracts/CF-W1-L3-DQ-01-lane3-readiness-consumer-policy-contract.md`
- `06-contracts/CF-W1-TP-01A-trade-plan-no-target-dq-hard-block-contract.md`
- `06-contracts/CF-W1-MD-02-durable-readiness-evidence-contract.md`
- `08-work-packets/CF-W1-L3-DQ-01-work-packet.md`
- `08-work-packets/CF-W1-TP-01A-work-packet.md`
- `08-work-packets/CF-W1-MD-02-work-packet.md`
- existing Team 04 QA plans for the three candidates
- read-only test inventory for Lane 3, Trade Plan, Market Data, and Data Quality modules
- read-only source search for Data Quality fields used by relevant modules

## Current Decision State

| Work item | Decision state | QA impact |
| --- | --- | --- |
| `CF-W1-L3-DQ-01` | Option B accepted: passive `LIMITED` display with action-like blocking. | Scenario matrix can be prepared. Executable QA remains blocked until module child packets, exact files, and implementation handoffs exist. |
| `CF-W1-TP-01A` | Option B accepted: backend-only compatibility direction. | Scenario matrix can be prepared. Executable QA remains blocked until backend-only child packet, exact files, and implementation handoff exist. |
| `CF-W1-MD-02` | Option B accepted as ADR direction only: companion durable readiness/evidence storage. | ADR QA checklist can be prepared. Source/schema/test validation remains blocked until a formal ADR and later implementation slice are approved. |

## CF-W1-L3-DQ-01 Scenario Matrix

Use this matrix to split future child QA plans by module. Do not use it as execution approval.

| Child slice | Data Quality condition | Expected behavior | QA evidence later |
| --- | --- | --- | --- |
| Portfolio/watchlist passive display | `READY` with required use-case tier ready | Display context can be trusted, but must show DQ status/evidence where the child contract requires it. | Focused service tests prove DTO includes readiness status, reasons, blockers, and source freshness fields selected by the child contract. |
| Portfolio/watchlist passive display | `LIMITED` | Display-only review context may appear with visible warning/reasons. No reliability label, action wording, alert-like workflow, or implied recommendation. | Focused service tests prove limited status is preserved and action/reliability fields are suppressed or marked untrusted. |
| Portfolio/watchlist passive display | Missing DQ, stale hard blocker, unsupported scope, scope mismatch, `NOT_READY`, `UNUSABLE`, or use-case tier `BLOCKED` | Trusted display is blocked or replaced with a domain empty/warning state. No reliability or action language. | Focused service tests prove blocked state and blocker reasons are returned without fallback trust. |
| Alerts/action-like workflows | `READY` and alert-specific tier ready | Alert evaluation may proceed only if the alert child contract allows it. | Focused alerts service/routes tests prove readiness evidence is required before creation/listing of trusted alert events. |
| Alerts/action-like workflows | `LIMITED` | Block alert creation/action-like event behavior unless a later Product Owner decision approves a narrower exception. | Focused alerts tests prove `LIMITED` is not treated as action-ready. |
| Alerts/action-like workflows | Missing DQ, stale hard blocker, unsupported scope, scope mismatch, `NOT_READY`, `UNUSABLE`, or use-case tier `BLOCKED` | Block alert/action-like output and return readiness blocker evidence. | Focused alerts tests prove no event is created or trusted when DQ is blocked. |
| Portfolio intelligence reliability | `READY` with evidence | Reliability/risk labels may be computed only from approved DQ evidence and module-owned logic. | Focused portfolio-intelligence tests prove DQ evidence is consumed and shown. |
| Portfolio intelligence reliability | `LIMITED` | Degrade to limited/untrusted status. No review priority or action-like label unless explicitly approved. | Focused tests prove reliability labels are suppressed or degraded. |
| Portfolio intelligence reliability | Missing DQ, stale hard blocker, unsupported scope, scope mismatch, `NOT_READY`, `UNUSABLE`, or use-case tier `BLOCKED` | Return not-enough-trusted-data state. | Focused tests prove blocked state and no confidence/reliability claim. |
| Copilot/research surfaces | Any non-`READY` state | Covered only after separate UX/trust contract. Must not claim complete/trusted summary from untrusted data. | Backend and UI smoke remain blocked until Product/UX/Architect scope exists. |

### CF-W1-L3-DQ-01 Focused Command Guidance

Commands remain blocked until the corresponding implementation handoff exists:

```powershell
cd backend
npm.cmd test -- data-quality-engine.service.test.ts data-quality-engine.invariants.test.ts --runInBand
```

```powershell
cd backend
npm.cmd test -- portfolio-management.service.test.ts watchlist-management.service.test.ts portfolio-intelligence.service.test.ts --runInBand
```

```powershell
cd backend
npm.cmd test -- alerts-monitoring.service.test.ts alerts-monitoring.routes.test.ts alerts-monitoring.validation.test.ts --runInBand
```

## CF-W1-TP-01A Scenario Matrix

Use this matrix only for a future backend-only Trade Plan child slice.

| Scenario | Input condition | Expected behavior | QA evidence later |
| --- | --- | --- | --- |
| Trusted readiness with full DQ | DQ snapshot is present, signal/readiness evidence is acceptable, liquidity is acceptable, no stale hard blocker, required use-case tier is ready, and `eligibleForSignals` is true when signal evidence is required. | Paper-readiness can be evaluated without target-price semantics. Output emphasizes entry condition, rule-based exit, invalidation, risk review, DQ proof, strategy proof, reason summary, and blockers. | Focused service/paper-readiness tests prove readiness can pass without advice or arbitrary target language. |
| Missing DQ snapshot | Required DQ evidence is absent. | Trusted paper-readiness is blocked. Output carries blocker reason and no action-like readiness claim. | Focused tests prove missing DQ fails closed. |
| Unusable/not-ready DQ | `coverageStatus = UNUSABLE`, `signalReadinessStatus = NOT_READY`, stale hard blocker, required use-case tier `BLOCKED`, or unsupported/scope-mismatched evidence. | Trusted paper-readiness is blocked. | Focused tests prove hard blockers prevent trusted readiness. |
| Liquidity blocker | `liquidityStatus = ILLIQUID`. | Trusted paper-readiness is blocked. | Focused tests prove illiquidity prevents trusted readiness. |
| Limited DQ | `LIMITED` or limited-review-only tier. | Limited review may be returned only if child contract explicitly defines it; it must not become action-ready or trusted paper-readiness. | Focused tests prove limited status is preserved as untrusted/limited. |
| Signal ineligible | `eligibleForSignals = false` when plan depends on signal/strategy evidence. | Trusted readiness is blocked or degraded according to child contract. | Focused tests prove signal-ineligible evidence fails closed. |
| Compatibility target field retained | Existing target-shaped field remains in API/storage for compatibility. | It must be treated as compatibility-only and not as a target price, profit target, recommendation, or readiness proof. | Product-language scan plus focused tests prove target data does not drive trusted readiness. |
| Forbidden wording | Generated trusted output includes `buy now`, `sell now`, `profit target`, `price target`, `must buy`, `must sell`, guaranteed-return language, or financial-advice framing. | QA rejects. | Product-language assertion or scan notes in QA evidence. |
| Scope expansion | Implementation touches Today Review, frontend, Prisma, route registry, shared files, providers, startup/backfill, broad UI, or live-provider flows. | QA rejects or returns to Orchestrator/Architect for a new packet. | Handoff file list review. |

### CF-W1-TP-01A Focused Command Guidance

Commands remain blocked until the backend-only child implementation handoff exists:

```powershell
cd backend
npm.cmd test -- trade-plan-risk-engine.service.test.ts trade-plan-risk-engine.paper-readiness.test.ts --runInBand
```

Only if repository behavior is in the approved child scope:

```powershell
cd backend
npm.cmd test -- trade-plan-risk-engine.repository.test.ts --runInBand
```

## CF-W1-MD-02 ADR QA Checklist

No executable validation is approved in the ADR-only phase.

| ADR area | QA check |
| --- | --- |
| Storage model | ADR compares expanding existing price rows, companion OHLC evidence table, durable readiness evidence table, and keeping current storage with limited claims. |
| Record semantics | ADR defines whether records are append-only, idempotent/upserted, derived, cached, provider-specific, normalized canonical, or a documented combination. |
| Natural key | ADR defines instrument or canonical symbol, region, asset type, timeframe, timestamp/trading date, source, and source symbol/provider identity where applicable. |
| Provenance | ADR covers source, source symbol, source timestamp where available, ingested timestamp, batch/run identity or source fingerprint, and validation window. |
| Readiness evidence | ADR describes durable evidence for duplicate rows skipped, invalid OHLC rejected, missing latest candle, stale latest candle, zero/suspicious volume, adjusted-close fallback, unsupported scope, and provider gaps. |
| Data Quality ownership | ADR keeps Data Quality Engine as readiness evaluator and defines how DQE consumes or references Market Data evidence without duplicated scoring. |
| Prisma impact | ADR lists schema, migration, generated type, query, and rollback implications. Source/schema work remains blocked until separately approved. |
| Migration/backfill | ADR defines migration/no-backfill policy and rollback, and excludes startup/backfill/provider-heavy behavior unless later approved. |
| Query/test strategy | ADR names focused tests for storage/evidence behavior after implementation approval and separates provider-heavy tests from default validation. |
| Product claims | ADR states which claims are durable versus derived/read-path only until implementation exists. |
| Local/free constraints | ADR preserves localhost-first, zero-incremental-cost, no paid provider/cloud/telemetry, no broker, and no live-provider default behavior. |

### CF-W1-MD-02 Future Command Guidance

No commands are approved during ADR-only work. After ADR approval and scoped implementation, future focused validation may use:

```powershell
cd backend
npm.cmd test -- market-data-readiness-evidence.invariants.test.ts market-data-storage-readiness.invariants.test.ts market-data.universe.test.ts market-data.validation.test.ts market-data.repository.test.ts --runInBand
```

Provider and scheduler tests remain approval-gated and must be mocked-only with explicit no-live-provider controls:

```powershell
cd backend
npm.cmd test -- market-data.provider.test.ts market-data.scheduler.test.ts market-data.exchange-eod-adapter.test.ts --runInBand
```

## QA Decision

QA decision for this docs-only refresh: accept as planning evidence only.

None of the three candidates is Ready for Implementation from this Team 04 pass.

## Remaining Blockers

- `CF-W1-L3-DQ-01`: still needs module-specific child contracts, DTO fields, exact file reservations, and implementation handoffs.
- `CF-W1-TP-01A`: still needs accepted backend-only child packet, exact source/test reservations, and proof that API/UI/stored-row migration is excluded.
- `CF-W1-MD-02`: still needs a formal ADR. Schema/source/test validation remains blocked until a separate implementation slice is approved.
- `CF-W1-L3-ALERT-01`: can use the Lane 3 policy matrix later, but still needs its own alert readiness child contract and handoff.
- `CF-W1-UX-02`: remains blocked by Product/UX/Architect trust-surface decisions and absent UI smoke spec.

## Validation Performed

No builds, tests, services, providers, UI checks, Prisma commands, Playwright runs, staging, commits, or pushes were run.

Read-only commands inspected repository state, active docs, test file inventory, and relevant source field names only.
