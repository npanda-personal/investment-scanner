# CF-W2-DOV-02 QA Plan

Date: 2026-05-26

Owner: Team 04 - QA Factory

Mode: Docs-only QA planning. No application source, tests, builds, services, providers, Prisma commands, UI smoke, live data, package manifests, route registries, shared UI/hooks, backend files, or implementation worktrees were modified.

## Work Item

`CF-W2-DOV-02` - Daily Overview calibration evidence-through summary.

## QA Verdict

`QA-PLAN READY AFTER DEPENDENCY-BASE VERIFICATION`

This packet is ready for Team 00 Ready evaluation only after Team 00 verifies that the chosen implementation base already contains accepted `CF-W2-DOV-01` commit `a371e2f` and accepted `CF-W2-CAL-02A` commit `1be7d1a`.

This is not Ready for implementation from the current plain `dev` base. Current repo inspection still shows no `frontend/src/features/daily-overview-dashboard/**` on the shared base, while the required accepted calibration evidence-basis child is recorded separately in execution docs.

## Scope

Docs-only QA planning for one bounded frontend-only Daily Overview consumer child.

Planned implementation scope, once Team 00 promotes an exact dependency-correct handoff:

- `frontend/src/features/daily-overview-dashboard/types.ts`
- `frontend/src/features/daily-overview-dashboard/api/dailyOverviewDashboardApi.ts`
- `frontend/src/features/daily-overview-dashboard/hooks/useDailyOverviewDashboard.ts`
- `frontend/src/features/daily-overview-dashboard/components/DailyOverviewDashboardPage.tsx`
- `frontend/src/features/daily-overview-dashboard/components/CalibrationEvidenceSummaryPanel.tsx`
- `frontend/tests/ui/daily-overview-dashboard.spec.ts`

Optional only if the accepted DOV-01 implementation already uses a feature-local placeholder component for this section:

- `frontend/src/features/daily-overview-dashboard/components/ComingSoonPanel.tsx`

Out of scope for this child:

- `frontend/src/app/HomePage.tsx`
- `frontend/src/app/routes.tsx`
- `frontend/src/app/navigationMetadata.tsx`
- all `frontend/src/shared/**`
- all `frontend/src/contexts/**`
- all `frontend/src/features/signal-calibration-engine/**`
- `frontend/tests/ui/signal-calibration-engine.spec.ts`
- all `backend/src/**`
- all `backend/tests/**`
- Prisma/schema/migrations/generated files
- package manifests and lockfiles
- provider/live/startup/backfill/scheduler/worker/queue files
- route registries

## Contract Inputs Reviewed

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/16-team-inboxes/TEAM-04-current-assignment.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W2-DOV-02-daily-overview-calibration-evidence-through-summary-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W2-DOV-02-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W2-DOV-02-daily-overview-calibration-evidence-summary-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W2-DOV-02-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-CF-W2-DOV-02-architecture-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/13-implementation-evidence/CF-W2-CAL-02A-ready-promotion.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/13-implementation-evidence/CF-W2-DOV-01-ready-promotion.md`
- current repo dependency-surface inspection:
  - `frontend/src/features/signal-calibration-engine/types.ts`
  - `frontend/src/features/signal-calibration-engine/api/signalCalibrationEngineService.ts`
  - `frontend/src/features/signal-calibration-engine/hooks/useSignalCalibrationEngine.ts`
  - `frontend/src/features/signal-calibration-engine/components/SignalCalibrationEnginePage.tsx`
  - `frontend/tests/ui/signal-calibration-engine.spec.ts`
  - `git rev-parse --verify a371e2f`
  - `git rev-parse --verify 1be7d1a`
  - repo file search for `frontend/src/features/daily-overview-dashboard/**`

## Current Dependency Reality

- The shared base being inspected still does not contain `frontend/src/features/daily-overview-dashboard/**`.
- The shared base does contain current `signal-calibration-engine` frontend files.
- Both dependency commits exist in git object history:
  - `a371e2f` -> `a371e2fe710b44e9fae5f13b6df601b32239f711`
  - `1be7d1a` -> `1be7d1a673db1d8615775c8f0872d0572535c64e`
- That is not sufficient by itself. Team 00 must verify that the actual implementation worktree HEAD already includes those accepted commits before opening DOV-02.

## Required Team 00 Dependency-Base Checks

Team 00 must verify all of the following on the chosen implementation branch/worktree before promoting DOV-02:

1. Commit ancestry check for accepted DOV-01:

```powershell
git merge-base --is-ancestor a371e2f HEAD
```

2. Commit ancestry check for accepted CAL-02A:

```powershell
git merge-base --is-ancestor 1be7d1a HEAD
```

3. Feature shell presence:
   - `frontend/src/features/daily-overview-dashboard/**` exists on the chosen base.
   - `frontend/tests/ui/daily-overview-dashboard.spec.ts` exists or is explicitly reserved to be created inside the bounded DOV-02 writer set.

4. Accepted DOV-01 parent placement is already present on the chosen base:
   - the Daily Overview page already has primary candidate-review content;
   - the calibration area is still placeholder-only or absent in a way that can be replaced feature-locally;
   - implementation does not require `frontend/src/app/HomePage.tsx`.

5. Accepted CAL-02A consumer truth is already present on the chosen base:
   - scoped page-summary truth exists on the calibration read path used by Daily Overview;
   - the calibration consumer surface exposes evidence-basis fields required by the DOV-02 contract:
     - `signalQualityGeneratedAt`
     - `latestMeasurablePriceDate`
     - `nextEvaluableDate`
     - readiness/status semantics compatible with `USABLE`, `LIMITED`, `UNAVAILABLE`
     - evidence status compatible with `MEASURED`, `HORIZON_LIMITED`, `MISSING_SIGNAL_QUALITY_EVIDENCE`

6. Team 00 must reject the base immediately if any of the above is false. DOV-02 must then return to dependency-base correction rather than widening into parent-shell or calibration-source work.

## Required QA Assertions

- Daily Overview consumes only accepted CAL-02A scoped page-summary truth.
- Daily Overview does not use `/signals/calibration/health`.
- Daily Overview does not use first-row, first-warning, first-blocker, or visible-row-count proxies.
- Scope label remains explicit and matches current `region / assetType`.
- Horizon label remains explicit and matches the section request.
- Evidence-through timing is distinct from row generation time.
- `Waiting` appears only when evidence is horizon-limited and maturity is pending.
- `Unavailable` appears when accepted CAL-02A evidence is missing or the summary fetch fails.
- Missing accepted CAL-02A evidence fails closed instead of inventing usable/limited data.
- Panel placement remains below primary Daily Overview candidate-review content.
- Drillthrough goes to `/signals/calibration` without inventing cross-page sync promises.
- User-facing wording remains research-support only.

## Scenario Matrix

| Scenario | Expected QA assertion after implementation |
| --- | --- |
| Measured evidence available | Summary shows explicit scope, explicit horizon, `Usable` or `Limited` per calibration-owned semantics, and evidence-through date sourced from `latestMeasurablePriceDate`, not row `generatedAt`. |
| Horizon-limited evidence | Summary shows `Waiting`, visible `Waiting for maturity` wording, and `nextEvaluableDate`; it must not imply current measured evidence. |
| Missing Signal Quality evidence | Summary shows `Unavailable`; page does not infer status from row counts, row score, or stale module health. |
| Section-local fetch failure | Calibration summary area shows explicit unavailable/failure state while the rest of Daily Overview remains usable. |
| Dependency-missing base | The chosen base must not ship invented output; the section remains truthful placeholder-only or the packet is rejected before implementation. |
| Placement and hierarchy | Calibration summary renders below the primary candidate-review sections and does not become first-viewport identity. |
| Language safety | No advice, target, reward/risk, broker/execution, or Trade Plan-first wording appears in panel copy, tooltips, or tests. |

## Focused Command Guidance

Commands below are recommendations only. They were not run during this docs-only QA planning task.

Required frontend build after Team 00 promotes a dependency-correct implementation handoff:

```powershell
cd frontend
npm.cmd run build
```

Required focused UI smoke:

```powershell
cd frontend
npm.cmd run test:ui -- daily-overview-dashboard.spec.ts --workers=1
```

Required focused language guard:

```powershell
rg -n "buy now|sell now|must buy|must sell|target price|price target|profit target|reward/risk|R:R|trade plan|best trade|broker|execute order|place order|guaranteed|financial advice" frontend/src/features/daily-overview-dashboard frontend/tests/ui/daily-overview-dashboard.spec.ts
```

## Exact Reject Conditions

Reject the future implementation handoff immediately if any of the following is true:

- Team 00 cannot prove the chosen worktree HEAD contains accepted `a371e2f` and accepted `1be7d1a`.
- `frontend/src/features/daily-overview-dashboard/**` is absent on the chosen base and DOV-02 would need to reopen parent-shell work.
- implementation touches any forbidden file, including:
  - `frontend/src/app/HomePage.tsx`
  - any `frontend/src/app/routes.tsx` or `frontend/src/app/navigationMetadata.tsx`
  - any `frontend/src/shared/**`
  - any `frontend/src/contexts/**`
  - any `frontend/src/features/signal-calibration-engine/**`
  - `frontend/tests/ui/signal-calibration-engine.spec.ts`
  - any backend file or backend test
  - Prisma/schema/migrations/generated files
  - package manifests and lockfiles
  - provider/live/startup/backfill/scheduler/worker/queue files
  - route registries
- the summary consumes `/signals/calibration/health`.
- the summary consumes `items[0]`, first warning rows, first blocker rows, or visible-row counts as proxy truth.
- scope or horizon labels are missing, ambiguous, or inconsistent with the request made by the panel.
- evidence-through date is taken from row `generatedAt` or otherwise merged with row generation time.
- `Waiting` is shown without a truthful horizon-limited maturity basis.
- `Unavailable` or dependency-missing states are replaced by guessed usable/limited content.
- panel placement moves above primary Daily Overview candidate-review content.
- implementation introduces advice, target, reward/risk, broker/execution, or Trade Plan-first language.
- implementation widens into backend, route registry, schema/storage, shared UI/hooks, calibration source/test, package/generated, or provider/live scope.

These are hard rejection conditions for the bounded DOV-02 child, not soft warnings.

## Stop Conditions

Stop QA and return the packet to Team 00 / Architect if:

- the chosen base fails either dependency commit ancestry check;
- the chosen base lacks accepted DOV-01 feature files;
- the chosen base lacks accepted CAL-02A evidence-basis consumer fields;
- truthful implementation would require `HomePage.tsx`, calibration feature source/test edits, backend work, shared UI/hooks, route-registry changes, schema/storage/generated types, or package changes.

## Evidence Required Later

- developer handoff naming exact files changed and inspected
- proof of Team 00 dependency-base verification
- frontend build output
- Playwright output for `daily-overview-dashboard.spec.ts`
- focused language-guard output
- UI proof that summary renders below primary candidate-review content
- explicit proof that no `/signals/calibration/health` fallback was used
- explicit proof that measured evidence uses evidence-through date, not row generation time
- skipped checks and reasons
- known limitations

## Tests Run In This QA Planning Pass

- none

## Tests Skipped In This QA Planning Pass

- `cd frontend; npm.cmd run build`
- `cd frontend; npm.cmd run test:ui -- daily-overview-dashboard.spec.ts --workers=1`
- focused language guard over `frontend/src/features/daily-overview-dashboard` and `frontend/tests/ui/daily-overview-dashboard.spec.ts`

Skipped because this was a docs-only QA planning pass and the assignment explicitly forbids running builds, tests, services, providers, Prisma commands, UI smoke, and live data.

## Blockers

No Team 04 planning blocker remains.

Executable QA remains blocked until:

- Team 00 verifies a dependency-correct base that already contains accepted `CF-W2-DOV-01` and accepted `CF-W2-CAL-02A`;
- Team 00 promotes one exact bounded frontend-only implementation handoff;
- the implementation handoff stays within the reserved DOV-02 writer set.

## Next Team 00 Action

Do not mark this item Ready for implementation from plain `dev`.

Team 00 should:

1. verify the chosen implementation worktree HEAD includes both accepted dependency commits;
2. verify `daily-overview-dashboard` files already exist on that base;
3. verify accepted CAL-02A evidence-basis fields already exist on the calibration consumer read path used by DOV;
4. copy the exact allowed and forbidden writer sets into the Ready record;
5. state the packet only as `QA-plan ready after dependency-base verification`, not as independently Ready.
