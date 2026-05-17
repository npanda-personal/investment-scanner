# Next Contracts To Prepare

Date: 2026-05-17

Prepared by Team 03 Architecture Factory and refreshed after `CF-W1-L3-AUTH-02` commit `503bcd9`, `CF-W1-SIG-TRIGGER-01` commit `6ab3999`, and checkpoint protocol fix commit `f75808f`.

## Current Architecture Queue

| Priority | Candidate | Architecture status | Implementation status | Notes |
| --- | --- | --- | --- | --- |
| 1 | `CF-W1-TP-01B` | Backend-only child reservation confirmed in 2026-05-18 matrix | Not Ready for Implementation | Trade Plan compatibility/DQ hard-block contract, Team 04 QA plan, Team 06 inspection, and exact backend file reservations exist; needs Team 00 Ready promotion. |
| 2 | `CF-W1-NOTIF-02` | Local log provider redaction reservation confirmed in 2026-05-18 matrix | Not Ready for Implementation | Notification requirement, architecture review, contract, work packet, QA plan, Team 09 inspection, and exact provider/test/doc reservations exist; needs Team 00/Team 09 Ready promotion. |
| 3 | `CF-W1-L3-ALERT-01` | Alert readiness suppression reservation confirmed in 2026-05-18 matrix | Not Ready for Implementation | Alert readiness suppression contract, Team 04 QA plan, and exact backend file reservations exist; needs Team 00 Ready promotion. |
| 4 | `CF-W1-L3-INTEL-01` | Child architecture signoff prepared | Not Ready for Implementation | Requirement, architecture review, contract, QA plan, work packet, and Team 03 signoff exist; blocked until `CF-W1-L3-PORT-01A` is implemented and accepted. |
| 5 | `CF-W1-UX-02` | Option B contract/work-packet refresh prepared | Not Ready for Implementation | Needs Team 08 source-supported trust-field mapping, Team 04 QA acceptance, Team 00 Ready promotion, and no shared UI/navigation scope. |
| 6 | `CF-W1-MD-02` | Formal ADR draft prepared | Source/schema implementation blocked | ADR draft recorded at `03-architecture/CF-W1-MD-02-durable-readiness-evidence-adr.md`; needs acceptance before split source/schema packets. |
| 7 | `CF-W1-MD-01` | Option A validation-only contract/work packet prepared | Not Ready for Implementation | Exact validation source/test/doc reservations recorded; no durable-storage/provider/schema scope. Needs Team 05/04 review and Team 00 Ready promotion. |
| 8 | `CF-W1-UX-05` | Option A Copilot-only contract/work-packet refresh prepared | Not Ready for Implementation | Sequence with `CF-W1-UX-02`; shared `StatusBadge`, Research Hub, and Market Data UI remain future. |
| 9 | `CF-W1-AUTH-01` | Option A controller fail-closed contract/work packet prepared | Not Ready for Implementation | Exact subscription/notification controller/test/doc reservations recorded; auth middleware, routes, Prisma, shared utilities remain forbidden. |
| 10 | `CF-W1-SUB-01` | Option A manual/admin-only subscription contract/work packet prepared | Not Ready for Implementation | Exact subscription controller/test/doc reservations recorded; conflicts with `CF-W1-AUTH-01` unless combined or sequenced. |

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
| `CF-W1-L3-DQ-01` | Option B accepted. | Portfolio/watchlist, alert, and portfolio-intelligence child artifacts are prepared; Team 00 Ready promotion and upstream sequencing remain. |
| `CF-W1-TP-01A` | Option B accepted. | Backend-only child contract is prepared as `CF-W1-TP-01B`; QA refresh and Team 00 Ready promotion remain. |
| `CF-W1-MD-02` | Option B accepted as ADR direction only. | Formal ADR draft is prepared; separate approval-gated source/schema split remains blocked. |
| `CF-W1-AUTH-01` | Option A accepted. | Team 09 module-local backend packet and exact reservations remain. |
| `CF-W1-SUB-01` | Option A accepted. | Team 09 backend-only packet, exact reservations, and frontend limitation notes remain. |
| `CF-W1-UX-02` | Option B accepted. | Copilot-only trust contract refresh and exact reservations remain. |
| `CF-W1-UX-05` | Option A accepted. | Copilot-only copy child sequencing with `CF-W1-UX-02` remains. |
| `CF-W1-MD-01` | Option A accepted. | Market Data validation-only work packet and exact reservations remain. |

## Docs-Only Architecture Prep Can Continue

- `CF-W1-L3-DQ-01`: continue child module contracts under approved Option B; portfolio/watchlist is prepared as `CF-W1-L3-PORT-01`.
- `CF-W1-L3-PORT-01`: route to Team 04 for child QA plan before implementation promotion.
- `CF-W1-TP-01B`: route to Team 04 for backend-only child QA refresh before implementation promotion.
- `CF-W1-L3-ALERT-01`: route to Team 04 for alert child QA refresh before implementation promotion.
- `CF-W1-L3-INTEL-01`: keep blocked until `CF-W1-L3-PORT-01A` implementation acceptance; do not promote before portfolio readiness DTOs exist.
- `CF-W1-UX-02`: refresh Copilot-only UX trust architecture, trust-field fallback rules, and shared-file stop conditions.
- `CF-W1-MD-02`: route formal ADR draft to Team 00 / Architect / QA acceptance; no schema/source readiness.
- `CF-W1-MD-01`: refresh validation policy implementation boundaries and QA alignment under Option A.
- `CF-W1-UX-05`: refresh Copilot-only copy child and keep shared UI reservation future.
- `CF-W1-AUTH-01`: refresh protected controller fail-closed packet under Option A.
- `CF-W1-SUB-01`: refresh admin/manual-only subscription packet under Option A.

## Ready Promotion Update - 2026-05-18

`CF-W1-L3-PORT-01A` was promoted by Team 00 for Team 07 implementation after the requirement, parent contract, Team 04 QA plan, Team 07 inspection, and exact portfolio-management reservations passed Ready gates. It is no longer in this architecture prep queue.

## Recommendation

No additional implementation item is architecture-ready now. Keep other items out of `12-ready-queue/ready-for-implementation.md` until a candidate has an accepted requirement, accepted architecture contract, accepted QA plan, exact file reservations, and no open Product Owner, Architect, shared-file, schema, route, package, provider, or upstream blocker.

Next Team 03 recommendation: route `CF-W1-L3-INTEL-01` signoff to Team 00 for sequencing behind `CF-W1-L3-PORT-01A`. After `CF-W1-MD-02` ADR acceptance, prepare `CF-W1-MD-02A` as a schema/migration proposal packet only if Team 00 and Architect explicitly authorize that approval-gated path.

## Team 03 Post-Decision Refresh - 2026-05-18

Prepared:

- `03-architecture/team03-post-decision-readiness-refresh-2026-05-18.md`
- `06-contracts/CF-W1-AUTH-01-platform-auth-fail-closed-contract.md`
- `08-work-packets/CF-W1-AUTH-01-work-packet.md`
- `06-contracts/CF-W1-SUB-01-manual-subscription-plan-policy-contract.md`
- `08-work-packets/CF-W1-SUB-01-work-packet.md`
- `06-contracts/CF-W1-MD-01-market-data-validation-hardening-contract.md`
- `08-work-packets/CF-W1-MD-01-work-packet.md`

Refreshed:

- `06-contracts/CF-W1-UX-02-copilot-trust-ux-contract.md`
- `08-work-packets/CF-W1-UX-02-work-packet.md`
- `06-contracts/CF-W1-UX-05-product-language-status-contract.md`
- `08-work-packets/CF-W1-UX-05-work-packet.md`

Result: no open Decision Inbox blocker remains, but none of these five items is Ready for Implementation. Team 00 still needs to promote exact handoffs. `CF-W1-AUTH-01` and `CF-W1-SUB-01` share subscription controller files; `CF-W1-UX-02` and `CF-W1-UX-05A` share Copilot files.

## Team 03 Near-Ready Matrix - 2026-05-18

Prepared:

- `03-architecture/team03-near-ready-file-reservation-matrix-2026-05-18.md`

Result: `CF-W1-L3-PORT-01A`, `CF-W1-TP-01B`, `CF-W1-NOTIF-02`, and `CF-W1-L3-ALERT-01` each have exact file reservations and no unresolved decision blocker within their bounded backend-only scopes. Team 00 later promoted `CF-W1-L3-PORT-01A`; the others remain out of Ready until Team 00 promotes one candidate and records the implementation handoff. `CF-W1-L3-INTEL-01` remains downstream of accepted `CF-W1-L3-PORT-01A`.

## Team 03 Trade Plan Contract Refresh - 2026-05-17

Prepared `CF-W1-TP-01B` as the backend-only Trade Plan compatibility and DQ hard-block child under accepted parent policy `CF-W1-TP-01A`.

New docs:

- `03-architecture/CF-W1-TP-01B-architecture-review.md`
- `06-contracts/CF-W1-TP-01B-backend-compatibility-dq-hard-block-contract.md`
- `08-work-packets/CF-W1-TP-01B-work-packet.md`

Readiness result: not ready for application code. The child has exact backend file reservations, but still needs Team 04 QA child-plan refresh and Team 00 Ready promotion.

## Team 03 Child Contract Refresh - 2026-05-17

Prepared `CF-W1-L3-PORT-01` as the first child under accepted parent policy `CF-W1-L3-DQ-01`.

New docs:

- `03-architecture/CF-W1-L3-PORT-01-architecture-review.md`
- `06-contracts/CF-W1-L3-PORT-01-portfolio-watchlist-readiness-dto-contract.md`
- `08-work-packets/CF-W1-L3-PORT-01-work-packet.md`

Readiness result: not ready for application code. The child has exact backend file reservations, but still needs Team 04 QA child-plan acceptance and Team 00 Ready promotion.

## Team 03 Alert Contract Refresh - 2026-05-17

Prepared `CF-W1-L3-ALERT-01` as the alert readiness suppression child under accepted parent policy `CF-W1-L3-DQ-01`.

New docs:

- `03-architecture/CF-W1-L3-ALERT-01-architecture-review.md`
- `06-contracts/CF-W1-L3-ALERT-01-alert-readiness-suppression-contract.md`
- `08-work-packets/CF-W1-L3-ALERT-01-work-packet.md`

Readiness result: not ready for application code. The child has exact backend file reservations, but still needs Team 04 QA child-plan refresh and Team 00 Ready promotion.

## Team 03 Relaunch Result - 2026-05-17

Relaunch scope covered:

- `CF-W1-L3-DQ-01`
- `CF-W1-TP-01A`
- `CF-W1-MD-02`

Current readiness result:

| Candidate | Docs-only prep status | App-code readiness | Reason |
| --- | --- | --- | --- |
| `CF-W1-L3-DQ-01` | Parent policy accepted; child artifacts prepared for `CF-W1-L3-PORT-01`, `CF-W1-L3-ALERT-01`, and `CF-W1-L3-INTEL-01` | Blocked | Prepared children need Team 00 Ready promotion and sequencing; `CF-W1-L3-INTEL-01` must wait for `CF-W1-L3-PORT-01A` acceptance. |
| `CF-W1-TP-01A` | Parent policy accepted; backend-only child contract prepared as `CF-W1-TP-01B` | Blocked | `CF-W1-TP-01B` needs QA child-plan refresh and Team 00 Ready promotion. |
| `CF-W1-MD-02` | ADR draft prepared | Blocked from source/schema | Source/schema implementation remains separately approval-gated pending ADR acceptance and split-packet approval. |

No candidate should be moved to `Ready for Implementation` from this Team 03 pass. The next Team 00 action is to route `CF-W1-L3-PORT-01`, `CF-W1-L3-ALERT-01`, and `CF-W1-TP-01B` to Team 04 for QA scenario refresh and route the `CF-W1-MD-02` ADR draft to acceptance review.

## Team 03 Market Data ADR Refresh - 2026-05-17

Prepared the formal `CF-W1-MD-02` ADR draft for companion durable Market Data readiness/evidence storage.

New doc:

- `03-architecture/CF-W1-MD-02-durable-readiness-evidence-adr.md`

Updated docs:

- `03-architecture/CF-W1-MD-02-architecture-review.md`
- `06-contracts/CF-W1-MD-02-durable-readiness-evidence-contract.md`
- `08-work-packets/CF-W1-MD-02-work-packet.md`

Readiness result: not ready for application code. The ADR draft preserves the Product Owner-approved Option B direction, records natural-key and migration/rollback strategy, and keeps Prisma/schema/source/test work blocked pending separate acceptance and exact file reservations.

## Team 03 Portfolio Intelligence Signoff - 2026-05-17

Reviewed existing `CF-W1-L3-INTEL-01` drafts and prepared conditional Team 03 architecture signoff.

New doc:

- `03-architecture/CF-W1-L3-INTEL-01-architect-signoff.md`

Readiness result: not ready for application code. The item has requirement, architecture review, contract, QA plan, and work packet drafts, but implementation must wait for `CF-W1-L3-PORT-01A` portfolio readiness DTO acceptance because current Portfolio Intelligence source has no `PortfolioSummaryDto.readinessSummary` or `HoldingValuationDto.readiness` fields to consume.
