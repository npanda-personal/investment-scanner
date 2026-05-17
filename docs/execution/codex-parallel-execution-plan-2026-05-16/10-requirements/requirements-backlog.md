# Requirements Backlog

Date: 2026-05-17

Status: Refreshed by Team 02 Requirement Factory for the current daemon cycle after cross-checking current module audits, active board, risk register, ready/blocked queues, next architecture contracts, and next validation plans. Product Owner resolved `CF-W1-L3-DQ-01`, `CF-W1-TP-01A`, and `CF-W1-MD-02` policy direction on 2026-05-17; they remain refinement/architecture-prep items only.

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
| CF-W1-L3-DQ-01 | Lane 3 readiness consumer policy contract | Prevent portfolio/watchlist/alert workflows from treating unready data as trusted | Portfolio / Watchlist / Alerts / Portfolio Intelligence | Lane 3 | P0 | DQE public outputs, completed signal DQ slices, approved Option B display-vs-action policy | `10-requirements/**` now; future module-local Lane 3 files only after Team 00/03 reservation | Prisma, routes, packages, shared utilities/UI, providers | Medium | Parent policy accepted; child contract needed | Draft exists; child scenarios needed | Docs-only prep | DQE consumer field contract not accepted, exact child file reservations missing, downstream Lane 3 modules still blocked from trusted use | accepted child contract defines display-only versus action-like behavior, blockers, readiness fields, and alert suppression expectations | GPT-5.5 high | Refinement/prep only; not Ready for Implementation |
| CF-W1-TP-01A | Trade Plan no-target compatibility and DQ hard-block contract | Prevent implied target-price advice and fail-open paper-readiness | Trade Plan Risk Engine | Lane 2 | P0 | approved Option B backend-only compatibility direction | `10-requirements/**` now; future `trade-plan-risk-engine` files only after Team 00/03 reservation | Prisma, routes, packages, shared utilities/UI, providers, unrelated modules, frontend/Today Review unless separately approved | Medium | Parent policy accepted; backend-only child contract needed | Draft exists; child scenarios needed | Docs-only prep | exact backend reservations missing, frontend/API/stored-row compatibility must stay excluded or trigger a new decision | accepted child contract defines no-target compatibility, DQ hard-block states, non-goals, tests, and file reservations | GPT-5.5 high | Refinement/prep only; not Ready for Implementation |
| CF-W1-MD-02 | Durable Market Data readiness evidence ADR | Define storage/provenance before schema changes | Market Data Foundation | Lane 1 | P0 | approved Option B ADR direction, ADR QA checklist, DQE handoff policy | current `10-requirements/**`; future active architecture/contract/work-packet docs only | Prisma, migrations, market-data/data-quality source/tests, routes, packages, generated files, providers, startup/backfill, UI | High | ADR direction accepted; formal ADR needed | ADR QA plan draft exists; no executable validation | Docs-only ADR prep | source/schema/test implementation not approved; current storage remains narrower than contract-grade evidence | ADR defines companion durable evidence storage, natural key/provenance/migration/rollback/query/test strategy, and keeps source blocked | GPT-5.5 high | ADR prep only; source blocked |
| CF-W1-L3-ALERT-01 | Alert readiness suppression tests | Prevent action-like alerts from untrusted data | Alerts Monitoring | Lane 3 | P0 | approved `CF-W1-L3-DQ-01` Option B policy; alert event ownership slice is committed | alerts module tests/source after child contract | Prisma/routes/shared unless approved | Medium | Needed after child contract | Draft QA plan exists; final scenarios depend on alert child contract | Blocked | alert readiness child contract and exact file reservations missing | missing, limited, not-ready, stale, or blocked DQ does not create trusted alert events | GPT-5.5 high | Blocked by upstream dependency |
| CF-W1-UX-02 | Copilot trust UX contract | Make deterministic local summaries visibly safe | Copilot UX / Research UX | Lane 3 | P1 | Lane 3 readiness policy, Product/UX naming and blocked-state decision | `10-requirements/**` now; future copilot/research files only after approval | shared UI, navigation, routes, packages, external AI, providers | Medium | Needed | Draft QA plan exists; final scenarios depend on Product/UX/Architect decisions | Docs-only now | naming/trust surface decision unresolved, trust fields unavailable, shared UI reservation needed | summaries show DQ evidence, source modules, stale warnings, deterministic local proof, and research-only status | GPT-5.5 high | Needs Product Refinement + Architecture Contract |
| CF-W1-UX-05 | Research-support copy pass contract | Reduce advisory-feeling labels across research and copilot surfaces | UX / Shared UI | Lane 3 | P1 | Product copy decision, shared UI reservation if shared components are touched | docs first | shared UI without reservation | High | Needed if shared components touched | Needed | Docs-only | shared status color/label scope unresolved | labels avoid recommendation language and preserve research-support framing | GPT-5.4 high | Needs Product Refinement |
| CF-W1-MD-01 | Market Data validation hardening policy and QA plan | Catch future-date, adjusted-close, and spike-policy gaps | Market Data Foundation | Lane 1 | P1 | accepted validation policy | docs/QA first; tests later if approved | source unless separate fix approved | Low | Maybe | Draft QA plan exists | Docs-only now | validation policy unresolved | accepted tests prove future-date, adjusted-close, and spike behavior | GPT-5.4 high | Needs Product/Architect policy before executable validation |
| CF-W1-BT-01 | Backtesting DQ fail-closed characterization | Prevent unreliable backtests | Backtesting Strategy Lab | Lane 2 | P1 | DQ fail-closed policy and backtest use-case readiness | backtesting module tests/source if approved | Prisma/routes/shared | Low | Needed | Needed | After upstream decision | backtest use-case policy unresolved | backtests require approved readiness and complete history | GPT-5.4 high | Blocked by upstream dependency |

## Current Priority Ready-Criteria Check

No focused priority item satisfies all Ready criteria.

| ID | Requirement | Architecture | QA | File reservations | Open blocker | Result |
| --- | --- | --- | --- | --- | --- | --- |
| CF-W1-L3-DQ-01 | Refined, not accepted for implementation | Parent policy accepted; child contract missing | Draft QA plan exists; child matrix needed | No implementation reservation | Child contract/QA/file reservation | Keep in refinement/prep |
| CF-W1-TP-01A | Refined, not accepted for implementation | Parent policy accepted; backend-only child contract missing | Draft QA plan exists; child matrix needed | No implementation reservation | Child contract/QA/file reservation | Keep in refinement/prep |
| CF-W1-MD-02 | Refined for ADR prep only | ADR direction accepted; formal ADR missing | ADR QA plan draft exists; no executable checks approved | No source/schema reservation | Shared-file/schema/source implementation gates | Keep in ADR prep; source blocked |

## Completed, Split, Or Not Active For Implementation

| ID | Current disposition | Notes |
| --- | --- | --- |
| CF-W1-L3-AUTH-01 | Completed | Portfolio/watchlist child ownership fix accepted under standing delegation and committed locally as `74ba6dd`; moved out of active pull. |
| CF-W1-L3-AUTH-02 | Completed | Alert event ownership through parent `AlertRule.userId` accepted under standing delegation and committed locally as `503bcd9`; direct event owner schema path remains future. |
| CF-W1-SIG-TRIGGER-01 | Completed bounded DTO projection | Optional Signal Generation trigger contract projection accepted under standing delegation and committed locally as `6ab3999`; persisted trigger snapshot, normalized trigger table, and downstream adoption remain future work. |
| CF-W2-DQ-01 | Completed | Data Quality fail-closed defaults accepted as bounded committed slice. |
| CF-W2-SIG-01A | Completed | Signal Generation run-path DQ fail-closed slice accepted and committed. |
| CF-W1-SIG-01B | Completed | Trusted signal list read-path filtering accepted and committed. |
| CF-W1-SIG-LATEST-01 | Completed | Latest-instrument DQ gating accepted and committed. |
| CF-W1-STRAT-01 | Completed as bounded Strategy Decision Option B-Strict | Trade Plan target migration remains separate and must not be inferred as complete. |
| CF-W1-QA-01 | Completed as documentation-only factory work | Focused test command matrix completed; not an app-code item. |
| CF-W1-SIG-01 | Split / Not Active | Parent has completed bounded slices plus future trigger persistence/downstream work; do not pull parent as implementation work. |
| CF-W1-DQ-01 | Superseded / Not Active | Superseded by completed `CF-W2-DQ-01`; downstream consumers still need separate requirements. |
| CF-W1-TP-01 | Split / Not Active | Split into `CF-W1-TP-01A`, future `CF-W1-TP-01B`, and future `CF-W1-TP-02`. |

## Next Non-Blocked Architecture / QA Prep Candidates

These are documentation-prep candidates only. None is app-code Ready for Implementation.

| Rank | ID | Prep owner | Next prep gate | Why it can proceed now |
| --- | --- | --- | --- | --- |
| 1 | CF-W1-L3-DQ-01 | Architecture + QA | Child readiness contracts and validation scenarios under approved Option B | No open Decision Inbox item; child prep can proceed. |
| 2 | CF-W1-TP-01A | Architecture + QA | Backend-only Trade Plan compatibility contract and DQ hard-block QA scenarios under approved Option B | Independent of completed alert and trigger DTO slices; source work still needs exact reservation. |
| 3 | CF-W1-MD-02 | Architecture + QA | Formal durable readiness evidence ADR and ADR QA checklist under approved Option B direction | Source/schema remains blocked. |
| 4 | CF-W1-MD-01 | QA + Product/Architect policy | Market Data validation hardening policy and focused QA plan | Validation policy prep can continue without source/test changes. |
| 5 | CF-W1-UX-02 | Product + UX + Architecture + QA | Copilot trust UX contract and blocked-state validation plan | QA plan exists and module audit supports refinement; implementation remains blocked by naming, trust-field, blocked-state, and shared-file decisions. |

`CF-W1-UX-05` remains a valid Product/UX copy-policy candidate, but it is behind `CF-W1-UX-02` for the next five because its QA checklist and shared UI reservation decision are not yet as mature.
