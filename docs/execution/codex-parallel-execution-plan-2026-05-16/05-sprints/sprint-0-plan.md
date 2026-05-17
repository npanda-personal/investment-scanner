# Sprint 0 Plan

## Goal

Prepare disciplined Codex parallel execution without changing product behavior.

## Non-Goals

- No implementation.
- No application code edits.
- No Prisma schema changes.
- No route registry changes.
- No shared UI or shared backend utility changes.
- No package installs.
- No commits or pushes.
- No changes to `docs/codex-agent-team-plan/`.
- No changes to `docs/AGENTS.md` or root `AGENTS.md`.

## Approved Outputs

Create planning artifacts only under:

```text
docs/execution/codex-parallel-execution-plan-2026-05-16/
```

## Sprint 0 Work Items

| ID | Work Item | Owner | Mode | Output |
|---|---|---|---|---|
| S0-01 | Instruction authority report | Orchestrator | Planning | `instruction-authority-report.md` |
| S0-02 | Current-state audit | Solution Architect | Discovery | `current-state-audit.md` |
| S0-03 | Dirty worktree inventory | Orchestrator | Discovery | `dirty-worktree-inventory.md` |
| S0-04 | Module ownership map | Orchestrator + Architect | Planning | `module-ownership-map.md` |
| S0-05 | Shared-file control | Architect | Architecture Planning | `shared-file-control.md` |
| S0-06 | Dependency graph | Architect | Architecture Planning | `dependency-graph.md` |
| S0-07 | Contract inventory | Architect + lane leads | Architecture Planning | `contract-inventory.md` |
| S0-08 | QA baseline plan | QA Automation | QA Planning | `qa-baseline-plan.md` |
| S0-09 | Legacy reviews | Documentation | Discovery | `legacy-*` review files |
| S0-10 | Sprint 1 candidates | Product Owner Agent | Product Planning | `sprint-1-candidates.md` |
| S0-11 | Local release gate reset | Release Auditor | Release Planning | `release-checklist.md` |
| S0-12 | Sprint-0-only active board | Orchestrator | Planning | `active-work-board.md` |

## Acceptance Criteria

- All approved Sprint 0 artifact files exist.
- Existing historical plan folder is untouched.
- `docs/AGENTS.md` is untouched.
- Root `AGENTS.md` is untouched and not staged.
- No application code is modified by Sprint 0.
- New active board contains only Sprint 0 status and no migrated active implementation items.
- Release checklist is local-first and treats GitHub push as optional and disabled by default.

## Review Gate

Product Owner reviews the Sprint 0 artifacts and decides whether to approve Sprint 1 planning refinement or request revisions.
