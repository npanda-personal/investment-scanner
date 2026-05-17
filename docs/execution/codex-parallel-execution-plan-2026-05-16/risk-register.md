# Risk Register

| Risk | Severity | Likelihood | Owner | Detection Signal | Mitigation | First Action |
|---|---|---:|---|---|---|---|
| Codex drift | High | Medium | Orchestrator | output conflicts with root or PO direction | use authority report and active plan only | stop and reconcile |
| Root `AGENTS.md` untracked | High | High | Product Owner + Orchestrator | git status shows `?? AGENTS.md` | PO decides staging/commit later | keep unstaged |
| `docs/AGENTS.md` conflict | High | Medium | Product Owner + Orchestrator | tracked deletion or future restore | neutralize or delete after approval | document proposal |
| Stale docs | High | High | Documentation | old docs conflict with current code | keep historical only | use legacy register |
| Old active board conflict | High | High | Orchestrator | old board claims live source | new Sprint-0-only board | do not migrate active rows |
| Parallel write conflict | High | Medium | Orchestrator | same file requested by multiple teams | file reservations and one-writer rule | block conflicting work |
| Dirty worktree implementation risk | High | High | Orchestrator | many modified/untracked files | no implementation until resolved | inventory dirty state |
| Data correctness risk | High | High | Market Data + DQE | trust/readiness counters fail | revalidate data chain first | Sprint 1 candidate |
| False trigger risk | High | Medium | Signal Generation + QA | trigger lacks rule/DQ/audit fields | contract-first signal gate | audit trigger contract |
| Signal quality risk | High | Medium | Signal Quality Lab | no outcome proof | forward validation plan | contract inventory |
| Overfit/backtest risk | High | Medium | Backtesting + Architect | metrics without DQ/source proof | require DQ and assumption docs | inspect backtest contract |
| Free data limitation risk | High | High | Market Data + PO | provider gaps or paid requirement | PO/Architect source policy | block paid providers |
| Local resource/memory risk | Medium | Medium | Orchestrator | memory >=95% | avoid heavy runs | check before heavy work |
| UX confusion risk | Medium | Medium | UX Agent | PO/QA cannot explain workflow | UX-before-UI | require UX plan |
| Test coverage risk | High | Medium | QA | changed workflow lacks tests | QA baseline and required evidence | map tests |
| Product-language risk | High | Medium | PO + QA | advice-like wording | research-support language gate | review copy/contracts |
| B2B/B2C readiness risk | Medium | Medium | PO + Architect | unversioned contracts | contract inventory | document contracts |
| Old GitHub workflow conflict | Medium | High | Release Auditor | push assumed by old docs | local-first checklist | make push optional |
| PO acceptance bypass risk | High | Medium | Orchestrator | implementation asks PO before QA | enforce gates | reject handoff |
| Inefficient model usage | Medium | Medium | Orchestrator | strong model used for scans | model routing matrix in future plan | route by task |
| Extra-credit/spend risk | High | Low | Orchestrator | API key or credit request | ChatGPT sign-in only | do not use API key |

## Current Blockers

- Dirty worktree blocks safe implementation assignment.
- Instruction file state requires Product Owner decision before release/check-in.
- Market Data trust and Data Quality readiness must be revalidated before downstream signal/strategy work.
