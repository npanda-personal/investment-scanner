# Next Top 10 Candidates

Date: 2026-05-17

Prepared by Team 02 Requirement Factory in daemon scheduler mode after the two prior Decision Inbox items were resolved and committed.

## Current Top Candidates

There are fewer than ten active candidates after removing completed bounded slices from the pull path.

| Rank | ID | Next gate | Notes |
| --- | --- | --- | --- |
| 1 | CF-W1-L3-DQ-01 | Product/Architect policy decision + architecture contract + QA plan | Parent Lane 3 display-vs-action readiness policy. High unblock value for alerts, portfolio/watchlist, portfolio intelligence, research, and copilot trust surfaces. |
| 2 | CF-W1-TP-01A | Architecture contract + QA plan + Product decision | Trade Plan no-target compatibility and DQ hard-block requirement is refined, but not code-ready. |
| 3 | CF-W1-L3-ALERT-01 | Wait for `CF-W1-L3-DQ-01`; then architecture + QA handoff | Alert ownership backend slice is committed; readiness suppression remains blocked by Lane 3 readiness policy. |
| 4 | CF-W1-UX-02 | Product/UX decision + architecture contract + QA plan | Copilot/research trust UX requirement is refined, but not code-ready. |
| 5 | CF-W1-MD-02 | ADR / architecture contract + ADR QA checklist | Durable Market Data readiness evidence ADR. |
| 6 | CF-W1-MD-01 | Validation policy + QA plan | Market Data validation hardening policy and QA plan. |
| 7 | CF-W1-UX-05 | Product/UX copy decision | Research-support copy pass contract. |
| 8 | CF-W1-BT-01 | Upstream DQ and strategy trust policy | Backtesting DQ fail-closed characterization. |

## Next Non-Blocked Candidates For Architecture / QA Prep

These items are not app-code ready.

| Rank | ID | Prep gate | Guardrail |
| --- | --- | --- | --- |
| 1 | CF-W1-L3-DQ-01 | Product policy options, architecture contract, and QA scenarios | No portfolio/watchlist/alerts/source changes until display-vs-action policy and file reservations are accepted. |
| 2 | CF-W1-TP-01A | Architecture contract and QA plan | Product/Architect target replacement and DQ hard-block semantics still required before source work. |
| 3 | CF-W1-MD-02 | ADR packet and ADR QA checklist | No Prisma, schema, source, provider, startup, or test changes until ADR approval. |
| 4 | CF-W1-MD-01 | Validation policy and QA plan | No Market Data source/test changes until policy is accepted. |

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

Do not pull application-code work until a current item has an accepted requirement, accepted contract or architecture review, exact file reservation, QA plan, and no unresolved Product Owner, Architect, QA, shared-file, or upstream blocker.
