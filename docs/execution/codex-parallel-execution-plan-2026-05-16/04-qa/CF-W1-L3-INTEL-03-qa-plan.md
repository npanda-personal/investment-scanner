# CF-W1-L3-INTEL-03 QA Plan

Date: 2026-05-18

Owner: Team 04 QA Factory

Status: Portfolio Intelligence concentration-review QA plan prepared. QA-ready for Team 00 Ready evaluation only with explicit one-writer sequencing against `CF-W1-L3-INTEL-01` and `CF-W1-L3-INTEL-02`. Executable validation remains blocked until Team 00 promotes one exact implementation handoff for the reserved `portfolio-intelligence` backend and feature-local frontend files.

## Scope

Validation plan for additive concentration-review ranking and explanation evidence in `CF-W1-L3-INTEL-03`.

In-scope surfaces after Team 00 Ready promotion:

- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.service.ts`
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.types.ts`
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.md`
- `backend/tests/modules/portfolio-intelligence/portfolio-intelligence.service.test.ts`
- `frontend/src/features/portfolio-intelligence/types.ts`
- `frontend/src/features/portfolio-intelligence/components/PortfolioIntelligencePanel.tsx`
- optional focused UI smoke: `frontend/tests/ui/portfolio-intelligence.spec.ts`

Out of scope for this first slice:

- `portfolio-intelligence` router, controller, repository, validation, module, public export, API client, hooks, or feature-route changes
- all `backend/src/modules/portfolio-management/**` source edits
- backend/frontend route registries, shared backend utilities, shared UI, package manifests, generated files, Prisma, or migrations
- optimizer, rebalance, transaction-mutation, tax, target-allocation, target-price, broker, paid/cloud, telemetry, provider/startup, or live-flow work
- broad frontend navigation changes or shared-component extraction

This plan does not approve application source edits, tests, builds, services, or Ready movement. It records the QA packet only.

## Contract Inputs And Current Source Alignment

Primary planning inputs:

- `03-architecture/CF-W1-L3-INTEL-03-architecture-review.md`
- `06-contracts/CF-W1-L3-INTEL-03-portfolio-intelligence-concentration-review-contract.md`
- `08-work-packets/CF-W1-L3-INTEL-03-work-packet.md`
- `10-requirements/CF-W1-L3-INTEL-03-portfolio-intelligence-concentration-review-requirement.md`

Current `portfolio-intelligence` source surfaces show:

- `portfolio-intelligence.md` already documents concentration thresholds, holding review labels, red-flag rules, and explicit no-optimizer/no-rebalance limitations.
- `portfolio-intelligence.service.test.ts` already proves health/status scoring, missing-price high-risk handling, bearish/loss red flags, holding review urgency sorting, signal overlay summaries, and empty-portfolio behavior.
- `frontend/src/features/portfolio-intelligence/types.ts` currently exposes `reviewRanking`, `redFlags`, `groupedSummary`, and `signalOverlay`, but it has no dedicated concentration-review shape yet.
- `PortfolioIntelligencePanel.tsx` already renders the existing detail-surface sections needed for this slice: health, score breakdown, signal overlay, red flags, review ranking, grouped summaries, and domain-specific empty state.
- `frontend/tests/ui/portfolio-intelligence.spec.ts` does not exist today, so feature-local UI smoke is currently a gap rather than an available verification surface.

## Required QA Assertions

- Concentration-review payloads are additive. Existing `healthScore`, `status`, `explanation`, `scoreBreakdown`, `holdings`, `redFlags`, `reviewRanking`, `groupedSummary`, `signalOverlay`, `source`, and `dataStatus` fields remain present and unrenamed.
- Top-level concentration-review additions are explicit and backward-compatible:
  - `concentrationReviewSummary`
  - `concentrationReview`
- Deterministic ordering is fixed in backend logic and does not depend on insertion order or frontend resorting:
  1. review priority
  2. allocation percent descending
  3. high-risk holding count descending
  4. review holding count descending
  5. bearish holding count descending
  6. stable key ascending
- Stable tie-break behavior is explicit:
  - equal-priority and equal-metric items always return in the same order
  - ties do not flip between runs because of array construction or object-key iteration
- Portfolio-level and holding-level concentration drivers are distinguishable:
  - holding concentration exposes `dimension = HOLDING`
  - sector concentration exposes `dimension = SECTOR`
  - country concentration exposes `dimension = COUNTRY`
  - summary fields identify the top exposure dimension/key without collapsing everything into a holding-only view
- Portfolio-level drivers use only existing evidence:
  - allocation percent
  - affected holding count
  - high-risk holding count
  - review holding count
  - bearish holding count
  - existing holding-review, red-flag, signal-overlay, and unrealized-loss evidence
- Holding-level tie-back remains explainable:
  - affected symbols reflect the actual exposure members
  - reason codes and counts align with the holdings already visible in current intelligence outputs
- Too-few-holdings behavior stays bounded:
  - maps to `DIVERSIFICATION_WATCH` or stable equivalent
  - does not introduce optimizer, rebalance, or target-allocation language
- Reason summaries stay bounded and research-supportive:
  - each concentration item exposes one concise `reasonSummary` grounded in existing evidence only
  - summaries do not become unbounded prose dumps or concatenate every holding reason into one block
  - wording stays in review/risk/concentration language such as `review`, `monitor`, `watch`, or `consider review`
  - wording does not introduce `buy now`, `sell now`, `must buy`, `must sell`, `rebalance now`, `price target`, `profit target`, `guaranteed`, or direct advice framing
- No source expansion occurs:
  - no optimizer or rebalance logic
  - no `portfolio-management` source edit
  - no schema, route, shared UI, shared utility, package, or generated-file change
- Existing portfolio-intelligence sections remain intact:
  - existing red flags, holding review ranking, grouped summaries, and signal overlay still render and remain backward-compatible
  - concentration review does not silently replace the current review-ranking behavior

## Scenario Matrix

| Scenario | Expected QA assertion after implementation |
| --- | --- |
| Dominant holding concentration with review evidence | A top holding above threshold plus `HIGH_RISK`, `REVIEW`, bearish, or loss-heavy evidence maps to the highest-priority concentration item and ranks first. |
| Sector concentration with multiple affected review holdings | Sector exposure appears as `SECTOR`, includes affected symbols/counts, and can outrank a lower-priority holding item when the deterministic sort rules require it. |
| Country concentration justified by existing thresholds | Country exposure appears only when current module thresholds and existing evidence justify review, not as a generic always-on summary row. |
| Stable tie on allocation and counts | Two items with identical priority, allocation, high-risk count, review count, and bearish count resolve by stable key ascending and do not flip across runs. |
| Portfolio-level summary tie-back | `concentrationReviewSummary` reflects the highest-priority exposure and matches the first ranked item without inventing new evidence or math. |
| Too-few-holdings diversification watch | Small portfolios surface diversification-watch style concentration review without optimizer, rebalance, or transaction language. |
| Bounded reason summary | Each returned concentration item keeps one concise reason summary while detailed holding membership stays in counts/symbols rather than long prose. |
| Existing holdings ranking preserved | Current `reviewRanking` still returns holding urgency as before; the new concentration layer is additive and does not remove holding review evidence. |
| Existing grouped and red-flag summaries preserved | `redFlags`, `groupedSummary`, and `signalOverlay` remain populated and unrenamed for current consumers. |
| Empty portfolio surface | Current empty state still appears and concentration review does not introduce a broken or advice-shaped placeholder. |
| Scope drift attempt | Any optimizer/rebalance, `portfolio-management` source, schema, route, shared UI, or shared utility expansion is a QA reject and returns the packet to Team 00 / Architect. |

## Feature-Local UI Smoke Expectations

- `PortfolioIntelligencePanel.tsx` remains the feature-owned UI surface for this slice. No shared component or route change is allowed.
- The implementation should add a focused `frontend/tests/ui/portfolio-intelligence.spec.ts`. If the spec is still absent in the handoff, Team 04 will record an explicit UI-test blocker and keep user-visible regression risk open.
- Feature-local smoke must prove visible concentration-review evidence on the current portfolio detail surface, not just panel load:
  - a concentration-review section is rendered inside the existing panel
  - ranked items are shown in deterministic order
  - visible dimension/exposure identity is present for at least one holding/sector/country case
  - a concise reason summary is visible for the top-ranked item
- Smoke must prove current empty-state behavior still explains how to unlock the workflow when there are no holdings.
- Smoke must prove wording remains research-supportive and avoids direct advice or rebalance language.
- Smoke must not rely on new navigation, shared-component extraction, or broader portfolio-management UI changes.

## Sequencing And Single-Writer Gate

- This packet is not parallel-safe with:
  - `CF-W1-L3-INTEL-01`
  - `CF-W1-L3-INTEL-02`
- Shared writer set:
  - `backend/src/modules/portfolio-intelligence/portfolio-intelligence.service.ts`
  - `backend/src/modules/portfolio-intelligence/portfolio-intelligence.types.ts`
  - `backend/src/modules/portfolio-intelligence/portfolio-intelligence.md`
  - `backend/tests/modules/portfolio-intelligence/portfolio-intelligence.service.test.ts`
- Team 00 must either:
  - sequence `INTEL-01`, `INTEL-02`, and `INTEL-03` one writer at a time, or
  - deliberately combine them into one reserved `portfolio-intelligence` writer pass
- Team 04 does not consider this packet executable-QA ready until Team 00 makes that one-writer decision explicit in the implementation handoff.

## Focused Command Guidance

Commands below are guidance only. They were not run during this docs-only QA planning task.

Future focused validation after Team 00 Ready promotion, one-writer sequencing, and implementation handoff:

```powershell
cd backend
npm.cmd test -- portfolio-intelligence.service.test.ts --runInBand
```

Approval-gated feature-local UI smoke after bounded UI work, one Playwright worker, and a local startup/resource plan:

```powershell
cd frontend
npm.cmd run test:ui -- portfolio-intelligence.spec.ts --workers=1
```

Approval-gated builds after accepted implementation and memory/resource checks:

```powershell
cd backend
npm.cmd run build
```

```powershell
cd frontend
npm.cmd run build
```

## Skipped / Forbidden Checks

Skipped in this planning pass:

- all executable tests
- backend/frontend builds
- local servers, services, provider checks, and UI smoke

Forbidden by default for this slice:

- `portfolio-management` source/test edits used as a backdoor to support concentration review
- optimizer, rebalance, target-allocation, transaction, or advice-style workflow additions
- router/controller/repository/validation/module/export widening inside `portfolio-intelligence`
- frontend API client, hooks, routes, or shared component changes
- Prisma generate, migrate, db push, db execute, or any schema/data mutation
- provider/live-market, startup/backfill, paid/cloud, telemetry, broker, or broad backend suites

## Stop Conditions

Stop QA and return to Team 00 / Architect if:

- implementation expands beyond the reserved `portfolio-intelligence` service/types/doc/test and feature-local types/component/UI spec files
- implementation touches `portfolio-management` source, route registries, shared UI, shared utilities, Prisma, migrations, packages, or generated files
- implementation changes thresholds in `portfolio-intelligence.validation.ts` instead of reusing current module thresholds
- implementation adds optimizer, rebalance, target-allocation, transaction, or advice-style behavior
- implementation removes, renames, or repurposes current `reviewRanking`, `redFlags`, `groupedSummary`, or `signalOverlay` fields instead of adding concentration-review fields
- Team 00 has not resolved the one-writer conflict with `CF-W1-L3-INTEL-01` and `CF-W1-L3-INTEL-02`

## Evidence Required Later

- Exact implementation handoff limited to the reserved `portfolio-intelligence` backend and feature-local frontend files
- Explicit Team 00 one-writer sequencing note against `CF-W1-L3-INTEL-01` and `CF-W1-L3-INTEL-02`
- Scenario evidence for dominant holding, sector, country, stable tie, and too-few-holdings cases
- Scenario evidence that `reasonSummary` stays concise and research-supportive
- Focused service-test output only after approval
- Feature-local UI smoke output only after approval, or an explicit blocker note if the dedicated spec is not added
- Build output only after approval
- Explicit note that no optimizer, rebalance, `portfolio-management` source, schema, route, shared-file, or direct-advice expansion occurred
