# CF-W1-TSC-01A - Today Review Source-Proven Trigger Evidence Adoption Architecture Review

Date: 2026-05-24

Owner: Team 03 - Solution Architect Factory

Status: Split Required - Team 06 Signal Generation Bridge Before Team 07 Today Review Adoption

## Architecture Verdict

A bounded implementation can safely wire source-proven trigger price evidence into Today Review without Prisma/schema, route-registry, shared utility/UI, package, generated file, provider/live, startup/backfill, broker, paid, or cloud changes.

It is not safe as a Team 07-only implementation.

The slice must be split because current Today Review calls `signalService.latestForInstrument(instrumentId)` without strategy context, while source-proven trigger-price evidence from `CF-W1-SIG-TRIGGER-ENTRY-01` is attached only when Signal Generation performs strategy-aware enrichment.

Recommended split:

1. `CF-W1-TSC-01A-SIG` - Team 06 adds a module-local, optional strategy-aware `latestForInstrument` read adapter in Signal Generation.
2. `CF-W1-TSC-01A-TREV` - Team 07 consumes that adapter from Today Review and projects trusted-candidate evidence without Trade Plan, target, or R:R framing.

These two implementation children are sequential for source writes. Team 07 may prepare docs or tests in parallel, but Today Review source implementation should wait until the Team 06 bridge is accepted.

## Read-Only Evidence Inspected

- `06-contracts/CF-W1-TSC-01-trusted-signal-candidate-contract.md`
- `03-architecture/CF-W1-TSC-01-architecture-review.md`
- `08-work-packets/CF-W1-TSC-01-work-packet.md`
- `04-qa/CF-W1-TSC-01-qa-plan.md`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.service.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.types.ts`
- `backend/src/modules/today-trade-review/today-trade-review.service.ts`
- `backend/src/modules/today-trade-review/today-trade-review.types.ts`
- `backend/src/modules/today-trade-review/today-trade-review.repository.ts`
- `frontend/src/features/today-trade-review/types.ts`
- `frontend/src/features/today-trade-review/components/TodayReviewPage.tsx`
- `frontend/src/features/today-trade-review/components/TodayReviewCandidateDetailPage.tsx`

## Source Findings

- `CF-W1-SIG-TRIGGER-ENTRY-01` added `triggerContract.trigger_price_evidence` and can emit `SOURCE_PROVEN` trigger evidence when strategy-aware enrichment is present.
- `SignalGenerationEngineService.latestForInstrument(instrumentId)` currently enriches without options, so it does not attach Strategy Framework matches or source-proven trigger evidence on the Today Review path.
- `SignalGenerationEngineService.enrichSignals(signals, options)` already has the needed strategy-aware path through `strategyCode` or `includeStrategyMatches`.
- Today Review currently loads each raw signal at `buildCandidateSources` through `signalService.latestForInstrument(instrumentId)`.
- Today Review can persist additional evidence inside existing JSON snapshot fields such as `sourceSignalSnapshot`; no new database field is required for the first adoption slice.
- Today Review should not persist new top-level candidate fields unless a future Prisma/schema decision approves them.

## Team 06 Bridge - Exact Allowed Files

Allowed implementation files for `CF-W1-TSC-01A-SIG`:

- `backend/src/modules/signal-generation-engine/signal-generation-engine.service.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.types.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.md`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.service.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.trigger-contract.test.ts`

Allowed behavior:

- Add an optional strategy-aware read options type for `latestForInstrument`.
- Preserve the existing no-options behavior for controllers and all current callers.
- When options include `strategyCode` or `includeStrategyMatches`, reuse the existing `enrichSignals(..., options)` strategy-aware path.
- If the latest persisted signal is missing or not trusted and the method falls back to a generated run, pass only safe existing run options such as `strategyCode`, `includeStrategyMatches`, `region`, and `assetType`.
- Do not expose new route query parameters in this child.
- Do not change repository query shape or persistence.

## Team 06 Forbidden Files

- Prisma schema or migrations.
- Generated files.
- `backend/src/modules/signal-generation-engine/signal-generation-engine.repository.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.controller.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.router.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.validation.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.module.ts`
- `backend/src/modules/signal-generation-engine/index.ts`
- route registries.
- shared backend utilities.
- shared frontend components.
- package manifests.
- frontend files.
- Today Review files.
- provider/live-data, startup/backfill, paid/cloud, broker, telemetry, or credential files.

## Team 07 Adoption - Exact Allowed Files

Allowed implementation files for `CF-W1-TSC-01A-TREV`, after the Team 06 bridge is accepted:

- `backend/src/modules/today-trade-review/today-trade-review.types.ts`
- `backend/src/modules/today-trade-review/today-trade-review.service.ts`
- `backend/src/modules/today-trade-review/today-trade-review.md`
- `backend/tests/modules/today-trade-review/today-trade-review.service.test.ts`
- `frontend/src/features/today-trade-review/types.ts`
- `frontend/src/features/today-trade-review/components/TodayReviewPage.tsx`
- `frontend/src/features/today-trade-review/components/TodayReviewCandidateDetailPage.tsx`
- `frontend/tests/ui/today-trade-review.spec.ts`

Allowed behavior:

- Extend the Today Review `signalService.latestForInstrument` dependency interface with the optional strategy-aware options accepted by the Team 06 bridge.
- Call Signal Generation with the Strategy Decision strategy code and current review scope.
- Store or project source-proven trigger evidence through existing JSON-backed Today Review snapshots, preferably under `sourceSignalSnapshot`.
- Compute Trusted Signal Candidate grouping from available evidence without adding new persisted columns.
- Treat `HIGHLY_TRUSTED` as allowed only when Data Quality is ready and trigger evidence is `SOURCE_PROVEN` with trigger price, trigger timestamp, strategy/rule/version, and reason summary.
- Downgrade or block candidates with missing Data Quality, unavailable trigger evidence, strategy mismatch, non-entry direction, stale blockers, or unsupported evidence.
- Keep exit and invalidation status as missing or unsupported unless source-proven documented rule evidence exists.
- Replace user-facing Trade Plan, target, and R:R framing on the Today Review candidate surfaces touched by this child.

## Team 07 Forbidden Files

- Prisma schema or migrations.
- Generated files.
- `backend/src/modules/today-trade-review/today-trade-review.repository.ts`
- `backend/src/modules/today-trade-review/today-trade-review.controller.ts`
- `backend/src/modules/today-trade-review/today-trade-review.router.ts`
- `backend/src/modules/today-trade-review/today-trade-review.validation.ts`
- `backend/src/modules/today-trade-review/today-trade-review.module.ts`
- backend or frontend route registries.
- shared backend utilities.
- shared frontend components.
- package manifests.
- Signal Generation source/tests beyond the accepted Team 06 bridge.
- Strategy Decision, Strategy Framework, Data Quality, Market Data, Trade Plan, Portfolio, Watchlist, Alerts, Copilot, or Research Hub source/tests.
- provider/live-data, startup/backfill, paid/cloud, broker, telemetry, or credential files.

## Dependency Risks

- The Team 07 child depends on the accepted Team 06 bridge. Passing a second argument to the current `latestForInstrument` is not enough because the current method ignores strategy context.
- Strategy code alignment must be exact. If `decision.strategy` is not registered in Strategy Framework, Today Review must show unavailable evidence and downgrade or block the candidate.
- Data Quality readiness must come from Today Review's Data Quality snapshot or an explicitly trusted Signal Generation Data Quality eligibility field; do not trust trigger evidence alone.
- Existing Today Review scoring and explainability still contain Trade Plan proof-chain and reward/risk assumptions. The first adoption child must avoid promoting those fields as trusted candidate evidence.
- Existing persistence can carry evidence in JSON snapshots, but it cannot safely add top-level candidate columns without a future Prisma/schema approval.
- Strategy-aware signal enrichment can fetch price history per candidate. Keep the batch bounded by current Today Review limits and do not add provider/live calls.

## QA Handoff Notes

Team 04 should require focused tests proving:

- default `latestForInstrument(instrumentId)` behavior remains backward-compatible for existing consumers;
- strategy-aware `latestForInstrument` attaches `SOURCE_PROVEN` trigger-price evidence only when Strategy Framework entry evidence proves it;
- Today Review passes strategy context and stores/projects trigger evidence without using Trade Plan target, stop, or R:R fields;
- blocked or missing Data Quality cannot produce a `HIGHLY_TRUSTED` candidate;
- missing trigger evidence, strategy mismatch, non-entry direction, or unavailable rule evidence downgrades or blocks the candidate with visible reason text;
- no touched Today Review surface shows R:R, arbitrary targets, synthetic profit targets, or direct advice wording.

## Readiness Recommendation

`CF-W1-TSC-01A` is `split required`.

Team 00 may promote `CF-W1-TSC-01A-SIG` first after Team 04 creates the focused QA plan. Team 00 should not promote `CF-W1-TSC-01A-TREV` until the Signal Generation bridge is accepted and merged into the target worktree base.
