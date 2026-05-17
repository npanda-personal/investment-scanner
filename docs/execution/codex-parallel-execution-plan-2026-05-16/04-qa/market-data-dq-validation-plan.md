# Market Data / Data Quality Validation Plan

Date: 2026-05-17

Status: QA plan proposal. Tests were not run during Sprint 1A.

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

