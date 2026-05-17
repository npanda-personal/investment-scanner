# Open Decisions

Date: 2026-05-18

## Current Open Decisions

No open decisions.

Product Owner action not required.

Daemon should continue autonomous work.

## Resolved This Cycle

| Decision ID | Resolution | Resolution Doc | Implementation Impact |
| --- | --- | --- | --- |
| DECISION-20260517-platform-auth-default-user-fallback-policy | Option A approved: protected Team 09 controllers fail closed when `req.user.id` is missing. | `07-decisions/DECISION-20260517-platform-auth-default-user-fallback-policy-resolution.md` | Removes the Decision Inbox blocker for `CF-W1-AUTH-01`; backend implementation still needs module-local architecture/QA refresh, exact controller/test reservations, and Team 00 Ready promotion. |
| DECISION-20260517-local-manual-subscription-plan-change-policy | Option A approved: ordinary users may not self-change plans or self-select `ADMIN`; admin/manual path remains the local route. | `07-decisions/DECISION-20260517-local-manual-subscription-plan-change-policy-resolution.md` | Removes the Decision Inbox blocker for `CF-W1-SUB-01`; backend implementation still needs module-local packet refresh and frontend mismatch recorded as a known limitation or separate UX item. |
| DECISION-20260517-copilot-trust-ux-policy | Option B approved: Copilot-only first slice, research-support naming, blocked narrative hidden, and no shared UI/navigation scope. | `07-decisions/DECISION-20260517-copilot-trust-ux-policy-resolution.md` | Removes the Decision Inbox blocker for `CF-W1-UX-02`; implementation still needs Copilot-only contract/QA refresh, source-supported trust-field mapping, exact file reservations, and Team 00 Ready promotion. |
| DECISION-20260517-ux-product-language-status-policy | Option A approved: Copilot-only copy cleanup after or with Copilot trust UX; no shared `StatusBadge`, Research Hub, or Market Data UI changes. | `07-decisions/DECISION-20260517-ux-product-language-status-policy-resolution.md` | Removes the Decision Inbox blocker for `CF-W1-UX-05`; first child should be Copilot-only and sequenced with `CF-W1-UX-02`; shared status-color work remains future. |
| DECISION-20260517-market-data-validation-hardening-policy | Option A approved: reject future-dated candles and invalid adjusted close; missing adjusted close is fallback/incomplete evidence; suspicious volume is warning evidence; spike rejection remains opt-in. | `07-decisions/DECISION-20260517-market-data-validation-hardening-policy-resolution.md` | Removes the Decision Inbox blocker for `CF-W1-MD-01`; source/test work still needs Market Data validation-only reservations, focused QA refresh, and no durable-storage/provider/schema scope. |

## Prior Resolved Decisions

| Decision ID | Resolution | Resolution Doc | Implementation Impact |
| --- | --- | --- | --- |
| DECISION-20260517-lane3-readiness-consumer-policy | Option B approved: passive `LIMITED` display with action-like blocking. | `07-decisions/DECISION-20260517-lane3-readiness-consumer-policy-resolution.md` | Removes the Decision Inbox blocker for `CF-W1-L3-DQ-01`; child slices still need exact contracts, QA scenarios, file reservations, and implementation handoffs. |
| DECISION-20260517-trade-plan-no-target-dq-hard-block | Option B approved: backend-only compatibility direction. | `07-decisions/DECISION-20260517-trade-plan-no-target-dq-hard-block-resolution.md` | Removes the Decision Inbox blocker for `CF-W1-TP-01A`; source work still needs refreshed backend-only child packet, QA scenarios, and exact reservations. |
| DECISION-20260517-market-data-durable-readiness-storage-adr | Option B approved as ADR direction only: companion durable readiness/evidence storage. | `07-decisions/DECISION-20260517-market-data-durable-readiness-storage-adr-resolution.md` | Removes the Decision Inbox blocker for `CF-W1-MD-02`; no Prisma/schema/source/test implementation is approved by this resolution. |
| DECISION-20260517-alert-event-ownership-model | Option B approved: parent `AlertRule` owner for first bounded backend slice. | `07-decisions/DECISION-20260517-alert-event-ownership-model-resolution.md` | `CF-W1-L3-AUTH-02` was implemented, validated, accepted, and committed locally as `503bcd9`. Direct `AlertEvent.userId` remains future schema work. |
| DECISION-20260517-trigger-object-contract-path | Option A approved: optional module-local Signal Generation trigger DTO projection only. | `07-decisions/DECISION-20260517-trigger-object-contract-path-resolution.md` | `CF-W1-SIG-TRIGGER-01` was implemented, validated, accepted, and committed locally as `6ab3999`. Persisted trigger snapshots remain future work. |
| DECISION-20260517-no-target-exit-invalidation-semantics | Option B-Strict approved for Strategy Decision no-target exit/invalidation semantics. | `07-decisions/DECISION-20260517-no-target-exit-invalidation-semantics-resolution.md` | Strategy Decision bounded slice was completed; Trade Plan compatibility remains separate through `CF-W1-TP-01B`. |

## Current Routing Result

No current workstream is blocked by a human Product Owner decision.

Items moved out of Decision Inbox blocker state but still not Ready:

- `CF-W1-AUTH-01`
- `CF-W1-SUB-01`
- `CF-W1-UX-02`
- `CF-W1-UX-05`
- `CF-W1-MD-01`

These items remain in refinement until their module-local contracts, QA plans, source/test evidence, exact file reservations, and Team 00 Ready promotion exist.

## Standing Authorization Reminder

Standing worktree, commit, and scoped push authorization to `dev` is recorded in `98-orchestrator/standing-delegation-policy.md`.

Push remains allowed only when all standing push gates pass. Force push and push to `main` or `master` are forbidden.
