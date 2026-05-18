# CF-W1-L3-TREV-01 QA Plan

Date: 2026-05-18

Owner: Team 04 QA Factory

Status: Child QA plan prepared for the bounded first slice. Executable QA remains blocked until Team 00 promotes exact file reservations and an implementation handoff exists.

Current status refresh: Team 03 prepared the Today Review publication-evidence requirement, architecture review, contract, and work packet on 2026-05-18. Team 04 accepts this QA plan as planning evidence only. It does not approve application source edits, test execution, builds, UI smoke, or Ready promotion by itself.

## Scope

Validation plan for Today Review run/list publication evidence and readiness-coherence normalization inside the `today-trade-review` module and feature.

Bounded first-slice coverage:

- run/list publication evidence for Today Review latest run and run history/read surfaces;
- readiness coherence between persisted Today Review run snapshot and Market Data review-readiness summary;
- publish, limited-publication, and suppress explanations;
- legacy-read-path synthesis if implementation adds repository normalization for old runs;
- feature-local frontend Today Review page behavior only if the eventual implementation includes the reserved frontend files:
  - `frontend/src/features/today-trade-review/types.ts`
  - `frontend/src/features/today-trade-review/components/TodayReviewPage.tsx`
  - `frontend/tests/ui/today-trade-review.spec.ts`

Explicitly out of scope for this first slice:

- candidate-detail run-evidence expansion;
- `frontend/src/features/today-trade-review/components/TodayReviewCandidateDetailPage.tsx`;
- route registry, controller, router, validation, Prisma, package, generated, provider, startup/backfill, live-provider, or upstream Market Data/Data Quality/Strategy Decision/Trade Plan source changes;
- shared backend utilities, shared frontend UI, broad UI redesign, advice-like wording, automation, broker, paid/cloud, or telemetry work.

## Inputs Inspected

- `AGENTS.md`
- `10-requirements/CF-W1-L3-TREV-01-today-review-publication-evidence-requirement.md`
- `03-architecture/CF-W1-L3-TREV-01-architecture-review.md`
- `06-contracts/CF-W1-L3-TREV-01-today-review-publication-evidence-contract.md`
- `08-work-packets/CF-W1-L3-TREV-01-work-packet.md`
- `17-team-outboxes/TEAM-03-architecture-factory.md`
- `03-architecture/team03-post-decision-readiness-refresh-2026-05-18.md`
- `03-architecture/team03-near-ready-file-reservation-matrix-2026-05-18.md`
- `backend/src/modules/today-trade-review/today-trade-review.md`
- `backend/tests/modules/today-trade-review/today-trade-review.service.test.ts`
- `frontend/tests/ui/today-trade-review.spec.ts`
- `docs/codex-agent-team-plan/qa-evidence/2026-05-14-p0-1b-today-review-readonly-context-qa-evidence.md`
- `backend/package.json`
- `frontend/package.json`

## Dependencies

- `CF-W1-L3-TREV-01` requirement, architecture review, contract, and work packet remain the authority for this slice.
- Today Review must consume Market Data review-readiness and trusted-universe public contracts; it must not recompute them.
- Outside-trusted-universe Strategy Decision exclusions must remain a Today Review run/list invariant.
- Frontend QA is conditional. If the eventual implementation stays backend-only, UI smoke and frontend build are skipped by scope.
- No standalone `typecheck` script exists in current `backend/package.json` or `frontend/package.json`; `npm.cmd run build` is the typecheck gate for each side.

## Required QA Assertions

- New runs persist one additive normalized publication-evidence object or an equivalent normalized shape on the run snapshot.
- Legacy runs that predate the additive field remain explainable on read without Prisma/schema/route/provider changes.
- `reviewReadiness.reviewMode` is authoritative when present.
- Fallback to trusted-universe mode is explicit when readiness summary is missing.
- Conservative fallback is explicit when neither readiness snapshot nor trusted-universe mode is available.
- `NO_REVIEW` maps to suppression evidence and preserves membership failure reason when applicable.
- `LIMITED_REVIEW` and configured partial scans map to limited-publication evidence and do not use optimistic wording.
- Configured partial scans are disclosed as intentional partial coverage, not membership load failure.
- `FULL_REVIEW` publish evidence is allowed only when trusted-universe availability and scan state support it.
- Missing-readiness and mismatch cases remain explicit on the run/list surface.
- Outside-trusted-universe Strategy Decision candidates remain excluded from all Today Review candidate sections.
- Candidate detail remains a read-only research-support surface and does not gain a new run-evidence contract in this first slice.
- No advice-like, automation, target-price, or broker wording is introduced.

## Scenario Matrix

| Scenario | Expected QA result |
| --- | --- |
| Full review with complete trusted membership and scan completeness | Run/list response exposes publication evidence with authoritative review mode, trusted availability, scan complete state, and published outcome. |
| Limited review from Market Data summary | Run/list response exposes limited-publication outcome, review-mode source `MARKET_DATA_SUMMARY`, and bounded explanation that publication is limited research-support output. |
| No review because trusted universe is unavailable or membership load fails | Run/list response exposes suppressed outcome, `trustedLoadStatus = LOAD_FAILED` when applicable, and the preserved membership failure reason. |
| Configured partial scan | Run/list response exposes limited-publication outcome, `trustedLoadStatus = CONFIGURED_PARTIAL`, partial scan counts, and no membership-failure wording. |
| Readiness snapshot missing but trusted-universe mode present | Run/list response exposes explicit fallback to trusted-universe mode and missing-readiness explanation. |
| Readiness snapshot mismatches trusted-universe mode or stored run shape | Run/list response exposes explicit mismatch state and warning without hiding the divergence. |
| Legacy run lacks `publicationEvidence` | Read path synthesizes equivalent evidence from existing snapshot fields without breaking backward-compatible fields. |
| Strategy Decision candidate outside trusted snapshot | Candidate does not appear in any Today Review section; exclusion counts remain visible on the run/list surface. |
| Frontend Today Review page included in implementation | Page renders publication evidence, mode source, required/stored data-through dates, membership load state, scan completion, outside-trusted exclusions, and mismatch/missing-readiness explanations. |
| Candidate-detail expansion attempted | QA rejects or returns the slice because first-slice scope is run/list only. |

## Feature-Local Frontend Coverage

Run frontend/UI checks only if the implementation includes the reserved feature-local frontend files.

If frontend files are included, verify:

- Today Review page prefers normalized publication evidence while preserving existing additive snapshot fields;
- page warnings clearly distinguish missing readiness, mismatch, configured partial, and suppression states;
- page still shows trusted-universe availability, required/stored data-through dates, scan completion, membership load status, and outside-trusted exclusion counts;
- page copy remains research-support only;
- candidate-detail page is not edited and no new candidate-detail run-evidence panel or API dependency appears.

If frontend files are not included, mark UI smoke and frontend build as skipped by scope.

## Focused Command Guidance

Commands below are guidance only. They were not run during this docs-only QA planning task.

Backend service-first validation after Team 00 promotion and implementation handoff:

```powershell
cd backend
npm.cmd test -- today-trade-review.service.test.ts --runInBand
```

If the reserved implementation adds legacy read-path normalization in the repository:

```powershell
cd backend
npm.cmd test -- today-trade-review.service.test.ts today-trade-review.repository.test.ts --runInBand
```

Feature-local frontend UI smoke only if the reserved frontend files are included:

```powershell
cd frontend
npm.cmd run test:ui -- today-trade-review.spec.ts --workers=1
```

Backend build/typecheck gate after accepted implementation and memory/resource check:

```powershell
cd backend
npm.cmd run build
```

Frontend build/typecheck gate only if frontend files are included:

```powershell
cd frontend
npm.cmd run build
```

## Unsafe Or Broad Commands Excluded

Do not run by default:

- broad Jest suites such as bare `npm.cmd test`,
- Playwright runs unrelated to `today-trade-review.spec.ts`,
- dev servers, live services, provider services, startup flows, repair/sync/import/backfill jobs,
- Prisma generate, migrate, db push, db execute, or any schema/data mutation,
- Market Data/Data Quality/Strategy Decision/Trade Plan broad regression bundles unless Team 00 explicitly widens scope,
- candidate-detail UI smoke as a new feature target,
- paid/cloud, telemetry, broker, or live-provider flows.

## Stop Conditions

Stop QA and return to Team 00 / Architect if:

- implementation touches `TodayReviewCandidateDetailPage.tsx`, run-detail API shape for new candidate-detail evidence, or any candidate-detail contract expansion;
- implementation requires `backend/prisma/**`, `backend/src/api/routes.ts`, `frontend/src/app/routes.tsx`, controller/router/validation files, shared utilities/UI, package manifests, or generated files;
- implementation changes Market Data Foundation, Data Quality Engine, Strategy Decision Engine, or Trade Plan Risk Engine source/tests;
- implementation widens into provider, startup/backfill, live-provider, paid/cloud, telemetry, or automation/broker behavior;
- tests can only pass with live provider data or unapproved environment setup;
- page copy or run evidence drifts into direct financial advice, target-price framing, or action instructions.

## Evidence Required Later

- Exact implementation handoff with changed files and explicit confirmation that forbidden scope stayed untouched.
- Focused backend test results for publication-evidence mapping and optional repository synthesis.
- Frontend UI smoke result only if feature-local frontend files are included.
- Build/typecheck result for each side touched by the implementation.
- Scenario results for full review, limited review, no review, configured partial, missing readiness, mismatch, legacy synthesis, and outside-trusted-universe exclusion.
- Skipped checks with exact reason and next owner.

## QA Decision

QA decision for this docs-only pass: accept as planning evidence only.

`CF-W1-L3-TREV-01` is QA-ready for Team 00 Ready evaluation as one bounded Today Review run/list publication-evidence slice.

Executable QA remains blocked until Team 00 promotes the packet and an implementation handoff exists.
