# Market Data / Data Quality Validation Plan

Date: 2026-05-17

Status: Sprint 1B preparation QA scope. Tests were not run during Sprint 1B preparation.

## 1. QA Position

Sprint 1B implementation is not ready until Product Owner and Architect decisions are recorded. This validation plan defines the test evidence that should be approved later.

No live provider calls, provider-heavy tests, long-running services, package installs, Prisma changes, or source modifications are approved by this document.

## 2. Validation Goals

QA must prove:
- Market Data readiness gates are enforced.
- Data Quality gates block downstream use when required.
- Provider provenance is preserved.
- Angel One, if preserved, is disabled by default and mocked unless explicitly approved.
- Startup behavior does not trigger unapproved provider-heavy work.
- Repository writes preserve data quality and auditability.
- UI, if in scope, displays readiness and blockers without implying financial advice.

## 3. Focused Backend Tests To Run Later

Recommended later commands, subject to explicit approval:
- Market Data provider tests with mocked fetch only.
- Market Data repository tests.
- Market Data scheduler tests with live providers disabled.
- Market Data service tests.
- Market Data route tests.
- Market Data validation tests.
- Data Quality service/repository/route tests if touched.
- Full backend test suite only after resource and provider-safety gates pass.

No tests are approved to run by this document.

## 4. Provider Tests With Mocked Fetch Only

Required coverage:
- Provider disabled by default.
- Missing credentials fail closed.
- Login flow is mocked and never reaches live provider.
- Historical candle request is mocked.
- Rate-limit and retry behavior is mocked.
- Malformed rows are rejected or quarantined.
- Unsupported instruments are classified correctly.
- No order routes, order methods, or trading actions exist in provider surface.
- Secrets are not logged.

Live provider validation is out of scope until explicit approval.

## 5. Scheduler Tests With No Live Provider Calls

Required coverage:
- Scheduler disabled behavior.
- Startup run disabled behavior.
- Startup backfill disabled behavior.
- Active price backfill prevents competing sync.
- Catch-up logic is bounded.
- Retry cooldown does not become ready.
- Test environment does not call providers.
- Long-running loops are bounded or mocked.

## 6. Repository Tests

Required coverage:
- Batched create behavior.
- Batched update behavior.
- Duplicate candle handling.
- Invalid OHLC rejection or quarantine.
- Source provenance preservation.
- Skipped, malformed, duplicate, created, updated, and failed counts.
- Unsupported and manual-required instruments remain blocked.
- Higher-quality data is not overwritten by lower-quality data without evidence.

## 7. Route Tests

Required coverage if routes are in scope:
- Start backfill run.
- Active backfill status.
- Backfill run status by id.
- Cancel backfill run.
- Conflicting active run behavior.
- Safe error responses.
- No order, trade, or broker action routes.
- No route registry changes unless approved.

## 8. Service Tests

Required coverage:
- Provider selection and fallback policy.
- Fail-closed behavior.
- Retryable provider errors and cooldown states.
- Data-quality gate generation.
- Unsupported instrument exclusion.
- Manual-required repair plan.
- Price coverage calculation.
- Metadata coverage calculation.
- Trusted universe status calculation.
- User-visible blocker reasons.

## 9. Validation Tests

Required coverage:
- Valid OHLC rows pass.
- Invalid OHLC rows fail.
- Future-dated candles fail.
- Missing latest completed EOD blocks signals.
- Duplicate candles block or deterministically resolve.
- Zero or suspicious volume behavior is use-case gated.
- Spike rejection remains disabled by default unless separately approved.

## 10. Data Quality Invariant Checks

Required invariants:
- `NOT_TRUSTWORTHY` universe blocks downstream automated use.
- Instrument-level `NOT_READY` blocks signals and strategy decisions.
- `LIMITED` does not become action-ready.
- `BLOCKED` use-case tier blocks that use case.
- Missing Data Quality evaluation blocks downstream automated use.
- Data Quality evidence includes reasons and recommended fixes.
- Copilot summaries cannot claim reliability without readiness evidence.

## 11. Frontend Build And Typecheck

Run later only if UI remains in scope:
- Frontend build or typecheck command approved by Product Owner/Architect.
- Confirm Market Data UI uses API types correctly.
- Confirm progress and blocker text fit in existing UI.
- Confirm no financial-advice language appears.

## 12. Playwright Smoke Tests

Run later only if UI remains in scope:
- Market Data page loads.
- Readiness summaries render.
- Backfill controls, if approved, show disabled or safe state when provider is disabled.
- Progress UI does not imply live trading.
- Alerts or copilot links do not bypass DQ gates.

## 13. Live Local Provider Validation

Live provider validation is forbidden until explicitly approved.

If later approved:
- Use local machine only.
- Use minimal instrument subset.
- Use strict throttling.
- Use no order-capable methods.
- Log no secrets.
- Capture provider response counts, rate limits, skipped rows, and errors.
- Stop on unexpected order/trade capability, account action, secret exposure, or provider-heavy behavior.

## 14. No Paid / Cloud / Broker-Execution Checks

QA must verify:
- No paid provider is required.
- No paid AI or cloud service is required.
- No hidden telemetry exists.
- No order route exists.
- No order method exists.
- No broker execution path exists.
- No secrets are committed.
- `.env.example` defaults are safe.

## 15. Memory And Resource Gates

Before broad validation:
- Confirm test scope is bounded.
- Avoid provider-heavy live calls.
- Avoid long-running services.
- Confirm build/test commands are local and safe.
- Stop if memory, CPU, or runtime exceeds approved bounds.

## 16. Required QA Decisions Before Sprint 1B

QA must decide:
- Exact backend test subset for Sprint 1B.
- Whether UI build/typecheck is in scope.
- Whether Playwright smoke is in scope.
- Whether mocked Angel One tests are in scope.
- Whether any live provider validation is explicitly excluded or approved later.
- Evidence format for Product Owner acceptance.

## 17. Sprint 1B QA Scope Decision

Recorded Sprint 1B preparation defaults:
- Backend tests are required before Product Owner acceptance, but are not approved to run during preparation.
- Angel One tests, if run later, must use mocked fetch only unless Product Owner explicitly approves live provider validation.
- No live provider calls are allowed by default.
- No provider-heavy tests are allowed by default.
- No paid provider, cloud, broker execution, or secret exposure is allowed.
- Frontend build/typecheck and Playwright smoke are required only if UI files are in the approved implementation scope.

## 18. Required Validation Evidence For Future Sprint 1B

Backend test subset, subject to approval:
- `backend/tests/modules/market-data-foundation/market-data.provider.test.ts`
- `backend/tests/modules/market-data-foundation/market-data.service.test.ts`
- `backend/tests/modules/market-data-foundation/market-data.repository.test.ts`
- `backend/tests/modules/market-data-foundation/market-data.routes.test.ts`
- `backend/tests/modules/market-data-foundation/market-data.scheduler.test.ts`
- `backend/tests/modules/market-data-foundation/market-data.validation.test.ts`
- Data Quality Engine tests if Data Quality source changes are approved or added.

Validation checks:
- Mocked provider validation only.
- No-live-provider validation.
- No-paid-provider validation.
- No-broker-execution validation.
- No-secret validation.
- Data Quality invariant checks.
- Memory/resource gate before any build, test, server, browser, or provider validation.
- Frontend build/typecheck only if UI scope is approved.
- Playwright smoke only if UI scope is approved.
- Live local provider validation only after explicit later approval.

## 19. Data Quality Invariants For Acceptance

QA must reject Sprint 1B if:
- `NOT_TRUSTWORTHY` universe allows downstream automated use.
- Instrument-level `NOT_READY` allows signal or strategy decisions.
- `LIMITED` becomes action-ready.
- Missing DQ evaluation is treated as passing.
- Retry-cooldown state is hidden from readiness evidence.
- Manual-required rows feed automated downstream use.
- Unsupported instruments are counted as trusted.
- Copilot or UI language implies financial advice or reliability without DQ evidence.

## 20. QA Stop Conditions

Stop validation if:
- Test setup requires live Angel One credentials.
- A test performs live provider calls without explicit approval.
- A paid/cloud/broker dependency is needed.
- Secrets appear in logs, fixtures, or output.
- A broker order route or method is discovered.
- Test runtime or memory exceeds the approved resource gate.
- The approved file reservation is exceeded.
