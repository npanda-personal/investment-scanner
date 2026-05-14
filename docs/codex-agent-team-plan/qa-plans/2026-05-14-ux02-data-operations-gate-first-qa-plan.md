# UX-02 Data Operations Gate-First UX QA Plan

Date: 2026-05-14
Mode: QA Verification Planning Mode
Work item: `UX-02 - Data operations gate-first UX`
Status: QA plan draft (planning only)

## 1) Scope

Validate UX-02 only:

- Market Data Foundation trust/signoff/readiness header as a single operational gate.
- Bounded repair/backfill/run visibility and evidence-first summaries.
- Blocker-first diagnostics ordering and clarity.
- Data Quality readiness tier display and readiness copy.
- Safe action availability in blocked vs executable states.
- No misleading broker/provider readiness claims.

Out of scope:

- Backend logic changes.
- New Playwright fixture generation.
- Full provider/broker execution, full-universe repair jobs, and scheduler stress.

## 2) Source Materials

- `docs/codex-agent-team-plan/ux-roadmaps/2026-05-14-ux-associate-synthesis-and-po-review.md`
- `docs/codex-agent-team-plan/ux-audits/2026-05-14-associate-ux-data-operations-audit.md`
- `backend/src/modules/market-data-foundation/market-data-foundation.md`
- `backend/src/modules/data-quality-engine/data-quality-engine.md`
- `docs/codex-agent-team-plan/qa-plans/2026-05-14-p0-2a-data-quality-tier-contract-qa-checklist.md`
- `docs/codex-agent-team-plan/qa-plans/2026-05-14-p0-2b-data-quality-ui-tier-visibility-qa-checklist.md`

## 3) QA Rule (one Playwright instance only)

- Use a single Playwright invocation for all UX-02 UI checks.
- Set `--workers=1` and do not run parallel Playwright processes for this packet.
- Keep one browser-instance lifecycle for all UX-02 verification.

## 4) Focused Verification Matrix

### 4.1 Market Data trust/signoff header

- Verify a gate-first strip appears before secondary diagnostics and includes:
  - scope,
  - `trustStatus`,
  - `universeSignoff.status`,
  - `downstreamAllowed`,
  - and explicit next action.
- Verify blocked/non-pass states are visually distinct from success and not shown as green-ready.

### 4.2 Bounded repair/backfill progress

- Verify batch-driven progress shows meaningful buckets (processed/evaluated/ skipped/ failed / warning where present).
- Verify every run action emits bounded scope fields (`region`, `assetType`, `batchSize`, `offset`, bounded batch limits and mode where supported).
- Verify partial/blocked run outcomes are surfaced as partial states and do not pretend to be complete trust.

### 4.3 Blocker-first diagnostics

- Verify blocker list/cards appear before non-blocking informational states.
- Verify each blocker surfaces category, affected count, severity/impact, and next action.
- Verify blocked reasons preserve retry/manual/progress distinctions (`retry-blocked`, `manual-required`, `retry-eligible`, `recently-attempted`) where available.

### 4.4 Data Quality tier readiness display

- Verify per-use-case tier visibility is present (where contract is available): `dailyReview`, `signal`, `backtest`, `calibration`, `automation`.
- Verify tier rendering is distinct from generic score chips/text.
- Verify `automation` remains blocked with phase-zero policy rationale.

### 4.5 Safe action availability

- Verify blocked states disable or gate actions with explicit reason text.
- Verify no action is shown as enabled if prerequisites are not met.
- Verify run buttons are disabled during in-flight action and reflect current run progress.

### 4.6 No misleading broker/provider readiness claims

- Verify no section claims broker/execution readiness from generic market-data trust strings.
- Verify provider support labels are scoped and not conflated with downstream permission.
- Verify there is no copy implying readiness for automation or trading without explicit blocked state and policy reason.

## 5) Focused UI Execution by Module

- Market Data Foundation module: `frontend/tests/ui/market-data-foundation.spec.ts`
- Data Quality module: `frontend/tests/ui/data-quality-engine.spec.ts`
- Shared primitives: `frontend/src/shared/components/BatchProgressBar.tsx`, `frontend/src/shared/components/DataTable.tsx`, `frontend/src/shared/components/PageHeader.tsx`

## 6) Exact Verification Commands

From `frontend`:

- `cd frontend`
- `npm.cmd run test:ui -- market-data-foundation.spec.ts data-quality-engine.spec.ts --workers=1 --project=chromium --reporter=list`

From `backend`/runtime evidence capture:

- `cd backend`
- `npm.cmd run test -- tests/modules/market-data-foundation tests/modules/data-quality-engine --runInBand`

## 7) API Smoke Expectations (read-only, IN/STOCK scoped)

Base: `127.0.0.1:3000`

### Market Data contracts

- `Invoke-RestMethod 'http://127.0.0.1:3000/api/v1/market-data/universe/health?region=IN&assetType=STOCK'`
- `Invoke-RestMethod 'http://127.0.0.1:3000/api/v1/market-data/review-readiness-summary?region=IN&assetType=STOCK'`
- `Invoke-RestMethod 'http://127.0.0.1:3000/api/v1/market-data/review-universe?region=IN&assetType=STOCK'`
- `Invoke-RestMethod 'http://127.0.0.1:3000/api/v1/market-data/review-universe/instruments?region=IN&assetType=STOCK&limit=25&offset=0'`
- `Invoke-RestMethod 'http://127.0.0.1:3000/api/v1/market-data/universe/repair-plan?region=IN&assetType=STOCK'`
- `Invoke-RestMethod 'http://127.0.0.1:3000/api/v1/market-data/universe/repair-runs/latest?region=IN&assetType=STOCK'`
- `Invoke-RestMethod 'http://127.0.0.1:3000/api/v1/market-data/universe/repair-workbench?region=IN&assetType=STOCK'`

### Data Quality contracts

- `Invoke-RestMethod 'http://127.0.0.1:3000/api/v1/data-quality/summary?region=IN&assetType=STOCK'`
- `Invoke-RestMethod 'http://127.0.0.1:3000/api/v1/data-quality/instruments?region=IN&assetType=STOCK&limit=25&offset=0'`
- `Invoke-RestMethod 'http://127.0.0.1:3000/api/v1/data-quality/signal-readiness?region=IN&assetType=STOCK'`
- `Invoke-RestMethod 'http://127.0.0.1:3000/api/v1/data-quality/liquidity?region=IN&assetType=STOCK'`
- `Invoke-RestMethod 'http://127.0.0.1:3000/api/v1/data-quality/instruments/<IN_SCOPE_STOCK_ID>'`

For each response:

- confirm scope remains `IN/STOCK`,
- confirm bounded pagination/limits are respected where present,
- confirm API payload state and UI gate expectations are consistent.

## 8) Visual and Density Checks

Routes (single visual artifact run):

- `/market-data-foundation`
- `/market-data-foundation?tab=data-health`
- `/market-data-foundation?tab=import-backfill`
- `/data-quality`

Checks:

- header/action strip remains readable and dense (no overlap),
- trust gate appears before diagnostics,
- filter and action rows remain usable across desktop and tablet widths,
- bounded progress rows are readable and do not appear as indefinite single-color spinners.

## 9) Rejection Triggers

- Missing or weak single gate strip in Market Data trust/signoff.
- Blockers hidden behind non-blocking states.
- Any action emits unbounded run payloads from UI controls.
- Tiers collapsed into one generic score without per-use-case visibility.
- `automation` rendered as ready/authorized/equivalent.
- Blocked actions shown as enabled without reason copy.
- Any copy implying broker/provider readiness translates to downstream action readiness.
- Visual regressions: overflow, illegible dense controls, or action/diagnostic hierarchy inversion.

## 10) Blockers

- Blocked overlap with `P0.2B Data Quality UI Tier Visibility`:
  - Data-Quality tier UI ordering and rendering checks are pending.
  - Use-case tier evidence copy and tier-only rejection scenarios are pending.
  - These checks resume only after P0.2B release/handoff.
- QA remains blocked until runtime evidence and IN/STOCK fixtures are available for safe scoped replay.

## 11) Exit Criteria

UX-02 is complete when:

- section 4 matrix items that are not blocked pass,
- API smoke in section 7 is stable and consistent,
- visual checks in section 8 are accepted,
- and no active rejection trigger exists.
