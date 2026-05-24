# TEAM-05 Current Assignment

Date: 2026-05-20

Team: TEAM-05 - Market Data / Data Quality

## Latest Assignment Override - 2026-05-24 MD-05

Team 00 promotes `CF-W1-MD-05` as a bounded Market Data Foundation implementation slice.

This assignment can run in parallel with Team 07 `CF-W1-TSC-02A-TREV-HEALTH` because the file reservations are disjoint.

## Branch / Worktree

- Branch: `codex/team05-market-data/CF-W1-MD-05`
- Worktree: `C:\work\repo\investment-scanner-worktrees\team05-CF-W1-MD-05`
- Base: current local `dev` after Team 00 promotion docs

## Gate Evidence

- Requirement: `10-requirements/CF-W1-MD-05-catalog-sync-latest-session-freshness-requirement.md`
- Architecture review: `03-architecture/CF-W1-MD-05-architecture-review.md`
- Contract: `06-contracts/CF-W1-MD-05-catalog-sync-freshness-contract.md`
- Work packet: `08-work-packets/CF-W1-MD-05-work-packet.md`
- QA plan: `04-qa/CF-W1-MD-05-qa-plan.md`
- Ready queue handoff: `12-ready-queue/ready-for-implementation.md`

## Allowed Files

- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.types.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.md`
- `backend/tests/modules/market-data-foundation/market-data.service.test.ts`
- `frontend/src/features/market-data-foundation/types.ts`
- `frontend/src/features/market-data-foundation/components/MarketDataFoundationPage.tsx`
- `frontend/tests/ui/market-data-foundation.spec.ts`

Allowed reporting docs:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-05-CF-W1-MD-05-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-MD-05-developer-handoff.md`

## Required Behavior

- Add additive catalog sync freshness basis and explainability fields.
- Show latest completed session and latest stored session together.
- Distinguish latest-session missing, region-current with stale-instrument catch-up pending, region-current final-confirmed, and session-unknown states.
- Keep pre-fetch skipped reason counts, no-op counts, failed counts, and stale catch-up pending evidence distinct.
- Update catalog sync panel and row freshness copy so stale stored dates do not read as fully synced/current.
- Keep unsupported-provider handling explanatory only; do not add numeric unsupported-provider exclusion counts without reopening repository scope.

## Forbidden Files

- Prisma schema or migrations
- generated files
- `backend/src/modules/market-data-foundation/market-data-foundation.repository.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.controller.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.router.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.validation.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.provider.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.scheduler.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.worker.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.queue.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.market-session.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.universe.ts`
- `backend/src/modules/market-data-foundation/index.ts`
- `frontend/src/features/market-data-foundation/api/marketDataFoundationService.ts`
- `frontend/src/features/market-data-foundation/components/InstrumentDetailPage.tsx`
- `frontend/src/features/market-data-foundation/components/MarketDataStatusPanel.tsx`
- `frontend/src/features/market-data-foundation/routes.tsx`
- `frontend/tests/ui/market-data-foundation-instrument.spec.ts`
- backend and frontend route registries
- shared backend utilities or shared frontend components
- package manifests
- provider/live-data, startup/backfill, paid/cloud, broker, telemetry, or credential files

## Focused Validation

```powershell
cd backend
npm.cmd test -- market-data.service.test.ts --runInBand
npm.cmd run build
```

```powershell
cd frontend
npm.cmd run build
npm.cmd run test:ui -- market-data-foundation.spec.ts --workers=1
```

## Stop Conditions

Stop and return to Team 00 if implementation requires repository edits for unsupported exclusion counts, controller/router/route-registry changes, schema/migration/generated changes, shared UI/backend utility changes, provider/startup/backfill changes, Instrument Detail page scope expansion, package changes, live provider calls, paid/cloud/broker scope, telemetry, or credentials.

## Latest Assignment Override - 2026-05-24 DQ-03

Team 00 promotes `CF-W1-DQ-03` as an independent backend-only Data Quality Engine implementation slice.

This assignment can run in parallel with Team 06 `CF-W1-TSC-01A-SIG` because the file reservations are disjoint.

## Branch / Worktree

- Branch: `codex/team05-market-data/CF-W1-DQ-03`
- Worktree: `C:\work\repo\investment-scanner-worktrees\team05-CF-W1-DQ-03`
- Base: current local `dev` commit `48e9183 docs: promote tsc signal bridge`

## Gate Evidence

- Requirement: `10-requirements/CF-W1-DQ-03-data-quality-residual-reason-summary-for-downstream-trust-consumers-requirement.md`
- Architecture review: `03-architecture/CF-W1-DQ-03-architecture-review.md`
- Contract: `06-contracts/CF-W1-DQ-03-data-quality-residual-reason-summary-contract.md`
- Work packet: `08-work-packets/CF-W1-DQ-03-work-packet.md`
- QA plan: `04-qa/CF-W1-DQ-03-qa-plan.md`
- Ready queue handoff: `12-ready-queue/ready-for-implementation.md`

## Allowed Files

- `backend/src/modules/data-quality-engine/data-quality-engine.service.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.types.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.md`
- `backend/tests/modules/data-quality-engine/data-quality-engine.service.test.ts`
- `backend/tests/modules/data-quality-engine/data-quality-engine.invariants.test.ts`

Allowed reporting docs:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-05-CF-W1-DQ-03-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-DQ-03-developer-handoff.md`

## Required Behavior

- Add an additive residual-summary packet to Data Quality outputs.
- Derive the summary only from existing DQ fields and current service evidence.
- Preserve existing DQ filters, gating, scoring, and response fields.
- Decorate freshly evaluated and service-returned DTOs without repository persistence.
- Keep wording research-support oriented and avoid advice, target, broker, or automation claims.
- Do not rewrite downstream consumers in this child.

## Forbidden Files

- `backend/src/modules/data-quality-engine/data-quality-engine.repository.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.controller.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.router.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.validation.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.module.ts`
- `backend/src/modules/data-quality-engine/index.ts`
- repository/routes/validation tests
- `backend/src/modules/market-data-foundation/**`
- downstream consumer modules
- all frontend files/tests
- Prisma schema or migrations
- backend/frontend route registries
- shared backend utilities or shared frontend components
- package manifests
- generated files
- provider/live-data, startup/backfill, paid/cloud, broker, telemetry, or credential files

## Focused Validation

```powershell
cd backend
npm.cmd test -- data-quality-engine.service.test.ts data-quality-engine.invariants.test.ts --runInBand
npm.cmd run build
```

## Stop Conditions

Stop and return to Team 00 if the implementation requires repository persistence, schema/migration, route/controller/validation, frontend/UI, Market Data source, downstream consumer edits, shared files, package/generated files, provider/live/startup/backfill, paid/cloud, broker, telemetry, or credentials.

## Current Assignment Override - CF-W1-HCTX-03

Implement `CF-W1-HCTX-03` in the dedicated Team 05 worktree.

This override supersedes older tails below for the current Team 05 run. Do not implement in the shared `dev` workspace.

## Branch / Worktree

- Branch: `codex/team05-market-data/CF-W1-HCTX-03`
- Worktree: `C:\work\repo\investment-scanner-worktrees\team05-CF-W1-HCTX-03`
- Base: accepted `CF-W1-HCTX-02` commit `f52c024`

## Gate Evidence

- Requirement: `10-requirements/CF-W1-HCTX-03-historical-context-nearest-snapshot-age-and-provenance-warnings-requirement.md`
- Architecture review: `03-architecture/CF-W1-HCTX-03-architecture-review.md`
- Contract: `06-contracts/CF-W1-HCTX-03-historical-context-nearest-snapshot-age-and-provenance-contract.md`
- Work packet: `08-work-packets/CF-W1-HCTX-03-work-packet.md`
- QA plan: `04-qa/CF-W1-HCTX-03-qa-plan.md`

## Allowed Files

- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.types.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.service.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.md`
- `backend/tests/modules/historical-context-snapshots/historical-context-snapshots.service.test.ts`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-05-CF-W1-HCTX-03-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-HCTX-03-developer-handoff.md`

## Forbidden Files

- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.repository.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.controller.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.router.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.validation.ts`
- `backend/src/modules/historical-context-snapshots/index.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.module.ts`
- `backend/tests/modules/historical-context-snapshots/historical-context-snapshots.repository.test.ts`
- `backend/tests/modules/historical-context-snapshots/historical-context-snapshots.routes.test.ts`
- `backend/tests/modules/historical-context-snapshots/historical-context-snapshots.validation.test.ts`
- all frontend `historical-context-snapshots` files/tests
- all `market-context-intelligence` source/tests
- all `signal-quality-lab` source/tests
- Prisma schema or migrations
- generated files
- backend or frontend route registries
- shared backend utilities or shared frontend components
- package manifests
- provider/live-data, startup/backfill, paid/cloud, broker, telemetry, or credential scope

## Required Behavior

- Preserve current nearest-on-or-before lookup semantics.
- Add additive age/provenance metadata only.
- Expose requested date, selected date, lag days, lookback days, and stable status labels.
- Distinguish same-day, near-date, fallback, metadata-gap, missing, and not-requested cases.
- Keep summary wording research-support oriented.
- Avoid downstream consumer rewrites in this first slice.

## Focused Validation

```powershell
cd backend
npm.cmd test -- historical-context-snapshots.service.test.ts --runInBand
npm.cmd run build
```

Optional drift scan:

```powershell
rg -n "same-day|near|fallback|lag|lookback|metadata gap|provenance" backend/src/modules/historical-context-snapshots backend/tests/modules/historical-context-snapshots
```

## Stop Conditions

Return to Team 00 without implementing further if the slice needs repository, controller, router, validation, index, module, schema, migration, generated, route registry, shared utility/UI, package, frontend, market-context, signal-quality, provider/live-data, startup/backfill, paid/cloud, broker, telemetry, or credential scope.

## Expected Output

Write:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-05-CF-W1-HCTX-03-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-HCTX-03-developer-handoff.md`

Do not commit. Team 00 handles QA, review, Architect Signoff, delegated PO acceptance, scoped local commit, and later integration.

---

Date: 2026-05-20

Team: TEAM-05 - Market Data / Data Quality

## Current Assignment Override - CF-W1-MCTX-02

Implement `CF-W1-MCTX-02` in the dedicated Team 05 worktree.

This override supersedes older tails below for the current Team 05 run. Do not implement in the shared `dev` workspace.

## Branch / Worktree

- Branch: `codex/team05-market-data/CF-W1-MCTX-02`
- Worktree: `C:\work\repo\investment-scanner-worktrees\team05-CF-W1-MCTX-02`
- Base: accepted `CF-W1-MCTX-01` commit `e695f0c`

## Gate Evidence

- Requirement: `10-requirements/CF-W1-MCTX-02-market-context-freshness-basis-labels-for-persisted-vs-generated-summaries-requirement.md`
- Architecture review: `03-architecture/CF-W1-MCTX-02-architecture-review.md`
- Contract: `06-contracts/CF-W1-MCTX-02-market-context-freshness-basis-contract.md`
- Work packet: `08-work-packets/CF-W1-MCTX-02-work-packet.md`
- QA plan: `04-qa/CF-W1-MCTX-02-qa-plan.md`

## Allowed Files

- `backend/src/modules/market-context-intelligence/market-context-intelligence.service.ts`
- `backend/src/modules/market-context-intelligence/market-context-intelligence.types.ts`
- `backend/src/modules/market-context-intelligence/market-context-intelligence.md`
- `backend/tests/modules/market-context-intelligence/market-context-intelligence.service.test.ts`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-05-CF-W1-MCTX-02-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-MCTX-02-developer-handoff.md`

## Forbidden Files

- `backend/src/modules/market-context-intelligence/market-context-intelligence.repository.ts`
- `backend/src/modules/market-context-intelligence/market-context-intelligence.controller.ts`
- `backend/src/modules/market-context-intelligence/market-context-intelligence.router.ts`
- `backend/src/modules/market-context-intelligence/market-context-intelligence.validation.ts`
- `backend/src/modules/market-context-intelligence/index.ts`
- `backend/tests/modules/market-context-intelligence/market-context-intelligence.repository.test.ts`
- `backend/tests/modules/market-context-intelligence/market-context-intelligence.routes.test.ts`
- all frontend `market-context-intelligence` files/tests
- all downstream consumer module source/tests
- Prisma schema or migrations
- generated files
- backend or frontend route registries
- shared backend utilities or shared frontend components
- package manifests
- provider/live-data, startup/backfill, paid/cloud, broker, telemetry, or credential scope

## Required Behavior

- Add additive persisted-vs-generated freshness basis metadata to `MarketContextSummary`.
- Preserve current regime math, scope behavior, route shape, and persisted-save behavior.
- Keep basis derivation in the service layer.
- Preserve explicit macro-missing and partial-evidence wording.
- Do not implement frontend adoption, downstream consumer adoption, repository persistence, route changes, schema changes, or provider/live-data changes in this slice.

## Focused Validation

```powershell
cd backend
npm.cmd test -- market-context-intelligence.service.test.ts --runInBand
npm.cmd run build
```

Optional copy drift scan:

```powershell
rg -n "persisted|generated|fallback|derived|fresh|partial|missing|macro|basis" backend/src/modules/market-context-intelligence backend/tests/modules/market-context-intelligence
```

## Stop Conditions

Return to Team 00 without implementing further if the slice needs repository, controller, router, validation, index, schema, migration, generated, route registry, shared utility/UI, package, frontend, downstream consumer, provider/live-data, startup/backfill, paid/cloud, broker, telemetry, or credential scope.

## Expected Output

Write:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-05-CF-W1-MCTX-02-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-MCTX-02-developer-handoff.md`

Do not commit. Team 00 handles QA, review, Architect Signoff, delegated PO acceptance, scoped local commit, and later integration.

---

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

# Current Dispatcher Assignment - Parallel Team 05 Slice

Date: 2026-05-18

## Assignment

Implement `CF-W1-MD-03` in a dedicated Team 05 worktree.

This is independent from active `CF-W1-MCTX-01`: `MCTX-01` reserves `market-context-intelligence` backend and feature-local frontend files, while `MD-03` reserves only `market-data-foundation` backend service/doc/tests.

Do not implement in the shared `dev` workspace.

## Branch / Worktree

- Branch: `codex/team05-market-data/CF-W1-MD-03`
- Worktree: `C:\work\repo\investment-scanner-worktrees\team05-CF-W1-MD-03`

## Gate Evidence

- Requirement: `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-MD-03-market-data-signoff-threshold-contract-requirement.md`
- Architecture review: `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-MD-03-architecture-review.md`
- Contract: `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-MD-03-market-data-signoff-threshold-contract.md`
- Work packet: `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-MD-03-work-packet.md`
- QA plan: `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-MD-03-qa-plan.md`
- Ready handoff: `docs/execution/codex-parallel-execution-plan-2026-05-16/12-ready-queue/ready-for-implementation.md`

## Allowed Files

- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.md`
- `backend/tests/modules/market-data-foundation/market-data.service.test.ts`
- `backend/tests/modules/market-data-foundation/market-data.universe.test.ts`

Allowed reporting docs:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-05-CF-W1-MD-03-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-MD-03-developer-handoff.md`

## Forbidden Files

- Prisma schema or migrations
- generated files
- Market Data repository, provider, validation, types, controller, router, scheduler, worker, and queue files
- all Data Quality Engine source/tests
- backend or frontend route registries
- shared backend utilities
- frontend source or shared UI files
- package manifests
- provider/live-data/startup/backfill redesign
- `CF-W1-MD-02A` and future `CF-W1-MD-02B` durable evidence/schema work
- paid/cloud, broker, telemetry, or credentials

## Required Behavior

- Add explicit universe signoff blockers for price coverage below `95%` and metadata coverage below `90%`.
- Keep `downstreamAllowed=false` whenever either threshold misses.
- Preserve existing review-ready minimum-count and `10%` review-ready-share gates.
- Keep signoff explanation output specific enough to distinguish price-threshold failure from metadata-threshold failure.
- Preserve current response shape, coverage fields, route behavior, and current universe-state classification.
- Update module docs so Universe Signoff describes the enforced threshold policy.
- Do not merge this work with `CF-W1-MD-02A` durable evidence/schema proposal work.

## Focused Validation

Run after implementation:

```powershell
cd backend
npm.cmd test -- market-data.service.test.ts market-data.universe.test.ts --runInBand
npm.cmd run build
```

Before build/test work, check memory/resource safety if practical.

## Stop Conditions

Return to Team 00 without implementing further if the slice needs any forbidden file, schema/generated/route/shared changes, DQE source/test changes, provider/startup/backfill work, frontend/UI work, package changes, paid/cloud, broker, telemetry, credentials, or durable evidence storage work.

## Expected Output

Write:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-05-CF-W1-MD-03-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-MD-03-developer-handoff.md`

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
