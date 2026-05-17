# CF-W2-DQ-01 Readiness Check

Date: 2026-05-17

Status: Implementation allowed for evidence flow. This document reviews the existing dirty DQ change only.

## Scope

Requirement:
- `CF-W2-DQ-01 Data Quality fail-closed defaults`

Allowed write files:
- `backend/src/modules/data-quality-engine/data-quality-engine.service.ts`
- `backend/tests/modules/data-quality-engine/data-quality-engine.service.test.ts`

Read-only context:
- `backend/src/modules/data-quality-engine/**`
- `backend/tests/modules/data-quality-engine/**`
- active execution docs

Excluded pending separate decision:
- all `backend/src/modules/signal-generation-engine/**`
- all `backend/tests/modules/signal-generation-engine/**`

## Readiness Answers

| Question | Answer |
| --- | --- |
| Is the DQ dirty change module-local? | Yes. |
| Does it touch only allowed DQ files? | Yes for the DQ track. Signal Generation dirty files remain separate and pending. |
| Does it avoid Prisma/schema/migrations? | Yes. |
| Does it avoid route registries? | Yes. |
| Does it avoid shared utilities? | Yes. |
| Does it avoid package changes? | Yes. |
| Does it avoid generated/common fixtures? | Yes. |
| Does it avoid Angel One? | Yes. |
| Does it avoid live providers? | Yes. |
| Does it avoid startup/backfill behavior? | Yes. |
| Does it avoid UI? | Yes. |
| Does it preserve READY/TRUSTWORTHY eligibility? | Yes. Existing ready evaluation eligibility remains unchanged. |
| Does it make missing/unknown/untrusted evaluation fail closed? | Yes for missing evaluations in `filterEligibleInstruments()` by default. |
| Does it preserve LIMITED warning-gated or blocked behavior according to contract? | Yes. Default allowed readiness remains `READY`; `LIMITED` requires explicit opt-in. |
| Does it preserve NOT_READY/BLOCKED/UNUSABLE/NOT_TRUSTWORTHY downstream blocking? | Yes. Existing readiness, score, eligibility, and unusable checks remain intact. |

## Implementation Allowed

```text
Implementation allowed: yes
```

Reason:
- The current DQ dirty change is one module-local default change plus one focused module-local test.
- It aligns with the active readiness contract's fail-closed policy for missing Data Quality evidence.
- It requires no Signal Generation changes for DQ acceptance.

Limitations:
- This does not prove downstream module enforcement.
- This does not resolve Signal Generation read-path trust gaps.
- This does not validate live provider data, Angel One, startup/backfill, UI, schema, routes, shared utilities, or package changes.
