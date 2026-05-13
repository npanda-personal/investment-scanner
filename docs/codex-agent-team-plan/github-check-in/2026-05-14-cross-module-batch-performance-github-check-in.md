# Cross-Module Batch Performance GitHub Check-In - 2026-05-14

## Requirement

Repair slow local-DB batch workflows reported for:

- `POST /api/v1/signals/run`
- `POST /api/v1/signals/calibration/run`
- `POST /api/v1/strategy/evaluate`

## Remote Evidence

- Branch: `dev`
- Remote: `origin`
- Primary commit SHA: `06e3dc6`
- Push status: pushed successfully to `origin/dev`
- CI status/link: not available in local evidence; backend test/build evidence was run before push.

## Files Committed

- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.repository.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.service.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.service.ts`
- `backend/src/modules/smart-money-intelligence/smart-money-intelligence.repository.ts`
- `backend/src/modules/smart-money-intelligence/smart-money-intelligence.service.ts`
- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.repository.ts`
- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.service.ts`
- `backend/tests/modules/market-data-foundation/market-data.universe.test.ts`
- `backend/tests/modules/signal-calibration-engine/signal-calibration-engine.service.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.service.test.ts`
- `backend/tests/modules/strategy-decision-engine/strategy-decision-engine.service.test.ts`
- `docs/codex-agent-team-plan/qa-evidence/2026-05-14-cross-module-batch-performance-qa-evidence.md`

## Scoped Staging Confirmation

- Only files tied to the accepted cross-module batch performance repair were staged.
- No `.env`, secrets, database dumps, generated artifacts, rejected work, or unrelated backlog items were staged.
- Documentation evidence was included with the implementation commit, and this check-in note records the pushed remote evidence.

## Rollback Notes

- Revert primary commit `06e3dc6` if the batch loaders or bulk strategy persistence cause incorrect results.
- After rollback, restart the backend service on port `3000` so `dist` and runtime behavior match the reverted branch.
- Re-run `npm.cmd test -- --runInBand` and `npm.cmd run build` from `backend`.
