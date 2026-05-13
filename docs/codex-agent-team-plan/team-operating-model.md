# Parallel Product Team Operating Model

## Purpose

This project should move through independent module lanes instead of routing every implementation task through one fullstack developer. The codebase is already organized around backend modules and matching frontend features, so ownership should follow product capability boundaries.

The goal is faster delivery without weakening architecture, test coverage, or data correctness.

For Codex-agent execution, use `docs/codex-agent-team-plan/codex-agent-team.md`. It defines the agent roster, communication protocol, work packet, handoff template, and independent write boundaries.

## Default Team

| Role | Primary ownership | Final say |
|---|---|---|
| Product Owner | Roadmap priority, user workflow intent, acceptance criteria, investment-domain language, market/quant/stock-analysis domain judgment | Requirements, roadmap, scope, domain correctness, and product acceptance |
| Solution Architect | Architecture, API/data contracts, module boundaries, database impact, cross-module dependencies, scalability, robustness | Technical approach and solution design before implementation |
| Senior Fullstack Lead | Integration, shared patterns, code review, standards, unblock decisions | Merge readiness and shared-code changes |
| Module Fullstack Developer | One vertical module slice at a time: backend, frontend, tests, and module docs | Implementation inside assigned module boundary |
| QA Engineer | Test strategy, acceptance scenarios, regression coverage, release readiness | Verification signoff |

The Senior Fullstack Lead is not the default implementer for every module. That role should protect integration quality and implement only critical shared or blocking work.

## Deep-Thinking Decision Standard

Product Owner and Solution Architect decisions must always be made in deep-thinking mode.

- Product Owner deep-thinking covers market behavior, quant reasoning, stock-analysis validity, user workflow value, roadmap changes, and acceptance criteria.
- Solution Architect deep-thinking covers scalability, robustness, modularity, contracts, schema impact, cross-module dependencies, and free/local-tool compliance.
- For Codex agents, use high or highest available reasoning effort for these two roles when supported.
- Deep-thinking outputs should state assumptions, options considered, tradeoffs, risks, and the final decision. They should not publish private scratchwork.

## Agent Operating Modes

For Codex-agent execution, use the operating modes defined in `docs/codex-agent-team-plan/codex-agent-team.md`.

- Product Owner primarily uses `Product Planning Mode` and `PO Acceptance Mode`.
- Solution Architect uses `Architecture Planning Mode`, `Architect Signoff Mode`, and `Clarification Mode`.
- Senior Fullstack Lead / Orchestrator uses `Discovery Mode`, `Orchestrator Intake Mode`, `Lead Validation Mode`, `GitHub Check-In Mode`, `Clarification Mode`, and integration coordination.
- Module Developers use `Discovery Mode`, `Implementation Mode`, and `Revision Mode` if rejected.
- QA uses `QA Verification Mode` and can start planning early from Product Owner briefs.

The normal mode flow is:

`PO Product Planning -> Orchestrator Intake -> Architect Planning -> QA Planning -> Lead Work Packet -> Developer Implementation -> QA Verification -> Lead Validation -> Architect Signoff -> PO Acceptance -> GitHub Check-In -> Released`

Flow labels map to their documented modes: `PO Product Planning` -> `Product Planning Mode`, `Orchestrator Intake` -> `Orchestrator Intake Mode`, `Architect Planning` -> `Architecture Planning Mode`, `QA Planning` -> early `QA Verification Mode`, `Lead Work Packet` -> Orchestrator `Discovery Mode` plus integration coordination while preparing the work packet and reservations, `Developer Implementation` -> `Implementation Mode`, `QA Verification` -> `QA Verification Mode`, `Lead Validation` -> `Lead Validation Mode`, `Architect Signoff` -> `Architect Signoff Mode`, `PO Acceptance` -> `PO Acceptance Mode`, and `GitHub Check-In` -> `GitHub Check-In Mode`. `Released` has no active mode unless release follow-up is opened.

Rejected items enter `Revision Mode` on the same work item and return to the rejecting gate after correction.

## Guideline Sources

All team members and Codex agents must use the project docs as their operating guidelines:

- `docs/AGENTS.md` for project rules, module boundaries, hardening, testing, and output expectations.
- `docs/instructions.md` for non-negotiable hard constraints.
- `docs/architecture.md` for system design, module ownership, contracts, and architecture principles.
- `docs/roadmap.md` for product direction and priority context.
- `docs/codex-agent-team-plan/sdlc-operating-model.md` for SDLC states, gates, release, rollback, data/security governance, blockers, debt, and retrospectives.
- `docs/codex-agent-team-plan/active-work-board.md` for the current Top 5, owner/mode tracking, reserved files, blockers, and GitHub check-in evidence.
- `docs/ux-ui-best-practices.md` for UI-facing work.
- `docs/module-verification-register.md` for module verification expectations and known gaps.
- relevant module `{module}.md` files for module-specific behavior, routes, contracts, limitations, and lessons.

Each work packet should list which guidelines were loaded. If a guideline conflicts with the latest Product Owner requirement, the agent must call out the conflict and follow the latest Product Owner direction only after updating affected docs or recording the needed doc update.

## Authority And Change Control

Nothing in the product requirements, roadmap, module priorities, or workflow assumptions is frozen. The Product Owner can change requirements and roadmap direction when domain judgment changes or a better market workflow is identified.

The Product Owner is the domain authority for market behavior, quant reasoning, stock-analysis workflows, investment terminology, acceptance criteria, and product tradeoffs. Other roles should challenge unclear requirements for precision, but they should not overrule domain intent.

The Solution Architect can change technical design and solution direction when needed to keep the application scalable, robust, maintainable, and modular. Architecture changes must still respect the Product Owner's domain intent and the project's hard constraints.

Non-negotiable architecture constraints:

- The application is for personal/local usage first.
- Use free/open-source or already-local tools only.
- Do not introduce paid libraries, paid tooling, paid market-data providers, paid AI services, paid testing services, or paid hosted infrastructure.
- Prefer simple, local-first architecture over SaaS complexity when both satisfy the product need.

## Parallel Implementation Lanes

Use these lanes as the default assignment model.

| Lane | Owns | Typical modules |
|---|---|---|
| Lane 1: Market Data / Data Quality | Provider ingestion, catalog integrity, freshness, universe readiness, data quality gates | `market-data-foundation`, `data-quality-engine`, `historical-context-snapshots` |
| Lane 2: Strategy / Signals / Risk | Signal generation, calibration, strategy evidence, backtesting, decisions, trade plans | `signal-generation-engine`, `signal-quality-lab`, `signal-calibration-engine`, `strategy-framework`, `backtesting-strategy-lab`, `strategy-decision-engine`, `today-trade-review`, `trade-plan-risk-engine` |
| Lane 3: Portfolio / Watchlists / Alerts / UX | Portfolio workflows, watchlists, alerts, notifications, research surfaces, user-facing flow quality | `portfolio-management`, `portfolio-intelligence`, `watchlist-management`, `alerts-monitoring`, `notifications-delivery`, `research-hub`, `stock-research-workbench`, `ai-investment-copilot` |

Cross-cutting account modules, such as `auth-identity` and `subscription-billing`, require Solution Architect and Senior Fullstack Lead review before assignment because they affect access, ownership, and gating behavior across lanes.

## Assignment Rules

- Assign each work item to one lane and one directly responsible module developer.
- A work item should include backend, frontend, tests, docs, and acceptance criteria for that module slice.
- Each module developer has a WIP limit of one active implementation task.
- A module developer must complete the current vertical slice implementation handoff before pulling the next implementation task.
- Do not split one module change into separate backend-only and frontend-only owners unless the API contract is already stable and documented.
- No developer should edit another lane's module files without coordination in the work item.
- Use a single-writer rule for each implementation pass: one owner per file, module, test spec, migration, route registry, shared component, or generated type.
- Shared files require explicit review from the Senior Fullstack Lead. This includes shared UI components, route registries, API route registration, shared utilities, Prisma schema, auth/subscription behavior, and global market-scope logic.
- The Solution Architect defines cross-module contracts before implementation starts when a change affects more than one module.
- QA prepares acceptance and regression scenarios while implementation is active, not after code is complete.
- For Codex-agent work, every assigned agent must receive a clear work packet and return a structured handoff before integration.

## Elastic QA Capacity

QA should scale with the verification backlog. The Orchestrator may add QA workers when multiple items are waiting for QA, when one item is blocked on live-data/environment evidence, or when QA would otherwise become the throughput bottleneck.

- Assign one QA worker to one work item at a time.
- Give each QA worker a separate evidence file, issue section, or active-board evidence row.
- Do not run competing Playwright/browser/database-mutating checks in parallel unless the tests are isolated.
- Keep final QA signoff traceable to one QA owner per work item.
- QA workers may reject incomplete developer handoffs under the pre-QA validation gate and must provide clear missing evidence or failed acceptance criteria.
- QA planning or review workers must report `complete`, `blocked`, or `needs reassignment` at the end of every assignment. A completed QA planner must not remain in an awaiting-instruction state; the Orchestrator either gives a new explicit post-start assignment or closes the worker.

## Central Runtime Evidence Lane

Runtime verification that needs local servers, browser automation, Playwright, database mutation, or long-running Node processes is owned by one Orchestrator-controlled lane. This prevents each QA or developer agent from starting its own app stack and competing for memory, ports, browser state, or database state.

- Use one runtime owner for focused UI/API/runtime evidence when multiple QA items are waiting on browser or live API proof.
- Run the smallest useful check first, normally one Playwright spec or one API proof at a time.
- Keep QA evidence workers on static/contract/evidence review unless the Orchestrator explicitly assigns the runtime slot.
- Clean up repo-local Node/Vite/Playwright/backend services after each runtime pass when they are no longer needed.
- While runtime evidence is pending, do not leave PO, Architect, or developers idle: PO refines the next batch, Architect works on pre-architecture or clarifications, and developers take non-conflicting revision/discovery/prep work assigned by the Orchestrator.
- Items blocked only by runtime evidence should show the Orchestrator/runtime QA owner as next owner instead of leaving completed QA workers open and idle.

## Flow Monitor / Deputy Orchestrator Role

The Senior Fullstack Lead / Orchestrator must keep a Flow Monitor / Deputy Orchestrator active during multi-agent execution unless there are no safe parallel lanes or the agent/thread/resource gate prevents it.

- The monitor checks role occupancy, stale agents, board drift, blockers, reserved write scopes, and safe parallel work.
- The monitor identifies plan deviation when the Orchestrator is doing delegable work locally while roles are free.
- The monitor recommends exact assignments, closures, reassignments, blocker updates, and board updates.
- The monitor may update only assigned flow-control artifacts, such as an occupancy report or active-board operations section.
- The monitor does not edit production source, start processes, approve gates, commit/push, or change product/architecture decisions.
- The Orchestrator remains responsible for assignments, board updates, gate decisions, runtime process control, and cleanup.

Deputy enforcement triggers:

- any agent shows `awaiting instruction`,
- any active agent has no handoff, blocker, or progress report after a status sweep,
- an agent completes with an incomplete handoff such as only `handoff completed`,
- an agent is assigned an artifact path whose parent directory does not exist,
- the Orchestrator keeps doing delegable work locally while safe parallel lanes are available,
- the active board says a role is active but the agent is closed, silent, or blocked.

For every trigger, the Deputy writes a `Plan Deviation Alert` with the agent, deviation, expected action, and recommended Orchestrator correction. The Orchestrator must fix the alert in the same orchestration cycle.

## Orchestrator Proactive Execution Rules

The Orchestrator is accountable for team flow. The user should not need to repeatedly detect idle agents, stale board rows, missing handoffs, or unassigned next work.

- After assigning or spawning an agent, verify that the agent has a clear task, owned write scope, expected output, and no hidden dependency on user approval.
- After spawning or resuming any agent, send a separate post-start assignment message that confirms current mode, work item, owned scope, forbidden actions, expected artifact or handoff, and blocker behavior. Do not treat the agent as active until this post-start instruction is sent.
- Before assigning an artifact path, verify the parent directory exists.
- If an agent is idle, waiting, or silent after a reasonable work interval, send a status prompt requiring one of three responses: structured handoff, continued unblocked work, or blocker report.
- If the agent still waits after one prompt, interrupt once with a direct action request; if it still does not produce, close/reassign and update the active board.
- If a spawned agent cannot work because of thread limits, missing context, or unclear ownership, close or reassign quickly and record the corrected owner on the active board.
- When one gate is blocked, immediately find safe parallel work for the other roles instead of letting the full team wait.
- Keep `active-work-board.md` aligned with reality before assigning new work: owner, state, mode, blocker, next action, reserved files, and evidence links must match actual agent status.
- Convert repeated user corrections into operating-model updates during the same session when they reveal a real process gap.
- Ask the user only for true product preference changes, unsafe or destructive actions, paid-tool/provider exceptions, secrets, external account actions, or decisions explicitly reserved for the user.

## Plan Deviation Guardrail

The Orchestrator must treat deviation from the parallel team model as a process issue to correct immediately.

- If safe parallel work exists and a qualified role is free, delegate it instead of doing everything in the Orchestrator thread.
- If the Orchestrator temporarily single-threads work, record why delegation is unsafe, blocked, or inefficient, and state when the team will resume parallel lanes.
- If a completed handoff, blocker, or rejection is not reflected on the active board, update the board before assigning new work.
- If an agent is awaiting instruction, prompt it for handoff, continued work, or blocker report; close and reassign if it remains silent.
- If runtime evidence blocks QA, centralize runtime validation and keep PO, Architect, and developers on non-conflicting planning, discovery, addendum, or revision work.
- If the Flow Monitor is not active during multi-agent execution, record the reason on the active board.

## Laptop Resource Gate

The Orchestrator must protect the user's laptop during continuous team execution.

- Check memory utilization before starting new local servers, builds, tests, Playwright/browser runs, Docker services, or new Codex worker agents.
- If memory utilization is at or above 95%, do not start new process-heavy work or new workers.
- After the gate closes at 95%, wait until memory utilization drops below 90% before starting new process-heavy work or new workers.
- When memory is above 90%, individual workers and the Orchestrator must stop repo-local Node/Vite/Playwright/backend services that are no longer needed or whose task is done.
- Completed workers should not leave dev servers, Playwright runners, or backend Node processes running after handoff when memory is above 90%.
- The Orchestrator should clean up stale repo-local Node/npm/npx processes after interrupted validation runs, closed workers, or completed task phases, while avoiding unrelated user/editor/system processes.
- Backend `http://127.0.0.1:3000` and frontend `http://127.0.0.1:5173` are persistent monitor services for the user. They stay running across the team session unless the Orchestrator restarts them for health, port replacement, explicit user request, or severe resource pressure.
- Workers must not kill the persistent monitor services on ports `3000` and `5173`; they escalate to the Orchestrator when those services need recycling.
- Continue lightweight planning, status updates, board edits, and evidence review while the resource gate is closed.
- If memory cannot be measured reliably, treat new process-heavy work as blocked until a reliable reading is available or the user explicitly permits continuing.

## Delivery Workflow

1. **Product Owner intake**
   Define or revise the user workflow, priority, target module or lane, in-scope behavior, out-of-scope behavior, domain rules, and acceptance criteria.
2. **Orchestrator intake**
   Verify the product brief is complete enough for architecture, record the active work board row, and move the item to `Ready for Architecture`.
3. **Solution Architect review**
   Identify or revise module ownership, API/data contracts, schema or migration impact, upstream/downstream dependencies, shared-code touchpoints, scalability risks, and local-first/free-tool compliance.
4. **Lane implementation**
   The assigned Module Fullstack Developer implements the complete vertical slice within the module boundary only after the item reaches `Ready for Implementation`.
5. **Senior Fullstack Lead review**
   Review code shape, shared changes, contract compatibility, imports, module exports, and integration risk.
6. **QA verification**
   Run the relevant backend tests, frontend build, Playwright module smoke tests, and manual live-data checks when required by `docs/AGENTS.md`.
7. **Post-QA Senior Fullstack Lead validation**
   Confirm the implemented work satisfies the Architect's asks, shared-file expectations, public contract usage, integration quality, and code-shape expectations before Architect signoff after Lead validation.
8. **Post-QA Solution Architect signoff after Lead validation**
   Confirm the implemented solution still satisfies the business rules from the Product Owner brief, preserves the architecture contract, has no obvious solution flaw, and stays within local/free-tool constraints after post-QA Lead validation.
9. **Product Owner acceptance**
   Confirm the implemented workflow against the acceptance criteria using product language and real user outcomes.
10. **GitHub check-in**
   Senior Fullstack Lead / Orchestrator stages only the accepted requirement's scoped files, commits them, pushes to `origin` on the active branch, and records branch, commit SHA, pushed remote, committed files, scoped-staging confirmation, unsafe/unaccepted-file exclusion confirmation, rollback notes, and CI status/link when available.
   The scoped files include all task-owned docs and evidence created or updated for that accepted requirement. The Orchestrator must not mark the item `Released` while its work packet, handoff, QA evidence, Lead validation, Architect signoff, PO acceptance, GitHub check-in note, active-board update, blocker entry, decision record, or release checklist entry is still unpushed.
   Docs for unrelated future backlog, preimplementation discovery, rejected work, or unaccepted scope remain unstaged until those items reach their own acceptance gate.

## Agile Priority Pipeline

Start with useful work, not a complete roadmap.

1. Product Owner creates the first Top 5 Priority Requirements as small product briefs.
2. Product Owner passes the Top 5 to the Orchestrator for intake immediately.
3. Orchestrator records each product brief on the active board and moves complete items to `Ready for Architecture`.
4. Solution Architect creates architecture contracts in priority order and releases each item independently as soon as it is ready.
5. QA starts verification planning from the product brief and updates it after architecture is available.
6. Lane developers pull items only after the Orchestrator work packet, QA plan, WIP check, and single-writer reservations make the item `Ready for Implementation`.
7. While the Top 5 move through architecture, QA, implementation, and signoff, Product Owner works on the broader roadmap and next priority batch.
8. Product Owner keeps at least five candidate requirements ready or nearly ready for Orchestrator intake whenever possible.
9. If the refined backlog drops below five candidate requirements, the Orchestrator immediately assigns Product Owner planning work to refine and prioritize new requirements, bugs, enhancements, and app-review findings until the buffer is back to five or more.

No role should wait for the whole batch to finish. Each role pulls the next eligible item for its stage.

The backlog buffer is a minimum, not a cap. Product Owner should keep working ahead whenever downstream roles are busy, while product/domain blockers for active work still take precedence over lower-priority grooming.

## Live Work Board And Kickoff

Use `docs/codex-agent-team-plan/active-work-board.md` as the single live tracker for the current Top 5, next priority candidates, active lane assignments, reserved files, blockers, and GitHub check-ins.

First-run kickoff order:

1. Orchestrator loads baseline docs, current branch/remote, dirty-file state, and the active board.
2. Product Owner creates the first Top 5 product briefs.
3. Orchestrator records the Top 5 on the active board.
4. Orchestrator performs intake, verifies product brief completeness, and moves complete items to `Ready for Architecture`.
5. Architect creates architecture contracts in priority order and releases each item independently.
6. QA drafts verification scenarios early and updates them after architecture.
7. Developers inspect modules in discovery mode only until a work packet and write reservations exist.
8. Orchestrator moves the first non-conflicting item to `Ready for Implementation` only after the work packet, QA plan, WIP check, and single-writer reservations are complete.

## Priority Change Protocol

When Product Owner changes priority, scope, or acceptance criteria:

- Product Owner records the change reason, affected items, new priority, and updated acceptance criteria.
- Orchestrator updates the active board before downstream agents continue.
- Items not yet in implementation return to the earliest affected gate.
- Items in implementation pause new edits until the Orchestrator, Architect, and QA decide whether to continue, revise, return to architecture, or cancel.
- Cancelled or unaccepted work is not committed or pushed unless Product Owner explicitly accepts a scoped partial result.

## Requirement Flow

The requirement flow is Product Owner to Product Owner, followed by GitHub check-in:

1. Product Owner defines or changes the requirement.
2. Product Owner Agent turns it into a product brief and acceptance criteria.
3. Senior Fullstack Lead / Orchestrator performs intake, confirms the brief is complete enough for architecture, records the board row, and moves the item to `Ready for Architecture`.
4. Solution Architect Agent turns it into an architecture contract.
5. QA Agent turns acceptance criteria into verification scenarios.
6. Senior Fullstack Lead / Orchestrator creates the work packet, lane assignment, and single-writer reservations.
7. Module Developer Agent implements the assigned vertical slice independently.
8. Senior Fullstack Lead / Orchestrator integrates shared changes and reviews contracts.
9. QA verifies behavior against the acceptance criteria.
10. Senior Fullstack Lead / Orchestrator validates after QA that the Architect's asks and integration expectations were met.
11. Solution Architect Agent signs off after post-QA Lead validation that business rules, architecture contracts, and solution quality are still valid.
12. Product Owner Agent reviews the delivered behavior.
13. Product Owner accepts the requirement or sends a revised requirement back into the same flow.
14. Senior Fullstack Lead / Orchestrator commits and pushes the accepted requirement's scoped files to `origin` on the active branch.
15. Senior Fullstack Lead / Orchestrator verifies all task-owned docs and evidence for that accepted requirement are included in the pushed check-in, while excluding unrelated future/backlog docs and unaccepted work.

Passing tests are necessary evidence, not final acceptance. Final completion requires QA evidence, post-QA Lead validation, post-QA Architect signoff after Lead validation, Product Owner acceptance against the latest requirement, and GitHub check-in evidence.

## Rejection And Clarification Flow

Every review gate can reject an item, but every rejection must produce clear correction work.

- Rejection reasons must name the failed acceptance criterion, Architect ask, test expectation, business rule, contract, or integration concern.
- The rejected item stays the same work item and moves to `Needs Revision`.
- The Orchestrator assigns the rejected item as `Revision Mode` work to an available qualified developer. Prefer the original developer when free, but do not interrupt another active implementation task unless the Orchestrator explicitly decides the revision is more urgent.
- If a developer is unclear, they ask the Senior Fullstack Lead / Orchestrator.
- If the Lead cannot answer, the Lead asks the Solution Architect.
- If the Architect needs product/domain clarification, the Architect asks the Product Owner.
- The final clarification must be written into the work packet, acceptance criteria, architecture contract, or module docs.

## New Module Flow

If Product Owner introduces a possible new module:

1. Product Owner defines the business capability, workflow, domain rules, priority, and acceptance criteria.
2. Product Owner explains why a new module may be needed instead of extending an existing module.
3. Senior Fullstack Lead / Orchestrator performs intake, records the active board row, and moves a complete brief to `Ready for Architecture`.
4. Solution Architect decides whether the capability truly deserves separate module ownership.
5. Solution Architect assigns the module to a lane or marks it cross-cutting/platform and records the architecture contract.
6. QA creates the verification plan from the Product Owner acceptance criteria and architecture contract.
7. Senior Fullstack Lead / Orchestrator creates the work packet, reserves new module paths, route registration, tests, docs, and shared files, confirms WIP availability, and moves the item to `Ready for Implementation`.
8. Developer implementation starts only after the item is `Ready for Implementation`; one available lane developer builds the first vertical slice end to end under the one-active-task WIP limit.
9. QA verifies, Senior Fullstack Lead validates after QA, Solution Architect signs off after Lead validation, Product Owner accepts or revises, and Senior Fullstack Lead / Orchestrator performs GitHub check-in after acceptance.

A new module should be created only when it has distinct ownership, clear boundaries, and better long-term maintainability than extending an existing module.

## Definition Of Ready

A module work item is ready for implementation when it has:

- priority batch and rank,
- active work board row,
- current operating mode and next mode,
- new-module decision when the work introduces a new capability,
- assigned ownership lane for any new module,
- loaded guideline list for the role and module,
- one assigned lane and one directly responsible module developer,
- confirmation that the directly responsible module developer has no other active implementation task,
- clear Product Owner acceptance criteria,
- current Product Owner domain assumptions, including any roadmap or requirement changes,
- confirmed module ownership,
- documented cross-module dependencies,
- API/data-contract notes when the frontend or downstream modules consume new behavior,
- Solution Architect confirmation that the design remains local-first and uses only free/open-source or already-local tools,
- QA scenarios or known verification expectations,
- explicit shared files that need Senior Fullstack Lead review,
- decision record, release checklist, debt, or blocker needs identified when applicable.

## Definition Of Done

A module work item is done when:

- code stays inside the assigned module boundary except for reviewed shared changes,
- backend and frontend behavior match the documented contract,
- module docs are updated for changed routes, response shapes, calculations, batching, or workflows,
- relevant backend tests, frontend build, and UI smoke tests have passed or blockers are recorded,
- data-bearing UI/API changes have completed the live-data validation pass required by `docs/AGENTS.md`,
- the final behavior reflects the latest Product Owner requirements, not stale roadmap assumptions,
- the implementation uses no paid libraries, tools, services, providers, or hosted verification,
- Senior Fullstack Lead and QA signoff are recorded,
- post-QA Senior Fullstack Lead validation is recorded for Architect asks, integration quality, and shared-code expectations,
- post-QA Solution Architect signoff after Lead validation is recorded for business-rule fit, architecture contract integrity, and solution quality,
- Product Owner acceptance is recorded for user-facing behavior,
- the accepted requirement's scoped files are committed and pushed to `origin` on the active branch by the Senior Fullstack Lead / Orchestrator,
- every task-owned documentation and evidence artifact for that accepted requirement is committed and pushed in the same check-in cycle,
- branch name, commit SHA, pushed remote, committed files, scoped-staging confirmation, unsafe/unaccepted-file exclusion confirmation, rollback notes, and CI status/link when available are recorded,
- release/rollback impact is recorded when the change is release-relevant,
- technical debt and blockers are recorded in the shared registers when not resolved.

## Developer Pre-QA Validation

Before a developer hands an item to QA, the developer must run the basic validation for the changed slice. This is a required gate, not optional QA work.

Required developer evidence before `Ready for QA`:

- focused backend tests for changed backend modules,
- frontend build or typecheck for UI/type changes,
- focused Playwright smoke tests for changed UI workflows when practical,
- route/API checks for changed endpoints,
- module docs checked or updated for changed routes, response shapes, calculations, batching, or workflows,
- authenticated local-data validation for data-bearing UI/API changes, or an explicit blocker.

The Orchestrator should not move an item to `Ready for QA` when developer-run validation is missing without a concrete blocker. QA should reject incomplete handoffs and send them back to implementation or clarification with specific missing evidence.

## Handoff And Blocker Quality

Every handoff must identify work item, state, mode, owner, lane/module, exact files changed or inspected, behavior/docs/contracts changed, checks run or skipped, assumptions, risks, blockers, shared-file requests, next gate, and evidence notes.

The Orchestrator rejects incomplete handoffs before integration, QA, post-QA Architect signoff after Lead validation, PO acceptance, or GitHub check-in. Missing handoff evidence sends the item back to the responsible role in `Revision Mode` or `Clarification Mode`.

The Orchestrator must actively check worker status throughout execution. Status checks are required when a handoff is expected, a board row appears stale, a user reports idle workers, a QA/review gate completes, or a blocker is reported. Each status check must reconcile the active board, worker state, dirty files, reserved write scopes, and next eligible gate before new work is assigned.

Workers must answer an Orchestrator status check with one of three outcomes: structured handoff, continued unblocked work, or blocker/clarification report. Silent waiting is treated as a process issue, not an acceptable work state.

After a developer hands work to QA, that developer may pull the next eligible implementation task if the Orchestrator updates the active board and confirms no file-scope conflict. If QA rejects the handed-off item, the Orchestrator assigns the revision to an available qualified developer. The original developer is preferred only when available; if already active on another task, another qualified idle developer can pick up the revision from the QA comments and work packet. No developer may own two active implementation or revision tasks at once.

Blockers and conflicts must be routed before lower-priority work:

- Developer blockers go to the Senior Fullstack Lead / Orchestrator.
- Architecture blockers go to the Solution Architect.
- Product/domain blockers go to the Product Owner.
- QA environment or evidence blockers go to QA and Orchestrator.
- Shared-file conflicts go to the Orchestrator and stop competing edits until resolved.
- Unresolved blockers must be recorded in `docs/codex-agent-team-plan/blocker-register.md` before the owner pulls unrelated work.

## Parallelism Guardrails

- Run up to three active implementation lanes by default.
- Add a fourth module developer only when the fourth task is independent and does not touch shared contracts.
- Each developer works on one active implementation or revision task at a time until the structured handoff is complete.
- Do not run parallel work against the same module unless file-level ownership is disjoint, documented, and agreed before work starts.
- If two developers need the same file or shared contract, pause one task and assign that file to the Senior Fullstack Lead / Orchestrator as an integration task.
- If two lanes need the same shared type, route registry, Prisma model, or shared UI component, promote that change into a small integration task owned by the Senior Fullstack Lead.
- Prefer upstream-first sequencing for intelligence workflows: Market Data Foundation and Data Quality before signals, signals before calibration/quality, strategy proof before decisions, decisions before trade plans and research hub.

## Required Work Item Labels

Use these labels in issue titles, branch names, or task headers when possible:

- `lane:data-quality`
- `lane:strategy-signals-risk`
- `lane:portfolio-alerts-ux`
- `role:product-owner`
- `role:solution-architect`
- `role:fullstack-lead`
- `role:module-developer`
- `role:qa`
