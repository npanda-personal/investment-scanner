# CF-W1-RH-02A Research Hub What-Changed Fail-Closed Basis Contract

Date: 2026-05-18

Owner: Team 03 Architecture Factory

## Status

Contract refreshed 2026-05-19 against accepted `CF-W1-RH-01` baseline commit `fd88c62` on branch `codex/team08-ux-research/CF-W1-RH-01`.

Ready recommendation: `READY-CANDIDATE` for Team 04 QA handoff and Team 00 sequencing as a stacked Research Hub slice after `fd88c62`.

Do not route implementation from the current unstacked `dev` checkout unless Team 00 first applies/merges accepted `RH-01`. At refresh time, `fd88c62` is not an ancestor of `dev`.

## Contract Intent

Research Hub must stop presenting current review-priority rows as if they prove a previous comparison basis.

`CF-W1-RH-02A` is a fail-closed comparison-basis child only. It does not add durable overview history, scheduler output, journal storage, or any broader true-delta system.

## Ownership

`research-hub` owns this child.

This child may not redefine or repurpose upstream semantics from:

- Today Review
- Strategy Decision Engine
- Trade Plan Risk Engine
- Market Context Intelligence
- Signal Quality Lab
- Signal Calibration Engine
- Smart Money Intelligence

Those modules remain public evidence inputs only. None of them owns prior Research Hub comparison history.

## Current Basis Determination

Architecture finding after comparing current `dev` and accepted `RH-01` commit `fd88c62`:

- there is no module-owned persisted Research Hub overview history;
- there is no safe current public DTO on merged `dev` that represents a previous Research Hub review-priority snapshot with matching semantics;
- Today Review persisted runs are not a valid proxy basis because they are a downstream published review set, not the same object as Research Hub `tradeCandidates`.
- accepted `RH-01` improves actionability evidence wiring but keeps `whatChanged` simulated and does not add frontend/API comparison-basis fields.

Therefore the bounded child must fail closed by default.

## Required Additive Contract Shape

`ResearchWhatChanged` must gain additive comparison-basis metadata:

- `comparisonBasis.status`
- `comparisonBasis.comparedAgainstGeneratedAt`
- `comparisonBasis.sourceModule`
- `comparisonBasis.message`

Recommended bounded shape:

```ts
comparisonBasis: {
  status: 'AUDITABLE' | 'UNAVAILABLE';
  comparedAgainstGeneratedAt: string | null;
  sourceModule: string | null;
  message: string;
}
```

This additive shape is required in:

- `backend/src/modules/research-hub/research-hub.types.ts`
- `frontend/src/features/research-hub/api/researchHubApi.ts`

## Required Fail-Closed Rules

When `comparisonBasis.status = UNAVAILABLE`, Research Hub must:

- set `comparisonBasis.comparedAgainstGeneratedAt = null`;
- set `comparisonBasis.sourceModule = null`;
- provide a research-support `comparisonBasis.message` that explains no auditable prior comparison basis is available;
- return `newTradeCandidates = []`;
- return `downgradedCandidates = []`;
- return `marketGateChange = null`;
- avoid any wording that implies prior evaluation history exists.

When `comparisonBasis.status = AUDITABLE`, Research Hub may expose `comparedAgainstGeneratedAt` only if the basis comes from a same-semantics, auditable, already-merged public read path inside the reserved writer set.

For `CF-W1-RH-02A`, current architecture expects `UNAVAILABLE` on `dev`. Do not fabricate an `AUDITABLE` path by reinterpreting Today Review or any other mismatched upstream output.

## Frontend Rendering Rules

The What Changed panel must:

- stop rendering `No new review candidates since the last evaluation.` when basis status is unavailable;
- render the backend-provided basis-unavailable framing instead;
- keep research-support wording;
- avoid buy/sell/execute/order/target language;
- remain inside the module-owned `ResearchOverviewPage.tsx` surface only.

This child must not widen into:

- route or navigation changes;
- shared component changes;
- broad page redesign;
- new drilldown flows.

## Preserved Behavior

This child must preserve:

- `/api/v1/research/overview`
- existing top-level `ResearchOverview` route and fetch flow
- current module ownership
- accepted `RH-01` actionability evidence behavior from `fd88c62`
- current market readiness, strategy proof, confirmation, next-actions, and data-gap behavior

This child changes only the trust semantics of `whatChanged`.

## Explicitly Forbidden Behavior

Do not:

- compare current `tradeCandidates` against themselves and call it a delta;
- infer prior basis from Today Review candidate lists;
- infer prior basis from Strategy Decision candidate runs;
- add scheduler, journal, or durable overview snapshot storage;
- edit Prisma/schema, migrations, or generated files;
- edit route registries;
- edit shared backend utilities or shared UI;
- edit package manifests;
- edit upstream module source or tests;
- add provider/live-data, startup/backfill, paid/cloud, broker, or telemetry scope.

## Test Contract

Focused implementation tests must prove:

- `comparisonBasis.status = UNAVAILABLE` on no-prior-basis paths;
- `newTradeCandidates`, `downgradedCandidates`, and `marketGateChange` are suppressed when basis is unavailable;
- service logic does not source delta claims from current `tradeCandidates` only;
- service logic does not use Today Review as a surrogate prior basis;
- frontend copy no longer contains `since the last evaluation` under unavailable basis;
- research-support language remains intact.

## File Reservation Contract

Allowed future implementation files only, on a branch/worktree stacked from `fd88c62` or from a `dev` head containing `fd88c62`:

- `backend/src/modules/research-hub/research-hub.service.ts`
- `backend/src/modules/research-hub/research-hub.types.ts`
- `backend/src/modules/research-hub/research-hub.md`
- `backend/tests/modules/research-hub/research-hub.service.test.ts`
- `frontend/src/features/research-hub/api/researchHubApi.ts`
- `frontend/src/features/research-hub/components/ResearchOverviewPage.tsx`
- `frontend/tests/ui/research-hub.spec.ts`

Everything else is out of scope for this child.

## Sequencing Rule

`CF-W1-RH-02A` must not run in parallel with `CF-W1-RH-01` and must not start from a base that omits accepted `RH-01`.

Reason:

- both packets require `research-hub.service.ts`;
- both packets require `research-hub.md`;
- both packets require `research-hub.service.test.ts`;
- `RH-02A` additionally requires `research-hub.types.ts`.
- accepted `RH-01` commit `fd88c62` is the comparison baseline for this refreshed contract.

If Team 00 wants one combined writer pass, it must explicitly re-pack the work and keep one writer on the full Research Hub reserved file set.
