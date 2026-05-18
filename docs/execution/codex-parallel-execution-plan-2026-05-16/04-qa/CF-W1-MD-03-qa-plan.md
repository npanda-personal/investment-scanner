# CF-W1-MD-03 QA Plan

Date: 2026-05-18

Owner: Team 04 QA Factory

Status: Market Data signoff-threshold QA plan prepared. `CF-W1-MD-03` is QA-plan ready for Team 00 Ready evaluation as one bounded backend-only `market-data-foundation` signoff-threshold child. Executable validation remains blocked until Team 00 promotes one exact implementation handoff for the reserved Market Data files only.

Current status refresh: Team 03 prepared the bounded architecture review, contract, and work packet on 2026-05-18. Team 04 aligns this QA plan to the same signoff-policy child and does not widen it into Prisma/schema work, repository/provider/startup/backfill redesign, DQE source work, route/controller work, frontend/UI work, package changes, generated-file changes, provider/live-data activity, or `CF-W1-MD-02A` durable-evidence scope.

## QA Intent

Universe signoff is the strict downstream trust gate for Market Data Foundation. This child exists to prove that the current signoff contract fails closed when scoped universe coverage misses either of the already-approved thresholds:

- at least `95%` price-ready coverage; and
- at least `90%` required business-metadata coverage.

QA must also prove that this stricter gate stays additive rather than destructive:

- existing minimum review-ready count and minimum `10%` review-ready share gates remain preserved;
- existing coverage fields and response shape remain preserved;
- `universeHealth()` and `repairPlan()` do not disagree about threshold-blocked signoff for the same scoped state; and
- explanation output stays research-support only and never drifts into direct advice.

## Scope

Validation plan for additive Market Data signoff-threshold enforcement in `CF-W1-MD-03`.

In-scope surfaces after Team 00 Ready promotion:

- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.md`
- `backend/tests/modules/market-data-foundation/market-data.service.test.ts`
- `backend/tests/modules/market-data-foundation/market-data.universe.test.ts`

Out of scope for this first child:

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- generated files
- `backend/src/modules/market-data-foundation/market-data-foundation.repository.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.provider.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.validation.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.types.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.controller.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.router.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.scheduler.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.worker.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.queue.ts`
- all Data Quality Engine source/tests
- backend/frontend route registries
- shared backend utilities
- frontend source, shared UI, and Playwright changes
- provider/startup/backfill redesign
- paid/cloud, broker, telemetry, or live-provider scope
- `CF-W1-MD-02A` / future `CF-W1-MD-02B` durable readiness evidence work

This plan does not approve application source edits, tests, builds, services, or Ready movement. It records the QA packet only.

## Contract Inputs And Current Source Alignment

Primary planning inputs:

- `10-requirements/CF-W1-MD-03-market-data-signoff-threshold-contract-requirement.md`
- `03-architecture/CF-W1-MD-03-architecture-review.md`
- `06-contracts/CF-W1-MD-03-market-data-signoff-threshold-contract.md`
- `08-work-packets/CF-W1-MD-03-work-packet.md`
- `17-team-outboxes/TEAM-03-architecture-factory.md`

Current source and contract alignment that this QA plan depends on:

- current Market Data outputs already expose `coverage.priceCoveragePercentage`, `coverage.metadataCoveragePercentage`, and `universeSignoff`;
- the signoff object already supports additive blocker codes, required values, status, `downstreamAllowed`, and next-action semantics;
- the gap is signoff-policy enforcement, not coverage-math creation or DTO redesign;
- Team 03 confirmed the existing signoff logic already preserves provider unknown, retry, identity, metadata repair, price backfill, latest EOD, minimum review-ready count, minimum `10%` review-ready share, and `trustStatus !== OK` gates;
- this child therefore adds threshold fail-closed enforcement and explanation only, while preserving current response shape and current coverage fields.

## Required QA Assertions

- `universeSignoff.status` passes only when all current gates still pass and:
  - `coverage.priceCoveragePercentage >= 95`; and
  - `coverage.metadataCoveragePercentage >= 90`.
- `universeSignoff.status` fails closed when `coverage.priceCoveragePercentage < 95`, even if metadata coverage, minimum review-ready count, minimum review-ready share, latest EOD, trust status, and repair queues otherwise pass.
- `universeSignoff.status` fails closed when `coverage.metadataCoveragePercentage < 90`, even if price coverage and all other current gates otherwise pass.
- dual-threshold miss preserves both reasons:
  - price-threshold blocker remains present; and
  - metadata-threshold blocker remains present.
- `universeSignoff.downstreamAllowed` remains `false` whenever either threshold misses.
- blocker reasoning distinguishes price-threshold failure from metadata-threshold failure with separate blocker codes, required values, and explicit coverage context.
- `universeHealth()` and `repairPlan()` continue to produce matching signoff status, blocker semantics, and `downstreamAllowed` behavior for the same threshold state.
- existing review-ready count/share semantics remain preserved:
  - minimum review-ready count still fails closed independently;
  - minimum `10%` review-ready share still fails closed independently;
  - threshold additions do not rewrite or remove those gates.
- current review-ready counts, price-ready share, and metadata-ready share remain preserved as values and meanings; the child must not recalculate them under a new denominator policy.
- explanation output and module-doc wording stay research-support only:
  - acceptable wording includes `signoff`, `coverage`, `blocked`, `threshold`, `review-ready`, `reason summary`, `consider review`, and `downstream allowed`;
  - reject direct-advice wording such as `buy now`, `sell now`, `must buy`, `must sell`, `guaranteed`, `profit target`, `price target`, or `financial advice`.
- QA must reject the packet if implementation widens into forbidden scope, especially:
  - Prisma/schema or migrations;
  - repository/provider/startup/backfill redesign;
  - DQE source/test changes;
  - route/controller/types widening;
  - frontend/UI work;
  - package/shared/generated-file changes;
  - any merge with `CF-W1-MD-02A` or future `CF-W1-MD-02B`.

## Scenario Matrix

| Scenario | Expected QA assertion after implementation |
| --- | --- |
| Passing threshold case | `universeSignoff.status=PASS` only when price-ready share is at least `95%`, metadata-ready share is at least `90%`, latest EOD passes, trust status is acceptable, repair blockers are clear, and existing review-ready count/share gates pass. |
| Price-threshold fail only | `universeSignoff.status=FAIL`, `downstreamAllowed=false`, and explicit price-threshold blocker reasoning is present when price-ready share is below `95%` while metadata share and legacy gates still pass. |
| Metadata-threshold fail only | `universeSignoff.status=FAIL`, `downstreamAllowed=false`, and explicit metadata-threshold blocker reasoning is present when metadata-ready share is below `90%` while price share and legacy gates still pass. |
| Dual-threshold fail | `universeSignoff.status=FAIL` and both threshold blockers remain visible together; the implementation must not collapse them into one generic low-coverage reason. |
| Review-ready count/share preserved fail | Existing minimum review-ready count and minimum `10%` review-ready share still fail closed independently even when price-ready and metadata-ready shares both meet threshold. |
| Health and repair-plan parity | For the same scoped universe state, `universeHealth()` and `repairPlan()` report the same threshold-blocked or threshold-passing signoff outcome and the same `downstreamAllowed` result. |
| Backward-compatible coverage output | `coverage.priceCoveragePercentage`, `coverage.metadataCoveragePercentage`, review-ready counts, and other existing health fields remain additive and unchanged in meaning. |
| Research-support wording | Service/test/doc explanation output stays audit-oriented and trust-oriented without direct-advice or target language. |
| Scope drift attempt | Any touch outside the reserved service/doc/test files, or any widening into schema, DQE, repository/provider/startup, routes, frontend, shared files, packages, or durable-evidence work, is a QA reject. |

## Focused Command Guidance

Commands below are guidance only. They were not run during this docs-only QA planning task.

Future focused validation after Team 00 Ready promotion and bounded implementation handoff:

```powershell
cd backend
npm.cmd test -- market-data.service.test.ts market-data.universe.test.ts --runInBand
```

Approval-gated backend build after accepted implementation, Team 00 validation approval, and memory/resource check:

```powershell
cd backend
npm.cmd run build
```

## Skipped / Forbidden Checks

Skipped in this planning pass:

- all executable tests
- backend/frontend builds
- local servers, services, provider checks, UI smoke, and live data

Forbidden by default for this slice:

- broad backend suites with no file filters
- Playwright or UI smoke tests
- Prisma generate, migrate, db push, db execute, or any schema/data mutation
- provider/startup/backfill jobs or live-provider validation
- DQE implementation changes as a backdoor for signoff enforcement
- route/controller/type-contract widening
- durable-evidence/schema work from `CF-W1-MD-02A` or future `CF-W1-MD-02B`

## Stop Conditions

Stop QA and return to Team 00 / Architect if:

- implementation expands beyond the four reserved Market Data service/doc/test files
- implementation changes Prisma/schema, migrations, generated files, repository/provider/validation/controller/router/scheduler/worker/queue files, DQE source/tests, routes, frontend, shared utilities, shared UI, or package manifests
- implementation tries to redefine current coverage denominators, universe-state semantics, trust-status categories, or current DTO shape instead of enforcing the already-approved thresholds
- implementation removes or weakens existing minimum review-ready count/share gates
- implementation merges `CF-W1-MD-03` with `CF-W1-MD-02A` or future `CF-W1-MD-02B`
- explanation output drifts into direct-advice or target-language wording

## Evidence Required Later

- Exact implementation handoff limited to the reserved Market Data service/doc/test file set
- Focused backend evidence for:
  - threshold pass;
  - price-threshold fail;
  - metadata-threshold fail;
  - dual-threshold fail;
  - preserved review-ready count/share fail behavior; and
  - `universeHealth()` / `repairPlan()` parity
- Proof that `downstreamAllowed=false` is preserved for each threshold-miss case
- Proof that blocker codes and required-threshold values remain distinct for price versus metadata failures
- Proof that current coverage fields and review-ready counts/shares stayed additive and backward-compatible
- Proof that module-doc wording stays research-support only
- Focused test output only after approval
- Build output only after approval

## QA Verdict For Team 00

`CF-W1-MD-03` is QA-plan ready for Team 00 Ready evaluation.

Current blockers and risks:

- executable QA remains blocked until Team 00 promotes the bounded backend-only Market Data signoff-threshold handoff
- Team 00 must keep the packet inside the reserved `market-data-foundation` service/doc/test files only
- the child must remain additive to existing signoff logic and must not reopen denominator policy, trust-status redesign, DQE ownership, or durable-evidence storage work
- any widening into Prisma/schema, repository/provider/startup/backfill, DQE, routes, frontend, shared files, packages, generated files, or `CF-W1-MD-02A` / `CF-W1-MD-02B` scope is an explicit QA reject
