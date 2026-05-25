# TEAM-02 Requirement Factory

## Team 02 Rolling Priority Hygiene Pass - 2026-05-25

Root `AGENTS.md` was read first. Team 02 stayed docs-only, wrote only inside the allowed `10-requirements/**` folder plus this outbox, and did not touch application source/tests, Team 03 architecture docs, Team 04 QA docs, Team 05 implementation files, Prisma/schema, route registries, package manifests, or the decision inbox.

### Work Item

Reconcile the requirement queues against the live runtime queue so Team 02 does not keep ranking already-active work as if it were fresh unassigned backlog.

### Files Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/00-control/team-agent-runtime-queue.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/top-10-ready-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/next-top-10-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/refinement-queue.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/requirements-backlog.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W2-CAL-02-signal-calibration-evidence-freshness-and-scope-basis-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-RH-01A-research-hub-actionability-evidence-date-wiring-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/TEAM-01-direct-value-gap-audit-2026-05-25.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/99-decision-inbox/open-decisions.md`

### Files Changed

- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/top-10-ready-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/next-top-10-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/refinement-queue.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/requirements-backlog.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W2-CAL-02-signal-calibration-evidence-freshness-and-scope-basis-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-02-requirement-factory.md`

### What Changed

- Marked `CF-W2-CAL-02` as reserved through active child `CF-W2-CAL-02A` rather than keeping it at the top of the unassigned queue.
- Updated queue headers and guardrails to match the live reserved lanes:
  - Team 06 active on `CF-W2-CAL-02A`
  - Team 03 active on `CF-W2-TSC-05A` addendum
  - Team 05 active on `CF-W1-DQ-02-RS1` rework
- Re-ranked the next honest unassigned stack to:
  1. `CF-W1-MD-02A`
  2. `CF-W1-SQLAB-02B`
  3. `CF-W1-STRAT-02B`
  4. `CF-W1-RH-01A`
  5. `CF-W1-L3-DQ-01A`

### Product Routing Result

- No new requirement ID was created in this pass.
- No item was moved to Ready.
- `CF-W1-RH-01A` is now the first non-storage, non-Today-Review, non-DQ-rework follow-on once the active calibration child clears.
- The three durable-proof proposals stay above `CF-W1-RH-01A` in investor/trader value, but they remain consent-gated and proposal-only.

### Recommended Next Team 03 Architecture Intake

Default next non-consent path after current active lanes:

- `CF-W1-RH-01A` after `CF-W2-CAL-02A` closes and after Team 03 clears the active `CF-W2-TSC-05A` addendum.

Conditional consent-opened paths:

- `CF-W1-MD-02A` if Team 00 intentionally opens storage/schema scope.
- `CF-W1-SQLAB-02B` if Team 00 intentionally opens storage scope.
- `CF-W1-STRAT-02B` if Team 00 intentionally opens schema/generated/repository scope.

### Consent Gates

- `CF-W1-MD-02A`: storage/schema companion evidence scope.
- `CF-W1-SQLAB-02B`: durable storage scope for measured outcome memory.
- `CF-W1-STRAT-02B`: schema/generated/repository scope for durable strategy revision history.

### Teams Ready To Pick Up New Tasks

- Team 03: not for a fresh packet immediately; currently reserved on `CF-W2-TSC-05A` addendum. Next non-consent intake should be `CF-W1-RH-01A` after active CAL/TSC gates clear.
- Team 04: queued for active-lane QA only; no fresh Team 02 packet should be routed there now.
- Team 06: active on `CF-W2-CAL-02A`.
- Team 10: ready for the next QA-accepted active-lane review handoff.
- Team 02: ready for another thin docs-only pass after Team 00 consumes this hygiene update.

### Tests Run / Skipped

- Tests run: none
- Tests skipped: all
- Reason: docs-only priority hygiene pass

### Constraint Result

- No application code changed.
- No tests/builds/services/providers/Prisma/UI smoke were run.
- No commit or push was performed.

## Team 02 Research Hub Evidence-Date Refinement Pass - 2026-05-25

Root `AGENTS.md` was read first. Team 02 stayed docs-only, wrote only inside the allowed `10-requirements/**` folder plus this outbox, and did not touch application source/tests, Team 04 QA-planning files, Team 07 Today Review files, Prisma/schema, route registries, shared UI, package manifests, or the decision inbox.

### Work Item

Consume Team 01's direct-value audit and determine whether the smaller non-storage Research Hub actionability evidence-date gap is real enough to become a bounded requirement.

### Files Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/16-team-inboxes/TEAM-02-current-assignment.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/TEAM-01-direct-value-gap-audit-2026-05-25.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/top-10-ready-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/next-top-10-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/refinement-queue.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/requirements-backlog.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/99-decision-inbox/open-decisions.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-RH-01-research-hub-actionability-evidence-wiring-requirement.md`
- `backend/src/modules/research-hub/research-hub.service.ts`
- `backend/src/modules/research-hub/research-hub.types.ts`
- `backend/src/modules/research-hub/research-hub.md`
- `frontend/src/features/research-hub/api/researchHubApi.ts`
- `frontend/src/features/research-hub/components/ResearchOverviewPage.tsx`

### Files Changed

- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-RH-01A-research-hub-actionability-evidence-date-wiring-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/top-10-ready-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/next-top-10-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/refinement-queue.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/requirements-backlog.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-02-requirement-factory.md`

### Requirement Created / Refined

- Created `CF-W1-RH-01A - Research Hub Actionability Evidence-Date Wiring Requirement`.

Why this is viable:

- the backend and frontend contracts already contain `evidenceDate`;
- the current Research Hub service never populates that field;
- the gap is additive and bounded to honest date wiring, not a new storage/history project;
- it does not reopen `CF-W2-CAL-02`, Today Review writer-family work, DQ residual work, or Trade Plan-first wording.

Why it stays behind other items:

- `CF-W2-CAL-02` still comes first because calibration needs the underlying evidence-through basis defined before Research Hub can claim a calibration evidence date;
- `CF-W1-MD-02A`, `CF-W1-SQLAB-02B`, and `CF-W1-STRAT-02B` remain higher-value durable-proof proposals, but still consent-gated and not Ready.

### Queue Delta

Updated ranking result:

1. `CF-W2-CAL-02`
2. `CF-W1-MD-02A` (consent-gated)
3. `CF-W1-SQLAB-02B` (consent-gated)
4. `CF-W1-STRAT-02B` (consent-gated)
5. `CF-W1-RH-01A`
6. `CF-W1-L3-DQ-01A`

No item was moved to Ready.

### Recommended Next Team 03 Handoff

- Keep Team 03 on `CF-W2-CAL-02` first.
- After that packet is defined, `CF-W1-RH-01A` is the recommended bounded no-storage follow-on for Team 03:
  - confirm which actionability dimensions already have a truthful public date basis;
  - keep calibration date wiring dependency-gated on `CF-W2-CAL-02`;
  - fail closed with `evidenceDate: null` where the basis is not yet public or not yet stable.

### Blockers / Risks

- `CF-W1-RH-01A` must not invent per-dimension dates from `generatedAt` or another overview-level timestamp.
- Calibration evidence date remains dependency-gated on `CF-W2-CAL-02`.
- The three durable-proof proposals remain consent-gated and proposal-only.
- Team 07 Today Review work and Team 04 DQ/CAL QA planning stay out of this requirement.

### Teams Ready To Pick Up New Tasks

- Team 03: yes, for `CF-W1-RH-01A` only after `CF-W2-CAL-02` architecture work is handled or sequenced.
- Team 02: yes, for another thin docs-only discovery pass after Team 00 routes the next packet.
- Team 04: not for this new item yet; current CAL/DQ QA planning remains active and should not be duplicated.

### Tests Run / Skipped

- Tests run: none
- Tests skipped: all
- Reason: docs-only requirement refinement pass

### Constraint Result

- No application code changed.
- No tests/builds/services/providers/Prisma/UI smoke were run.
- No commit or push was performed.

## Team 02 Fresh Direct-Value Requirement Discovery Pass - 2026-05-25

Root `AGENTS.md` was read first. Team 02 stayed docs-only, wrote only inside the allowed `10-requirements/**` folder plus this outbox, and did not touch application source/tests, architecture/contract/QA docs, route registries, Prisma/schema, package manifests, Team 07 Today Review files, or Team 04 QA-planning files.

### Work Item

Run a fresh direct investor/trader-value requirement discovery pass after the accepted backtesting/smart-money/strategy/signal slices, while excluding:

- active `CF-W2-TSC-05A` with Team 07;
- active `CF-W1-DQ-02-RS1` QA planning with Team 04;
- accepted/committed slices already listed in the assignment;
- Trade Plan-first, target-price, synthetic-target, and advice-like requirement framing.

### Files Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/top-10-ready-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/next-top-10-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/refinement-queue.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/requirements-backlog.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/00-control/active-work-board.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/00-control/team-agent-runtime-queue.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/99-decision-inbox/open-decisions.md`
- `backend/src/modules/market-data-foundation/market-data-foundation.md`
- `backend/src/modules/data-quality-engine/data-quality-engine.md`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.md`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.md`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.types.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.service.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.md`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.types.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.service.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.md`
- `backend/src/modules/market-context-intelligence/market-context-intelligence.md`
- `backend/src/modules/today-trade-review/today-trade-review.md`
- `frontend/src/features/today-trade-review/components/TodayReviewPage.tsx`
- `frontend/src/features/pipeline-ops/components/PipelineOpsPage.tsx`
- `frontend/src/features/pipeline-ops/components/PipelineOpsTable.tsx`
- `frontend/src/features/pipeline-ops/components/PipelineStatusStrip.tsx`
- `frontend/src/features/pipeline-ops/types.ts`
- `frontend/src/features/signal-calibration-engine/components/SignalCalibrationEnginePage.tsx`
- `frontend/src/features/signal-calibration-engine/hooks/useSignalCalibrationEngine.ts`
- `frontend/src/features/signal-calibration-engine/api/signalCalibrationEngineService.ts`
- `frontend/src/features/signal-calibration-engine/types.ts`

### Files Changed

- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W2-CAL-02-signal-calibration-evidence-freshness-and-scope-basis-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/top-10-ready-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/next-top-10-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/refinement-queue.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/requirements-backlog.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-02-requirement-factory.md`

### Requirement Created

- `CF-W2-CAL-02 - Signal Calibration Evidence Freshness And Scope Basis Requirement`

Reason:

- Calibration already exposes readiness/sample-state language, but it does not tell the user what measurable evidence date or scoped aggregate basis those judgments come from.
- Signal Quality already owns the upstream timing facts (`generatedAt`, `latestAvailablePriceDate`, `nextEvaluableDate`, horizon availability), so this is a real bounded trust follow-on rather than a new engine proposal.
- The current calibration page falls back to unscoped `/health` plus first-row proxy summaries, which is not a truthful page-level trust basis.

### Queue / Ranking Result

Updated highest-value unassigned stack:

1. `CF-W2-CAL-02`
2. `CF-W1-MD-02A` (consent-gated)
3. `CF-W1-SQLAB-02B` (consent-gated)
4. `CF-W1-STRAT-02B` (consent-gated)
5. `CF-W1-L3-DQ-01A`

Why `CF-W2-CAL-02` moved above the others:

- It is independent of Team 07 and Team 04 active write scopes.
- It is non-consent-gated.
- It fixes a current direct user trust problem in a core investor/trader evidence surface.
- It does not reopen accepted `CF-W1-CAL-01A`; it is a fresh residual on evidence-basis truth, not DQ hard-gating.

### Consent-Gated / Architecture-Next / Avoid Lists

Consent-gated and keep proposal-only:

- `CF-W1-MD-02A`
- `CF-W1-SQLAB-02B`
- `CF-W1-STRAT-02B`

Architecture next:

- `CF-W2-CAL-02`

Hold until active writer family clears:

- `CF-W1-TSC-02`
- `CF-W1-TSC-03`

Avoid as stale / accepted / already active:

- `CF-W2-TSC-05A`
- `CF-W1-DQ-02-RS1`
- `CF-W1-BT-04`
- `CF-W1-SMI-01`
- accepted MDPIPE slices
- accepted/committed items listed in the assignment exclusion set

### Blockers / Risks

- No independent non-consent-gated direct-value gap was found in Today Review because Team 07 owns that writer family now.
- No DQ residual follow-on should be reopened while Team 04 owns `CF-W1-DQ-02-RS1` QA planning.
- `CF-W2-CAL-02` will need Team 03 to confirm whether the first bounded child can stay additive across calibration-owned backend/frontend files without widening into shared UI or route work.

### Recommended Next Architecture Target

- `CF-W2-CAL-02`

Reason:

- highest unblocked direct user value;
- bounded cross-surface trust fix;
- no schema/storage consent needed;
- no collision with the active Today Review and DQ packets.

### Teams Ready To Pick Up New Tasks

- Team 03: next architecture packet should be `CF-W2-CAL-02` after current signoff/review obligations allow.
- Team 01/02: can continue thin-backlog discovery after `CF-W2-CAL-02` is routed.
- Team 10: remains ready for the next QA-accepted review handoff from the active lanes.

### Tests Run / Skipped

- Tests run: none
- Tests skipped: all
- Reason: docs-only requirement pass

### Constraint Result

- No application code changed.
- No tests/builds/services/providers/Prisma/UI smoke were run.
- No item was moved to Ready.
- No commit or push was performed.

## Team 02 Rolling Direct-Value Requirement Pass - 2026-05-25

Root `AGENTS.md` was read first. Team 02 stayed docs-only, wrote only inside the allowed `10-requirements/**` folder plus this outbox, and did not touch application source/tests, architecture/contract/QA docs, the Ready queue, route registries, Prisma/schema, package manifests, or shared UI/utilities.

### Work Item

Refresh the top candidate queue after `CF-W2-TSC-05A` promotion to Team 07 and `CF-W1-DQ-02` residual read-side routing to Team 03, then identify the next independent direct investor/trader-value candidates without duplicating active write scopes.

### Files Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/top-10-ready-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/next-top-10-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/refinement-queue.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/requirements-backlog.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/12-ready-queue/ready-for-implementation.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/00-control/active-work-board.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-BT-04-backtesting-run-freshness-and-current-proof-labels-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-SMI-01-smart-money-evidence-freshness-partial-trust-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-TSC-03-today-review-supporting-trust-evidence-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-L3-DQ-01A-lane-3-passive-readiness-dto-contract-requirement.md`

### Files Changed

- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/top-10-ready-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/next-top-10-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/refinement-queue.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-02-requirement-factory.md`

### What Changed

- Removed active `CF-W2-TSC-05A` and active `CF-W1-DQ-02` residual work from the unassigned ranking.
- Re-ranked the queue around the next independent direct-value candidates that do not collide with Team 07 Today Review writes or Team 03 DQ residual writes.
- Elevated `CF-W1-BT-04` as the next recommended Team 03 architecture target after the active DQ residual packet.
- Kept `CF-W1-MD-02A`, `CF-W1-SQLAB-02B`, and `CF-W1-STRAT-02B` visible but explicitly consent-gated.
- Added `CF-W1-SMI-01` back into the near-front stack as the best non-consent-gated requirement draft behind `BT-04`.

### What Did Not Change

- No new requirement doc was created. Existing drafted requirements already cover the next value slices cleanly.
- No item was moved to Ready. Team 00 still owns Ready promotion.
- `CF-W1-TSC-02` remains a valid direct-value requirement, but it stays behind the active Today Review writer family and was not reopened as an independent next packet.
- `CF-W1-DQ-02` residual direction did not change; it remains read-side/public-contract reconstruction, not a forced durable-schema packet.

### Next 5 Unassigned Candidates

1. `CF-W1-BT-04`
2. `CF-W1-MD-02A`
3. `CF-W1-SQLAB-02B`
4. `CF-W1-STRAT-02B`
5. `CF-W1-SMI-01`

### Blockers / Risks

- `CF-W1-MD-02A`, `CF-W1-SQLAB-02B`, and `CF-W1-STRAT-02B` remain blocked by explicit schema/storage/generated/repository consent gates.
- `CF-W1-TSC-02` and `CF-W1-TSC-03` should not be routed while Team 07 owns the active Today Review writer set.
- Team 03 is already occupied with the `CF-W1-DQ-02` residual packet and should not receive duplicate DQ-adjacent work in parallel.

### Team 00 Correction

Team 00 reconciled this Team 02 recommendation against gate evidence after the agent returned.

Correction:

- `CF-W1-BT-04` is already accepted and locally committed on Team 06 branch commit `2bd794f feat: add backtesting proof freshness labels`.
- `CF-W1-SMI-01` is already accepted and locally committed on Team 06 branch commit `aee7c49 feat: add smart money evidence trust metadata`.
- Neither item should be routed as fresh architecture or implementation work.
- The next unassigned direct-value pool is mostly consent-gated durable-storage/provenance work (`MD-02A`, `SQLAB-02B`, `STRAT-02B`) plus lower-priority trust UX/contract residuals.
- If no active signoff or handoff is waiting, Team 00 should run a fresh Team 01/02 audit for market-data, signals, calibration, backtesting, and Today Review to find the next non-stale user-value gap.

### Tests Run / Skipped

- Tests run: none
- Tests skipped: all
- Reason: docs-only requirement pass

### Constraint Result

- No application code or tests changed.
- No commit or push was performed.
- No accepted item was reopened.

## Team 02 CF-W1-DQ-02 Residual Product Decision - 2026-05-25

Root `AGENTS.md` was read first. Team 02 stayed docs-only, wrote only inside the allowed requirement files plus this outbox, and did not touch application code, tests, manifests, Prisma/schema, route registries, shared UI, Team 00 control docs, or historical execution docs.

### Work Item

Resolve the product/requirements side of the residual `CF-W1-DQ-02` blocker after Team 03 reported there is no honest bounded no-schema child left after accepted `CF-W1-DQ-02A` commit `c2d6753`.

### Files Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-architecture-factory.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-DQ-02-dq-currentness-evidence-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-DQ-02-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-DQ-02B-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-DQ-02-dq-currentness-evidence-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-DQ-02B-dq-currentness-public-read-path-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/top-10-ready-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/next-top-10-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/refinement-queue.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/12-ready-queue/blocked-by-upstream-dependency.md`
- `backend/src/modules/data-quality-engine/data-quality-engine.service.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.repository.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.types.ts`

### Files Changed

- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-DQ-02-residual-read-side-currentness-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/top-10-ready-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/next-top-10-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/refinement-queue.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-02-requirement-factory.md`

### Required Decision Output

Decision: define a read-time reconstruction requirement for the residual `CF-W1-DQ-02` gap.

Rejected alternatives:

- defer entirely: rejected because investor/trader trust still needs one truthful DQ currentness story across summary/list/diagnostics/latest-read paths;
- require durable persisted currentness now: rejected because Product value does not yet justify schema/storage work when the immediate need is present-time cross-surface truth rather than replayable historical currentness history.

### Product Reason And User Value

- Selective truth across DQ surfaces is worse than a visible blocker; it causes users to distrust both the list and the detail view.
- Accepted `CF-W1-DQ-02A` already solved evaluator-local currentness. The remaining gap is public/read-side consistency.
- Read-time reconstruction is the narrowest honest next product slice because it can unify currentness semantics across persisted DQ read paths without implying that the product already stores durable currentness history.
- Durable persisted fields remain a possible later need, but only if the product later needs replayable historical currentness dates/reason codes or architecture proves truthful read-time reconstruction is insufficient.

### Queue / Routing Result

- Kept `CF-W2-TSC-05A` ahead of DQ residual work. This decision must not stop unrelated Today Review sequencing.
- Replaced the vague `DQ-02` residual-parent queue wording with an explicit read-side reconstruction requirement.
- Marked the residual as consent-gated and not Ready.
- Recorded that Team 00, Team 02, and Architect can proceed without human Product Owner escalation for the next packet choice.

### Assumptions

- The current investor/trader need is latest truthful currentness across current DQ read paths, not durable historical replay.
- Team 03's read-side/public-contract assessment is still current and accurate.

### Risks And Blockers

- Implementation is still blocked until Team 00 opens the explicit DQE read-side/public-contract packet.
- Architecture may still discover that truthful or performant reconstruction requires durable fields; if so, the work must stop and reopen under separate schema consent.
- `blocked-by-upstream-dependency.md` still references `CF-W1-DQ-02B`; Team 02 did not edit that file because it was outside the allowed write scope for this pass.

### Shared-File Requests

- None in this Team 02 pass.

### Tests Run / Skipped

- Tests run: none
- Tests skipped: all
- Reason: docs-only requirement decision pass

### Next Gate

- Team 00 should keep `CF-W2-TSC-05A` moving first.
- After `TSC-05A` sequencing is underway, Team 00 can open the explicit DQE read-side/public-contract packet for Team 03 architecture prep.
- Human Product Owner approval is not required for that next requirement-definition step unless the work widens into durable schema/storage consent.

## Team 02 Rolling PO Requirement Refresh - TSC-04A QA / TSC-05A Stacked Follow-On - 2026-05-25

Root `AGENTS.md` was read first. Team 02 stayed docs-only, wrote only inside the reserved requirement folder and this outbox, and did not touch application code, tests, manifests, Prisma, shared files, Team 00 control docs, or historical docs.

### Files Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/top-10-ready-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/next-top-10-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/refinement-queue.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W2-TSC-04-today-review-no-target-candidate-language-cleanup-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W2-TSC-05-today-review-no-target-ranking-and-eligibility-reframe-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-TSC-02-active-signal-health-rule-evidence-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/13-implementation-evidence/CF-W2-TSC-04A-ready-promotion.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-00-orchestrator-integration-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-architecture-factory.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-outbox.md`
- `backend/src/modules/today-trade-review/today-trade-review.md`
- `backend/src/modules/today-trade-review/today-trade-review.service.ts`
- `frontend/src/features/today-trade-review/components/TodayReviewPage.tsx`
- `frontend/src/features/today-trade-review/components/TodayReviewCandidateDetailPage.tsx`

### Files Changed

- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/top-10-ready-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/next-top-10-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/refinement-queue.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-02-requirement-factory.md`

### Reconciliation Result

- Reconciled the stale queue assumption that `CF-W2-TSC-04` is still a generic fresh planning item.
- Current authoritative state is narrower:
  - `CF-W2-TSC-04A-TREV-CANDIDATE-LANGUAGE` is implemented in the Team 07 worktree and is under active Team 04 QA verification.
  - `CF-W2-TSC-04` parent remains in-flight until QA, review, signoff, and Product Owner acceptance resolve.
  - `CF-W2-TSC-05A-TREV-RANKING-ELIGIBILITY-REFRAME` is already prepared by Team 03 but remains blocked behind accepted `TSC-04A` base evidence.
- Reconciled source/docs evidence that current main still exposes pre-`TSC-04A` Today Review target/R:R and Trade Plan-first semantics, so `TSC-05A` must not start from current main.
- Kept `CF-W1-TP-03` paused/stale as framed.
- Did not create a new requirement ID; no genuinely higher-value gap outranked the current queue once `TSC-04A` active state was accounted for.

### Next 3 Team 00 Routing Recommendation After TSC-04A Clears Gates

1. `CF-W2-TSC-05` via stacked child `CF-W2-TSC-05A-TREV-RANKING-ELIGIBILITY-REFRAME`
   - Re-anchor to the accepted `TSC-04A` branch/commit or merged base first.
   - Keep it Today Review-only and reject any widening into upstream Trade Plan or Strategy Decision rewrites.
2. `CF-W1-TSC-02`
   - Route Team 03 architecture prep for the next active-signal-health requirement once the Today Review no-target pair is sequenced.
3. `CF-W1-DQ-02` residual parent
   - Only if Team 03 confirms a bounded no-schema read-side/public-contract child; otherwise keep blocked and do not fake readiness.

### Teams Ready To Pick Up New Requirement / Architecture / QA Prep

- Team 02: rolling requirement hygiene and next-gap discovery.
- Team 03: ready to re-anchor `CF-W2-TSC-05A` after accepted `TSC-04A` base evidence; otherwise next architecture prep for `CF-W1-TSC-02`.
- Team 04: active on `TSC-04A` QA verification; ready for `TSC-05A` QA planning after accepted base evidence exists.
- Team 10: ready for `TSC-04A` code review after Team 04 acceptance.
- Team 07: ready for bounded `TSC-04A` rework if QA/review rejects it; otherwise standby for stacked `TSC-05A`.

### Constraint Result

- No item was moved to Ready.
- No commit or push was performed.

## Team 02 Rolling PO Requirement Audit - Today Review / Pipeline Ops Alignment - 2026-05-25

Root `AGENTS.md` was read first. Team 02 stayed docs-only, wrote only inside the reserved requirement folder and this outbox, and did not touch application code, tests, manifests, Prisma, shared files, or Team 00 control docs.

### Files Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/next-top-10-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/top-10-ready-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/refinement-queue.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W2-TSC-04-today-review-no-target-candidate-language-cleanup-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W2-TSC-05-today-review-no-target-ranking-and-eligibility-reframe-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-TSC-02-active-signal-health-rule-evidence-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-TSC-03-today-review-supporting-trust-evidence-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-MD-05-catalog-sync-latest-session-freshness-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-L3-TREV-01-today-review-publication-evidence-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-L3-TREV-02-today-review-candidate-snapshot-provenance-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-DQ-02-dq-currentness-evidence-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W3-MDPIPE-01-incremental-market-data-pipeline-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W3-MDPIPE-01B1-durable-pipeline-ledger-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W3-MDPIPE-01B2-pipeline-status-api-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W3-MDPIPE-01B3-bulk-pipeline-ops-dashboard-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W3-MDPIPE-01B4-command-api-manual-trigger-safety-requirement.md`

### Files Changed

- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/next-top-10-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/top-10-ready-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W2-TSC-04-today-review-no-target-candidate-language-cleanup-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W2-TSC-05-today-review-no-target-ranking-and-eligibility-reframe-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-TSC-02-active-signal-health-rule-evidence-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-02-requirement-factory.md`

### Ranking Decision

- No new requirement outranks the existing direct investor/trader stack.
- Top three remain unchanged:
  1. `CF-W2-TSC-04`
  2. `CF-W2-TSC-05`
  3. `CF-W1-TSC-02`
- The ranking stayed intact because the latest Pipeline Ops direction is already covered by the MDPIPE lane. It does not create a separate higher-priority Team 02 discovery item.
- The candidate docs were stale in their notes, not in their top-three ordering. Stale `MD-05` and `TSC-03` dispatch language was normalized so the written guidance matches the actual active gate state.

### New / Updated Requirements

- No new requirement ID was created in this pass.
- Updated `CF-W2-TSC-04` to state that Today Review may show compact read-only stale or in-progress freshness/status context, but it must not gain page-local manual pipeline or bulk refresh controls.
- Updated `CF-W2-TSC-05` to keep the same no-target ranking/eligibility scope while explicitly preserving the Pipeline Ops split: compact read-only status is allowed, local rerun controls are not.
- Updated `CF-W1-TSC-02` so future active-candidate health surfaces may expose compact read-only stale or refresh-pending status, but manual remediation stays in `Pipeline Ops`.
- Updated the two top-10 queue docs to reflect:
  - active Team 00 and Team 03 prep on `CF-W2-TSC-04`,
  - active Team 00 and Team 08 gating on `CF-W3-MDPIPE-01B5`,
  - the settled `/pipeline-ops` vs. compact feature-page status split,
  - `CF-W1-MD-05` and `CF-W1-TSC-03A` no longer being described as fresh Team 02 pulls.

### Blockers

- Team 00 and Team 03 are already using the Today Review planning lane for `CF-W2-TSC-04`; Team 02 must avoid widening that slice or creating a competing Today Review child on the same writer set.
- Team 00 and Team 08 own the live `CF-W3-MDPIPE-01B5` and `CF-W3-MDPIPE-01B6` pipeline lane follow-ons.
- Team 02 has no authority to move any item to Ready.
- No separate Team 02 requirement should be opened for Pipeline Ops unless a remaining investor-facing trust gap persists after the current compact-indicator and page-control migration slices land.

### Recommended Next Team 00 Action

- Continue `CF-W2-TSC-04` architecture and QA prep with Team 03 and Team 04.
- Keep `CF-W2-TSC-05` queued directly behind `CF-W2-TSC-04`, but do not open it on the same Today Review writer set until the first packet clears.
- Keep `CF-W1-TSC-02` as the next active-candidate-health requirement after the two Today Review cleanup slices.
- Keep `CF-W3-MDPIPE-01B5` and `CF-W3-MDPIPE-01B6` in the pipeline lane. Do not route them back through Team 02 discovery.
- Do not move any item to Ready from this Team 02 pass.

## Team 02 Rolling PO Discovery - Pipeline Ops Coverage Check - 2026-05-25

Root `AGENTS.md` and the current requirement queue were re-read for a docs-only priority refresh. Team 02 kept the pass bounded to requirements discovery and did not touch application code, ready queues, or other team outboxes.

### Current PO Priority Recheck

- Investor/trader trust value still leads: market-data freshness, data-quality readiness, explainable signals, backtesting/calibration trust, and Trusted Signal Candidate / Today Review.
- Admin, auth, subscription, and convenience surfaces remain lower priority unless they block correctness, privacy, or trust.
- The new `/pipeline-ops` direction is already covered by the existing `CF-W3-MDPIPE-01B1` through `CF-W3-MDPIPE-01B4` pipeline stack and the current Team 00 runtime guidance.
- Downstream DB-only performance concerns are already captured in the pipeline risk/register and `CF-W3-MDPIPE-01D` follow-on path; no fresh Team 02 candidate was discovered for that lane.

### Fresh Gap Audit Result - 2026-05-25

- No new direct investor/trader-value requirement outranks `CF-W2-TSC-04`, `CF-W2-TSC-05`, or `CF-W1-TSC-02`.
- The Today Review cleanup pair still addresses the active target/reward and ranking/eligibility language gap.
- The active-signal-health gap is still fully represented by `CF-W1-TSC-02`.
- Pipeline Ops monitoring and OPS detail remain a pipeline-lane track, not a new Team 02 requirement discovery.
- No item moves to Ready from Team 02.

### Queue Result

No priority change. The current top three remain:

1. `CF-W2-TSC-04`
2. `CF-W2-TSC-05`
3. `CF-W1-TSC-02`

### Team 00 Routing Recommendation

- Keep `CF-W2-TSC-04` and `CF-W2-TSC-05` as the next Team 03/04 Today Review cleanup send.
- Keep `CF-W1-TSC-02` behind them as the next active-candidate-health requirement draft.
- Keep pipeline-ops monitoring, command safety, and DB-only fanout in the pipeline lane; do not re-route them through Team 02 discovery.

## Team 02 Rolling PO Discovery - Pipeline Command API Accepted, B6 Active - 2026-05-25

Root `AGENTS.md` intake completed first. Workspace was clean at the start of this pass. Team 02 stayed docs-only and wrote only inside the reserved requirement files.

### Current PO Priority Applied

- Highest user value for investor/trader comes before admin/settings/notifications.
- Priority remains: market data trust, data quality trust, signal quality and backtesting trust, calibration trust, trusted candidate workflow, and Today Review.
- Team 05's `CF-W3-MDPIPE-01B4` pipeline command API work is accepted and locally committed, and `CF-W3-MDPIPE-01B6` is active Team 08 follow-up; both are intentionally excluded from Team 02 discovery.
- No Trade Plan-first framing, no R:R framing, and no arbitrary target-price framing.

### Fresh Gap Audit Result - 2026-05-25

I audited the current top three planning candidates plus the adjacent trust surfaces in `today-trade-review`, `signal-generation-engine`, `signal-quality-lab`, `signal-calibration-engine`, `backtesting-strategy-lab`, and `market-context-intelligence`.

Result:

- No genuinely new direct investor/trader-value requirement outranks `CF-W2-TSC-04`, `CF-W2-TSC-05`, or `CF-W1-TSC-02`.
- The Today Review source still contains the target/reward and reward/risk machinery that those two cleanup slices are meant to remove or reframe, so the current top two remain valid.
- The active-signal-health gap is already captured by `CF-W1-TSC-02`; no separate, higher-value health requirement emerged from this pass.
- Signal quality, calibration, backtesting, and market-context surfaces already expose explicit trust/evidence semantics, so no new draft should be created from this audit.
- No item moves to Ready from Team 02.

### Queue Refresh Result

Refreshed the direct investor/trader-value stack after excluding the active pipeline lane and already accepted items:

1. `CF-W2-TSC-04`
2. `CF-W2-TSC-05`
3. `CF-W1-TSC-02`
4. `CF-W1-DQ-02` residual parent
5. `CF-W1-MD-02A`
6. `CF-W1-SQLAB-02B`
7. `CF-W1-STRAT-02B`
8. `CF-W1-L3-DQ-01A`
9. `CF-W1-UX-02`
10. `CF-W1-UX-05`

Fresh planning candidates inside that stack:

- `CF-W2-TSC-04`
- `CF-W2-TSC-05`
- `CF-W1-TSC-02`

Blocked by schema, storage, route, or shared-UI decisions:

- `CF-W1-DQ-02` residual parent - blocked by the residual read-side/public-contract split.
- `CF-W1-MD-02A` - blocked by schema/storage consent.
- `CF-W1-SQLAB-02B` - blocked by storage consent.
- `CF-W1-STRAT-02B` - blocked by schema/generated/repository consent.
- `CF-W1-L3-DQ-01A` - contract-only until a bounded child avoids active Lane 3 work or shared UI rules.
- `CF-W1-UX-02` - downstream trust UX, not a current front-runner.
- `CF-W1-UX-05` - downstream copy cleanup, not a current front-runner.

### Requirement Refinement Result

Refined the queue to keep the accepted and committed slices out of the front:

- `CF-W1-BT-04` is no longer a fresh backtesting candidate.
- `CF-W1-TSC-03A-TREV-SUPPORTING-EVIDENCE` is no longer a fresh Today Review pull.
- `CF-W2-BT-05` is no longer a fresh backtesting pull.
- `CF-W1-MD-05` is no longer a fresh market-data pull.

### Queue Re-Sort Result

Active items excluded from fresh discovery:

- `CF-W1-TSC-01A-SIG` is active with Team 06.
- `CF-W1-DQ-03` is active with Team 05.
- `CF-W3-MDPIPE-01B4` is accepted and locally committed.
- `CF-W3-MDPIPE-01B6` is active with Team 08.

Next unassigned queue after active pulls:

1. `CF-W2-TSC-04`
2. `CF-W2-TSC-05`
3. `CF-W1-TSC-02`
4. `CF-W1-DQ-02` residual parent
5. `CF-W1-MD-02A`
6. `CF-W1-SQLAB-02B`
7. `CF-W1-STRAT-02B`
8. `CF-W1-L3-DQ-01A`
9. `CF-W1-UX-02`
10. `CF-W1-UX-05`

### Team 00 / Team 03 Handoff Recommendation

Recommended next Team 00 routing:

1. Send `CF-W2-TSC-04` to Team 03/04 as the next bounded Today Review cleanup slice.
2. Queue `CF-W2-TSC-05` immediately behind it as the ranking/eligibility reframe slice.
3. Keep `CF-W1-TSC-02` next as the active candidate-health gap once Today Review cleanup sequencing clears.
4. Keep `CF-W1-DQ-02` as the next residual upstream review only after Team 03 confirms there is a bounded no-schema child to write.

Reason:

- `TSC-04` and `TSC-05` are the next direct Today Review trust fixes after the accepted supporting-evidence work.
- `TSC-02` is the next direct active-signal-health gap once Today Review cleanup is out of the way.
- `DQ-02` still matters, but only after the residual split question is resolved.
- `CF-W3-MDPIPE-01B4` is accepted and `CF-W3-MDPIPE-01B6` is active; neither should re-enter Team 02 queueing.
- This pass found no new requirement that should be inserted ahead of the current top three.

### Files Changed In This Pass

- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/next-top-10-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/top-10-ready-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/refinement-queue.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-02-requirement-factory.md`

### Ready Result

No item was moved to Ready by Team 02.

## Team 02 Rolling Queue Refresh - 2026-05-24

Root `AGENTS.md` intake completed first. Workspace was clean at the start of this pass. Team 02 stayed docs-only and wrote only inside the reserved requirement files.

### Current PO Priority Applied

- Highest user value for investor/trader comes before admin/settings/notifications.
- Priority remains: market data trust, Data Quality trust, signal quality and backtesting trust, calibration, trusted candidate workflow, and active signal health.
- Today Review remains the primary daily workflow.
- No Trade Plan-first framing, no R:R framing, and no arbitrary target-price framing.

### Requirement Refinement Result

Refined and tightened:

- `CF-W1-BT-04-backtesting-run-freshness-and-current-proof-labels-requirement.md`
- `CF-W1-TSC-02-active-signal-health-rule-evidence-requirement.md`

Result:

- `CF-W1-TSC-02` is now requirement-ready for Team 03 architecture prep.
- `CF-W1-BT-04` is now requirement-ready for Team 03 architecture prep.
- Neither item is Ready for implementation.
- No item was moved to `12-ready-queue/ready-for-implementation.md`.

### Queue Re-Sort Result

Active items excluded from fresh discovery:

- `CF-W1-TSC-01A-TREV` is already active with Team 07 / Team 04.
- `CF-W1-DQ-03` is already active with Team 05.
- `CF-W1-TSC-01A-SIG` is already accepted upstream.

Next unassigned queue after active pulls:

1. `CF-W1-TSC-02`
2. `CF-W1-BT-04`
3. `CF-W1-DQ-02` residual parent
4. `CF-W1-MD-02A`
5. `CF-W1-SQLAB-02B`
6. `CF-W1-STRAT-02B`
7. `CF-W1-L3-DQ-01A`
8. `CF-W1-UX-02`
9. `CF-W1-UX-05`
10. `CF-W1-TSC-01` parent residual

### Team 00 / Team 03 Handoff Recommendation

Recommended next Team 00 routing:

1. Send `CF-W1-TSC-02` to Team 03 for bounded architecture prep now, using the active `TSC-01A-TREV` direction but without touching Team 07 files.
2. Queue `CF-W1-BT-04` immediately behind it as the next Team 03 architecture-prep packet, or run it in parallel only if Team 03 can keep file ownership isolated.
3. Keep `CF-W1-DQ-02` as the next residual upstream review only after Team 03 confirms there is a bounded no-schema child to write.

Reason:

- `TSC-02` is the next direct-value extension of the primary Today Review workflow.
- `BT-04` is the next direct backtesting trust slice with clear user value and bounded additive scope.
- `DQ-02` still matters, but only after the residual split question is resolved.

### Files Changed In This Pass

- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-BT-04-backtesting-run-freshness-and-current-proof-labels-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-TSC-02-active-signal-health-rule-evidence-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/next-top-10-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/top-10-ready-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-02-requirement-factory.md`

### Ready Result

No item was moved to Ready by Team 02.

## Team 02 Rolling PO Discovery - Active Pull Exclusion - 2026-05-24

Root `AGENTS.md` intake completed for this pass. Product direction remains direct investor/trader value first: market data, Data Quality, source-proven signal evidence, rule-based health, backtesting/calibration trust, and research explainability. Admin, settings, auth, subscription, notifications, and alert convenience stay low priority unless they block correctness, privacy, or trust.

### Active Pulls Excluded From Fresh Discovery

- `CF-W1-TSC-01A-SIG` is active with Team 06.
- `CF-W1-DQ-03` is active with Team 05.

Team 02 did not move any item to Ready and did not edit application code.

### Next Unassigned Candidates

| Rank | ID | Product value | Dependency / next gate |
| --- | --- | --- | --- |
| 1 | `CF-W1-TSC-01A-TREV` | Today Review should consume the Team 06 trigger-evidence bridge and show trusted candidate grouping, counts, reasons, and conservative health without Trade Plan/R:R framing. | Wait for Team 06 acceptance, then Team 00/03/04 confirm Team 07 reservations. |
| 2 | `CF-W1-BT-04` | Saved backtests need current-proof labels so old simulations do not read like fresh proof. | Team 04 QA planning and Team 00 Ready evaluation later; keep additive and no-schema. |
| 3 | `CF-W1-TSC-02` | Active Trusted Signal Candidates need rule-based health tracking until exit, invalidation, expiry, or blockage. | New requirement draft; Team 03 refinement after active TSC/DQ gates settle. |
| 4 | `CF-W1-DQ-02` residual parent | Currentness parent still may need a bounded no-schema public/read-side follow-up after accepted `DQ-02A`. | Team 03 should split `DQ-02B` or keep parent blocked. |
| 5 | `CF-W1-L3-DQ-01A` | Lane 3 passive readiness display semantics still need stable contract language. | Contract refresh only unless Team 03/04 define a bounded child. |
| 6 | `CF-W1-MD-02A` | Durable market-data evidence storage has high value but needs schema/generated/repository consent. | Proposal-only until Team 00 opens a consent packet. |
| 7 | `CF-W1-SQLAB-02B` | Durable Signal Quality learning memory would preserve post-event research evidence. | Proposal-only until storage/schema consent opens. |
| 8 | `CF-W1-STRAT-02B` | Durable strategy revision history would preserve exact rule/version provenance. | Proposal-only until schema/generated/repository consent opens. |
| 9 | `CF-W1-UX-02` | Copilot trust UX remains useful after core data/signal trust paths are stronger. | Keep Copilot-only and behind direct market/signal/backtest value. |
| 10 | `CF-W1-UX-05` | Copilot-only product-language cleanup can reduce advice-like wording. | Fold into or follow `CF-W1-UX-02`; no shared UI reservation. |

### New Requirement Created

- `10-requirements/CF-W1-TSC-02-active-signal-health-rule-evidence-requirement.md`

Reason: the Product Owner explicitly wants ongoing signal health tracking after a source-proven entry trigger. `CF-W1-TSC-01A` should stay focused on Today Review adoption; `CF-W1-TSC-02` captures the next rule-evidence health gap without widening the active implementation.

### Files Changed In This Pass

- `10-requirements/CF-W1-TSC-02-active-signal-health-rule-evidence-requirement.md`
- `10-requirements/next-top-10-candidates.md`
- `10-requirements/top-10-ready-candidates.md`
- `10-requirements/refinement-queue.md`
- `10-requirements/requirements-backlog.md`
- `17-team-outboxes/TEAM-02-requirement-factory.md`

### Ready Result

No item was moved to Ready by Team 02.

## Team 02 Rolling PO Requirement Report - TSC-01A - 2026-05-24

Root `AGENTS.md` intake completed. Product direction remains: direct investor/trader value first, no Trade Plan-first framing, no R:R, no arbitrary targets, no direct financial advice, and `/today-review` is the preferred daily signal-review cockpit.

### Result For Team 00

`CF-W1-TSC-01` can be reframed into a first bounded child now that `CF-W1-SIG-TRIGGER-ENTRY-01` is accepted and locally committed as `649e645 feat: add signal trigger entry price evidence`.

Team 02 created:

`CF-W1-TSC-01A - Today Review Trusted Signal Candidate Adoption`

Status: requirement drafted; ready for Team 03 architecture/file-reservation prep and Team 04 QA planning; not Ready for implementation.

### Proposed Child Acceptance Criteria

- `/today-review` remains the primary workflow surface.
- Today Review exposes counts for `Highly Trusted`, `Trusted but Needs Review`, `Watch Only`, and `Blocked`.
- `Highly Trusted` requires trusted Data Quality plus `trigger_price_evidence.status === SOURCE_PROVEN`.
- Entry price must be the source-proven rule trigger price, not an entry zone, reference price, target, R:R-derived value, or Trade Plan field.
- Strategy/rule/version, trigger timestamp, and reason summary are shown only where source-proven.
- Missing trigger evidence, blocked DQ, unsupported scope, or stale hard blockers downgrade or block the candidate with visible reasons.
- Exit and invalidation labels require documented rule evidence; otherwise show missing or unsupported evidence.
- Today Review table filtering, sorting, pagination, and non-wrapping row behavior must not regress.
- No surface may show R:R, arbitrary targets, synthetic profit targets, direct buy/sell wording, or Trade Plan-first labels.

### Product-Language Constraints

Use: trusted candidate, entry trigger, trigger price, reason summary, evidence, trust state, health state, blocked, needs review, watch only, data quality missing, manual review required, exit rule, invalidation rule.

Avoid: buy, sell, must act, guaranteed, profit target, price target, R:R, recommendation quality, advice-like wording, and Trade Plan as the primary label.

### Updated Top 10 By Investor/Trader Value

1. `CF-W1-TSC-01A` - Today Review Trusted Signal Candidate adoption.
2. `CF-W1-DQ-03` - Data Quality residual reason summary for downstream trust consumers.
3. `CF-W1-BT-04` - Backtesting saved-run freshness/current-proof labels.
4. `CF-W1-DQ-02` residual parent - no-schema read-side/public-contract follow-up if Team 03 can split one.
5. `CF-W1-L3-DQ-01A` - passive Lane 3 readiness DTO contract refresh.
6. `CF-W1-MD-02A` - market-data companion evidence storage proposal, consent-gated.
7. `CF-W1-SQLAB-02B` - durable Signal Quality learning memory proposal, consent-gated.
8. `CF-W1-STRAT-02B` - durable strategy revision history proposal, consent-gated.
9. `CF-W1-UX-02` - Copilot-only trust UX.
10. `CF-W1-UX-05` - Copilot-only product-language cleanup after UX-02.

Admin, settings, notifications, subscription expansion, and alert convenience remain low priority unless they become correctness, privacy, or evidence-quality blockers.

### Files Changed In This Pass

- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-TSC-01A-today-review-trusted-signal-candidate-adoption-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-TSC-01-trusted-signal-candidate-workflow-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-SIG-TRIGGER-ENTRY-01-rule-trigger-entry-price-evidence-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-TSC-01-trusted-signal-candidate-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-TSC-01-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/next-top-10-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/top-10-ready-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/refinement-queue.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/requirements-backlog.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-02-requirement-factory.md`

No item was moved to Ready by Team 02.

## Team 02 Product Direction Reframe - Trusted Signal Candidates - 2026-05-24

Product Owner redirected signal workflow priority away from Trade Plan, R:R, arbitrary targets, synthetic targets, and target-price framing.

Files changed by Team 00 on behalf of the requirement lane:

- `10-requirements/CF-W1-TSC-01-trusted-signal-candidate-workflow-requirement.md`
- `10-requirements/CF-W1-TP-03-trade-plan-proof-snapshot-freshness-labels-for-generated-plans-requirement.md`
- `10-requirements/top-10-ready-candidates.md`
- `10-requirements/next-top-10-candidates.md`
- `10-requirements/refinement-queue.md`
- `10-requirements/requirements-backlog.md`

Requirement changes:

- Added `CF-W1-TSC-01` as the new top product-direction requirement.
- Anchored the first slice on `/today-review`.
- Defined candidate groups: `Highly Trusted`, `Trusted but Needs Review`, `Watch Only`, and `Blocked`.
- Defined health states: `Active`, `Healthy`, `Weakening`, `Risk Warning`, `Exit Triggered`, `Invalidated`, `Expired`, and `Blocked`.
- Marked `CF-W1-TP-03` paused/stale as framed. Do not execute Trade Plan proof-snapshot freshness work unless it is reframed into Trusted Signal Candidate health with no R:R, arbitrary targets, synthetic targets, or Trade Plan-first UX.

Next recommended Ready-promotion candidate:

- `CF-W1-TSC-01A` after Team 00 source inspection, exact file reservations, and sequencing against accepted `CF-W1-L3-TREV-02` branch commit `f1de1d5`.

---

Date: 2026-05-20

Status: Requirement refinement pass completed for the Team 01 follow-up audit and the backtesting proof-basis refresh. Root `AGENTS.md` was read first and used as the governing product constitution. This remains a docs-only routing view. Team 00 still owns Ready movement, exact file reservations, and one-writer sequencing.

## Current Pass

Team 02 processed the Team 01 direct-value audit handoff for:

1. `CF-W1-TP-03 - Trade Plan proof snapshot freshness labels for generated plans`
2. `CF-W1-BT-04 - Backtesting run freshness and current-proof labels`

Result:

- Both candidates were drafted as refinement-only requirement docs.
- Neither candidate duplicates an already active, accepted, committed, parked, or promoted requirement.
- Neither candidate was moved to Ready.
- The current top five remain unchanged: `HCTX-03`, `DQ-03`, `MCTX-02`, `STRAT-04`, `SQLAB-03`.
- `MCTX-02` was left untouched because it is already active with Team 05.

Queue impact:

- `CF-W1-TP-03` is now the first refinement item behind the current top five.
- `CF-W1-BT-04` is now the second refinement item behind the current top five.
- Both stay ahead of lower-value admin/settings/notification convenience work.
- The prior residual/contract-only stack shifts down but remains intact.

Consent-gate callouts:

- `CF-W1-TP-03` must stop and split if it expands into schema/migration, route registry, shared UI, packages, generated files, provider/live-data behavior, startup/backfill, paid/cloud, broker, or product-policy reinterpretation.
- `CF-W1-BT-04` must stop and split if it expands into the same consent-gated classes or into walk-forward/holdout/parameter-sensitivity implementation.

Product Owner action:

- No immediate Product Owner decision is required for the draft requirement records.
- Product Owner approval is required later if either item leaves additive module-local scope.

## 2026-05-20 Additional Audit: Backtesting Proof-Basis Refresh

Team 02 also reviewed the latest backtesting trust evidence after the Team 01 follow-up draft pass.

Result:

- `audit-backtesting-proof-basis-2026-05-20.md` confirms `CF-W1-BT-03` remains parked and should not re-enter fresh discovery.
- That audit reinforces `CF-W1-BT-04` as the fresh backtesting follow-on because the queue still needs a compact current-proof label on saved runs.
- No new backtesting requirement ID was created in this pass.
- The current top five remain unchanged.

## 2026-05-20 Additional Audit: Stock Research Workbench Scope Behavior

Team 02 audited one under-served direct market-intelligence workflow behind the current top five: Stock Research Workbench scope behavior for `/research/stocks/:id`.

Evidence recorded in:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/audit-stock-research-workbench-scope-behavior-2026-05-20.md`

Result:

- The workflow still has a real scope-proof gap.
- No new bounded requirement should be created in this pass.
- The gap is already covered by the open parent `CF-W1-UX-01`, which already records that the frontend sends only `range`, not `region` or `assetType`, and that scope changes/refetch expectations still need explicit semantics.
- Creating a new `UX-03`-style requirement now would duplicate existing Workbench trust-surface scope instead of producing a genuinely new queue item.

Queue impact:

- No change to the current top five.
- No new requirement ID.
- No item moved to Ready.
- No active, accepted, parked, or consent-gated item was re-ranked as a fresh pull.

Priority decision:

- Keep `CF-W1-UX-01` as the owning parent for any future Workbench scope-proof follow-on.
- Keep that parent behind the current direct-value top five and behind the current active implementation/review gates.

## Work Item

Refresh the next requirement queue after excluding accepted, committed, parked, promoted, or already-active items so later discovery keeps stale branches out of fresh-pull recommendations.

The current top-five requirement front remains:

1. `CF-W1-HCTX-03 - Historical Context nearest-snapshot age and provenance warnings`
2. `CF-W1-DQ-03 - Data Quality residual reason summary for downstream trust consumers`
3. `CF-W1-MCTX-02 - Market Context freshness basis labels for persisted vs generated summaries`
4. `CF-W1-STRAT-04 - Strategy evidence freshness and stale-summary labels`
5. `CF-W1-SQLAB-03 - Signal Quality review-loop actionability for noisy and limited outcomes`

Follow-up audit result for what now sits immediately behind those five:

- No fresh evidence outranks the current top five.
- `CF-W1-TP-03` and `CF-W1-BT-04` are the next legitimate direct-value drafts behind that top five.
- No new Today Review requirement should be drafted while `CF-W1-L3-TREV-02` is active.
- No new Research Hub requirement ID should be drafted from the latest explainability audit because that audit maps to existing `CF-W1-RH-03` coverage.
- The residual / contract-only / consent-gated stack now starts after `TP-03` and `BT-04`.

## Exclusions Applied

Do not treat these as fresh pulls:

- `CF-W1-BT-03` `8f984b1`
- `CF-W1-CAL-01A` `308cee3`
- `CF-W1-TP-01A` `309a853`
- `CF-W1-DQ-02A` `c2d6753`
- `CF-W1-SQLAB-01` `1a41d95`
- `CF-W1-SQLAB-02A` active Team 06
- `CF-W1-RH-03`
- `CF-W1-RH-02A`
- `CF-W1-L3-TREV-02`
- `CF-W1-L3-INTEL-03`
- `CF-W1-L3-DQ-01B`
- `CF-W1-L3-INTEL-02`
- `CF-W1-L3-AUTH-03`
- `CF-W1-MD-04`
- `CF-W1-HCTX-02`
- `CF-W1-MD-03`
- `CF-W1-MCTX-01`
- `CF-W1-TP-02`
- `CF-W1-SIG-02`
- `CF-W1-STRAT-03`
- `CF-W1-L3-WATCH-01`
- `CF-W1-BT-02`
- `CF-W1-CAL-01`
- `CF-W1-RH-01`

Also keep out any other parked branches already listed in the ready queue or current active gate path.

## Refreshed Top 10

| Rank | ID | State | Why it stays here |
| --- | --- | --- | --- |
| 1 | `CF-W1-HCTX-03` | Draft | Historical context needs age and provenance warnings so nearest snapshots do not read like same-day evidence. |
| 2 | `CF-W1-DQ-03` | Draft | Downstream trust consumers need a compact residual reason summary instead of raw DQ arrays. |
| 3 | `CF-W1-MCTX-02` | Draft | Market Context needs an explicit persisted-versus-generated freshness basis label. |
| 4 | `CF-W1-STRAT-04` | Draft | Strategy evidence needs freshness and stale-summary labels so compact summaries do not overclaim recency. |
| 5 | `CF-W1-SQLAB-03` | Draft | Signal Quality Lab needs review-loop actionability for noisy and limited outcomes. |
| 6 | `CF-W1-TP-03` | Draft | Trade Plan proof snapshots need explicit current/stale labels so generated plans do not overclaim recency. |
| 7 | `CF-W1-BT-04` | Draft | Backtesting saved runs need explicit freshness/current-proof labels so older simulations do not read like latest proof. |
| 8 | `CF-W1-DQ-02` residual parent | Split-required market-data / DQ trust gap | Currentness evidence still needs a bounded follow-up after `DQ-02A`; this remains the next residual trust parent. |
| 9 | `CF-W1-L3-DQ-01A` | Contract-only | Lane 3 passive readiness DTOs still matter, but not as the next fresh implementation pull. |
| 10 | `CF-W1-MD-02A` | Proposal-only | Market-data evidence storage remains gated behind schema/generated/repository consent. |

## Behind-The-Top-Five Follow-Up

| Rank | ID | Discovery result | Why it stays here |
| --- | --- | --- | --- |
| 6 | `CF-W1-TP-03` | New refinement-only requirement. | Direct Trade Plan proof-currentness labeling is a better immediate trust slice than residual admin or storage proposals. |
| 7 | `CF-W1-BT-04` | New refinement-only requirement. | Direct Backtesting run current-proof labeling stays ahead of residual admin or storage proposals. |
| 8 | `CF-W1-DQ-02` residual parent | Existing residual item stays valid. | `DQ-02A` solved the first child, but a read-side/public-contract follow-up may still exist if Team 03 can keep it no-schema and additive. |
| 9 | `CF-W1-L3-DQ-01A` | Existing contract-only item stays valid. | Lane 3 still lacks a stable passive readiness DTO story, but it is not ahead of the current top five plus the two new trust drafts. |
| 10 | `CF-W1-MD-02A` | Existing consent-gated proposal stays valid. | Durable market-data provenance still matters, but it needs schema/generated/repository consent before it becomes an implementation candidate. |

## No-New-ID Findings

- Research Hub explainability follow-up from `11-module-audits/audit-research-hub-explainability-2026-05-20.md` is already covered by drafted `CF-W1-RH-03`; Team 02 should not create a duplicate `RH` child right now.
- Today Review does not show a fresh unclaimed requirement beyond active `CF-W1-L3-TREV-02`.
- No new direct investor/trader-value gap beats the current ordering of `HCTX-03`, `DQ-03`, `MCTX-02`, `STRAT-04`, and `SQLAB-03`.
- `TP-03` and `BT-04` are fresh direct-value drafts, but they belong behind that top five.

## Top 3 Unassigned

| Rank | ID | Dependency / consent gate | Parallel-safe? | Product Owner action required? |
| --- | --- | --- | --- | --- |
| 1 | `CF-W1-HCTX-03` | Depends on historical-context lookup outputs only; keep the first child backend-local and additive. | Yes, at docs-only discovery level; keep implementation reservations separate if it later splits. | No new PO decision for discovery; yes if the follow-up widens into schema, route, or shared UI work. |
| 2 | `CF-W1-DQ-03` | Depends on current DQ residual outputs only; it should summarize existing fields rather than duplicate scoring. | Yes, at docs-only discovery level; keep implementation reservations separate if it later splits. | No new PO decision for discovery; yes if the follow-up widens into schema, route, or shared UI work. |
| 3 | `CF-W1-MCTX-02` | Depends on current Market Context summary outputs; it should remain additive to persisted-versus-generated labeling. | Yes, alongside `CF-W1-HCTX-03` and `CF-W1-DQ-03` if file reservations stay isolated. | No new PO decision for discovery; yes if the follow-up widens into schema, route, or shared UI work. |

## Secondary Notes

- `CF-W1-STRAT-04` and `CF-W1-SQLAB-03` remain useful follow-ons for strategy and review-loop trust, but they stay behind the three direct contract slices because they need a little more downstream shaping.
- `CF-W1-MD-02` remains the next upstream provenance parent after the freshness gate, but it stays behind the new fresh slices because it needs explicit storage/evidence consent before app-code work.
- `CF-W1-SIG-TRIGGER-01` stays high because signal/trigger explainability is still incomplete, but it needs broader contract prep than the read-path trust slices.
- `CF-W1-DQ-02`, `CF-W1-L3-DQ-01A`, `CF-W1-MD-02A`, `CF-W1-SQLAB-02B`, and `CF-W1-STRAT-02B` remain the correct stack behind the current top five.
- Research Hub and Today Review do not produce a fresh new Team 02 requirement in this pass; their remaining useful work is already represented by existing drafted or active items.

## Team 00 Handoff

Team 00 should keep `CF-W1-HCTX-03`, `CF-W1-DQ-03`, and `CF-W1-MCTX-02` as the next genuinely unassigned direct-value sends. `CF-W1-STRAT-04` and `CF-W1-SQLAB-03` are the next follow-ons after those three. `CF-W1-MD-02` is the next upstream provenance parent, but it still needs consent before any source or schema path opens.

## Files Changed In This Pass

- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-TP-03-trade-plan-proof-snapshot-freshness-labels-for-generated-plans-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-BT-04-backtesting-run-freshness-and-current-proof-labels-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/next-top-10-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/top-10-ready-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/refinement-queue.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/requirements-backlog.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-02-requirement-factory.md`

## Ready Result

No item is moved to Ready by this Team 02 refresh.
