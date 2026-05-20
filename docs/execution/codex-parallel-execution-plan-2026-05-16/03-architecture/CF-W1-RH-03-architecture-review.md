# CF-W1-RH-03 Architecture Review

Date: 2026-05-20

Owner: Team 03 Architecture Factory

## Status

READY-CANDIDATE architecture packet prepared for Team 04 QA planning and Team 00 sequencing.

This child stays no-schema and module-local, but it is not backend-only. Current `dev` still hard-codes misleading What Changed fallback copy in the Research Hub page and UI smoke, so truthful unavailable/simulated wording requires bounded feature-local frontend copy alongside Research Hub backend wiring.

As of 2026-05-20, current `dev` does not contain accepted `CF-W1-RH-01` baseline commit `fd88c62`. Future implementation must stack on `fd88c62` or on a later `dev` head that already contains it. For the What Changed portion, Team 00 should either sequence `CF-W1-RH-03` after `CF-W1-RH-02A` or explicitly combine the overlapping `RH-02A + RH-03` writer set into one Research Hub pass.

## Evidence Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-RH-03-research-hub-explainability-trust-labels-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/audit-research-hub-explainability-2026-05-20.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-RH-01-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-RH-02A-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-RH-01-research-hub-actionability-evidence-wiring-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-RH-02A-research-hub-what-changed-fail-closed-basis-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-RH-01-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-RH-02A-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-RH-01-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-RH-02A-work-packet.md`
- `backend/src/modules/research-hub/research-hub.service.ts`
- `backend/src/modules/research-hub/research-hub.types.ts`
- `backend/tests/modules/research-hub/research-hub.service.test.ts`
- `frontend/src/features/research-hub/api/researchHubApi.ts`
- `frontend/src/features/research-hub/components/ResearchOverviewPage.tsx`
- `frontend/tests/ui/research-hub.spec.ts`

## Current Source Findings

- `nextBestAction.sourceModule` already exists in the Research Hub contract, but `research-hub.service.ts` still derives it from `targetRoute.includes('data-quality')` instead of assigning explicit source ownership at action construction time.
- `confirmationSummary.signalSummary.reliabilityAvailable` still becomes `true` from `totalSignalCount > 0`, which overstates trust because it is only raw signal presence, not signal-quality-backed evidence.
- `actionability.dimensions.dataReadiness` still returns the same optimistic-sounding limited message when local inputs are present but true review-universe readiness is not source-owned.
- `whatChanged` is still marked simulated in backend construction and the page still renders `No new review candidates since the last evaluation.` whenever the list is empty.
- The existing Research Hub page already renders actionability dimension status chips and messages generically, so most trust-label wording can remain backend-driven once the underlying messages and statuses are honest.
- The existing frontend UI smoke explicitly asserts the stale What Changed sentence, so feature-local UI smoke must move with the copy fix.

## Architecture Decision

Prepare `CF-W1-RH-03` as a bounded Research Hub explainability/trust-label slice with three coordinated pieces:

1. explicit source-owned provenance for `nextBestAction.sourceModule`;
2. honest trust wording for signal evidence and data readiness without using raw signal count as a reliability proxy; and
3. explicit unavailable/simulated What Changed wording through the same additive comparison-basis surface defined for `CF-W1-RH-02A`, not through durable history or storage.

This child must remain additive, no-schema, and Research Hub-owned. It may consume only current public outputs already used by Research Hub. It must not reopen upstream math, persistence, route registries, shared UI, or shared utilities.

## Smallest Feasible First Child

The smallest feasible first child is one bounded Research Hub backend + feature-local frontend slice:

- backend service/types/doc/test;
- frontend feature API type, page copy/rendering, and existing module UI smoke.

It is not safe to label this child backend-only because the current page and Playwright smoke still contain hard-coded temporal wording that conflicts with the requirement.

## Recommended Contract Posture

### Next Action Provenance

- keep `nextBestAction.sourceModule` as the public field;
- assign it from the action generation branch or explicit mapping table inside `research-hub.service.ts`;
- forbid route-substring inference.

### Signal Evidence / Reliability

- treat `confirmationSummary.signalSummary.reliabilityAvailable` as compatibility-only and stop turning it `true` from raw signal counts alone;
- make `actionability.dimensions.signalEvidence` the authoritative trust label for the overview;
- update user-visible note/message copy so the page can distinguish source-owned evidence from limited, unproven, and insufficient states.

### Data Readiness

- keep the existing `dataReadiness` dimension key;
- tighten wording so local upstream availability, limited upstream gaps, and unavailable states are clearly distinguished;
- do not imply trusted review-universe readiness unless Research Hub actually has source-owned proof for it.

### What Changed

- reuse the `comparisonBasis` additive contract from `CF-W1-RH-02A` for unavailable-basis semantics;
- when no auditable prior Research Hub basis exists, suppress delta claims and render basis-unavailable wording;
- keep any durable basis, snapshot, or storage path as a separate later consent-gated child.

## Exact Future File Reservations

Allowed files after Team 00 promotion:

- `backend/src/modules/research-hub/research-hub.service.ts`
- `backend/src/modules/research-hub/research-hub.types.ts`
- `backend/src/modules/research-hub/research-hub.md`
- `backend/tests/modules/research-hub/research-hub.service.test.ts`
- `frontend/src/features/research-hub/api/researchHubApi.ts`
- `frontend/src/features/research-hub/components/ResearchOverviewPage.tsx`
- `frontend/tests/ui/research-hub.spec.ts`

## Forbidden Files

- application source or tests before Team 00 promotion
- implementation from current unstacked `dev` while it still lacks accepted `RH-01` commit `fd88c62`
- parallel Research Hub writers on the same file set
- `backend/src/modules/research-hub/index.ts`
- `backend/src/modules/research-hub/research-hub.controller.ts`
- `backend/src/modules/research-hub/research-hub.router.ts`
- `frontend/src/features/research-hub/hooks/useResearchOverview.ts`
- `frontend/src/features/research-hub/index.tsx`
- `backend/src/api/routes.ts`
- `frontend/src/app/routes.tsx`
- all upstream module source/tests, including `today-trade-review`, `strategy-decision-engine`, `trade-plan-risk-engine`, `signal-quality-lab`, `signal-calibration-engine`, `market-context-intelligence`, and `smart-money-intelligence`
- scheduler/journal storage
- durable Research Hub snapshot/history work
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- generated files
- shared backend utilities
- shared frontend components
- package manifests
- provider/live-data integration
- startup/backfill workflows
- paid/cloud, broker, or telemetry scope
- broad Research Hub redesign

## Dependency And Sequencing Notes

- `CF-W1-RH-01`: hard base dependency. Current `dev` on 2026-05-20 does not contain accepted `fd88c62`, and `RH-03` shares the same backend writer set.
- `CF-W1-RH-02A`: functional dependency for truthful What Changed unavailable-basis semantics. If `RH-02A` is not already merged into the chosen base, Team 00 should either sequence it first or combine `RH-02A + RH-03` into one writer pass.
- `CF-W1-SQLAB-01`: semantic-upgrade dependency only. Before richer Signal Quality trust-state fields are actually present on merged `dev`, `RH-03` must stay conservative and avoid a `READY` / trusted signal-evidence story.
- `CF-W1-CAL-01`: compatibility dependency only for future calibration vocabulary alignment. `RH-03` does not need calibration source changes.

Do not treat accepted docs as proof that those commits are already merged into `dev`.

## True Consent-Blocker Assessment

No true consent blocker was found for the bounded `RH-03` first child itself.

The current blockers are sequencing and file-overlap blockers:

- accepted `RH-01` base is missing from current `dev`;
- What Changed truth-copy overlaps the `RH-02A` writer set.

Durable comparison storage is not required for `RH-03`. If Team 00 later wants auditable prior-basis persistence, that must be split into a separate consent-gated child.

## QA Planning Handoff For Team 04

Team 04 can prepare QA now.

Minimum scenarios:

- explicit source-owned `nextBestAction.sourceModule` path with no route-substring inference;
- raw signal counts present but reliability still limited/unproven because source-owned evidence is not proven;
- local upstream inputs present but data readiness wording stays honest and does not imply trusted review-universe readiness;
- unavailable comparison basis yields unavailable What Changed copy and no temporal overclaim;
- UI smoke proves the stale `since the last evaluation` sentence is removed from the unavailable-basis path;
- research-support language remains intact with no advice, target, broker, or automation wording.

## Readiness Result

READY-CANDIDATE.

- No schema, migration, route, shared utility, shared UI, package, or provider widening is required.
- Frontend feature-local copy is included in scope.
- No true consent blocker exists for the bounded first child.
- Team 04 can prepare QA now.
