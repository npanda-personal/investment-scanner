# CF-W1-L3-DQ-01 Lane 3 Readiness Consumer Policy Contract

Date: 2026-05-19

Owner: Team 03 Architecture Factory

## Status

Parent policy accepted for child routing, but the parent item itself is `BLOCKED` for Ready promotion.

This contract does not approve a broad Lane 3 implementation pass. It defines the consumer policy, the split model, and the current gate dependency that must clear before the next fresh readiness-consumer child can move.

Resolved policy decision:

- `07-decisions/DECISION-20260517-lane3-readiness-consumer-policy-resolution.md`

## Contract Intent

Lane 3 consumers must treat Data Quality readiness as an explicit trust gate, not as an inferred property of populated market or signal fields.

This contract governs:

- passive portfolio/watchlist/research display,
- trusted summaries,
- reliability labels,
- alert and other action-like workflows,
- child-slice routing and split conditions.

## Approved Data Source Boundary

Lane 3 consumers may use `DataQualityEngineService` through the public module boundary only.

Approved public read methods:

- `getLatestEvaluationForInstrument(instrumentId)`
- `getEvaluationsForInstruments(instrumentIds)`

Not approved in Lane 3 consumer reads:

- `diagnostics()` as a default consumer-read path, because it can evaluate and persist on miss;
- `DataQualityEngineRepository` imports;
- recreated readiness scoring, stale thresholds, liquidity scoring, coverage scoring, or use-case-tier scoring inside Lane 3 modules.

## Parent Policy Mapping

| State | Passive display | Trusted summary | Reliability labels | Alerts / action-like workflows |
| --- | --- | --- | --- | --- |
| `READY` | Allowed | Allowed only within the child contract for that module | Allowed only within the child contract for that module | Allowed only within the child contract for that module |
| `LIMITED` | Allowed only as passive limited context with visible reasons/warnings | Blocked | Blocked | Blocked |
| Missing DQ | Blocked or untrusted state only | Blocked | Blocked | Blocked |
| `NOT_READY` | Blocked or untrusted state only | Blocked | Blocked | Blocked |
| `UNUSABLE` coverage | Blocked or untrusted state only | Blocked | Blocked | Blocked |
| stale hard blocker | Blocked or untrusted state only | Blocked | Blocked | Blocked |
| unsupported / scope mismatch / provider-gap blocker | Blocked or untrusted state only | Blocked | Blocked | Blocked |

Parent rule:

- populated `currentPrice`, valuation, signal, health, review, or threshold data never proves trust on its own;
- missing or blocked readiness may still be shown only as blocked/untrusted context when the child contract allows passive display of the surrounding surface.

## Use-Case Tier Mapping

Default tier interpretation for Lane 3:

- passive portfolio/watchlist display should use `useCaseTiers.dailyReview` when present;
- trusted summaries and reliability labels should require all referenced module-owned readiness inputs to be `READY` for the relevant child surface;
- alert/action-like workflows require a stricter child rule and must never treat `LIMITED` as eligible.

Current alert child precedent:

- `CF-W1-L3-ALERT-01` treats alerts as action-like and requires `READY` gating through the alert child contract.
- Because `automation` is currently phase-zero blocked in DQE, the alert child uses a stricter fallback gate rather than broadening this parent policy.

## Child Split Model

This parent packet must stay split by module. Do not reopen all Lane 3 consumers in one pass.

### Upstream baseline child

`CF-W1-L3-PORT-01A` was the smallest valid first child and remains the required upstream baseline:

- module: `portfolio-management`
- purpose: readiness DTO evidence for passive display and downstream trust gating
- exact reserved files:
  - `backend/src/modules/portfolio-management/portfolio-management.service.ts`
  - `backend/src/modules/portfolio-management/portfolio-management.types.ts`
  - `backend/src/modules/portfolio-management/portfolio-management.md`
  - `backend/tests/modules/portfolio-management/portfolio-management.service.test.ts`

Gate note:

- the dedicated worktree evidence shows `CF-W1-L3-PORT-01A` already passed Team 10 re-review and Team 03 Architect Signoff;
- the accepted DTO shape is still absent from shared `dev`;
- downstream child routing must therefore wait for delegated Product Owner acceptance plus Team 00 staged-scope verification/local commit before treating the portfolio readiness DTOs as an accepted source on clean `dev`.

### Next fresh readiness-consumer child

`CF-W1-L3-PORT-01B`

- module: `watchlist-management`
- next fresh Lane 3 readiness-consumer candidate after `CF-W1-L3-PORT-01A` is accepted and present on clean `dev`
- exact reserved files:
  - `backend/src/modules/watchlist-management/watchlist-management.service.ts`
  - `backend/src/modules/watchlist-management/watchlist-management.types.ts`
  - `backend/src/modules/watchlist-management/watchlist-management.md`
  - `backend/tests/modules/watchlist-management/watchlist-management.service.test.ts`
- module-local only if it stays inside those files and consumes DQ through the public service boundary only

### Other children

`CF-W1-L3-ALERT-01`

- module: `alerts-monitoring`
- separate active child contract
- must not run in parallel with `CF-W1-L3-AUTH-03` because the file set overlaps

`CF-W1-L3-INTEL-01`

- module: `portfolio-intelligence`
- blocked until `CF-W1-L3-PORT-01A` is accepted and committed on clean `dev`
- exact reserved files:
  - `backend/src/modules/portfolio-intelligence/portfolio-intelligence.service.ts`
  - `backend/src/modules/portfolio-intelligence/portfolio-intelligence.types.ts`
  - `backend/src/modules/portfolio-intelligence/portfolio-intelligence.md`
  - `backend/tests/modules/portfolio-intelligence/portfolio-intelligence.service.test.ts`

Copilot/research trust surfaces

- remain docs-only until separate UX approval and explicit frontend reservations exist

## Forbidden Behavior

- Do not treat `LIMITED` as alert-ready, action-ready, or reliability-bearing.
- Do not use price/signal presence as a trust proxy.
- Do not import `DataQualityEngineRepository` into Lane 3 modules.
- Do not change DQE source or public exports under this parent packet.
- Do not edit Prisma/schema, migrations, route registries, shared backend utilities, shared DTOs, shared UI, package manifests, generated files, providers, startup/backfill flows, or frontend files under this parent packet.

## Split / Block Conditions

Return a child to blocked status if implementation would require:

- schema or migration work;
- backend or frontend route changes;
- shared utility or shared DTO extraction;
- shared UI work;
- package or generated-file changes;
- provider/live/startup/backfill behavior;
- broad UX scope;
- auth/subscription ownership changes in the same pass.

Also keep the parent packet blocked when the only missing dependency is that the accepted upstream child DTO shape is not yet present on clean `dev`. In that case, do not promote a new child from this parent packet ahead of the upstream acceptance/commit gate.

## QA Hooks

Team 04 should validate by child packet, not by one combined Lane 3 suite.

Required policy checks across every child:

1. DQ is consumed through the approved public service boundary.
2. Missing DQ does not silently become trusted.
3. `LIMITED` remains passive-only.
4. `NOT_READY`, `UNUSABLE`, stale, unsupported, scope-mismatched, and provider-gap evidence fail closed for trusted/action-like use.
5. Product language remains research-support oriented.

Reference QA plans:

- `04-qa/CF-W1-L3-DQ-01-qa-plan.md`
- `04-qa/CF-W1-L3-PORT-01-qa-plan.md`
- `04-qa/CF-W1-L3-ALERT-01-qa-plan.md`

## Product Owner Action

No additional Product Owner action is required for the accepted Option B parent policy.

Product Owner action is required only if a future child wants to:

- broaden `LIMITED` into trusted or action-like use;
- add a UI exception outside approved UX scope;
- reopen shared/high-risk files;
- change the meaning of readiness tiers for Lane 3 consumers.

## Current Next Gate

Do not promote `CF-W1-L3-DQ-01` itself as Ready.

Current routing order:

1. delegated Product Owner acceptance for `CF-W1-L3-PORT-01A`;
2. Team 00 staged-scope verification and scoped local commit for `CF-W1-L3-PORT-01A`;
3. once clean `dev` contains the accepted portfolio readiness DTOs, Team 00 may evaluate `CF-W1-L3-PORT-01B` as the next fresh readiness-consumer Ready candidate.
