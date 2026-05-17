# Open Decisions

Date: 2026-05-17

| Decision ID | Title | Owner Needed | Severity | Affected Module | Status | Created Date | Blocks Which Work | Parallel Work Still Available |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DECISION-20260517-lane3-readiness-consumer-policy | Lane 3 readiness display-vs-action policy | Product Owner + Architect + QA | High | Portfolio / Watchlists / Alerts / Portfolio Intelligence / Copilot | Open | 2026-05-17 | `CF-W1-L3-DQ-01`, `CF-W1-L3-ALERT-01`, portfolio/watchlist readiness DTOs, portfolio-intelligence reliability gates, copilot Lane 3 trust consumers | Unrelated audits, requirement refinement, architecture prep, QA planning, Market Data validation policy, Trade Plan docs. |
| DECISION-20260517-trade-plan-no-target-dq-hard-block | Trade Plan no-target compatibility and DQ hard-block policy | Product Owner + Architect + QA | High | `trade-plan-risk-engine` | Open | 2026-05-17 | `CF-W1-TP-01A`, broader `CF-W1-TP-01` Trade Plan migration | Market Data, Lane 3 readiness, UX trust, audits, requirements, architecture, and QA prep. |
| DECISION-20260517-market-data-durable-readiness-storage-adr | Durable Market Data readiness evidence storage ADR direction | Product Owner + Architect + QA | High | `market-data-foundation` / `data-quality-engine` handoff | Open | 2026-05-17 | `CF-W1-MD-02` source/schema/test implementation and downstream durable evidence claims | `CF-W1-MD-01` validation policy prep, Lane 3 readiness policy, Trade Plan docs, audits, requirements, QA prep. |

Product Owner action required: yes for the three affected workstreams only.

Last verified by Team 00 master orchestration intake on 2026-05-17: three open decisions.

Standing worktree, commit, and scoped push authorization to `dev` is recorded in `98-orchestrator/standing-delegation-policy.md`; it is not an open decision.

Resolved this cycle:

- `DECISION-20260517-alert-event-ownership-model`: resolved as Option B, parent `AlertRule` owner for the first bounded backend slice.
- `DECISION-20260517-trigger-object-contract-path`: resolved as Option A, optional module-local Signal Generation trigger DTO projection only.

Only affected workstreams are blocked. All independent work continues.
