# P0.1B QA Checklist - Conservative Today Review Read-Only Context

Date: 2026-05-14
Mode: QA Verification Planning Mode
Owner: QA Shadow (P0.1B)
Status: Blocked (implementation evidence pending)

## Scope

Packet: `P0.1B - Conservative Today Review Read-Only Context`
Primary objective:
- Verify Today Review shows trusted-data and Data Quality use-case tier context as display-only read-only evidence for `IN / STOCK` without changing candidate generation logic or gate thresholds.

Scope used in this check:
- `backend/tests/modules/today-trade-review/*` (validation focus)
- `backend/src/modules/today-trade-review/*` and dependencies through API contracts
- `backend/src/modules/market-data-foundation/*` and `backend/src/modules/data-quality-engine/*` read contracts
- `frontend/src/features/today-trade-review/*`
- `frontend/tests/ui/today-trade-review.spec.ts`

Read-only policy for this packet:
- No endpoint write jobs or repair actions.
- No manual broad mutation of today-review run state.
- No Playwright execution in this planning pass.

## Verification Checklist

1. Today Review must render trusted-data + DQ-context from upstream snapshots without changing run decision rules.
   - `run.sourceSnapshot.reviewReadiness` and `run.sourceSnapshot.reviewUniverse` must display in the Today Review run panel.
   - `run.sourceSnapshot.scanFunnel`, `run.explainability`, and `run.warnings` remain present and consistent with `run.reviewUniverseMode`.
   - `run.sourceSnapshot.reviewReadiness.reviewMode` should never be used as a new hard gate to promote candidates beyond existing `run.sourceSnapshot.reviewUniverse.mode` behavior.

2. Data Quality tier context must be conservative and optional-safe.
   - Candidate rows or run detail should show per-instrument `dataQualitySnapshot.useCaseTiers` only as context labels/reasons; no mandatory branching on this field for promotion.
   - Missing/limited context must be visibly explicit: limited contexts should show a conservative label and blockers, not be collapsed into ready.
   - If `useCaseTiers` is absent, Today Review remains stable via fallback structures and legacy `dataQualitySnapshot` shape.

3. Candidate-generation logic must not be tightened/relaxed by this packet.
   - Re-run Today Review service invariants:
     - existing trusted-universe inclusion/exclusion checks are unchanged (`NO_REVIEW`, `CONFIGURED_PARTIAL`, `trustedLoadStatus` transitions);
     - strategy exit/risk, trade-plan blockers, and hard gate precedence remain the only deterministic promotion blockers;
     - no candidate-count expansion or contraction caused by newly surfaced DQ tiers unless explicitly documented elsewhere.
   - In read-only UI/API smoke, no candidate count or run state should change just because tier fields are present.

4. Downstream gate policy cannot relax in this pass.
   - `FULL_REVIEW`/`LIMITED_REVIEW`/`NO_REVIEW` mapping in Today Review must remain aligned to Market Data output and not bypass `run.sourceSnapshot.reviewUniverse.mode`.
   - Any `LIMITED_REVIEW` or `NO_REVIEW` context must continue to reduce or suppress promotions according to existing `today-trade-review.service.ts` invariants.
   - `automation` remains blocked in DQ context display:
     - if shown, must be `BLOCKED`;
     - reason must include `PHASE0_AUTOMATION_NOT_AUTHORIZED`.

5. No broker-readiness or execution-ready copy may appear in read-only Today Review surfaces.
   - Reject any language implying order placement, live execution, or broker connection inside Today Review list/detail.
   - Accept only conservative planning/diagnostic wording (`research`, `review`, `proceed`, `blocked`, `limited`).

6. End-to-end contract integrity in evidence captures (IN/STOCK).
   - Market Data canonical trust output and Today Review snapshot must agree on:
     - `reviewMode`
     - `trustedCount`
     - `requiredDataThroughDate`
     - `storedDataThroughDate`
     - `trustedLoadStatus` and top exclusion reason summary semantics.

## Focused Backend/API Smoke (scoped to IN/STOCK, read-only)

Use an already running local app; no state changes are expected.

```bash
Invoke-RestMethod 'http://127.0.0.1:3000/api/v1/market-data/review-readiness-summary?region=IN&assetType=STOCK'
Invoke-RestMethod 'http://127.0.0.1:3000/api/v1/market-data/review-universe?region=IN&assetType=STOCK'
Invoke-RestMethod 'http://127.0.0.1:3000/api/v1/market-data/review-universe/instruments?region=IN&assetType=STOCK&limit=25&offset=0'
Invoke-RestMethod 'http://127.0.0.1:3000/api/v1/data-quality/summary?region=IN&assetType=STOCK'
Invoke-RestMethod 'http://127.0.0.1:3000/api/v1/data-quality/instruments?region=IN&assetType=STOCK&limit=50&offset=0'
Invoke-RestMethod 'http://127.0.0.1:3000/api/v1/today-review/latest?region=IN&assetType=STOCK'
Invoke-RestMethod 'http://127.0.0.1:3000/api/v1/today-review/runs?region=IN&assetType=STOCK&limit=5&offset=0'
```

If a run exists, inspect one candidate detail ID:

```bash
Invoke-RestMethod 'http://127.0.0.1:3000/api/v1/today-review/candidates/<candidateId>'
```

### API assertions to capture from the payloads
- `reviewMode` in market-data summary equals Today Review `run.reviewUniverseMode`.
- `sourceSnapshot.reviewReadiness.reviewMode` exists and matches `reviewUniverse.mode`.
- `scanFunnel.trustedLoadStatus` does not read `LOAD_FAILED` in `FULL_REVIEW`/`LIMITED_REVIEW` unless the warning path is active.
- Candidate payload includes context labels for limited/blocked states and context gaps.
- `dataQualitySnapshot.useCaseTiers.automation.status === 'BLOCKED'` if tier fields are available.
- No new mutation indicators (`run` actions, provider job triggers, repair requests) appear in read-only payload.

## Focused Unit/API Test Scope

- Backend smoke/guard tests (from implementation handoff):
  - `backend/tests/modules/today-trade-review/today-trade-review.service.test.ts`
  - `backend/tests/modules/today-trade-review/today-trade-review.controller.test.ts`
  - `backend/tests/modules/data-quality-engine/data-quality-engine.service.test.ts`
  - `backend/tests/modules/market-data-foundation/market-data.service.test.ts` or equivalent focused readiness tests

Recommended command pattern:

```bash
npm.cmd run test -- backend/tests/modules/today-trade-review/today-trade-review.service.test.ts backend/tests/modules/today-trade-review/today-trade-review.controller.test.ts backend/tests/modules/data-quality-engine/data-quality-engine.service.test.ts
```

## UI Smoke Checks (read-only, single Playwright instance)

Do not run this now; schedule in implementation handoff.

One Playwright-instance rule:
- Use exactly one instance and one worker for all UI checks in this packet:
  - `npm.cmd run test:ui -- today-trade-review.spec.ts --project=chromium --workers=1 --reporter=list`

UI evidence targets:
- Today Trade Review page shows trusted-data mode/counters and scan-funnel status.
- Read-only DQ context (legacy-safe) is visible on run and candidate surfaces without changing tab/group behavior.
- `NO_REVIEW` and `LIMITED_REVIEW` are shown with zero-promotion messaging.
- Candidate detail shows context/breakdown but no actionability escalation.

## Rejection Triggers

- `reviewMode` mismatch between Market Data summary and Today Review snapshot.
- Missing or absent `reviewUniverseMode` in Today Review run while context snapshot exists.
- Automation shown as anything except blocked, or reason does not include `PHASE0_AUTOMATION_NOT_AUTHORIZED`.
- Candidate counts, state totals, or promotion counts changing when only DQ tier context is introduced.
- Any new broker/execution wording (`buy`, `order`, `execute`, `live`, `broker`, `authorized`) on Today Review UI copy.
- `scanFunnel.trustedLoadStatus === 'LOAD_FAILED'` for partial scan runs without corresponding warning.
- Candidate generation path now requiring DQ tier fields (`useCaseTiers` or `tierEvidence`) for promotion.

## Required Evidence (deliverable artifacts)

- Captured JSON dumps of all seven API smoke endpoints above (or explicit â€œno-runâ€ proof with timestamped body).
- Test run output of focused backend service/controller tests with pass/fail and test names.
- Optional Playwright screenshot(s)/trace for:
  - full and limited modes,
  - no-review mode,
  - candidate detail with automation blocker context.
- Rejection log if any trigger above occurs.

## Blockers

- Blocked until `P0.2A` (DQ tier contract) and `P0.2B` (DQ UI tier visibility) are stable and runtime evidence is available.
- If no persistent Today Review run exists for `IN / STOCK`, readiness/panel checks must use an orchestrator-managed seeded run; otherwise API-only read-only assertions are partial.
- Any API smoke requiring auth (e.g., today-review endpoints) requires a valid session token from the test environment.


