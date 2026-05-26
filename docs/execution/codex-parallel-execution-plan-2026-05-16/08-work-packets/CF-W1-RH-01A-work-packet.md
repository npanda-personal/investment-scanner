# Work Packet: CF-W1-RH-01A Research Hub Evidence-Date Wiring

Date: 2026-05-26

## Status

Architecture-prepared.

Team 00 may send this packet to Team 04 for QA planning. Do not start implementation until Team 04 QA planning is complete and Team 00 records a Ready promotion.

## Requirement

Populate truthful per-dimension `evidenceDate` values on Research Hub actionability tiles where the current public basis already exists, keep `null` where it does not, and expose those dates in the existing Research Hub feature UI without widening the API shape.

## Recommended Owner

Team 08 or another Team 00-designated Research Hub owner for one bounded backend + feature-local frontend slice.

Recommended branch:

- `codex/team08-lane3/CF-W1-RH-01A`

Recommended worktree:

- `C:\work\repo\investment-scanner-worktrees\team08-CF-W1-RH-01A`

Recommended base:

- latest `dev` at Team 00 Ready promotion time, provided no other active Research Hub packet is reserving the same service/page/test files

## Allowed Files

- `backend/src/modules/research-hub/research-hub.service.ts`
- `backend/src/modules/research-hub/research-hub.md`
- `backend/tests/modules/research-hub/research-hub.service.test.ts`
- `frontend/src/features/research-hub/components/ResearchOverviewPage.tsx`
- `frontend/tests/ui/research-hub.spec.ts`

Allowed branch-local reporting docs after Ready promotion:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-08-CF-W1-RH-01A-implementation-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-RH-01A-developer-handoff.md`

## Forbidden Files

- `backend/src/modules/research-hub/research-hub.types.ts`
- `backend/src/modules/research-hub/research-hub.controller.ts`
- `backend/src/modules/research-hub/research-hub.router.ts`
- `backend/src/modules/research-hub/index.ts`
- `frontend/src/features/research-hub/api/researchHubApi.ts`
- `frontend/src/features/research-hub/hooks/useResearchOverview.ts`
- `frontend/src/features/research-hub/index.tsx`
- `backend/src/api/routes.ts`
- `frontend/src/app/routes.tsx`
- `frontend/src/app/HomePage.tsx`
- `frontend/src/features/daily-overview-dashboard/**`
- any `signal-position-ledger` source path if introduced elsewhere
- upstream module source/tests under:
  - `backend/src/modules/strategy-decision-engine/**`
  - `backend/src/modules/signal-quality-lab/**`
  - `backend/src/modules/today-trade-review/**`
  - `backend/src/modules/trade-plan-risk-engine/**`
  - `backend/src/modules/signal-calibration-engine/**`
- Prisma schema or migrations
- package manifests
- generated files
- shared UI components
- shared backend utilities
- provider/live-data files
- root `AGENTS.md`
- `docs/AGENTS.md`
- `docs/codex-agent-team-plan/**`

## Required Behavior

- `/api/v1/research/overview` stays the same route and the same public shape.
- `marketEnvironment.evidenceDate` uses market-gate `updatedAt` only.
- `signalEvidence.evidenceDate` uses Signal Quality summary `generatedAt` only when that public summary read succeeds.
- `todayReviewReadiness.evidenceDate` uses `latest.run.finishedAt`, falling back to `latest.run.sourceSnapshot.generatedAt` only when the run exists but `finishedAt` is absent.
- `tradePlanReadiness.evidenceDate` uses Trade Plan funnel diagnostics `generatedAt` only.
- `dataReadiness.evidenceDate` stays `null`.
- `strategyProof.evidenceDate` stays `null`.
- `calibrationReadiness.evidenceDate` stays `null` on the current base.
- Evidence-date presence must not make a conservative status read `READY`.
- The Research Hub actionability tile UI must render evidence date when present and omit it when absent.
- No buy/sell, target-price, reward/risk, broker, or execution wording is introduced.

## Validation

Run:

```text
cd backend
npm.cmd run build
npm.cmd test -- research-hub --runInBand

cd frontend
npm.cmd run build
npm.cmd run test:ui -- research-hub.spec.ts --workers=1
```

UI smoke expectations:

- the Research Hub page still loads on `/research`
- at least one mocked tile shows a visible evidence date
- mocked null-date tiles do not show a fabricated fallback date
- the actionability panel remains research-support only
- scope query params still include `region` and `assetType`

## Stop Conditions

Stop and return to Team 00 if implementation requires:

- route-registry edits
- shared UI changes
- backend or frontend type expansion
- upstream module source edits to expose dates
- calibration evidence-date wiring beyond the current `CF-W2-CAL-02A` boundary
- combining this packet with `CF-W1-RH-01`, `CF-W1-RH-02A`, or `CF-W1-RH-03` without an explicit combined writer reservation

## Known Limitations To Preserve

- `dataReadiness`, `strategyProof`, and `calibrationReadiness` still do not have a truthful dimension-owned evidence date on the current base.
- Signal, Today Review, and Trade Plan dimensions may still be `LIMITED` or `INSUFFICIENT_DATA` even when a date is present.
- Calibration evidence-through truth remains outside this child.
- The overview remains a section-live read, not one persisted atomic Research Hub snapshot.

## Dependency Notes

- Team 04 QA planning is required before Ready promotion.
- Team 00 must enforce single-writer ownership across all Research Hub packets touching the same file set.
- `CF-W2-CAL-02A` blocks only calibration evidence-date truth, not the rest of this packet.
