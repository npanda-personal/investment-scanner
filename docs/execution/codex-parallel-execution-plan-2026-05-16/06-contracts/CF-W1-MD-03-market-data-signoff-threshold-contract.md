# CF-W1-MD-03 Market Data Signoff Threshold Contract

Date: 2026-05-18

Owner: Team 03 Architecture Factory

Status: Ready candidate contract prepared. Not Ready for Implementation until Team 04 QA planning and Team 00 promotion.

## Decision Input

This child is derived from:

- `CF-W1-MD-03-market-data-signoff-threshold-contract-requirement.md`
- `market-data-dq-readiness-contract.md`
- current `market-data-foundation` source and tests on `dev`

This contract does not approve schema, provider, startup, route, DQE, or frontend work.

## Contract Intent

Make Market Data signoff fail closed when the current scoped universe misses the already-approved universe thresholds:

- `95%` minimum price-ready coverage
- `90%` minimum required business-metadata coverage

The child exists to enforce and explain those thresholds inside the current signoff policy. It does not reopen the storage/evidence parent under `CF-W1-MD-02A`.

## Narrowed Child Intent

The first child is backend-only and limited to:

- `universeSignoff` threshold enforcement;
- blocker/explanation clarity for threshold misses;
- focused module tests for signoff outcomes;
- module-doc clarification of the signoff gate.

The child must preserve the existing response shape and the existing coverage fields rather than inventing new DTOs.

## Required Behavior

- `universeSignoff.status` must be `FAIL` when `coverage.priceCoveragePercentage < 95`.
- `universeSignoff.status` must be `FAIL` when `coverage.metadataCoveragePercentage < 90`.
- `universeSignoff.downstreamAllowed` must remain `false` whenever either threshold is missed.
- Signoff blockers must distinguish price-threshold failure from metadata-threshold failure with separate codes and required values.
- Existing signoff gates remain active:
  - provider unknown / retry blockers
  - catalog identity repair blockers
  - business metadata repair blockers
  - price backfill blockers
  - latest EOD behind expected blocker
  - minimum review-ready count blocker
  - minimum `10%` review-ready share blocker
  - `trustStatus !== OK` blocker
- Threshold enforcement must use the current scoped coverage math already produced by `universeHealth()` and the signoff inputs already carried into `repairPlan()`.

## Preserved Semantics

The child must preserve all of the following unless Team 00 opens a separate packet:

- current universe-state classification
- current coverage field names and meanings
- current `MarketDataUniverseSignoff` DTO shape
- current review-ready minimum-count env policy
- current `>=10%` review-ready-share policy
- current trust-status categories and existing trust-reason behavior
- current route surface and current controller payload shape

## Exact Future File Reservations

Allowed after Team 00 Ready promotion:

- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.md`
- `backend/tests/modules/market-data-foundation/market-data.service.test.ts`
- `backend/tests/modules/market-data-foundation/market-data.universe.test.ts`

Forbidden:

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
- Market Data provider adapters, repair workflow redesign, startup/backfill changes
- all Data Quality Engine source/tests
- route registries
- shared backend utilities
- package manifests
- frontend source or UI tests
- durable evidence/schema work under `CF-W1-MD-02A` / `CF-W1-MD-02B`

## Test Contract

Focused tests must prove:

- threshold pass with all existing gates satisfied;
- price-coverage threshold fail at `<95`;
- metadata-coverage threshold fail at `<90`;
- dual threshold fail;
- `downstreamAllowed=false` for each fail case;
- existing review-ready minimum-count and `10%` share gates still behave as before;
- stable blocker-code distinction between price-threshold and metadata-threshold failures;
- consistent signoff behavior from both health-derived and repair-plan-derived paths.

## Explicitly Deferred

- durable readiness evidence storage
- new schema or migrations
- DQE consumption changes
- new route payload fields
- new environment variables for threshold configuration
- trust-status redesign
- provider validation policy redesign
- repair-plan workflow redesign
- frontend trust messaging changes outside existing module docs

## Stop Conditions

Stop and return to Team 00 / Architect if implementation needs any of the following:

- Prisma/schema or migration edits
- generated artifacts
- repository/provider/startup/backfill changes
- route/controller changes
- `market-data-foundation.types.ts` contract widening
- DQE source/test changes
- shared utility or package changes
- frontend/UI work
- any attempt to merge `CF-W1-MD-03` with `CF-W1-MD-02A` or `CF-W1-MD-02B`

## QA Planning Handoff

Team 04 should treat this as a backend-only signoff-threshold packet.

Minimum scenario set:

- one passing threshold case
- one price-threshold fail case
- one metadata-threshold fail case
- one dual-threshold fail case
- one preserved review-ready-count/share fail case
- one explanation/parity case proving `repairPlan()` and `universeHealth()` do not disagree on threshold blocking
