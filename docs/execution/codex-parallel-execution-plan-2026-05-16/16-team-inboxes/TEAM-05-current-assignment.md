# TEAM-05 Current Assignment

Date: 2026-05-18

Team: TEAM-05 - Market Data / Data Quality

Prompt file: `docs/execution/codex-parallel-execution-plan-2026-05-16/15-automation-prompts/AUTO-05-market-data-data-quality.md`

## Assignment

Pull `CF-W1-MD-01` as a narrowed, backend-only Market Data validator implementation slice.

Branch/worktree:

- Branch: `codex/team05-market-data/CF-W1-MD-01`
- Worktree: `../investment-scanner-worktrees/team05-CF-W1-MD-01`

Ready evidence:

- Requirement: `10-requirements/CF-W1-MD-01-market-data-validation-hardening-policy-requirement.md`
- Narrowed architecture contract: `06-contracts/CF-W1-MD-01-market-data-validation-hardening-contract.md`
- Work packet: `08-work-packets/CF-W1-MD-01-work-packet.md`
- QA plan: `04-qa/CF-W1-MD-01-qa-plan.md`
- Team 05 readiness inspection: `17-team-outboxes/TEAM-05-outbox.md`

Required implementation behavior:

- reject future-dated candles using validator-local, backward-compatible boundary behavior;
- reject invalid present `adjustedClose` values;
- keep negative volume invalid;
- preserve duplicate-row determinism;
- keep spike rejection opt-in and off by default;
- update module docs to record the narrowed validator-only behavior.

Explicitly deferred:

- missing `adjustedClose` fallback/incomplete evidence;
- zero/suspicious-volume warning/readiness evidence;
- repository/provider/startup plumbing for a formal latest-session boundary;
- durable readiness storage or `CF-W1-MD-02` natural-key work.

## Scope

Allowed writes:

- `backend/src/modules/market-data-foundation/market-data-foundation.validation.ts`
- `backend/tests/modules/market-data-foundation/market-data.validation.test.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-05-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-MD-01-developer-handoff.md`

Forbidden:

- Market Data repository, provider, adapter, Angel One provider, service, scheduler, worker, queue, router, controller, and types files
- Market Data readiness/storage invariant tests
- Data Quality Engine source or tests
- Prisma schema or migrations
- generated types
- providers, live providers, Angel One, startup/backfill, repair/sync jobs
- route registries, shared utilities, packages, frontend/UI

## Branch / Worktree

Use the dedicated branch/worktree above. Do not work in the shared `dev` workspace.

## Blockers

No Product Owner decision blocker remains for this narrowed child. Stop and return to Team 00 if implementation needs any forbidden file, repository/provider plumbing, warning/evidence semantics, schema, route, shared utility, package, generated, provider/live, startup/backfill, frontend, or DQE changes.

## Expected Outbox

Update `17-team-outboxes/TEAM-05-outbox.md` and create `18-integration-queue/CF-W1-MD-01-developer-handoff.md`.

Required validation target:

```powershell
cd backend
npm.cmd test -- market-data.validation.test.ts --runInBand
npm.cmd run build
```
# TEAM-05 Current Assignment

Date: 2026-05-18

Team: TEAM-05 - Market Data / Data Quality

Prompt file: `docs/execution/codex-parallel-execution-plan-2026-05-16/15-automation-prompts/AUTO-05-market-data-data-quality.md`

## Assignment

Implement `CF-W1-DQ-02A` in a dedicated Team 05 worktree after Team 00 Ready promotion.

## Branch / Worktree

- Branch: `codex/team05-market-data/CF-W1-DQ-02A`
- Worktree: `C:\work\repo\investment-scanner-worktrees\team05-CF-W1-DQ-02A`

## Allowed Files

- `backend/src/modules/data-quality-engine/data-quality-engine.service.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.types.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.md`
- `backend/tests/modules/data-quality-engine/data-quality-engine.service.test.ts`
- `backend/tests/modules/data-quality-engine/data-quality-engine.invariants.test.ts`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-05-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-DQ-02A-developer-handoff.md`

## Forbidden Files

- all `backend/src/modules/market-data-foundation/**` source files
- `backend/src/modules/data-quality-engine/data-quality-engine.repository.ts`
- DQE controller, router, validation, or index files
- Prisma schema or migrations
- route registries
- shared backend utilities or shared UI
- package manifests
- generated files
- frontend files
- provider, startup, backfill, live-provider, paid/cloud, broker, telemetry, or broad repair/sync flows

## Required Behavior

- Add additive market-session-aware currentness evidence inside Data Quality Engine only.
- Consume existing Market Data public session helpers; do not edit Market Data source.
- Preserve existing DQ score/status/gap/blocker fields.
- Fail closed for stale, missing, blocked, provider-gap, or session-unavailable currentness outcomes.
- Preserve `filterEligibleInstruments()` strict exclusion behavior for non-current instruments.
- Keep repository/list/summary/diagnostics persistence exposure out of scope.

## Focused Validation

```powershell
cd backend
npm.cmd test -- data-quality-engine.service.test.ts data-quality-engine.invariants.test.ts --runInBand
npm.cmd run build
```

Optional read-only reassurance if useful and resource-safe:

```powershell
cd backend
npm.cmd test -- market-data.market-session.test.ts --runInBand
```

## Next Gate

Return developer handoff to Team 00 for Team 04 QA, Team 10 review, Architect Signoff, delegated PO acceptance, and scoped local commit.

---

# Latest Assignment Override

Date: 2026-05-18

## Assignment

Implement `CF-W1-HCTX-01` in a dedicated Team 05 worktree.

This override supersedes older Team 05 tails. The Product Owner priority correction puts market-data, Data Quality, signals, backtests, calibration, historical context, market context, and research evidence ahead of admin/settings/auth/subscription/notifications and alert convenience work.

Do not implement in the shared `dev` workspace.

## Branch / Worktree

- Branch: `codex/team05-market-data/CF-W1-HCTX-01`
- Worktree: `C:\work\repo\investment-scanner-worktrees\team05-CF-W1-HCTX-01`

## Gate Evidence

- Requirement: `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-HCTX-01-historical-context-explainability-requirement.md`
- Architecture review: `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-HCTX-01-architecture-review.md`
- Contract: `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-HCTX-01-historical-context-explainability-contract.md`
- Work packet: `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-HCTX-01-work-packet.md`
- QA plan: `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-HCTX-01-qa-plan.md`
- Ready handoff: `docs/execution/codex-parallel-execution-plan-2026-05-16/12-ready-queue/ready-for-implementation.md`

## Allowed Files

- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.service.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.types.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.md`
- `backend/tests/modules/historical-context-snapshots/historical-context-snapshots.service.test.ts`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-05-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-HCTX-01-developer-handoff.md`

## Forbidden Files

- Prisma schema or migrations
- generated files
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.repository.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.controller.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.router.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.validation.ts`
- `backend/src/modules/historical-context-snapshots/index.ts`
- backend or frontend route registries
- `backend/src/modules/market-context-intelligence/**`
- `backend/src/modules/smart-money-intelligence/**`
- `backend/src/modules/market-data-foundation/**`
- `backend/src/modules/signal-calibration-engine/**`
- shared backend utilities or shared DTOs
- shared frontend components
- frontend source or tests
- package manifests
- providers, startup/backfill, live-provider, Angel One, broker, paid/cloud, telemetry, or automation flows

## Required Behavior

- Add additive lookup explainability metadata for market, sector, country, smart-money, and data-quality selection evidence.
- Distinguish `PERSISTED_EXACT_DATE`, `PERSISTED_NEAREST_PRIOR_DATE`, `MISSING_WITHIN_LOOKBACK`, `METADATA_GAP_INPUT`, and `NOT_REQUESTED`.
- Include requested date, lookback days, region, asset type, selected snapshot date, lag days, per-slice source, top-level selected nearest snapshot date, max lag, partial flag, and concise research-support summary.
- Preserve current lookup fields, route/query behavior, `dataStatus`, and `gaps[]`.
- Do not add a second repository search to distinguish never-generated from older-than-lookback evidence; bounded absence is `MISSING_WITHIN_LOOKBACK`.
- Do not edit upstream producers or downstream consumers in this slice.

## Focused Validation

```powershell
cd backend
npm.cmd test -- historical-context-snapshots.service.test.ts --runInBand
npm.cmd run build
```

## Stop Conditions

Return to Team 00 without implementing further if the slice needs any forbidden file, route/schema/package/generated/shared/frontend/provider/startup/live scope, upstream Market Context / Smart Money / Market Data / Signal Calibration source changes, or a semantic rewrite of nearest-snapshot lookup.

## Expected Output

Write:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-05-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-HCTX-01-developer-handoff.md`

Do not commit. Team 00 handles QA, review, Architect Signoff, delegated PO acceptance, scoped local commit, and later integration.

---

# Current Dispatcher Assignment

Date: 2026-05-18

## Assignment

Implement `CF-W1-MCTX-01` in a dedicated Team 05 worktree.

This override supersedes older Team 05 tails. The slice is Market Context regime evidence and partial-context framing. It is a bounded module-local vertical slice with backend and feature-local frontend work.

Do not implement in the shared `dev` workspace.

## Branch / Worktree

- Branch: `codex/team05-market-data/CF-W1-MCTX-01`
- Worktree: `C:\work\repo\investment-scanner-worktrees\team05-CF-W1-MCTX-01`

## Gate Evidence

- Requirement: `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-MCTX-01-market-context-regime-evidence-requirement.md`
- Architecture review: `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-MCTX-01-architecture-review.md`
- Contract: `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-MCTX-01-market-context-regime-evidence-contract.md`
- Work packet: `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-MCTX-01-work-packet.md`
- QA plan: `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-MCTX-01-qa-plan.md`
- Ready handoff: `docs/execution/codex-parallel-execution-plan-2026-05-16/12-ready-queue/ready-for-implementation.md`

## Allowed Files

- `backend/src/modules/market-context-intelligence/market-context-intelligence.service.ts`
- `backend/src/modules/market-context-intelligence/market-context-intelligence.types.ts`
- `backend/src/modules/market-context-intelligence/market-context-intelligence.md`
- `backend/tests/modules/market-context-intelligence/market-context-intelligence.service.test.ts`
- `frontend/src/features/market-context-intelligence/types.ts`
- `frontend/src/features/market-context-intelligence/components/MarketContextPage.tsx`
- `frontend/src/features/market-context-intelligence/components/MarketRegimeWidget.tsx`
- `frontend/tests/ui/market-context-intelligence.spec.ts`

Allowed reporting docs:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-05-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-MCTX-01-developer-handoff.md`

## Forbidden Files

- Prisma schema or migrations
- generated files
- `backend/src/modules/market-context-intelligence/market-context-intelligence.repository.ts`
- `backend/src/modules/market-context-intelligence/market-context-intelligence.controller.ts`
- `backend/src/modules/market-context-intelligence/market-context-intelligence.router.ts`
- `backend/src/modules/market-context-intelligence/market-context-intelligence.validation.ts`
- `backend/src/modules/market-context-intelligence/index.ts`
- backend or frontend route registries
- `frontend/src/features/market-context-intelligence/routes.tsx`
- `frontend/src/features/market-context-intelligence/api/**`
- `frontend/src/features/market-context-intelligence/hooks/**`
- `backend/src/modules/market-data-foundation/**`
- `backend/src/modules/data-quality-engine/**`
- `backend/src/modules/historical-context-snapshots/**`
- `backend/src/modules/signal-calibration-engine/**`
- `backend/src/modules/signal-generation-engine/**`
- shared backend utilities
- shared frontend components
- package manifests
- providers, startup/backfill, live-provider, paid/cloud, broker, telemetry, credentials, or broad UX/navigation work

## Required Behavior

- Add additive market-context evidence metadata that distinguishes trustworthy, partial, low-evidence, and missing-evidence regime states.
- Expose persisted-versus-fresh provenance explicitly.
- Preserve exact fresh breadth denominators on the auto-generation path instead of collapsing them into persisted sector-derived counts immediately.
- Label persisted breadth denominator source as derived when exact stored SMA denominators are unavailable.
- Keep macro explicitly missing with stable reason framing.
- Render evidence on the existing Market Context page and Market Regime widget without shared UI or route changes.
- Preserve current routes, query params, and existing response fields.
- Keep research-support language and avoid direct advice, price targets, guarantees, broker behavior, or automation wording.

## Focused Validation

Run after implementation:

```powershell
cd backend
npm.cmd test -- market-context-intelligence.service.test.ts --runInBand
npm.cmd run build
```

Because frontend files are in scope, also run when resource-safe:

```powershell
cd frontend
npm.cmd run test:ui -- market-context-intelligence.spec.ts --workers=1
npm.cmd run build
```

Before builds or UI smoke, check memory/resource safety if practical.

## Stop Conditions

Return to Team 00 without implementing further if the slice needs:

- any forbidden file;
- schema/generated/route/shared changes;
- Market Data, Data Quality Engine, Historical Context, Signal Calibration, or Signal Generation source edits;
- repository/controller/router/validation/index edits;
- provider/live-data/startup/backfill work;
- exact persisted denominator durability beyond derived framing;
- package changes, paid/cloud, telemetry, broker, or credential scope.

## Expected Output

Write:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-05-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-MCTX-01-developer-handoff.md`

Do not commit. Team 00 handles QA, review, Architect Signoff, delegated PO acceptance, scoped local commit, and later integration.
