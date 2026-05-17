# Active Work Board

This board is the active execution-control board for the 2026-05-16 Codex plan.

No historical active work items have been migrated as active.

## Board Rules

- Root `AGENTS.md` and current Product Owner direction are authoritative.
- `docs/codex-agent-team-plan/` is historical evidence only.
- No implementation work is active unless the Product Owner explicitly approves an implementation work packet.
- Sprint 1B Waves are approved only when the Product Owner explicitly defines the bounded file scope.
- GitHub push is disabled by default.

## Active Board States

- Backlog Candidate
- Audit In Progress
- Audit Complete
- Needs Product Refinement
- Needs Architecture Contract
- Needs QA Plan
- Ready for Implementation
- Implementation In Progress
- Developer Validation
- QA Verification
- Code Review
- Architect Signoff
- PO Acceptance Packet
- Conditionally Accepted
- Committed
- Blocked
- Rejected / Rework
- Deferred

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
| S1B-W1-A | Market Data readiness evidence tests | Market Data Foundation Team + QA | Accepted and committed | `backend/tests/modules/market-data-foundation/market-data-readiness-evidence.invariants.test.ts` | Human Product Owner accepted. Local commit `2e19421` recorded as `test: add market data readiness evidence coverage`. |
| S1B-W1-B | Market Data repository/storage readiness audit | Market Data Foundation Team + Architect | Complete | `09-summaries/sprint-1b-wave1-market-data-storage-audit.md` | Read-only audit found useful storage coverage plus durable evidence and threshold gaps. |
| S1B-W1-C | Strategy/signal/risk DQ dependency audit | Strategy / Signals / Risk lane | Complete | `09-summaries/sprint-1b-wave1-strategy-signal-dq-dependency-audit.md` | Read-only audit found optional or softened DQ enforcement in Lane 2 modules. |
| S1B-W1-D | Portfolio/watchlist/alerts/copilot DQ dependency audit | Portfolio / Watchlists / Alerts / UX lane | Complete | `09-summaries/sprint-1b-wave1-portfolio-alerts-copilot-dq-dependency-audit.md` | Read-only audit found no explicit DQ gate in audited Lane 3 workflows; alerts are highest-risk. |
| S1B-W2-A | Market Data storage/readiness characterization tests | Market Data Foundation Team + QA | Accepted under conditional approval | `backend/tests/modules/market-data-foundation/market-data-storage-readiness.invariants.test.ts` | Focused test passed. QA, review, and Architect accepted. No source changes. |
| S1B-W2-B | Market Data storage characterization audit | Market Data Foundation Team + Architect | Complete | `09-summaries/sprint-1b-wave2-market-data-storage-characterization-audit.md` | Documents current symbol/date idempotency and durable provenance gaps. |
| S1B-W2-C | Downstream blocklist refresh | Orchestrator | Complete | `09-summaries/sprint-1b-wave2-downstream-blocklist-refresh.md` | Confirms downstream modules remain blocked. Recommends narrow `signal-generation-engine` DQ enforcement test next. |
| S1B-W2-D | QA/review/Architect/PO evidence | QA + Review + Architect + Product Owner | Accepted under conditional approval | QA, review, signoff, and PO packet docs | Human Product Owner decision recorded under explicit Wave 2 conditional approval. |
| S1B-W3-A | Signal Generation DQ enforcement characterization tests | Signal Generation Engine Team + QA | Accepted under conditional approval | `backend/tests/modules/signal-generation-engine/signal-generation-dq-enforcement.invariants.test.ts` | Focused test passed. Strict DQ-filtered run generates only READY signals. |
| S1B-W3-B | Signal Generation DQ enforcement audit | Strategy / Signals / Risk lane + Architect | Complete | `09-summaries/sprint-1b-wave3-signal-generation-dq-enforcement-audit.md` | Documents strict-path coverage and remaining default bypass/fail-open risks. |
| S1B-W3-C | Alerts / portfolio / copilot deferral check | Orchestrator | Complete | `09-summaries/sprint-1b-wave3-downstream-deferral-check.md` | Confirms downstream user-facing modules remain blocked. Recommends signal-generation fail-closed decision next. |
| S1B-W3-D | QA/review/Architect/PO evidence | QA + Review + Architect + Product Owner | Accepted under conditional approval | QA, review, signoff, and PO packet docs | Human Product Owner decision recorded under explicit Wave 3 conditional approval. |

## Continuous Parallel Execution Factory Wave 1

| ID | Work Item | Owner | State | Scope | Notes |
|---|---|---|---|---|---|
| CF-W1-SETUP | Create continuous factory folders and operating model | Orchestrator | Audit Complete | Active execution docs | Added requirement, module-audit, ready-queue, and implementation-evidence lanes. |
| CF-W1-AUD-A | Market Data / Data Quality audit | Audit Team A | Audit Complete | `11-module-audits/audit-market-data-data-quality.md` | Found durable evidence, validation, threshold, DQ default, and provider/startup blockers. |
| CF-W1-AUD-B | Strategy / Signal / Rules audit | Audit Team B | Audit Complete | `11-module-audits/audit-strategy-signal-rules.md` | Found signal contract, fail-open DQ, target-price, and strategy versioning gaps. |
| CF-W1-AUD-C | Backtesting / Trade Plan / Risk audit | Audit Team C | Audit Complete | `11-module-audits/audit-backtesting-trade-risk.md` | Found optional DQ, target semantics, exit/invalidation, and overfit gaps. |
| CF-W1-AUD-D | Portfolio / Watchlist / Alerts audit | Audit Team D | Audit Complete | `11-module-audits/audit-portfolio-watchlist-alerts.md` | Found DQ leakage and auth/user ownership gaps. |
| CF-W1-AUD-E | UX / Research / Copilot audit | Audit Team E | Audit Complete | `11-module-audits/audit-ux-research-copilot.md` | Found trust explanation, advice-language, copilot proof, and UI smoke gaps. |
| CF-W1-AUD-F | Platform / Auth / Subscription / Notifications audit | Audit Team F | Audit Complete | `11-module-audits/audit-platform-auth-subscription-notifications.md` | Found default-user, alert ownership, self-plan-change, and notification privacy risks. |
| CF-W1-AUD-G | QA / Test Infrastructure audit | Orchestrator fallback | Audit Complete | `11-module-audits/audit-qa-test-infrastructure.md` | Subagent thread limit reached; audit completed locally. |
| CF-W1-REQ | Requirement and ready-queue synthesis | Requirement Factory | Needs Product Refinement | `10-requirements/`, `12-ready-queue/` | No code item moved to Ready for Implementation. |
| CF-W1-SIG-01 | Signal Generation DQ fail-closed trusted runs | Architecture + QA Factory | Blocked | `06-contracts/`, `03-architecture/`, `04-qa/`, `08-work-packets/` | Drafted contract, architecture review, QA plan, and blocked work packet. Requires PO + Architect decision before implementation. |
| CF-W1-IMPL | Implementation Factory pull | Orchestrator | Deferred | `13-implementation-evidence/no-safe-implementation-selected-wave1.md` | No safe code item selected; forcing implementation would risk bad tests or unauthorized behavior changes. |

## Continuous Parallel Execution Factory Wave 2 Reconciliation

| ID | Work Item | Owner | State | Scope | Notes |
|---|---|---|---|---|---|
| CF-W2-RECON | Dirty DQ/SGE change reconciliation | Orchestrator | Committed | `13-implementation-evidence/CF-W2-dirty-change-reconciliation-report.md` | Reconciliation/governance controls committed in `2fe3c10`. |
| CF-W2-DQ-01 | Data Quality fail-closed defaults | Data Quality Engine Team + QA + Architect | Committed | `backend/src/modules/data-quality-engine/**`, DQ tests | Readiness, focused tests, QA, code review, Architect signoff, PO conditional acceptance, and local commit `88a331b` completed. |
| CF-W2-SIG-01 | Signal Generation DQ fail-closed behavior | Signal Generation Engine Team + QA + Architect | Split / Reframed | `backend/src/modules/signal-generation-engine/**`, SGE tests | Full requirement remains incomplete. Dirty work reframed as bounded `CF-W2-SIG-01A` run-path DQ fail-closed slice. |
| CF-W2-SIG-01A | Signal Generation run-path DQ fail-closed behavior | Signal Generation Engine Team + QA + Architect | Conditionally Accepted | `signal-generation-engine` source/tests | Focused test passed. QA, review, Architect, and delegated PO acceptance completed. Commit pending scoped staging. |

## Current Sprint 1B Readiness

Sprint 1B Wave 3 completed the first downstream `signal-generation-engine` strict Data Quality filter characterization scope.

Blocking gates:
- Angel One remains excluded from implementation and live validation.
- Provider-heavy startup behavior remains excluded by default.
- Downstream modules remain blocked until separate readiness enforcement tests, QA, review, Architect signoff, and Product Owner acceptance exist.
- `signal-generation-engine` run-path defaults are covered by bounded `CF-W2-SIG-01A`; full trusted/read-path enforcement remains blocked.
- Full Market Data durable readiness evidence still requires future Architect/Product Owner decisions before source or schema changes.
- Continuous Factory Wave 2 reconciliation is split and controlled. Downstream implementation remains blocked until full Signal Generation read-path/trust gaps and target-semantics work are resolved.

## Historical References

Old work items in `docs/codex-agent-team-plan/` may be used only as evidence or revalidation candidates. They are not active work.
