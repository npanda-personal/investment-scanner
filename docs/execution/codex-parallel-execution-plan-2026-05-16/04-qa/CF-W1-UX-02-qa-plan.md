# CF-W1-UX-02 + CF-W1-UX-05A Combined Copilot QA Plan

Date: 2026-05-18

Owner: Team 04 QA Factory

Status: Combined Copilot-only QA plan prepared. QA-ready for Team 00 Ready evaluation as one bounded `CF-W1-UX-02 + CF-W1-UX-05A` packet. Executable validation remains blocked until Team 00 promotes one implementation handoff.

Current status refresh: Team 08 source mapping and Team 03 contract/work-packet updates now align on one Copilot-only trust-plus-copy slice. Team 04 is consolidating QA to the same packet so the trust-state and product-language checks land together.

## Scope

Validation plan for one combined Copilot-only packet covering trust evidence, blocked/limited/trusted presentation, and product-language cleanup inside `ai-investment-copilot`.

Target surfaces after approval:

- additive Copilot DTO trust fields
- Copilot service/controller behavior that drives blocked, limited, and trusted states
- Copilot frontend trust panel and narrative visibility
- Copilot page/action/section copy under `CF-W1-UX-05A`
- focused backend regression for Notifications Delivery digest compatibility
- one focused Copilot UI smoke test only after approved UI implementation

This combined plan does not approve backend source edits, frontend source edits, test edits, Prisma changes, routes, shared utilities/UI, packages, generated files, providers, services, startup/backfill, broad suites, or live data checks.

Out of scope for the first slice:

- `frontend/src/shared/**`
- `frontend/src/app/routes.tsx`
- `frontend/src/app/navigationMetadata.tsx`
- `frontend/src/features/stock-research-workbench/**`
- `frontend/src/features/research-hub/**`
- `frontend/src/features/market-data-foundation/**`
- external AI, paid/cloud, telemetry, broker, or live-provider behavior

## Approved Product / UX Policy

Decision references:

- `07-decisions/DECISION-20260517-copilot-trust-ux-policy-resolution.md`
- `07-decisions/DECISION-20260517-ux-product-language-status-policy-resolution.md`

Accepted first-slice rules:

- visible page-level copy changes are Copilot-only
- blocked summaries hide generated narrative and show blocker reasons first
- the first slice is one bounded Copilot-only packet
- `CF-W1-UX-05A` is folded into the same implementation pass as `CF-W1-UX-02`
- shared UI, navigation metadata, route registries, Research Hub, Market Data UI, and Stock Research Workbench remain out of scope
- trust fields must be source-supported and additive; unsupported readiness must not be invented

## Required QA Assertions

- Blocked state hides generated narrative and shows blocker reasons before any summary text.
- Limited state shows warnings and limitations without recommendation-like framing.
- Trusted state shows local, deterministic, research-only proof plus source modules and data gaps.
- `latestTrustedDataDate` is populated only when upstream source timestamps exist; otherwise it is `null`.
- Market brief `region` / `assetType` pass-through is verified if controller or validation changes include scope parsing; otherwise the response must remain conservative and not overclaim scope fidelity.
- Additive Copilot DTO changes do not break Notifications Delivery digest assembly or current Copilot consumers.
- Copy avoids advice-like wording and certainty framing.
- Shared UI, navigation, route, and non-Copilot surfaces remain untouched.
- No provider, startup/backfill, Prisma mutation, paid/cloud, external AI, or live data path is required.

## Scenario Matrix

| Scenario | Backend expected result | UI expected result after UI approval |
| --- | --- | --- |
| Required evidence is ready enough for trusted research | Additive trust object returns trusted state, visible summary, research-only proof, source modules, and data gaps. | Trusted state is visible with local/deterministic proof and no recommendation framing. |
| Required upstream evidence is missing, unsupported, stale enough to block, or scope is unverified under accepted policy | Trust object returns blocked state with `summaryVisibility = HIDDEN` and blocker reasons. | Narrative is hidden; blocker reasons appear first. |
| Evidence is limited but not fully blocked | Trust object returns limited state with warning reasons and conservative readiness fields. | Limited state shows warnings without success-style framing or action language. |
| Upstream timestamps are absent | Trust object returns `latestTrustedDataDate = null`. | UI shows no invented date; null/absent handling is explicit. |
| Scope parsing is included in the Copilot controller/validation | Response preserves accepted `region` / `assetType` behavior without claiming unsupported fidelity. | Current scope is shown or clearly marked conservative/unverified. |
| Copilot DTO grows additively | Existing consumers continue to parse current fields; Notifications Delivery digest tests stay green. | Existing Copilot page behavior remains backward-compatible while new trust fields render. |
| Advisory or certainty wording appears in generated/source text | Backend sanitizes or avoids forbidden wording; frontend labels remain research-support oriented. | Page/action/section labels avoid advice-like wording. |

## Focused Command Guidance

Commands below are guidance only. They were not run during this docs-only QA planning task.

Backend Copilot validation after accepted implementation handoff:

```powershell
cd backend
npm.cmd test -- ai-investment-copilot.service.test.ts ai-investment-copilot.routes.test.ts --runInBand
```

Add Copilot validation coverage only if scope/query parsing changes:

```powershell
cd backend
npm.cmd test -- ai-investment-copilot.validation.test.ts --runInBand
```

Focused downstream regression if additive DTO changes touch digest assembly:

```powershell
cd backend
npm.cmd test -- ai-investment-copilot.service.test.ts notifications-delivery.service.test.ts --runInBand
```

UI smoke, approval-gated only after accepted UI implementation, local app startup plan, Team 00 validation approval, and memory/resource check:

```powershell
cd frontend
npm.cmd run test:ui -- ai-investment-copilot.spec.ts --workers=1
```

Approval-gated builds after accepted implementation and resource check:

```powershell
cd backend
npm.cmd run build
```

```powershell
cd frontend
npm.cmd run build
```

## Unsafe Or Broad Commands Excluded

Do not run by default:

- broad backend or frontend suites with no file filters
- Playwright before the Copilot UI slice is implemented and approved
- Stock Research Workbench or Research Hub UI smoke in this first slice
- dev servers, live services, provider services, startup flows, schedulers, repair/sync/import/backfill jobs
- Prisma generate, migrate, db push, db execute, or any schema/data mutation
- provider tests, Angel One, or live provider checks
- external AI, paid/cloud, telemetry, broker, or real-money flows

## Stop Conditions

Stop QA and return to Team 00 / Architect / UX if:

- implementation expands into shared UI, navigation metadata, route registries, or non-Copilot features
- required trust fields are not source-supported within the reserved Copilot module files
- blocked state still depends on frontend-only inference rather than additive backend contract fields
- Notifications Delivery digest compatibility cannot be shown through focused backend regression
- UI smoke would prove only page load rather than blocked/limited/trusted behavior
- command scope broadens beyond focused backend Jest or approved single-spec Playwright patterns

## Evidence Required Later

- Exact implementation handoff for one combined `CF-W1-UX-02 + CF-W1-UX-05A` packet
- Backend scenario results for blocked, limited, trusted, latest-date-null, scope, digest-regression, and safe-language behavior
- UI smoke evidence for blocked and trusted states only after approved UI implementation
- Exact changed copy list for page/action/section labels
- Confirmation that shared UI/navigation/routes and non-Copilot features stayed untouched
- Skipped checks with reason and next owner
