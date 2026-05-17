# Active Work Board

This board is the active execution-control board for the 2026-05-16 Codex plan.

No historical active work items have been migrated as active.

## Board Rules

- Root `AGENTS.md` and current Product Owner direction are authoritative.
- `docs/codex-agent-team-plan/` is historical evidence only.
- No implementation work is active unless the Product Owner explicitly approves an implementation work packet.
- Sprint 1B Wave 1 is approved only for Level 1 test-only and documentation-only work.
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
| S1B-GNG-01 | Final go/no-go for first small implementation slice | Product Owner + Orchestrator + Architect + QA | Complete | `09-summaries/sprint-1b-final-go-no-go-decision.md` | GO for Option A only: backend-only Data Quality invariant tests. Not implementation approval by itself. |
| S1B-IMPL-01 | Backend-only Data Quality invariant tests | Data Quality Engine Team + QA | Accepted and committed | `backend/tests/modules/data-quality-engine/data-quality-engine.invariants.test.ts` | Human Product Owner accepted. Local commit recorded as `test: add data quality readiness invariants`. |
| S1B-W1-A | Market Data readiness evidence tests | Market Data Foundation Team + QA | Engineering gates accepted; PO pending | `backend/tests/modules/market-data-foundation/market-data-readiness-evidence.invariants.test.ts` | Focused test passed. QA, review, and Architect accepted. Human Product Owner acceptance remains pending. |
| S1B-W1-B | Market Data repository/storage readiness audit | Market Data Foundation Team + Architect | Complete | `09-summaries/sprint-1b-wave1-market-data-storage-audit.md` | Read-only audit found useful storage coverage plus durable evidence and threshold gaps. |
| S1B-W1-C | Strategy/signal/risk DQ dependency audit | Strategy / Signals / Risk lane | Complete | `09-summaries/sprint-1b-wave1-strategy-signal-dq-dependency-audit.md` | Read-only audit found optional or softened DQ enforcement in Lane 2 modules. |
| S1B-W1-D | Portfolio/watchlist/alerts/copilot DQ dependency audit | Portfolio / Watchlists / Alerts / UX lane | Complete | `09-summaries/sprint-1b-wave1-portfolio-alerts-copilot-dq-dependency-audit.md` | Read-only audit found no explicit DQ gate in audited Lane 3 workflows; alerts are highest-risk. |

## Current Sprint 1B Readiness

Sprint 1B Wave 1 is complete at the engineering-gate level for Workstream A and complete at read-only audit level for Workstreams B, C, and D.

Blocking gates:
- Human Product Owner has not accepted Sprint 1B-02 / Workstream A yet.
- The Wave 1 changes are not committed because root `AGENTS.md` forbids committing unaccepted scope.
- Angel One remains excluded from implementation and live validation.
- Provider-heavy startup behavior remains excluded by default.
- Downstream modules remain blocked until separate readiness enforcement tests, QA, review, Architect signoff, and Product Owner acceptance exist.

## Historical References

Old work items in `docs/codex-agent-team-plan/` may be used only as evidence or revalidation candidates. They are not active work.
