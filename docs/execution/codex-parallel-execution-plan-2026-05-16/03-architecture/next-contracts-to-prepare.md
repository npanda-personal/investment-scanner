# Next Contracts To Prepare

Date: 2026-05-17

Prepared by Team 03 Architecture Factory and refreshed after `CF-W1-L3-AUTH-02` commit `503bcd9`, `CF-W1-SIG-TRIGGER-01` commit `6ab3999`, and checkpoint protocol fix commit `f75808f`.

## Team 03 SQLAB-02 Post-Event Learning Prep - 2026-05-18

Prepared:

- `03-architecture/CF-W1-SQLAB-02-architecture-review.md`
- `06-contracts/CF-W1-SQLAB-02-signal-outcome-journal-post-event-learning-contract.md`
- `08-work-packets/CF-W1-SQLAB-02-work-packet.md`

Result:

- `CF-W1-SQLAB-02` is split by architecture evidence.
- A no-schema first slice is source-supported as a bounded `signal-quality-lab` derived journal preview covering backend service/types/doc/test plus the module-owned frontend page/types/UI smoke test.
- The full durable journal requirement remains blocked because `signal-quality-lab` has no owned persisted row or JSON surface to extend without storage approval.
- Team 04 QA planning can start now for the no-schema first slice only.
- Team 00 must not promote `CF-W1-SQLAB-02` in parallel with `CF-W1-SQLAB-01`; both reserve `signal-quality-lab.service.ts`, `signal-quality-lab.types.ts`, `signal-quality-lab.md`, and the focused service test.

## Team 03 Watchlist Review Actionability Prep - 2026-05-18

Prepared:

- `03-architecture/CF-W1-L3-WATCH-01-architecture-review.md`
- `06-contracts/CF-W1-L3-WATCH-01-watchlist-review-actionability-contract.md`
- `08-work-packets/CF-W1-L3-WATCH-01-work-packet.md`

Result:

- `CF-W1-L3-WATCH-01` is source-supported as a bounded watchlist-owned vertical slice.
- The first slice can stay inside `watchlist-management` backend/frontend/docs/tests and derive review priority from existing signal, daily-move, note, and tag fields without Prisma/schema, route-registry, shared utility/UI, package, generated, provider/startup, live-provider, paid/cloud, telemetry, or broker scope.
- Team 04 QA planning can start from the packet now.
- Team 00 must keep this packet separate from `CF-W1-L3-PORT-01B`; both reserve the same watchlist backend writer set, but they are different contracts and should not be combined by default.
- `CF-W1-L3-TREV-01` has no file overlap and is not a conflict.

## Team 03 Alert Follow-Through Prep - 2026-05-18

Prepared:

- `03-architecture/CF-W1-L3-ALERT-03-architecture-review.md`
- `06-contracts/CF-W1-L3-ALERT-03-alert-follow-through-traceability-contract.md`
- `08-work-packets/CF-W1-L3-ALERT-03-work-packet.md`

Result:

- `CF-W1-L3-ALERT-03` is source-supported as a bounded backend-only `alerts-monitoring` packet.
- The first slice can stay module-local by persisting `metadata.followThrough` on `AlertEvent` and projecting additive event DTO fields.
- No Prisma/schema, route-registry, shared utility/UI, package, generated, provider/startup, live-provider, paid/cloud, telemetry, or broker scope is required for the first packet.
- Team 04 QA planning can start from the packet now.
- Team 00 must not promote this packet in parallel with `CF-W1-L3-ALERT-01` or `CF-W1-L3-AUTH-03` because the same `alerts-monitoring` service/types/doc/test surfaces are required.
- `CF-W1-L3-TREV-01` has no file overlap and is not a conflict.

## Current Architecture Queue

| Priority | Candidate | Architecture status | Implementation status | Notes |
| --- | --- | --- | --- | --- |
| 1 | `CF-W1-L3-PORT-01B` | Watchlist-only child architecture packet prepared | Not Ready for Implementation | High user-value watchlist child now has exact watchlist reservations, but it remains blocked until `CF-W1-L3-PORT-01A` is accepted so the readiness DTO shape is stable in accepted source. |
| 2 | `CF-W1-DQ-02` | Backend-only Lane 1 currentness packet prepared | Not Ready for Implementation | Exact Market Data session helper and DQE service/type/doc/test reservations are defined; QA prep should start here before downstream trust consumers. |
| 3 | `CF-W1-AUTH-02` | Consumer-isolation packet prepared with Team 09 and Team 08 child reservations | Not Ready for Implementation | Alert event ownership is already accepted in `CF-W1-L3-AUTH-02`; remaining work is digest user propagation. Conflicts with `CF-W1-NOTIF-02`, `CF-W1-UX-02`, and `CF-W1-UX-05`. |
| 4 | `CF-W1-TP-02` | Future Trade Plan semantics packet prepared | Not Ready for Implementation | Exact Trade Plan service/type/validation/geometry/doc/test reservations are defined, but the packet stays sequenced behind `CF-W1-TP-01B`. |
| 5 | `CF-W1-L3-INTEL-02` | Portfolio Intelligence review-traceability packet prepared | Not Ready for Implementation | Exact `portfolio-intelligence` reservations are defined. Depends on accepted `CF-W1-L3-PORT-01A`; does not depend on `PORT-01B`; conflicts with `CF-W1-L3-INTEL-01` because the file set is identical. |
| 6 | `CF-W1-SQLAB-01` | Signal Quality Lab outcome-confidence packet prepared | Not Ready for Implementation | Exact `signal-quality-lab` service/type/doc/test reservations are defined. No schema/route/provider/frontend blocker for the first slice; keep aligned with `CF-W1-CAL-01` if Team 00 promotes both. |
| 7 | `CF-W1-CAL-01` | Signal Calibration reliability-drift packet prepared | Not Ready for Implementation | Exact `signal-calibration-engine` service/type/doc/test reservations are defined. Calibration owns the slice; SQLAB and DQE are non-blocking public-contract dependencies only. |
| 8 | `CF-W1-TP-01B` | Backend-only child reservation confirmed in 2026-05-18 matrix | Not Ready for Implementation | Trade Plan compatibility/DQ hard-block contract, Team 04 QA plan, Team 06 inspection, and exact backend file reservations exist; needs Team 00 Ready promotion. |
| 9 | `CF-W1-NOTIF-02` | Local log provider redaction reservation confirmed in 2026-05-18 matrix | Not Ready for Implementation | Notification requirement, architecture review, contract, work packet, QA plan, Team 09 inspection, and exact provider/test/doc reservations exist; needs Team 00/Team 09 Ready promotion. |
| 10 | `CF-W1-L3-ALERT-01` | Alert readiness suppression reservation confirmed in 2026-05-18 matrix | Not Ready for Implementation | Alert readiness suppression contract, Team 04 QA plan, and exact backend file reservations exist; needs Team 00 Ready promotion. |

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
| `CF-W1-UX-02` | Option B accepted. | Team 08 source mapping now supports one combined Copilot-only `CF-W1-UX-02 + CF-W1-UX-05A` packet with exact backend/frontend/test reservations. |
| `CF-W1-UX-05` | Option A accepted. | `CF-W1-UX-05A` is no longer a standalone copy child; it should be folded into the combined `CF-W1-UX-02` Copilot packet. |
| `CF-W1-MD-01` | Option A accepted. | Market Data packet is now narrowed to a reject-only validation child with exact validator/test/doc reservations. Team 04 QA refresh still needs to reflect the deferred warning/evidence scenarios. |

## Docs-Only Architecture Prep Can Continue

- `CF-W1-L3-PORT-01B`: keep watchlist child blocked behind accepted `CF-W1-L3-PORT-01A`, but exact watchlist reservations are now prepared.
- `CF-W1-DQ-02`: route currentness-evidence packet to Team 04 QA prep first under the root upstream-dependency rule.
- `CF-W1-AUTH-02`: keep digest-consumer user isolation split into Team 09 and Team 08 child reservations; do not reopen alert repository ownership.
- `CF-W1-TP-02`: keep behind `CF-W1-TP-01B`; do not let broader semantics work collide with the active compatibility/DQ slice.
- `CF-W1-L3-INTEL-02`: keep behind accepted `CF-W1-L3-PORT-01A`; no dependency on `PORT-01B`; combine or sequence with `CF-W1-L3-INTEL-01` because the file set is the same.
- `CF-W1-SQLAB-01`: keep bounded to `signal-quality-lab` trust labeling; no route/schema/frontend scope in the first slice.
- `CF-W1-CAL-01`: keep bounded to `signal-calibration-engine`; depend on SQLAB/DQE public evidence only and do not widen into shared/source dependency changes.
- `CF-W1-L3-DQ-01`: continue child module contracts under approved Option B; portfolio/watchlist is prepared as `CF-W1-L3-PORT-01`.
- `CF-W1-L3-PORT-01`: route to Team 04 for child QA plan before implementation promotion.
- `CF-W1-TP-01B`: route to Team 04 for backend-only child QA refresh before implementation promotion.
- `CF-W1-L3-ALERT-01`: route to Team 04 for alert child QA refresh before implementation promotion.
- `CF-W1-L3-INTEL-01`: keep blocked until `CF-W1-L3-PORT-01A` implementation acceptance; do not promote before portfolio readiness DTOs exist.
- `CF-W1-UX-02`: keep as the combined Copilot-only `CF-W1-UX-02 + CF-W1-UX-05A` packet; preserve additive backend trust fields plus Copilot feature UI changes only.
- `CF-W1-MD-02`: route formal ADR draft to Team 00 / Architect / QA acceptance; no schema/source readiness.
- `CF-W1-MD-01`: keep narrowed to the reject-only validator child; defer missing-`adjustedClose` fallback evidence and zero/suspicious-volume warning evidence unless Team 00 opens a wider child.
- `CF-W1-UX-05`: keep `CF-W1-UX-05A` folded into the combined Copilot-only packet; keep shared UI reservation future.
- `CF-W1-AUTH-01`: refresh protected controller fail-closed packet under Option A.
- `CF-W1-SUB-01`: refresh admin/manual-only subscription packet under Option A.

## Ready Promotion Update - 2026-05-18

`CF-W1-L3-PORT-01A` was promoted by Team 00 for Team 07 implementation after the requirement, parent contract, Team 04 QA plan, Team 07 inspection, and exact portfolio-management reservations passed Ready gates. It is no longer in this architecture prep queue.

## Recommendation

No additional implementation item is architecture-ready now. Keep other items out of `12-ready-queue/ready-for-implementation.md` until a candidate has an accepted requirement, accepted architecture contract, accepted QA plan, exact file reservations, and no open Product Owner, Architect, shared-file, schema, route, package, provider, or upstream blocker.

Next Team 03 recommendation: route `CF-W1-DQ-02` to Team 04 QA prep first because it is the highest-leverage new upstream packet. Keep `CF-W1-L3-PORT-01B` blocked behind accepted `CF-W1-L3-PORT-01A`. After `CF-W1-MD-02` ADR acceptance, prepare `CF-W1-MD-02A` as a schema/migration proposal packet only if Team 00 and Architect explicitly authorize that approval-gated path.

## Team 03 Discovery Refresh - 2026-05-18

Prepared:

- `03-architecture/CF-W1-AUTH-02-architecture-review.md`
- `06-contracts/CF-W1-AUTH-02-alert-inbox-user-isolation-contract.md`
- `08-work-packets/CF-W1-AUTH-02-work-packet.md`
- `03-architecture/CF-W1-DQ-02-architecture-review.md`
- `06-contracts/CF-W1-DQ-02-dq-currentness-evidence-contract.md`
- `08-work-packets/CF-W1-DQ-02-work-packet.md`
- `03-architecture/CF-W1-TP-02-architecture-review.md`
- `06-contracts/CF-W1-TP-02-exit-invalidation-semantics-contract.md`
- `08-work-packets/CF-W1-TP-02-work-packet.md`
- `03-architecture/CF-W1-L3-PORT-01B-architecture-review.md`
- `06-contracts/CF-W1-L3-PORT-01B-watchlist-readiness-dto-contract.md`
- `08-work-packets/CF-W1-L3-PORT-01B-work-packet.md`

Result:

- `CF-W1-DQ-02` is the strongest new QA-prep candidate because it is upstream and bounded.
- `CF-W1-AUTH-02` is prepared as a digest-consumer packet, not a second alert-event ownership rewrite.
- `CF-W1-TP-02` is prepared as a future Trade Plan semantics packet and remains blocked behind `CF-W1-TP-01B`.
- `CF-W1-L3-PORT-01B` now has exact watchlist reservations, but it still depends on accepted `CF-W1-L3-PORT-01A` implementation semantics before independent Ready evaluation.
- `CF-W1-L3-INTEL-02` is prepared as a portfolio-intelligence traceability packet, depends on accepted `CF-W1-L3-PORT-01A`, does not depend on `CF-W1-L3-PORT-01B`, and shares the full file set with `CF-W1-L3-INTEL-01`.
- `CF-W1-SQLAB-01` is prepared as a bounded `signal-quality-lab` trust-state packet with exact service/type/doc/test reservations and no first-slice schema/route/provider/frontend blocker.
- `CF-W1-CAL-01` is prepared as a bounded `signal-calibration-engine` trust-state packet. Calibration owns the slice; SQLAB and DQE are non-blocking public-contract dependencies only.

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
