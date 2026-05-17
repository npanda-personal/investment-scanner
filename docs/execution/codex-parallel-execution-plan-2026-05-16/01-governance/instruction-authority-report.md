# Instruction Authority Report

## Loaded Instruction Files

- Loaded: root `AGENTS.md`.
- Root load status: complete, 1630 lines, last heading `# 35. Final Principle`.
- Nested/override search result: only `AGENTS.md` was found by `rg --files -g 'AGENTS.md' -g 'AGENTS.override.md'`.
- `docs/AGENTS.md`: historically tracked by git, currently deleted from the working tree. It was not used as an authority source.

## Authority Rules For Sprint 0

1. Product Owner direction in the current prompt is authoritative.
2. Root `AGENTS.md` is the only authoritative AGENTS instruction file.
3. `docs/AGENTS.md`, if restored later, must be treated as legacy guidance only until neutralized or replaced.
4. `docs/codex-agent-team-plan/` is historical evidence only.
5. Current source code and git status outrank old planning assumptions.
6. No application implementation may begin from Sprint 0 artifacts alone.

## Operating Rules Confirmed

- Planning before implementation.
- Local-first and zero-incremental-cost.
- No paid APIs, paid market data, paid AI, hosted testing, cloud deployment, broker execution, real-money execution, or hidden telemetry.
- Use research-support language.
- Data quality gating, explainability, auditability, and strategy/rule versioning are non-negotiable.
- UX must be defined before meaningful UI implementation.
- Shared files require Orchestrator and Solution Architect control.
- One writer per file per implementation pass.
- QA, code review, release audit, and Product Owner acceptance are separate gates.

## Implementation Gate

Before any implementation begins, the active Sprint item must have:

- Product Owner-approved requirement.
- Architecture contract.
- UX plan if user-facing.
- QA verification plan.
- Orchestrator work packet.
- Reserved write scope.
- Single writer per file.
- Shared-file approval when applicable.
- Stop conditions and rollback expectations.
