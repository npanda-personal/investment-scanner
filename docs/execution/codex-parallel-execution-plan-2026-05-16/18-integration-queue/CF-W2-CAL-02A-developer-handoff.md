# CF-W2-CAL-02A Developer Handoff

Date: 2026-05-25  
Owner: Team 06 - Strategy / Signal / Risk  
Lane / Module: Lane 2 / `signal-calibration-engine`  
Work item: `CF-W2-CAL-02A` - scoped evidence-basis projection  
Branch: `codex/team06-strategy-signal/CF-W2-CAL-02A`  
Worktree: `C:\work\repo\investment-scanner-worktrees\team06-CF-W2-CAL-02A`  
Base commit: `4519b14`  
Mode: Implemented in bounded reservation, no commit

## Exact Files Changed

- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.service.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.types.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.md`
- `backend/tests/modules/signal-calibration-engine/signal-calibration-engine.service.test.ts`
- `frontend/src/features/signal-calibration-engine/types.ts`
- `frontend/src/features/signal-calibration-engine/hooks/useSignalCalibrationEngine.ts`
- `frontend/src/features/signal-calibration-engine/components/SignalCalibrationEnginePage.tsx`
- `frontend/tests/ui/signal-calibration-engine.spec.ts`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-06-CF-W2-CAL-02A-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W2-CAL-02A-developer-handoff.md`

## Exact Files Inspected

- Required assignment and contract docs listed in Team 06 inbox + Ready promotion
- Allowed backend/frontend calibration files
- `backend/src/modules/signal-quality-lab/signal-quality-lab.types.ts` (read-only basis fields verification)

## Behavior Delivered

1. Added additive evidence-basis projection on calibration rows:
   - `calibrationEvidence.evidenceBasis.status`
   - `signalQualityGeneratedAt`
   - `latestMeasurablePriceDate`
   - `nextEvaluableDate`
   - `reasonSummary`
2. Added additive scoped `pageSummary` to `PaginatedCalibrationResponse` from `/signals/calibration/top`:
   - selected scope (`region`, `assetType`, `horizon`)
   - `itemsOnPage`, `totalScopedRows`
   - scoped `calibrationEvidence` + `calibrationReadiness`
3. Preserved row `generatedAt` as calibration generation timestamp; evidence-through remains separate.
4. Frontend now uses scoped `pageSummary` from `/top` for summary cards/banners and no longer derives page state from:
   - unscoped `/signals/calibration/health`
   - first-row proxies (`items[0]` and first warning/blocker row).
5. Compare/list row parity preserved by using the same evidence-basis projection inputs from Signal Quality summary.
6. Fail-closed behavior preserved when Signal Quality evidence is missing.

## Contract Notes

- Additive only; backward compatible:
  - optional `pageSummary` on `PaginatedCalibrationResponse`
  - `CalibrationEvidenceBasis` and nested `calibrationEvidence.evidenceBasis`
- No route schema or repository contract rewrite.

## Tests Run

- `cd backend && npm.cmd test -- signal-calibration-engine.service.test.ts --runInBand` ✅
- `cd backend && npm.cmd run build` ✅
- `cd frontend && npm.cmd run build` ✅
- `cd frontend && npm.cmd run test:ui -- signal-calibration-engine.spec.ts --workers=1` ❌ blocked (`spawn EPERM`)
- Required phrase scan command ✅ (one pre-existing safe-language match only)

## Tests Skipped / Blocked

- Playwright blocked in sandbox with worker process spawn restriction (`EPERM`).
- Escalation request (`require_escalated`) for this exact test command was auto-rejected by approvals reviewer.

## Forbidden-Scope Confirmation

No forbidden file or scope was modified:

- no calibration repo/controller/router/validation/module/index changes
- no backend/frontend route registry changes
- no Signal Quality/Data Quality/Market Data source or test edits
- no Prisma/schema/migrations/generated edits
- no package manifest/lockfile edits
- no shared backend utility/shared frontend component edits
- no provider/live/scheduler/worker/queue/startup/backfill edits

## Assumptions

- Optional `pageSummary` is acceptable as additive contract to avoid repository-layer edit requirements outside reservation.

## Residual Risks / Blockers

- UI smoke is the only blocked validation step; functional changes are covered by backend unit tests and both builds.
- Team 04 should rerun Playwright in an environment permitting process spawn.

## Next Gate

Team 04 QA Verification.

---

## Remediation Addendum - Team 10 Rejection Closure (2026-05-25)

Mode: Rework complete within original CAL allowed-file reservation

### Rejection Items Closed

1. Stale scoped summary on `/top` failure
   - Updated:
     - `frontend/src/features/signal-calibration-engine/hooks/useSignalCalibrationEngine.ts`
   - On `/top` failure, hook now fail-closes `pageSummary` for the requested scope/horizon and clears rows/counts.
   - Prevents stale readiness/evidence/warning/blocker cards from previous successful scope responses.

2. Compare/list evidence-basis parity
   - Updated:
     - `backend/src/modules/signal-calibration-engine/signal-calibration-engine.service.ts`
   - `compare(...)` summary lookup now uses visible scoped filters only (`region`, `assetType`, `horizon`) and does not add hidden signal `sector`/`country`.
   - compare/top summary sourcing now goes through a shared summary query helper.

### Additional Evidence

- Backend test updates:
  - `backend/tests/modules/signal-calibration-engine/signal-calibration-engine.service.test.ts`
  - Added assertion that compare/top use the same summary query shape under the same scope/horizon.
- Frontend UI updates:
  - `frontend/tests/ui/signal-calibration-engine.spec.ts`
  - Added failure-after-success scenario proving `/top` failure resets summary state fail-closed.
- Module docs:
  - `backend/src/modules/signal-calibration-engine/signal-calibration-engine.md`
  - Added scope-basis parity note for compare/list evidence-basis sourcing.

### Validation (Remediation Pass)

- `cd backend && npm.cmd test -- signal-calibration-engine.service.test.ts --runInBand` -> pass (`27` tests)
- `cd backend && npm.cmd run build` -> pass
- `cd frontend && npm.cmd run build` -> pass
- Phrase scan command from ready promotion -> pass (safe guardrail match only)
- Playwright focused smoke:
  - shared-base run: environment noise (artifact permission/stale shared server)
  - isolated run on `127.0.0.1:5174`:
    - `npm.cmd run test:ui -- signal-calibration-engine.spec.ts --workers=1` -> pass (`2` tests)

### Risks / Assumptions

- Shared default Playwright base URL environment remains non-deterministic; isolated local frontend evidence is used for this packet.

### Next Gate

Team 04 QA re-verification.
