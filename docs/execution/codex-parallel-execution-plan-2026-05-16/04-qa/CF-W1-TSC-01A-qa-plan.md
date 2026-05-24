# CF-W1-TSC-01A - Today Review Trusted Signal Candidate Adoption QA Plan

Date: 2026-05-24

Owner: Team 04 - QA Factory

Status: QA Plan Ready For Team 00 Evaluation; Split Execution Required

Parent: `CF-W1-TSC-01 - Trusted Signal Candidate Workflow`

Architecture packet: `03-architecture/CF-W1-TSC-01A-architecture-review.md`

Work packet: `08-work-packets/CF-W1-TSC-01A-work-packet.md`

## QA Objective

Verify that `/today-review` can adopt source-proven Signal Generation trigger evidence as the basis for Trusted Signal Candidate grouping without using Trade Plan, target-price, R:R, synthetic reward, or advice-like behavior.

The executable work must remain split:

1. `CF-W1-TSC-01A-SIG` - Team 06 Signal Generation bridge.
2. `CF-W1-TSC-01A-TREV` - Team 07 Today Review adoption after the bridge is accepted.

## Child 1 - Team 06 Signal Generation Bridge

### Required Assertions

- `latestForInstrument(instrumentId)` with no options remains backward-compatible for all existing callers.
- Optional strategy-aware read options can be passed to `latestForInstrument` without controller, router, validation, repository, schema, generated, provider, startup, or route-registry changes.
- Strategy-aware enrichment reuses existing Signal Generation enrichment behavior rather than creating duplicate trigger-evidence logic.
- `triggerContract.trigger_price_evidence.status === SOURCE_PROVEN` is emitted only when the current source proves an entry strategy match, rule evidence, finite trigger price, source timestamp, and matching strategy context.
- Missing strategy registration, strategy mismatch, non-entry category, non-bullish/non-entry direction, missing passed entry rule evidence, invalid price, or missing timestamp must produce unavailable or downgrade evidence, not source-proven entry evidence.
- Generated fallback paths preserve the same strategy context only through safe existing run options such as `strategyCode`, `includeStrategyMatches`, `region`, and `assetType`.
- No arbitrary target price, R:R, synthetic profit target, stop geometry, direct buy/sell wording, provider/live call, durable trigger persistence, or route-level API behavior is introduced.

### Focused Commands

Run after Team 06 implementation handoff:

```powershell
cd backend
npm.cmd test -- signal-generation-engine.service.test.ts signal-generation-engine.trigger-contract.test.ts --runInBand
npm.cmd run build
```

Optional advisory language/scope scan for the Team 06 changed files:

```powershell
rg -n "R:R|reward/risk|profit target|price target|target price|buy now|sell now|must act|guaranteed|provider|live|backfill|Prisma|migration" backend/src/modules/signal-generation-engine backend/tests/modules/signal-generation-engine
```

Any scan hit must be reviewed. Test names, existing compatibility identifiers, or documentation of forbidden terms are allowed only when they do not create user-facing behavior or widen scope.

### Child 1 QA Result Criteria

- Accept if the focused tests and backend build pass, default behavior is proven backward-compatible, source-proven trigger evidence is strategy-scoped and fail-closed, and changed files stay inside the Team 06 allowed set.
- Reject if the bridge changes routes/controllers/repositories/schema/shared utilities/packages/generated files, emits source-proven evidence without exact strategy/rule/source proof, introduces target/R:R/advice semantics, or makes provider/live/startup/backfill behavior part of the read path.

## Child 2 - Team 07 Today Review Adoption

Team 07 executable implementation is blocked until Child 1 is accepted and available on the implementation base.

### Required Backend Assertions

- Today Review passes Strategy Decision strategy context and current review scope into the accepted Signal Generation bridge.
- Today Review stores or projects `triggerContract.trigger_price_evidence` through existing JSON-backed snapshots, preferably under `sourceSignalSnapshot`, without adding persisted columns.
- `Highly Trusted` requires trusted Data Quality plus `SOURCE_PROVEN` trigger price evidence, finite trigger price, source-proven trigger timestamp, strategy/rule/version evidence, reason summary, and no blocker.
- Blocked Data Quality, missing Data Quality, unsupported scope, unavailable trigger evidence, invalid source evidence, strategy mismatch, non-entry direction, stale hard blockers, or missing rule evidence cannot produce `Highly Trusted`.
- Missing exit or invalidation evidence is displayed as missing or unsupported. It must not be inferred from target prices, R:R, stop geometry, or Trade Plan compatibility fields.
- Existing legacy snapshots without trigger evidence remain loadable and downgrade visibly rather than crashing.

### Required Frontend / UX Assertions

- `/today-review` remains the primary Trusted Signal Candidate surface.
- Candidate group counts are visible for `Highly Trusted`, `Trusted but Needs Review`, `Watch Only`, and `Blocked`.
- Trusted candidate rows/details show the source-proven entry trigger price, strategy/rule/version, trigger timestamp, and reason summary where available.
- Missing evidence, blocked Data Quality, unsupported scope, and strategy mismatch show visible downgrade/block reasons.
- Today Review table filtering, sorting, pagination, and non-wrapping ellipsis behavior remain intact.
- Full clipped cell content remains available on hover.
- Search text, row labels, detail labels, chips, empty states, alerts, and helper text do not expose forbidden target/R:R/advice wording.

### Product-Language Reject List

Reject if any touched Today Review trusted-candidate surface presents these as user-facing labels or trusted facts:

- `R:R`
- `reward/risk`
- `profit target`
- `price target`
- `target achieved`
- `buy now`
- `sell now`
- `must act`
- `guaranteed`
- `recommendation quality`
- `Trade Plan` as the primary workflow label
- arbitrary target or synthetic reward values

Allowed compatibility identifiers in source are acceptable only when they are not visible user-facing Trusted Signal Candidate language and are not used as trusted evidence.

### Focused Commands

Run after Team 07 implementation handoff:

```powershell
cd backend
npm.cmd test -- today-trade-review.service.test.ts --runInBand
npm.cmd run build
```

```powershell
cd frontend
npm.cmd run build
npm.cmd run test:ui -- today-trade-review.spec.ts --workers=1
```

Advisory product-language scan for touched Today Review frontend files:

```powershell
rg -n "R:R|reward/risk|profit target|price target|target achieved|buy now|sell now|must act|guaranteed|recommendation quality|Trade Plan|trade-plan" frontend/src/features/today-trade-review frontend/tests/ui/today-trade-review.spec.ts
```

Any scan hit must be explained in QA evidence. Existing type names or compatibility payload names are not sufficient reason to fail, but visible rendered wording is a reject.

### Child 2 QA Result Criteria

- Accept if backend tests, frontend build, UI smoke, and product-language checks pass, and the implementation remains inside the Team 07 allowed set after Child 1 acceptance.
- Reject if Today Review uses Trade Plan target/R:R/stop geometry as trusted candidate evidence, invents exit/invalidation health states without documented rule evidence, loses table filter/sort/pagination/no-wrap behavior, adds persistence/schema/routes/shared files, or hides missing/blocking evidence.

## Manual QA Evidence Required

QA evidence for each child must record:

- exact branch/worktree and commit or uncommitted handoff state;
- changed files and confirmation they match the reserved file set;
- focused commands run and pass/fail result;
- skipped commands with concrete reason;
- sample evidence for `SOURCE_PROVEN`, unavailable/downgraded, and blocked states;
- product-language review outcome;
- no Prisma/schema, route registry, shared utility/UI, package, generated, provider/live, startup/backfill, broker, paid/cloud, telemetry, or credential changes.

## Readiness Result

- `CF-W1-TSC-01A-SIG`: QA-plan ready for Team 00 Ready evaluation as the first executable child.
- `CF-W1-TSC-01A-TREV`: QA-plan prepared but not Ready for implementation until the Team 06 bridge is accepted and Team 00 confirms the implementation base and exact file reservations.

No executable QA was run in this planning pass.
