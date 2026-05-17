# Sprint 1 Readiness Audit

## 1. Executive Summary

Sprint 1 implementation is not ready.

Current git state is clean, so there are no current dirty or untracked source files to stage, revert, split, or archive. The Sprint 0 dirty-worktree inventory is now stale as a source-control snapshot because the previously dirty Market Data / Data Quality scope appears to have been committed after the governance baseline.

Current `dev` history shows these post-governance commits:

- `14147fe Improve market data backfill and Angel provider flow`
- `a8c071e Add market data planning docs`

The committed Market Data / Data Quality changes are worth preserving for audit and review, but they are not safe to treat as Product Owner-accepted Sprint 1 implementation. They should be split into separate decisions before any new implementation starts:

1. Angel One read-only provider policy decision.
2. Scheduler/startup-load behavior decision.
3. Price-backfill background-run contract decision.
4. Repository/storage and validation behavior decision.
5. UI progress/control decision.
6. Historical old-plan evidence handling decision.

Market Data / Data Quality remains the recommended first Sprint 1 focus because downstream signal, strategy, backtest, trade-plan, portfolio, alert, and copilot workflows depend on trustworthy OHLC, provider provenance, market scope, and data-quality readiness.

Angel One provider work is risky but potentially useful. Under root `AGENTS.md`, broker integration is forbidden unless explicitly approved. Because Angel One requires broker-account credentials even for read-only market data, it is blocked until the Product Owner explicitly approves this read-only exception in the active execution plan and the Solution Architect revalidates the boundary against no paid data, no orders, no real-money execution, secret safety, and local-first constraints.

Product Owner decisions are needed before Sprint 1. Architect decisions are needed before Sprint 1. QA validation is needed before Sprint 1 implementation is accepted.

## 2. Dirty Worktree Classification

### Current Git State

Read-only commands showed:

- `git status --short --branch`: clean worktree on `dev...origin/dev`.
- `git diff --stat`: no unstaged diff.
- `git diff --name-status`: no unstaged diff.
- `git ls-files --others --exclude-standard`: no untracked files.

There are no current dirty or untracked files.

The table below classifies the previously dirty scope as committed current-state changes since governance baseline `fef78b4afa8726dbb1a2d345d23e745280bc3c66`.

| Path | Current SCM status | Classification | Likely owner/team | Belongs to Sprint 1? | Preserve? | Stage later? | Revert later? | Ignore later? | PO decision | Architect decision | QA validation |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `.gitignore` | tracked, modified since governance baseline | config/env | Orchestrator / Release Audit | no, governance hygiene | yes | no, already committed | no unless log policy changes | no | no | yes for log policy | no |
| `backend/.env.example` | tracked, modified since governance baseline | config/env | Market Data + Orchestrator | only if startup/provider config is in scope | preserve for review | no, already committed | possible if startup defaults rejected | no | yes | yes | yes |
| `backend/src/server.ts` | tracked, modified since governance baseline | application source / shared runtime | Orchestrator + Architect | only if startup loads are in scope | preserve for review | no, already committed | possible if startup loads rejected | no | yes | yes | yes |
| `backend/src/modules/data-quality-engine/data-quality-engine.md` | tracked, modified since governance baseline | planning/governance / module doc | Data Quality Engine | yes as supporting doc | yes | no, already committed | no | no | no | no | no |
| `backend/src/modules/market-data-foundation/index.ts` | tracked, modified since governance baseline | application source / public export | Market Data Foundation | yes only after contract approval | preserve for review | no, already committed | no unless Angel provider rejected | no | yes | yes | yes |
| `backend/src/modules/market-data-foundation/market-data-foundation.angel-one-provider.ts` | tracked, added since governance baseline | provider/integration | Market Data Foundation | blocked pending PO/Architect | preserve for decision | no, already committed | possible if provider rejected | no | yes | yes | yes |
| `backend/src/modules/market-data-foundation/market-data-foundation.catalog-sources.ts` | tracked, modified since governance baseline | application source | Market Data Foundation | yes if catalog identity scope approved | preserve for review | no, already committed | no unless SME catalog rejected | no | no | yes | yes |
| `backend/src/modules/market-data-foundation/market-data-foundation.controller.ts` | tracked, modified since governance baseline | application source | Market Data Foundation | yes if price-backfill run scope approved | preserve for review | no, already committed | no unless background runs rejected | no | no | yes | yes |
| `backend/src/modules/market-data-foundation/market-data-foundation.provider.ts` | tracked, modified since governance baseline | application source | Market Data Foundation | yes if provider classification scope approved | preserve for review | no, already committed | no | no | no | yes | yes |
| `backend/src/modules/market-data-foundation/market-data-foundation.repository.ts` | tracked, modified since governance baseline | application source | Market Data Foundation | yes if storage/eligibility scope approved | preserve for review | no, already committed | no unless storage strategy rejected | no | no | yes | yes |
| `backend/src/modules/market-data-foundation/market-data-foundation.router.ts` | tracked, modified since governance baseline | application source / module route file | Market Data Foundation | yes if price-backfill run scope approved | preserve for review | no, already committed | no unless API rejected | no | no | yes | yes |
| `backend/src/modules/market-data-foundation/market-data-foundation.scheduler.ts` | tracked, modified since governance baseline | application source / scheduler | Market Data Foundation + Architect | yes if startup scheduler scope approved | preserve for review | no, already committed | possible if startup loads rejected | no | yes | yes | yes |
| `backend/src/modules/market-data-foundation/market-data-foundation.service.ts` | tracked, modified since governance baseline | application source | Market Data Foundation | yes only after split scope approval | preserve for review | no, already committed | no unless provider/backfill rejected | no | yes | yes | yes |
| `backend/src/modules/market-data-foundation/market-data-foundation.types.ts` | tracked, modified since governance baseline | application source / contract | Market Data Foundation + Architect | yes if contract approved | preserve for review | no, already committed | no unless contract rejected | no | yes | yes | yes |
| `backend/src/modules/market-data-foundation/market-data-foundation.validation.ts` | tracked, modified since governance baseline | application source | Market Data Foundation + QA | yes if validation policy approved | preserve for review | no, already committed | possible if spike policy rejected | no | yes | yes | yes |
| `backend/tests/modules/market-data-foundation/market-data.provider.test.ts` | tracked, modified since governance baseline | application test | QA + Market Data | yes as validation input | preserve | no, already committed | no | no | no | yes | yes |
| `backend/tests/modules/market-data-foundation/market-data.repository.test.ts` | tracked, modified since governance baseline | application test | QA + Market Data | yes as validation input | preserve | no, already committed | no | no | no | yes | yes |
| `backend/tests/modules/market-data-foundation/market-data.routes.test.ts` | tracked, modified since governance baseline | application test | QA + Market Data | yes as validation input | preserve | no, already committed | no | no | no | yes | yes |
| `backend/tests/modules/market-data-foundation/market-data.scheduler.test.ts` | tracked, modified since governance baseline | application test | QA + Market Data | yes as validation input | preserve | no, already committed | no | no | no | yes | yes |
| `backend/tests/modules/market-data-foundation/market-data.service.test.ts` | tracked, modified since governance baseline | application test | QA + Market Data | yes as validation input | preserve | no, already committed | no | no | no | yes | yes |
| `backend/tests/modules/market-data-foundation/market-data.validation.test.ts` | tracked, modified since governance baseline | application test | QA + Market Data | yes as validation input | preserve | no, already committed | no | no | no | yes | yes |
| `frontend/src/features/market-data-foundation/api/marketDataFoundationService.ts` | tracked, modified since governance baseline | UI/source | Market Data Frontend | yes if UI/API scope approved | preserve for review | no, already committed | no unless background UI rejected | no | no | yes | yes |
| `frontend/src/features/market-data-foundation/components/DataIngestion.tsx` | tracked, modified since governance baseline | UI/source | Market Data Frontend + UX | yes if UI scope approved | preserve for review | no, already committed | no | no | yes for workflow | yes | yes |
| `frontend/src/features/market-data-foundation/components/MarketDataFoundationPage.tsx` | tracked, modified since governance baseline | UI/source | Market Data Frontend + UX | yes if UI scope approved | preserve for review | no, already committed | no | no | yes for workflow | yes | yes |
| `frontend/src/features/market-data-foundation/components/MarketDataStatusPanel.tsx` | tracked, modified since governance baseline | UI/source | Market Data Frontend + UX | yes if UI scope approved | preserve for review | no, already committed | no | no | yes for workflow | yes | yes |
| `frontend/src/features/market-data-foundation/types.ts` | tracked, modified since governance baseline | UI/source / contract mirror | Market Data Frontend + Architect | yes if contract approved | preserve for review | no, already committed | no | no | yes | yes | yes |
| `docs/codex-agent-team-plan/active-work-board.md` | tracked, modified since governance baseline | historical old-plan evidence | Documentation / Orchestrator | no | preserve as history only | no, already committed | no unless PO requests archive cleanup | ignore as authority | yes if future archive | no | no |
| `docs/codex-agent-team-plan/architecture-contracts/2026-05-13-top5-architecture-contracts.md` | tracked, modified since governance baseline | historical old-plan evidence | Documentation | no | preserve as history only | no, already committed | no | ignore as authority | no | no | no |
| `docs/codex-agent-team-plan/architecture-contracts/2026-05-16-market-data-business-metadata-remediation-contract.md` | tracked, added since governance baseline | historical old-plan evidence | Documentation / Architect | evidence only | preserve as evidence | no, already committed | no | ignore as authority | yes if migrating | yes if reused | yes if reused |
| `docs/codex-agent-team-plan/architecture-contracts/2026-05-16-p0-1c-angel-one-readonly-provider-contract.md` | tracked, added since governance baseline | historical old-plan evidence | Documentation / Architect | evidence only | preserve as evidence | no, already committed | no | ignore as authority | yes if migrating | yes if reused | yes if reused |
| `docs/codex-agent-team-plan/architecture-signoff/2026-05-16-p0-1c-angel-one-readonly-provider-architect-signoff.md` | tracked, added since governance baseline | historical old-plan evidence | Documentation / Architect | evidence only | preserve as evidence | no, already committed | no | ignore as authority | yes if migrating | yes if reused | yes if reused |
| `docs/codex-agent-team-plan/architecture-signoff/2026-05-16-p0-1c-market-data-diagnostics-architect-rejection.md` | tracked, added since governance baseline | historical old-plan evidence | Documentation / Architect | evidence only | preserve as evidence | no, already committed | no | ignore as authority | yes if migrating | yes | yes |
| `docs/codex-agent-team-plan/blocker-register.md` | tracked, modified since governance baseline | historical old-plan evidence | Documentation | no | preserve as history only | no, already committed | no | ignore as authority | no | no | no |
| `docs/codex-agent-team-plan/codex-agent-team.md` | tracked, modified since governance baseline | historical old-plan evidence | Documentation | no | preserve as history only | no, already committed | no | ignore as authority | no | no | no |
| `docs/codex-agent-team-plan/github-check-in/2026-05-13-market-data-provider-metadata-parallelism-github-check-in.md` | tracked, modified since governance baseline | historical old-plan evidence | Documentation / Release Audit | no | preserve as history only | no, already committed | no | ignore as authority | no | no | no |
| `docs/codex-agent-team-plan/operations/2026-05-14-md-a5-operational-drain-report.md` | tracked, modified since governance baseline | historical old-plan evidence | Documentation / QA | evidence only | preserve as evidence | no, already committed | no | ignore as authority | yes if migrating evidence | yes if reused | yes if reused |
| `docs/codex-agent-team-plan/po-audits/2026-05-13-market-data-full-module-po-audit.md` | tracked, modified since governance baseline | historical old-plan evidence | Documentation / PO | evidence only | preserve as evidence | no, already committed | no | ignore as authority | yes if migrating evidence | no | yes if reused |
| `docs/codex-agent-team-plan/po-roadmap-backlog-2026-05-15-angel-one-data-sync-redesign.md` | tracked, added since governance baseline | historical old-plan evidence | Documentation / PO | evidence only | preserve as evidence | no, already committed | no | ignore as authority | yes if migrating | yes if reused | yes if reused |
| `docs/codex-agent-team-plan/qa-evidence/2026-05-14-md-a5-operational-drain-qa-evidence.md` | tracked, modified since governance baseline | historical old-plan evidence | Documentation / QA | evidence only | preserve as evidence | no, already committed | no | ignore as authority | yes if migrating evidence | yes if reused | yes if reused |
| `docs/codex-agent-team-plan/sdlc-operating-model.md` | tracked, modified since governance baseline | historical old-plan evidence | Documentation | no | preserve as history only | no, already committed | no | ignore as authority | no | no | no |
| `docs/codex-agent-team-plan/team-operating-model.md` | tracked, modified since governance baseline | historical old-plan evidence | Documentation | no | preserve as history only | no, already committed | no | ignore as authority | no | no | no |
| `docs/codex-agent-team-plan/work-packets/2026-05-13-top5-work-packets.md` | tracked, modified since governance baseline | historical old-plan evidence | Documentation | no | preserve as history only | no, already committed | no | ignore as authority | no | no | no |
| `logs/.gitkeep` | tracked, added since governance baseline | logs/generated | Orchestrator / Release Audit | no | yes | no, already committed | no | keep generated logs ignored | no | no | no |

Ignored generated files currently present under `logs/`:

- `backend-runtime.err.log`
- `backend-runtime.out.log`
- `backend-start-20260511-004430.err.log`
- `backend-start-20260511-004430.out.log`
- `backend-start-20260513-013306.err.log`
- `backend-start-20260513-013306.out.log`
- `frontend-start-20260511-004430.err.log`
- `frontend-start-20260511-004430.out.log`
- `frontend-start-20260513-013306.err.log`
- `frontend-start-20260513-013306.out.log`
- `frontend-start-po-review.err.log`
- `frontend-start-po-review.out.log`
- `frontend-start-ui-validation.err.log`
- `frontend-start-ui-validation.out.log`

These are ignored by `.gitignore` and should remain untracked unless a separate local evidence-retention decision approves adding sanitized excerpts elsewhere.

## 3. Market Data / Data Quality Assessment

### Behavior That Appears To Have Changed

The committed Market Data changes appear to add or modify:

- Angel One read-only historical market-data provider for `IN / STOCK`.
- Provider selection that prefers Angel One for Indian stock historical validation/fetches when enabled and credentialed.
- Background price-backfill run API with start/status/active/cancel endpoints.
- Bounded price-backfill worker concurrency and provider throttling.
- Startup scheduler behavior and startup price-backfill behavior.
- Scheduler catch-up when the latest completed candle is missing.
- Blocking of scheduled latest-candle sync while a price-backfill background run is active.
- NSE SME equity catalog source support.
- Catalog identity repair behavior that processes actionable rows.
- Price-readiness full-history counting based on total stored bars instead of rolling-window bars.
- Price storage optimization from per-row upsert to batched `createMany(skipDuplicates)` plus updates.
- Retry-cooldown behavior that avoids counting retrying rows as fallback-required gaps.
- Spike rejection disabled by default unless `MARKET_DATA_REJECT_PRICE_SPIKES=true`.
- Business metadata blocker diagnostics in the repair plan and UI.
- Market Data UI progress, polling, and blocking controls for background provider loads.
- Tests for Angel provider, price backfill, scheduler, repository, route, service, and validation behavior.

### Read-Only Or Provider-Heavy

The Angel One provider is read-only in code inspection: it implements login, scrip-master lookup, and historical candle reads. No order-placement route or trade-execution method was observed in the inspected provider file.

The work is provider-heavy because it can call:

- Angel One login endpoint.
- Angel One scrip master endpoint.
- Angel One historical candle endpoint.
- Existing Yahoo provider paths.

### Cost, Broker, Secrets, Or External Risk

- Paid service risk: no paid SDK or paid data provider was visible, but Angel One usage may depend on broker account/API eligibility. Product Owner must confirm there is no paid market-data subscription.
- Broker dependency risk: high. Angel One is a broker-account integration even if read-only.
- Secret risk: high. `.env.example` adds `ANGEL_ONE_API_KEY`, `ANGEL_ONE_CLIENT_CODE`, `ANGEL_ONE_PIN`, and `ANGEL_ONE_TOTP_SECRET`. No actual secret values were inspected or committed in `.env.example`.
- External risk: high. The provider calls external Angel One endpoints and must remain opt-in and bounded.
- Real-money execution risk: code inspection did not show order placement, but the broker credential boundary still requires Product Owner and Architect approval.

### OHLC Ingestion

The changes affect OHLC ingestion materially:

- `fetchHistorical()` can route `IN / STOCK` symbols to Angel One.
- Angel candles are normalized into `HistoricalPrice` rows with `source: 'angel_one'`.
- Price storage now uses batched insert/update paths.
- Spike rejection is opt-in, so large price moves are retained by default.
- Background backfill can process batches with worker concurrency and throttling.

### Instrument Catalog

The changes affect instrument catalog behavior:

- Adds `NSE_SME_EQUITY_SECURITIES`.
- Adds parsing support for SME equity source headers.
- Adjusts futures exclusion to rely on explicit asset/segment fields instead of symbol/name containing `FUT` or `future`.

### Data Quality Evaluation

Data Quality source code was not changed beyond a module doc pointer from `docs/AGENTS.md` to root `AGENTS.md`. Market Data readiness inputs changed, which indirectly affects Data Quality and downstream eligibility:

- full-history bar count changed,
- retry-cooldown rows are treated differently,
- business metadata diagnostics are surfaced,
- trust remains `NOT_TRUSTWORTHY` according to historical evidence.

### UI Workflows

The frontend now appears to:

- poll active price-backfill and scheduler status,
- show background-load progress,
- disable manual sync/import/catalog operations during background provider loads,
- display business metadata blocker diagnostics,
- expose cancel behavior for price-backfill runs.

These are meaningful UX changes and require UX/QA validation before Sprint 1 acceptance.

### Tests

The committed tests cover:

- Angel provider config, scrip-master lookup, login de-duplication, historical chunks, throttling, rate-limit retry, malformed candle filtering, and symbol classification.
- Service routing to Angel validation and fail-closed/fail-open behavior.
- Price-backfill run APIs and force defaults.
- Scheduler catch-up and skip behavior while price backfill runs.
- Repository storage and future-symbol filtering behavior.
- Validation spike policy.

No tests were run during this audit.

### Shared / High-Risk Files

High-risk touched files:

- `backend/src/server.ts`
- `backend/.env.example`
- `.gitignore`
- Market Data public export `index.ts`
- Market Data type contracts
- Market Data route module
- Frontend API/type contracts

Backend global route registry and frontend route registry were not listed in the changed-file diff.

### Local-First / Zero-Incremental-Cost Alignment

Partially aligned, but not approved.

Positive alignment:

- no paid package visible,
- no cloud deployment visible,
- no real-money order code observed,
- provider is disabled unless `ANGEL_ONE_ENABLE_MARKET_DATA` and credentials are present.

Risks:

- Angel One requires broker credentials and external API calls.
- `.env.example` enables `MARKET_DATA_SCHEDULER_ENABLED=true` and `MARKET_DATA_STARTUP_PRICE_BACKFILL_ENABLED=true`, which can create provider-heavy startup behavior if a developer copies these defaults into `.env`.
- root `AGENTS.md` says no broker integration unless explicitly approved; old docs cannot supply current active approval.

## 4. Angel One Provider Decision

Classification: blocked until Product Owner approval.

It is also blocked until Solution Architect approval in the active execution plan before use in Sprint 1.

### Assessment

- Requires paid services: not proven, but Product Owner must confirm Angel One historical access through the existing account has no incremental cost or paid market-data subscription.
- Requires broker credentials: yes, it requires API key, client code, PIN, and TOTP secret.
- Can remain optional: yes, `canHandleHistorical()` returns false unless enabled and credentials are present.
- Risks real-money execution: no order code was observed, but broker credentials create a boundary risk.
- Stores secrets: no persistent secret storage was observed in code, but the provider holds credentials/session tokens in memory.
- Violates local-first/free constraints: it violates the default no-broker-integration rule unless the Product Owner explicitly approves a read-only market-data exception.
- Should be isolated behind adapter contract: yes. The adapter should be explicitly read-only and should expose only market-data methods.
- Should be excluded from Sprint 1 implementation until approval: yes.

### Recommendation

Do not remove it now. Preserve it for review, but do not make it part of Sprint 1 implementation until:

1. Product Owner approves a read-only Angel One market-data exception in the active planning folder.
2. Architect approves a provider adapter contract in the active planning folder.
3. QA approves a no-orders/no-secrets/no-paid-provider validation plan.
4. Startup defaults are reviewed so provider-heavy work does not run unexpectedly.

## 5. Shared File Risk Review

### `backend/src/server.ts`

What changed:

- Server startup now calls `startMarketDataStartupLoads()` instead of `startMarketDataFoundationScheduler()`.
- Startup load failures are caught and logged.

Why it matters:

- This changes shared runtime startup behavior.
- It can start scheduler and possibly startup price-backfill behavior after server start.
- It affects every local backend run, not only Market Data manual operations.

Safety:

- Not safe to accept without Architect and QA review.
- It may be acceptable if startup work is disabled by default or strictly bounded.

Required for Sprint 1:

- Not required for a read-only contract audit.
- Required only if Sprint 1 includes automated startup catch-up/backfill behavior.

Approvals:

- Product Owner: yes, if startup provider-heavy work is allowed.
- Architect: yes.
- QA: yes.

Stage/revert/exclude:

- Already committed.
- Exclude from the first Sprint 1 implementation unless startup behavior is explicitly in scope.

### `backend/.env.example`

What changed:

- Market Data scheduler example changed from disabled to enabled.
- Startup scheduler run was added.
- Price-backfill concurrency/throttle/startup settings were added.
- Angel One credential and provider settings were added.
- `ANGEL_ONE_ENABLE_MARKET_DATA=false` remains default false.

Why it matters:

- `.env.example` drives developer local defaults.
- It introduces sensitive credential names.
- It can encourage provider-heavy startup behavior if copied into `.env`.

Safety:

- Angel One enable default is safe as false.
- Scheduler/startup defaults are risky because scheduler is example-enabled and startup price backfill is example-enabled, even though startup backfill still requires Angel enablement.

Required for Sprint 1:

- Required only if Sprint 1 includes provider/backfill runtime configuration.

Approvals:

- Product Owner: yes for broker credential/provider policy and local provider-heavy behavior.
- Architect: yes for default behavior and secret-safety shape.
- QA: yes for config matrix validation.

Stage/revert/exclude:

- Already committed.
- Exclude from first implementation until startup/provider policy is approved.

### `.gitignore`

What changed:

- `logs` was changed to `logs/*` plus `!logs/.gitkeep`.
- This keeps the directory tracked while ignoring generated log files.

Why it matters:

- This is source-control hygiene and reduces risk of committing runtime logs.

Safety:

- Safe and aligned with no-secret/no-generated-artifact rules.

Required for Sprint 1:

- Not required for Market Data functionality, but useful governance hygiene.

Approvals:

- Product Owner: not required unless log evidence policy changes.
- Architect: light review only.
- QA: no.

Stage/revert/exclude:

- Already committed.
- Preserve.

## 6. Old Plan / Historical Docs Review

The `docs/codex-agent-team-plan/` changes are useful historical evidence but must remain non-authoritative.

Useful evidence:

- Angel One read-only provider contract.
- Angel One architect signoff.
- Market Data diagnostics architect rejection requiring scope split.
- Operational drain report with live counters and provider-throttle observations.
- QA evidence showing tests/builds reportedly passed before this audit.
- Blocker register updates that show trusted Market Data remains incomplete.

Stale or conflicting behavior:

- `docs/codex-agent-team-plan/active-work-board.md` still claims to be the live source of truth.
- Old GitHub check-in workflows remain present.
- Old PO/QA/Architect evidence can be mistaken for current approval.
- Old docs mention active P0.1C work and promoted Angel provider work, but the current active plan says historical docs are evidence only.

Recommendation:

- Preserve the old-plan changes as history.
- Do not use them as active authority.
- Do not modify them now.
- Migrate only selected evidence into the active execution folder after Product Owner approval.
- Explicitly reject old-plan active-board authority for Sprint 1.

## 7. Sprint 1 Readiness Decision

Recommendation: Option C: Sprint 1 should start with a smaller read-only Market Data / DQ contract audit.

Do not start implementation yet.

Rationale:

- Current worktree is clean, so there is no dirty split/revert task to do in the index.
- The committed Market Data changes are broad and mix provider integration, scheduler startup behavior, storage behavior, validation policy, UI workflows, old-plan docs, and QA evidence.
- Angel One is blocked by current Product Owner and Architect decision requirements because it depends on broker credentials.
- Historical docs already contain an Architect rejection for mixed-scope diagnostics/provider/repair behavior.
- Market Data / Data Quality remains the correct first focus, but it must begin as a contract and validation audit, not as more implementation.

## 8. Recommended Sprint 1 Scope

Sprint 1 implementation cannot proceed yet.

### Exact Blocker-Removal Tasks

1. Create active Market Data / DQ readiness contract in `docs/execution/codex-parallel-execution-plan-2026-05-16/contracts/`.
2. Record Product Owner decision on Angel One read-only market-data exception.
3. Record Architect decision on Angel provider adapter boundary, startup behavior, price-backfill background-run contract, and storage/validation changes.
4. Record QA plan for Market Data / DQ trust revalidation.
5. Decide whether startup scheduler/backfill behavior is in or out of Sprint 1.
6. Decide whether UI background-load controls are in or out of Sprint 1.
7. Migrate only necessary old-plan evidence into active execution docs, with source citations and stale-assumption warnings.
8. Keep downstream signal, strategy, backtest, trade-plan, alert, portfolio, and copilot work blocked until Market Data/DQ trust criteria pass.

### Candidate First Requirement After Blockers Clear

Requirement name:

- S1-01 Market Data / Data Quality Trust Revalidation Contract And Baseline

Owner/team:

- Market Data Foundation Team + Data Quality Engine Team

Lane/module:

- Lane 1: Market Data / Data Quality

Allowed files:

- Active Sprint 1 planning docs under `docs/execution/codex-parallel-execution-plan-2026-05-16/`.
- Read-only inspection of Market Data and Data Quality source/tests.

Forbidden files:

- Prisma schema and migrations.
- Backend route registry.
- Frontend route registry.
- Shared backend utilities.
- Shared frontend components.
- Package manifests.
- Application source files, until implementation is separately approved.
- `.env`.

Shared files requiring reservation if later implementation is approved:

- `backend/src/server.ts`
- `backend/.env.example`
- `.gitignore`
- Market Data public exports and type contracts.
- Frontend Market Data API/types if UI remains in scope.

Acceptance criteria:

- Product Owner-approved policy on Angel One.
- Architect-approved Market Data/DQ contract.
- QA-approved validation matrix.
- Clear go/no-go criteria for trust status, price coverage, metadata coverage, malformed rows, provider failures, retry cooldown, and no-order/no-paid/no-secret guarantees.

QA plan:

- Planning-only in this audit; test commands listed in section 10.

Stop conditions:

- Angel requires paid data subscription.
- Any order-placement or trading capability appears.
- Secrets are committed or logged.
- Startup behavior can trigger provider-heavy runs unexpectedly.
- Trust counters remain below Product Owner threshold.
- QA cannot reproduce required local validation safely.

Expected validation evidence:

- Focused backend tests.
- Backend build.
- Frontend build/typecheck if UI remains in scope.
- Playwright smoke if UI remains in scope.
- Local live data validation with safe bounded requests only after explicit approval.
- No paid/cloud/broker-execution evidence.

## 9. File Reservation Proposal

First Sprint 1 item:

- S1-01 Market Data / Data Quality Trust Revalidation Contract And Baseline

Implementation owner:

- No implementation owner yet. Contract audit owner should be Solution Architect with Market Data Foundation and Data Quality Engine consultation.

QA owner:

- QA Automation Team.

Architect reviewer:

- Solution Architect Agent.

Product Owner acceptance point:

- After contract audit, QA plan, and go/no-go criteria are complete.

Allowed write scope:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/contracts/market-data-dq-readiness-contract.md` if approved.
- `docs/execution/codex-parallel-execution-plan-2026-05-16/qa-sprint-1-market-data-dq-plan.md` if approved.
- `docs/execution/codex-parallel-execution-plan-2026-05-16/active-work-board.md` if approved.
- `docs/execution/codex-parallel-execution-plan-2026-05-16/risk-register.md` if approved.

Read-only scope:

- `backend/src/modules/market-data-foundation/`
- `backend/src/modules/data-quality-engine/`
- `backend/tests/modules/market-data-foundation/`
- `frontend/src/features/market-data-foundation/`
- `docs/codex-agent-team-plan/` as historical evidence only

Forbidden scope:

- `.env`
- Prisma schema and migrations
- route registries
- shared backend utilities
- shared frontend components
- package manifests
- application source edits
- staging/commit/push

Shared files requiring explicit approval before any future implementation:

- `backend/src/server.ts`
- `backend/.env.example`
- `.gitignore`
- `backend/src/modules/market-data-foundation/index.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.types.ts`
- `frontend/src/features/market-data-foundation/types.ts`
- `frontend/src/features/market-data-foundation/api/marketDataFoundationService.ts`

## 10. Test / Validation Proposal

Do not run these until explicitly approved.

Backend tests:

- `npm test -- market-data.provider.test.ts market-data.service.test.ts market-data.repository.test.ts market-data.routes.test.ts market-data.scheduler.test.ts market-data.validation.test.ts`
- Focused Angel provider tests with mocked fetch only.
- Focused scheduler tests with no live provider calls.
- Focused Data Quality tests after contract scope is defined.

Backend build:

- `npm run build` from `backend`.

Frontend build/typecheck:

- `npm run build` from `frontend`.

Playwright tests if UI remains touched:

- Market Data Foundation smoke covering active background load state, disabled duplicate actions, and progress/empty/error states.

Live local data validation:

- Only after memory check and explicit approval.
- One-symbol read-only smoke only if Angel One exception is approved and credentials are local.
- Bounded batch with `batchSize <= 5`, `workerConcurrency=1`, `force=false`, and throttle documented, only if approved.

Provider throttling checks:

- Confirm effective `ANGEL_ONE_HISTORICAL_THROTTLE_MS`.
- Confirm `MARKET_DATA_PRICE_BACKFILL_PROVIDER_THROTTLE_MS`.
- Confirm retry cooldown behavior avoids storms.

Data Quality invariant checks:

- No downstream signals while trust is `NOT_TRUSTWORTHY`.
- DQ outputs show warning/blocker reasons.
- Retry-cooling rows are not hidden from operational visibility.
- Manual-required rows remain visible.
- Required-history coverage is computed against the approved window.

No paid/cloud/broker-execution checks:

- No package/install changes.
- No cloud services.
- No hidden telemetry.
- No order routes or order methods.
- No committed secrets.
- Angel One disabled by default unless Product Owner approves read-only exception.

## 11. Product Owner Decisions Needed

1. Approve or reject Angel One read-only market-data exception despite root no-broker-integration rule.
2. Confirm Angel One access creates zero incremental cost and no paid market-data subscription.
3. Decide whether Angel One must be excluded from Sprint 1 until a non-broker free data path is found.
4. Decide whether startup scheduler/load behavior is acceptable for localhost use.
5. Define Market Data trust threshold for personal validation, including acceptable `reviewReady`, price coverage, metadata coverage, and remaining blocker counts.
6. Decide whether UI background-load controls belong in Sprint 1 or must wait.
7. Decide whether selected old-plan evidence may be migrated into active Sprint 1 docs.
8. Confirm GitHub push remains optional and disabled unless separately approved.

## 12. Architect Decisions Needed

1. Approve or reject Angel One adapter boundary in active execution docs.
2. Decide whether `backend/src/server.ts` startup load behavior is acceptable.
3. Decide whether `.env.example` scheduler/startup defaults should remain as committed.
4. Approve or reject price-backfill background run API contract.
5. Approve or reject force-default behavior and retry-cooldown count treatment.
6. Approve or reject repository storage change from per-row upsert to createMany/update batches.
7. Approve or reject spike rejection being opt-in by default.
8. Confirm no Prisma schema or route-registry changes are needed before Sprint 1.
9. Define contract fields for Market Data/DQ readiness evidence.

## 13. QA Decisions Needed

1. Decide the smallest safe focused backend test set.
2. Decide whether frontend build is required before Sprint 1 acceptance.
3. Decide whether Playwright UI smoke is required for background-load controls.
4. Decide whether live local provider validation can be safely run later.
5. Define provider-throttle, malformed-row, retry-cooldown, and no-orders verification checks.
6. Define DQ invariant checks before downstream modules can consume Market Data.
7. Define evidence format for skipped tests and resource/memory gates.

## 14. Recommended Next Approval Prompt

Approve Sprint 1A read-only Market Data / Data Quality contract audit only. Do not implement code, do not stage, do not commit, do not push, and do not run provider-heavy tests. Create only active execution docs for: Market Data/DQ readiness contract, Angel One policy decision record, Architect decision checklist, and QA validation plan. Keep Angel One excluded from implementation until Product Owner and Architect approval are recorded in the active execution folder.
