# CF-W1-RH-03 QA Plan

Date: 2026-05-20

Owner: Team 04 QA Factory

## Status

QA-READY for Team 00 Ready evaluation as a docs-only QA plan.

Executable QA remains blocked until Team 00 promotes one bounded Research Hub implementation handoff stacked on accepted `CF-W1-RH-02A` commit `f391a6d`, which already contains accepted `CF-W1-RH-01` commit `fd88c62`.

Per Team 00 sequencing guidance for this task, the `RH-02A` stacking decision is already resolved and must not be treated as a Product Owner blocker. Durable snapshot/history storage remains out of scope and is not required for `RH-03`.

## Inputs Reviewed

- Root `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-RH-03-research-hub-explainability-trust-labels-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-RH-03-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-RH-03-research-hub-explainability-trust-labels-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-RH-03-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-RH-01-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-RH-02A-qa-plan.md`
- current Research Hub backend service/types/tests
- current Research Hub frontend API/page/UI smoke

## QA Intent

Prove that Research Hub trust labels become honest without widening into storage, upstream rewrites, or shared UI work.

`CF-W1-RH-03` must verify four bounded behaviors together:

- `nextBestAction.sourceModule` is explicitly source-owned rather than inferred from route text;
- signal evidence and reliability wording stop conflating raw counts with trusted evidence;
- data readiness wording distinguishes local availability from trusted review readiness; and
- What Changed unavailable-basis copy stays explicit and non-temporal when no auditable prior basis exists.

## Required Implementation Scope For Later QA

Allowed implementation files only:

- `backend/src/modules/research-hub/research-hub.service.ts`
- `backend/src/modules/research-hub/research-hub.types.ts`
- `backend/src/modules/research-hub/research-hub.md`
- `backend/tests/modules/research-hub/research-hub.service.test.ts`
- `frontend/src/features/research-hub/api/researchHubApi.ts`
- `frontend/src/features/research-hub/components/ResearchOverviewPage.tsx`
- `frontend/tests/ui/research-hub.spec.ts`

Required base:

- accepted `CF-W1-RH-02A` commit `f391a6d`
- `f391a6d` already contains accepted `CF-W1-RH-01` commit `fd88c62`

Forbidden scope:

- route registries, controllers, routers, feature hooks, feature index files
- Prisma schema, migrations, generated files, packages
- shared backend utilities or shared frontend components
- Today Review, Strategy Decision, Trade Plan, Signal Quality, Signal Calibration, Market Context, Smart Money, or other upstream module source/tests
- providers, live data, startup/backfill, scheduler, journal, durable overview snapshot/history, paid/cloud, broker, telemetry
- broad Research Hub redesign

## Required QA Assertions

Backend contract assertions:

- `actionability.nextBestAction.sourceModule` is populated from explicit ownership and no longer depends on `targetRoute` substring inference.
- Service tests prove a non-data-quality route can still return the correct owning `sourceModule` when the action is owned elsewhere.
- Service tests prove unknown or generic routes do not silently fall back to `strategy-decision-engine` unless that module is the real owner.
- `confirmationSummary.signalSummary.reliabilityAvailable` stays compatibility-only and does not become `true` from raw signal counts alone.
- `actionability.dimensions.signalEvidence` is the authoritative trust label and uses conservative states such as `LIMITED`, `UNPROVEN`, `BLOCKED`, or `INSUFFICIENT_DATA` based on owned evidence, not count presence.
- `confirmationSummary.signalSummary.notes` and related trust wording clearly separate count visibility from evidence maturity.
- `actionability.dimensions.dataReadiness` distinguishes local healthy, limited, and unavailable states without implying trusted review-universe readiness from local inputs alone.
- `whatChanged` keeps the additive unavailable-basis semantics from `RH-02A`; when basis is unavailable, `comparisonBasis` remains unavailable and temporal delta claims stay suppressed.

Frontend/API assertions:

- frontend Research Hub API types remain additive and preserve the `sourceModule` and `comparisonBasis` shapes expected from the backend contract;
- the Actionability surface renders the backend-provided trust wording and source module labels without introducing optimistic local copy;
- the What Changed panel does not render `No new review candidates since the last evaluation.` for the unavailable-basis path;
- the page renders explicit unavailable/simulated basis wording instead of temporal overclaim copy;
- the existing Research Hub UI smoke remains the required UI verification surface and must move with the trust-label copy.

Language assertions:

- accept research-support wording such as `review`, `candidate`, `limited`, `unproven`, `unavailable`, `blocked`, `comparison basis unavailable`, `source module`, `evidence`, and `consider review`;
- reject advice, execution, target, guarantee, broker, or automation wording, including `buy now`, `sell now`, `must buy`, `must sell`, `price target`, `profit target`, `guaranteed`, `execute`, `order`, and `broker`.

## Scenario Matrix

| Scenario | Required result |
| --- | --- |
| Explicit next action provenance | `nextBestAction.sourceModule` matches the owning module by construction, not by `targetRoute` text inspection. |
| Route text would previously mislead ownership | Service test proves ownership stays correct even when the route does not contain the expected module substring. |
| Raw signal counts exist with no richer trust proof | `signalEvidence` remains conservative and `reliabilityAvailable` does not flip true from counts alone. |
| Limited signal evidence exists | overview shows honest limited or unproven wording instead of a trusted or ready appearance. |
| Local inputs are healthy but Research Hub lacks trusted review readiness proof | `dataReadiness` stays honest about local availability versus trusted review readiness. |
| Upstream research inputs are partially missing | `dataReadiness` shows limited or unavailable wording with visible upstream-gap framing. |
| What Changed basis unavailable | unavailable-basis metadata remains present, delta fields stay suppressed, and the stale `since the last evaluation` sentence is absent. |
| Warnings render alongside unavailable basis | warnings remain warnings only and do not imply hidden history or a real prior comparison basis. |
| Research-support wording regression check | page/API/test text contains no advice, target, broker, or automation language. |
| Scope drift | QA rejects any schema, route, shared UI/utility, upstream-source, provider, package, durable-history, or broad redesign widening. |

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

Focused copy and product-language scan:

```powershell
rg -n "since the last evaluation|buy now|sell now|must buy|must sell|price target|profit target|guaranteed|execute|order|broker" backend/src/modules/research-hub backend/tests/modules/research-hub frontend/src/features/research-hub frontend/tests/ui/research-hub.spec.ts
```

Optional build evidence if Team 00 or Team 10 asks for release-level validation in the same pass:

```powershell
cd backend
npm.cmd run build
```

```powershell
cd frontend
npm.cmd run build
```

## Evidence Required Later

- Team 00 sequencing note proving the implementation branch/worktree is stacked on accepted `f391a6d`
- exact changed-file list limited to the allowed Research Hub files
- focused backend service-test output proving explicit `sourceModule` ownership, no route-substring inference, conservative signal trust labeling, and honest data-readiness wording
- UI smoke output proving the unavailable-basis copy is visible and the stale `since the last evaluation` sentence is absent
- copy scan result
- if builds are run, backend and frontend build results
- explicit confirmation that `RH-02A` unavailable-basis behavior and `RH-01` actionability evidence behavior remain preserved
- explicit confirmation that no schema, routes, shared files, package changes, providers/live/startup/backfill, upstream source/tests, or durable-history work occurred

## Skipped / Blocked Checks In This Planning Pass

Skipped in this docs-only planning pass:

- all executable tests
- backend/frontend builds
- local servers, services, provider checks, UI execution, and live data

Blocked until implementation exists:

- focused backend test execution
- Research Hub UI smoke execution
- build verification

These are execution blockers only. They are not Ready-evaluation blockers for the QA plan itself.

## Stop Conditions

Stop QA and return to Team 00 / Team 03 if:

- implementation is not stacked on accepted `f391a6d`
- another Research Hub writer is active on the same file set
- `nextBestAction.sourceModule` still depends on route-substring inference
- raw signal counts alone are treated as trusted reliability evidence
- the old `since the last evaluation` unavailable-basis copy remains
- any forbidden scope is touched
- implementation tries to introduce durable snapshot/history storage

## True Consent-Blocker Assessment

No true consent blocker exists for the bounded `RH-03` child.

Durable snapshot/history storage is explicitly out of scope. If a future packet wants auditable replay storage, that must be split into a separate consent-gated child.

## QA Verdict

QA-READY for Team 00 Ready evaluation.

Team 00 can evaluate `CF-W1-RH-03` for Ready promotion now, provided it records the bounded writer set and the accepted base on `f391a6d`. The remaining blockers are implementation-execution blockers, not planning or consent blockers.
