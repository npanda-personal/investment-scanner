# Next Contracts To Prepare

Date: 2026-05-17

Prepared by Team 03 Architecture Factory and refreshed after `CF-W1-L3-AUTH-02` commit `503bcd9`, `CF-W1-SIG-TRIGGER-01` commit `6ab3999`, and checkpoint protocol fix commit `f75808f`.

## Current Architecture Queue

| Priority | Candidate | Architecture status | Implementation status | Notes |
| --- | --- | --- | --- | --- |
| 1 | `CF-W1-L3-DQ-01` | Post-decision child contract prep can continue | Not architecture-ready for app code | Option B policy accepted; needs child DTO/file reservations and QA scenarios. |
| 2 | `CF-W1-TP-01A` | Post-decision backend-only child contract prep can continue | Not architecture-ready for app code | Option B policy accepted; needs exact backend-only reservations and QA scenarios. |
| 3 | `CF-W1-L3-ALERT-01` | Docs-only prep can proceed under accepted `CF-W1-L3-DQ-01` policy | Not architecture-ready for app code | Alert event ownership is committed; readiness suppression needs child contract and exact files. |
| 4 | `CF-W1-UX-02` | Docs-only UX/architecture prep can continue | Not architecture-ready for app code | Needs Product Owner + UX + Architect decision on naming, trust surface, blocked states, and shared-file scope. |
| 5 | `CF-W1-MD-02` | Formal ADR prep can continue | Source/schema implementation blocked | Option B ADR direction accepted; implementation remains split and approval-gated. |
| 6 | `CF-W1-MD-01` | Docs-only validation policy prep can continue | Not architecture-ready for app code | Needs policy for future-dated candles, adjusted-close gaps, and suspicious price spikes. |
| 7 | `CF-W1-UX-05` | Docs-only copy/shared-status inventory can continue | Not architecture-ready for app code | Needs Product Owner/UX copy and status-color decision plus shared UI reservation if code follows. |

## Completed Or No Longer Next

- `CF-W1-L3-AUTH-01` is completed, accepted, and locally committed as `74ba6dd fix: enforce portfolio watchlist child ownership`; it must not remain in the next-contract queue.
- `CF-W1-L3-AUTH-02` is completed, accepted, and locally committed as `503bcd9 fix: scope alert events by rule owner`; future direct `AlertEvent.userId` schema ownership is a separate blocked path.
- `CF-W1-SIG-TRIGGER-01` is completed for the bounded DTO projection and locally committed as `6ab3999 feat: add signal trigger contract projection`; persisted snapshots, normalized trigger tables, and downstream consumer adoption are separate future contracts.
- `CF-W1-STRAT-01` is completed as the bounded Strategy Decision Option B-Strict slice. Remaining Trade Plan target geometry is separate and must not be treated as completed by Strategy Decision work.
- `CF-W2-DQ-01`, `CF-W2-SIG-01A`, `CF-W1-SIG-01B`, and `CF-W1-SIG-LATEST-01` are completed bounded slices and must not be reopened as app-code ready items.

## Blocked By Open Decisions

No current architecture candidate is blocked by an open Decision Inbox item.

Resolved decision inputs:

| Candidate | Resolution | Remaining architecture blocker |
| --- | --- | --- |
| `CF-W1-L3-DQ-01` | Option B accepted. | Child DTO fields, module split, exact file reservations, and QA scenario matrix. |
| `CF-W1-TP-01A` | Option B accepted. | Backend-only reservation, API/UI/stored-row exclusion proof, and QA scenario matrix. |
| `CF-W1-MD-02` | Option B accepted as ADR direction only. | Formal ADR and separate approval-gated source/schema split. |

## Docs-Only Architecture Prep Can Continue

- `CF-W1-L3-DQ-01`: prepare child module contracts under approved Option B.
- `CF-W1-TP-01A`: prepare backend-only child contract under approved Option B.
- `CF-W1-L3-ALERT-01`: prepare only as a dependent alert readiness contract, not as implementation-ready work.
- `CF-W1-UX-02`: prepare UX trust architecture questions and shared-file stop conditions.
- `CF-W1-MD-02`: prepare formal ADR only; no schema/source readiness.
- `CF-W1-MD-01`: prepare validation policy and QA alignment.
- `CF-W1-UX-05`: prepare copy/status inventory and shared UI reservation needs.

## Recommendation

No implementation item is architecture-ready now. Keep `12-ready-queue/ready-for-implementation.md` at zero app-code items until a candidate has an accepted requirement, accepted architecture contract, accepted QA plan, exact file reservations, and no open Product Owner, Architect, shared-file, schema, route, package, provider, or upstream blocker.

Next Team 03 recommendation: prepare docs-only child contracts and file reservations for `CF-W1-L3-DQ-01` first, because the parent policy is now accepted and it unblocks multiple downstream Lane 3 candidates without requiring Prisma, route, package, or shared-file changes.

## Team 03 Relaunch Result - 2026-05-17

Relaunch scope covered:

- `CF-W1-L3-DQ-01`
- `CF-W1-TP-01A`
- `CF-W1-MD-02`

Current readiness result:

| Candidate | Docs-only prep status | App-code readiness | Reason |
| --- | --- | --- | --- |
| `CF-W1-L3-DQ-01` | Parent policy accepted; child contract prep can continue | Blocked | Child DTO fields, QA scenarios, and exact file reservations are not accepted. |
| `CF-W1-TP-01A` | Parent policy accepted; backend-only child prep can continue | Blocked | Exact backend-only file reservations and QA scenarios are not accepted. |
| `CF-W1-MD-02` | ADR direction accepted; formal ADR prep can continue | Blocked from source/schema | Source/schema implementation remains separately approval-gated. |

No candidate should be moved to `Ready for Implementation` from this Team 03 pass. The next Team 00 action is to launch Team 03 for post-decision child contracts and then Team 04 for QA scenario refresh.
