# Next Contracts To Prepare

Date: 2026-05-17

Prepared by Team 03 Architecture Factory and refreshed after `CF-W1-L3-AUTH-02` commit `503bcd9`, `CF-W1-SIG-TRIGGER-01` commit `6ab3999`, and checkpoint protocol fix commit `f75808f`.

## Current Architecture Queue

| Priority | Candidate | Architecture status | Implementation status | Notes |
| --- | --- | --- | --- | --- |
| 1 | `CF-W1-L3-DQ-01` | Docs-only policy preparation can continue | Not architecture-ready for app code | Needs Product Owner + Architect decision on display-only versus action-like readiness behavior. |
| 2 | `CF-W1-TP-01A` | Docs-only contract refinement can continue | Not architecture-ready for app code | Needs Product Owner + Architect decision on no-target Trade Plan semantics, API/UI compatibility, and DQ hard-block behavior. |
| 3 | `CF-W1-L3-ALERT-01` | Docs-only prep can proceed after aligning to `CF-W1-L3-DQ-01` | Not architecture-ready for app code | Alert event ownership is committed; readiness suppression still depends on Lane 3 readiness policy. |
| 4 | `CF-W1-UX-02` | Docs-only UX/architecture prep can continue | Not architecture-ready for app code | Needs Product Owner + UX + Architect decision on naming, trust surface, blocked states, and shared-file scope. |
| 5 | `CF-W1-MD-02` | ADR/decision-packet prep can continue | Source/schema implementation blocked | Durable readiness evidence likely touches Prisma/storage/natural-key policy. |
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

Candidates still have Product/Architect policy questions, but no active Decision Packet is open as of this refresh.

## Docs-Only Architecture Prep Can Continue

- `CF-W1-L3-DQ-01`: prepare Lane 3 display-vs-action readiness policy options.
- `CF-W1-TP-01A`: prepare no-target/DQ hard-block architecture questions and split boundaries.
- `CF-W1-L3-ALERT-01`: prepare only as a dependent alert readiness contract, not as implementation-ready work.
- `CF-W1-UX-02`: prepare UX trust architecture questions and shared-file stop conditions.
- `CF-W1-MD-02`: prepare ADR/decision packet only; no schema/source readiness.
- `CF-W1-MD-01`: prepare validation policy and QA alignment.
- `CF-W1-UX-05`: prepare copy/status inventory and shared UI reservation needs.

## Recommendation

No implementation item is architecture-ready now. Keep `12-ready-queue/ready-for-implementation.md` at zero app-code items until a candidate has an accepted requirement, accepted architecture contract, accepted QA plan, exact file reservations, and no open Product Owner, Architect, shared-file, schema, route, package, provider, or upstream blocker.

Next Team 03 recommendation: prepare a docs-only `CF-W1-L3-DQ-01` Lane 3 readiness policy decision packet first, because it unblocks multiple downstream Lane 3 candidates without requiring Prisma, route, package, or application-source changes.

## Team 03 Relaunch Result - 2026-05-17

Relaunch scope covered:

- `CF-W1-L3-DQ-01`
- `CF-W1-TP-01A`
- `CF-W1-MD-02`

Current readiness result:

| Candidate | Docs-only prep status | App-code readiness | Reason |
| --- | --- | --- | --- |
| `CF-W1-L3-DQ-01` | Architecture review, contract, and work packet can continue | Blocked | Product Owner and Architect have not accepted the Lane 3 display-vs-action readiness policy or child file reservations. |
| `CF-W1-TP-01A` | Architecture review, contract, and work packet can continue | Blocked | Product Owner and Architect have not accepted Trade Plan no-target compatibility semantics, `LIMITED` DQ behavior, API/UI boundary, or exact source reservations. |
| `CF-W1-MD-02` | ADR/decision recommendation prep can continue | Blocked from source/schema | Durable evidence may require Prisma/OHLC storage, natural-key, migration, rollback, and downstream contract decisions. |

No candidate should be moved to `Ready for Implementation` from this Team 03 pass. The next Team 00 action is to route Product Owner/Architect policy consent only when a true decision is desired; otherwise keep Teams 02/03/04 in docs-only refinement.
