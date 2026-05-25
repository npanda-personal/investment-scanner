# TEAM-03 Current Assignment

Date: 2026-05-18

Team: TEAM-03 - Architecture Factory

Prompt file: `docs/execution/codex-parallel-execution-plan-2026-05-16/15-automation-prompts/AUTO-03-architecture-factory.md`

## Latest Assignment Override - 2026-05-25 CAL-02 Calibration Evidence Basis

Prepare docs-only architecture readiness for `CF-W2-CAL-02` Signal Calibration evidence freshness and scope basis.

This follows Team 02's fresh direct-value requirement discovery. Do not implement application code. Do not move the item to Ready. Determine whether the first child can stay additive and bounded without schema, route registry, shared UI, package/generated, provider/live, startup/backfill, or broad UI scope.

Goal:

- Define the smallest bounded Signal Calibration child that exposes truthful scoped evidence basis for selected `region`, `assetType`, and `horizon`.
- Prefer reuse of existing Signal Quality public outputs such as generated time, latest measurable price date, next evaluable date, and horizon availability.
- Distinguish calibration row generation time from evidence-through time.
- Replace frontend first-row proxy / unscoped health overclaiming with a truthful scoped aggregate contract if feasible.
- Stop and report a consent blocker only if honest implementation requires schema/storage, route registry, shared UI, package/generated, provider/live, startup/backfill, or broad UI scope.

Allowed writes:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W2-CAL-02-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W2-CAL-02-signal-calibration-evidence-basis-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W2-CAL-02-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/next-contracts-to-prepare.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-architecture-factory.md`

Read-only inputs:

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W2-CAL-02-signal-calibration-evidence-freshness-and-scope-basis-requirement.md`
- `backend/src/modules/signal-calibration-engine/**`
- `backend/tests/modules/signal-calibration-engine/**`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.types.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.service.ts`
- `frontend/src/features/signal-calibration-engine/**`

Forbidden writes:

- application source or tests
- Prisma schema or migrations
- route registries
- shared backend utilities
- shared UI
- package manifests
- generated files
- provider/live/startup/backfill files
- Today Review, DQ, Market Data, Signal Quality, Backtesting, Pipeline Ops, or other module source/tests

Required output:

- Architecture recommendation: `Ready candidate after QA`, `split required`, or `consent blocker`.
- Exact allowed/forbidden file reservation if a bounded additive child is viable.
- QA handoff notes for scoped health, evidence-through date, horizon-limited evidence, missing Signal Quality evidence, mixed-row page states, and frontend no-first-row-proxy behavior.
- Stop condition if schema/storage, route widening, shared UI, or broader cross-module implementation is required.

## Latest Assignment Override - 2026-05-25 DQ Residual Read-Side Packet

Prepare docs-only architecture readiness for the residual `CF-W1-DQ-02` read-side/public-contract reconstruction packet.

This assignment follows Team 02's product decision in `10-requirements/CF-W1-DQ-02-residual-read-side-currentness-requirement.md`: use read-time reconstruction as the default path, not durable persisted currentness fields. Do not open implementation or mark the item Ready unless the architecture, QA handoff, and exact file reservations are complete.

Goal:

- Define the smallest bounded DQE read-side/public-contract packet that gives `summary`, `list`, `diagnostics`, and latest-evaluation helper reads one truthful currentness story.
- Prefer read-time reconstruction from authoritative current evidence and existing module-owned inputs.
- Stop and report a true consent blocker only if truthful or performant reconstruction requires Prisma/schema/migration/generated changes, route registry changes, shared helpers, provider/live behavior, startup/backfill behavior, package changes, or broad frontend/UI work.
- Keep `CF-W2-TSC-05A` as the active implementation priority; this is parallel architecture prep only.

Allowed writes:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-DQ-02-read-side-currentness-architecture.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-DQ-02-read-side-currentness-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-DQ-02-read-side-currentness-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/next-contracts-to-prepare.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-architecture-factory.md`

Read-only source inspection:

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-DQ-02-residual-read-side-currentness-requirement.md`
- existing `CF-W1-DQ-02` requirement/architecture/contract/work-packet docs
- `backend/src/modules/data-quality-engine/data-quality-engine.repository.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.service.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.types.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.md`
- focused DQE tests read-only as needed
- Market Data Foundation docs/source read-only only to confirm current evidence ownership

Forbidden writes:

- application source or tests
- Prisma schema or migrations
- route registries
- shared backend utilities
- shared UI
- package manifests
- generated files
- provider/live/startup/backfill files
- frontend files

Required output:

- Architecture recommendation: `Ready candidate after QA`, `split required`, or `consent blocker`.
- Exact allowed/forbidden file reservation if a bounded read-time reconstruction child is viable.
- Explicit stop condition if durable persisted currentness or schema/storage becomes required.
- QA handoff notes for cross-surface consistency, stale/current/session-unavailable/provider-gap cases, and fail-closed behavior.

## Latest Assignment Override - 2026-05-24 Trusted Signal Candidate Dependency

Prepare docs-only architecture readiness for `CF-W1-SIG-TRIGGER-ENTRY-01`.

Goal:

- Determine whether Signal Generation can expose source-proven rule-triggered entry price, trigger timestamp, and rule provenance through a bounded no-schema/no-route/no-shared-file child.
- If current source cannot prove those fields without Prisma/schema, route registry, shared utility, generated type, repository persistence, provider/live, startup/backfill, or package changes, record the exact blocker instead of marking the child Ready.
- Keep `CF-W1-TSC-01A` out of Ready until this upstream evidence is source-proven.

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

Required output:

- Architecture recommendation: `Ready candidate`, `split required`, or `blocked`.
- Exact allowed/forbidden file reservation only if a no-schema/no-route child is viable.
- QA handoff notes for rejecting invented entry price, target/R:R leakage, and direct advice wording.

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

## Assignment

Prepare architecture readiness for `CF-W1-STRAT-03` - Strategy Decision review provenance.

This is docs-only architecture prep. The intended first child is backend-local, additive, no-schema, and no-route. Do not force a Ready recommendation if source inspection proves that schema, generated artifacts, route registry, shared utility/UI, or frontend scope is required.

## Source Input

- Requirement: `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-STRAT-03-strategy-decision-review-provenance-requirement.md`
- Current ranked stack: `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/next-top-10-candidates.md`
- Relevant source to inspect read-only:
  - `backend/src/modules/strategy-decision-engine/strategy-decision-engine.service.ts`
  - `backend/src/modules/strategy-decision-engine/strategy-decision-engine.types.ts`
  - `backend/src/modules/strategy-decision-engine/strategy-decision-engine.md`
  - `backend/tests/modules/strategy-decision-engine/strategy-decision-engine.service.test.ts`
  - optional route-test inspection only if needed: `backend/tests/modules/strategy-decision-engine/strategy-decision-engine.routes.test.ts`

## Allowed Writes

- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-STRAT-03-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-STRAT-03-strategy-decision-review-provenance-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-STRAT-03-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-architecture-factory.md`

## Required Output

- Exact allowed and forbidden future implementation files.
- One-writer and parallel-safety notes against active `CF-W1-BT-01A`.
- QA handoff notes for Team 04.
- Ready recommendation: `Ready candidate`, `split required`, or `blocked`.

---

# Current Dispatcher Assignment

Date: 2026-05-18

## Assignment

Prepare architecture readiness for `CF-W1-STRAT-02B` - Strategy Framework durable revision history.

This is docs-only architecture prep. Do not implement application code. Treat this as approval-gated until proven otherwise because Team 02 expects likely Prisma/schema, generated artifact, and repository mapping impact.

## Source Input

- Requirement: `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-STRAT-02B-strategy-definition-durable-revision-history-requirement.md`
- Parent lineage:
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-STRAT-02-strategy-framework-rule-versioning-dq-gate-policy-requirement.md`
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-STRAT-02-architecture-review.md`
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-STRAT-02-strategy-framework-rule-versioning-dq-gate-policy-contract.md`
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-STRAT-02-work-packet.md`
- Relevant source/docs to inspect read-only:
  - `backend/src/modules/strategy-framework/strategy-framework.md`
  - `backend/src/modules/strategy-framework/strategy-framework.registry.ts`
  - `backend/src/modules/strategy-framework/strategy-framework.repository.ts`
  - `backend/src/modules/strategy-framework/strategy-framework.service.ts`
  - `backend/src/modules/strategy-framework/strategy-framework.types.ts`
  - `backend/tests/modules/strategy-framework/**` as needed
  - `backend/prisma/schema.prisma` read-only only for impact analysis

## Allowed Writes

- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-STRAT-02B-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-STRAT-02B-durable-revision-history-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-STRAT-02B-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/next-contracts-to-prepare.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-architecture-factory.md`

## Required Output

- Determine whether any no-schema/no-generated first child exists; if not, say so clearly.
- If schema/generated/repository work is needed, define the exact future consent gate and split into later implementation children.
- Keep `CF-W1-STRAT-02A` closed; do not reopen evaluator math, proof-status semantics, route changes, shared UI, or duplicate DQ logic.
- Recommend exact future file reservations only as proposed, not approved.
- Provide Team 04 QA handoff notes for proposal review.
- Return one of: `proposal packet ready`, `split required`, or `blocked`.

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

# Current Active Assignment Override

Date: 2026-05-18

## Assignment

Prepare architecture readiness for `CF-W1-MD-03` - Market Data signoff threshold contract enforcement.

This is docs-only architecture prep. Do not implement application code. Do not edit tests. Do not run providers, services, Prisma commands, builds, UI smoke, or live data.

## Why This Item

Team 02 added `CF-W1-MD-03` as the next top unassigned upstream market-data requirement. Team 03 completed `CF-W1-RH-02A` architecture, and `RH-02A` is now queued for Team 04 QA planning behind active Team 04 work. `CF-W1-MD-03` is independent of active Research Hub and Smart Money writers.

## Source Input

- Requirement: `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-MD-03-market-data-signoff-threshold-contract-requirement.md`
- Readiness contract: `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/market-data-dq-readiness-contract.md`
- Relevant audits:
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/audit-market-data-data-quality.md`
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/TEAM-05-market-data-data-quality-domain-audit-2026-05-17.md`
- Relevant source/docs to inspect read-only:
  - `backend/src/modules/market-data-foundation/market-data-foundation.md`
  - `backend/src/modules/market-data-foundation/**` read-only as needed
  - `backend/tests/modules/market-data-foundation/**` read-only as needed

## Allowed Writes

- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-MD-03-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-MD-03-market-data-signoff-threshold-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-MD-03-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/next-contracts-to-prepare.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-architecture-factory.md`

## Required Output

- Determine the smallest bounded first child for enforcing/explaining existing `95%` price-ready and `90%` metadata-ready signoff thresholds.
- Recommend exact allowed and forbidden future implementation files.
- Keep the packet separate from `CF-W1-MD-02A` durable evidence/schema proposal work.
- Explicitly block Prisma/schema, durable storage, provider/startup redesign, route changes, shared utilities/UI, package manifests, generated files, frontend/UI implementation, DQE implementation, paid/cloud, broker, telemetry, and broad universe-state rewrite unless separately approved.
- Provide QA planning handoff notes for Team 04.
- Return one of: `Ready candidate`, `split required`, or `blocked`.

---

# Current Active Assignment Override

Date: 2026-05-18

## Assignment

Prepare architecture readiness for `CF-W1-MD-02A` - additive companion durable evidence schema packet.

This is docs-only architecture prep. It must produce a proposal/contract packet only. Do not implement application code and do not edit Prisma/schema, migrations, generated files, repositories, services, providers, startup/backfill, route registries, shared utilities/UI, package manifests, or tests.

## Why This Item

Team 02 refined `CF-W1-MD-02` into a parent-only ADR and added `CF-W1-MD-02A` as the next top unassigned upstream market-data evidence requirement. The accepted ADR direction exists, but future schema/source work remains a true consent blocker. This Team 03 pass should make that boundary exact without crossing it.

## Source Input

- Requirement: `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-MD-02A-additive-companion-evidence-schema-packet-requirement.md`
- Parent requirement: `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-MD-02-durable-market-data-readiness-evidence-requirement.md`
- ADR: `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-MD-02-durable-readiness-evidence-adr.md`
- Parent contract: `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-MD-02-durable-readiness-evidence-contract.md`
- Parent QA plan: `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-MD-02-qa-plan.md`
- Parent work packet: `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-MD-02-work-packet.md`
- Relevant source/docs to inspect read-only:
  - `backend/src/modules/market-data-foundation/market-data-foundation.md`
  - `backend/src/modules/market-data-foundation/**` read-only as needed
  - `backend/src/modules/data-quality-engine/**` read-only as needed for handoff boundary only

## Allowed Writes

- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-MD-02A-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-MD-02A-additive-companion-evidence-schema-packet-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-MD-02A-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/next-contracts-to-prepare.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-architecture-factory.md`

## Required Output

- A proposal-only architecture packet with exact future schema/migration/generation blockers.
- Explicit minimum natural key and durable evidence fields, aligned to the accepted ADR direction.
- Exact split between `MD-02A` proposal work and later `MD-02B/C/D` implementation packets.
- Explicit rejection if source, Prisma/schema, migrations, generated files, repository/service, provider/live-data, startup/backfill, DQE handoff implementation, downstream adoption, UI, shared utility/UI, package, paid/cloud, broker, or telemetry work is required in this pass.
- QA planning handoff notes for Team 04.
- Return one of: `proposal packet ready`, `split required`, or `blocked`.

---

# Current Active Assignment Override

Date: 2026-05-18

## Assignment

Prepare architecture readiness for `CF-W1-RH-02A` - Research Hub what-changed fail-closed comparison-basis semantics.

This is docs-only architecture prep. Do not implement application code. Do not run tests, builds, services, providers, Prisma commands, UI smoke, or live data.

## Why This Item

Team 03 completed `CF-W1-MD-02A` as a proposal-only packet. Team 04 QA review for `MD-02A` is queued behind the current Team 04 main-workspace writer. The next independent architecture candidate from Team 02's ranked stack is `CF-W1-RH-02A`.

## Source Input

- Requirement: `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-RH-02A-research-hub-what-changed-fail-closed-basis-requirement.md`
- Parent requirement: `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-RH-02-research-hub-what-changed-traceability-requirement.md`
- Related Research Hub actionability packet:
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-RH-01-architecture-review.md`
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-RH-01-research-hub-actionability-evidence-wiring-contract.md`
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-RH-01-work-packet.md`
- Relevant source/docs to inspect read-only:
  - `backend/src/modules/research-hub/research-hub.md`
  - `backend/src/modules/research-hub/research-hub.service.ts`
  - `backend/src/modules/research-hub/research-hub.types.ts`
  - `backend/tests/modules/research-hub/**`
  - `frontend/src/features/research-hub/**` read-only only if needed for future UI reservation notes

## Allowed Writes

- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-RH-02A-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-RH-02A-research-hub-what-changed-fail-closed-basis-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-RH-02A-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/next-contracts-to-prepare.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-architecture-factory.md`

## Required Output

- Determine whether a bounded no-schema first child can make `whatChanged` fail closed when no comparison basis exists.
- Recommend exact allowed and forbidden future implementation files.
- Explicitly block scheduler/journal storage, Prisma/schema, migrations, generated files, route changes, shared utilities/UI, package manifests, upstream module source edits, provider/live-data, startup/backfill, paid/cloud, broker, telemetry, and broad UI redesign unless separately approved.
- Identify sequencing with `CF-W1-RH-01` so Team 00 can avoid one-writer conflicts in `research-hub` source/tests.
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
