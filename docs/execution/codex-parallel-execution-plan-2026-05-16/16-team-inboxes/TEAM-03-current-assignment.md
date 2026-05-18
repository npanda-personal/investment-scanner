# TEAM-03 Current Assignment

Date: 2026-05-18

Team: TEAM-03 - Architecture Factory

Prompt file: `docs/execution/codex-parallel-execution-plan-2026-05-16/15-automation-prompts/AUTO-03-architecture-factory.md`

## Assignment

Prepare contracts, exact file reservations, and architecture readiness for the highest-priority candidates. No application-code item is Ready.

Current priority after Team 01 audit consumption:

1. Prepare architecture/file-reservation readiness for `CF-W1-L3-PORT-01A` as a portfolio-management-only child, separate from watchlist.
2. Prepare architecture readiness for `CF-W1-TP-01B`.
3. Prepare architecture readiness for `CF-W1-NOTIF-02`.
4. Prepare architecture readiness for `CF-W1-L3-ALERT-01`.
5. Keep `CF-W1-L3-INTEL-01` explicitly downstream of accepted `CF-W1-L3-PORT-01A`.
6. Refresh post-decision architecture/work-packet readiness for `CF-W1-AUTH-01`, `CF-W1-SUB-01`, `CF-W1-UX-02`, `CF-W1-UX-05`, and `CF-W1-MD-01` without moving them to Ready.

Output should make it obvious whether any of the four near-ready candidates has exact allowed files, exact forbidden files, no shared/high-risk request, and no unresolved decision blocker.

## Scope

Allowed writes:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/**`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/**`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/**`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03*.md`

Forbidden writes:

- application source or tests
- Prisma schema or migrations
- route registries
- shared backend utilities
- shared UI
- package manifests
- generated files

## Branch / Worktree

Use shared `dev` for docs-only architecture work. If Team 00 later asks Team 03 to prepare implementation-adjacent review in isolation, use `codex/team03-architecture/{requirement-id}` and `../investment-scanner-worktrees/team03-{requirement-id}`.

## Blockers

`CF-W1-MD-02` source/schema work remains blocked by high-risk file gates. `CF-W1-UX-02` and `CF-W1-UX-05` policy is resolved, but architecture implementation scope still needs Copilot-only reservation refresh.

Decision reconciliation:

- No open Decision Inbox item remains.
- The five resolved decisions remove Product Owner blockers only; they do not authorize source/test work without Team 00 Ready promotion.

## Expected Outbox

Update `17-team-outboxes/TEAM-03-outbox.md` and `17-team-outboxes/TEAM-03-architecture-factory.md`.

---

# Latest Assignment Override

Date: 2026-05-18

## Assignment

Prepare architecture readiness for `CF-W1-STRAT-02` - Strategy Framework rule versioning and Data Quality gate policy.

This is docs-only architecture prep. Do not implement application code and do not reserve schema/package/generated/shared files as approved implementation scope. If the bounded slice truly needs Prisma/schema or generated type changes, document that as a blocker or split a future approval-gated child packet instead of treating it as Ready.

## Source Input

- Requirement draft: `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-STRAT-02-strategy-framework-rule-versioning-dq-gate-policy-requirement.md`
- Relevant module docs/source to inspect read-only:
  - `backend/src/modules/strategy-framework/strategy-framework.md`
  - `backend/src/modules/strategy-framework/strategy-framework.registry.ts`
  - `backend/src/modules/strategy-framework/strategy-framework.types.ts`
  - `backend/src/modules/strategy-framework/strategy-framework.service.ts`
  - `frontend/src/features/strategy-framework/components/StrategyFrameworkPage.tsx`
  - `frontend/src/features/strategy-framework/types.ts`

## Allowed Writes

- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-STRAT-02-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-STRAT-02-strategy-framework-rule-versioning-dq-gate-policy-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-STRAT-02-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/next-contracts-to-prepare.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-architecture-factory.md`

## Required Output

- Exact file-reservation recommendation for the smallest no-schema/no-shared first child if feasible.
- Explicit blocker if stable rule revisioning cannot be represented without Prisma/schema/generated/shared-contract changes.
- QA planning handoff notes for Team 04.
- A clear Ready recommendation: `Ready candidate`, `split required`, or `blocked`.

---

# Latest Assignment Override

Date: 2026-05-18

## Assignment

Prepare architecture readiness for `CF-W1-BT-02` - Backtesting outcome review traceability.

This is docs-only architecture prep. Do not implement application code. If the bounded slice requires Prisma/schema/generated/shared contract changes, document the blocker or split a future approval-gated child instead of marking it Ready.

## Source Input

- Requirement: `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-BT-02-backtesting-outcome-review-traceability-requirement.md`
- Relevant audit: `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/audit-backtesting-trade-risk.md`
- Relevant module docs/source to inspect read-only:
  - `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.md`
  - `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.ts`
  - `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.types.ts`
  - `frontend/src/features/backtesting-strategy-lab/components/BacktestingStrategyLabPage.tsx`

## Allowed Writes

- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-BT-02-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-BT-02-backtesting-outcome-review-traceability-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-BT-02-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/next-contracts-to-prepare.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-architecture-factory.md`

## Required Output

- Exact file-reservation recommendation for the smallest no-schema/no-shared first child if feasible.
- Explicit blocker if traceability needs Prisma/schema/generated/shared-route approval.
- QA planning handoff notes for Team 04.
- Ready recommendation: `Ready candidate`, `split required`, or `blocked`.

---

# Latest Assignment Override

Date: 2026-05-18

## Product Owner Priority Correction

Future architecture routing must prioritize direct investor/trader value before platform or Lane 3 convenience work:

- market data and Data Quality evidence;
- signals, strategy trust, calibration, backtesting, Trade Plan research support, historical context, market context, and research evidence;
- admin, settings, auth/subscription, notifications, and user-alert convenience work only when they block correctness, privacy, or user-data safety.

## Assignment

Refresh architecture readiness for `CF-W1-BT-02` - Backtesting outcome review traceability.

This is docs-only architecture prep. Do not implement application code. Treat this as the next active Team 03 handoff, superseding the older `CF-W1-DQ-02` tail assignment until `CF-W1-BT-02` refresh is complete.

## Source Input

- Requirement: `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-BT-02-backtesting-outcome-review-traceability-requirement.md`
- Existing architecture/contract/work-packet artifacts if present:
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-BT-02-architecture-review.md`
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-BT-02-backtesting-outcome-review-traceability-contract.md`
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-BT-02-work-packet.md`
- Relevant audit/source to inspect read-only:
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/audit-backtesting-trade-risk.md`
  - `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.md`
  - `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.ts`
  - `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.types.ts`
  - `frontend/src/features/backtesting-strategy-lab/components/BacktestingStrategyLabPage.tsx`

## Allowed Writes

- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-BT-02-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-BT-02-backtesting-outcome-review-traceability-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-BT-02-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/next-contracts-to-prepare.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-architecture-factory.md`

## Required Output

- Narrow the packet to the smallest no-schema/no-shared first child if feasible.
- Recommend exact implementation file reservations and forbidden files.
- Explicitly block any Prisma/schema/generated/shared-route/shared-UI/source-contract change.
- Provide QA planning handoff notes for Team 04.
- Return a clear Ready recommendation: `Ready candidate`, `split required`, or `blocked`.

---

# Current Active Assignment Override

Date: 2026-05-18

## Assignment

Relaunch the rolling Architecture Factory lane now. This is docs-only architecture prep, not implementation.

Prepare architecture readiness for `CF-W1-L3-TREV-02` - Today Review candidate snapshot provenance.

This item was already queued after `CF-W1-RH-01`. Team 03 completed `CF-W1-RH-01` architecture in commit `76a2c32`, so the architecture lane should continue instead of idling.

## Source Input

- Requirement: `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-L3-TREV-02-today-review-candidate-snapshot-provenance-requirement.md`
- Related Today Review docs:
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-L3-TREV-01-today-review-publication-evidence-requirement.md`
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-L3-TREV-01-architecture-review.md`
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-L3-TREV-01-today-review-publication-evidence-contract.md`
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-L3-TREV-01-work-packet.md`
- Relevant source/docs to inspect read-only:
  - `backend/src/modules/today-trade-review/today-trade-review.md`
  - `backend/src/modules/today-trade-review/today-trade-review.service.ts`
  - `backend/src/modules/today-trade-review/today-trade-review.types.ts`
  - `backend/tests/modules/today-trade-review/**`
  - `frontend/src/features/today-trade-review/**` read-only only if needed for future UI reservation notes

## Allowed Writes

- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-L3-TREV-02-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-L3-TREV-02-today-review-candidate-snapshot-provenance-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-L3-TREV-02-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/next-contracts-to-prepare.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-architecture-factory.md`

## Required Output

- Determine the smallest bounded first child for Today Review candidate-level provenance.
- Recommend exact allowed and forbidden future implementation files.
- Explicitly block Prisma/schema, route registry, shared utilities/UI, generated files, package manifests, provider/live-data, startup/backfill, paid/cloud, broker, telemetry, and broad UI work unless separately approved.
- Identify dependencies on `CF-W1-L3-TREV-01` without treating branch-only artifacts as merged into `dev`.
- Provide QA planning handoff notes for Team 04.
- Return one of: `Ready candidate`, `split required`, or `blocked`.

---

# Current Dispatcher Assignment

Date: 2026-05-18

## Assignment

Prepare architecture readiness for `CF-W1-SMI-01` - Smart Money evidence freshness and partial-trust framing.

This is docs-only architecture prep. Do not implement application code. Do not edit tests. Do not run providers, services, Prisma commands, builds, or UI smoke.

Team 00 is assigning this because higher-ranked candidates are either already active, accepted and parked, already split into blocked durable children, or currently being implemented by Team 06. `CF-W1-SMI-01` is an unassigned direct market-intelligence evidence item with plausible module-local first-slice potential.

## Source Input

- Requirement: `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-SMI-01-smart-money-evidence-freshness-partial-trust-requirement.md`
- Active priority queue:
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/next-top-10-candidates.md`
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/top-10-ready-candidates.md`
- Relevant source/docs to inspect read-only:
  - `backend/src/modules/smart-money-intelligence/smart-money-intelligence.md`
  - `backend/src/modules/smart-money-intelligence/smart-money-intelligence.service.ts`
  - `backend/src/modules/smart-money-intelligence/smart-money-intelligence.types.ts`
  - `backend/tests/modules/smart-money-intelligence/**`
  - `backend/src/modules/market-data-foundation/**` read-only only if needed for evidence provenance context
  - `backend/src/modules/data-quality-engine/**` read-only only if needed for downstream trust framing

## Allowed Writes

- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-SMI-01-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-SMI-01-smart-money-evidence-freshness-partial-trust-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-SMI-01-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/next-contracts-to-prepare.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-architecture-factory.md`

## Required Output

- Recommend the smallest module-local first child if feasible.
- Define exact allowed and forbidden future implementation files.
- Explicitly block schema, route registry, shared utility/UI, Market Data source changes, Data Quality source changes, provider/live-data, startup/backfill, packages, generated files, and frontend implementation unless separately approved.
- Preserve research-support language and avoid direct advice, target-price, guarantee, broker, or automation wording.
- Provide QA planning handoff notes for Team 04.
- Return one of: `Ready candidate`, `split required`, or `blocked`.

---

# Current Dispatcher Assignment

Date: 2026-05-18

## Assignment

Prepare architecture readiness for `CF-W1-RH-01` - Research Hub actionability evidence wiring.

This is docs-only architecture prep. Do not implement application code. Do not edit tests. Do not run providers, services, Prisma commands, builds, or UI smoke.

Team 00 is assigning this because Team 02 refined `CF-W1-RH-01` as the next top unassigned market-intelligence requirement, and `CF-W1-SMI-01` architecture has already been completed and routed to Team 04 QA planning.

## Source Input

- Requirement: `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-RH-01-research-hub-actionability-evidence-wiring-requirement.md`
- Current queue references:
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/next-top-10-candidates.md`
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/top-10-ready-candidates.md`
- Relevant source/docs to inspect read-only:
  - `backend/src/modules/research-hub/research-hub.md`
  - `backend/src/modules/research-hub/research-hub.service.ts`
  - `backend/src/modules/research-hub/research-hub.types.ts`
  - `backend/tests/modules/research-hub/**`
  - `frontend/src/features/research-hub/**` read-only as needed
  - accepted/active public-output docs for Today Review, Trade Plan, Signal Quality Lab, and Signal Calibration only as needed for dependency boundaries

## Allowed Writes

- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-RH-01-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-RH-01-research-hub-actionability-evidence-wiring-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-RH-01-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/next-contracts-to-prepare.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-architecture-factory.md`

## Required Output

- Determine the smallest bounded first child, preferably additive to Research Hub backend actionability fields.
- Recommend exact allowed and forbidden future implementation files.
- Explicitly block private upstream internals, fabricated trust scoring, schema, route registry, shared utility/UI, provider/live-data, startup/backfill, package/generated files, broad frontend redesign, and upstream module source edits unless separately approved.
- Identify dependency sequencing with `CF-W1-L3-TREV-01`, `CF-W1-TP-02`, `CF-W1-SQLAB-01`, and `CF-W1-CAL-01` without treating their branch commits as merged into `dev`.
- Provide QA planning handoff notes for Team 04.
- Return one of: `Ready candidate`, `split required`, or `blocked`.

---

# Current Active Assignment Override

Date: 2026-05-18

## Assignment

Prepare architecture readiness for `CF-W1-SIG-TRIGGER-02` - persisted trigger auditability follow-on.

This final override supersedes older Team 03 assignment tails above. Do not implement application code. This is docs-only architecture/contract/work-packet prep.

## Why This Item

Team 00 checked the higher-ranked unassigned candidates:

- `CF-W1-SQLAB-02` remains sequenced behind active no-schema `CF-W1-SQLAB-02A`.
- `CF-W1-STRAT-02` durable parent remains blocked after accepted `CF-W1-STRAT-02A` because durable rule history needs Prisma/schema/generated approval.
- `CF-W1-MD-02` remains ADR-only and not source-ready.

`CF-W1-SIG-TRIGGER-02` is the next independent high-investor-value candidate that needs architecture split/readiness work.

## Source Input

- Requirement: `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-SIG-TRIGGER-02-persisted-trigger-auditability-requirement.md`
- Related completed/active context:
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-SIG-TRIGGER-01-full-trigger-object-contract-requirement.md`
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/09-summaries/CF-W1-SIG-TRIGGER-01-po-acceptance-packet.md`
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/audit-strategy-signal-rules.md`
  - `backend/src/modules/signal-generation-engine/signal-generation-engine.md`
  - `backend/src/modules/signal-generation-engine/signal-generation-engine.service.ts`
  - `backend/src/modules/signal-generation-engine/signal-generation-engine.types.ts`
  - `backend/src/modules/signal-generation-engine/signal-generation-engine.repository.ts`
  - `backend/tests/modules/signal-generation-engine/**`
  - downstream docs/source read-only only if needed to understand consumer risk

## Allowed Writes

- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-SIG-TRIGGER-02-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-SIG-TRIGGER-02-persisted-trigger-auditability-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-SIG-TRIGGER-02-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/next-contracts-to-prepare.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-architecture-factory.md`

## Required Output

- Determine whether there is a bounded no-schema/no-shared first child for better trigger auditability inside `signal-generation-engine`.
- If schema/shared/downstream adoption is required, mark split/blocker clearly; do not present it as Ready.
- Recommend exact file reservations for any feasible first child.
- List forbidden files explicitly, including Prisma/schema/migrations, route registries, shared utilities/UI, packages, generated files, Strategy Decision, Today Review, Trade Plan, Alerts, Portfolio, Watchlists, Copilot, providers, live data, paid/cloud, broker, and telemetry.
- Preserve no-advice/no-target research-support language.
- Provide Team 04 QA planning handoff notes.
- Return one of: `Ready candidate`, `split required`, or `blocked`.

---

# Latest Assignment Override

Date: 2026-05-18

## Product Owner Priority Correction

This final override supersedes older architecture assignment tails above.

Prioritize direct investor/trader value before platform, admin, notification, or alert convenience work:

- market data and Data Quality evidence;
- signals, strategy trust, calibration, backtesting, Trade Plan research support, historical context, market context, and research evidence;
- admin, settings, auth/subscription, notifications, and user-alert convenience work only when they block correctness, privacy, user-data safety, or an already accepted branch gate.

## Assignment

Prepare architecture readiness for `CF-W1-DQ-02` - Data Quality currentness evidence and market-session-aware fail-closed behavior.

This is docs-only architecture prep. Do not implement application code. Do not edit tests. Do not run providers, services, Prisma commands, builds, or UI smoke.

## Source Input

- Requirement: `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-DQ-02-dq-currentness-evidence-requirement.md`
- Existing artifacts:
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-DQ-02-architecture-review.md`
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-DQ-02-dq-currentness-evidence-contract.md`
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-DQ-02-work-packet.md`
- Relevant audit/context:
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/audit-market-data-data-quality.md`
  - `backend/src/modules/data-quality-engine/data-quality-engine.md`
  - `backend/src/modules/data-quality-engine/data-quality-engine.service.ts`
  - `backend/src/modules/data-quality-engine/data-quality-engine.types.ts`
  - `backend/tests/modules/data-quality-engine/**` read-only as needed
  - `backend/src/modules/market-data-foundation/**` read-only as needed

## Allowed Writes

- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-DQ-02-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-DQ-02-dq-currentness-evidence-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-DQ-02-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/next-contracts-to-prepare.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-architecture-factory.md`

## Required Output

- Exact file-reservation recommendation for the smallest module-local first child if feasible.
- Explicit blocker if market-session-aware currentness requires shared Market Data source/helpers, Prisma schema, migrations, generated files, route registry changes, broad DQE public-contract changes, providers, startup/backfill, live-provider, package changes, or shared backend utilities.
- QA planning handoff notes for Team 04.
- Clear Ready recommendation: `Ready candidate`, `split required`, or `blocked`.

---

# Latest Assignment Override

Date: 2026-05-18

## Product Owner Priority Correction

This final override supersedes older assignment tails above.

Prioritize direct investor/trader value before platform or Lane 3 convenience work:

- market data and Data Quality evidence;
- signals, strategy trust, calibration, backtesting, Trade Plan research support, historical context, market context, and research evidence;
- admin, settings, auth/subscription, notifications, and user-alert convenience work only when they block correctness, privacy, or user-data safety.

## Assignment

Prepare architecture readiness for `CF-W1-MCTX-01` - Market Context regime evidence and partial-context framing.

This is docs-only architecture prep. Do not implement application code. Do not edit tests. Do not run providers, services, Prisma commands, builds, or UI smoke.

## Source Input

- Requirement: `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-MCTX-01-market-context-regime-evidence-requirement.md`
- Active priority queue:
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/next-top-10-candidates.md`
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/top-10-ready-candidates.md`
- Relevant audit/context:
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/audit-market-data-data-quality.md`
  - `backend/src/modules/market-context-intelligence/market-context-intelligence.md`
  - `backend/src/modules/market-context-intelligence/market-context-intelligence.service.ts`
  - `backend/src/modules/market-context-intelligence/market-context-intelligence.types.ts`
  - `backend/tests/modules/market-context-intelligence/**` read-only as needed
  - `frontend/src/features/market-context-intelligence/**` read-only as needed

## Allowed Writes

- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-MCTX-01-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-MCTX-01-market-context-regime-evidence-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-MCTX-01-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/next-contracts-to-prepare.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-architecture-factory.md`

## Required Output

- Exact file-reservation recommendation for the smallest module-local first child if feasible.
- Explicit blocker if regime-evidence clarity requires Prisma/schema, route registry, generated files, shared helpers, provider/live data, package changes, Market Data source changes, DQE source changes, frontend route/shared UI changes, or broad UX work.
- QA planning handoff notes for Team 04.
- Ready recommendation: `Ready candidate`, `split required`, or `blocked`.

---

# Latest Assignment Override

Date: 2026-05-18

## Assignment

Refresh architecture readiness for `CF-W1-HCTX-01` - Historical Context explainability.

This assignment follows the Team 02 market-intelligence priority refresh: `CF-W1-HCTX-01` is the next top unassigned item after `CF-W1-BT-02`.

This is docs-only architecture prep. Do not implement application code. Refresh the existing HCTX artifacts to ensure the first child is backend-first, additive, no-schema, no-route, and safe for downstream consumers such as calibration.

## Source Input

- Requirement: `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-HCTX-01-historical-context-explainability-requirement.md`
- Existing architecture/contract/work packet:
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-HCTX-01-architecture-review.md`
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-HCTX-01-historical-context-explainability-contract.md`
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-HCTX-01-work-packet.md`
- Relevant source to inspect read-only:
  - `backend/src/modules/historical-context-snapshots/historical-context-snapshots.md`
  - `backend/src/modules/historical-context-snapshots/historical-context-snapshots.service.ts`
  - `backend/src/modules/historical-context-snapshots/historical-context-snapshots.types.ts`
  - `backend/tests/modules/historical-context-snapshots/**`
  - `frontend/src/features/historical-context-snapshots/**` only if needed for future UI reservation notes

## Allowed Writes

- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-HCTX-01-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-HCTX-01-historical-context-explainability-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-HCTX-01-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/next-contracts-to-prepare.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-architecture-factory.md`

## Required Output

- Recommend the smallest backend-first first child if feasible.
- Define exact allowed/forbidden future implementation files.
- Explicitly block schema, route registry, shared utility/UI, Market Context source, Smart Money source, Signal Calibration source, providers, package/generated files, and frontend implementation unless separately approved.
- Provide QA planning handoff notes for Team 04.
- Return a clear Ready recommendation: `Ready candidate`, `split required`, or `blocked`.

---

# Latest Assignment Override

Date: 2026-05-18

## Assignment

Prepare architecture readiness for `CF-W1-L3-INTEL-03` - Portfolio Intelligence concentration review.

This is docs-only architecture prep. Do not implement application code. The first slice should stay bounded to deterministic concentration review over existing Portfolio Intelligence allocation/review data. If implementation needs optimizer/rebalance behavior, Prisma/schema, route registry, shared UI, portfolio-management source changes, or broad frontend navigation changes, document that blocker or split a future approval-gated child instead of marking it Ready.

## Source Input

- Requirement: `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-L3-INTEL-03-portfolio-intelligence-concentration-review-requirement.md`
- Relevant audit/context:
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/audit-portfolio-watchlist-alerts.md`
  - `backend/src/modules/portfolio-intelligence/portfolio-intelligence.md`
  - `backend/src/modules/portfolio-intelligence/portfolio-intelligence.service.ts`
  - `backend/src/modules/portfolio-intelligence/portfolio-intelligence.types.ts`
  - `frontend/src/features/portfolio-intelligence/**` read-only as needed

## Allowed Writes

- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-L3-INTEL-03-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-L3-INTEL-03-portfolio-intelligence-concentration-review-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-L3-INTEL-03-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/next-contracts-to-prepare.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-architecture-factory.md`

## Required Output

- Exact file-reservation recommendation for the smallest module-local first child if feasible.
- Explicit blocker if concentration review requires schema, route, shared UI, optimizer/rebalance logic, portfolio-management source, or broad frontend changes.
- QA planning handoff notes for Team 04.
- Ready recommendation: `Ready candidate`, `split required`, or `blocked`.

---

# Latest Assignment Override

Date: 2026-05-18

## Assignment

Prepare architecture readiness for `CF-W1-DQ-02` - Data Quality currentness evidence and market-session-aware fail-closed behavior.

This is docs-only architecture prep. Do not implement application code. If the bounded slice requires shared Market Data helper changes, Prisma/schema/generated changes, route-registry changes, or DQE public contract changes, document that blocker or split a future approval-gated child instead of marking it Ready.

## Source Input

- Requirement: `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-DQ-02-dq-currentness-evidence-requirement.md`
- Existing audit/context:
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/audit-market-data-data-quality.md`
  - `backend/src/modules/data-quality-engine/data-quality-engine.md`
  - `backend/src/modules/data-quality-engine/data-quality-engine.service.ts`
  - `backend/src/modules/data-quality-engine/data-quality-engine.types.ts`
  - `backend/src/modules/market-data-foundation/**` read-only as needed

## Allowed Writes

- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-DQ-02-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-DQ-02-dq-currentness-evidence-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-DQ-02-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/next-contracts-to-prepare.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-architecture-factory.md`

## Required Output

- Exact file-reservation recommendation for the smallest module-local first child if feasible.
- Explicit blocker if market-session-aware currentness requires shared Market Data source/helpers, schema, route, generated, or broad DQE public-contract changes.
- QA planning handoff notes for Team 04.
- Ready recommendation: `Ready candidate`, `split required`, or `blocked`.

---

# Latest Assignment Override

Date: 2026-05-18

## Product Owner Priority Correction

This final override supersedes the older DQ and Lane 3 assignment tails above.

Prioritize direct investor/trader value before platform or Lane 3 convenience work:

- market data and Data Quality evidence;
- signals, strategy trust, calibration, backtesting, Trade Plan research support, historical context, market context, and research evidence;
- admin, settings, auth/subscription, notifications, and user-alert convenience work only when they block correctness, privacy, or user-data safety.

## Assignment

Refresh architecture readiness for `CF-W1-BT-02` - Backtesting outcome review traceability.

This is docs-only architecture prep. Do not implement application code.

## Source Input

- Requirement: `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-BT-02-backtesting-outcome-review-traceability-requirement.md`
- Existing architecture/contract/work-packet artifacts if present:
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-BT-02-architecture-review.md`
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-BT-02-backtesting-outcome-review-traceability-contract.md`
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-BT-02-work-packet.md`
- Relevant audit/source to inspect read-only:
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/audit-backtesting-trade-risk.md`
  - `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.md`
  - `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.ts`
  - `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.types.ts`
  - `frontend/src/features/backtesting-strategy-lab/components/BacktestingStrategyLabPage.tsx`

## Allowed Writes

- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-BT-02-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-BT-02-backtesting-outcome-review-traceability-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-BT-02-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/next-contracts-to-prepare.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-architecture-factory.md`

## Required Output

- Narrow the packet to the smallest no-schema/no-shared first child if feasible.
- Recommend exact implementation file reservations and forbidden files.
- Explicitly block any Prisma/schema/generated/shared-route/shared-UI/source-contract change.
- Provide QA planning handoff notes for Team 04.
- Return a clear Ready recommendation: `Ready candidate`, `split required`, or `blocked`.
