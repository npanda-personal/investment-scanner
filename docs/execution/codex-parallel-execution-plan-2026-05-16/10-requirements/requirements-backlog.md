# Requirements Backlog

Date: 2026-05-17

Status: Refreshed by Team 02 Requirement Factory after `CF-W1-L3-AUTH-01` local commit `74ba6dd` and Decision Inbox updates for alert ownership and trigger contract path.

## Intake Rules

Statuses use the active board state model:

- Backlog Candidate
- Needs Product Refinement
- Needs Architecture Contract
- Needs QA Plan
- Ready for Implementation
- Blocked
- Deferred
- Completed
- Split / Not Active

No candidate is implementation-ready unless `12-ready-queue/ready-for-implementation.md` says so.

## Active Candidates

| ID | Title | Product value | Module/team | Lane | Severity | Dependencies | Allowed files | Forbidden files | Shared-file risk | Architecture contract | QA plan | Parallel-safe | Stop conditions | Acceptance criteria | Model/reasoning | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CF-W1-TP-01A | Trade Plan no-target compatibility and DQ hard-block contract | Prevent implied target-price advice and fail-open paper-readiness | Trade Plan Risk Engine | Lane 2 | P0 | Product/Architect decision for Trade Plan target replacement and DQ hard-block policy | `10-requirements/**` now; future `trade-plan-risk-engine` files only after approval | Prisma, routes, packages, shared utilities/UI, providers, unrelated modules | Medium | Needed | Needed | Docs-only now | target semantics unresolved, DQ hard-block policy unresolved, frontend/API compatibility unknown | accepted contract defines no-target compatibility, DQ hard-block states, non-goals, tests, and file reservations | GPT-5.5 high | Needs Product Refinement + Architecture Contract + QA Plan |
| CF-W1-L3-DQ-01 | Lane 3 readiness consumer policy contract | Prevent portfolio/watchlist/alert workflows from treating unready data as trusted | Portfolio / Watchlist / Alerts / Portfolio Intelligence | Lane 3 | P0 | DQE public outputs, completed signal DQ slices, Product display-vs-action policy | `10-requirements/**` now; future module-local Lane 3 files only after approval | Prisma, routes, packages, shared utilities/UI, providers | Medium | Needed | Needed | Docs-only now | display-vs-action policy unresolved, auth/alert ownership scope collision, DQE contract gap | accepted contract defines display-only versus action-like behavior, blockers, readiness fields, and alert suppression expectations | GPT-5.5 high | Needs Product Refinement + Architecture Contract + QA Plan |
| CF-W1-L3-AUTH-02 | Alert event ownership contract | Prevent global alert inbox/event access | Alerts Monitoring | Lane 3 | P0 | Decision Inbox `DECISION-20260517-alert-event-ownership-model` | docs first only until decision resolves | Prisma unless direct event owner is approved, routes/shared | High | Draft exists; held pending decision | Draft exists; held pending decision | Docs-only | direct event owner vs rule-owner join unresolved | event listing/actions are scoped to current user by accepted ownership model | GPT-5.5 high | Blocked by Decision Inbox |
| CF-W1-L3-ALERT-01 | Alert readiness suppression tests | Prevent action-like alerts from untrusted data | Alerts Monitoring | Lane 3 | P0 | `CF-W1-L3-DQ-01`, alert ownership model as needed | alerts module tests/source after contract | Prisma/routes/shared unless approved | Medium | Needed | Needed | Blocked | Lane 3 readiness policy unresolved | missing, limited, not-ready, stale, or blocked DQ does not create trusted alert events | GPT-5.5 high | Blocked by upstream dependency |
| CF-W1-UX-02 | Copilot trust UX contract | Make deterministic local summaries visibly safe | Copilot UX / Research UX | Lane 3 | P1 | Lane 3 readiness policy, Product/UX naming and blocked-state decision | `10-requirements/**` now; future copilot/research files only after approval | shared UI, navigation, routes, packages, external AI, providers | Medium | Needed | Needed | Docs-only now | naming/trust surface decision unresolved, trust fields unavailable, shared UI reservation needed | summaries show DQ evidence, source modules, stale warnings, deterministic local proof, and research-only status | GPT-5.5 high | Needs Product Refinement + Architecture Contract + QA Plan |
| CF-W1-UX-05 | Research-support copy pass contract | Reduce advisory-feeling labels across research and copilot surfaces | UX / Shared UI | Lane 3 | P1 | Product copy decision, shared UI reservation if shared components are touched | docs first | shared UI without reservation | High | Needed if shared components touched | Needed | Docs-only | shared status color/label scope unresolved | labels avoid recommendation language and preserve research-support framing | GPT-5.4 high | Needs Product Refinement |
| CF-W1-MD-02 | Durable Market Data readiness evidence ADR | Define storage/provenance before schema changes | Market Data Foundation | Lane 1 | P0 | Product/Architect storage-model decision, accepted ADR QA checklist, DQE handoff policy | current `10-requirements/**`; future active architecture/contract/work-packet docs only | Prisma, migrations, market-data/data-quality source/tests, routes, packages, generated files, providers, startup/backfill, UI | High | ADR/contract draft only; decision needed | ADR QA plan draft only; no executable validation | Docs-only | schema/storage/natural-key decision missing, provider/live/startup/backfill requested | ADR compares storage options, defines natural key/provenance/migration/rollback/query/test strategy, and keeps source blocked | GPT-5.5 high | Requirement refined; ADR/Decision Packet prep only; Source Blocked |
| CF-W1-MD-01 | Market Data validation hardening policy and QA plan | Catch future-date, adjusted-close, and spike-policy gaps | Market Data Foundation | Lane 1 | P1 | accepted validation policy | docs/QA first; tests later if approved | source unless separate fix approved | Low | Maybe | Needed | Docs-only now | validation policy unresolved | accepted tests prove future-date, adjusted-close, and spike behavior | GPT-5.4 high | Needs QA Plan + Product/Architect policy |
| CF-W1-SIG-TRIGGER-01 | Full trigger object contract completion | Close remaining root trigger contract gaps | Signal Generation Engine and downstream consumers | Lane 2 | P1 | Decision Inbox `DECISION-20260517-trigger-object-contract-path` | docs first only until decision resolves | broad source/shared/API changes until split | High | Draft exists; held pending decision | Draft exists; held pending decision | Docs-only | contract path unresolved: DTO projection vs persisted snapshot vs normalized trigger table | trigger outputs include required root contract fields and auditability path | GPT-5.5 high | Blocked by Decision Inbox |
| CF-W1-BT-01 | Backtesting DQ fail-closed characterization | Prevent unreliable backtests | Backtesting Strategy Lab | Lane 2 | P1 | DQ fail-closed policy and backtest use-case readiness | backtesting module tests/source if approved | Prisma/routes/shared | Low | Needed | Needed | After upstream decision | backtest use-case policy unresolved | backtests require approved readiness and complete history | GPT-5.4 high | Blocked by upstream dependency |

## Completed, Split, Or Not Active For Implementation

| ID | Current disposition | Notes |
| --- | --- | --- |
| CF-W1-L3-AUTH-01 | Completed | Portfolio/watchlist child ownership fix accepted under standing delegation and committed locally as `74ba6dd`; moved out of active pull. |
| CF-W2-DQ-01 | Completed | Data Quality fail-closed defaults accepted as bounded committed slice. |
| CF-W2-SIG-01A | Completed | Signal Generation run-path DQ fail-closed slice accepted and committed. |
| CF-W1-SIG-01B | Completed | Trusted signal list read-path filtering accepted and committed. |
| CF-W1-SIG-LATEST-01 | Completed | Latest-instrument DQ gating accepted and committed. |
| CF-W1-STRAT-01 | Completed as bounded Strategy Decision Option B-Strict | Trade Plan target migration remains separate and must not be inferred as complete. |
| CF-W1-QA-01 | Completed as documentation-only factory work | Focused test command matrix completed; not an app-code item. |
| CF-W1-SIG-01 | Split / Not Active | Parent has completed bounded slices plus remaining `CF-W1-SIG-TRIGGER-01`; do not pull parent as implementation work. |
| CF-W1-DQ-01 | Superseded / Not Active | Superseded by completed `CF-W2-DQ-01`; downstream consumers still need separate requirements. |
| CF-W1-TP-01 | Split / Not Active | Split into `CF-W1-TP-01A`, future `CF-W1-TP-01B`, and future `CF-W1-TP-02`. |

## Next Non-Blocked Architecture / QA Prep Candidates

These are documentation-prep candidates only. None is app-code Ready for Implementation.

| Rank | ID | Prep owner | Next prep gate | Why it can proceed while Decision Inbox waits |
| --- | --- | --- | --- | --- |
| 1 | CF-W1-TP-01A | Architecture + QA + Product clarification | Trade Plan no-target compatibility contract and DQ hard-block QA scenarios | Independent of alert ownership and trigger object path decisions; still requires Product/Architect semantics before source work. |
| 2 | CF-W1-MD-02 | Architecture + QA | Durable readiness evidence ADR packet and ADR QA checklist | Storage/provenance ADR prep is independent of current Decision Inbox items; source/schema remains blocked. |
| 3 | CF-W1-MD-01 | QA + Product/Architect policy | Market Data validation hardening policy and focused QA plan | Validation policy prep can continue without alert or trigger-contract decisions. |
| 4 | CF-W1-UX-05 | Product + UX + QA | Research-support copy refinement and QA checklist | Copy-policy prep is independent of alert ownership and trigger persistence path; shared UI/source remains blocked. |
