# Next Top 10 Candidates

Date: 2026-05-17

Prepared by Team 02 Requirement Factory in daemon scheduler mode.

## Current Top 10

| Rank | ID | Next gate | Notes |
| --- | --- | --- | --- |
| 1 | CF-W1-TP-01A | Architecture contract + QA plan + Product decision | Trade Plan no-target compatibility and DQ hard-block requirement is refined, but not code-ready. |
| 2 | CF-W1-L3-DQ-01 | Product/Architect policy decision + architecture contract | Parent Lane 3 display-vs-action readiness policy. |
| 3 | CF-W1-L3-AUTH-01 | Architecture contract + QA plan | Portfolio/watchlist child ownership contract and tests. |
| 4 | CF-W1-L3-AUTH-02 | Product/Architect ownership decision | Alert event ownership contract. |
| 5 | CF-W1-L3-ALERT-01 | Wait for `CF-W1-L3-DQ-01` | Alert readiness suppression tests after Lane 3 contract. |
| 6 | CF-W1-UX-02 | Product/UX decision + architecture contract + QA plan | Copilot/research trust UX requirement is refined, but not code-ready. |
| 7 | CF-W1-UX-05 | Product/UX copy decision | Research-support copy pass contract. |
| 8 | CF-W1-MD-02 | ADR / architecture contract | Durable Market Data readiness evidence ADR. |
| 9 | CF-W1-MD-01 | Validation policy + QA plan | Market Data validation hardening policy and QA plan. |
| 10 | CF-W1-SIG-TRIGGER-01 | Architecture contract | Full trigger object contract completion. |

## Completed Or Removed From Active Top 10

- `CF-W1-QA-01` completed as documentation-only focused command matrix.
- `CF-W2-DQ-01` completed Data Quality fail-closed defaults.
- `CF-W2-SIG-01A` completed bounded run-path DQ fail-closed behavior.
- `CF-W1-SIG-01B` completed trusted signal list read-path filtering.
- `CF-W1-SIG-LATEST-01` completed latest-instrument DQ gating.
- `CF-W1-STRAT-01` completed as bounded Strategy Decision Option B-Strict compatibility.
- `CF-W1-SIG-01`, `CF-W1-DQ-01`, and `CF-W1-TP-01` are legacy parent/superseded items and should not be treated as active implementation work.

## Product Agent Recommendation

Do not pull application-code work until a current item has an accepted requirement, accepted contract or architecture review, exact file reservation, QA plan, and no unresolved Product Owner, Architect, QA, shared-file, or upstream blocker.
