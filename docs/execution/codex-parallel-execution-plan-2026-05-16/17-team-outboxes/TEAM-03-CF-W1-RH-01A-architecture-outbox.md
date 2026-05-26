# TEAM-03 CF-W1-RH-01A Architecture Outbox

Date: 2026-05-26

Team: Team 03 Architecture Factory

Mode: docs-only architecture audit in main workspace

## Assignment

Prepare architecture readiness for `CF-W1-RH-01A` as the next non-overlapping direct investor/trader value candidate in the queue, using root `AGENTS.md` as authoritative and keeping scope inside active execution docs only.

## Files Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/next-top-10-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/top-10-ready-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/requirements-backlog.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-RH-01A-research-hub-actionability-evidence-date-wiring-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-RH-01-research-hub-actionability-evidence-wiring-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-RH-01-research-hub-actionability-evidence-wiring-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/audit-research-hub-explainability-2026-05-20.md`
- `backend/src/modules/research-hub/**`
- `frontend/src/features/research-hub/**`
- `backend/tests/modules/research-hub/research-hub.service.test.ts`
- `frontend/tests/ui/research-hub.spec.ts`
- public date-bearing read surfaces in:
  - `backend/src/modules/strategy-decision-engine/**`
  - `backend/src/modules/today-trade-review/**`
  - `backend/src/modules/trade-plan-risk-engine/**`
  - `backend/src/modules/signal-quality-lab/**`
  - `backend/src/modules/signal-calibration-engine/**`

## Files Changed

- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-RH-01A-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-RH-01A-research-hub-evidence-date-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-RH-01A-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-CF-W1-RH-01A-architecture-outbox.md`

## Result

Team 03 recommends a bounded Research Hub backend + feature-local frontend child.

Do now:

- keep the existing `ResearchActionability` shape
- wire only truthful per-dimension evidence dates
- render dates on the existing actionability tiles when present
- keep date-unknown dimensions explicitly null

Do not do in this child:

- reopen broad `RH-01` status wiring
- claim calibration evidence date before `CF-W2-CAL-02A`
- change routes, shared UI, package manifests, or schema
- touch Daily Overview or Signal Position Ledger files

## Architecture Finding

### Truthful now

- market environment date from `marketGate.updatedAt`
- signal-evidence date from Signal Quality summary `generatedAt`
- today-review date from latest run `finishedAt` or `sourceSnapshot.generatedAt`
- trade-plan date from funnel diagnostics `generatedAt`

### Not truthful now

- data-readiness date
- strategy-proof date
- calibration-readiness date on the current base

## Frontend vs Backend Decision

Chosen:

- backend wiring plus feature-local Research Hub tile rendering

Why:

- the API field already exists
- the service already owns the actionability adapter
- the current page does not render `evidenceDate`, so backend-only work would leave the user-facing gap open

## Ready Direction

`CF-W1-RH-01A` is a `Ready candidate` for Team 04 QA planning and Team 00 sequencing.

Team 04 can start now because the packet includes:

- exact allowed files
- exact forbidden files
- a per-dimension source map
- clear stop conditions

## Validation

No tests, builds, servers, Prisma commands, or app-code edits were run.

Validation was source and docs inspection only.

## Risks

- Research Hub file overlap remains the main sequencing risk if Team 00 routes another `RH-*` packet in parallel.
- Signal Quality, Today Review, and Trade Plan dates must come from their public read surfaces only; any need for upstream edits invalidates the slice.
- Calibration remains intentionally deferred for date truth.

## Next Gate

- Team 04: QA plan
- Team 00: Ready evaluation and single-writer reservation for the Research Hub implementation file set
