# Top 10 Candidate Queue

Date: 2026-05-17

Status: Factory Wave 1 candidate ranking.

Important: this is a top-candidate list, not proof of implementation readiness. See `12-ready-queue/ready-for-implementation.md` for actual implementation-ready items.

| Rank | ID | Candidate | Severity | Current readiness | Reason |
| --- | --- | --- | --- | --- | --- |
| 1 | CF-W1-SIG-01 | Signal Generation DQ fail-closed trusted runs | P0 | Blocked by Product Owner + Architect decision | First downstream trust gate after accepted DQ/Market Data characterization. |
| 2 | CF-W1-STRAT-01 | Remove arbitrary target-price semantics | P0 | Blocked by Product Owner decision | Direct root `AGENTS.md` conflict; affects product trust language. |
| 3 | CF-W1-MD-02 | Durable Market Data readiness evidence ADR | P0 | Architecture docs-ready | Needed before schema/storage changes. |
| 4 | CF-W1-DQ-01 | Data Quality fail-closed defaults | P0 | Blocked by Product Owner + Architect decision | Global downstream safety policy. |
| 5 | CF-W1-L3-AUTH-01 | Portfolio/watchlist child ownership tests and fix | P0 | Needs Architecture Contract | User-owned data safety risk. |
| 6 | CF-W1-L3-ALERT-01 | Alert readiness consumer tests | P0 | Blocked by upstream signal DQ dependency | Alerts are highest-risk user-facing leak path. |
| 7 | CF-W1-MD-01 | Market Data validation hardening tests | P1 | Needs QA plan and likely source decision | Upstream validation gap. |
| 8 | CF-W1-BT-01 | Backtesting DQ fail-closed characterization | P1 | Blocked by upstream DQ policy | Prevents unreliable historical conclusions. |
| 9 | CF-W1-TP-01 | Trade Plan DQ hard blockers | P1 | Blocked by target/DQ decisions | Prevents untrusted paper-review plans. |
| 10 | CF-W1-UX-02 | Copilot trust UX contract | P1 | Needs Product Refinement | Prevents deterministic summaries from overclaiming reliability. |

## Implementation-Ready Result

No code implementation item is ready in Wave 1.

The only ready item is documentation-only:
- `CF-W1-QA-01` focused test command matrix.

It was not selected for code implementation because the user requested implementation teams pull safe work packets, and this item is factory documentation rather than application implementation.

