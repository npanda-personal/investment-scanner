# CF-W1-MD-03 Architecture Review

Date: 2026-05-18

Owner: Team 03 Architecture Factory

## Status

Ready candidate.

`CF-W1-MD-03` can proceed as one bounded backend-only Market Data signoff-enforcement child. This pass does not authorize application changes, tests, providers, services, schema work, routes, frontend work, or any implementation outside the execution docs listed in the assignment.

## Evidence Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-MD-03-market-data-signoff-threshold-contract-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/market-data-dq-readiness-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/audit-market-data-data-quality.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/TEAM-05-market-data-data-quality-domain-audit-2026-05-17.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/next-validation-plans.md`
- `backend/src/modules/market-data-foundation/market-data-foundation.md`
- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.types.ts`
- `backend/tests/modules/market-data-foundation/market-data.service.test.ts`
- `backend/tests/modules/market-data-foundation/market-data.universe.test.ts`

## Current Source Findings

- `market-data-foundation.service.ts` already computes `coverage.priceCoveragePercentage` and `coverage.metadataCoveragePercentage` from the active scoped denominator.
- `universeSignoff` is already a distinct downstream gate, but `buildUniverseSignoff()` currently blocks only on provider validation, repair/backfill queues, latest EOD recency, minimum review-ready count, minimum `10%` review-ready share, and `trustStatus !== OK`.
- The active service does not currently add explicit signoff blockers for `priceCoveragePercentage < 95` or `metadataCoveragePercentage < 90`.
- `universeTrustStatus()` and `universeTrustReasons()` still use softer trust heuristics, including `50%` coverage thresholds. That is evidence that the contract gap is signoff-specific, not a whole-universe-state redesign.
- `MarketDataUniverseSignoff` already supports additive blocker codes, counts, required thresholds, next actions, and `downstreamAllowed`; no DTO shape change is required to express threshold failures.
- Existing tests already characterize signoff fail/pass behavior for provider unknown, metadata gaps, price backfill, review-ready minimum count, and `10%` review-ready share, but they do not yet lock in the explicit `95%` / `90%` threshold gate.

## Architecture Decision

The smallest bounded first child is the full `CF-W1-MD-03` requirement as a backend-only signoff-threshold slice inside the existing Market Data service, module doc, and focused module tests.

Why this is the smallest safe child:

- the coverage metrics already exist;
- the signoff object already exists;
- the blocker shape already exists;
- no route, controller, repository, provider, Prisma, DQE, or frontend change is required to enforce and explain the threshold gate;
- the gap is specifically in the signoff policy, not in durable evidence storage or broad universe-state modeling.

## Exact Future Writer Set

Allowed after Team 00 Ready promotion:

- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.md`
- `backend/tests/modules/market-data-foundation/market-data.service.test.ts`
- `backend/tests/modules/market-data-foundation/market-data.universe.test.ts`

## Exact Forbidden Scope For The First Child

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- generated Prisma/client artifacts
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
- route registries
- shared backend utilities
- package manifests
- frontend source, shared UI, or Playwright
- provider/startup/backfill redesign
- paid/cloud, broker, telemetry, or live-provider scope
- `CF-W1-MD-02A` / `CF-W1-MD-02B` durable evidence or schema work

## Required Boundary

The first child must:

- enforce the existing `95%` price-ready threshold and `90%` metadata-ready threshold as explicit `universeSignoff` fail-closed blockers;
- keep the thresholds scoped to provider-supported active in-scope `IN/STOCK` coverage already exposed by current service outputs;
- keep the existing minimum review-ready count and `>=10%` review-ready share gates in place as additional requirements, not replacements;
- keep the change confined to signoff enforcement and explanation output;
- preserve current response shape and current coverage fields.

The first child must not:

- redefine the universe-state model;
- rewrite trust-status semantics across the whole health object;
- introduce new env-driven threshold policy;
- widen into durable evidence storage or DQE ownership;
- reopen `CF-W1-MD-02A`.

## Team 04 QA Planning Handoff

Team 04 should plan this as a focused backend signoff-threshold packet.

Required QA scenario coverage:

- pass when price coverage, metadata coverage, review-ready minimum count/share, trust status, latest EOD, and repair queues all pass;
- fail when price coverage is below `95%` even if other current gates pass;
- fail when metadata coverage is below `90%` even if other current gates pass;
- fail when both threshold gates miss simultaneously;
- verify `downstreamAllowed=false` whenever either threshold misses;
- verify blocker reasons clearly distinguish price-threshold failure from metadata-threshold failure;
- verify existing review-ready minimum-count and `10%` share gates still fail closed independently;
- verify both `universeHealth()` and `repairPlan()` continue to produce consistent `universeSignoff` outcomes for the same threshold state.

Suggested focused command after approved implementation:

```powershell
cd backend
npm.cmd test -- market-data.service.test.ts market-data.universe.test.ts --runInBand
```

## Sequencing Notes

- `CF-W1-MD-03` stays separate from `CF-W1-MD-02A`; the latter remains proposal-only and authorizes no application writer.
- If Team 00 later opens `CF-W1-MD-02B`, do not run it in parallel with `CF-W1-MD-03` because both would need `market-data-foundation.service.ts` and `market-data-foundation.md`.
- Any other Market Data packet that reserves `market-data-foundation.service.ts`, `market-data-foundation.md`, `market-data.service.test.ts`, or `market-data.universe.test.ts` must be sequenced as one writer pass.

## Readiness Result

`CF-W1-MD-03` is a `Ready candidate`.

It is ready for Team 04 QA-plan prep and Team 00 orchestration as one bounded backend-only Market Data signoff-threshold child. It is not implementation approval by itself.
