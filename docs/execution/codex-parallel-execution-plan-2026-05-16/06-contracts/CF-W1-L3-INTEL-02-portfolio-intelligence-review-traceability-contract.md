# CF-W1-L3-INTEL-02 Portfolio Intelligence Review Traceability Contract

Date: 2026-05-20

Owner: Team 03 Architecture Factory

## Status

Contract refreshed. Not Ready for Implementation.

Upstream dependency: accepted/stable `CF-W1-L3-PORT-01A` readiness semantics.

Queue/sequencing note: this child sits behind active `CF-W1-L3-WATCH-01` in current Lane 3 direct-value ordering, but WATCH-01 is not an application-file dependency.

## Intent

Portfolio Intelligence is a review surface. It must explain whether review-oriented labels are reliable, limited, diagnostic-only, or blocked, and it must trace why that state applies without duplicating DQE logic or widening into watchlist scope.

## Required Upstream Contract

This child consumes accepted portfolio readiness metadata from Portfolio Management only:

- `PortfolioSummaryDto.readinessSummary`
- `HoldingValuationDto.readiness`

The child must consume that data through `PortfolioManagementService.summary()` and existing public module boundaries.

It must not depend on:

- watchlist readiness DTOs from `CF-W1-L3-PORT-01B`
- watchlist review-actionability fields from `CF-W1-L3-WATCH-01`
- direct DQE repository or scoring imports

## Required Traceability Behavior

- Review output distinguishes `RELIABLE`, `LIMITED`, `DIAGNOSTIC`, and `BLOCKED`.
- Review ranking, red flags, grouped summaries, and action-like labels must not imply trusted review output when readiness is not trusted.
- Traceability metadata should identify source modules, blocker reasons, and latest trusted data date where that evidence is available from upstream readiness DTOs.
- Existing Portfolio Intelligence response fields remain present for backward compatibility.
- Missing readiness metadata is blocked or diagnostic, never silently trusted because `dataStatus` happens to be `COMPLETE`.

## Required Representation Boundary

The first child stays backend-only and module-local.

Allowed implementation surface after Team 00 promotion:

- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.service.ts`
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.types.ts`
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.md`
- `backend/tests/modules/portfolio-intelligence/portfolio-intelligence.service.test.ts`

The first child must not require:

- Prisma/schema/migrations
- route changes
- frontend feature work
- shared DTO/utilities
- shared UI changes
- watchlist or portfolio-management source edits

## Sequencing Rule

- `CF-W1-L3-PORT-01A` is a hard prerequisite and must be accepted/stable before implementation.
- Current plain `dev` does not yet contain the accepted `PORT-01A` readiness shape, so implementation must stack on accepted `f1432e6` or a later clean `dev` containing that commit.
- `CF-W1-L3-WATCH-01` stays ahead of this child in Team 00 promotion order, but it is not a source-file dependency.
- `CF-W1-L3-INTEL-01` shares the same `portfolio-intelligence` writer set. Team 00 must combine or sequence the two packets; separate concurrent writers are forbidden.

## Forbidden Behavior

- Do not import `DataQualityEngineRepository` or duplicate DQE scoring/mapping logic.
- Do not modify `portfolio-management` source/tests in this child.
- Do not modify `watchlist-management` source/tests in this child.
- Do not modify Prisma schema, migrations, route registries, shared utilities, shared UI, frontend files, package manifests, generated files, providers, startup/backfill, or live-provider flows.
- Do not introduce direct financial advice language or arbitrary target prices.

## QA Planning Gate

QA plan refresh is required before any Team 00 Ready evaluation because there is no dedicated `CF-W1-L3-INTEL-02` QA plan file yet.

Team 04 must either create:

- `04-qa/CF-W1-L3-INTEL-02-qa-plan.md`

or explicitly document a combined `INTEL-01 + INTEL-02` QA packet after Team 00 chooses the one-writer sequencing path.

## Focused Test Contract

Focused backend tests must prove:

- reliable review traceability when upstream readiness is trusted;
- limited review traceability when output is visible but not action-trusted;
- diagnostic-only review traceability when heuristics are exposed without trusted review standing;
- blocked review traceability when readiness evidence is missing or blocked;
- source-module and blocker propagation where available;
- existing Portfolio Intelligence response fields remain present;
- no DQE repository imports or watchlist dependencies are introduced.
