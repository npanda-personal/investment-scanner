# CF-W1-SIG-LATEST-01 Readiness Check

Date: 2026-05-17

Wave ID: `AUTO-WAVE-2026-05-17-SIG-READPATH`

## Requirement

`latestForInstrument()` must not return or auto-generate trusted signal output unless the persisted latest row is trusted or the auto-generation path passes the Data Quality gate.

## Current Evidence Inspected

- `backend/src/modules/signal-generation-engine/signal-generation-engine.service.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.service.test.ts`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/09-summaries/CF-W1-SIG-01B-summary.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-SIG-01B-signal-generation-read-path-trust-filtering-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/98-orchestrator/standing-delegation-policy.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/98-orchestrator/escalation-rules.md`

## Current Behavior

- `latestForInstrument()` returns the latest persisted signal if one exists, even if it is legacy or lacks trusted DQ evidence.
- If no latest row exists, it calls `generateForInstrument()` directly, bypassing the run-level DQ gate.
- `CF-W2-SIG-01A` already made `run()` fail closed by default.
- `CF-W1-SIG-01B` already added trusted read filtering for list paths.

## Allowed Files

Source:

- `backend/src/modules/signal-generation-engine/signal-generation-engine.service.ts`

Tests:

- `backend/tests/modules/signal-generation-engine/signal-generation-engine.service.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-dq-enforcement.invariants.test.ts`

Docs:

- Active execution docs under `docs/execution/codex-parallel-execution-plan-2026-05-16/`.

## Forbidden Files

- Prisma schema or migrations
- Route registries
- Shared backend utilities
- Shared UI
- Package manifests
- Generated/common fixtures
- `backend/src/server.ts`
- `backend/.env.example`
- `.gitignore`
- root `AGENTS.md`
- `docs/AGENTS.md`
- `docs/codex-agent-team-plan/**`
- Angel One, live provider, broker, paid service, startup/backfill, or UI files

## Consent Blocker Check

| Check | Result |
| --- | --- |
| Prisma/schema change needed | No |
| Route registry change needed | No |
| Shared utility/UI change needed | No |
| Package/generated/common fixture change needed | No |
| Angel One/live provider/broker/paid/cloud risk | No |
| Startup/backfill/UI implementation needed | No |
| Product policy ambiguity | No; existing policy requires fail-closed trusted signal behavior |
| DQ threshold ambiguity | No new threshold; reuse the `run()` DQ gate |
| Workstream file conflict | No, SIG-01B was committed before this slice |

## Implementation Decision

Implementation allowed: yes.

The bounded slice can be implemented by requiring trusted persisted latest evidence and routing untrusted/missing latest rows through `run({ instrumentId })`, which already applies the Data Quality fail-closed gate.

