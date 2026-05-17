# Angel One Read-Only Market Data Policy Decision

Date: 2026-05-17

Status: Sprint 1B preparation decision. Angel One is preserved but excluded from Sprint 1B implementation.

## 1. Decision Context

Current source inspection shows an Angel One market-data provider path exists in the Market Data Foundation module. It appears designed for read-only historical candle retrieval and provider validation, with environment-controlled enablement and no observed order-placement methods in the inspected provider.

However, Angel One is still a broker-adjacent integration. It may require broker credentials, TOTP handling, live provider calls, throttling, and startup behavior decisions. Under root `AGENTS.md` and current Product Owner direction, broker integrations and real-money execution are prohibited unless explicitly approved. Market data exceptions must be handled as Product Owner and Architect decisions.

## 2. Non-Negotiable Boundaries

- No order placement.
- No trade execution.
- No broker account actions.
- No real-money workflow.
- No committed secrets.
- No hidden telemetry.
- No paid data provider approval by implication.
- No live provider calls without explicit approval.
- No startup provider-heavy work without explicit approval.
- No downstream use unless Data Quality gates pass.

## 3. Policy Options

| Option | Local-first alignment | Zero-cost alignment | Broker credential risk | Secret risk | No-order guarantee | No-real-money guarantee | Provider-heavy startup risk | User value | Implementation risk | QA burden | Recommendation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A. Reject Angel One completely for now | Strong | Strong | None | None | Strong | Strong | None | Low if other free data works | Low | Low | Safe but may discard useful IN market coverage work |
| B. Preserve but exclude from Sprint 1 | Strong if disabled | Strong if no calls | Present but dormant | Present but dormant | Requires adapter review | Requires adapter review | Avoided for Sprint 1 | Medium | Low for Sprint 1 | Medium later | Recommended default until PO and Architect approve |
| C. Approve read-only Angel One market-data exception | Conditional | Conditional on no paid usage | High | High | Must be proven by adapter boundary | Must be proven by route/code review | Medium to high | High for IN/STOCK coverage | High | High | Not approved by this doc; requires explicit PO and Architect approval |
| D. Approve only after non-live mocked validation | Strong for validation | Strong | Deferred | Deferred | Can be tested before live use | Can be tested before live use | Avoided during mock phase | Medium to high | Medium | Medium | Good follow-up after Option B, still requires approval |
| E. Replace with non-broker free source fallback | Strong | Strong if provider is free | None | Low | Strong | Strong | Depends on provider | Medium | Medium to high | Medium | Useful fallback, but must be evaluated separately |

## 4. Recommended Decision

Recommended Product Owner decision for now: Option B, preserve but exclude Angel One from Sprint 1 implementation.

Reason:
- It preserves potentially useful IN/STOCK coverage work without approving broker-adjacent behavior.
- It avoids live provider calls, startup backfills, credential handling, and provider-heavy QA in the first implementation sprint.
- It keeps Sprint 1 focused on contract correctness, Data Quality gates, and safe remediation.
- It allows a later explicit move to Option D if mocked validation is approved.

This recommendation still requires Product Owner approval. It does not approve Angel One implementation or live use.

## 5. Option A Assessment: Reject Angel One Completely For Now

Benefits:
- Removes broker credential and secret risk.
- Simplifies QA and architecture boundaries.
- Keeps strict local/free constraints easiest to verify.

Costs:
- May reduce IN/STOCK data coverage.
- May require more work to find a non-broker fallback.
- May discard already-existing provider work that could be useful if safely isolated.

When to choose:
- If Product Owner wants zero broker-adjacent code paths during the validation phase.
- If Architect cannot prove no-order/no-execution boundaries.

## 6. Option B Assessment: Preserve But Exclude From Sprint 1

Benefits:
- Avoids live provider and credential risk during Sprint 1.
- Keeps the current provider code reviewable as historical/current source evidence.
- Lets Market Data and Data Quality proceed with contracts, mocks, and existing safe data sources.

Risks:
- Dormant broker-adjacent code can drift into active use if env defaults, startup behavior, or routes are not controlled.
- Future agents may misread old docs as approval.

Required controls:
- Keep `ANGEL_ONE_ENABLE_MARKET_DATA=false` by default.
- Do not call Angel One during startup or tests.
- Exclude Angel One from Sprint 1B implementation unless separately approved.
- Add active-plan decision evidence before any live use.

## 7. Option C Assessment: Approve Read-Only Angel One Market-Data Exception

Benefits:
- Potentially improves IN/STOCK historical coverage.
- Could reduce reliance on less reliable free fallbacks.

Risks:
- Broker credentials required.
- Secret handling required.
- Startup and throttling behavior must be tightly controlled.
- QA must prove no order methods, no order routes, and no real-money behavior.
- Live provider calls may create operational, rate-limit, account, or compliance risk.

Required approvals:
- Product Owner approval.
- Architect approval.
- QA plan approval.
- Secret-handling review.
- No-order boundary review.

This option is not approved.

## 8. Option D Assessment: Approve Only After Non-Live Mocked Validation

Benefits:
- Allows adapter contract verification without live credentials.
- Proves no-order/no-execution boundaries before any provider use.
- Lets QA validate throttling, scheduler behavior, repository writes, and Data Quality gates without provider calls.

Risks:
- Mocked validation does not prove live provider reliability.
- Implementation can still drift unless live mode is separately gated.

Recommended as the next possible step only after Option B is accepted.

## 9. Option E Assessment: Replace With Non-Broker Free Source Fallback

Benefits:
- Avoids broker credential and order-boundary risk.
- Aligns strongly with local-first and zero-incremental-cost constraints if the source is truly free.

Risks:
- Free source reliability may be weaker.
- Terms, throttling, symbol mapping, and data completeness still require validation.
- May not improve current coverage enough.

This option should remain open as a provider strategy candidate, not a Sprint 1B assumption.

## 10. Decision Required

Product Owner must choose one:
- Keep Angel One excluded from Sprint 1 and preserve it for later review.
- Remove/revert Angel One later.
- Approve mocked validation only.
- Approve a read-only live exception with explicit Architect and QA gates.
- Replace it with a non-broker free provider path.

Until the decision is recorded in the active execution folder, Angel One remains excluded from implementation.

## 11. Sprint 1B Recorded Decision

Selected Sprint 1B status:

```text
preserved but excluded from Sprint 1B implementation
```

This status was selected because the Product Owner approved Sprint 1B preparation only and did not explicitly approve mocked-only validation or a read-only market-data exception.

Sprint 1B rules:
- Do not implement Angel One changes.
- Do not run Angel One live provider calls.
- Do not run provider-heavy tests.
- Do not require Angel One credentials.
- Do not enable Angel One startup behavior.
- Do not treat historical old-plan Angel One approvals as active approval.

Allowed in Sprint 1B preparation:
- Cite current source inspection as risk evidence.
- Keep `market-data-foundation.angel-one-provider.ts` as read-only unless a later implementation packet explicitly reserves it.
- Recommend mocked-only validation as a future option, but do not run it.

Decision still missing:
- Whether Product Owner wants to approve mocked-only Angel One validation in a later step.
- Whether Product Owner wants to approve a read-only live Angel One market-data exception in a later step.
- Whether Architect accepts the no-orders/no-trading adapter boundary if either future option is approved.

## 12. Sprint 1B Final Slice Angel Decision

Selected first implementation slice:

```text
Option A: Backend-only Data Quality invariant tests
```

Angel One decision for Option A:
- Angel One remains excluded.
- Mocked Angel One validation is not approved because it is not needed for the chosen slice.
- Live Angel One calls are not approved.
- Broker credentials are not approved.
- Provider-heavy tests are not approved.
- Angel One source files are read-only and out of scope.
