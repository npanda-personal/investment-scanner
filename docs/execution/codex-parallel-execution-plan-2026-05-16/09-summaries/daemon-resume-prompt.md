# Daemon Resume Prompt

Date: 2026-05-26

Path: `docs/execution/codex-parallel-execution-plan-2026-05-16/09-summaries/daemon-resume-prompt.md`

Latest live checkpoint:

- Branch: `dev`.
- Open decisions: 2, scoped only to `CF-W1-MD-02B` and `CF-W1-DQ-02-RS1`.
- Product Owner action required: yes only for those affected workstreams; no for active SPL/RH routine gates.
- `CF-W2-DOV-01` refreshed Daily Overview dashboard is accepted through QA rerun, Code Review rerun, Architect Signoff, delegated PO acceptance, staged-scope verification, and locally committed on the Team 08 branch as `a371e2f feat: add daily overview dashboard`.
- `CF-W2-DOV-01` branch/worktree: `codex/team08-ux-research/CF-W2-DOV-01`, `C:\work\repo\investment-scanner-worktrees\team08-CF-W2-DOV-01`.
- `CF-W2-DOV-01` current gate: accepted and parked for later integration sequencing.
- `CF-W2-SPL-01B` is accepted as a backend-only active-row read-model foundation.
- `CF-W2-SPL-01B` branch/worktree: `codex/team06-strategy-signal/CF-W2-SPL-01B`, `C:\work\repo\investment-scanner-worktrees\team06-CF-W2-SPL-01B`.
- `CF-W2-SPL-01B` current gate: accepted through QA rerun, Code Review rerun, Architect Signoff, delegated PO acceptance, and locally committed on the Team 06 branch as `ca31d79 feat: add signal position ledger read model`.
- `CF-W2-SPL-02` is promoted as the next Signal Position Ledger user-facing surface.
- `CF-W2-SPL-02` branch/worktree: `codex/team06-strategy-signal/CF-W2-SPL-02`, `C:\work\repo\investment-scanner-worktrees\team06-CF-W2-SPL-02`.
- `CF-W2-SPL-02` required base: keep `ca31d79` as an ancestor and include current `dev` active execution docs before implementation starts.
- `CF-W2-SPL-02` Team 00 shared-file reservation: `backend/src/api/routes.ts`, `frontend/src/app/routes.tsx`, and `frontend/src/app/navigationMetadata.tsx`.
- `CF-W2-SPL-02` allowed scope: accepted SPL service/doc/tests, backend route mount, feature-local `frontend/src/features/signal-position-ledger/**`, frontend route/nav files, and `frontend/tests/ui/signal-position-ledger.spec.ts`.
- `CF-W2-SPL-02` forbidden scope: closed-history API/data, schema/migrations/generated/package/shared UI, `HomePage`, Today Review, Trade Plan, Portfolio, Backtesting, Market Data, DQ, providers/live/startup/scheduler, targets, reward/risk, broker/execution, and advice language.
- `CF-W2-SPL-02` current gate: Ready for Team 06 implementation. After handoff, route to Team 04 QA Verification.
- `CF-W1-RH-01A` is accepted and locally committed on the Team 08 branch as `30460aa feat: add research hub evidence dates`.
- `CF-W1-RH-01A` branch/worktree: `codex/team08-research/CF-W1-RH-01A`, `C:\work\repo\investment-scanner-worktrees\team08-CF-W1-RH-01A`.
- `CF-W1-RH-01A` allowed scope: `backend/src/modules/research-hub/research-hub.service.ts`, `backend/src/modules/research-hub/research-hub.md`, `backend/tests/modules/research-hub/research-hub.service.test.ts`, `frontend/src/features/research-hub/components/ResearchOverviewPage.tsx`, and `frontend/tests/ui/research-hub.spec.ts`.
- `CF-W1-RH-01A` current gate: parked as accepted local branch commit until integration sequencing is opened.
- `CF-W1-MD-02A` current gate: proposal-only; Team 03 opened `DECISION-20260526-md-02b-schema-generated-consent`; no Prisma/schema/generated/source implementation may start until resolved.
- Team 02 requirement lane refined `CF-W1-RH-01A` and updated priority queues; DOV/SPL are routed work, not fresh discovery.
- Active implementation agents at checkpoint:
  - none recorded in this file before SPL-02 worker launch.
- Next gates:
  1. create/update the SPL-02 worktree;
  2. spawn Team 06 SPL-02 implementation;
  3. route Team 04 SPL-02 QA Verification after Team 06 handoff;
  4. route Team 10 Code Review and Team 03 Architect Signoff after QA acceptance;
  5. keep RH parked as accepted branch commit `30460aa` until integration sequencing is opened;
  6. keep Team 02 rolling on the next direct investor/trader-value requirement when a slot is free.

This file exists and was updated after Team 00 accepted `CF-W3-MDPIPE-01B4-PIPELINE-COMMAND-API` for the Market Data pipeline redesign.

Latest checkpoint before resume:

- `CF-W3-MDPIPE-01A-MDF-OFFICIAL-EOD` committed on `dev` as `b0c1ab7`.
- `CF-W3-MDPIPE-01B1-DURABLE-PIPELINE-LEDGER-FOUNDATION` is implemented and developer-validated; scoped commit is the next checkpoint if not already present in git log.
- `01B1` validation passed: `npx.cmd prisma generate`, `npm.cmd test -- pipeline-orchestration --runInBand`, and `npm.cmd run build`.
- `01B1` intentionally did not wire route/status API, frontend progress cards, scheduler fanout, DQ execution, provider/live calls, or server startup/backfill changes.
- `CF-W3-MDPIPE-01B2` read-only pipeline status API is implemented and developer-validated if commit `feat: add read-only pipeline status api` appears in git log.
- `CF-W3-MDPIPE-01B3-S1` Bulk Pipeline Monitoring and Ops dashboard is implemented and developer-validated if commit `feat: add pipeline ops dashboard` appears in git log.
- `CF-W3-MDPIPE-01B4` Pipeline Command API is accepted through QA, Code Review, Architect Signoff, delegated PO acceptance, and committed on `dev` as `8d45ddc feat: add pipeline command api`.
- Next sequence: `01B6` compact per-screen progress indicators, `01B5` page-local bulk-control migration, then `01C` ledgered Data Quality scheduled stage.
- Progress visibility requirement: bulk operation progress must be durable and rehydratable after navigation using `PipelineStageRun` status/counts/offsets/lease fields.
- Updated UI direction: create the new page as a Bulk Pipeline Dashboard for Monitoring and OPS; remove full bulk-op controls from respective feature pages over time; centralize monitoring/manual trigger controls in the Bulk Pipeline Dashboard. Feature pages show compact backend-pipeline progress only.

```text
You are Team 00 - Master Orchestrator / Integration.

Use root AGENTS.md as authoritative.
docs/AGENTS.md remains deleted/neutralized.
docs/codex-agent-team-plan/** is historical evidence only.

Use the active execution folder:
docs/execution/codex-parallel-execution-plan-2026-05-16/

Resume Continuous Daemon Scheduler Mode from cycle DAEMON-20260517, rolling iteration 26.

Current goal:
Fix Market Data load performance first by implementing the first bounded slice of the incremental automated data pipeline. After accepted completion, resume the Trusted Signal Candidate and rolling requirements factory work.

Product direction:
- Backend automated freshness should become the source of truth; manual buttons are ad hoc requests only.
- `IN/STOCK` latest EOD should use official exchange bulk files where supported before per-symbol provider calls.
- Angel One must not be the broad-universe primary loader.
- Routine refresh must be incremental and must not run complete operations from scratch.
- Downstream stages must be wired in later bounded slices with DQ gating and resumable stage contracts.
- `/today-review` is the preferred first surface.
- No Trade Plan-first UX.
- No R:R.
- No arbitrary target prices.
- No synthetic profit targets.
- No direct buy/sell advice.
- Entry price means actual rule-triggered entry price.
- Exit/invalidation must come only from documented rules.
- Confidence means evidence-backed trust, not guaranteed outcome probability.

Evidence sync first:
- git status --short
- git branch --show-current
- git log --oneline -10

Read:
- 09-summaries/team-00-market-data-pipeline-redesign-checkpoint.md
- 09-summaries/daemon-cycle-latest.md
- 09-summaries/team-00-trusted-signal-candidate-goal-summary.md
- 00-control/active-work-board.md
- 00-control/risk-register.md
- 99-decision-inbox/open-decisions.md
- 12-ready-queue/ready-for-implementation.md
- 12-ready-queue/blocked-by-upstream-dependency.md
- 10-requirements/refinement-queue.md
- 10-requirements/next-top-10-candidates.md
- 10-requirements/CF-W3-MDPIPE-01-incremental-market-data-pipeline-requirement.md
- 03-architecture/CF-W3-MDPIPE-01-incremental-market-data-pipeline-architecture.md
- 04-qa/CF-W3-MDPIPE-01A-MDF-OFFICIAL-EOD-qa-plan.md
- 13-implementation-evidence/CF-W3-MDPIPE-01A-ready-promotion.md
- 10-requirements/CF-W1-TSC-01-trusted-signal-candidate-workflow-requirement.md
- 10-requirements/CF-W1-SIG-TRIGGER-ENTRY-01-rule-trigger-entry-price-evidence-requirement.md
- 03-architecture/CF-W1-TSC-01-architecture-review.md
- 04-qa/CF-W1-TSC-01-qa-plan.md
- 16-team-inboxes/
- 17-team-outboxes/
- 18-integration-queue/

Current status:
- Open decisions: none.
- Product Owner action required: no.
- Ready queue: no unassigned Ready implementation item is waiting until Team 00 promotes B6.
- `CF-W3-MDPIPE-01A-MDF-OFFICIAL-EOD` is accepted through Team 05 implementation/rework, Team 04 QA rerun, Team 10 re-review, Team 03 Architect re-signoff, Team 00 delegated PO acceptance, and scoped local implementation commit `b0c1ab7 feat: add official eod bulk market data sync`.
- Team 03 Architect and read-only explorer completed the pipeline redesign/audit and were closed.
- First slice scope is Market Data Foundation official NSE EOD bulk latest-candle ingestion only.
- The Team 10 cross-exchange rejection was resolved: BSE / `.BO` / non-NSE / ambiguous tasks skip official NSE matching and fall back to provider ingestion.
- Forbidden in the first slice: Prisma/schema, route registries, shared utilities/UI, package/generated, frontend, downstream modules, provider credentials, live provider execution, startup/backfill expansion, durable pipeline ledger.
- `CF-W1-STRAT-04` accepted and locally committed on its implementation branch as `8b3498e`.
- `CF-W1-SQLAB-03` accepted and locally committed on its implementation branch as `5db98f2`.
- `CF-W1-TP-03` is paused/stale as framed.
- `CF-W1-SIG-TRIGGER-ENTRY-01` accepted and locally committed on `dev` as `649e645`.
- `CF-W1-TSC-01A-SIG` accepted and locally committed on Team 06 branch as `40c00f1`.
- `CF-W1-DQ-03` accepted and locally committed on Team 05 branch as `26398aa`.
- `CF-W1-TSC-01A-TREV` accepted and locally committed on Team 07 branch as `9fbc989`.
- `CF-W1-BT-04` accepted and locally committed on Team 06 branch as `2bd794f`.
- `CF-W1-MD-05` is in rework in `C:\work\repo\investment-scanner-worktrees\team05-CF-W1-MD-05`. Required Playwright smoke rerun failed 5 of 10 tests after the earlier resource gap cleared; Team 05 completed bounded rework, but validation is waiting for memory below 90%.
- `CF-W1-TSC-02A-TREV-HEALTH` implementation is complete in `C:\work\repo\investment-scanner-worktrees\team07-CF-W1-TSC-02A-TREV-HEALTH`, but executable developer validation was skipped because memory stayed above 90%. It is not QA-ready yet.
- `CF-W1-TSC-03A-TREV-SUPPORTING-EVIDENCE` is the next legitimate no-schema Today Review candidate, but it is blocked until `TSC-02A` clears and the Today Review writer set is released.
- `CF-W1-TSC-03` architecture/contract/work-packet docs exist and record the sequencing block.
- `CF-W1-SQLAB-02B` architecture/contract/work-packet docs exist, but the item remains storage-consent-gated and not Ready.
- `CF-W1-DQ-02B` is blocked from implementation until Team 00 explicitly opens a DQE persisted read-side/public-contract packet.
- `CF-W3-MDPIPE-01B1` durable pipeline ledger is committed on `dev` as `e537f9e feat: add durable pipeline ledger foundation`.
- `CF-W3-MDPIPE-01B2` read-only pipeline status API is committed on `dev` as `10719fa feat: add read-only pipeline status api`.
- `CF-W3-MDPIPE-01B3-S1` Bulk Pipeline Dashboard is committed on `dev` as `cb45735 feat: add pipeline ops dashboard`.
- `CF-W3-MDPIPE-01B4` command API is accepted through Team 05 rework, Team 04 QA rerun, Team 10 Code Review, Team 03 Architect Signoff, Team 00 delegated PO acceptance, and scoped local commit `8d45ddc feat: add pipeline command api`.
- Bulk Pipeline Dashboard is the Monitoring and OPS surface for module name, op name, status, progress, and approved manual triggers. Feature pages should show compact progress only.

Next autonomous actions:
1. Promote `CF-W3-MDPIPE-01B6` compact Data Quality progress indicator to Team 08 if gates remain clean.
2. Queue Team 04 QA, Team 10 review, and Team 03 signoff for B6.
3. Start Team 03 architecture prep for `CF-W3-MDPIPE-01C` ledgered Data Quality scheduled stage when a slot is free.
4. Continue Team 02 rolling requirements discovery with direct investor/trader-value priority.

Stop only for:
- true consent blockers,
- unsafe or unclassifiable git state,
- resource/runtime limit,
- all workstreams blocked,
- explicit Product Owner stop.

If a runtime/checkpoint boundary is reached, update this resume prompt, `09-summaries/daemon-cycle-latest.md`, Team 00 outbox, active board, and queue docs before returning.
```
