# Next Top 10 Candidates

Date: 2026-05-17

Prepared by Team 02 Requirement Factory in daemon scheduler mode after prior bounded decision items were resolved, after the 2026-05-17 Product Owner resolutions for Lane 3 readiness, Trade Plan no-target/DQ hard-block behavior, and Market Data durable readiness ADR direction, and after Team 03/04 post-decision child prep. Refreshed by Team 00 on 2026-05-18 after Product Owner resolved the five current Decision Inbox items and after Team 00 promoted `CF-W1-L3-PORT-01A`.

## Current Top Candidates

There are nine active refinement candidates after removing completed bounded slices and the promoted `CF-W1-L3-PORT-01A` implementation handoff from the pull path.

| Rank | ID | Next gate | Notes |
| --- | --- | --- | --- |
| 1 | CF-W1-TP-01B | Team 00 Ready evaluation | Trade Plan backend compatibility/DQ hard-block contract, Team 03 reservation matrix, backend reservations, QA plan, and Team 06 readiness inspection are prepared, but no app-code slice is Ready until Team 00 gates pass. |
| 2 | CF-W1-NOTIF-02 | Team 00/Team 09 Ready evaluation | Requirement, architecture, contract, work packet, platform QA plan, and Team 03 reservation matrix exist, but no app-code slice is Ready until exact promotion and handoff. |
| 3 | CF-W1-L3-ALERT-01 | Team 00 Ready evaluation | Alert readiness suppression contract, Team 03 reservation matrix, backend reservations, and QA plan are prepared, but no app-code slice is Ready until Team 00 gates pass. |
| 4 | CF-W1-L3-AUTH-03 | Team 00 Ready evaluation | Alert rule target ownership requirement, architecture review, contract, work packet, and QA plan are prepared, but no app-code slice is Ready until Team 00 gates pass. |
| 5 | CF-W1-MD-02 | Formal ADR + ADR QA checklist | Option B ADR direction is accepted. Schema/source implementation remains blocked until separate approval-gated slices are prepared. |
| 6 | CF-W1-MD-01 | Team 05/03/04 packet refresh | Option A validation policy is resolved; source/test execution still needs validation-only file reservations and Team 00 Ready promotion. |
| 7 | CF-W1-UX-02 | Team 08/03/04 packet refresh | Option B Copilot trust UX policy is resolved; implementation still needs Copilot-only trust-field contract/QA/file reservations. |
| 8 | CF-W1-AUTH-01 | Team 09/03/04 packet refresh | Option A auth fallback policy is resolved; implementation still needs module-local controller/test reservations. |
| 9 | CF-W1-SUB-01 | Team 09/03/04 packet refresh | Option A subscription policy is resolved; implementation still needs backend-only reservations and frontend limitation handling. |

## Focused Priority Readiness Result

These are the current Team 02 priorities. None is app-code ready.

| ID | What is proven | What is missing | Current disposition |
| --- | --- | --- | --- |
| CF-W1-L3-PORT-01A | Parent policy accepted; portfolio-only requirement, parent architecture contract, Team 03 reservation matrix, backend reservations, QA plan, and Team 07 readiness inspection exist. | None for Ready promotion. Team 07 implementation now begins. | Promoted to Ready by Team 00 on 2026-05-18. |
| CF-W1-TP-01B | Parent policy accepted; backend-only child architecture contract, Team 03 reservation matrix, backend reservations, QA plan, and Team 06 readiness inspection exist. | Team 00 Ready promotion and implementation handoff. | Keep out of Ready until Team 00 gates pass. |
| CF-W1-NOTIF-02 | Requirement, architecture, contract, work packet, platform QA plan, and Team 03 reservation matrix exist. | Team 00/Team 09 Ready promotion and implementation handoff. | Keep out of Ready until promotion gates pass. |
| CF-W1-L3-ALERT-01 | Parent policy accepted; child architecture contract, Team 03 reservation matrix, backend reservations, and QA plan exist. | Team 00 Ready promotion and implementation handoff. | Keep out of Ready until Team 00 gates pass. |
| CF-W1-L3-AUTH-03 | Requirement, architecture review, contract, work packet, and QA plan exist. | Team 00 Ready promotion and implementation handoff. | Keep out of Ready until Team 00 gates pass. |
| CF-W1-MD-02 | Requirement, draft contract, ADR QA plan, and Option B ADR direction acceptance exist. | Formal ADR, migration/rollback/query/test strategy, and later source/schema work packet. | Keep in ADR prep; source/schema work blocked by shared-file gates. |

## Next Docs-Only Prep / Ready-Evaluation Candidates

These items are not app-code ready. Some are ready-evaluation candidates; policy-resolved items remain docs-only until contract/QA/reservation refresh completes.

| Rank | ID | Prep gate | Guardrail |
| --- | --- | --- | --- |
| 1 | CF-W1-TP-01B | Team 00 Ready evaluation | No Trade Plan source changes until Team 00 gates pass. |
| 2 | CF-W1-NOTIF-02 | Team 00/Team 09 Ready evaluation | No notification source changes until promotion gates pass. |
| 3 | CF-W1-L3-ALERT-01 | Team 00 Ready evaluation | No alerts source changes until Team 00 gates pass. |
| 4 | CF-W1-L3-AUTH-03 | Team 00 Ready evaluation | No alerts source changes until Team 00 gates pass. |
| 5 | CF-W1-MD-02 | Formal ADR and ADR QA checklist | No Prisma, schema, source, provider, startup, or test changes until separate implementation approval. |
| 6 | CF-W1-MD-01 | Market Data validation-only packet refresh | No Market Data source/test changes until exact validation file reservations and Team 00 promotion exist. |
| 7 | CF-W1-UX-02 | Copilot-only trust UX packet refresh | No Copilot source/UI/test changes until exact trust-field contract, QA plan, and file reservations exist. |
| 8 | CF-W1-AUTH-01 | Team 09 fail-closed controller packet refresh | No platform source/test changes until exact controller/test reservations and focused QA plan exist. |
| 9 | CF-W1-SUB-01 | Team 09 admin/manual subscription packet refresh | No subscription source/test changes until exact backend reservations and known UI limitation handling exist. |

## Completed Or Removed From Active Top 10

- `CF-W1-QA-01` completed as documentation-only focused command matrix.
- `CF-W2-DQ-01` completed Data Quality fail-closed defaults.
- `CF-W2-SIG-01A` completed bounded run-path DQ fail-closed behavior.
- `CF-W1-SIG-01B` completed trusted signal list read-path filtering.
- `CF-W1-SIG-LATEST-01` completed latest-instrument DQ gating.
- `CF-W1-STRAT-01` completed as bounded Strategy Decision Option B-Strict compatibility.
- `CF-W1-L3-AUTH-01` completed portfolio/watchlist child ownership implementation and was committed locally as `74ba6dd`.
- `CF-W1-L3-AUTH-02` completed bounded alert event ownership and was committed locally as `503bcd9`.
- `CF-W1-SIG-TRIGGER-01` completed bounded optional Signal Generation trigger DTO projection and was committed locally as `6ab3999`.
- `CF-W1-SIG-01`, `CF-W1-DQ-01`, and `CF-W1-TP-01` are legacy parent/superseded items and should not be treated as active implementation work.

## Product Agent Recommendation

Do not pull application-code work except the Team 00-promoted `CF-W1-L3-PORT-01A` handoff until another current item has an accepted requirement, accepted child contract or architecture review, exact file reservation, QA plan, and no unresolved Product Owner, Architect, QA, shared-file, schema, provider, UI, or upstream blocker. The resolved decisions are policy inputs only; they do not satisfy Ready criteria by themselves. Team 00 remains the only owner for Ready queue updates.

`CF-W1-L3-PORT-01` remains the parent portfolio/watchlist requirement and `CF-W1-L3-PORT-01B` remains the later watchlist child. `CF-W1-UX-05` remains active outside the current top ten; its approved first slice is Copilot-only and should re-enter after `CF-W1-UX-02` packet refresh or be merged into that approved Copilot path. Shared `StatusBadge` work remains future.
