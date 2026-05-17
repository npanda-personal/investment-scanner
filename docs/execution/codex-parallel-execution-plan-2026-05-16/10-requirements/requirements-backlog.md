# Requirements Backlog

Date: 2026-05-17

Status: Continuous Parallel Execution Factory Wave 1 backlog.

## Intake Rules

Statuses use the active board state model:
- Backlog Candidate
- Needs Product Refinement
- Needs Architecture Contract
- Needs QA Plan
- Ready for Implementation
- Blocked
- Deferred

No candidate is implementation-ready unless the ready queue says so.

## Candidates

| ID | Title | Product value | Module/team | Lane | Severity | Dependencies | Allowed files | Forbidden files | Shared-file risk | Architecture contract | QA plan | Parallel-safe | Stop conditions | Acceptance criteria | Model/reasoning | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CF-W1-SIG-01 | Signal Generation DQ fail-closed trusted runs | Prevent untrusted data from becoming rule-based signals | Signal Generation Engine | Lane 2 | P0 | DQ readiness contract | `backend/src/modules/signal-generation-engine/**`, module tests | shared files, routes, Prisma, package, providers, UI | Low if module-local | Yes | Yes | Serialized by slice | source change, DQ policy ambiguity, failing tests | trusted runs require DQ filter, missing/unavailable DQ fails closed, strict tests pass | GPT-5.5 high | Split into committed `CF-W2-SIG-01A`, `CF-W1-SIG-01B`, and `CF-W1-SIG-LATEST-01`; trigger object contract remains open |
| CF-W1-STRAT-01 | Remove arbitrary target-price semantics | Align with no-target-price and research-support language | Strategy Decision Engine | Lane 2 | P0 | Product language decision packet `DECISION-20260517-no-target-exit-invalidation-semantics` | strategy-decision module files/tests after decision | Prisma, shared UI, routes | Possible API contract risk | Yes | Yes | No, serialize | user-facing contract ambiguity | no `targetPrice` or `Target price achieved` in trusted outputs; exit/invalidation rules are rule-based | GPT-5.5 high | Blocked by Product Owner + Architect decision |
| CF-W1-MD-02 | Durable Market Data readiness evidence ADR | Define storage/provenance before schema changes | Market Data Foundation | Lane 1 | P0 | Active readiness contract | active docs only | Prisma/source until approved | High | Yes | No | Yes docs-only | schema/storage decision needed | ADR defines natural key, provenance, migration, rollback, QA | GPT-5.5 high | Needs Architecture Contract |
| CF-W1-MD-01 | Market Data validation hardening tests | Catch future-date, adjusted-close, and spike-policy gaps | Market Data Foundation | Lane 1 | P1 | MD validation behavior review | new module-local test file if approved | source unless separate fix approved | Low | No for tests | Yes | Yes | tests would preserve unsafe behavior or fail without source approval | focused tests prove accepted validation policy | GPT-5.4 high | Needs QA Plan + likely source decision |
| CF-W1-DQ-01 | Data Quality fail-closed defaults | Make missing/non-ready DQ safe by default | Data Quality Engine | Lane 1 | P0 | Downstream DQ policy | DQE module files/tests | routes, Prisma, shared utils | Low | Yes | Yes | Completed | policy ambiguity, downstream breakage | missing DQ and non-ready states block trusted use by default | GPT-5.5 high | Committed as `CF-W2-DQ-01` |
| CF-W1-BT-01 | Backtesting DQ fail-closed characterization | Prevent unreliable backtests | Backtesting Strategy Lab | Lane 2 | P1 | DQ fail-closed policy | backtesting module tests/source if approved | Prisma/routes/shared | Low | Yes | Yes | Yes after upstream decision | DQ policy unresolved | backtests require `backtest=READY` and complete history | GPT-5.4 high | Blocked by upstream dependency |
| CF-W1-TP-01 | Trade Plan DQ hard blockers | Prevent paper-review plans on non-ready DQ | Trade Plan Risk Engine | Lane 2 | P1 | DQ + Strategy Decision policy | trade-plan module tests/source if approved | Prisma/routes/shared | Low-medium | Yes | Yes | Yes after upstream decision | target semantics and DQ policy unresolved | NOT_READY/missing/limited DQ blocks paper readiness as approved | GPT-5.4 high | Blocked by upstream dependency |
| CF-W1-L3-AUTH-01 | Portfolio/watchlist child ownership tests and fix | Prevent cross-user data access | Portfolio + Watchlist | Lane 3 | P0 | Auth policy | module-local files/tests | Prisma/routes unless needed | Medium | Yes | Yes | Maybe serialized | schema/route change needed | child resources require current user ownership | GPT-5.5 high | Needs Architecture Contract |
| CF-W1-L3-ALERT-01 | Alert readiness consumer tests | Prevent action-like alerts from untrusted data | Alerts Monitoring | Lane 3 | P0 | Signal DQ fail-closed, Lane 3 contract | alerts module tests/source if approved | Prisma/routes/shared | Medium | Yes | Yes | Blocked | upstream signal DQ unresolved | non-ready DQ does not create trusted alert events | GPT-5.5 high | Blocked by upstream dependency |
| CF-W1-UX-02 | Copilot trust UX contract | Make deterministic local summaries visibly safe | Copilot UX | Lane 3 | P1 | Lane 3 readiness contract | docs first, frontend later if approved | shared UI unless reserved | Medium | Yes | Yes | Docs parallel | UI product decision needed | summaries show DQ evidence, sources, stale warnings, research-only status | GPT-5.5 high | Needs Product Refinement |
| CF-W1-QA-01 | Focused test command matrix | Reduce unsafe broad test runs | QA Automation | Cross-cutting | P2 | Audit outputs | active docs only | package manifests/source | None | No | Yes | Yes | none | per-module safe focused command list exists | GPT-5.4-mini medium | Ready for documentation-only implementation |
