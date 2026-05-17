# Risk Register

| Risk | Severity | Likelihood | Owner | Detection Signal | Mitigation | First Action |
|---|---|---:|---|---|---|---|
| Codex drift | High | Medium | Orchestrator | output conflicts with root or PO direction | use authority report and active plan only | stop and reconcile |
| Root `AGENTS.md` untracked | High | High | Product Owner + Orchestrator | git status shows `?? AGENTS.md` | PO decides staging/commit later | keep unstaged |
| `docs/AGENTS.md` conflict | High | Medium | Product Owner + Orchestrator | tracked deletion or future restore | neutralize or delete after approval | document proposal |
| Stale docs | High | High | Documentation | old docs conflict with current code | keep historical only | use legacy register |
| Old active board conflict | High | High | Orchestrator | old board claims live source | new Sprint-0-only board | do not migrate active rows |
| Parallel write conflict | High | Medium | Orchestrator | same file requested by multiple teams | file reservations and one-writer rule | block conflicting work |
| Dirty worktree implementation risk | High | Low | Orchestrator | git status shows uncommitted source changes | no implementation until resolved | run `git status --short` before implementation |
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
| Angel One broker-adjacent risk | High | High | Product Owner + Architect | provider requires broker credentials or live broker endpoint | keep excluded from Sprint 1B unless explicitly approved | record exclusion in decision doc |
| Provider-heavy startup risk | High | Medium | Architect + QA | backend startup calls scheduler/backfill/provider paths | exclude startup backfill and live providers by default | reserve `backend/src/server.ts` only if needed |
| Data Quality threshold ambiguity | High | Medium | Product Owner + DQE | thresholds differ between contract, tests, and UI | record exact threshold policy before implementation | update readiness contract |
| UI scope creep risk | Medium | Medium | UX + Orchestrator | UI controls added before UX/QA criteria | keep UI minimal unless explicitly approved | mark frontend files read-only by default |

## Current Blockers

- Sprint 1B implementation is not approved.
- Market Data trust and Data Quality readiness must be revalidated before downstream signal/strategy work.
- Angel One remains excluded from implementation and live validation.
- Startup scheduler/backfill behavior requires Architect approval before it can be changed or accepted as Sprint 1B scope.
- QA has not run the approved validation subset because tests are not approved in Sprint 1B preparation.

## Sprint 1B Preparation Risk Decisions

- Dirty worktree risk is currently low because the worktree was clean before this preparation pass.
- Source-control risk returns if implementation begins before file reservations are approved.
- The first implementation should stay within Market Data Foundation and Data Quality module-owned files unless Architect reserves a shared file.
- Any live provider call, paid dependency, broker-order path, secret exposure, or provider-heavy startup behavior is a stop condition.
