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
| Test-only scope drift risk | Medium | Medium | Orchestrator + QA | implementation touches source while approved as test-only | reserve exactly one test file | stop and reject scope expansion |
| Market Data durable evidence gap | High | High | Market Data Foundation + Architect | readiness evidence exists only transiently or without source/run/provenance fields | add contract-first storage/readiness characterization tests before source changes | propose backend-only storage/readiness test slice |
| Downstream DQ optional-filter risk | High | Medium | Lane 2 module owners + Architect | signal/backtest/calibration paths run with DQ filtering disabled or warning-only | require fail-closed consumer contracts and focused tests | continue with signal read-path and downstream consumer gates |
| User-facing untrusted data leak risk | High | High | Lane 3 module owners + QA | portfolio/watchlist/alert/copilot outputs omit readiness evidence | require Lane 3 readiness consumer contract | start with alerts-monitoring readiness tests |
| Market Data natural-key gap | High | Medium | Market Data Foundation + Architect | storage is characterized as symbol/date-centric only | require ADR before schema or storage-key changes | propose durable readiness evidence decision |
| Storage characterization overclaim risk | Medium | Medium | Orchestrator + QA | tests treated as full contract compliance | preserve limitations in QA/PO evidence | keep downstream blocklist active |
| Signal-generation strict-filter overclaim risk | Medium | Low | Signal Generation + Architect + QA | Wave 3 strict-filter tests or CF-W2-SIG-01A are treated as full read-path enforcement | preserve limitation that run path and trusted list read paths are separate | prepare latest-instrument gate requirement |
| Signal latest auto-generation trust gap | High | Medium | Signal Generation + Architect + QA | `latestForInstrument()` can generate or return a signal outside the trusted list gate | contract and test latest path separately | prepare `CF-W1-SIG-LATEST-01` |
| Strategy Decision target-price violation | High | High | Strategy Decision + Product Owner + Architect | `targetPrice` or target-price wording appears in trusted outputs | replace with rule-based exit/invalidation semantics after PO decision | refine CF-W1-STRAT-01 |
| Alert ownership leakage risk | High | High | Alerts + Auth + Architect | alert events/list/read/dismiss are global or rule owner is not preserved | define ownership contract before alert implementation | refine CF-W1-L3-AUTH-02 |
| Copilot trust overclaim risk | High | Medium | UX + Copilot + QA | summaries show complete/reliable without DQ readiness evidence | add trust UX contract and blocked states | refine CF-W1-UX-02 |
| Subscription self-plan risk | Medium | Medium | Subscription Billing + Product Owner | ordinary user can self-select higher/admin plan in local mode | clarify local/manual billing policy | refine CF-W1-SUB-01 |
| Implementation factory false-ready risk | High | Medium | Orchestrator | item enters Ready without PO/Architect/QA gates | enforce ready queue criteria and no-pull evidence | keep ready queue strict |
| Premature source edit reconciliation risk | High | High | Orchestrator + Product Owner + Architect + QA | source/test files are dirty before readiness evidence, QA, review, signoff, and PO packet are complete | use Pre-Implementation Readiness Lock and reconciliation mode | split dirty DQ/SGE changes before any commit |
| Over-escalation bottleneck risk | Medium | High | Orchestrator | routine QA/review/PO packet/commit asks for human mediation | use standing delegation policy | route only true consent blockers to `99-decision-inbox/` |
| Under-escalation consent risk | High | Medium | Orchestrator | Prisma, route, shared, package, provider, UI, target semantics, or threshold ambiguity proceeds without decision | enforce escalation rules | create Decision Packet before work continues |

## Current Blockers

- Market Data durable readiness evidence is incomplete for full contract compliance.
- Current Market Data natural-key behavior is symbol/date-centric and narrower than the active contract target.
- `signal-generation-engine` run-path default/fail-closed behavior is accepted in bounded `CF-W2-SIG-01A`, and trusted list read-path filtering is accepted in `CF-W1-SIG-01B`.
- `latestForInstrument()` remains unresolved and must not be treated as trusted until separately gated.
- Lane 2 strategy/signal/risk modules still need fail-closed downstream DQ enforcement tests beyond the Wave 3 strict signal-generation path.
- Lane 3 portfolio/watchlist/alerts/copilot modules still need readiness consumer contracts and tests.
- Angel One remains excluded from implementation and live validation.
- Startup scheduler/backfill behavior requires Architect approval before it can be changed or accepted as Sprint 1B scope.
- Downstream modules remain blocked from treating Market Data / DQ as trusted input.
- Strategy Decision target-price semantics conflict with root no-arbitrary-target policy and require Product Owner decision.
- Alert ownership and Lane 3 readiness consumer contracts remain unresolved.
- Copilot/research trust UX remains unresolved.
- Continuous Factory Wave 2 dirty DQ changes were accepted and committed as `CF-W2-DQ-01`.
- Continuous Factory Wave 2 Signal Generation changes were reframed as bounded `CF-W2-SIG-01A`; `CF-W1-SIG-01B` adds trusted list read-path filtering.
- No downstream implementation is allowed until Signal Generation latest-path and strategy target-semantics risks are resolved.

## Sprint 1B Preparation Risk Decisions

- Dirty worktree risk is controlled because current Wave 3 files are limited to one Signal Generation test file and active execution docs.
- Wave 3 Product Owner acceptance is conditionally recorded only because all approved criteria passed.
- Future implementation should stay within Market Data Foundation and Data Quality module-owned files unless Architect reserves a shared file.
- Any live provider call, paid dependency, broker-order path, secret exposure, or provider-heavy startup behavior remains a stop condition.
- Any source, UI, route registry, Prisma, shared utility, shared UI, package, startup, config, or provider edit during test-only slices remains a stop condition.

## Continuous Factory Wave 1 Risk Decisions

- No code implementation item was pulled because every high-value candidate had a Product Owner, Architect, QA, shared-file, or upstream dependency blocker.
- Documentation-only factory artifacts were allowed under the approved active execution folder scope.
- `CF-W1-SIG-01` is the recommended next decision path, but it is source-changing and blocked until Product Owner and Architect approval.

## Continuous Factory Wave 2 Reconciliation Risk Decisions

- Wave 2 entered reconciliation mode because source/test files were modified before readiness was fully proven.
- Current dirty files are limited to Data Quality Engine and Signal Generation Engine source/tests.
- Data Quality fail-closed default changes completed readiness, QA, code review, Architect signoff, and Product Owner conditional acceptance as a separate evidence track.
- Signal Generation run-path changes are accepted only as `CF-W2-SIG-01A`; explicit opt-out, read-path, trusted/untrusted classification, latest auto-generation, and trigger-contract gaps remain tracked.
- No push is allowed.
- No downstream implementation is allowed from `CF-W2-SIG-01A` alone.

## Autonomous Orchestrator Setup Risk Decisions

- Routine gates are delegated to Codex only when all standing delegation conditions pass.
- True consent blockers must create a Decision Packet under `99-decision-inbox/`.
- Human Product Owner review is concentrated on `99-decision-inbox/open-decisions.md`.
- Push remains disabled.
- Active execution docs are the only docs modified by this setup.
