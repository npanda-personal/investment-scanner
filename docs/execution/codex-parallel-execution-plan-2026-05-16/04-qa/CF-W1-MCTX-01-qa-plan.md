# CF-W1-MCTX-01 QA Plan

Date: 2026-05-18

Owner: Team 04 QA Factory

Status: Market Context regime-evidence QA plan prepared. QA-plan ready for Team 00 Ready evaluation as one bounded `market-context-intelligence` slice. Executable validation remains blocked until Team 00 promotes one exact implementation handoff for the reserved backend and feature-local frontend files.

Current status refresh: Team 03 prepared the bounded architecture/contract/work-packet set on 2026-05-18. Team 04 aligns this QA plan to the same additive provenance-and-evidence child and does not widen it into schema, route, repository, shared UI, or upstream/downstream module work.

## Scope

Validation plan for additive regime-evidence framing and partial-context labeling in `CF-W1-MCTX-01`.

In-scope surfaces after Team 00 Ready promotion:

- `backend/src/modules/market-context-intelligence/market-context-intelligence.service.ts`
- `backend/src/modules/market-context-intelligence/market-context-intelligence.types.ts`
- `backend/src/modules/market-context-intelligence/market-context-intelligence.md`
- `backend/tests/modules/market-context-intelligence/market-context-intelligence.service.test.ts`
- `frontend/src/features/market-context-intelligence/types.ts`
- `frontend/src/features/market-context-intelligence/components/MarketContextPage.tsx`
- `frontend/src/features/market-context-intelligence/components/MarketRegimeWidget.tsx`
- `frontend/tests/ui/market-context-intelligence.spec.ts`

Out of scope for this first child:

- Prisma, migrations, generated files, repository, controller, router, validation, public export, or route-registry changes
- frontend API client, hooks, feature routes, shared UI, shared utilities, or broad UX/navigation work
- `market-data-foundation`, `data-quality-engine`, `historical-context-snapshots`, `signal-calibration-engine`, or `signal-generation-engine` source edits
- provider, live-market, startup/backfill, paid/cloud, telemetry, broker, or macro-provider expansion
- regime-score rewrites, breadth-calculation math rewrites, or durable persisted denominator storage

This plan does not approve application source edits, tests, builds, services, or Ready movement. It records the QA packet only.

## Contract Inputs And Current Source Alignment

Primary planning inputs:

- `03-architecture/CF-W1-MCTX-01-architecture-review.md`
- `06-contracts/CF-W1-MCTX-01-market-context-regime-evidence-contract.md`
- `08-work-packets/CF-W1-MCTX-01-work-packet.md`
- `10-requirements/CF-W1-MCTX-01-market-context-regime-evidence-requirement.md`
- `17-team-outboxes/TEAM-03-architecture-factory.md`

Current Market Context source surfaces already support the bounded child:

- `market-context-intelligence.service.ts` already owns `summary()`, `latestPersistedSummary()`, breadth assembly, regime explanation, and the auto-generation fallback path when a persisted snapshot is absent.
- `market-context-intelligence.service.ts` currently collapses non-empty summaries into `dataStatus = PARTIAL`, so trust-strength differentiation is not yet explicit and is the right target for focused QA.
- `market-context-intelligence.types.ts` and `frontend/src/features/market-context-intelligence/types.ts` already model `regime`, `breadth`, `macro`, `explanation`, `updatedAt`, and `dataStatus`, which makes additive evidence fields backward-compatible if existing fields stay present and unchanged.
- `MarketContextPage.tsx` already renders breadth sample counts, macro status, explanation copy, and a page-level status chip.
- `MarketRegimeWidget.tsx` already renders regime label, explanation, and summary status in a module-owned widget surface.
- `frontend/tests/ui/market-context-intelligence.spec.ts` already exists as a feature-local smoke surface and can prove provenance/evidence framing without shared Playwright changes.

## Required QA Assertions

- Summary payload adds bounded evidence metadata without removing or renaming current fields:
  - `regime`
  - `topSectors`
  - `weakSectors`
  - `breadth`
  - `countryStrength`
  - `macro`
  - `explanation`
  - `updatedAt`
  - `dataStatus`
- Evidence payload exposes stable equivalents of:
  - regime evidence state
  - provenance source
  - persisted snapshot available at request start
  - denominator source
  - breadth price/SMA denominator counts
  - missing components
  - evidence reason codes
  - evidence reason summary
- Persisted-versus-fresh provenance is explicit:
  - persisted snapshot path returns `PERSISTED_SNAPSHOT`
  - auto-generation fallback path returns `FRESH_GENERATED_SUMMARY`
- Fresh auto-generated summaries preserve exact live denominator counts from the in-memory breadth calculation instead of immediately degrading to persisted sector-derived counts.
- Persisted summaries that rely on derived denominator reconstruction render `PARTIAL`, not `TRUSTWORTHY`.
- Evidence-state coverage proves stable equivalents of:
  - `TRUSTWORTHY`
  - `PARTIAL`
  - `LOW_EVIDENCE`
  - `MISSING_EVIDENCE`
- Low-evidence coverage proves thin but non-zero denominator states remain distinct from missing-evidence states:
  - low price sample
  - low SMA50 sample
  - low SMA200 sample
  - thin named-sector support
- Missing-evidence coverage proves absent breadth/price evidence does not look complete or trustworthy.
- Missing macro remains explicit:
  - `macro.dataStatus` stays missing when providers are unconfigured
  - evidence includes an explicit stable equivalent of `MACRO_UNCONFIGURED`
  - strong fresh market breadth evidence can still be trustworthy while macro remains separately missing
- Research-support wording remains intact:
  - no direct advice
  - no `buy now` / `sell now`
  - no `price target` / `profit target`
  - no `guaranteed`
  - no broker or automation wording
- Both the Market Context page and Market Regime widget show provenance/evidence framing, not just the backend payload.
- QA must reject the packet if implementation touches forbidden files or widens into schema, routes, repository/controller/router/validation/index, Market Data/DQE/Historical Context/Signal Calibration/Signal Generation source, shared utilities/UI, package manifests, generated files, provider/live data, or broad UX/navigation scope.

## Scenario Matrix

| Scenario | Expected QA assertion after implementation |
| --- | --- |
| Persisted snapshot with reconstructed denominator framing | `summary()` returns evidence provenance equivalent to `PERSISTED_SNAPSHOT`; denominator source is derived rather than live; evidence state is `PARTIAL`, not `TRUSTWORTHY`. |
| Fresh auto-generated summary with strong breadth support | No persisted snapshot exists at request start; returned summary shows `FRESH_GENERATED_SUMMARY`, exact live price/SMA denominators, and can map to `TRUSTWORTHY` when breadth support is strong. |
| Fresh low-evidence price sample | Fresh summary has non-zero but thin price denominator support and maps to `LOW_EVIDENCE` with a stable low-price reason. |
| Fresh low-evidence SMA50 sample | Fresh summary has thin SMA50 support and maps to `LOW_EVIDENCE` with a stable low-SMA50 reason. |
| Fresh low-evidence SMA200 sample | Fresh summary has thin SMA200 support and maps to `LOW_EVIDENCE` with a stable low-SMA200 reason. |
| Thin named-sector breadth support | Sector breadth exists but named-sector support is too thin; evidence stays bounded and maps to `LOW_EVIDENCE` with a visible sector-thin reason. |
| Missing breadth evidence | Breadth cannot be formed from current price history and maps to `MISSING_EVIDENCE` with a stable breadth-unavailable or price-history-unavailable reason. |
| Macro explicitly unconfigured | Macro stays `MISSING`; evidence lists macro as a missing component with a stable macro-unconfigured reason and does not imply live macro coverage. |
| Fresh strong evidence plus missing macro | Fresh summary can still be `TRUSTWORTHY` for regime evidence while macro remains explicitly missing as a separate component and visible warning. |
| Persisted summary does not overstate strength | Persisted sector-count-derived summary may remain useful, but it never presents as live-denominator trustworthy evidence. |
| Backward-compatible response payload | Existing Market Context consumers still receive current fields unchanged; new evidence fields are additive only. |
| Scope drift attempt | Any forbidden-file touch or any route/schema/shared/upstream-module/provider/live-data/broad-UX widening is a QA reject. |

## Feature-Local UI Smoke Expectations

- `frontend/tests/ui/market-context-intelligence.spec.ts` should remain the only UI smoke surface for this slice.
- Smoke must prove visible evidence framing on both module-owned UI surfaces:
  - Market Context page shows evidence state, provenance, denominator framing, and missing macro context
  - Market Regime widget shows evidence state and provenance framing, not only regime score/status
- Smoke must prove the page and widget do not tell different trust stories for the same summary payload.
- Smoke must prove fresh and persisted framing stays readable and bounded:
  - fresh path shows live denominator counts
  - persisted path shows derived denominator framing
  - persisted path does not present as trustworthy
- Smoke must verify research-support wording remains intact and no advice-like copy appears.

## Focused Command Guidance

Commands below are guidance only. They were not run during this docs-only QA planning task.

Future focused validation after Team 00 Ready promotion and implementation handoff:

```powershell
cd backend
npm.cmd test -- market-context-intelligence.service.test.ts --runInBand
```

Approval-gated feature-local UI smoke after bounded UI work, one Playwright worker, and a local startup/resource plan:

```powershell
cd frontend
npm.cmd run test:ui -- market-context-intelligence.spec.ts --workers=1
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

- repository/controller/router/validation/index widening
- frontend API client, hooks, route, or shared component changes
- Market Data, DQE, Historical Context, Signal Calibration, or Signal Generation source/test edits as a backdoor for evidence framing
- Prisma generate, migrate, db push, db execute, or any schema/data mutation
- provider/live-market, paid/cloud, telemetry, broker, startup/backfill, or broad backend suites

## Stop Conditions

Stop QA and return to Team 00 / Architect if:

- implementation expands beyond the reserved `market-context-intelligence` service/types/doc/test and feature-local types/page/widget/UI spec files
- implementation touches repository, controller, router, validation, index, backend/frontend route registries, API client, hooks, or shared UI/shared utilities
- implementation requires Prisma/schema/generated changes or durable persisted denominator storage
- implementation requires upstream `market-data-foundation`, `data-quality-engine`, `historical-context-snapshots`, `signal-calibration-engine`, or `signal-generation-engine` source edits
- implementation rewrites regime/breadth math instead of adding bounded evidence framing
- implementation broadens into macro-provider work, live-data/provider execution, or navigation/UX redesign outside the existing page/widget

## Evidence Required Later

- Exact implementation handoff limited to the reserved `market-context-intelligence` backend and feature-local frontend files
- Scenario evidence for trustworthy, partial, low-evidence, and missing-evidence regime states
- Proof that fresh summaries preserve exact live denominators and persisted summaries present derived-denominator framing
- Proof that persisted-derived summaries render `PARTIAL`, not `TRUSTWORTHY`
- Proof that macro remains explicitly missing when unconfigured
- Proof that both the Market Context page and Market Regime widget render provenance/evidence framing consistently
- Focused service-test output and feature-local UI smoke output only after approval
- Build output only after approval
- Explicit note that no schema, route, repository/controller/router/validation/index, shared-file, upstream-module, provider/live-data, or broad-UX widening occurred
