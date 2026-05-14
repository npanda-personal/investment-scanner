# SDLC Operating Model

## Purpose

This document gives the Codex-agent team enough process to operate independently without becoming heavyweight. It defines work states, quality gates, evidence requirements, release controls, rollback expectations, decision records, data governance, security, observability, blockers, technical debt, and retrospectives.

The process stays personal/local-first. Do not add paid services, paid tooling, paid data providers, paid AI services, paid hosted testing, or paid infrastructure.

## Operating Principles

- Work in small vertical slices that deliver user-visible or module-verifiable value.
- Keep the Top 5 priority pipeline moving; do not wait for a full roadmap before starting useful work.
- Keep a minimum refined product backlog of five candidate requirements, bugs, enhancements, or app-review findings so the Product Owner lane does not stop after one requirement batch.
- Keep one active implementation task per developer agent.
- Use the single-writer rule for files/modules.
- Preserve module boundaries and public contracts.
- Treat tests, live-data checks, and docs as delivery artifacts, not optional cleanup.
- Clean up repo-local Node/Vite/Playwright/backend services after completed or interrupted work when memory is above 90%.
- Final completion requires QA evidence, post-QA Lead validation, post-QA Architect signoff after Lead validation, Product Owner acceptance, and a scoped GitHub check-in.

## Work States

Use these states for every requirement, bug, hardening task, or new module.

| State | Owner | Exit criteria |
|---|---|---|
| `Product Discovery` | Product Owner Agent | Product intent, value, domain assumptions, and priority are clear enough for a brief |
| `Product Brief Ready` | Product Owner Agent | Acceptance criteria, in/out of scope, and target lane/module guess are written |
| `Ready for Architecture` | Orchestrator | Product brief is complete enough for architecture |
| `Architecture Ready` | Solution Architect Agent | Module ownership, contracts, dependencies, data/schema impact, and local/free compliance are documented |
| `Ready for Implementation` | Orchestrator | Work packet, single-writer reservations, WIP availability, and QA plan exist |
| `In Implementation` | Lane Developer Agent | One developer is actively implementing the reserved vertical slice |
| `Ready for QA` | Lane Developer Agent / Orchestrator | Implementation handoff is complete, shared edits integrated, and claimed checks are run or blockers recorded |
| `QA Signed Off` | QA Agent | Agreed verification passed or explicit accepted blockers are recorded |
| `Lead Post-QA Validated` | Senior Fullstack Lead / Orchestrator | Architect asks, integration expectations, shared-code impact, and public contracts were validated after QA |
| `Architect Post-QA Signed Off` | Solution Architect Agent | Business rules, architecture contract, solution quality, and local/free constraints still hold after post-QA Lead validation |
| `PO Accepted` | Product Owner Agent | Delivered behavior matches latest PO acceptance criteria |
| `GitHub Check-In` | Senior Fullstack Lead / Orchestrator | Accepted requirement files are scoped, committed, and pushed to `origin` on the active branch with evidence recorded |
| `Released` | Orchestrator | GitHub check-in succeeded, release checklist is complete, and rollback notes are recorded |
| `Needs Revision` | Any gate owner | Revision reason and next owner are recorded |
| `Blocked` | Any role | Blocker owner, blocker type, next action, and review date are recorded |

## Operating Modes

Operating modes define what each agent may do while a work item is in a state. The detailed mode definitions live in `docs/codex-agent-team-plan/codex-agent-team.md`.

| Work state | Expected operating mode |
|---|---|
| `Product Discovery` | `Product Planning Mode` or `Discovery Mode` |
| `Product Brief Ready` | `Orchestrator Intake Mode`; QA may enter early `QA Verification Mode` for planning |
| `Ready for Architecture` | `Architecture Planning Mode` |
| `Architecture Ready` | `Discovery Mode` and Lead work-packet preparation only; implementation is not allowed in this state |
| `Ready for Implementation` | `Implementation Mode` after work packet, QA plan, WIP check, and single-writer reservations |
| `In Implementation` | `Implementation Mode` |
| `Ready for QA` | `QA Verification Mode` |
| `QA Signed Off` | `Lead Validation Mode` |
| `Lead Post-QA Validated` | `Architect Signoff Mode` |
| `Architect Post-QA Signed Off` | `PO Acceptance Mode` |
| `PO Accepted` | `GitHub Check-In Mode` |
| `GitHub Check-In` | `GitHub Check-In Mode` |
| `Released` | No active mode unless release follow-up is opened |
| `Needs Revision` | `Revision Mode` for the responsible owner |
| `Blocked` | `Clarification Mode` or blocker-owner action |

Every work packet and PR should record current mode, owner, allowed actions, forbidden actions, next mode, and whether clarification or revision mode is active.

Normal release transition after acceptance:

```text
PO Accepted -> GitHub Check-In -> Released
```

## Quality Gates

No item may skip gates unless the Product Owner explicitly changes scope and the Architect records the risk.

1. **Product Gate**
   Product brief has user workflow, priority, domain assumptions, acceptance criteria, and in/out-of-scope boundaries.
2. **Orchestrator Intake Gate**
   Orchestrator confirms product brief completeness, records the active board row, verifies readiness for architecture, and moves the item to `Ready for Architecture`.
3. **Architecture Gate**
   Architect records module ownership, contracts, schema/data impact, shared files, scalability/robustness risks, and free/local compliance.
4. **Implementation Gate**
   Orchestrator assigns one developer, one active task, and single-writer reservations.
5. **Developer Handoff Gate**
   Developer records work item, state, mode, files changed, behavior changed, docs updated, tests run, tests skipped, assumptions, risks, blockers, next gate, and shared-file requests.
6. **QA Gate**
   QA verifies agreed backend/frontend/UI/live-data evidence or records a blocker.
7. **Post-QA Lead Validation Gate**
   Senior Fullstack Lead validates the implemented work against Architect asks, integration expectations, shared-code impact, and public contracts after QA evidence.
8. **Post-QA Architect Gate**
   Architect reviews the final implemented solution after QA evidence and post-QA Lead validation.
9. **Product Acceptance Gate**
   PO accepts, rejects, or revises based on latest acceptance criteria.
10. **GitHub Check-In Gate**
   Senior Fullstack Lead / Orchestrator stages only the accepted requirement's scoped files, commits them, pushes to `origin` on the active branch, and records branch, commit SHA, pushed remote, committed files, scoped-staging confirmation, unsafe/unaccepted-file exclusion confirmation, rollback notes, and CI status/link when available.
   The scoped files must include all task-owned documentation and evidence for the accepted requirement: product brief, work packet, architecture contract or addendum, QA plan/evidence, developer handoff, Lead validation, Architect signoff, PO acceptance, GitHub check-in note, release checklist entry, active-board update, and blocker or decision records created for that task.
   Unrelated future-backlog, preimplementation, rejected, or unaccepted docs must stay unstaged unless the Product Owner explicitly accepts them as part of the same requirement.
11. **Release Gate**
   Orchestrator confirms build/test evidence, docs, migration/data safety, and rollback notes.

## Rejection And Clarification Governance

Every review gate may reject an item. Rejections must be explicit enough for the responsible owner to correct the same item in the next iteration.

Required rejection fields:

- rejecting role,
- gate that rejected,
- failed acceptance criterion, Architect ask, test expectation, business rule, or contract,
- evidence observed,
- expected correction,
- responsible owner,
- return gate after correction.

Rejected implementation items remain assigned to the same developer until the correction is complete or the Orchestrator explicitly reassigns the item. Developers do not pull a new implementation task while their active item is rejected.

Clarification path:

- Developer asks Senior Fullstack Lead / Orchestrator.
- Lead asks Solution Architect if the answer requires architecture, contract, shared-code, or design judgment.
- Architect asks Product Owner if the answer requires product intent, market/quant/domain judgment, workflow priority, or acceptance criteria.
- Final answers must be written back into the relevant work packet, architecture contract, acceptance criteria, module docs, decision record, or blocker entry.

Assumption control:

- Implementation cannot start from an inferred next step. It must be tied to Product Owner priority, an active-board row, or recorded Product Owner / Architect clarification.
- Conflicts between roadmap, board, packet, evidence, or runtime state must be resolved through the clarification path before code edits continue.
- Read-only discovery can proceed with labeled tentative assumptions, but tentative assumptions cannot authorize implementation, acceptance, release, or GitHub check-in.

Priority changes follow the same governance. When Product Owner changes priority, scope, or acceptance criteria, the Orchestrator updates `docs/codex-agent-team-plan/active-work-board.md`, identifies affected items, and moves each item to the earliest invalidated gate before downstream work continues.

## Evidence Rules

Every work item must leave evidence, even when blocked.

- Product evidence: product brief, acceptance criteria, domain assumptions, and priority reason.
- Architecture evidence: architecture contract, alternatives/tradeoffs, risks, and module ownership decision.
- Implementation evidence: changed files, behavior summary, tests/docs updated, and handoff.
- Handoff quality evidence: work item, state, mode, owner, lane/module, exact files changed or inspected, checks run/skipped, assumptions, risks, blockers, shared-file requests, next gate, and evidence notes.
- QA evidence: commands/checks run, result, logs/screenshots when useful, and skipped-test reasons.
- Data evidence: live-data validation for data-bearing UI/API changes.
- GitHub check-in evidence: active branch, pushed remote, commit SHA, committed files, scoped-staging confirmation, unsafe/unaccepted-file exclusion confirmation, rollback notes, and CI status/link when available.
- Documentation check-in evidence: confirmation that every task-owned doc/evidence file for the accepted requirement was committed and pushed with the task, or an explicit reason a doc was excluded because it belongs to unrelated future work, rejected work, or unaccepted scope.
- Release evidence: release checklist, GitHub check-in evidence, and rollback notes.
- Decision evidence: decision record for material product, architecture, schema, dependency, or module-boundary decisions.

## Decision Records

Create a decision record for decisions that are hard to reverse or affect more than one module.

Use `docs/codex-agent-team-plan/decision-record-template.md`.

Decision records are required for:

- new module creation or module deprecation,
- cross-module contracts,
- schema or migration strategy,
- reusable domain/quant rule changes,
- public API response shape changes,
- shared UI or shared utility patterns,
- dependency additions or removals,
- release/rollback risk acceptance,
- deviations from existing architecture docs.

Store decision records as `docs/codex-agent-team-plan/decisions/YYYY-MM-DD-short-title.md` when possible. If the directory does not exist yet, create it with the first decision record.

## Testing Strategy Matrix

| Test/check | Owner | When required |
|---|---|---|
| Backend unit/service tests | Lane Developer Agent | Backend logic, calculations, filtering, persistence, batching, idempotency |
| Backend API/integration checks | Lane Developer Agent / QA | Route behavior, request/response contracts, auth/scope behavior |
| Frontend build/typecheck | Lane Developer Agent / QA | Frontend or shared type changes |
| Playwright UI smoke tests | QA / Lane Developer Agent | UI-facing workflow changes |
| Live-data validation | QA / Lane Developer Agent | Data-bearing UI/API changes |
| Manual browser verification | QA / Orchestrator | Bulk, provider-heavy, authenticated, or local-data workflows |
| Dependency/security check | Orchestrator | New dependency, release candidate, or security-sensitive change |

Skipped tests must name the blocker. Backend-only tests are not a substitute for UI verification when UI behavior changed.

## Data And Migration Governance

Data is part of the product contract.

- Schema changes require Architect review before implementation.
- Destructive data changes require an explicit backup/rollback note.
- Migrations or Prisma pushes must include expected data impact, rollback strategy, and local verification plan.
- Data repair scripts must be idempotent or explicitly one-time with preconditions and evidence.
- Read paths must not silently hide stale/legacy data unless the module docs explain the behavior.
- Provider-heavy or full-universe jobs must stay bounded, observable, and manually verified rather than placed in routine UI smoke tests.
- Market scope (`region`, `assetType`) must be preserved across data-bearing APIs and UIs.

## Security And Secrets

Local-first does not remove security requirements.

- Never commit secrets, API keys, tokens, `.env` values, database dumps with credentials, or private user data.
- Never commit unrelated local changes, rejected work, unaccepted requirements, generated artifacts, or build outputs unless they are explicitly part of the accepted requirement.
- Keep optional external free providers env-driven and disabled by default.
- Authenticated routes must preserve user ownership and scope isolation.
- Subscription/auth gates stay centralized in the owning modules.
- New dependencies require free/open-source confirmation and a reason they are needed.
- Prefer built-in/local tooling for dependency checks; do not add paid scanning services.

## Observability And Diagnostics

Every module should expose enough diagnostic behavior for a local user to understand failures.

- APIs should return useful error messages without leaking secrets.
- Long-running or batch workflows should expose status, progress, partial failure, next action, and retryability.
- Slow API calls and slow frontend button workflows are product defects. Every implementation and QA gate must check whether changed API calls return promptly or use bounded worker/batch/status orchestration with visible progress.
- Bulk operations must not hold one frontend request open for minutes or hours. Use batches, workers, resumable run records, or status polling with explicit progress and partial completion evidence.
- UI should show meaningful empty/error states, not generic success-looking blanks.
- Data-quality or readiness blockers should be visible and specific.
- Logs should identify module, operation, input scope, and failure reason where practical.
- Health endpoints or health panels should exist for modules that own ingestion, repair, batching, or readiness.

## Release And Rollback

Use `docs/codex-agent-team-plan/release-checklist.md` before treating an accepted requirement, batch, or set of changes as released.

Minimum release gate:

- changed work items are PO accepted or explicitly deferred,
- QA evidence is recorded,
- post-QA Lead validation is recorded,
- post-QA Architect signoff after Lead validation is recorded,
- accepted requirement files are committed and pushed to `origin` on the active branch,
- GitHub check-in evidence records branch name, commit SHA, pushed remote, files committed, scoped-staging confirmation, unsafe/unaccepted-file exclusion confirmation, rollback notes, and CI status/link when available,
- backend/frontend builds or blockers are recorded,
- relevant tests are run or skipped with reasons,
- migration/data impact is documented,
- rollback notes exist,
- docs reflect changed routes, response shapes, workflows, or architecture.

GitHub check-in rules:

- Only the Senior Fullstack Lead / Orchestrator performs the check-in.
- Stage only files belonging to the accepted requirement, including validated shared or integration files.
- Do not stage unrelated local changes, rejected work, unaccepted requirements, secrets, `.env` files, database dumps, generated artifacts, or build outputs unless explicitly part of the accepted requirement.
- Push the commit to `origin` on the active branch.
- Move the work item from `GitHub Check-In` to `Released` only after the push succeeds and rollback notes are recorded.

Rollback does not need to be enterprise-grade, but it must be explicit:

- code rollback path,
- database/data rollback or repair path,
- config/env rollback path,
- known irreversible changes,
- validation steps after rollback.

## Technical Debt

Use `docs/codex-agent-team-plan/technical-debt-register.md` for known shortcuts, skipped tests, flaky areas, deferred cleanup, and architecture concerns.

Debt entries must include:

- owner role,
- affected module,
- risk,
- impact if ignored,
- proposed fix,
- priority,
- target review date.

Debt is acceptable when recorded. Hidden debt is not.

## Blocker And Escalation Rules

Use `docs/codex-agent-team-plan/blocker-register.md` for blockers that stop a work item or batch.

Blocker types:

- `PO_DECISION`
- `ARCHITECTURE_DECISION`
- `QA_ENVIRONMENT`
- `TEST_FAILURE`
- `DATA_QUALITY`
- `SHARED_FILE_CONFLICT`
- `DEPENDENCY_OR_TOOLING`
- `SECURITY_OR_SECRET`
- `MIGRATION_OR_DATA_RISK`

Every blocker must have:

- current owner,
- next action,
- due/review date,
- affected work item,
- whether other agents can continue parallel work.

Blocker response expectations:

- Developer implementation blockers go to the Senior Fullstack Lead / Orchestrator before the developer pulls new implementation work.
- Shared-file, route, schema, generated type, package, or CI conflicts pause competing edits until the Orchestrator assigns one owner.
- Architecture blockers are resolved by the Solution Architect before lower-priority architecture work.
- Product/domain blockers are resolved by the Product Owner before lower-priority backlog grooming.
- QA environment or evidence blockers are recorded before signoff and reviewed before release.
- If not resolved in the current Codex work session, the blocker must be recorded in `docs/codex-agent-team-plan/blocker-register.md` before the owner pulls unrelated work.

If blocked, agents should pull the next eligible non-conflicting task or produce analysis/tests/docs that unblock the owner.

## Defect Handling

Defects follow the same PO-to-PO lifecycle, but with a shorter product brief.

Required defect fields:

- observed behavior,
- expected behavior,
- affected module/lane,
- reproduction steps,
- data scope,
- severity,
- regression risk,
- acceptance criteria for the fix.

Severity guide:

- `Critical`: corrupts data, breaks auth/ownership, blocks app startup, or makes core research output unsafe.
- `High`: breaks a core workflow or produces materially wrong investment-support output.
- `Medium`: workflow works with workaround or limited scope.
- `Low`: polish, copy, non-blocking UI issue, or cleanup.

## Retrospective And Process Improvement

Run a lightweight retrospective after each Top 5 batch or major release candidate.

Use `docs/codex-agent-team-plan/retrospective-template.md`.

Review:

- what slowed the team,
- where handoffs were unclear,
- where single-writer reservations failed or almost failed,
- which tests caught issues,
- which issues escaped QA,
- which docs/guidelines need updates,
- whether the next Top 5 priority list should change.

Process changes should update the relevant docs immediately.

## Self-Sufficiency Checklist

Before a batch starts:

- Top 5 requirements exist.
- `docs/codex-agent-team-plan/active-work-board.md` has current Top 5 rows and next priority candidate placeholders.
- Guidelines loaded.
- Product brief owner assigned.
- Architect owner assigned.
- QA owner assigned.
- Candidate lane owners identified.

Before implementation starts:

- Active work board row exists.
- Architecture contract exists.
- QA plan exists.
- One developer is assigned.
- Developer has no active implementation task.
- Single-writer reservations are documented.
- Shared files are assigned to orchestrator or one explicit owner.

Before PO acceptance:

- Handoff quality gate is complete.
- QA evidence exists.
- Lead post-QA validation exists.
- Architect post-QA signoff after Lead validation exists.
- Docs are updated.
- Debt/blockers are recorded.
- Release/rollback implications are known.

Before Released:

- Product Owner acceptance exists.
- Scoped GitHub check-in succeeded.
- Branch, commit SHA, pushed remote, files committed, scoped-staging confirmation, unsafe/unaccepted-file exclusion confirmation, rollback notes, and CI status/link when available are recorded.
