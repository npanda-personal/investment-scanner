# CF-W1-RH-01A QA Plan

Date: 2026-05-26

Owner: Team 04 QA Factory

Status: QA plan prepared from current `research-hub` source, architecture review, contract, work packet, and requirement evidence. This packet is QA-plan ready for Team 00 Ready evaluation only. No executable QA was run in this docs-only pass.

## QA Intent

`CF-W1-RH-01A` closes a narrow Research Hub trust gap: the actionability contract already carries per-dimension `evidenceDate`, but the current service leaves those values unwired and the current page does not show them. QA for this child must prove that only truthful dimension-owned dates become visible, while date-unknown dimensions remain explicitly null and conservative.

## Scope

Planned validation for one bounded Research Hub backend + feature-local frontend slice only.

Allowed implementation/test/doc files after Team 00 Ready promotion:

- `backend/src/modules/research-hub/research-hub.service.ts`
- `backend/src/modules/research-hub/research-hub.md`
- `backend/tests/modules/research-hub/research-hub.service.test.ts`
- `frontend/src/features/research-hub/components/ResearchOverviewPage.tsx`
- `frontend/tests/ui/research-hub.spec.ts`

Out of scope:

- `backend/src/modules/research-hub/research-hub.types.ts`
- `backend/src/modules/research-hub/research-hub.controller.ts`
- `backend/src/modules/research-hub/research-hub.router.ts`
- `backend/src/modules/research-hub/index.ts`
- `frontend/src/features/research-hub/api/researchHubApi.ts`
- `frontend/src/features/research-hub/hooks/useResearchOverview.ts`
- `frontend/src/features/research-hub/index.tsx`
- route registries
- shared UI/components
- shared backend utilities
- upstream module source/tests
- Prisma/schema/migrations/generated files
- package manifests
- provider/live-data, telemetry, broker, paid/cloud, or startup/backfill work

## Current Source Alignment

Planning evidence from current source:

- `backend/src/modules/research-hub/research-hub.types.ts` already exposes `evidenceDate?: string | null`.
- `frontend/src/features/research-hub/api/researchHubApi.ts` already exposes the same field to the UI.
- `backend/src/modules/research-hub/research-hub.service.ts` still uses placeholder `unstableDimension(...)` wiring for `signalEvidence`, `calibrationReadiness`, `todayReviewReadiness`, and `tradePlanReadiness`, and does not set `evidenceDate` on any dimension.
- `frontend/src/features/research-hub/components/ResearchOverviewPage.tsx` renders tile label, status, module, and message, but currently does not render `evidenceDate`.
- `frontend/tests/ui/research-hub.spec.ts` currently mocks dimensions without date assertions, so UI smoke must be updated if the packet is implemented.

## Acceptance Matrix

| Area | Scenario | Expected acceptance result |
| --- | --- | --- |
| Backend mapping | `marketEnvironment` has market gate `updatedAt` | `evidenceDate` is populated from `marketGate.updatedAt` only. Status semantics stay unchanged. |
| Backend mapping | `signalEvidence` has Signal Quality summary `generatedAt` | `evidenceDate` is populated from Signal Quality summary `generatedAt` only when the public summary read succeeds. Status does not upgrade to `READY` from date presence alone. |
| Backend mapping | `todayReviewReadiness` has latest run `finishedAt` | `evidenceDate` uses `run.finishedAt`. |
| Backend mapping | `todayReviewReadiness` lacks `finishedAt` but has `sourceSnapshot.generatedAt` | `evidenceDate` falls back to `run.sourceSnapshot.generatedAt` only when a latest run exists. |
| Backend mapping | `tradePlanReadiness` has funnel diagnostics `generatedAt` | `evidenceDate` is populated from funnel diagnostics `generatedAt` only. |
| Null preservation | `dataReadiness` on current base | `evidenceDate` remains `null`. No proxy date is inferred from overview `generatedAt`, market gate time, or any shared timestamp. |
| Null preservation | `strategyProof` on current base | `evidenceDate` remains `null`. No blended proof date is invented. |
| Null preservation | `calibrationReadiness` on current base | `evidenceDate` remains `null` pending `CF-W2-CAL-02A` or later accepted calibration-basis work. |
| Failure handling | any allowed upstream public read is unavailable or throws | Affected dimension fails closed to `evidenceDate: null` and keeps conservative, explicit basis-missing copy. |
| Frontend rendering | dimension has a present `evidenceDate` | The Research Hub actionability tile renders a visible evidence date in feature-local UI. |
| Frontend rendering | dimension has `evidenceDate: null` | The tile suppresses the date line. No fallback timestamp is shown. |
| Language guard | date is shown on limited or insufficient dimension | Copy remains research-support only and does not imply advice, target, reward/risk, or execution readiness. |
| Contract safety | implemented slice | `/api/v1/research/overview` shape, dimension order, and existing actionability keys remain unchanged. |

## Required QA Assertions

- Evidence date must be dimension-specific, not copied from outer `generatedAt`.
- One upstream timestamp must not be reused across multiple dimensions unless the contract explicitly allows that exact dimension source.
- `signalEvidence`, `todayReviewReadiness`, and `tradePlanReadiness` may show dates while remaining `LIMITED` or `INSUFFICIENT_DATA`.
- `dataReadiness`, `strategyProof`, and `calibrationReadiness` must stay date-null on the current base.
- Existing research-support semantics must remain intact:
  - no buy/sell wording
  - no target-price wording
  - no reward/risk or R:R framing
  - no broker, order, automation, or execution wording
- Scope query behavior on the page must remain intact with `region` and `assetType`.

## Focused Commands

Commands below are required later after Team 00 Ready promotion and bounded implementation handoff. They were not run in this planning pass.

```powershell
cd backend
npm.cmd run build
```

```powershell
cd backend
npm.cmd test -- research-hub --runInBand
```

```powershell
cd frontend
npm.cmd run build
```

```powershell
cd frontend
npm.cmd run test:ui -- research-hub.spec.ts --workers=1
```

Optional language-hygiene scan after implementation:

```powershell
rg -n "buy now|sell now|must buy|must sell|price target|profit target|reward/risk|risk:reward|R:R|guaranteed|broker|order|execute|automation" backend/src/modules/research-hub backend/tests/modules/research-hub frontend/src/features/research-hub frontend/tests/ui/research-hub.spec.ts
```

## Exact Rejection Conditions

Reject the future implementation handoff if any of the following occurs:

- any file outside the allowed five-file reservation is changed
- `backend/src/modules/research-hub/research-hub.types.ts` or `frontend/src/features/research-hub/api/researchHubApi.ts` is modified even though the field already exists
- route registries, shared UI, shared backend utilities, upstream modules, Prisma/schema/generated files, package manifests, or provider/live-data files are touched
- `dataReadiness`, `strategyProof`, or `calibrationReadiness` receives any non-null `evidenceDate` on the current base
- a shared overview timestamp or another dimension's timestamp is copied into a different dimension
- date presence upgrades a conservative dimension to `READY` without separate accepted logic
- the UI invents a fallback date when `evidenceDate` is null
- the page loses scoped `region` / `assetType` request behavior
- copy introduces advice-like, target-like, reward/risk, broker, order, or execution wording
- implementation widens into `CF-W1-RH-01`, `CF-W1-RH-02A`, or `CF-W1-RH-03` scope instead of staying inside this evidence-date child

## Evidence Required Later

- exact changed-file list proving the reservation stayed bounded
- focused backend service-test output proving the allowed date-source mappings
- focused UI smoke output proving visible date rendering and null-date suppression
- build outputs for backend and frontend
- explicit note that `dataReadiness`, `strategyProof`, and `calibrationReadiness` stayed date-null
- explicit note that language remained research-support only

## Tests Run

- none

## Tests Skipped

- `cd backend && npm.cmd run build`
- `cd backend && npm.cmd test -- research-hub --runInBand`
- `cd frontend && npm.cmd run build`
- `cd frontend && npm.cmd run test:ui -- research-hub.spec.ts --workers=1`

## Skipped-Test Reason

Docs-only QA planning pass. No implementation handoff exists yet, and the assignment restricted work to active execution docs only.

## Ready Recommendation

Recommendation: `READY FOR TEAM 00 PROMOTION` as one bounded Research Hub backend + feature-local frontend child, provided Team 00 enforces the exact five-file writer reservation and keeps the packet out of parallel overlap with other active `RH-*` work.
