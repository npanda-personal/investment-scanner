# Ready For Implementation

Date: 2026-05-17

## Current Ready Queue

No active application-code item is currently Ready for Implementation.

`CF-W1-L3-AUTH-01` was pulled by Team 07, implemented, validated, reviewed, accepted under standing delegation, committed locally as `74ba6dd`, and moved out of the live ready queue.

`CF-W1-L3-AUTH-02` was unblocked by Product Owner Option B, implemented, validated, reviewed, accepted under standing delegation, committed locally as `503bcd9`, and moved out of the live ready queue.

`CF-W1-SIG-TRIGGER-01` was unblocked by Product Owner Option A, implemented as an additive DTO projection, validated, reviewed, accepted under standing delegation, committed locally as `6ab3999`, and moved out of the live ready queue.

Product Owner resolved the three current Decision Inbox items on 2026-05-17:

- `CF-W1-L3-DQ-01`: Option B, passive `LIMITED` display with action-like blocking.
- `CF-W1-TP-01A`: Option B, backend-only compatibility direction.
- `CF-W1-MD-02`: Option B as ADR direction only, companion durable readiness/evidence storage.

Those decisions remove the Decision Inbox blockers, but they are not app-code implementation handoffs. The affected items still need post-decision child contracts, refreshed QA scenarios, exact file reservations, and Team 00 Ready promotion before any app-code team can pull them.

Post-decision child prep has advanced, but still has not produced an app-code Ready item:

- `CF-W1-L3-PORT-01`: portfolio/watchlist readiness DTO child architecture contract, exact backend reservations, and child QA plan are prepared; still needs Team 00 child selection and Ready promotion.
- `CF-W1-L3-ALERT-01`: alert readiness suppression child architecture contract, exact backend reservations, and child QA plan are prepared; still needs Team 00 Ready promotion.
- `CF-W1-L3-AUTH-03`: alert rule target ownership requirement, architecture review, contract, work packet, and QA plan are prepared; still needs Team 00 Ready promotion.
- `CF-W1-L3-INTEL-01`: portfolio-intelligence reliability requirement, architecture review, contract, work packet, QA plan, and Team 03 signoff are prepared; still blocked until `CF-W1-L3-PORT-01A` is accepted and Team 00 promotes the child.
- `CF-W1-TP-01B`: Trade Plan backend-only compatibility/DQ hard-block child architecture contract, exact backend reservations, and child QA plan are prepared; still needs Team 00 Ready promotion.
- `CF-W1-NOTIF-02`: notification log redaction requirement, architecture review, contract, work packet, and platform QA plan are prepared; still needs Team 00/Team 09 Ready promotion.

Five policy/validation/UX items are blocked by open Decision Inbox entries and are not Ready:

- `CF-W1-AUTH-01`: authenticated controller `default-user` fallback policy.
- `CF-W1-SUB-01`: local/manual subscription plan-change policy.
- `CF-W1-UX-02`: Copilot trust UX naming, blocked-summary visibility, trust-field requirements, and Stock Research inclusion policy.
- `CF-W1-UX-05`: first product-language/status cleanup target and shared UI reservation policy.
- `CF-W1-MD-01`: Market Data validation policy for future-dated candles, adjusted close, suspicious volume, and spike handling.

## Completed Slices Not Active For Pull

The following are completed, superseded, or split and must not be treated as active implementation work:

- `CF-W2-DQ-01`
- `CF-W2-SIG-01A`
- `CF-W1-SIG-01B`
- `CF-W1-SIG-LATEST-01`
- `CF-W1-STRAT-01`
- `CF-W1-QA-01`
- `CF-W1-L3-AUTH-01`
- `CF-W1-L3-AUTH-02`
- `CF-W1-SIG-TRIGGER-01`
- legacy parent `CF-W1-SIG-01`
- legacy parent/superseded `CF-W1-DQ-01`
- legacy parent `CF-W1-TP-01`

## Why No Code Item Was Pulled

The current top findings still require at least one of:

- UX decision,
- refreshed Architect child contract or ADR record,
- exact module-level file reservation,
- refreshed QA scenario matrix,
- source-changing implementation packet,
- schema/migration approval for future Market Data storage work,
- UI product decision,
- shared-file reservation,
- upstream dependency completion,
- focused QA plan.

Forcing implementation now would either preserve unsafe behavior with misleading tests or skip the required child-slice gates after Product Owner policy resolution.

## Next Safe Work

Docs-only contract and QA preparation:

- `CF-W1-L3-PORT-01`
- `CF-W1-L3-ALERT-01`
- `CF-W1-L3-AUTH-03`
- `CF-W1-L3-INTEL-01`
- `CF-W1-TP-01B`
- `CF-W1-UX-02`
- `CF-W1-MD-02`
- `CF-W1-MD-01`
- `CF-W1-NOTIF-02`

Next Team 00/owner work should evaluate the prepared child artifacts for Ready promotion:

- `CF-W1-L3-PORT-01`: select and promote the portfolio/watchlist readiness DTO child if the prepared contract and QA plan pass Ready gates.
- `CF-W1-L3-ALERT-01`: promote the alert readiness suppression child if the prepared contract and QA plan pass Ready gates.
- `CF-W1-L3-AUTH-03`: promote the alert rule target ownership child if the prepared requirement, contract, work packet, and QA plan pass Ready gates.
- `CF-W1-L3-INTEL-01`: keep queued behind `CF-W1-L3-PORT-01A`; promote only after portfolio readiness DTOs are implemented and accepted.
- `CF-W1-TP-01B`: promote the backend-only Trade Plan compatibility and DQ hard-block child if the prepared contract and QA plan pass Ready gates.
- `CF-W1-NOTIF-02`: promote the notification log redaction slice if the prepared requirement, contract, work packet, and platform QA plan pass Ready gates.
- `CF-W1-MD-02`: formal ADR and later approval-gated source/schema split packets.

No app-code item became Ready during decision resolution or post-decision child prep.

## Ready Criteria Reminder

Move an app-code item here only when all of the following are proven:

- accepted requirement,
- accepted architecture contract or architecture review,
- accepted QA plan,
- exact allowed and forbidden file reservations,
- no unresolved Product Owner, Architect, QA, shared-file, schema, route, package, provider, or upstream blocker,
- local-first and zero-incremental-cost constraints preserved.
