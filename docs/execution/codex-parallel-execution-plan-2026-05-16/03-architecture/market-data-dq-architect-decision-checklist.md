# Market Data / Data Quality Architect Decision Checklist

Date: 2026-05-17

Status: Sprint 1B preparation architecture decisions. Not an implementation approval.

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

Sprint 1B preparation decision: Angel One is preserved but excluded from Sprint 1B implementation.

Decision state: recorded for exclusion; pending for any future mocked validation or read-only live exception.

## 3. No-Orders / No-Trading Capability Boundary

Checklist:
- No backend route exposes order placement.
- No provider object contains order methods.
- No frontend UI can trigger broker execution.
- No background job can place orders.
- No test fixture normalizes broker trading as an expected capability.
- Product language remains research-support language.

Sprint 1B preparation decision: no-orders/no-trading boundary must be verified by QA before any broker-adjacent provider is approved.

Decision state: recorded as required gate; pending evidence.

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

Sprint 1B preparation decision: provider-heavy startup scheduler behavior is excluded from Sprint 1B unless separately approved.

Decision state: recorded for exclusion; pending if future implementation touches `backend/src/server.ts` or scheduler startup config.

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

Sprint 1B preparation decision: automatic startup backfill is excluded from Sprint 1B by default.

Decision state: recorded for exclusion; pending if future implementation proposes startup backfill.

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

Sprint 1B preparation decision: background price-backfill API behavior may be read-only inspected, but implementation changes are not approved until a separate work packet reserves module routes/controller/service files.

Decision state: pending for implementation.

## 7. Throttling And Concurrency

Checklist:
- Provider throttle has a safe default.
- Worker concurrency has a safe default.
- Batch size has a safe default.
- Max batches has a safe default.
- Rate limit and retry cooldown states are persisted or observable.
- Force mode cannot bypass safety gates without explicit approval.

Sprint 1B preparation decision: future implementation must keep concurrency, batch size, max batches, and provider throttle bounded and visible.

Decision state: recorded as architectural constraint; pending exact implementation review.

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

Sprint 1B preparation decision: repository/storage behavior may be in Sprint 1B only inside Market Data module-owned files and only with QA repository tests.

Decision state: pending implementation review.

## 9. Batched CreateMany / Update Behavior

Checklist:
- Bulk create and update behavior preserves uniqueness by instrument/date/source contract.
- Failed batches do not partially mark runs as complete without warnings.
- Update rules do not overwrite higher-quality data with lower-quality data.
- Batch results include created, updated, skipped, duplicate, malformed, and failed counts.
- QA has repository tests for batch behavior.

Sprint 1B preparation decision: batched create/update behavior is allowed only if QA proves deterministic duplicate handling and no low-quality overwrite.

Decision state: pending implementation review.

## 10. Retry-Cooldown Behavior

Checklist:
- Retryable provider errors do not enter ready states.
- Retry cooldown is visible in repair/readiness evidence.
- Force retry is explicit and audited.
- Cooldown state includes reason, provider, timestamp, and next attempt when known.
- Downstream modules block while retry validation is pending.

Sprint 1B preparation decision: retry-cooldown states must block downstream readiness and remain visible in evidence.

Decision state: recorded as contract constraint; pending test evidence.

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

Sprint 1B preparation decision: spike rejection remains disabled by default for Sprint 1B.

Decision state: recorded unless Product Owner and Architect approve a separate spike policy.

## 12. `.env.example` Defaults

Decision needed:
- Which environment defaults are safe to publish and track?

Checklist:
- Broker provider enablement defaults to false.
- Startup provider-heavy work defaults to false unless approved.
- No secrets are present.
- Test-mode behavior disables live providers.
- Throttle, batch size, concurrency, and max batches are conservative.

Sprint 1B preparation decision: config changes are shared/high-risk. `backend/.env.example` is read-only unless explicitly reserved.

Decision state: pending for any config edit.

## 13. `backend/src/server.ts` Startup Behavior

Decision needed:
- Is current startup orchestration acceptable, or must Sprint 1B reserve a server startup review?

Checklist:
- Server startup does not unexpectedly mutate large datasets.
- Startup jobs are explicit and bounded.
- Startup provider calls are disabled unless approved.
- Scheduler lifecycle is testable.
- Server route registration remains unchanged unless reserved.

Sprint 1B preparation decision: `backend/src/server.ts` is shared/high-risk and read-only unless explicitly reserved.

Decision state: pending for any server startup edit.

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

Sprint 1B preparation decision: no Prisma schema or migration changes are approved for Sprint 1B preparation.

Decision state: recorded as excluded unless a blocking contract gap is documented and approved.

## 15. Route Registry Impact

Decision needed:
- Are backend or frontend route registry changes needed for Sprint 1B?

Recommended default:
- No route registry changes unless explicitly reserved by Architect.

Checklist:
- Module-local routes do not require global registry edits.
- Frontend routes are unchanged unless UI workflow is approved.
- Route changes have QA route tests.

Sprint 1B preparation decision: no backend or frontend route registry changes are approved.

Decision state: recorded as excluded.

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

Sprint 1B preparation decision: shared utilities, shared UI, and package manifests are forbidden for Sprint 1B unless separately approved.

Decision state: recorded as excluded.

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

## 18. Sprint 1B File Reservation Proposal

| Path | Classification | Sprint 1B policy | Approval |
| --- | --- | --- | --- |
| `backend/src/modules/market-data-foundation/**` | Module-owned implementation | Allowed only after Sprint 1B implementation approval | Architect + QA |
| `backend/src/modules/data-quality-engine/**` | Module-owned implementation | Allowed only after Sprint 1B implementation approval | Architect + QA |
| `backend/tests/modules/market-data-foundation/**` | Module-owned tests | Allowed only after test approval | QA |
| `frontend/src/features/market-data-foundation/**` | Feature-owned UI/source | Read-only by default; allowed only if UI scope is approved | Product Owner + UX + QA |
| `backend/src/server.ts` | Shared runtime startup | Shared/high-risk; read-only by default | Architect required |
| `backend/.env.example` | Shared config/env example | Shared/high-risk; read-only by default | Product Owner + Architect |
| `.gitignore` | Source-control hygiene | Read-only; out of implementation scope | Orchestrator if needed |
| `prisma/schema.prisma` and `prisma/migrations/**` | Persistence contract | Forbidden | Product Owner + Architect required if unavoidable |
| Backend route registry | Cross-module route registry | Forbidden | Orchestrator + Architect required |
| Frontend route registry | Cross-feature route registry | Forbidden | Orchestrator + Architect + UX required |
| Shared backend utilities | Cross-module shared code | Forbidden | Architect required |
| Shared UI components | Cross-feature UI | Forbidden | UX + Architect required |
| Package manifests | Dependency/cost surface | Forbidden | Product Owner + Architect required |

## 19. Sprint 1B Architecture Stop Conditions

Stop future implementation if:
- A live provider call is discovered.
- A paid API or paid data dependency is discovered.
- A broker-order route, order method, or trade execution path is discovered.
- Secret exposure risk appears in code, logs, docs, or tests.
- A schema change is required.
- A route registry change is required.
- A shared utility or shared component change is required.
- Data Quality thresholds are unclear or contradicted by code.
- UI scope is unclear.
- Product Owner, Architect, or QA decision evidence is missing.
