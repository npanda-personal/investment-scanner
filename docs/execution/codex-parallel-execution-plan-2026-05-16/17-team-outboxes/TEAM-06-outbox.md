# TEAM-06 Outbox

Date: 2026-05-18

Team: TEAM-06 - Strategy / Signal / Risk

State: Docs-only readiness inspection complete.

Current assignment: inspect whether `CF-W1-TP-01B` can become module-local implementation-ready without editing source/tests until Team 00 promotes it.

## Result

Ready-promotion recommendation: **Yes, promoteable by Team 00 as the next bounded Team 06 backend slice.**

Team 06 read-only inspection found that the prepared requirement, architecture review, contract, work packet, QA plan, and current Trade Plan source/test surface are aligned enough for a module-local implementation handoff.

`CF-W1-TP-01B` is still **not Ready for Team 06 to pull now** because the Ready queue remains closed for Team 06 and no new Team 06 implementation inbox exists yet.

## Files Inspected

Execution/control:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/00-control/team-agent-runtime-queue.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/12-ready-queue/ready-for-implementation.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/16-team-inboxes/TEAM-06-current-assignment.md`

Requirement/contract/QA packet:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-TP-01B-trade-plan-backend-dq-hard-block-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-TP-01B-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-TP-01B-backend-compatibility-dq-hard-block-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-TP-01B-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-TP-01B-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/13-implementation-evidence/CF-W1-TP-01B-team06-readiness-check.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/13-implementation-evidence/CF-W1-TP-01B-team06-readiness-inspection-2026-05-18.md`

Module/test surface:

- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.types.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.geometry.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.md`
- `backend/tests/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.test.ts`
- `backend/tests/trade-plan-risk-engine.paper-readiness.test.ts`
- `backend/package.json`

## Current Source/Test Evidence

Module-local gaps still match the prepared child packet:

- `classifyPaperReadiness()` still blocks when `plan.target` is missing.
- DQ proof used by `classifyPaperReadiness()` still omits `signalReadinessStatus`, `eligibleForSignals`, and required use-case tier evidence.
- `generatePlan()` still treats `signalReadinessStatus = NOT_READY` as warning/watch behavior rather than a hard paper-readiness block.
- `toDataQualitySnapshot()` already stores `signalReadinessStatus` and `eligibleForSignals`, so the first slice can stay Trade Plan-owned without Data Quality Engine source changes.
- Existing focused tests still assert target-shaped rationale such as `Target is modeled at 2R by default.`

Conclusion: the needed behavior change is still concentrated in the reserved Trade Plan backend files and focused Trade Plan tests. No repository, Prisma, route, frontend, or shared-file change is indicated by the current source.

## Exact Candidate File Reservations

Team 06 can implement safely **only after Team 00 promotion** inside this bounded write scope:

Allowed files:

- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.types.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.md`
- `backend/tests/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.test.ts`
- `backend/tests/trade-plan-risk-engine.paper-readiness.test.ts`

Optional only with explicit Architect note in the implementation handoff:

- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.geometry.ts`

Recommended position on optional geometry file:

- current source evidence does **not** show a mandatory geometry-file change for `CF-W1-TP-01B`;
- Team 00 should keep `trade-plan-risk-engine.geometry.ts` forbidden by default and only open it if Team 06 proves the DQ/no-target compatibility fix cannot remain service-local.

## Exact Forbidden Files / Boundaries

Forbidden for `CF-W1-TP-01B`:

- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.repository.ts`
- `backend/tests/modules/trade-plan-risk-engine/trade-plan-risk-engine.repository.test.ts`
- Prisma schema and migrations
- backend or frontend route registries
- Today Review backend/frontend files
- frontend Trade Plan files
- shared backend utilities
- shared frontend UI/components
- package manifests
- generated files/types
- provider, scheduler, startup/backfill, Angel One, broker, live-provider, paid/cloud, or telemetry flows
- any file outside the exact Team 00 Team 06 implementation inbox reservation

## Focused Validation Command

Verified backend test runner: `backend/package.json` uses `jest`.

Focused Team 06 command after implementation:

```powershell
cd backend
npm.cmd test -- trade-plan-risk-engine.service.test.ts trade-plan-risk-engine.paper-readiness.test.ts --runInBand
```

Recommended language scan after implementation:

```powershell
rg -n "price target|profit target|must buy|must sell|guaranteed|buy now|sell now" backend/src/modules/trade-plan-risk-engine backend/tests/modules/trade-plan-risk-engine backend/tests/trade-plan-risk-engine.paper-readiness.test.ts
```

## Remaining Blockers

No new Product Owner decision blocker was found.

Remaining blockers are execution-gate blockers only:

1. Team 00 has not promoted `CF-W1-TP-01B` into `12-ready-queue/ready-for-implementation.md`.
2. Team 00 has not issued a new Team 06 implementation inbox with the exact allowed/forbidden file list.
3. Team 06 implementation must use the dedicated branch/worktree named in the inbox:
   - branch: `codex/team06-strategy-signal/CF-W1-TP-01B`
   - worktree: `../investment-scanner-worktrees/team06-CF-W1-TP-01B`
4. Current shared `dev` workspace contains unrelated docs activity and should remain docs-only for Team 06.

## Can Team 06 Implement Immediately If Promoted?

**Yes.**

If Team 00 promotes `CF-W1-TP-01B` and issues the exact Team 06 implementation inbox with the reservation set above, Team 06 can start immediately in the dedicated worktree without needing any additional policy clarification.

## Structural Changes

- modules created: none
- files added: none outside this outbox refresh
- files moved: none
- files removed: none in application scope

## Code Changes

- imports updated: none
- APIs preserved/changed: none
- logic added/refactored: none
- contracts changed: none

## Validation

- builds run: none
- tests run: none
- UI checks run: none
- live local data checks run: none
- skipped checks and reasons: implementation is not promoted; this was a docs-only readiness inspection

## Risks / Assumptions

- Assumption: Team 00 will keep the slice backend-only and will not widen scope to repository/schema/frontend/shared files.
- Risk: if implementation discovers required use-case tier evidence is not available through current Trade Plan-owned snapshots, Team 06 must stop and return to Team 00/Team 03 rather than reaching into Data Quality Engine source.
- Risk: optional geometry-file edits could create avoidable shared-scope expansion inside the module; keep service-local unless proven necessary.

## Product Owner / Team 00 Review Needed

- Team 00 Ready promotion needed: yes
- new Team 06 implementation inbox needed: yes
- Product Owner decision needed: no
