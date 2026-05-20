# Team 08 Assignment - CF-W1-RH-01

Date: 2026-05-19

Owner: Team 08 - UX / Research / Copilot

State: Ready for implementation

## Work Item

`CF-W1-RH-01` - Research Hub backend actionability evidence wiring.

## Branch / Worktree

- Branch: `codex/team08-ux-research/CF-W1-RH-01`
- Worktree: `C:\work\repo\investment-scanner-worktrees\team08-CF-W1-RH-01`
- Base: current `dev` head at worktree creation

## Gate Evidence

- Requirement: `10-requirements/CF-W1-RH-01-research-hub-actionability-evidence-wiring-requirement.md`
- Architecture review: `03-architecture/CF-W1-RH-01-architecture-review.md`
- Contract: `06-contracts/CF-W1-RH-01-research-hub-actionability-evidence-wiring-contract.md`
- Work packet: `08-work-packets/CF-W1-RH-01-work-packet.md`
- QA plan: `04-qa/CF-W1-RH-01-qa-plan.md`

Open decisions: none.

## Allowed Files

- `backend/src/modules/research-hub/research-hub.service.ts`
- `backend/src/modules/research-hub/research-hub.md`
- `backend/tests/modules/research-hub/research-hub.service.test.ts`
- Optional only if module-local helper aliases are needed without expanding the response shape: `backend/src/modules/research-hub/research-hub.types.ts`

Allowed branch-local evidence docs:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-08-CF-W1-RH-01-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-RH-01-developer-handoff.md`

## Forbidden Files

- `backend/src/modules/research-hub/index.ts`
- `backend/src/modules/research-hub/research-hub.controller.ts`
- `backend/src/modules/research-hub/research-hub.router.ts`
- all `frontend/src/features/research-hub/**`
- all `frontend/tests/ui/**`
- backend/frontend route registries
- Today Review, Trade Plan, Signal Quality Lab, or Signal Calibration Engine source/test edits
- upstream repositories or private helpers
- shared backend utilities
- shared frontend components
- Prisma schema or migrations
- generated files
- package manifests
- providers/live data
- startup/backfill
- paid/cloud, broker, telemetry, external services
- `CF-W1-RH-02` `whatChanged` traceability scope

## Required Behavior

- Replace placeholder actionability dimensions for Today Review, Trade Plan, Signal Quality, and Calibration with public-output-derived status/count/evidence-date/message values.
- Keep the existing Research Hub response shape unchanged.
- Use only public service reads already available on `dev`.
- Keep Signal Quality and Calibration capped below `READY` on current `dev` semantics.
- Keep `canReviewActionableSetups` conservative and research-support only.
- Fail closed when public evidence is absent or lookup calls fail.
- Keep `whatChanged` untouched.

## Focused Validation

```powershell
cd backend
npm.cmd test -- research-hub.service.test.ts --runInBand
npm.cmd run build
```

Optional product-language scan:

```powershell
rg -n "buy now|sell now|must buy|must sell|price target|profit target|guaranteed|broker|order placement|live trading|automation" backend/src/modules/research-hub backend/tests/modules/research-hub
```

## Stop Conditions

Stop and return to Team 00 if implementation needs any forbidden file, upstream source edits, route/schema/shared/package/generated/provider scope, frontend work, private upstream internals, `canReviewActionableSetups=true` from insufficient current-`dev` proof, or `CF-W1-RH-02` widening.

## Next Gate

Team 04 QA verification after developer handoff.
