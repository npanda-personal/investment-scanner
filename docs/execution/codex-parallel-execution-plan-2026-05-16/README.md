# Codex Parallel Execution Plan - 2026-05-16

This folder is the active Sprint 0 planning area for Codex parallel execution.

Authority order:

1. Current Product Owner direction
2. Root `AGENTS.md`
3. Current repository state
4. Planning artifacts in this folder
5. Historical docs used only as evidence

The historical `docs/codex-agent-team-plan/` folder is not authoritative for new work. It remains preserved as historical evidence only.

## Sprint 0 Scope

Sprint 0 prepares disciplined parallel Codex execution. It does not change product behavior, application code, Prisma schema, route registries, shared UI, shared backend utilities, package manifests, commits, or remote state.

## Artifacts

- `instruction-authority-report.md`: confirms instruction source handling.
- `current-state-audit.md`: summarizes source-code reality.
- `dirty-worktree-inventory.md`: records current source-control risk.
- `module-ownership-map.md`: maps teams to current modules.
- `shared-file-control.md`: controls high-risk files and folders.
- `dependency-graph.md`: documents dependency ordering.
- `contract-inventory.md`: lists contracts needed before safe parallel work.
- `qa-baseline-plan.md`: records validation strategy.
- `risk-register.md`: captures Sprint 0 risks and mitigations.
- `sprint-0-plan.md`: Sprint 0 work plan.
- `sprint-1-candidates.md`: proposed Sprint 1 only, not approved implementation.
- `active-work-board.md`: Sprint-0-only board.
- `release-checklist.md`: local-first release gate checklist.
- `legacy-*`: bias-control review of old docs.
- `docs-agents-neutralization-proposal.md`: future proposal only; no change made.

## Current Recommendation

Refactor the current project in place. The repo has enough modular structure, tests, and working domain code to preserve, but it needs a clean execution control plane before parallel implementation resumes.
