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
