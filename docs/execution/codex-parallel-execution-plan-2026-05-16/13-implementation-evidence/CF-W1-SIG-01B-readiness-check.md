# CF-W1-SIG-01B Readiness Check

Date: 2026-05-17

Wave ID: `AUTO-WAVE-2026-05-17-SIG-READPATH`

## Requirement

Signal Generation read paths must not expose persisted signals as trusted unless the signal row carries persisted Data Quality eligibility evidence showing the signal was generated through a DQ-filtered, READY, eligible path.

## Current Evidence Inspected

- `backend/src/modules/signal-generation-engine/signal-generation-engine.service.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.repository.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.types.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.service.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.repository.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-dq-enforcement.invariants.test.ts`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/market-data-dq-readiness-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/09-summaries/CF-W2-SIG-01A-summary.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/98-orchestrator/standing-delegation-policy.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/98-orchestrator/escalation-rules.md`

## Current Behavior

- `topSignals()` and `screener()` read from persisted signal rows through `repository.latestSignals()`.
- Repository DTOs already expose `dataQualityEligibility` from `dataQualityEligibilitySnapshot`.
- Repository DTOs already mark rows as `auditStatus: CURRENT` only when ruleset, scoring input, and DQ eligibility snapshot exist.
- Current read paths can expose legacy or untrusted persisted rows because no read-path trust filter is applied.
- `latestForInstrument()` remains a separate auto-generation path and is not covered by this requirement.

## Allowed Files

Source:

- `backend/src/modules/signal-generation-engine/signal-generation-engine.service.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.repository.ts`

Tests:

- `backend/tests/modules/signal-generation-engine/signal-generation-engine.service.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.repository.test.ts`
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
| Product policy ambiguity | No; active DQ contract requires only READY/trusted evidence for downstream signal use |
| Data-quality threshold ambiguity | No new threshold; read trust is derived from persisted `eligible: true`, `filterApplied: true`, and `signalReadinessStatus: READY` |
| Workstream file conflict | No |

## Implementation Decision

Implementation allowed: yes.

The bounded slice can be implemented module-locally by deriving trusted read eligibility from persisted signal DQ evidence and filtering `topSignals()` / `screener()` read paths. It must not claim `latestForInstrument()` gating or downstream enforcement.

