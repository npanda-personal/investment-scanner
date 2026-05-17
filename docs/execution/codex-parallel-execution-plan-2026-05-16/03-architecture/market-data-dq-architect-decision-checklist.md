# Market Data / Data Quality Architect Decision Checklist

Date: 2026-05-17

Status: Sprint 1A architecture checklist. Not an implementation approval.

## 1. Approval Rule

Sprint 1B implementation must not begin until the Solution Architect records decisions for the items below in the active execution folder.

Any change touching shared files, route registration, Prisma schema, package manifests, startup behavior, shared utilities, shared UI components, provider policy, or Data Quality contracts requires explicit reservation and review.

## 2. Angel Provider Adapter Boundary

Decision needed:
- Is Angel One preserved as dormant code, excluded, removed later, mocked only, or approved as a read-only provider exception?

Checklist:
- Adapter exposes market-data retrieval only.
- Adapter has no order placement, order modification, order cancellation, holdings, positions, funds, margin, portfolio trading, or account action methods.
- Adapter cannot be reached by downstream strategy, signal, trade-plan, alert, or copilot code except through a market-data provider interface.
- Adapter defaults to disabled.
- Adapter fails closed unless explicitly approved otherwise.
- Adapter keeps credentials out of logs and persistence.
- Adapter has mocked tests before live validation.

Decision state: pending.

## 3. No-Orders / No-Trading Capability Boundary

Checklist:
- No backend route exposes order placement.
- No provider object contains order methods.
- No frontend UI can trigger broker execution.
- No background job can place orders.
- No test fixture normalizes broker trading as an expected capability.
- Product language remains research-support language.

Decision state: pending.

## 4. Startup Scheduler Behavior

Current inspected behavior includes scheduler and startup-load concepts in Market Data Foundation.

Decision needed:
- What scheduler behavior is allowed at server startup?

Checklist:
- Startup must not make live provider calls unless explicitly approved.
- Startup must not launch long-running provider-heavy backfills by default.
- Startup must be bounded, observable, and cancelable if enabled.
- Test environment must not call live providers.
- Local developer startup must not consume paid, broker, or high-volume provider resources.

Decision state: pending.

## 5. Startup Backfill Behavior

Decision needed:
- Should startup backfill be disabled by default for Sprint 1B?

Recommended default:
- Disabled unless Product Owner and Architect approve a bounded local backfill mode.

Checklist:
- Region and asset type are explicit.
- Batch size is bounded.
- Worker concurrency is bounded.
- Max batches are bounded.
- Provider throttle is configured.
- Active run status is inspectable.
- Cancellation exists if UI/API is in scope.
- No hidden background data mutation occurs.

Decision state: pending.

## 6. Background Price-Backfill API Contract

Decision needed:
- Are background price-backfill endpoints in scope for Sprint 1B?

Checklist:
- API does not require backend route registry change unless explicitly approved.
- API has explicit run id, status, progress, totals, warnings, and errors.
- API is idempotent or rejects conflicting active runs.
- API supports cancellation if long-running.
- API cannot trigger broker execution.
- API cannot bypass Data Quality gates.

Decision state: pending.

## 7. Throttling And Concurrency

Checklist:
- Provider throttle has a safe default.
- Worker concurrency has a safe default.
- Batch size has a safe default.
- Max batches has a safe default.
- Rate limit and retry cooldown states are persisted or observable.
- Force mode cannot bypass safety gates without explicit approval.

Decision state: pending.

## 8. Storage Behavior

Decision needed:
- Are current repository writes acceptable for Sprint 1B, and do they preserve auditability?

Checklist:
- Price writes preserve provider provenance.
- Duplicate handling is deterministic.
- Invalid OHLC rows are rejected or quarantined.
- Partial updates cannot mark blocked data as ready.
- Manual-required states are preserved.
- Write batches are bounded.
- Audit evidence can be reconstructed.

Decision state: pending.

## 9. Batched CreateMany / Update Behavior

Checklist:
- Bulk create and update behavior preserves uniqueness by instrument/date/source contract.
- Failed batches do not partially mark runs as complete without warnings.
- Update rules do not overwrite higher-quality data with lower-quality data.
- Batch results include created, updated, skipped, duplicate, malformed, and failed counts.
- QA has repository tests for batch behavior.

Decision state: pending.

## 10. Retry-Cooldown Behavior

Checklist:
- Retryable provider errors do not enter ready states.
- Retry cooldown is visible in repair/readiness evidence.
- Force retry is explicit and audited.
- Cooldown state includes reason, provider, timestamp, and next attempt when known.
- Downstream modules block while retry validation is pending.

Decision state: pending.

## 11. Spike Rejection Policy

Current inspected behavior suggests spike rejection is disabled by default unless an environment flag enables it.

Decision needed:
- Should spike rejection remain disabled by default for Sprint 1B?

Recommended default:
- Keep disabled until a tested, explainable spike policy exists.

Checklist:
- Spike rejection never silently drops candles without evidence.
- Suspicious rows are quarantined or warned before removal.
- Strategy/backtest modules can explain whether adjusted or raw data was used.

Decision state: pending.

## 12. `.env.example` Defaults

Decision needed:
- Which environment defaults are safe to publish and track?

Checklist:
- Broker provider enablement defaults to false.
- Startup provider-heavy work defaults to false unless approved.
- No secrets are present.
- Test-mode behavior disables live providers.
- Throttle, batch size, concurrency, and max batches are conservative.

Decision state: pending.

## 13. `backend/src/server.ts` Startup Behavior

Decision needed:
- Is current startup orchestration acceptable, or must Sprint 1B reserve a server startup review?

Checklist:
- Server startup does not unexpectedly mutate large datasets.
- Startup jobs are explicit and bounded.
- Startup provider calls are disabled unless approved.
- Scheduler lifecycle is testable.
- Server route registration remains unchanged unless reserved.

Decision state: pending.

## 14. Prisma Schema Impact

Decision needed:
- Are Prisma schema or migration changes needed for Sprint 1B?

Recommended default:
- No Prisma schema or migration changes in Sprint 1B unless an Architect-approved contract gap blocks correctness.

Checklist:
- Current tables support required audit fields.
- Current uniqueness constraints support duplicate candle rules.
- Current storage supports provider provenance and DQ evidence.
- Any schema gap is documented before implementation.

Decision state: pending.

## 15. Route Registry Impact

Decision needed:
- Are backend or frontend route registry changes needed for Sprint 1B?

Recommended default:
- No route registry changes unless explicitly reserved by Architect.

Checklist:
- Module-local routes do not require global registry edits.
- Frontend routes are unchanged unless UI workflow is approved.
- Route changes have QA route tests.

Decision state: pending.

## 16. Shared Utilities And Shared UI Impact

Decision needed:
- Can Sprint 1B remain inside module-owned files, or does it require shared utility/UI edits?

Recommended default:
- Keep Sprint 1B within Market Data and Data Quality modules.

Checklist:
- Shared backend utilities are read-only unless reserved.
- Shared frontend components are read-only unless UI scope is approved.
- Package manifests remain untouched.
- Public module exports are changed only with Architect review.

Decision state: pending.

## 17. Required Architect Output Before Sprint 1B

The Architect must record:
- Angel One policy decision status.
- Allowed write scope.
- Forbidden write scope.
- Shared file reservations.
- Startup and scheduler policy.
- Backfill API policy.
- Storage and batch behavior approval.
- Retry and cooldown policy.
- Spike rejection policy.
- Prisma and route registry decision.
- QA expectations for the approved scope.

