# Daemon Resume Prompt

Date: 2026-05-25

Path: `docs/execution/codex-parallel-execution-plan-2026-05-16/09-summaries/daemon-resume-prompt.md`

This file exists and was updated after Team 00 implemented `CF-W3-MDPIPE-01B1-DURABLE-PIPELINE-LEDGER-FOUNDATION` for the Market Data pipeline redesign.

Latest checkpoint before resume:

- `CF-W3-MDPIPE-01A-MDF-OFFICIAL-EOD` committed on `dev` as `b0c1ab7`.
- `CF-W3-MDPIPE-01B1-DURABLE-PIPELINE-LEDGER-FOUNDATION` is implemented and developer-validated; scoped commit is the next checkpoint if not already present in git log.
- `01B1` validation passed: `npx.cmd prisma generate`, `npm.cmd test -- pipeline-orchestration --runInBand`, and `npm.cmd run build`.
- `01B1` intentionally did not wire route/status API, frontend progress cards, scheduler fanout, DQ execution, provider/live calls, or server startup/backfill changes.
- `CF-W3-MDPIPE-01B2` read-only pipeline status API is implemented and developer-validated if commit `feat: add read-only pipeline status api` appears in git log.
- Next sequence: `01B3` Ops-style Bulk Pipeline Dashboard plus compact per-screen progress indicators, then `01C` ledgered Data Quality scheduled stage.
- Progress visibility requirement: bulk operation progress must be durable and rehydratable after navigation using `PipelineStageRun` status/counts/offsets/lease fields.
- Updated UI direction: remove full bulk-op controls from respective feature pages over time; centralize monitoring/manual trigger controls in the Bulk Pipeline Dashboard. Feature pages show compact backend-pipeline progress only.

```text
You are Team 00 - Master Orchestrator / Integration.

Use root AGENTS.md as authoritative.
docs/AGENTS.md remains deleted/neutralized.
docs/codex-agent-team-plan/** is historical evidence only.

Use the active execution folder:
docs/execution/codex-parallel-execution-plan-2026-05-16/

Resume Continuous Daemon Scheduler Mode from cycle DAEMON-20260517, rolling iteration 24.

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
- Ready queue: no unassigned Ready implementation item is waiting.
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

Next autonomous actions:
1. Wait for Team 05 worker `019e5c1d-0933-77c3-9052-5fad8aa163bf`.
2. Verify changed files match the `CF-W3-MDPIPE-01A` reservation.
3. Run focused backend validation if resource-safe:
   - `cd backend`
   - `npm.cmd test -- market-data.service.test.ts market-data.repository.test.ts market-data.scheduler.test.ts --runInBand`
   - `npm.cmd run build`
4. Route Team 04 QA, Team 10 review, Team 03 signoff, delegated PO acceptance, and scoped commit if accepted.
5. If Team 05 hits forbidden scope, stop only this workstream and create/update a decision packet.
6. Do not wire downstream modules until a separate architecture/QA packet exists.
7. After Market Data hot path is accepted, resume rolling Team 02/03/04 requirements/architecture/QA prep with direct investor/trader-value priority.

Stop only for:
- true consent blockers,
- unsafe or unclassifiable git state,
- resource/runtime limit,
- all workstreams blocked,
- explicit Product Owner stop.

If a runtime/checkpoint boundary is reached, update this resume prompt, `09-summaries/daemon-cycle-latest.md`, Team 00 outbox, active board, and queue docs before returning.
```
