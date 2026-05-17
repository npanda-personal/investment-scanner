# Next Top 10 Candidates

Date: 2026-05-17

Prepared by Team 02 Requirement Factory in daemon scheduler mode after prior bounded decision items were resolved, after the 2026-05-17 Product Owner resolutions for Lane 3 readiness, Trade Plan no-target/DQ hard-block behavior, and Market Data durable readiness ADR direction, and after Team 03/04 post-decision child prep. Refreshed for the current daemon cycle after cross-checking module audits, active board, risk register, ready/blocked queues, next architecture contracts, next validation plans, and open Decision Inbox entries.

## Current Top Candidates

There are ten active candidates after removing completed bounded slices from the pull path.

| Rank | ID | Next gate | Notes |
| --- | --- | --- | --- |
| 1 | CF-W1-L3-PORT-01 | Team 00 child selection + Ready evaluation | Portfolio/watchlist readiness DTO contract, backend reservations, and QA plan are prepared, but no app-code slice is Ready until Team 00 gates pass. |
| 2 | CF-W1-L3-AUTH-03 | Team 00 Ready evaluation | Alert rule target ownership requirement, architecture review, contract, work packet, and QA plan are prepared, but no app-code slice is Ready until Team 00 gates pass. |
| 3 | CF-W1-L3-ALERT-01 | Team 00 Ready evaluation | Alert readiness suppression contract, backend reservations, and QA plan are prepared, but no app-code slice is Ready until Team 00 gates pass. |
| 4 | CF-W1-TP-01B | Team 00 Ready evaluation | Trade Plan backend compatibility/DQ hard-block contract, backend reservations, and QA plan are prepared, but no app-code slice is Ready until Team 00 gates pass. |
| 5 | CF-W1-NOTIF-02 | Team 00/Team 09 Ready evaluation | Requirement, architecture, contract, work packet, and platform QA plan exist, but no app-code slice is Ready until exact promotion and handoff. |
| 6 | CF-W1-MD-02 | Formal ADR + ADR QA checklist | Option B ADR direction is accepted. Schema/source implementation remains blocked until separate approval-gated slices are prepared. |
| 7 | CF-W1-MD-01 | Decision Inbox resolution | Market Data validation hardening requirement and QA plan exist; source/test execution is blocked by validation-policy decision. |
| 8 | CF-W1-UX-02 | Decision Inbox resolution | Copilot trust UX decision is open and blocks implementation. |
| 9 | CF-W1-AUTH-01 | Decision Inbox resolution | Platform auth fallback policy is open and blocks implementation. |
| 10 | CF-W1-SUB-01 | Decision Inbox resolution | Local subscription plan-change policy is open and blocks implementation. |

## Focused Priority Readiness Result

These are the current Team 02 priorities. None is app-code ready.

| ID | What is proven | What is missing | Current disposition |
| --- | --- | --- | --- |
| CF-W1-L3-PORT-01 | Parent policy accepted; child architecture contract, backend reservations, and QA plan exist. | Team 00 child slice selection and Ready promotion. | Keep out of Ready until Team 00 gates pass. |
| CF-W1-L3-AUTH-03 | Requirement, architecture review, contract, work packet, and QA plan exist. | Team 00 Ready promotion and implementation handoff. | Keep out of Ready until Team 00 gates pass. |
| CF-W1-L3-ALERT-01 | Parent policy accepted; child architecture contract, backend reservations, and QA plan exist. | Team 00 Ready promotion and implementation handoff. | Keep out of Ready until Team 00 gates pass. |
| CF-W1-TP-01B | Parent policy accepted; backend-only child architecture contract, backend reservations, and QA plan exist. | Team 00 Ready promotion and implementation handoff. | Keep out of Ready until Team 00 gates pass. |
| CF-W1-NOTIF-02 | Requirement, architecture, contract, work packet, and platform QA plan exist. | Team 00/Team 09 Ready promotion and implementation handoff. | Keep out of Ready until promotion gates pass. |
| CF-W1-MD-02 | Requirement, draft contract, ADR QA plan, and Option B ADR direction acceptance exist. | Formal ADR, migration/rollback/query/test strategy, and later source/schema work packet. | Keep in ADR prep; source/schema work blocked by shared-file gates. |

## Next Docs-Only Prep / Ready-Evaluation Candidates

These items are not app-code ready. Some are ready-evaluation candidates; decision-blocked items remain docs-only until the decision resolves.

| Rank | ID | Prep gate | Guardrail |
| --- | --- | --- | --- |
| 1 | CF-W1-L3-PORT-01 | Team 00 child selection and Ready evaluation | No portfolio/watchlist source changes until Team 00 gates pass. |
| 2 | CF-W1-L3-AUTH-03 | Team 00 Ready evaluation | No alerts source changes until Team 00 gates pass. |
| 3 | CF-W1-L3-ALERT-01 | Team 00 Ready evaluation | No alerts source changes until Team 00 gates pass. |
| 4 | CF-W1-TP-01B | Team 00 Ready evaluation | No Trade Plan source changes until Team 00 gates pass. |
| 5 | CF-W1-NOTIF-02 | Team 00/Team 09 Ready evaluation | No notification source changes until promotion gates pass. |
| 6 | CF-W1-MD-02 | Formal ADR and ADR QA checklist | No Prisma, schema, source, provider, startup, or test changes until separate implementation approval. |
| 7 | CF-W1-MD-01 | Product Owner/Architect/QA validation-policy decision | No Market Data source/test changes until policy is accepted. |

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

Do not pull application-code work until a current item has an accepted requirement, accepted child contract or architecture review, exact file reservation, QA plan, and no unresolved Product Owner, Architect, QA, shared-file, schema, provider, UI, or upstream blocker. The resolved decisions are policy inputs only; they do not satisfy Ready criteria by themselves. Team 00 remains the only owner for Ready queue updates.

`CF-W1-UX-05` remains active and decision-blocked outside the current top ten; it should re-enter the top list after its first target surface and shared UI policy are resolved or if Copilot copy cleanup is merged into the approved `CF-W1-UX-02` path.
