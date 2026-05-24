# Blocked By Upstream Dependency

Date: 2026-05-18

| ID | Blocked item | Upstream dependency |
| --- | --- | --- |
| CF-W1-TSC-01 | Trusted Signal Candidate Workflow on `/today-review` | Parent remains routed through split child `CF-W1-TSC-01A`. The Team 06 Signal Generation bridge child is promoted first; the Team 07 Today Review adoption child remains blocked until the bridge is accepted. |
| CF-W1-TSC-01A-TREV | Today Review trusted candidate adoption | Blocked until `CF-W1-TSC-01A-SIG` is accepted, committed, and available as the implementation base. |
| CF-W1-BT-01 | Backtesting DQ fail-closed behavior | DQ fail-closed policy and signal/strategy trust policy |
| CF-W1-TP-01 | Trade Plan DQ hard blockers and no-target migration | Backend-only child contract, Team 03 reservation matrix, Team 06 inspection, and child QA plan are prepared as `CF-W1-TP-01B`; still needs Team 00 Ready promotion |
| CF-W1-L3-ALERT-01 | Alert readiness consumer tests | Child architecture contract, Team 03 reservation matrix, exact backend file reservations, and child QA plan are prepared; still needs Team 00 Ready promotion |
| CF-W1-L3-PORT-01B | Watchlist readiness DTOs | Parent contract and QA plan exist, but this child waits behind the first portfolio-only slice unless Team 00 records a combined backend-only exception |
| CF-W1-L3-AUTH-03 | Alert rule target ownership implementation | Requirement, architecture review, contract, QA plan, and work packet are prepared; still needs Team 00 Ready promotion |
| CF-W1-L3-INTEL-01 | Portfolio Intelligence reliability gate | Requirement, architecture review, contract, work packet, QA plan, and Team 03 architecture signoff are prepared, but implementation must wait for accepted `CF-W1-L3-PORT-01A` portfolio readiness DTOs and Team 00 Ready promotion |
| CF-W1-QA-UI-01 | Copilot/research Playwright trust states | UX trust contract and approved UI scope |
| CF-W1-UX-01 | Stock Research Workbench trust surfaces parent | Parent still needs a later backend trust-evidence child for verified scope, DQ readiness, blocker provenance, latest trusted data date, and downstream eligibility. Narrowed frontend-only `CF-W1-UX-01A` is promoted separately. |
| CF-W1-NOTIF-02 | Notification log preview redaction validation | Notification privacy requirement, architecture review, contract, work packet, platform QA plan, and Team 03 reservation matrix are prepared; still needs Team 00/Team 09 Ready promotion |
| CF-W1-AUTH-01 | Platform authenticated controller fallback hardening | Promoted through combined Ready handoff `CF-W1-AUTH-SUB-01` with Team 09 as the single writer for the overlapping subscription files. |
| CF-W1-SUB-01 | Local/manual subscription plan-change hardening | Promoted through combined Ready handoff `CF-W1-AUTH-SUB-01` with Team 09 as the single writer for the overlapping subscription files. |
| CF-W1-UX-02 | Copilot trust UX implementation | Option B policy is resolved; Team 03 Copilot-only contract/work packet and Team 04 QA refresh are prepared; still needs Team 08 source-supported trust-field mapping, exact handoff, and Team 00 Ready promotion |
| CF-W1-UX-05 | Copilot-only product-language cleanup | Option A policy is resolved; Team 03 contract/work packet and Team 04 QA refresh are prepared; needs sequencing with or folding into `CF-W1-UX-02`, exact handoff, and no shared `StatusBadge` scope |
| CF-W1-MD-01 | Market Data validation hardening | Option A policy is resolved; Team 03 validation-only contract/work packet and Team 04 QA refresh are prepared; needs Team 05 readiness acceptance, Team 00 Ready promotion, and no durable-storage/provider/schema scope |

## Team 00 Routing Note - 2026-05-18

Team 01's audit found no current packet overclaiming implementation readiness.

Next parallel readiness inspections:

- Team 07 inspects whether `CF-W1-L3-PORT-01A` can become module-local implementation-ready.
- Team 06 inspects whether `CF-W1-TP-01B` can become module-local implementation-ready.
- Team 09 inspects whether `CF-W1-NOTIF-02` can become module-local implementation-ready.
- Team 03 and Team 04 prepare readiness/file-reservation/QA confirmation for `CF-W1-L3-PORT-01A`, `CF-W1-TP-01B`, `CF-W1-NOTIF-02`, and `CF-W1-L3-ALERT-01`.

## Team 00 Decision Resolution Note - 2026-05-18

The five former Decision Inbox items are resolved. They are no longer Product Owner blockers, but each still has upstream readiness work before source/test edits:

- `CF-W1-AUTH-01` and `CF-W1-SUB-01`: Team 03/04 packet and QA refreshes are prepared; Team 09 handoff and Team 00 Ready promotion remain.
- `CF-W1-UX-02` and `CF-W1-UX-05`: Team 03/04 packet and QA refreshes are prepared; Team 08 source mapping/sequencing and Team 00 Ready promotion remain.
- `CF-W1-MD-01`: Team 03/04 packet and QA refreshes are prepared; Team 05 readiness acceptance and Team 00 Ready promotion remain.

## Team 00 Ready Promotion Note - 2026-05-18

`CF-W1-L3-PORT-01A` is no longer blocked by upstream readiness gates. Team 00 promoted it to `Ready for Implementation` after verifying the requirement, architecture review, contract, QA plan, Team 03 exact reservations, Team 07 readiness evidence, and open-decision state.

`CF-W1-L3-PORT-01B` remains upstream-blocked behind the accepted portfolio-only slice. `CF-W1-L3-INTEL-01` remains blocked until `CF-W1-L3-PORT-01A` is implemented, validated, reviewed, accepted, and committed.

## Team 00 Ready Promotion Note - 2026-05-18 - Today Review

`CF-W1-L3-TREV-01` is no longer blocked by upstream readiness gates. Team 00 promoted it to `Ready for Implementation` after verifying the requirement, architecture review, contract, work packet, QA plan, open-decision state, and exact Today Review file reservations.

Candidate-detail run-evidence expansion remains upstream-blocked as a future child packet.
