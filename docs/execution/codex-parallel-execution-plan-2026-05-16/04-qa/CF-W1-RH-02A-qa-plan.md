# CF-W1-RH-02A QA Plan

Date: 2026-05-19

Owner: Team 04 QA Factory

## Status

QA-READY for Team 00 Ready evaluation as a docs-only QA plan.

Executable QA remains blocked until Team 00 promotes a single Research Hub implementation handoff stacked on accepted `CF-W1-RH-01` baseline commit `fd88c62`, or on a later `dev` head that already contains `fd88c62`.

Current `dev` does not contain `fd88c62` (`git merge-base --is-ancestor fd88c62 HEAD` returned not ancestor during QA planning), so implementation from the current unstacked main workspace must be rejected.

## Inputs Reviewed

- Root `AGENTS.md`
- `03-architecture/CF-W1-RH-02A-architecture-review.md`
- `06-contracts/CF-W1-RH-02A-research-hub-what-changed-fail-closed-basis-contract.md`
- `08-work-packets/CF-W1-RH-02A-work-packet.md`
- `10-requirements/CF-W1-RH-02A-research-hub-what-changed-fail-closed-basis-requirement.md`
- `10-requirements/refinement-queue.md`
- `12-ready-queue/ready-for-implementation.md`
- `00-control/team-agent-runtime-queue.md`
- `17-team-outboxes/TEAM-03-architecture-factory.md`
- Accepted `CF-W1-RH-01` baseline commit `fd88c62`
- `fd88c62` QA evidence and PO acceptance packet
- Current Research Hub backend service/types/docs/tests
- Current Research Hub frontend API/page/UI smoke

## QA Intent

Prove that Research Hub no longer presents current review candidates as if they came from an auditable prior comparison basis.

`CF-W1-RH-02A` must fail the `whatChanged` comparison basis closed when prior Research Hub overview history is unavailable. It must not create a surrogate basis from Today Review, current `tradeCandidates`, or any mismatched upstream output.

## Required Implementation Scope For Later QA

Allowed implementation files only:

- `backend/src/modules/research-hub/research-hub.service.ts`
- `backend/src/modules/research-hub/research-hub.types.ts`
- `backend/src/modules/research-hub/research-hub.md`
- `backend/tests/modules/research-hub/research-hub.service.test.ts`
- `frontend/src/features/research-hub/api/researchHubApi.ts`
- `frontend/src/features/research-hub/components/ResearchOverviewPage.tsx`
- `frontend/tests/ui/research-hub.spec.ts`

Forbidden scope:

- route registries, controllers, routers, feature hooks, feature index files
- Prisma schema, migrations, generated files, packages
- shared backend utilities or shared frontend components
- Today Review, Strategy Decision, Trade Plan, Market Context, Signal Quality, Signal Calibration, Smart Money, or other upstream module source/tests
- providers, live data, startup/backfill, scheduler, journal, durable overview snapshot, paid/cloud, broker, telemetry
- broad Research Hub UI redesign

## Required QA Assertions

Backend contract assertions:

- `whatChanged.comparisonBasis.status` is present and equals `UNAVAILABLE` when no auditable prior Research Hub basis exists.
- `comparisonBasis.comparedAgainstGeneratedAt = null` when basis is unavailable.
- `comparisonBasis.sourceModule = null` when basis is unavailable.
- `comparisonBasis.message` uses research-support wording and explains that no auditable prior Research Hub comparison basis is available.
- `newTradeCandidates = []` when basis is unavailable, even if current `tradeCandidates` are non-empty.
- `downgradedCandidates = []` when basis is unavailable.
- `marketGateChange = null` when basis is unavailable.
- Service tests prove current `tradeCandidates` are not sliced, relabeled, or self-compared as deltas.
- Service tests prove Today Review latest runs, persisted runs, or candidate rows are not used as a Research Hub prior-basis surrogate.

Frontend/API assertions:

- Frontend Research Hub API types include additive `comparisonBasis` metadata without removing existing `whatChanged` fields.
- `ResearchOverviewPage.tsx` does not render `No new review candidates since the last evaluation.` when basis is unavailable.
- The What Changed panel renders the backend-provided unavailable-basis message.
- Warnings can render with unavailable basis, but warnings do not imply hidden history, pending sync, or a real prior evaluation.
- Existing Research Hub UI smoke remains the required UI test surface and must verify the unavailable-basis copy.

Language assertions:

- Accept research-support language such as `comparison basis unavailable`, `auditable prior basis unavailable`, `review`, `candidate`, `warning`, `reason`, and `consider review`.
- Reject advice, execution, target, guarantee, broker, or automation wording, including `buy now`, `sell now`, `must buy`, `must sell`, `price target`, `profit target`, `guaranteed`, `execute`, `order`, and `broker`.

## Scenario Matrix

| Scenario | Required result |
| --- | --- |
| No prior Research Hub basis exists | `comparisonBasis.status = UNAVAILABLE`, date/source null, unavailable message present, delta fields suppressed. |
| Current trade candidates exist but no prior basis exists | Current candidates remain visible in normal Research Hub sections, but `whatChanged.newTradeCandidates` remains empty. |
| No trade candidates and no prior basis exists | UI shows unavailable-basis wording, not `since the last evaluation`. |
| Unavailable basis plus warnings | Warnings render as warnings only; they do not create delta claims. |
| Today Review data is available | Research Hub still does not use Today Review as a prior Research Hub comparison basis. |
| Current-list self-comparison attempted | QA rejects the implementation. |
| `AUDITABLE` path claimed | QA requires same-semantics, already-merged Research Hub public basis inside the reserved writer set; otherwise reject. |
| Scope drift | QA rejects schema, route, shared UI/utility, upstream-source, provider, package, live/startup/backfill, or durable-history widening. |

## Required Commands After Implementation

Run from the implementation branch/worktree after memory/resource check and Team 00 handoff:

```powershell
cd backend
npm.cmd test -- --runInBand --runTestsByPath tests/modules/research-hub/research-hub.service.test.ts
```

```powershell
cd frontend
npm.cmd run test:ui -- research-hub.spec.ts --workers=1
```

```powershell
cd backend
npm.cmd run build
```

```powershell
cd frontend
npm.cmd run build
```

Product-language and stale-copy scan:

```powershell
rg -n "since the last evaluation|buy now|sell now|must buy|must sell|price target|profit target|guaranteed|execute|order|broker" backend/src/modules/research-hub backend/tests/modules/research-hub frontend/src/features/research-hub frontend/tests/ui/research-hub.spec.ts
```

The scan may only pass with no implementation-surface hits. Test-only negative assertions are acceptable if explicitly identified in QA evidence.

## Evidence Required Later

- Team 00 sequencing note proving the implementation branch/worktree is stacked on `fd88c62` or a `dev` head containing it.
- Exact changed-file list limited to the allowed files.
- Focused backend service-test output proving unavailable basis, suppressed deltas, no current-list self-comparison, and no Today Review surrogate basis.
- Existing Research Hub UI smoke output proving unavailable-basis copy is visible and `since the last evaluation` is absent.
- Backend and frontend build results.
- Product-language scan result.
- Explicit confirmation that `RH-01` actionability evidence behavior from `fd88c62` remains preserved.
- Explicit confirmation that no schema, routes, shared files, package changes, providers/live/startup/backfill, upstream source/tests, or durable-history work occurred.

## Stop Conditions

Stop QA and return to Team 00 / Team 03 if:

- implementation starts from current unstacked `dev` without `fd88c62`;
- another Research Hub writer is active on the same backend files;
- the implementation uses Today Review or another upstream module as the comparison basis;
- the old `since the last evaluation` unavailable-basis copy remains;
- any forbidden scope is touched;
- an `AUDITABLE` path is claimed without same-semantics Research Hub basis evidence.

## QA Verdict

QA-READY for Team 00 Ready evaluation.

Ready-promotion recommendation: promote only after Team 00 records stacked-base sequencing on `fd88c62` or a `dev` head containing `fd88c62`, reserves the exact allowed files, and confirms no parallel Research Hub writer is active.
