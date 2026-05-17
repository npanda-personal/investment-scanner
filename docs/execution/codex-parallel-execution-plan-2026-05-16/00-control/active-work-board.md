# Active Work Board

This board is the active execution-control board for the 2026-05-16 Codex plan.

No historical active work items have been migrated as active.

## Board Rules

- Root `AGENTS.md` and current Product Owner direction are authoritative.
- `docs/codex-agent-team-plan/` is historical evidence only.
- No implementation work is active unless the Product Owner explicitly approves an implementation work packet.
- Sprint 1B is preparation-only. Sprint 1B implementation is not approved.
- GitHub push is disabled by default.

## Sprint 0 Items

| ID | Work Item | Owner | State | Scope | Notes |
|---|---|---|---|---|---|
| S0-01 | Create approved planning folder | Orchestrator | Complete | `docs/execution/codex-parallel-execution-plan-2026-05-16/` | Folder created only after PO approval. |
| S0-02 | Create Sprint 0 planning artifacts | Orchestrator | Complete | New plan folder only | No app code modified. |
| S0-03 | Record dirty worktree inventory | Orchestrator | Complete | New plan folder only | Implementation remains blocked until resolved. |
| S0-04 | Preserve historical docs untouched | Orchestrator | Complete | `docs/codex-agent-team-plan/` | No modifications made by Sprint 0 artifact creation. |
| S0-05 | Propose Sprint 1 candidates | Product Owner / Orchestrator | Proposed | Planning only | Not approved for implementation. |

## Sprint 1 Preparation Items

| ID | Work Item | Owner | State | Scope | Notes |
|---|---|---|---|---|---|
| S1A-01 | Market Data / DQ read-only contract audit | Orchestrator + Architect + QA | Complete | Active execution docs only | Contract, Angel policy proposal, Architect checklist, QA plan, work packet, and summary recorded. |
| S1B-PREP-01 | Record first Market Data / DQ implementation decisions | Orchestrator + Product Owner + Architect + QA | In preparation | Active execution docs only | No implementation, tests, providers, services, staging, commits, or pushes approved. |
| S1B-PREP-02 | Keep Angel One excluded from implementation | Product Owner + Architect | Active decision | `07-decisions/` | Angel One remains excluded unless Product Owner explicitly approves mocked-only validation or a read-only exception. |
| S1B-PREP-03 | Reserve future implementation files | Orchestrator + Architect | Proposed | `08-work-packets/` | Future implementation must use one writer per file and may not touch shared/high-risk files without Architect approval. |

## Current Sprint 1B Readiness

Sprint 1B implementation is not ready.

Blocking gates:
- Product Owner has not approved Sprint 1B implementation.
- Architect has not approved implementation file reservations as executable scope.
- QA has not run or accepted validation evidence.
- Angel One remains excluded from implementation and live validation.
- Provider-heavy startup behavior remains excluded by default.

## Historical References

Old work items in `docs/codex-agent-team-plan/` may be used only as evidence or revalidation candidates. They are not active work.
