# TEAM-02 Current Assignment

Date: 2026-05-18

Team: TEAM-02 - Requirement Factory

## Latest Assignment Override - 2026-05-24 Trusted Signal Candidate Dependency

Before creating or changing requirements, read root `AGENTS.md` and preserve the Product Owner direction: direct investor/trader value first, no Trade Plan/R:R/target-price framing, no financial-advice wording, and no app-code implementation from Team 02.

Assignment:

1. Define `CF-W1-SIG-TRIGGER-ENTRY-01` as the next upstream requirement child for source-proven rule-triggered entry price, trigger timestamp, and rule provenance.
2. Keep `CF-W1-TSC-01` as the top product-direction requirement, but do not move it to Ready while trigger price evidence is missing.
3. Keep `CF-W1-TP-03` paused/stale unless reframed into Trusted Signal Candidate health without targets, R:R, synthetic profit targets, or Trade Plan-first UX.
4. Update requirement queues only; Team 00 owns Ready movement.

Allowed writes:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/**`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/12-ready-queue/**`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-02-requirement-factory.md`

Required output:

- Requirement draft or queue update for `CF-W1-SIG-TRIGGER-ENTRY-01`.
- Explicit acceptance criteria rejecting invented trigger prices, reference-zone substitution, target/R:R leakage, direct advice, and unsupported `Highly Trusted` classification.
- Current queue depth and next recommended Team 03/04 handoff.

## Current Active Override - Root Constitution Required

Date: 2026-05-20

Before creating or changing any requirement, Team 02 / Product Owner delegate must read root `AGENTS.md` and use it as the product constitution.

Requirement discovery must align with:

- localhost-first and zero-incremental-cost constraints;
- research-support / market-intelligence mission;
- no direct financial advice, no arbitrary target prices, no broker or live-trading workflow;
- Data Quality gating before downstream signal, strategy, alert, portfolio, review, or copilot workflows;
- current Product Owner priority: direct investor/trader value first.

Highest-priority discovery themes:

- market data freshness, provenance, and coverage;
- Data Quality readiness and residual reason evidence;
- historical and market context freshness;
- signal/trigger explainability;
- strategy evidence;
- backtesting and calibration trust;
- trade-plan research support;
- Today Review and Signal Quality review loops.

Lowest priority unless they block correctness, privacy, trust, or user-data safety:

- admin/settings;
- auth/subscription;
- notifications;
- alert convenience work.

Team 02 must keep accepted, committed, parked, active, schema-gated, or already-routed items out of fresh-pull recommendations. Team 00 owns Ready movement.

Prompt file: `docs/execution/codex-parallel-execution-plan-2026-05-16/15-automation-prompts/AUTO-02-requirement-factory.md`

## Assignment

Keep backlog, refinement queue, and top candidates current. Convert audit findings into bounded requirements without moving application-code items to Ready.

Current priority after Team 01 audit consumption:

1. Refine `CF-W1-L3-PORT-01A` as the first portfolio-only readiness DTO child candidate.
2. Refine `CF-W1-TP-01B` as the backend-only Trade Plan DQ hard-block / target-compatibility candidate.
3. Refine `CF-W1-NOTIF-02` as a provider/service-doc notification log redaction candidate.
4. Refine `CF-W1-L3-ALERT-01` as an alert readiness suppression candidate, still behind explicit Team 00 promotion.
5. Keep `CF-W1-L3-INTEL-01` dependent on accepted `CF-W1-L3-PORT-01A`; do not frame it as independently Ready.
6. Refresh `CF-W1-AUTH-01`, `CF-W1-SUB-01`, `CF-W1-UX-02`, `CF-W1-UX-05`, and `CF-W1-MD-01` from decision-blocked to post-decision refinement. Do not mark them Ready.

Do not move any application-code item to Ready. Team 00 owns Ready queue movement.

## Scope

Allowed writes:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/**`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/12-ready-queue/**`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-02*.md`

Coordinate with Team 00 before editing `99-decision-inbox/open-decisions.md`.

Forbidden writes:

- application source or tests
- high-risk/shared files
- historical `docs/codex-agent-team-plan/**`

## Branch / Worktree

Use shared `dev` for docs-only refinement. No implementation worktree is authorized.

## Blockers

Do not duplicate existing Decision Packets. Report any new true consent blocker to Team 00.

Decision reconciliation:

- No open decisions remain.
- Product Owner action is not required.
- The five former Decision Inbox items are policy-resolved but still need requirement/contract/QA/reservation refresh before source/test work.

## Expected Outbox

Update `17-team-outboxes/TEAM-02-requirement-factory.md` with queue deltas and Ready-depth evidence.

---

# Latest Standing Assignment

Date: 2026-05-18

## Assignment

Continue as the persistent PO + Requirements value-discovery lane.

Do not wait for Team 00 to feed one requirement at a time. Audit the next highest user-value investor/trader workflow, propose bounded requirements, and reorder the top candidate stack from highest user value to lowest after each cycle.

## Current Inputs

- `CF-W1-STRAT-02` has been drafted and routed to Team 03 architecture prep.
- `CF-W1-SQLAB-01` is active implementation in Team 06.
- `CF-W1-SQLAB-02` architecture split is complete; no-schema child needs QA planning, durable storage child is blocked.
- Accepted branch commits remain parked for later clean integration; do not treat parked commits as merged into `dev`.

## Allowed Writes

- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/**`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/12-ready-queue/**`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-02-requirement-factory.md`

## Required Output

- Add or refine at least one high-user-value requirement candidate.
- Keep `next-top-10-candidates.md`, `top-10-ready-candidates.md`, `refinement-queue.md`, and `requirements-backlog.md` consistent.
- Do not move any application-code item to Ready.
- Identify the next top unassigned item for Team 00 after the cycle.

---

# Latest Standing Assignment

Date: 2026-05-18

## Assignment

Continue persistent PO + Requirements discovery on a distinct unassigned workflow.

Already actively routed or recently completed:

- `CF-W1-SQLAB-01`: active rework / QA rerun path.
- `CF-W1-SQLAB-02A`: requirement split and QA planning complete; implementation sequencing blocked behind SQLAB-01.
- `CF-W1-STRAT-02A`: architecture complete; QA planning active.
- `CF-W1-BT-02`: routed to Team 03 architecture prep.
- `CF-W1-L3-WATCH-01`: refined in the prior Team 02 cycle.

Pick a different under-served workflow or module from the backlog/audits, then add/refine one bounded user-value requirement if evidence supports it.

## Required Output

- Requirement(s) created or refined.
- Queue deltas in backlog/refinement/top-candidate docs.
- Next top unassigned item excluding actively routed items above.
- No Ready movement.

---

# Latest Standing Assignment

Date: 2026-05-18

## Product Owner Priority Correction

This final standing assignment supersedes older tails above.

Continue as the persistent PO + Requirements value-discovery lane, but rank direct investor/trader value first.

Highest priority discovery/refinement themes:

- market data and Data Quality evidence;
- signals, strategy trust, calibration, backtesting, Trade Plan research support;
- historical context, market context, signal-quality learning, and research evidence.

Lowest priority unless they block correctness, privacy, or user-data safety:

- admin and settings;
- auth/subscription;
- notifications;
- alert inbox or user-alert convenience work.

## Assignment

Keep `next-top-10-candidates.md`, `top-10-ready-candidates.md`, `requirements-backlog.md`, and queue notes aligned to the corrected priority model.

Treat `CF-W1-BT-02` as the next Team 00 architecture/QA-prep handoff. After that, prioritize `CF-W1-HCTX-01`, `CF-W1-MCTX-01`, `CF-W1-CAL-01`, `CF-W1-SQLAB-02`, `CF-W1-STRAT-02`, `CF-W1-DQ-02`, `CF-W1-TP-01B`, and `CF-W1-MD-02` before any platform/notification/alert convenience item.

Do not move any application-code item to Ready. Team 00 owns Ready movement.

## Required Output

- Add or refine at least one high-user-value market-intelligence requirement if the queue thins.
- Keep already accepted or parked branch work out of the active discovery ranking.
- Identify the next top unassigned market-intelligence item after each cycle.
- Report any true consent blocker to Team 00, but do not ask the human Product Owner for routine prioritization.

---

# Latest Standing Assignment

Date: 2026-05-18

## Assignment

Continue persistent PO + Requirements discovery after Team 00 committed the prior requirement-refresh docs as `05c02ab`.

The current active gate work is `CF-W1-BT-01A` QA verification. Do not duplicate that implementation or QA work.

Continue ranking and discovery by direct investor/trader value:

- market data reliability and Data Quality;
- signals, strategy trust, trigger provenance, calibration, backtesting, Trade Plan research support;
- historical context, market context, signal-quality learning, research evidence, reviewability, and explainability.

Keep admin, settings, auth/subscription, notifications, and alert convenience work low unless it blocks correctness, privacy, or user-data safety.

## Allowed Writes

- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/**`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-02-requirement-factory.md`

## Required Output

- Add or refine at least one high-user-value market-intelligence requirement if evidence supports it.
- Keep already accepted, active, queued, parked, or schema-blocked branch work out of the active unassigned ranking.
- Identify top parallel-safe candidates for Team 00 to route next.
- Do not move any item to Ready.

---

# Current Active Assignment Override

Date: 2026-05-18

## Assignment

Relaunch the rolling PO + Requirements discovery lane now. This is not a passive monitoring task and not a signoff task. Team 00 will explicitly route acceptance or signoff work when needed.

Audit one under-served direct investor/trader-value workflow and add or refine at least one bounded requirement if current source/docs support it.

## Current Active / Queued Items To Exclude

- `CF-W1-TP-02`: in implementation/review follow-up flow; do not rework the requirement unless Team 00 routes a rejection back to requirements.
- `CF-W1-SMI-01`: Ready-promoted implementation candidate; do not re-rank as unassigned.
- `CF-W1-RH-01`: architecture packet completed in commit `76a2c32`; next gate is Team 04 QA planning, not more requirement discovery.
- `CF-W1-L3-TREV-02`: Team 00 is routing this to Team 03 rolling architecture prep.
- `CF-W1-RH-02A`: already refined as the next Research Hub what-changed child; keep visible for future architecture, but do not rework unless you find a concrete inconsistency.
- Accepted branch commits parked for later clean integration stay out of active discovery ranking.

## Priority Rule

Rank direct investor/trader value first:

- market data and Data Quality evidence;
- signal and trigger provenance;
- strategy trust and calibration;
- backtesting review loops;
- Trade Plan research support;
- historical context, market context, smart-money evidence, Research Hub evidence, Today Review provenance, reviewability, and explainability.

Keep admin, settings, auth/subscription, notifications, and alert convenience work lowest unless they block correctness, privacy, user-data safety, or an accepted branch gate.

## Required Output

- Requirement(s) created or refined.
- Queue deltas in `next-top-10-candidates.md`, `top-10-ready-candidates.md`, `requirements-backlog.md`, and `refinement-queue.md`.
- The next top unassigned market-intelligence item after excluding active/queued/accepted/parked/blocked work.
- No Ready movement and no application-code edits.

---

# Current Active Assignment Override

Date: 2026-05-18

## Assignment

Relaunch the rolling PO + Requirements discovery lane after the `CF-W1-MD-03` cycle. Do not monitor passively.

Audit a different under-served direct investor/trader-value workflow and add/refine at least one bounded requirement if current source/docs support it.

## Current Active / Queued Items To Exclude

- `CF-W1-RH-02A`: active Team 03 architecture prep.
- `CF-W1-MD-03`: queued for Team 03 architecture after `RH-02A`; do not rework unless Team 00 routes a rejection.
- `CF-W1-RH-01`: QA plan ready; Team 00 Ready evaluation pending.
- `CF-W1-L3-TREV-02`: active Team 04 QA planning.
- `CF-W1-MD-02A`: proposal packet ready; queued for Team 04 QA review.
- `CF-W1-SMI-01`: active Team 04 worktree QA verification.
- `CF-W1-TP-02`: active follow-up gate; do not rework unless Team 00 routes a rejection back to requirements.
- Accepted branch commits parked for later clean integration stay out of active discovery ranking.

## Priority Rule

Rank direct investor/trader value first: market data, DQ evidence, signal/trigger provenance, strategy trust, calibration, backtesting, Trade Plan research support, historical/market context, smart-money evidence, Research Hub evidence, Today Review provenance, reviewability, and explainability.

Keep admin, settings, auth/subscription, notifications, and alert convenience work lowest unless they block correctness, privacy, user-data safety, or an accepted branch gate.

## Required Output

- Requirement(s) created or refined.
- Queue deltas in `next-top-10-candidates.md`, `top-10-ready-candidates.md`, `requirements-backlog.md`, and `refinement-queue.md`.
- The next top unassigned market-intelligence item after excluding active/queued/accepted/parked/blocked work.
- No Ready movement and no application-code edits.

---

# Current Active Assignment Override

Date: 2026-05-18

## Assignment

Relaunch the rolling PO + Requirements discovery lane after the `CF-W1-MD-02A` cycle. Do not monitor passively.

Audit a different under-served direct investor/trader-value workflow and add/refine at least one bounded requirement if current source/docs support it.

## Current Active / Queued Items To Exclude

- `CF-W1-MD-02A`: routed to Team 03 architecture prep.
- `CF-W1-RH-01`: routed to Team 04 QA planning.
- `CF-W1-L3-TREV-02`: architecture prep complete; queued for Team 04 QA planning after the current main-workspace QA writer.
- `CF-W1-SMI-01`: Ready-promoted implementation candidate for Team 06.
- `CF-W1-TP-02`: active follow-up gate; do not rework unless Team 00 routes a rejection back to requirements.
- `CF-W1-RH-02A`: already refined and remains next visible follow-on after `MD-02A`; do not rework unless evidence changed.
- Accepted branch commits parked for later clean integration stay out of active discovery ranking.

## Priority Rule

Rank direct investor/trader value first: market data, DQ evidence, signal/trigger provenance, strategy trust, calibration, backtesting, Trade Plan research support, historical/market context, smart-money evidence, Research Hub evidence, Today Review provenance, reviewability, and explainability.

Keep admin, settings, auth/subscription, notifications, and alert convenience work lowest unless they block correctness, privacy, user-data safety, or an accepted branch gate.

## Required Output

- Requirement(s) created or refined.
- Queue deltas in `next-top-10-candidates.md`, `top-10-ready-candidates.md`, `requirements-backlog.md`, and `refinement-queue.md`.
- The next top unassigned market-intelligence item after excluding active/queued/accepted/parked/blocked work.
- No Ready movement and no application-code edits.

---

# Current Dispatcher Assignment

Date: 2026-05-18

## Assignment

Team 00 is relaunching Team 02 as the rolling PO + Requirements discovery lane while Team 06 implements `CF-W1-TP-02`.

Do not monitor passively or self-switch to signoff work. Team 00 will explicitly assign gate-support work if needed. This cycle is requirement discovery and ranking only.

## Current Active / Routed Items To Exclude

- `CF-W1-TP-02`: active Team 06 implementation on dependent Trade Plan branch.
- `CF-W1-SIG-TRIGGER-02A`: accepted and locally committed on Team 06 branch.
- `CF-W1-SQLAB-01`, `CF-W1-BT-02`, `CF-W1-CAL-01`, `CF-W1-HCTX-01`, `CF-W1-MD-01`, `CF-W1-DQ-02A`, `CF-W1-STRAT-02A`, `CF-W1-UX-01A`, and `CF-W1-AUTH-SUB-01`: accepted branch commits parked for later clean integration.
- Items already documented as split/blocked by schema, durable storage, shared files, route registries, or frontend scope must remain out of Ready until Team 00 promotes a bounded child.

## Product Priority

Prioritize direct investor/trader value:

- market data and Data Quality evidence;
- signals, strategy trust, calibration, backtesting, Trade Plan research support;
- historical context, market context, signal-quality learning, smart-money evidence freshness, Research Hub evidence wiring, reviewability, and explainability.

Keep admin, settings, auth/subscription, notifications, and alert convenience work lowest unless they block correctness, privacy, user-data safety, or an accepted branch gate.

## Required Output

- Audit one under-served market-intelligence workflow and add or refine at least one bounded requirement if evidence supports it.
- Keep `next-top-10-candidates.md`, `top-10-ready-candidates.md`, `requirements-backlog.md`, and `refinement-queue.md` aligned.
- Identify the next top unassigned requirement for Team 00 after excluding active, accepted, parked, and blocked items.
- Do not move application-code work to Ready.

---

# Current Dispatcher Assignment

Date: 2026-05-18

## Assignment

Continue the rolling PO + Requirements discovery lane on a distinct market-intelligence workflow.

Team 02 just refined `CF-W1-RH-01`; Team 00 is queuing that for architecture after active `CF-W1-SMI-01` architecture prep. Do not keep reworking `CF-W1-RH-01` this cycle unless you find a direct inconsistency from the current queue docs.

## Current Active / Routed Items To Exclude

- `CF-W1-TP-02`: active Team 06 implementation.
- `CF-W1-SMI-01`: active Team 03 architecture readiness.
- `CF-W1-RH-01`: next architecture-prep candidate queued after `CF-W1-SMI-01`.
- `CF-W1-SIG-TRIGGER-02A`: accepted and locally committed on Team 06 branch.
- `CF-W1-SQLAB-01`, `CF-W1-BT-02`, `CF-W1-CAL-01`, `CF-W1-HCTX-01`, `CF-W1-MD-01`, `CF-W1-DQ-02A`, `CF-W1-STRAT-02A`, `CF-W1-UX-01A`, and `CF-W1-AUTH-SUB-01`: accepted branch commits parked for later clean integration.

## Product Priority

Prioritize direct investor/trader value:

- market data and Data Quality evidence;
- signal reviewability, trigger provenance, strategy trust, calibration, backtesting, Trade Plan research support;
- historical context, market context, signal-quality learning, smart-money evidence freshness, Research Hub evidence wiring, reviewability, and explainability.

Keep admin, settings, auth/subscription, notifications, and alert convenience work lowest unless they block correctness, privacy, user-data safety, or an accepted branch gate.

## Required Output

- Audit one under-served market-intelligence workflow not already active or queued.
- Add or refine at least one bounded requirement if evidence supports it.
- Keep `next-top-10-candidates.md`, `top-10-ready-candidates.md`, `requirements-backlog.md`, and `refinement-queue.md` aligned.
- Identify the next top unassigned requirement for Team 00 after excluding active/queued/accepted/parked/blocked items.
- Do not move application-code work to Ready.

---

# Current Dispatcher Assignment

Date: 2026-05-18

## Assignment

Continue the rolling PO + Requirements discovery lane on a distinct investor/trader-value workflow.

Do not monitor passively or self-switch to signoff work. Team 00 will explicitly assign gate-support work if needed. This cycle is requirements discovery and ranking only.

## Current Active / Routed Items To Exclude

- `CF-W1-TP-02`: Team 06 rework active after Team 10 review reject.
- `CF-W1-SMI-01`: Ready promoted for Team 06 implementation.
- `CF-W1-RH-01`: Team 03 architecture readiness active.
- `CF-W1-L3-TREV-02`: queued architecture candidate after `RH-01`.
- `CF-W1-RH-02A`: freshly split requirement; queue behind `RH-01` and `TREV-02` architecture unless Team 00 reprioritizes.
- `CF-W1-SIG-TRIGGER-02A`: accepted and locally committed on Team 06 branch.
- `CF-W1-SQLAB-01`, `CF-W1-BT-02`, `CF-W1-CAL-01`, `CF-W1-HCTX-01`, `CF-W1-MD-01`, `CF-W1-DQ-02A`, `CF-W1-STRAT-02A`, `CF-W1-UX-01A`, and `CF-W1-AUTH-SUB-01`: accepted branch commits parked for later clean integration.

## Product Priority

Prioritize direct investor/trader value:

- market data and Data Quality evidence;
- signals, trigger provenance, strategy trust, calibration, backtesting, Trade Plan research support;
- historical context, market context, signal-quality learning, smart-money evidence freshness, Research Hub evidence wiring, Today Review provenance, reviewability, and explainability.

Keep admin, settings, auth/subscription, notifications, and alert convenience work lowest unless they block correctness, privacy, user-data safety, or an accepted branch gate.

## Required Output

- Audit one under-served market-intelligence workflow not already active or queued.
- Add or refine at least one bounded requirement if evidence supports it.
- Keep `next-top-10-candidates.md`, `top-10-ready-candidates.md`, `requirements-backlog.md`, and `refinement-queue.md` aligned.
- Identify the next top unassigned requirement for Team 00 after excluding active/queued/accepted/parked/blocked items.
- Do not move application-code work to Ready.

---

# Current Dispatcher Assignment

Date: 2026-05-18

## Assignment

Continue the rolling PO + Requirements discovery lane on a distinct investor/trader-value workflow.

Do not monitor passively or self-switch to signoff work. Team 00 will explicitly assign gate-support work if needed. This cycle is requirements discovery and ranking only.

## Current Active / Routed Items To Exclude

- `CF-W1-TP-02`: Team 10 review active after Team 04 QA ACCEPT.
- `CF-W1-SMI-01`: Team 04 QA planning active.
- `CF-W1-RH-01`: Team 03 architecture readiness active.
- `CF-W1-L3-TREV-02`: refined by Team 02 and next queued architecture candidate after `RH-01`.
- `CF-W1-SIG-TRIGGER-02A`: accepted and locally committed on Team 06 branch.
- `CF-W1-SQLAB-01`, `CF-W1-BT-02`, `CF-W1-CAL-01`, `CF-W1-HCTX-01`, `CF-W1-MD-01`, `CF-W1-DQ-02A`, `CF-W1-STRAT-02A`, `CF-W1-UX-01A`, and `CF-W1-AUTH-SUB-01`: accepted branch commits parked for later clean integration.

## Product Priority

Prioritize direct investor/trader value:

- market data and Data Quality evidence;
- signals, trigger provenance, strategy trust, calibration, backtesting, Trade Plan research support;
- historical context, market context, signal-quality learning, smart-money evidence freshness, Research Hub evidence wiring, Today Review provenance, reviewability, and explainability.

Keep admin, settings, auth/subscription, notifications, and alert convenience work lowest unless they block correctness, privacy, user-data safety, or an accepted branch gate.

## Required Output

- Audit one under-served market-intelligence workflow not already active or queued.
- Add or refine at least one bounded requirement if evidence supports it.
- Keep `next-top-10-candidates.md`, `top-10-ready-candidates.md`, `requirements-backlog.md`, and `refinement-queue.md` aligned.
- Identify the next top unassigned requirement for Team 00 after excluding active/queued/accepted/parked/blocked items.
- Do not move application-code work to Ready.

---

# Latest Standing Assignment

Date: 2026-05-18

## Product Owner Priority Correction

This latest standing assignment supersedes older tails above.

Continue as the persistent PO + Requirements value-discovery lane, but rank direct investor/trader value first:

- market data and Data Quality evidence;
- signals, strategy trust, calibration, backtesting, Trade Plan research support;
- historical context, market context, signal-quality learning, and research evidence.

Keep admin, settings, auth/subscription, notifications, and alert convenience work lowest priority unless they block correctness, privacy, user-data safety, or an already accepted branch gate.

## Current Active / Routed Items To Exclude

- `CF-W1-BT-02`: active bounded Team 06 rework.
- `CF-W1-HCTX-01`: Team 10 accepted; routed to Architect Signoff.
- `CF-W1-MCTX-01`: architecture and QA plan prepared; Team 00 Ready evaluation pending.
- `CF-W1-DQ-02`: routed to Team 03 architecture readiness.
- Accepted branch commits remain parked for later clean integration and should stay out of active discovery ranking.

## Assignment

Continue market-intelligence requirement discovery on an under-served high-value workflow. Prefer calibration, signal trust, backtesting learning loops, market context, historical context downstream use, market-data/DQ evidence, Trade Plan research support, or research evidence gaps.

Do not move any application-code item to Ready. Team 00 owns Ready movement.

## Required Output

- Add or refine at least one high-user-value market-intelligence requirement if evidence supports it.
- Keep `next-top-10-candidates.md`, `top-10-ready-candidates.md`, `requirements-backlog.md`, and `refinement-queue.md` aligned with the corrected priority model.
- Identify the next top unassigned market-intelligence item excluding the active/routed items above.
- Report true consent blockers to Team 00; do not ask the human Product Owner for routine prioritization.

---

# Latest Standing Assignment

Date: 2026-05-18

## Product Owner Priority Correction

Continue as the persistent PO + Requirements value-discovery lane, but reorder the backlog by direct investor/trader value first.

Highest priority discovery/refinement themes:

- market data and Data Quality evidence;
- signals, strategy trust, calibration, backtesting, Trade Plan research support;
- historical context, market context, signal-quality learning, and research evidence.

Lowest priority unless they block correctness, privacy, or user-data safety:

- admin and settings;
- auth/subscription;
- notifications;
- alert inbox or user-alert convenience work.

## Assignment

Keep `next-top-10-candidates.md`, `top-10-ready-candidates.md`, `requirements-backlog.md`, and queue notes aligned to the corrected priority model.

Treat `CF-W1-BT-02` as the next Team 00 architecture/QA-prep handoff. After that, prioritize `CF-W1-HCTX-01`, `CF-W1-MCTX-01`, `CF-W1-CAL-01`, `CF-W1-SQLAB-02`, `CF-W1-STRAT-02`, `CF-W1-DQ-02`, `CF-W1-TP-01B`, and `CF-W1-MD-02` before any platform/notification/alert convenience item.

Do not move any application-code item to Ready. Team 00 owns Ready movement.

## Required Output

- Add or refine at least one high-user-value market-intelligence requirement if the queue thins.
- Keep already accepted or parked branch work out of the active discovery ranking.
- Identify the next top unassigned market-intelligence item after each cycle.
- Report any true consent blocker to Team 00, but do not ask the human Product Owner for routine prioritization.

---

# Latest Standing Assignment

Date: 2026-05-18

## Assignment

Continue persistent PO + Requirements discovery on a distinct unassigned workflow.

Already actively routed or recently completed:

- `CF-W1-SQLAB-01`: accepted and locally committed on Team 06 branch.
- `CF-W1-SQLAB-02A`: requirement split and QA planning complete; implementation sequencing blocked behind SQLAB-01 integration.
- `CF-W1-STRAT-02A`: architecture and QA planning complete; Team 00 Ready evaluation pending.
- `CF-W1-BT-02`: architecture and QA planning complete but Team 02 narrowed the requirement after those packets; packet refresh needed before Ready.
- `CF-W1-DQ-02`: architecture complete as split-required; DQ-02A QA planning active.
- `CF-W1-L3-INTEL-03`: routed to Team 03 architecture prep.
- `CF-W1-L3-WATCH-01`: recently refined.

Pick a different under-served workflow or module from the backlog/audits, then add/refine one bounded user-value requirement if evidence supports it.

## Required Output

- Requirement(s) created or refined.
- Queue deltas in backlog/refinement/top-candidate docs.
- Next top unassigned item excluding actively routed items above.
- No Ready movement.

---

# Latest Standing Assignment

Date: 2026-05-18

## Assignment

Continue persistent PO + Requirements discovery on a distinct unassigned workflow.

Already actively routed or recently completed:

- `CF-W1-SQLAB-01`: Architect Signoff active after QA/review acceptance.
- `CF-W1-SQLAB-02A`: requirement split and QA planning complete; implementation sequencing blocked behind SQLAB-01.
- `CF-W1-STRAT-02A`: architecture and QA planning complete; Team 00 Ready evaluation pending.
- `CF-W1-BT-02`: architecture complete and QA planning active.
- `CF-W1-DQ-02`: routed to Team 03 architecture prep.
- `CF-W1-L3-WATCH-01`: recently refined.

Pick a different under-served workflow or module from the backlog/audits, then add/refine one bounded user-value requirement if evidence supports it.

## Required Output

- Requirement(s) created or refined.
- Queue deltas in backlog/refinement/top-candidate docs.
- Next top unassigned item excluding actively routed items above.
- No Ready movement.

---

# Latest Standing Assignment

Date: 2026-05-18

## Product Owner Priority Correction

This final standing assignment supersedes older tails above.

Continue as the persistent PO + Requirements value-discovery lane, but rank direct investor/trader value first.

Highest priority discovery/refinement themes:

- market data and Data Quality evidence;
- signals, strategy trust, calibration, backtesting, Trade Plan research support;
- historical context, market context, signal-quality learning, and research evidence.

Lowest priority unless they block correctness, privacy, or user-data safety:

- admin and settings;
- auth/subscription;
- notifications;
- alert inbox or user-alert convenience work.

## Assignment

Keep `next-top-10-candidates.md`, `top-10-ready-candidates.md`, `requirements-backlog.md`, and queue notes aligned to the corrected priority model.

Treat `CF-W1-BT-02` as the next Team 00 architecture/QA-prep handoff. After that, prioritize `CF-W1-HCTX-01`, `CF-W1-MCTX-01`, `CF-W1-CAL-01`, `CF-W1-SQLAB-02`, `CF-W1-STRAT-02`, `CF-W1-DQ-02`, `CF-W1-TP-01B`, and `CF-W1-MD-02` before any platform/notification/alert convenience item.

Do not move any application-code item to Ready. Team 00 owns Ready movement.

## Required Output

- Add or refine at least one high-user-value market-intelligence requirement if the queue thins.
- Keep already accepted or parked branch work out of the active discovery ranking.
- Identify the next top unassigned market-intelligence item after each cycle.
- Report any true consent blocker to Team 00, but do not ask the human Product Owner for routine prioritization.
