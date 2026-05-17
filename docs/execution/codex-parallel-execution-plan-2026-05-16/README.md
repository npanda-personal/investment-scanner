# Codex Parallel Execution Plan - 2026-05-16

This folder is the active execution-control area for Codex planning, governance, audits, contracts, QA plans, work packets, and release gates.

It is not application source. Product behavior changes require a separate approved implementation scope.

## Source Of Truth Order

1. Latest Product Owner direction in the current thread
2. Root `AGENTS.md`
3. Current repository source code and git state
4. Active execution artifacts in this folder
5. Historical docs used only as evidence

Root `AGENTS.md` is the only authoritative AGENTS instruction file.

`docs/codex-agent-team-plan/` is historical evidence only. Do not treat its active boards, QA evidence, signoffs, work packets, GitHub check-in rules, or PO acceptance docs as current authority unless they are revalidated into this active execution folder.

## Folder Map

- `00-control/`: active board, local-first release checklist, risk register.
- `01-governance/`: instruction authority, dirty worktree inventory, governance cleanup, docs/AGENTS neutralization proposal.
- `02-audits/`: current-state, legacy, delta, and readiness audits.
- `03-architecture/`: ownership map, dependency graph, shared-file control, architect decision checklists.
- `04-qa/`: QA baseline and validation plans.
- `05-sprints/`: sprint plans and sprint candidate lists.
- `06-contracts/`: contract inventory and active contract drafts.
- `07-decisions/`: Product Owner and architecture decision proposals.
- `08-work-packets/`: implementation or audit work packets.
- `09-summaries/`: sprint and audit summaries.

Keep this `README.md` at the root as the navigation index.

## Check First Before Planning

Before any new planning or implementation proposal, inspect:

1. Root `AGENTS.md`
2. Latest Product Owner prompt
3. `00-control/active-work-board.md`
4. `01-governance/instruction-authority-report.md`
5. `01-governance/dirty-worktree-inventory.md`
6. `02-audits/current-state-audit.md`
7. `03-architecture/shared-file-control.md`
8. `06-contracts/contract-inventory.md`
9. `00-control/risk-register.md`
10. `00-control/release-checklist.md`
11. Relevant sprint, contract, decision, QA, and work-packet files for the requested scope

## Future Sprint 1A File Locations

Use the numbered folders only:

- Read-only audits: `02-audits/`
- Architecture checklists and shared-file decisions: `03-architecture/`
- QA validation plans: `04-qa/`
- Sprint plans and candidate lists: `05-sprints/`
- Market Data / Data Quality contracts: `06-contracts/`
- Angel One or provider policy decisions: `07-decisions/`
- Work packets: `08-work-packets/`
- Sprint summaries: `09-summaries/`

Do not add new files to the old unnumbered `architecture/`, `contracts/`, `decisions/`, `qa/`, or `work-packets/` paths.

## Current Recommendation

Refactor the current project in place. The repository has enough modular structure, tests, and working domain code to preserve, but it needs strict execution control before parallel implementation continues.
