# CF-W1-RH-03 Research Hub Explainability Trust Labels Contract

Date: 2026-05-20

Owner: Team 03 Architecture Factory

## Status

Contract prepared from current source plus `RH-01` and `RH-02A` dependency review.

Ready recommendation: `READY-CANDIDATE` for Team 04 QA handoff and Team 00 sequencing, not self-promoted for implementation.

## Contract Intent

Research Hub must stop implying trust that it cannot source-own.

`CF-W1-RH-03` is the no-schema trust-label child for:

- explicit next-action provenance;
- honest evidence and reliability wording on the overview;
- honest local-availability wording for data readiness; and
- explicit unavailable/simulated What Changed wording when no auditable prior basis exists.

This child remains research-support only. It must not imply financial advice, execution permission, broker authorization, or target-price certainty.

## Ownership

`research-hub` owns this child.

Upstream modules remain evidence owners only:

- Strategy Decision Engine
- Today Trade Review
- Trade Plan Risk Engine
- Signal Quality Lab
- Signal Calibration Engine
- Market Context Intelligence
- Smart Money Intelligence

Research Hub may consume only public outputs already available through current module boundaries. It must not duplicate upstream strategy, DQ, review, or market-context logic.

## Required Public Contract Rules

### Response Shape

- keep `/api/v1/research/overview` unchanged;
- preserve all existing top-level Research Hub sections;
- preserve existing actionability dimension keys;
- preserve current `nextBestAction.sourceModule` field name;
- keep all additions additive only;
- use the `comparisonBasis` additive contract from `CF-W1-RH-02A` for What Changed unavailable-basis semantics.

### Next Best Action Provenance

Research Hub must:

- populate `actionability.nextBestAction.sourceModule` from explicit action ownership;
- assign that ownership at generation time or through a bounded module-local mapping;
- keep the returned source module aligned with the real owner of the action label.

Research Hub must not:

- infer source ownership from `targetRoute` substrings;
- relabel a route-driven action as `strategy-decision-engine` by default when ownership is unknown;
- widen into route registry or navigation work.

### Signal Evidence / Reliability Trust Labels

Research Hub must:

- make `actionability.dimensions.signalEvidence` the authoritative trust label for signal evidence on the overview;
- use honest status/message wording that distinguishes limited, unproven, blocked if applicable, and insufficient-data states;
- keep the trust story conservative until richer Signal Quality trust-state semantics are actually present on merged `dev`;
- update `confirmationSummary.signalSummary.notes` so raw counts and reliability evidence are not conflated.

Compatibility rule:

- `confirmationSummary.signalSummary.reliabilityAvailable` may remain in the DTO, but it is compatibility-only;
- it must not become `true` from raw signal counts alone.

Research Hub must not:

- use `totalSignalCount > 0` as a reliability proxy;
- imply `READY` / trusted signal evidence from raw signal presence alone;
- duplicate Signal Quality Lab trust logic locally.

### Data Readiness Trust Labels

Research Hub must:

- keep `actionability.dimensions.dataReadiness` as the overview-owned local-availability trust label;
- distinguish local upstream healthy, limited, and unavailable conditions through honest wording;
- keep the message explicit when Research Hub has local inputs but not a source-owned trusted review-universe readiness contract.

Research Hub must not:

- present a local no-gap state as if trusted review readiness is proven;
- reuse a blanket optimistic message across clearly different upstream states.

### What Changed Unavailable-Basis Semantics

Research Hub must:

- reuse the additive `comparisonBasis` contract defined for `CF-W1-RH-02A`;
- return unavailable-basis semantics when no same-semantics, auditable prior Research Hub basis exists;
- suppress delta claims under unavailable basis;
- render basis-unavailable copy in the Research Hub page instead of a temporal claim.

Research Hub must not:

- derive deltas from current `tradeCandidates` alone;
- infer a prior Research Hub basis from Today Review or other mismatched upstream outputs;
- add durable snapshot storage, scheduler state, journal state, or Prisma work in this child.

## Frontend Rendering Rules

The module-owned Research Hub page must:

- render backend-provided unavailable-basis wording instead of `No new review candidates since the last evaluation.`;
- keep trust labels feature-local and module-owned;
- avoid shared-component work;
- preserve research-support wording only.

The UI smoke must move with the copy:

- assert that the unavailable-basis path does not render the stale temporal sentence;
- assert that honest evidence wording is visible on the page.

## Preserved Behavior

This child must preserve:

- current route shape;
- current fetch flow;
- `RH-01` actionability evidence behavior once stacked on accepted `fd88c62`;
- `RH-02A` unavailable-basis behavior if already present in the chosen base;
- current module ownership;
- current market readiness, strategy proof, confirmation counts, next actions, and data-gap sections aside from the bounded trust-label wording changes.

## Explicitly Forbidden Behavior

Do not:

- edit Prisma/schema, migrations, or generated files;
- edit route registries;
- edit shared backend utilities or shared frontend components;
- edit package manifests;
- edit upstream module source or tests;
- add provider/live-data, startup/backfill, paid/cloud, broker, or telemetry scope;
- widen this child into durable comparison storage or a broad Research Hub redesign.

## File Reservation Contract

Allowed future implementation files only:

- `backend/src/modules/research-hub/research-hub.service.ts`
- `backend/src/modules/research-hub/research-hub.types.ts`
- `backend/src/modules/research-hub/research-hub.md`
- `backend/tests/modules/research-hub/research-hub.service.test.ts`
- `frontend/src/features/research-hub/api/researchHubApi.ts`
- `frontend/src/features/research-hub/components/ResearchOverviewPage.tsx`
- `frontend/tests/ui/research-hub.spec.ts`

Everything else is out of scope for this child.

## Sequencing Rule

- `CF-W1-RH-01` is a required base because `RH-03` shares the same backend writer set and current `dev` does not contain accepted `fd88c62` on 2026-05-20.
- `CF-W1-RH-02A` is required for the What Changed unavailable-basis portion unless Team 00 explicitly combines `RH-02A + RH-03` into one writer pass.
- `RH-03` must not run in parallel with `RH-01` or `RH-02A`.

If Team 00 combines them, it must reserve the full shared Research Hub file set to one writer.

## Test Contract

Focused implementation tests must prove:

- `nextBestAction.sourceModule` is explicitly sourced and not inferred from route substrings;
- raw signal counts alone do not mark reliability available/trusted;
- signal evidence wording distinguishes limited or unproven evidence from unavailable evidence;
- data readiness wording distinguishes local availability from trusted readiness proof;
- unavailable comparison basis suppresses temporal delta claims and removes the stale fallback copy;
- research-support language remains intact.
