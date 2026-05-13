# Codex Agent Team Plan

## Purpose

This plan converts the product team into a realistic Codex-agent workflow. The goal is to keep agents working independently on separate module lanes while still sharing decisions, contracts, and verification evidence.

Codex agents should not wait for informal back-and-forth. They should work from explicit task briefs, publish structured handoffs, and escalate only decisions that affect product intent, architecture, shared files, or verification confidence.

## Practical Coordination Model

Codex agents coordinate through the lead/orchestrator and written artifacts, not uncontrolled direct edits.

- The main Codex session acts as **Senior Fullstack Lead / Orchestrator**.
- The orchestrator creates the work packet, assigns agents, reserves file/module write scopes, owns shared-file conflicts, and integrates final changes.
- Role agents publish short structured updates back to the orchestrator.
- Agents do not assume another agent's unstated work. If they need another lane's output, they use the latest written contract or ask the orchestrator for a decision.
- Agents may inspect shared files in parallel, but only the assigned owner edits them.

This is the realistic communication path for Codex work: task brief -> independent agent work -> structured handoff -> orchestrator integration -> QA verification -> post-QA Lead validation -> post-QA Architect signoff after Lead validation -> Product Owner acceptance -> GitHub check-in.

## Agent Roster

| Agent | Role | Main output | Default write scope |
|---|---|---|---|
| Product Owner Agent | Converts latest user direction into workflow, domain assumptions, market/quant rules, and acceptance criteria | Product brief and acceptance criteria | Docs, issue/task text, module docs sections |
| Solution Architect Agent | Defines architecture, contracts, module boundaries, data flow, scalability, and free/local compliance | Architecture brief and contract notes | Architecture docs, module contract notes |
| Senior Fullstack Lead / Orchestrator Agent | Coordinates agents, owns integration, reviews shared changes, resolves conflicts, and keeps work moving | Assignment packet, integration patch, final review | Shared files, route registries, integration edits |
| Data/Foundation Module Developer Agent | Implements complete vertical slices for market data and data-quality work | Backend/frontend/tests/docs for assigned data module | Lane 1 modules only |
| Strategy/Signals/Risk Module Developer Agent | Implements complete vertical slices for strategy, signal, backtest, decision, review, and trade-plan work | Backend/frontend/tests/docs for assigned strategy/risk module | Lane 2 modules only |
| Portfolio/UX Module Developer Agent | Implements complete vertical slices for portfolio, watchlist, alerts, notifications, and research UX work | Backend/frontend/tests/docs for assigned portfolio/UX module | Lane 3 modules only |
| QA Agent | Builds verification plan, reviews acceptance coverage, runs relevant tests, and records blockers | QA checklist, test evidence, regression risks | Test files only when assigned; otherwise verification notes |

The user remains the final source of Product Owner direction. The Product Owner Agent can make explicit assumptions to keep work moving, but must label them as assumptions when the user has not decided.

## Deep-Thinking Decision Standard

The Product Owner Agent and Solution Architect Agent must always work in deep-thinking mode.

For Codex runs, this means:

- use high or highest available reasoning effort for Product Owner and Solution Architect agents when the agent runtime exposes a reasoning-effort setting,
- inspect current docs, code ownership, roadmap, architecture, and module contracts before deciding,
- compare at least two realistic options for material product or architecture decisions,
- state assumptions, tradeoffs, risks, and the selected decision in the handoff,
- avoid rushed defaults when the decision affects market logic, quant interpretation, architecture, data contracts, schema, shared files, or release safety,
- publish concise decision rationale, not private scratchwork.

Deep-thinking mode applies even when implementation agents are working in parallel. Fast lane implementation must not outrun Product Owner domain decisions or Architect contract decisions.

## Agent Operating Modes

Agent operating modes describe what a Codex agent is allowed to do for a work item at a specific stage. These are project workflow modes, not the platform-level chat collaboration mode.

| Mode | Primary owner | Allowed actions | Forbidden actions | Exit condition |
|---|---|---|---|---|
| `Discovery Mode` | Any assigned agent | Read docs/code/tests, inspect contracts, identify gaps, propose scope | Editing files or claiming implementation completion | Findings or work-packet input is recorded |
| `Product Planning Mode` | Product Owner Agent | Create/refine requirements, user workflow, domain rules, priority, acceptance criteria | Architecture decisions, code edits, final QA claims | Product brief is ready for Orchestrator intake |
| `Orchestrator Intake Mode` | Senior Fullstack Lead / Orchestrator | Verify product brief completeness, record/update active board row, assign intake owner, move item to `Ready for Architecture` | Architecture decisions, implementation edits, bypassing incomplete acceptance criteria | Item is `Ready for Architecture` or returned for Product Owner revision/clarification |
| `Architecture Planning Mode` | Solution Architect Agent | Define module ownership, contracts, data flow, schema/shared impact, constraints, tradeoffs | Product acceptance, implementation edits unless explicitly assigned | Architecture contract is ready |
| `Implementation Mode` | Lane Developer Agent | Implement one reserved vertical slice, update module tests/docs, prepare handoff | Pulling a second task, editing unreserved files, changing PO intent | Developer handoff is complete and item is ready for QA |
| `QA Verification Mode` | QA Agent | Verify acceptance criteria, run/review tests, inspect evidence, record blockers | Product acceptance, architecture approval, production-code edits unless assigned | QA signs off or rejects with clear reasons |
| `Lead Validation Mode` | Senior Fullstack Lead / Orchestrator | Validate Architect asks, integration quality, shared files, public contracts after QA | Product acceptance, changing architecture intent without Architect | Lead validates or rejects with clear reasons |
| `Architect Signoff Mode` | Solution Architect Agent | Confirm business rules, architecture contract, solution quality, and local/free constraints after Lead validation | PO acceptance, developer implementation work unless reassigned | Architect signs off or rejects with clear reasons |
| `PO Acceptance Mode` | Product Owner Agent | Accept/reject delivered behavior against latest requirement and acceptance criteria | Code edits, architecture rewrites inside acceptance step | PO accepts or sends item to revision |
| `GitHub Check-In Mode` | Senior Fullstack Lead / Orchestrator | Stage only accepted requirement files, commit, push to `origin` on the active branch, record evidence | Committing unrelated local changes, rejected work, unaccepted requirements, secrets, `.env` files, database dumps, or generated artifacts unless explicitly accepted | Commit and push succeed and evidence is recorded |
| `Clarification Mode` | Blocked role plus escalation owner | Ask/answer unclear requirement, architecture, shared-file, or implementation questions | Continuing on guessed behavior when material ambiguity exists | Clarification is written back to the source artifact |
| `Revision Mode` | Orchestrator-assigned qualified owner | Fix the same rejected item, update evidence/tests/docs, return to rejecting gate | Pulling another task while owning the active revision, editing unreserved files | Corrected item returns to rejecting gate |

Role-to-mode matrix:

| Agent | Default modes | Notes |
|---|---|---|
| Product Owner Agent | `Product Planning Mode`, `PO Acceptance Mode`, `Clarification Mode` | Usually stays in planning/acceptance modes and deep-thinking mode; keeps the next priority batch moving |
| Solution Architect Agent | `Architecture Planning Mode`, `Architect Signoff Mode`, `Clarification Mode`, `Discovery Mode` | Switches between planning and signoff; uses deep-thinking mode for decisions |
| Senior Fullstack Lead / Orchestrator | `Discovery Mode`, `Orchestrator Intake Mode`, `Lead Validation Mode`, `GitHub Check-In Mode`, `Clarification Mode` plus integration coordination | Owns intake, work packets, reservations, shared-file integration, post-QA Lead validation, and GitHub check-in |
| Lane Developer Agent | `Discovery Mode`, `Implementation Mode`, `Revision Mode`, `Clarification Mode` | One active implementation or revision item only; rejected items are assigned by Orchestrator to an available qualified developer |
| QA Agent | `QA Verification Mode`, `Discovery Mode`, `Clarification Mode` | Can plan early from PO brief and update after architecture |

### Elastic QA Capacity

QA capacity can scale when the verification backlog would otherwise block flow. The Orchestrator may add QA workers when two or more items are in `Ready for QA`, `QA Verification Mode`, or QA evidence collection, or when one QA item is waiting on environment/live-data evidence while another item is ready for normal verification.

QA scaling rules:

- Assign one QA worker to one work item at a time.
- Each QA worker must own a separate evidence file or active-board evidence row to avoid write conflicts.
- QA workers may run tests in parallel only when the commands do not compete for the same browser state, ports, database mutation, generated output, or Playwright worker state. Use one worker for Playwright unless the suite is explicitly isolated.
- QA workers must not edit production source unless a work packet explicitly assigns test-code changes.
- A QA rejection must name the failed criterion, missing evidence, exact observed behavior, and recommended revision owner type; the Orchestrator assigns the revision to an available qualified developer.
- Final QA signoff for an item must be traceable to one QA owner, even if another QA worker supplied supporting evidence.

### Developer One-Task WIP And Revision Ownership

A lane developer owns one implementation or revision task at a time. After the developer completes the implementation handoff and the Orchestrator moves the item to `Ready for QA`, that developer may pull the next eligible implementation task if the active board shows WIP availability and file reservations do not conflict.

QA rejection does not require the original developer to abandon a newer active task. The Orchestrator assigns the rejected item in `Revision Mode` to an available qualified developer based on:

- current WIP availability,
- lane/module knowledge,
- reserved file ownership,
- urgency and dependency order,
- whether the original developer is free or already active on another implementation item.

If the original developer is available, prefer the original developer because they have context. If the original developer is busy, assign the revision to another available qualified developer or hold it until one is free. No developer may hold two active implementation/revision tasks at once.

Allowed after handoff to QA:

- pull the next eligible implementation task when the Orchestrator assigns it,
- answer lightweight QA or Orchestrator questions about the handed-off item,
- provide evidence notes that do not require source edits,
- return to the handed-off item only if the Orchestrator assigns it back in `Revision Mode`.

Forbidden after handoff to QA:

- editing the QA item while actively owning another implementation task,
- starting a new implementation task without Orchestrator assignment and board update,
- letting a rejected item remain unassigned when a qualified developer is available,
- assigning a revision to a developer whose current active task would be interrupted without explicit Orchestrator decision.

### Developer Pre-QA Validation Gate

Developers must test and validate their own changes before handing work to QA. QA is not the first place basic build, unit, route, or UI-smoke failures should be discovered.

Before a developer handoff can move to `Ready for QA`, the developer must run, at minimum:

- focused backend tests for changed backend modules,
- frontend build or typecheck for UI/type changes,
- focused Playwright smoke tests for changed UI workflows when practical,
- route/API contract checks for changed endpoints,
- module docs verification for changed routes, response shapes, calculations, or workflows,
- authenticated local-data validation for data-bearing UI/API changes, or a concrete blocker explaining why it could not be completed.

If a check cannot run, the handoff must record the exact skipped command, blocker reason, risk, and next owner. The Orchestrator must keep the item in `In Implementation`, `Clarification Mode`, or `Blocked` instead of moving it to `Ready for QA` when basic validation is missing without a valid blocker.

QA should reject a handoff that lacks required developer-run validation evidence unless the blocker is explicit and accepted in the work packet or active board.

Mode flow:

```text
PO Product Planning -> Orchestrator Intake -> Architect Planning -> QA Planning -> Lead Work Packet -> Developer Implementation -> QA Verification -> Lead Validation -> Architect Signoff -> PO Acceptance -> GitHub Check-In -> Released
```

Flow labels map to their documented modes: `PO Product Planning` -> `Product Planning Mode`, `Orchestrator Intake` -> `Orchestrator Intake Mode`, `Architect Planning` -> `Architecture Planning Mode`, `QA Planning` -> early `QA Verification Mode`, `Lead Work Packet` -> Orchestrator `Discovery Mode` plus integration coordination while preparing the work packet and reservations, `Developer Implementation` -> `Implementation Mode`, `QA Verification` -> `QA Verification Mode`, `Lead Validation` -> `Lead Validation Mode`, `Architect Signoff` -> `Architect Signoff Mode`, `PO Acceptance` -> `PO Acceptance Mode`, and `GitHub Check-In` -> `GitHub Check-In Mode`. `Released` has no active mode unless release follow-up is opened.

If rejected:

```text
Rejecting role records reason -> same item enters Revision Mode -> Orchestrator assigns an available qualified owner -> owner fixes one task at a time -> item returns to rejecting gate
```

Clarification path remains:

```text
Developer -> Lead/Orchestrator -> Architect -> Product Owner
```

## Guideline Sources And Loading Rules

Every agent must follow the project guidelines before making decisions, writing code, or signing off.

Mandatory baseline for all agents:

- `docs/AGENTS.md` for project rules, module boundaries, hardening sequence, testing expectations, and output expectations.
- `docs/instructions.md` for hard constraints, especially personal/local-first and free/open-source-only rules.
- `docs/codex-agent-team-plan/team-operating-model.md` for team authority, agile flow, WIP limits, and signoff order.
- `docs/codex-agent-team-plan/codex-agent-team.md` for Codex-agent communication, work packets, handoffs, single-writer reservations, and pull rules.
- `docs/codex-agent-team-plan/sdlc-operating-model.md` for work states, gates, decision records, release/rollback, data/security governance, blockers, debt, and retrospectives.
- `docs/codex-agent-team-plan/active-work-board.md` for current work state, owners, operating modes, blockers, reserved write scopes, and GitHub check-in tracking.

Role-specific guideline loading:

- Product Owner Agent reads `docs/roadmap.md`, relevant module docs, and Product Owner direction before creating or revising requirements.
- Solution Architect Agent reads `docs/architecture.md`, `docs/AGENTS.md`, relevant module docs, and affected public contracts before architecture decisions.
- Orchestrator reads `docs/codex-agent-team-plan/codex-agent-team.md`, `docs/AGENTS.md`, `docs/codex-agent-team-plan/active-work-board.md`, affected route/shared files, and all agent handoffs before assigning write reservations or integrating.
- Lane Developer Agent reads `docs/AGENTS.md`, `docs/architecture.md`, relevant module `{module}.md`, relevant backend/frontend source, and applicable tests before implementation.
- QA Agent reads `docs/AGENTS.md`, `docs/module-verification-register.md`, `docs/ux-ui-best-practices.md` for UI-facing work, relevant module docs, and the work packet before defining verification.

Task-specific guideline loading:

- UI-facing work must follow `docs/ux-ui-best-practices.md`.
- Data-bearing module work must follow `docs/module-verification-register.md` and the live-data validation requirements in `docs/AGENTS.md`.
- New module work must follow `docs/AGENTS.md`, `docs/architecture.md`, and the new-module flow in this document.
- Module hardening, polish, audit, verify, or continuation work must follow the mandatory hardening sequence in `docs/AGENTS.md`.
- Material product, architecture, schema, module-boundary, dependency, or cross-module decisions must use `docs/codex-agent-team-plan/decision-record-template.md`.
- Release candidates must use `docs/codex-agent-team-plan/release-checklist.md`.
- Deferred debt must be recorded in `docs/codex-agent-team-plan/technical-debt-register.md`.
- Blocking issues must be recorded in `docs/codex-agent-team-plan/blocker-register.md`.
- Top 5 batch reviews should use `docs/codex-agent-team-plan/retrospective-template.md`.
- Any work that changes routes, response shapes, calculations, persistence, batching, UX conventions, or architecture lessons must update module docs and relevant shared docs.

Every work packet must list the guidelines loaded for the task. Every handoff must mention any guideline conflict, skipped guideline, or unresolved ambiguity.

## Requirement Lifecycle: Product Owner To Product Owner

Every requirement starts with Product Owner intent, lands back with Product Owner acceptance, and then moves to GitHub check-in for release.

1. **Product Owner originates or changes the requirement**
   Define the market workflow, domain rule, user value, priority, acceptance criteria, and any changed roadmap assumption.
2. **Product Owner Agent produces the product brief**
   Convert the requirement into concrete workflow language, in-scope/out-of-scope behavior, domain assumptions, and acceptance checks.
3. **Senior Fullstack Lead / Orchestrator performs intake**
   Verify the product brief is complete enough for architecture, record or update the active board row, and move the item from `Product Brief Ready` to `Ready for Architecture`.
4. **Solution Architect Agent produces the architecture contract**
   Define module ownership, API/data contracts, schema impact, upstream/downstream dependencies, shared-file needs, scalability/robustness notes, and free/local compliance.
5. **QA Agent produces the verification plan**
   Translate acceptance criteria into backend, frontend, UI smoke, and live-data validation checks.
6. **Orchestrator creates the work packet**
   Merge product brief, architecture contract, QA plan, lane assignment, and single-writer reservations into one executable packet.
7. **Lane Developer Agent implements independently**
   Build the assigned vertical slice inside the reserved module/files and return a structured handoff.
8. **Orchestrator integrates and reviews**
   Apply shared-file changes, resolve conflicts, verify public contracts, and confirm no single-writer rule was broken.
9. **QA Agent verifies against acceptance criteria**
   Run or review the agreed checks and record evidence, blockers, or regression risks.
10. **Senior Fullstack Lead / Orchestrator validates after QA**
   Confirm the implemented work satisfies the Architect's contract and asks, shared-file expectations, public export/import rules, route registration needs, and integration quality before the Architect performs final post-QA signoff after Lead validation.
11. **Solution Architect Agent performs post-QA signoff after Lead validation**
   Review the integrated solution after QA evidence and post-QA Lead validation are available. Confirm business rules from the Product Owner brief were implemented correctly, the architecture contract is still intact, free/local constraints are preserved, and no design flaw or cross-module issue was introduced.
12. **Product Owner Agent performs acceptance review**
   Compare final behavior to the latest Product Owner requirement and acceptance criteria.
13. **Requirement returns to Product Owner**
    Mark accepted when criteria are met. If not met, return a revised requirement or explicit change request to step 1.
14. **Senior Fullstack Lead / Orchestrator checks in the accepted requirement**
     Stage only the accepted requirement's scoped files, including validated shared/integration files, commit the requirement, push to `origin` on the active branch, and record branch name, commit SHA, pushed remote, committed files, scoped-staging confirmation, unsafe/unaccepted-file exclusion confirmation, rollback notes, and CI status/link when available.

No work is considered complete only because code is merged or tests pass. It is complete when QA evidence is recorded, the Senior Fullstack Lead validates after QA, the Solution Architect signs off after Lead validation, Product Owner acceptance confirms the delivered behavior matches the latest requirement, and the accepted requirement's scoped files are committed and pushed to GitHub.

## Review Rejection And Clarification Rules

Every review level can reject an item. Rejection must be actionable, specific, and tied to the same work item.

Review levels:

- Senior Fullstack Lead integration review
- QA verification
- Senior Fullstack Lead post-QA validation
- Solution Architect post-QA signoff after Lead validation
- Product Owner acceptance
- GitHub check-in
- Release gate

If rejected:

- record the rejecting role, rejection date, affected requirement, failed acceptance criterion or architecture ask, exact evidence, and expected correction,
- set the item to `Needs Revision`,
- assign the same item back to the responsible role or developer,
- the Orchestrator assigns the same item in `Revision Mode` to an available qualified developer; the original developer is preferred only when available and not already active on another implementation task,
- update tests/docs/contracts when the rejection exposes a missing requirement or unclear contract,
- return the item to the rejecting gate after the correction is complete.

Clarification chain:

- Developers ask the Senior Fullstack Lead / Orchestrator when implementation details, file ownership, shared edits, or expected behavior are unclear.
- If the Lead cannot answer from the work packet, codebase, or architecture contract, the Lead asks the Solution Architect.
- If the Architect cannot answer because product intent, market logic, quant rule, workflow priority, or acceptance criteria are unclear, the Architect asks the Product Owner.
- Clarifications must be written back into the work packet, architecture contract, module docs, or acceptance criteria so the answer is reusable.

## Agile Priority Pipeline

This team must work agile, not waterfall. The Product Owner must not spend a long cycle creating a broad roadmap before the Architect and implementation agents receive useful work.

Startup rule:

- Product Owner Agent creates the first **Top 5 Priority Requirements** as small, high-value product briefs.
- Each requirement must include user workflow, domain assumptions, acceptance criteria, target module/lane if known, and a clear reason for priority.
- The first Top 5 are handed to the Orchestrator for intake immediately.
- The Orchestrator records each product brief on the active board, verifies architecture readiness, and moves ready items to `Ready for Architecture`.
- The Solution Architect Agent begins architecture contracts for `Ready for Architecture` items in priority order and releases each item to the orchestrator as soon as that item's contract is ready.
- QA can start planning for item 1 while the Architect is still working on items 2-5, and the Orchestrator can start implementation once item 1 reaches `Ready for Implementation`.
- The team must not wait for all five requirements to complete architecture before starting implementation on the first item that reaches `Ready for Implementation`.

Rolling backlog rule:

- After handing off the first Top 5, the Product Owner Agent immediately works on the broader roadmap and the next priority batch.
- The Product Owner Agent should keep at least five candidate requirements ready or nearly ready for Orchestrator intake whenever possible.
- If downstream agents are still processing the current Top 5, the Product Owner Agent refines the next batch, revises acceptance criteria from feedback, updates roadmap assumptions, and resolves domain questions.
- The Product Owner Agent should not be idle unless there are no domain decisions, roadmap updates, acceptance changes, or next-priority candidates to prepare.

Pull rule:

- Architect pulls from `Ready for Architecture`.
- QA pulls from `Product Brief Ready` for early planning and from `Ready for QA` for verification.
- Lane developers pull from `Ready for Implementation`, subject to single-writer reservations and WIP availability.
- Product Owner pulls from `Product Discovery`, `Architect Post-QA Signed Off`, `Needs Revision` when Product Owner-owned, and `Blocked` when Product Owner-owned.
- Orchestrator pulls from `Product Brief Ready` for intake, and from `Architecture Ready`, `QA Signed Off`, `PO Accepted`, `GitHub Check-In`, and `Blocked` for work-packet, validation, check-in, and blocker handling.
- Shared integration is an Orchestrator activity inside the relevant work state, not a separate state.

Work states:

- `Product Discovery`
- `Product Brief Ready`
- `Ready for Architecture`
- `Architecture Ready`
- `Ready for Implementation`
- `In Implementation`
- `Ready for QA`
- `QA Signed Off`
- `Lead Post-QA Validated`
- `Architect Post-QA Signed Off`
- `PO Accepted`
- `GitHub Check-In`
- `Released`
- `Needs Revision`
- `Blocked`

Minimum non-idle expectations:

- Product Owner Agent: maintain the next priority batch, answer domain questions, refine acceptance criteria, and update roadmap direction.
- Solution Architect Agent: produce architecture contracts, review shared-contract risks, and perform post-QA signoff after Lead validation on completed items.
- QA Agent: prepare verification scenarios early, review test gaps, and verify completed slices.
- Lane Developer Agents: inspect assigned modules, implement `Ready for Implementation` items, write/update tests, prepare handoffs, answer lightweight QA questions, and pick up Orchestrator-assigned revision work only when they have no other active implementation or revision task.
- Orchestrator: maintain work packets, reservations, dependency status, shared-file ownership, integration order, clarification routing, and post-QA Lead validation.

## Live Work Board

`docs/codex-agent-team-plan/active-work-board.md` is the live board for active Codex-agent execution.

- The Senior Fullstack Lead / Orchestrator owns board updates.
- Product Owner priority changes, architecture readiness, QA readiness, implementation ownership, blockers, revision loops, signoffs, and GitHub check-in evidence must be reflected on the board.
- A developer may not start implementation unless the board shows their active item, lane/module, operating mode, and reserved write scope.
- The board must show one active implementation item per lane developer.
- A rejected item remains on the same board row and moves to `Needs Revision` until the responsible owner resolves it.
- Product Owner keeps the next priority candidates section warm while downstream agents work on the current Top 5.

## First-Run Kickoff Protocol

Use this startup sequence when beginning a fresh multi-agent Codex batch.

1. **Orchestrator loads baseline context**
   Read `docs/AGENTS.md`, `docs/instructions.md`, `docs/codex-agent-team-plan/team-operating-model.md`, `docs/codex-agent-team-plan/codex-agent-team.md`, `docs/codex-agent-team-plan/sdlc-operating-model.md`, and `docs/codex-agent-team-plan/active-work-board.md`; inspect current branch, remote, dirty files, and existing work state.
2. **Product Owner creates the first Top 5**
   Produce five small product briefs with priority rank, workflow, value, domain assumptions, in/out-of-scope notes, and acceptance criteria.
3. **Orchestrator records and intakes the Top 5**
   Add the five items to `docs/codex-agent-team-plan/active-work-board.md` with state, mode, lane/module guess, owner, and next action; verify product brief completeness and move complete items to `Ready for Architecture`.
4. **Architect starts priority-order contracts**
   Pull from `Ready for Architecture`, create the architecture contract for item 1 first, then continue items 2-5; release each item independently to the Orchestrator when it reaches `Architecture Ready`.
5. **QA starts early planning**
   Draft acceptance scenarios from Product Owner briefs and refine them when architecture contracts are available.
6. **Developers start with discovery only**
   Lane developers inspect likely modules and tests, but do not edit implementation files until the Orchestrator assigns a work packet and reserved write scope.
7. **Orchestrator starts the first implementation lane**
   When an item has a product brief, architecture contract, QA plan, and non-conflicting reservation, assign exactly one developer and move it to `Ready for Implementation`.
8. **Kickoff is complete**
   The board shows Top 5 items, next priority candidates, owner/mode for each active item, reserved write scopes, and known blockers.

## Priority Change Protocol

The Product Owner can change priority, scope, or acceptance criteria at any time, but active work must be reconciled before agents continue.

- Product Owner records the change reason, affected work items, new priority, changed acceptance criteria, and whether each affected item should continue, pause, revise, or cancel.
- Orchestrator updates `docs/codex-agent-team-plan/active-work-board.md` before downstream work continues.
- If the changed item is not yet in implementation, update the product brief and send it back through architecture or QA planning as needed.
- If the changed item is in implementation, the developer pauses new edits, keeps current files untouched, and waits for the Orchestrator to decide whether the item becomes `Needs Revision`, returns to architecture, or is cancelled.
- If the change affects architecture, shared files, schema, API contracts, or cross-module behavior, the Architect must update the contract before implementation resumes.
- If the change invalidates QA scenarios, QA updates the verification plan before signoff.
- Cancelled work is not committed or pushed unless the Product Owner explicitly accepts a scoped partial result.

## Handoff Quality Gate

The Orchestrator rejects incomplete handoffs before integration, QA, post-QA Architect signoff after Lead validation, PO acceptance, or GitHub check-in.

A valid handoff must include:

- current work item, state, operating mode, owner, lane/module, and next gate,
- exact files changed or exact files inspected when no edits were made,
- behavior changed, docs changed, and public contract changes,
- tests/checks run with outcomes, skipped checks with blockers, and manual/live-data evidence when required,
- assumptions, tradeoffs, risks, guideline gaps, and unresolved ambiguity,
- shared-file changes requested from the Orchestrator,
- rejection or revision status, if applicable,
- GitHub check-in evidence when the handoff is from check-in or release work.

If any required field is missing, the item returns to the responsible role in `Revision Mode` or `Clarification Mode`; the next gate does not start.

### Handoff Response SLA

Agents must not sit in a silent waiting state after finishing work or receiving a status request.

- When implementation, discovery, QA verification, architecture, or PO planning is complete, the agent must immediately return the structured handoff.
- When blocked, the agent must immediately report the blocker, the exact decision needed, the escalation owner, and the same-item work that can continue without violating the blocker.
- When the Orchestrator sends a status-check instruction, the agent must either hand off, continue unblocked work, or report the blocker. Waiting for informal approval is not a valid state unless the plan artifact records the explicit gate.
- The Orchestrator must update `docs/codex-agent-team-plan/active-work-board.md` in the same orchestration cycle after receiving a handoff, rejection, blocker, or assignment change.
- If the board and actual worker state differ, the board is corrected first before new work is assigned.

### Orchestrator Status Cadence

The Senior Fullstack Lead / Orchestrator must actively monitor worker flow instead of assuming agents will self-report perfectly.

- Check all active agents whenever a handoff is expected, a board row has not changed after meaningful work time, or the user reports idle workers.
- During long-running work, perform a status sweep before assigning any new work and after every completed handoff, QA rejection/signoff, blocker report, or scope change.
- A status sweep must compare the active board against actual worker state, current `git status --short`, reserved write scopes, and known gate dependencies.
- If an agent appears idle while its board row says active, send a status-check instruction requiring one of three responses: structured handoff, continue unblocked work, or blocker/clarification report.
- If an agent is done but the board still shows active implementation, move the item to the correct next gate before assigning new work.
- If an item is in QA and its developer has completed a valid handoff, the developer is free for the next eligible Orchestrator-assigned implementation task unless the board explicitly reserves them for same-item support.
- If QA rejects an item while the original developer is busy, assign the revision to another available qualified developer with a non-conflicting write scope, or hold it until such a developer is available.
- If an agent is genuinely free, refill from this order: active `Needs Revision` item matching their skills, same-lane `Ready for Implementation`, interruptible read-only discovery, QA/support evidence that does not require source edits, next-batch Product/Architecture planning. Never refill with a task that conflicts with reserved files.
- Record persistent stuck states in `docs/codex-agent-team-plan/blocker-register.md` with owner, decision needed, next action, review date, and safe parallel work.

### Laptop Resource Gate

The Orchestrator must check laptop memory utilization before starting new local processes or adding new workers when active execution is already running.

- Do not start new local dev servers, test runs, browser/Playwright runs, Docker services, build processes, or new Codex worker agents when memory utilization is at or above 95%.
- Once memory utilization reaches 95% or higher, pause new process/worker starts until memory utilization drops below 90%.
- Existing in-flight work can finish unless it is clearly causing instability; prefer waiting for current processes to complete before starting more.
- Lightweight documentation edits, board updates, and status messages may continue while the memory gate is closed.
- Every status sweep should include a resource check before starting process-heavy validation or spawning additional workers.
- If memory cannot be measured because the OS denies access, treat process-heavy starts as blocked until the Orchestrator obtains a reliable reading or the user explicitly permits continuing.

## Blocker And Conflict SLA

Use this response order for blockers and conflicts so agents do not wait silently.

- A developer blocker goes to the Senior Fullstack Lead / Orchestrator before the developer pulls any new implementation task.
- Shared-file, route, schema, generated type, package, or CI conflicts are handled by the Orchestrator before any lane continues editing those files.
- Architecture blockers are handled by the Solution Architect before the Architect pulls lower-priority architecture work.
- Product/domain blockers are handled by the Product Owner before the Product Owner spends time grooming lower-priority backlog.
- QA environment or evidence blockers are recorded before QA signoff and reviewed before release.
- If a blocker cannot be resolved in the current Codex work session, record it in `docs/codex-agent-team-plan/blocker-register.md` with owner, next action, review date, and parallel work available before the owner pulls unrelated work.

## Lane Ownership

### Lane 1: Market Data / Data Quality

Assigned to the Data/Foundation Module Developer Agent.

Owns:

- `backend/src/modules/market-data-foundation`
- `backend/src/modules/data-quality-engine`
- `backend/src/modules/historical-context-snapshots`
- matching frontend features under `frontend/src/features`
- module-specific tests and docs for those modules

### Lane 2: Strategy / Signals / Risk

Assigned to the Strategy/Signals/Risk Module Developer Agent.

Owns:

- `signal-generation-engine`
- `signal-quality-lab`
- `signal-calibration-engine`
- `strategy-framework`
- `backtesting-strategy-lab`
- `strategy-decision-engine`
- `today-trade-review`
- `trade-plan-risk-engine`
- matching frontend features, tests, and docs

### Lane 3: Portfolio / Watchlists / Alerts / UX

Assigned to the Portfolio/UX Module Developer Agent.

Owns:

- `portfolio-management`
- `portfolio-intelligence`
- `watchlist-management`
- `alerts-monitoring`
- `notifications-delivery`
- `research-hub`
- `stock-research-workbench`
- `ai-investment-copilot`
- matching frontend features, tests, and docs

### Cross-Cutting Modules

`auth-identity` and `subscription-billing` require orchestrator assignment before edits. They affect ownership, access, feature gates, and multiple lanes.

## New Module Intake And Assignment

When the Product Owner introduces a new module, it must go through module validation before any developer picks it up.

1. **Product Owner Agent proposes the new module**
   Define the business capability, user workflow, domain rules, priority, acceptance criteria, and why the capability may need separate ownership as a product brief.
2. **Senior Fullstack Lead / Orchestrator performs intake**
   Verify the product brief is complete, record the active board row, and move the item to `Ready for Architecture` before architecture work starts.
3. **Solution Architect Agent validates module necessity**
   Decide whether to create a new module or extend an existing module. A new module is allowed only when the capability has distinct business ownership, separate data/API contracts, independent release risk, or clear long-term module boundaries.
4. **Solution Architect Agent assigns the ownership lane and contract**
   Assign the module to Lane 1, Lane 2, Lane 3, or a cross-cutting/platform track, and document backend/frontend paths, public exports, route registration, schema/shared impact, and local/free compliance. If it is cross-cutting, the Architect must define extra review gates for auth, subscription, shared data, and route impact.
5. **QA Agent creates the verification plan**
   Translate the Product Owner acceptance criteria and architecture contract into backend, frontend, UI smoke, live-data, and regression checks before implementation starts.
6. **Orchestrator creates the new-module work packet**
   Merge the product brief, architecture contract, QA plan, lane assignment, WIP check, and single-writer reservations; reserve new backend/frontend module paths, docs, tests, route registration changes, and any shared-file changes; then move the item to `Ready for Implementation`.
7. **Developer implementation starts after `Ready for Implementation`**
   The assigned developer owns backend, frontend, tests, docs, and module public exports for the first implementation slice only after the item is `Ready for Implementation`. WIP limit remains one active task.
8. **QA, Lead, Architect, Product Owner, and Orchestrator complete the normal gates**
   QA verifies, Senior Fullstack Lead validates after QA, Solution Architect signs off after Lead validation, Product Owner accepts or revises, and Senior Fullstack Lead / Orchestrator performs GitHub check-in after acceptance.

Default new module path pattern:

- backend: `backend/src/modules/{module-name}`
- frontend: `frontend/src/features/{module-name}`
- docs: module-owned `{module-name}.md` plus any architecture/team docs affected
- tests: module-owned backend tests and `frontend/tests/ui/{module-name}.spec.ts` when UI-facing

The developer is chosen by the Architect's lane assignment and Orchestrator availability check. No developer self-assigns a new module without a work packet.

## Shared Files

Shared files are not open territory. They are owned by the Senior Fullstack Lead / Orchestrator unless explicitly assigned.

Shared files include:

- `backend/src/api/routes.ts`
- `frontend/src/app/routes.tsx`
- `frontend/src/app/NavigationLayout.tsx`
- `frontend/src/shared/*`
- `backend/src/shared/*`
- `backend/prisma/schema.prisma`
- global configs, package manifests, test setup, and CI files
- architecture, team, and project-wide process docs

If a lane needs a shared-file change, the lane agent reports the exact requested edit in its handoff. The orchestrator applies or assigns that edit after checking conflicts.

## Single-Writer Rule

No two agents may edit the same file, module, test spec, migration, generated type, or route registry during the same implementation pass.

Before implementation starts, the orchestrator must publish a write reservation table:

| Agent | Reserved write scope | Read-only scope | Explicitly forbidden scope |
|---|---|---|---|
| Product Owner Agent | Product briefs and assigned docs only | Entire repo | Code unless explicitly assigned |
| Solution Architect Agent | Architecture/contract docs only | Entire repo | Implementation code unless explicitly assigned |
| Lane Developer Agent | Assigned module backend/frontend/tests/docs only | Neighbor modules and shared files | Other lane modules and shared files |
| QA Agent | Assigned test files or verification notes only | Entire repo | Production code unless explicitly assigned |
| Orchestrator | Shared files and integration edits | Entire repo | None, but must avoid overwriting lane work |

If two tasks need the same file, the orchestrator must choose one owner and convert the other task to read-only analysis or a written patch recommendation. The second agent must not make a competing edit.

If an agent discovers that it must edit an unreserved file, it must stop before editing that file and request orchestrator reassignment. The orchestrator either expands that agent's reservation, assigns the file to another agent, or defers the change.

## Parallel Work Rules

- Start Product Owner, Solution Architect, QA, and relevant lane agents in parallel for discovery and task shaping.
- Start implementation only after the orchestrator assigns disjoint write scopes and file/module reservations.
- A lane agent should always own a full vertical slice for one module: backend, frontend, tests, and docs.
- Each lane developer agent has a WIP limit of one active implementation task.
- A lane developer agent must finish the assigned task implementation handoff before pulling another implementation task.
- End to end for the active developer means implementation, module tests/docs updates, structured handoff, and any source-edit revision work explicitly assigned while they have no other active implementation/revision item.
- Do not split developer focus across two active implementation items, even when both are in the same lane.
- Never allow two agents to edit the same module, file, test spec, migration, route registry, generated type, or shared component in the same implementation pass.
- If a lane is waiting on a contract, it should continue with local inspection, test planning, fixture review, or module documentation gaps instead of idling.
- If shared files are needed, the lane agent should provide a patch recommendation but not edit the shared file unless assigned.
- If Product Owner requirements change mid-task, all agents should stop relying on stale assumptions and update their handoff against the latest requirement.

## Work Packet Template

Every parallel effort starts with a work packet.

```markdown
# Codex Work Packet

## Operating Mode
- Current mode:
- Mode owner:
- Allowed actions in current mode:
- Forbidden actions in current mode:
- Next mode:
- Clarification mode active:
- Revision mode active:
- Orchestrator intake complete, if applicable:

## Priority Pipeline
- Priority batch:
- Priority rank:
- Active work board row:
- Work state:
- Next PO batch status:
- Downstream pull target:

## Guidelines Loaded
- Baseline docs:
- Role-specific docs:
- Module docs:
- UI/data/new-module/hardening docs:
- SDLC docs:
- Guideline conflicts or ambiguities:

## Product Goal
- Latest Product Owner direction:
- User workflow:
- Domain assumptions:
- Product Owner decision rationale:
- Priority change impact:
- Continue / pause / revise / cancel:
- Acceptance criteria:
- Acceptance return path:

## Architecture Contract
- Owning module:
- New module or existing module:
- New module justification:
- Assigned ownership lane:
- Upstream dependencies:
- Downstream dependencies:
- API/data contract:
- Schema impact:
- Shared files requiring orchestrator ownership:
- Free/local compliance notes:
- Architecture decision rationale:

## Agent Assignments
- Product Owner Agent:
- Product Owner Agent reasoning effort:
- Solution Architect Agent:
- Solution Architect Agent reasoning effort:
- Senior Fullstack Lead / Orchestrator:
- Lane agent:
- Lane agent active task:
- Lane agent WIP status:
- QA Agent:

## Write Boundaries
- Agent:
- Allowed files:
- Reserved files/modules:
- Read-only files/modules:
- Forbidden/conflict-prone files:
- Shared-file changes requested from orchestrator:

## Verification
- Backend tests:
- Frontend build/typecheck:
- UI smoke tests:
- Manual live-data validation:
- QA signoff:
- Post-QA Lead validation:
- Post-QA Architect signoff after Lead validation:
- Product Owner acceptance:
- GitHub check-in owner:
- GitHub check-in required:
- Active branch:
- Pushed remote:
- Commit SHA:
- Files committed:
- Scoped-staging confirmation:
- Unsafe/unaccepted-file exclusion confirmation:
- Unrelated local changes excluded:
- Rejected or unaccepted work excluded:
- Secrets, `.env`, database dumps, and generated artifacts excluded:
- Rollback notes:
- CI status/link:
- Decision record needed:
- Release checklist needed:
- Debt/blocker entries:
```

## Agent Handoff Template

Each agent finishes with a handoff that another agent can act on without guessing.

```markdown
# Agent Handoff

## Agent
- Role:
- Assigned lane/module:
- Work item:
- Work state:
- Current mode:
- Mode owner:
- Allowed actions in current mode:
- Forbidden actions in current mode:
- Next mode:
- Next gate:
- Orchestrator intake complete, if applicable:

## Completed
- Files changed:
- Behavior changed:
- Docs updated:

## Contracts
- API/data contract changes:
- Shared-file changes requested:
- Assumptions made:
- Decision rationale:
- Tradeoffs considered:

## Verification
- Tests run:
- Tests not run and why:
- Manual checks:
- Evidence links or notes:
- Guidelines followed:
- Guideline gaps:

## GitHub Check-In
- Required:
- Active branch:
- Pushed remote:
- Commit SHA:
- Files committed:
- Scoped-staging confirmation:
- Unsafe/unaccepted-file exclusion confirmation:
- Unrelated local changes excluded:
- Rejected or unaccepted work excluded:
- Secrets, `.env`, database dumps, and generated artifacts excluded:
- Rollback notes:
- CI status/link:

## Blockers
- Decisions needed:
- Risks:
- Follow-up tasks:
- Clarification path used:
- Rejection/revision status:
- Handoff quality complete:
```

## Default Execution Pattern

1. **Product Owner Agent creates the first Top 5**
   Produce five small, prioritized product briefs instead of waiting for a complete broad roadmap.
2. **Solution Architect Agent starts on the Top 5**
   Work in priority order and release each `Architecture Ready` item independently to the Orchestrator.
3. **Product Owner Agent moves to the next batch**
   While Architecture, QA, and implementation proceed, prepare the broader roadmap and next priority list.
4. **QA Agent starts early**
   QA drafts acceptance scenarios, likely regression risks, and the test commands or browser checks that will prove the workflow.
5. **Lane agents inspect in parallel**
   Each assigned lane agent audits its module and proposes file-level implementation scope.
6. **Orchestrator creates work packets per item**
   Finalize latest user direction, target modules, lane ownership, shared files, QA plan, WIP status, and verification expectations for each `Architecture Ready` item.
7. **Orchestrator freezes write boundaries for the item**
   This does not freeze requirements forever. It reserves files/modules to single owners so two agents do not edit the same piece of code during the current implementation pass.
8. **Lane agents implement independently**
   Each lane developer works on exactly one active implementation task, inside assigned module scopes, until the end-to-end handoff is complete.
9. **Orchestrator integrates shared edits**
   The orchestrator updates route registries, shared types, shared UI, Prisma, or docs after checking all handoffs.
10. **QA Agent verifies**
   QA runs or reviews relevant backend tests, frontend build, UI smoke tests, and live-data validation requirements.
11. **Senior Fullstack Lead validates after QA**
   Confirm the implemented solution satisfies the Architect's asks, shared-file expectations, integration requirements, code shape, and public contract usage before Architect signoff after Lead validation.
12. **Solution Architect Agent signs off after post-QA Lead validation**
   Confirm business rules, architecture contract, integration behavior, scalability/robustness expectations, and local/free-tool constraints still hold after implementation, QA evidence, and post-QA Lead validation.
13. **Product Owner Agent checks acceptance**
    Confirm behavior against latest Product Owner direction and record any changed requirements for the next pass.
14. **Senior Fullstack Lead checks in accepted work**
    Stage only the accepted requirement's scoped files, commit them, push to `origin` on the active branch, and record GitHub check-in evidence before marking the item released.

## Anti-Blocking Policy

Agents should not sit idle when a dependency is pending. Use this fallback order:

1. Inspect assigned module files and public contracts.
2. Identify exact write scope and conflict risks.
3. Draft tests or acceptance scenarios.
4. Pull the next eligible work state for that role.
5. Update module docs with verified current-state notes.
6. Prepare a handoff with the decision needed.

Only block when a choice changes product intent, architecture contract, schema design, shared-file ownership, or release safety.

## Communication Rules

- Keep updates short and structured.
- Name the affected module and files.
- Separate facts from assumptions.
- Mark any Product Owner assumption clearly.
- Mark any architecture constraint clearly.
- Use the clarification chain: Developer -> Lead/Orchestrator -> Architect -> Product Owner.
- Rejection reasons must be clear enough for the responsible role to fix the same item in the next iteration.
- Never hide skipped tests or live-data blockers.
- Never mark an accepted requirement as released until its scoped files are committed and pushed to `origin`.
- Never introduce paid dependencies, paid services, paid data providers, paid AI services, paid hosted testing, or paid hosted infrastructure.
