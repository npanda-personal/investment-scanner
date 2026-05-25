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
| DQE read-side currentness overclaim risk | High | Medium | Team 00 + Team 03 + Team 04 + Team 05 | residual `DQ-02` implementation widens beyond the bounded DQE public read-path contract or weakens fail-closed semantics | Team 02 selected read-time reconstruction, Team 03 prepared the bounded DQE read-side/public-contract packet, Team 04 accepted QA planning, and Team 00 promoted exact seven-file DQE implementation only | Team 05 must stop if durable schema/storage, routes, Market Data writers, shared utilities, frontend, provider/startup/backfill, package, or generated scope is required |
| Catalog sync freshness ambiguity risk | High | High | Team 05 + Team 00 + QA | UI/API says no new data while latest stored candles lag the accepted latest completed session | `CF-W1-MD-05` bounded freshness-basis and skip-reason slice | implement `MD-05` before downstream trust surfaces |
| Broad-universe Angel One bottleneck risk | High | High | Team 00 + Team 03 + Team 05 | latest `IN/STOCK` EOD sync depends on one throttled historical provider request per stale symbol | promote official exchange EOD bulk latest-candle path first | implement `CF-W3-MDPIPE-01A-MDF-OFFICIAL-EOD` before downstream pipeline stages |
| Official EOD cross-exchange contamination risk | High | Medium | Team 05 + Team 10 + Team 00 | official NSE bulk matching can map a bare NSE symbol into a BSE or ambiguous local instrument | require explicit NSE / `.NS` evidence and skip BSE / `.BO` / ambiguous tasks to fallback | complete `CF-W3-MDPIPE-01A` review rework before QA/review/signoff acceptance |
| Fragile mega-pipeline risk | High | Medium | Team 00 + Team 03 + QA | scheduler tries to run market data, DQ, signals, calibration, context, smart money, strategies, backtests, Trade Plan, Research, and Today Review synchronously in one tick | phase stages with idempotent contracts and durable ledger | `CF-W3-MDPIPE-01B1` adds the ledger foundation; next add read-only status API before fanout |
| Pipeline progress invisibility risk | High | High | Team 00 + Team 08 + QA | user starts or waits for a bulk op, navigates away, and returning screen loses progress state | persist stage progress in `PipelineStageRun` and expose a scope-aware status API | `CF-W3-MDPIPE-01B1` persists progress; `01B2`/`01B3` must expose/render it |
| Pipeline command drift risk | High | Medium | Team 00 + Team 03 + Team 04 | manual trigger controls run providers, duplicate scheduler work, or bypass idempotency/lease rules | keep dashboard triggers disabled until a command API, safety matrix, idempotency contract, and QA plan are accepted | `CF-W3-MDPIPE-01B3-S1` shows disabled trigger provision; next slice is command API architecture |
| Downstream DB pipeline performance risk | High | High | Team 03 + Team 05 + Team 06 | downstream stages recompute full-universe data every 15 minutes or call providers unnecessarily | use idempotency keys, changed-instrument sets, input/output fingerprints, bounded batches, and cache metadata | require each downstream stage to prove skip/cache behavior before scheduler fanout |
| MD-05 UI smoke regression risk | High | Medium | Team 05 + Team 04 + Team 00 | required `market-data-foundation.spec.ts` fails after MD-05 changes or resource-gated validation later reveals real UI issues | keep MD-05 in Rejected/Rework until Playwright passes and QA/review/signoff rerun | rerun single MD-05 Playwright smoke below 90% memory, then route QA rerun |
| False trigger risk | High | Medium | Signal Generation + QA | trigger lacks rule/DQ/audit fields | contract-first signal gate | audit trigger contract |
| Trusted candidate entry-price evidence gap | High | High | Team 00 + Team 03 + Team 06 | `CF-W1-TSC-01` requires rule-triggered entry price but Today Review lacks it and Signal Trigger marks `trigger_price` unavailable | keep TSC implementation out of Ready; prepare upstream Signal Trigger entry-price evidence packet | route `CF-W1-SIG-TRIGGER-ENTRY-01` requirement/architecture/QA prep |
| Today Review stacked-writer sequencing risk | High | Medium | Team 00 + Team 03 + Team 07 | `CF-W2-TSC-05A` starts from current `dev` or edits the same Today Review files outside the accepted `TSC-04A` stack | require Team 07 to use worktree `C:\work\repo\investment-scanner-worktrees\team07-CF-W2-TSC-05A` stacked on `68f0a19` and enforce one-writer reservations | verify `git merge-base --is-ancestor 68f0a19 HEAD` before implementation and QA |
| Signal quality risk | High | Medium | Signal Quality Lab | no outcome proof | forward validation plan | contract inventory |
| Overfit/backtest risk | High | Medium | Backtesting + Architect | metrics without DQ/source proof | require DQ and assumption docs | inspect backtest contract |
| Backtesting proof comparison window risk | Medium | Low | Team 06 + Team 03 + Team 10 | very old saved-run detail falls outside existing `listRuns()` comparison window | record as non-blocking limitation for `BT-04`; defer repository widening unless separately approved | keep `BT-04` read-path additive and avoid repository scope creep |
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

- `CF-W1-TSC-03A-TREV-SUPPORTING-EVIDENCE` and `CF-W2-BT-05` are no longer active blockers; both completed QA, review, Architect Signoff, delegated PO acceptance, and scoped local branch commits on 2026-05-24.
- `CF-W3-MDPIPE-01A-MDF-OFFICIAL-EOD` is no longer blocked: Team 05 rework, Team 04 QA rerun, Team 10 re-review, Architect re-signoff, delegated PO acceptance, and scoped local implementation commit `b0c1ab7` all completed on 2026-05-25.
- `CF-W2-TSC-05A-TREV-RANKING-ELIGIBILITY-REFRAME` is no longer blocked from implementation; Team 00 promoted it to Team 07 on accepted base `68f0a19`. It remains blocked from current-`dev` implementation and any forbidden upstream/shared/schema/route/package/provider scope.
- Market Data durable readiness evidence is incomplete for full contract compliance.
- `CF-W1-DQ-02B` is superseded for current routing by `CF-W1-DQ-02-RS1`; Team 03 prepared the explicit DQE read-side/public-contract packet with no schema/storage requirement, Team 04 accepted QA planning, and Team 00 promoted exact seven-file DQE implementation to Team 05. Wider schema/storage, route, Market Data source, shared, frontend, provider/startup/backfill, package, or generated scope remains blocked.
- Current Market Data natural-key behavior is symbol/date-centric and narrower than the active contract target.
- `signal-generation-engine` run-path default/fail-closed behavior is accepted in bounded `CF-W2-SIG-01A`, and trusted list read-path filtering is committed in `CF-W1-SIG-01B` as `a5bc49a`.
- `latestForInstrument()` is gated by committed `CF-W1-SIG-LATEST-01` as `e0a6788`.
- Lane 2 strategy/signal/risk modules still need fail-closed downstream DQ enforcement tests beyond the accepted Signal Generation and Strategy Decision slices.
- Lane 3 portfolio/watchlist child ownership is accepted in bounded `CF-W1-L3-AUTH-01`; Lane 3 readiness consumer policy is resolved as Option B but child contracts and file reservations remain separate.
- Angel One remains excluded from implementation and live validation.
- Startup scheduler/backfill behavior requires Architect approval before it can be changed or accepted as Sprint 1B scope.
- Downstream modules remain blocked from treating Market Data / DQ as trusted input until module-specific consumer gates are implemented and tested.
- Strategy Decision target-price semantics are resolved for the bounded Option B-Strict compatibility slice; Trade Plan no-target/DQ hard-block policy is resolved as Option B but backend implementation is not yet ready.
- Alert event ownership first backend slice is resolved and committed as `CF-W1-L3-AUTH-02`; notification/copilot digest consumers and Lane 3 readiness consumer implementation remain separate.
- Copilot trust UX policy is resolved as Option B; implementation remains blocked until Copilot-only contract/QA/file reservations and source-supported trust evidence are refreshed.
- Continuous Factory Wave 2 dirty DQ changes were accepted and committed as `CF-W2-DQ-01`.
- Continuous Factory Wave 2 Signal Generation changes were reframed as bounded `CF-W2-SIG-01A`; `CF-W1-SIG-01B` adds trusted list read-path filtering.
- No downstream Trade Plan, alert, watchlist readiness, portfolio-intelligence, or copilot implementation is allowed until module-specific consumer gates, child contracts, QA scenarios, and exact file reservations are recorded. The bounded exception is `CF-W1-L3-PORT-01A`, now promoted for portfolio-management-only readiness DTO implementation.
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
- Subscription self-plan behavior is resolved as Option A: ordinary users may not self-change plans or self-select `ADMIN`; backend implementation remains blocked until module-local contract/QA/reservation refresh.
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
- The ready queue remains at zero active application-code items; forcing implementation would bypass child contract, QA, and file-reservation gates.
- The active refinement and architecture queue docs had stale wording that understated the three open Decision Inbox blockers; Team 00 corrected those active-doc references in this intake.
- Push to `dev` is authorized by active docs only under strict standing gates, but this intake remains local-only because the user explicitly prohibited push.
- Worktrees are authorized for isolated Teams 03-10 work, but no immediate worktree is needed until an application-code item reaches Ready with exact file reservations.

## Decision Resolution Risk Decisions

- As of daemon iteration 16, the Decision Inbox has zero open decisions and Product Owner action is not required.
- Lane 3 readiness policy is resolved as Option B: `READY` supports trusted/action-like workflows; `LIMITED` is passive display only with visible warnings; alerts, reliability labels, action-like workflows, and trusted summaries require `READY`.
- Trade Plan no-target/DQ hard-block policy is resolved as Option B: target-shaped fields remain compatibility-only and cannot support trusted paper-readiness; missing or blocked DQ hard-blocks trusted readiness; `LIMITED` remains blocked or limited-review-only until narrowed later.
- Market Data durable readiness storage is resolved as Option B ADR direction only: companion durable readiness/evidence storage is the direction; no Prisma/schema/migration/source/test implementation is approved by this decision.
- No application-code item became Ready from these resolutions because child contracts, QA scenario updates, exact file reservations, and implementation handoffs still need Team 03/04/00 routing.

## Team 00 Coordination Cycle Risk Decisions

- As of daemon iteration 17, five open Decision Inbox items exist: `CF-W1-AUTH-01`, `CF-W1-SUB-01`, `CF-W1-UX-02`, `CF-W1-UX-05`, and `CF-W1-MD-01`.
- Only the affected workstreams are blocked. Team 01 audits, Team 02 requirement refinement, Team 03 architecture/ADR prep, Team 04 QA planning, Team 05/06/07 lane audits, Team 08 docs-only UX refinement, Team 09 notification redaction readiness prep, and Team 10 review monitoring can continue.
- Ready queue remains zero for application code. Prepared child packets for `CF-W1-L3-PORT-01`, `CF-W1-L3-ALERT-01`, `CF-W1-TP-01B`, and `CF-W1-NOTIF-02` require Team 00 Ready promotion before source/test edits.
- Implementation teams should use dedicated worktrees only after Ready promotion with exact file reservations. Current Team 01-10 assignments are docs-only or review-only and can use the shared `dev` worktree.
- Push is not attempted while the workspace has uncommitted active-doc outputs and open decisions; local docs commit is allowed only after exact staged-scope verification.

## Team 01 Audit Consumption Risk Decisions

- As of 2026-05-18, Team 00 reconciled Team 01's readiness drift audit and confirmed the five Decision Inbox items are still open, not resolved, not stale, and not duplicated.
- The five open decisions block only `CF-W1-AUTH-01`, `CF-W1-SUB-01`, `CF-W1-UX-02`, `CF-W1-UX-05`, and `CF-W1-MD-01`.
- `CF-W1-L3-PORT-01A`, `CF-W1-TP-01B`, `CF-W1-NOTIF-02`, and `CF-W1-L3-ALERT-01` are not decision-blocked, but remain out of Ready until Team 02/03/04 and lane-team readiness inspections confirm exact implementation boundaries.
- `CF-W1-L3-INTEL-01` must remain upstream-blocked until `CF-W1-L3-PORT-01A` is implemented, accepted, and committed.
- The stale completed-work inbox `16-team-inboxes/TEAM-07-CF-W1-L3-AUTH-01.md` must not be used as a current Ready signal; Team 07 current routing is `16-team-inboxes/TEAM-07-current-assignment.md`.

## Decision Resolution Risk Decisions - 2026-05-18

- Product Owner resolved all five current Decision Inbox items; open decisions are now zero and Product Owner action is not required.
- `CF-W1-AUTH-01` is resolved as Option A: protected Team 09 controllers fail closed when `req.user.id` is missing. Risk remains if implementation needs auth middleware, routes, Prisma/schema, shared utilities, package, generated files, or frontend changes; keep those forbidden without a new decision.
- `CF-W1-SUB-01` is resolved as Option A: ordinary users cannot self-change subscription plans or self-select `ADMIN`; admin/manual path may remain if present and safe. Risk remains if implementation needs frontend UI changes, payment providers, route registry, Prisma/schema, packages, or shared UI.
- `CF-W1-UX-02` is resolved as Option B: first slice is Copilot-only, research-support naming, blocked narrative hidden, no Stock Research Workbench, no shared UI/navigation. Risk remains if current source cannot prove mandatory trust fields; create a contract work item or Decision Packet instead of inventing evidence.
- `CF-W1-UX-05` is resolved as Option A: first copy cleanup is Copilot-only after or together with `CF-W1-UX-02`; shared `StatusBadge`, Research Hub, and Market Data UI changes remain future.
- `CF-W1-MD-01` is resolved as Option A: future-dated candles and invalid adjusted close are rejected; missing adjusted close is fallback/incomplete evidence; zero/suspicious volume is warning evidence; spike rejection remains opt-in. Durable readiness storage, provider/startup behavior, schema, routes, shared utilities, frontend, packages, generated files, and live providers remain out of scope.
- No application-code item became Ready from these policy resolutions. Ready queue depth remains zero until Team 00 promotes one exact implementation handoff.

## Team 00 Ready Promotion Risk Decisions - 2026-05-18

- `CF-W1-L3-PORT-01A` is promoted to Ready only as a portfolio-management implementation slice.
- Team 07 must use branch `codex/team07-portfolio-alerts/CF-W1-L3-PORT-01A` and worktree `../investment-scanner-worktrees/team07-CF-W1-L3-PORT-01A`; the shared `dev` workspace has unrelated active-doc changes from other teams.
- Allowed implementation files are limited to `backend/src/modules/portfolio-management/portfolio-management.service.ts`, `backend/src/modules/portfolio-management/portfolio-management.types.ts`, `backend/src/modules/portfolio-management/portfolio-management.md`, and `backend/tests/modules/portfolio-management/portfolio-management.service.test.ts`.
- Shared/high-risk boundaries remain blocked: Prisma, route registries, shared backend utilities or DTOs, shared UI, package manifests, generated files, Data Quality Engine source/exports, watchlist, alerts, portfolio-intelligence, frontend, providers, startup/backfill, live providers, paid/cloud, broker, and telemetry.
- If Team 07 discovers a need for any forbidden file or for `LIMITED` to become action-ready, the workstream stops and returns to Team 00 for blocker routing.

## Team 00 BT-04 Ready Promotion Risk Decisions - 2026-05-24

- `CF-W1-BT-04` is promoted only as a `backtesting-strategy-lab` saved-run freshness/current-proof labeling slice.
- Team 06 must use a dedicated worktree and stack on accepted `CF-W1-BT-03` commit `8f984b1`; plain `dev` is not an acceptable implementation base for this slice.
- The allowed writer set is limited to Backtesting service/types/docs/service-test, feature-local Backtesting page/types, and the focused Backtesting UI spec.
- Repository/controller/router/validation/module/index, route registries, Prisma/schema/migrations, generated files, shared utilities/UI, packages, provider/live/startup/backfill, and upstream/downstream module source remain blocked.
- Any implementation that fabricates current proof from stale, repaired, limited, unavailable, or missing proof evidence is a QA/review reject.
- Any target-price, reward/risk, `R:R`, Trade Plan-first, buy/sell, guarantee, broker, automation, or financial-advice wording is a QA/review reject.

## Team 00 Review Rework Risk Decisions - 2026-05-18

- Team 04 first-pass QA passed for `CF-W1-L3-PORT-01A`, but Team 10 rejected release acceptance because the portfolio mapper can treat automation-only Data Quality blockers as portfolio display hard blockers.
- This is a routine code-review rejection, not a Product Owner consent blocker, while the fix stays inside the existing Team 07 file reservation.
- Team 07 must revise the mapper and add a focused automation-blocked Data Quality case before Team 04 reruns QA and Team 10 re-reviews.
- No commit, push, Architect Signoff, or delegated Product Owner acceptance is authorized until the rework passes QA and review.

## Team 00 Rolling Factory Risk Decisions - 2026-05-18

- `CF-W1-MD-01` is accepted and locally committed on its Team 05 branch as `913b56b`; it must not be pushed or merged into `dev` until Team 00 performs a clean integration pass with exact scope.
- `CF-W1-L3-TREV-01` is promoted only as a Today Review run/list publication-evidence slice. Candidate-detail run-evidence expansion, Today Review route/controller/validation changes, upstream Market Data/DQ/Strategy/Trade Plan changes, shared UI, Prisma, packages, generated files, providers, startup/backfill, live-provider, paid/cloud, telemetry, and broker scope remain blocked.
- Shared `dev` remains not push-safe while `backend/tests/modules/alerts-monitoring/alerts-monitoring.ownership.test.ts` is dirty outside a current accepted integration action.
- `CF-W1-L3-TREV-01` is accepted and locally committed on its Team 07 branch as `e0673c3`; it must not be pushed or merged into `dev` until Team 00 performs a clean integration pass with exact scope.
- `CF-W1-SQLAB-01` is promoted only as a backend-only Signal Quality Lab additive outcome-confidence slice. Data Quality Engine source/export changes, signal/calibration/strategy/trade-plan source changes, repository/controller/router/validation changes, frontend/UI work, route/schema/package/generated/provider/startup/live/paid/cloud/telemetry/broker scope, and changing default DQ filter behavior remain blocked.

## Product Owner Priority Correction Risk Decisions - 2026-05-18

- Future routing must prioritize direct investor/trader value: market data, Data Quality, signals, strategy trust, backtests, calibration, historical context, market context, Trade Plan research support, and research evidence.
- Admin, settings, auth/subscription, notifications, and alert convenience work are lowest priority unless they block correctness, privacy, user-data safety, or an already accepted branch gate.
- The next safe docs-only handoff is `CF-W1-BT-02` architecture/contract refresh, followed by historical context, market context, calibration, signal-quality learning, Strategy Framework provenance, DQ currentness, Trade Plan readiness, and Market Data durable-readiness ADR prep.

## Team 00 SIG-01A Ready Promotion Risk Decisions - 2026-05-24

- `CF-W2-SIG-01A` is promoted only as a backend-only Signal Generation run-path Data Quality fail-closed implementation/validation slice.
- Current `dev` appears to already contain prior run-path DQ enforcement behavior; Team 06 must inspect first and avoid app-code churn when focused validation proves the current behavior already satisfies the requirement.
- Allowed files are limited to Signal Generation service, validation, and focused Signal Generation service/validation/DQ invariant tests.
- Data Quality Engine, Market Data, Signal Generation types/repository/controller/router/module/index, Prisma/schema/migrations, route registries, frontend, shared utilities/UI, package manifests, generated files, provider/live/startup/backfill, paid/cloud, broker, telemetry, and credential scope remain blocked.
- Explicit `useDataQualityFilter: false` must remain a legacy/research bypass and must not be described as trusted DQ enforcement.
- Any target-price, synthetic target, `R:R`, Trade Plan-first, buy/sell, guarantee, or financial-advice wording is a QA/review reject.

## Team 00 TSC-03A Ready Promotion Risk Decisions - 2026-05-24

- `CF-W1-TSC-03A-TREV-SUPPORTING-EVIDENCE` is promoted only as a Today Review-owned supporting-trust evidence projection stacked on accepted `CF-W1-TSC-02A-TREV-HEALTH` commit `34c9993`.
- Plain `dev` is not an acceptable base for this slice.
- The allowed writer set is limited to the existing Today Review backend/frontend source and focused Today Review service/UI tests.
- DQ, Calibration, Backtesting, Signal Generation, Strategy Decision, Trade Plan, route, schema, repository/controller/router/validation/module/index, shared utilities/UI, package, generated, provider/live/startup/backfill, paid/cloud, broker, telemetry, and credential scope remain blocked.
- Absent `DQ-03`, `CAL-01A`, or `BT-04` evidence must render explicit unavailable/missing states. Today Review must not recreate upstream trust logic.
- Supporting evidence must not become a new score, ranking formula, target, R:R, Trade Plan-first workflow, direct-action instruction, or advice-like prioritization.

## Team 00 HCTX Ready Promotion Risk Decisions - 2026-05-18

- `CF-W1-HCTX-01` is promoted only as a backend-only `historical-context-snapshots` lookup-explainability slice.
- Team 05 must use branch `codex/team05-market-data/CF-W1-HCTX-01` and worktree `../investment-scanner-worktrees/team05-CF-W1-HCTX-01`.
- Allowed implementation files are limited to `historical-context-snapshots.service.ts`, `historical-context-snapshots.types.ts`, `historical-context-snapshots.md`, and `historical-context-snapshots.service.test.ts`.
- Shared/high-risk boundaries remain blocked: Prisma/schema/migrations, repository/controller/router/validation/index, route registries, shared utilities or DTOs, shared UI, package manifests, generated files, frontend, Market Context, Smart Money, Market Data, Signal Calibration source changes, providers, startup/backfill, live providers, paid/cloud, broker, and telemetry.
- If Team 05 discovers the need for a second repository lookup, upstream module source changes, frontend rendering, or any forbidden file, the workstream stops and returns to Team 00.
