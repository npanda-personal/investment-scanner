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
| Old GitHub workflow conflict | Medium | Medium | Release Auditor | push assumed without gates or to wrong branch | standing push authorization requires scoped non-force push to `dev` only | verify staged scope and branch before push |
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
| Signal latest auto-generation trust gap | Medium | Low | Signal Generation + Architect + QA | future edits bypass `run()` or trusted read predicate | preserve `CF-W1-SIG-LATEST-01` tests | keep latest-path tests in focused suites |
| Strategy Decision target-price violation | High | High | Strategy Decision + Product Owner + Architect | `targetPrice` or target-price wording appears in trusted outputs | replace with rule-based exit/invalidation semantics after PO decision | refine CF-W1-STRAT-01 |
| Alert ownership leakage risk | High | Medium | Alerts + Auth + Architect | alert digest or future consumer bypasses parent rule owner | bounded event inbox/read/dismiss slice committed; keep future consumers contract-first | prepare notification/copilot alert consumer follow-up |
| Copilot trust overclaim risk | High | Medium | UX + Copilot + QA | summaries show complete/reliable without DQ readiness evidence | add trust UX contract and blocked states | refine CF-W1-UX-02 |
| Subscription self-plan risk | Medium | Medium | Subscription Billing + Product Owner | ordinary user can self-select higher/admin plan in local mode | clarify local/manual billing policy | refine CF-W1-SUB-01 |
| Implementation factory false-ready risk | High | Medium | Orchestrator | item enters Ready without PO/Architect/QA gates | enforce ready queue criteria and no-pull evidence | keep ready queue strict |
| Premature source edit reconciliation risk | High | High | Orchestrator + Product Owner + Architect + QA | source/test files are dirty before readiness evidence, QA, review, signoff, and PO packet are complete | use Pre-Implementation Readiness Lock and reconciliation mode | split dirty DQ/SGE changes before any commit |
| Over-escalation bottleneck risk | Medium | High | Orchestrator | routine QA/review/PO packet/commit asks for human mediation | use standing delegation policy | route only true consent blockers to `99-decision-inbox/` |
| Under-escalation consent risk | High | Medium | Orchestrator | Prisma, route, shared, package, provider, UI, target semantics, or threshold ambiguity proceeds without decision | enforce escalation rules | create Decision Packet before work continues |
| False parallelism risk | High | Medium | Orchestrator | one Orchestrator prompt claims parallelism but all teams wait on one thread | use persistent team charters, automations, inboxes, outboxes, and worktrees | launch separate team automations |
| Over-mediation risk | Medium | High | Orchestrator + Product Owner | human PO is asked for QA/review/signoff/commit routine gates | standing delegation and Decision Inbox only | route routine gates to Codex teams |
| Stale ready queue risk | High | Medium | Requirement Factory + Orchestrator | ready items lack current source/test evidence or decisions | refresh queue from audits and current git state | remove stale items from Ready |
| Worktree conflict risk | High | Medium | Orchestrator | two teams reserve same file/module | worktree/branch policy and one-writer rule | sequence or block one item |
| No implementation item selected risk | Medium | Medium | Requirement + Architecture + QA Factories | implementation teams idle because prep is incomplete | continuous requirements/contracts/QA prep | keep next top candidates moving |
| Single-thread context rot risk | Medium | High | Orchestrator | long prompt loses current state or merges unrelated work | split teams into dedicated threads/worktrees | use team heartbeat protocol |
| Decision inbox ignored risk | High | Medium | Orchestrator + Product Owner | open decisions do not get reviewed and queues drift | make Decision Inbox only human-review surface | review `open-decisions.md` regularly |
| Team automation drift risk | High | Medium | Orchestrator | team automation modifies wrong files or stale docs | team prompts and charters define allowed/forbidden scope | stop affected workstream and reconcile |
| Daemon stops after one cycle risk | High | High | Team 00 | Team reports are summarized once and no teams are relaunched | daemon scheduler policy and runtime pool recycling | keep Team 02/03/04 active |
| Runtime slot idle risk | Medium | High | Team 00 | completed teams are closed without reassignment while safe prep work exists | team-runtime-pool policy | relaunch completed teams or next queued team |
| Queue pressure opacity risk | Medium | Medium | Team 00 | ready/blocked/refinement queue depth is unclear | daemon heartbeat and cycle-latest checkpoint | update pressure indicators |
| Checkpoint resume ambiguity risk | Medium | Medium | Team 00 | checkpoint report omits resume prompt path or whether resume prompt was updated | checkpoint report protocol now requires resume prompt path and update status | keep `09-summaries/daemon-resume-prompt.md` current |
| Unsafe push risk | High | Low | Team 00 + Review / Release | staged scope includes unrelated files, secrets, forbidden files, or branch is not `dev` | standing push gate, `git diff --cached --name-status`, clean post-commit status, no force push | stop push and record failure |
| Worktree drift after push risk | Medium | Medium | Team 00 | team branch/worktree diverges from `dev` or rejected work remains isolated without record | worktree policy requires branch/worktree evidence and cleanup only after accepted push or safe rejection | record branch/worktree in outbox and integration queue |

## Current Blockers

- Market Data durable readiness evidence is incomplete for full contract compliance.
- Current Market Data natural-key behavior is symbol/date-centric and narrower than the active contract target.
- `signal-generation-engine` run-path default/fail-closed behavior is accepted in bounded `CF-W2-SIG-01A`, and trusted list read-path filtering is committed in `CF-W1-SIG-01B` as `a5bc49a`.
- `latestForInstrument()` is gated by committed `CF-W1-SIG-LATEST-01` as `e0a6788`.
- Lane 2 strategy/signal/risk modules still need fail-closed downstream DQ enforcement tests beyond the accepted Signal Generation and Strategy Decision slices.
- Lane 3 portfolio/watchlist child ownership is accepted in bounded `CF-W1-L3-AUTH-01`; alerts, copilot, and Data Quality readiness consumer policy remain separate.
- Angel One remains excluded from implementation and live validation.
- Startup scheduler/backfill behavior requires Architect approval before it can be changed or accepted as Sprint 1B scope.
- Downstream modules remain blocked from treating Market Data / DQ as trusted input.
- Strategy Decision target-price semantics are resolved for the bounded Option B-Strict compatibility slice; Trade Plan target geometry remains a separate blocked migration.
- Alert event ownership first backend slice is resolved and committed as `CF-W1-L3-AUTH-02`; notification/copilot digest consumers and Lane 3 readiness consumer policy remain separate.
- Copilot/research trust UX remains unresolved.
- Continuous Factory Wave 2 dirty DQ changes were accepted and committed as `CF-W2-DQ-01`.
- Continuous Factory Wave 2 Signal Generation changes were reframed as bounded `CF-W2-SIG-01A`; `CF-W1-SIG-01B` adds trusted list read-path filtering.
- No downstream Trade Plan, alert, portfolio, watchlist readiness, or copilot implementation is allowed until module-specific consumer gates and Trade Plan target migration are resolved.
- Portfolio/watchlist child-resource ownership hardening is accepted as `CF-W1-L3-AUTH-01`, and alert event ownership is accepted as `CF-W1-L3-AUTH-02`; copilot trust UX, Data Quality readiness consumer policy, notification/copilot alert consumers, and platform nullable-owner migration remain separate.
- Signal trigger DTO projection is accepted and committed as `CF-W1-SIG-TRIGGER-01`; persisted trigger snapshots, normalized trigger tables, and downstream trigger consumer adoption remain separate.

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
- Historical Wave 2 reconciliation did not allow push; current standing push authority applies only prospectively under strict gates.
- No downstream implementation is allowed from `CF-W2-SIG-01A` alone.

## Autonomous Orchestrator Setup Risk Decisions

- Routine gates are delegated to Codex only when all standing delegation conditions pass.
- True consent blockers must create a Decision Packet under `99-decision-inbox/`.
- Human Product Owner review is concentrated on `99-decision-inbox/open-decisions.md`.
- Scoped push to `dev` is now authorized prospectively under strict standing gates.
- Active execution docs are the only docs modified by this setup.

## Master Orchestrator Runtime Cycle - 2026-05-17 Risk Decisions

- No application-code item was pulled because the ready queue had no current bounded item with exact file reservations, accepted contract, QA plan, and no blockers.
- `CF-W1-QA-01` was completed as documentation-only focused command matrix work and does not unblock source changes by itself.
- Teams 01-10 run as independent audit/refinement/review lanes in this cycle. Implementation teams without ready work audit/refine instead of idling.
- Trade Plan target geometry remains blocked separately from the completed Strategy Decision Option B-Strict slice.
- Lane 3 ownership/readiness and UX trust remain contract-first.
- Market Data durable readiness evidence remains ADR-first because source implementation may require Prisma/storage policy decisions.
- Alert event ownership remains a high-risk boundary because event inbox actions are global and direct event ownership may require Prisma changes.
- Copilot/research trust remains blocked by product-language and UX-scope decisions before UI or backend changes.
- Subscription self-plan behavior remains a Product Owner policy blocker.
- Notification log previews create a local privacy review item before notification QA can broaden.

## Daemon Scheduler Mode Risk Decisions

- A single consolidated report is not project completion. Team 00 must keep the rolling factory loop alive until a daemon stop condition exists.
- Completed teams become reusable runtime slots.
- If no implementation item is ready, Team 02, Team 03, and Team 04 continue requirements, contracts, and QA prep.
- Human Product Owner review is not required while `open-decisions.md` has no open decision and standing delegation conditions are met.
- As of daemon iteration 5, the two prior decision blockers are resolved and committed. `99-decision-inbox/open-decisions.md` has no open decisions; other independent prep continues.
- As of daemon iteration 6, `09-summaries/daemon-resume-prompt.md` exists and checkpoint reports must explicitly state whether it was updated.
- As of daemon iteration 7, planning queues have been refreshed to remove the resolved alert ownership and trigger DTO blockers. Ready queue remains empty for app-code work.
- As of daemon iteration 8, Team 03 architecture prep timed out without output. This is a runtime checkpoint issue, not a consent blocker; relaunch Team 03 first on resume.
- As of daemon iteration 9, Product Owner authorized standing worktrees, local commits, and scoped push to `dev` under exact staged-scope and acceptance gates.
- As of daemon iteration 10, Teams 02, 03, and 04 completed docs-only refinement and opened three true consent blockers for Lane 3 readiness policy, Trade Plan no-target/DQ hard-block policy, and Market Data durable readiness storage ADR. Affected workstreams wait; independent work continues.

## Team 00 Intake Risk Decisions

- As of the dedicated Team 00 intake on 2026-05-17, the initial worktree was clean and safe for a docs-only orchestration update.
- The ready queue remains at zero active application-code items; forcing implementation would bypass open Decision Inbox gates.
- The active refinement and architecture queue docs had stale wording that understated the three open Decision Inbox blockers; Team 00 corrected those active-doc references in this intake.
- Push to `dev` is authorized by active docs only under strict standing gates, but this intake remains local-only because the user explicitly prohibited push.
- Worktrees are authorized for isolated Teams 03-10 work, but no immediate worktree is needed until an application-code item reaches Ready with exact file reservations.
