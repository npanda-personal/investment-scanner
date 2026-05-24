# CF-W1-MD-05 QA Plan

Date: 2026-05-24

Owner: Team 04 QA Factory

Status: QA plan prepared. Execution remains pending until Team 00 promotes the bounded `market-data-foundation` implementation handoff inside the reserved writer set.

## Scope

QA planning for `CF-W1-MD-05 - catalog sync latest-session freshness and skip-reason explainability`.

This plan covers:

- catalog sync freshness-basis proof for latest completed session versus latest stored session;
- stale latest-session mismatch proof so terminal "no new data" is not shown when the accepted session is newer than stored candles;
- region-current but stale-instrument catch-up proof with visible stale count;
- fully current/final-confirmed proof;
- skip/outcome explainability that separates pre-fetch skipped, no-op, failed work, and stale catch-up pending;
- catalog row freshness wording that separates stored row date from accepted latest completed session;
- focused backend service tests, backend build, frontend build, UI smoke coverage, and product-language checks.

This plan excludes schema, migrations, repository/controller/router changes, route-registry edits, provider/startup/backfill work, shared UI/utilities, package/generated changes, Instrument Detail page scope, downstream DQ/readiness adoption, commits, and pushes.

## Contract Inputs

- `10-requirements/CF-W1-MD-05-catalog-sync-latest-session-freshness-requirement.md`
- `03-architecture/CF-W1-MD-05-architecture-review.md`
- `06-contracts/CF-W1-MD-05-catalog-sync-freshness-contract.md`
- `08-work-packets/CF-W1-MD-05-work-packet.md`
- `17-team-outboxes/TEAM-03-CF-W1-MD-05-architecture-outbox.md`

## Required QA Assertions

- Catalog sync status exposes latest completed trading date and latest stored trading date together for the selected scope.
- Catalog sync status exposes a stable freshness state equivalent to:
  - `LATEST_COMPLETED_SESSION_MISSING`
  - `REGION_CURRENT_INSTRUMENT_CATCH_UP_PENDING`
  - `REGION_CURRENT_FINAL_CONFIRMED`
  - `SESSION_UNKNOWN`
- If latest completed trading date is newer than latest stored trading date, the UI and DTO must not present a terminal "no new data" interpretation for that scope.
- Region-current/instrument-stale catch-up remains visible with a nonzero stale-instrument count.
- Pre-fetch skipped reason counts remain distinct from no-op counts.
- No-op counts remain distinct from failed counts.
- Stale catch-up pending remains distinct from pre-fetch skipped counts.
- Catalog sync explainability is visible without console inspection.
- Catalog row freshness text separates stored row date from accepted latest completed session date and does not imply universal currentness from a region-level status alone.
- Unsupported-provider rows are not visually mislabeled as synced/current rows; explanatory copy may state those rows are excluded from queued catalog sync scope.
- Wording remains research-support oriented and must not introduce financial-advice language.
- The implementation stays within the reserved file set only.

## Scenario Matrix

| Scenario | Input condition | Expected QA result |
| --- | --- | --- |
| Stale latest-session mismatch | Accepted latest completed session is newer than latest stored session | Freshness state resolves to latest-session-missing equivalent; latest completed and latest stored dates are both visible; terminal "no new data" language is absent. |
| Region current, stale catch-up pending | Region latest stored session matches latest completed session, but stale instruments remain | Freshness state resolves to catch-up-pending equivalent; stale-instrument count is visible; copy explains region currentness versus per-instrument lag. |
| Fully current, final confirmed | Region latest stored session matches latest completed session and stale instrument count is zero | Freshness state resolves to final-confirmed equivalent; current/final wording is allowed; no stale pending message appears. |
| Session unknown | Latest completed session cannot be derived safely | Freshness state resolves to unknown equivalent; packet does not invent "current" or "no new data" certainty. |
| Pre-fetch skip reasons | Sync work is skipped before fetch due to freshness gate or adjacent gate reasons | Explainability shows pre-fetch skipped reason counts separately from no-op and failed counts. |
| No-op outcome | Fetch completes but rows are already current and no inserts/updates occur | No-op count is visible and remains distinct from skipped reasons. |
| Failed work | One or more instrument operations fail | Failed count is visible and remains distinct from skipped and no-op counts. |
| Stale catch-up exclusion/cooldown | Catch-up pending exists but some work is intentionally deferred | Explainability keeps stale catch-up pending separate from pre-fetch skipped counts; wording does not collapse deferred catch-up into final currentness. |
| Catalog row freshness contrast | Row stored data-through date lags accepted latest completed session | Row text shows both stored-through and latest completed session basis, or equivalent clear contrast; row is not visually implied to be current. |
| Row fully current | Row stored data-through date matches accepted latest completed session | Row text confirms latest completed session present or equivalent current wording. |
| Unsupported provider boundary | Row is unsupported for provider-backed queued sync scope | Row is not mislabeled current merely because it was excluded; explanatory wording remains bounded and non-numeric at run level. |
| Scope drift | Implementation touches forbidden files or broadens into provider/schema/route/shared scope | QA reject and return to Team 00 / Architect. |

## Focused Command Guidance

Run after implementation handoff only, with laptop-memory checks respected before builds and Playwright:

```powershell
cd backend
npm.cmd test -- market-data.service.test.ts --runInBand
```

```powershell
cd backend
npm.cmd run build
```

```powershell
cd frontend
npm.cmd run build
```

```powershell
cd frontend
npm.cmd run test:ui -- market-data-foundation.spec.ts --workers=1
```

Focused language/claim scan after implementation:

```powershell
rg -n "buy now|sell now|must buy|must sell|guaranteed|profit target|price target|financial advice|automated trade instruction|no new data" backend/src/modules/market-data-foundation/market-data-foundation.service.ts backend/src/modules/market-data-foundation/market-data-foundation.types.ts frontend/src/features/market-data-foundation/types.ts frontend/src/features/market-data-foundation/components/MarketDataFoundationPage.tsx frontend/tests/ui/market-data-foundation.spec.ts
```

Review notes for the language scan:

- reject prohibited claim language anywhere in the slice;
- inspect any remaining `"no new data"` matches and confirm they only appear in the fully current/final-confirmed path, not in stale latest-session mismatch or catch-up-pending paths.

## Acceptance Criteria For QA Pass

- Backend service tests prove all required freshness states and the distinct explainability counts.
- Backend build passes.
- Frontend build passes.
- UI smoke proves the catalog sync panel shows freshness basis and explainability without console inspection.
- UI smoke proves row freshness text separates stored row date from latest completed session date.
- UI smoke proves stale latest-session mismatch does not render as terminal "no new data".
- UI smoke proves catch-up-pending state shows stale count.
- UI smoke proves fully current/final-confirmed state is distinct from catch-up-pending and stale-latest-session states.
- Language/claim scan shows no prohibited financial-advice wording and no misleading terminal "no new data" use outside the fully current/final-confirmed path.
- Changed files stay within the reserved implementation set.

## QA Rejection Criteria

- Latest completed session and latest stored session are not both visible in the DTO or UI.
- Stale latest-session mismatch still shows terminal "no new data" or equivalent finality.
- Catch-up-pending state is not distinguishable from fully current/final-confirmed state.
- Stale count is missing or hidden when stale instruments remain.
- Pre-fetch skipped, no-op, failed, and stale catch-up pending collapse into one coarse skipped bucket.
- Catalog grid still shows only stored row date without latest completed session contrast.
- Unsupported rows appear visually current/synced without explanatory boundary text.
- Prohibited market-advice or guarantee language appears.
- Forbidden files are touched, or verification depends on schema/route/provider/shared/package/generated scope.

## Evidence Required Later

- Implementation handoff listing exact changed files, with no writes outside the reserved set.
- Backend focused test output demonstrating:
  - stale latest-session mismatch
  - region-current/stale-catch-up pending
  - fully current/final-confirmed
  - session unknown if implemented in tests
  - pre-fetch skip reason counts
  - no-op distinct from skipped
  - failed distinct from skipped
- Backend build output.
- Frontend build output.
- UI smoke output for `market-data-foundation.spec.ts`.
- UI evidence notes or screenshots showing:
  - freshness basis panel with latest completed versus latest stored dates
  - catch-up-pending stale count
  - final-confirmed state
  - row freshness wording contrast
  - unsupported-row explanatory boundary if present in mocks
- Language/claim scan output plus reviewer note for any `"no new data"` matches.
- Skipped checks, blockers, residual risks, and next owner if any command is not run.

## Residual Risks To Watch

- Existing broad `"no new data"` strings may survive in a path not covered by the new state mapping.
- UI smoke may prove panel rendering but still miss subtle row-copy regressions unless mocks include both stale and current rows together.
- Unsupported-provider scope remains explanatory only in this slice; if numeric excluded counts become a Product Owner requirement, reopen with architecture review instead of stretching this packet.
