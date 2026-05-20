# Audit: Research Hub Explainability and Trust Gaps

Date: 2026-05-20

Mode: Read-only source inspection plus docs-only audit output.

## Scope Inspected

- `backend/src/modules/research-hub/research-hub.service.ts`
- `backend/src/modules/research-hub/research-hub.types.ts`
- `backend/src/modules/research-hub/research-hub.md`
- `backend/src/modules/research-hub/research-hub.controller.ts`
- `backend/tests/modules/research-hub/research-hub.service.test.ts`
- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.service.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.md`

Team 02 requirement files were not edited. No application code was modified.

## Why This Surface

Research Hub is the nearest user-facing triage layer after the accepted Lane 3 sequence. It is the place where a trader should be able to answer: what is actionable now, what changed since the last review, and where should I go next. That makes explainability and trust the right audit target, not a deeper execution module.

## Concrete Evidence

- The module doc promises all five review questions, including "What changed since my last review?" and "Where do I go next?" `backend/src/modules/research-hub/research-hub.md:5-13`
- The service still hard-codes `whatChanged` as a simulated MVP block, with `downgradedCandidates: []` and `marketGateChange: null`. `backend/src/modules/research-hub/research-hub.service.ts:132-138`
- The signal summary marks `reliabilityAvailable` as `true` whenever total signal count is greater than zero, even though the module doc says Signal Quality evidence maturity is not yet wired into actionability. `backend/src/modules/research-hub/research-hub.service.ts:109-115` and `backend/src/modules/research-hub/research-hub.md:64-76`
- `nextBestAction.sourceModule` is inferred from the route string instead of being carried as first-class metadata. Any action whose route does not contain `data-quality` is labeled `strategy-decision-engine`, including actions that are not actually sourced there. `backend/src/modules/research-hub/research-hub.service.ts:212-214`
- `dataReadiness` stays `LIMITED` even when there are no local data gaps, because trusted review-universe readiness is explicitly not wired. `backend/src/modules/research-hub/research-hub.service.ts:264-292`
- The module tests confirm the current placeholder behavior, including permanent `INSUFFICIENT_DATA` readiness cards and a blocked overall actionability state. `backend/tests/modules/research-hub/research-hub.service.test.ts:148-155` and `backend/tests/modules/research-hub/research-hub.service.test.ts:281-288`

## Findings

1. `whatChanged` is not real change tracking.

The user-facing card says it answers what changed since the last review, but the implementation only echoes the current top candidates and leaves gate deltas empty. That is a product gap, not just a missing polish detail. A trader cannot tell whether the watchlist improved, a candidate was downgraded, or the market gate flipped.

2. `reliabilityAvailable` overstates evidence quality.

Any non-zero signal count turns the flag on. That makes the Research Hub look more trustworthy than it is, because the module itself admits it is not consuming Signal Quality evidence yet. The flag should either be backed by signal-quality evidence or renamed so it only means "signal counts are present."

3. `nextBestAction.sourceModule` is lossy and misattributed.

The UI and downstream consumers will see the route target, but ownership metadata matters for trust and routing. Inferring the source module from a substring is brittle and wrong for any action that is not data-quality or strategy-decision flavored.

4. `dataReadiness` never becomes a positive readiness signal.

Even when upstream calls succeed and there are no local data gaps, the card remains `LIMITED` because the trusted review-universe contract is not wired in. That means the overview cannot distinguish "local data is fine" from "the research stack is actually ready enough to review." For a command-center surface, that distinction matters.

## Candidate Requirement Ideas

- Add a bounded Research Hub delta snapshot contract so `whatChanged` can compare the current overview against the prior generated snapshot and populate candidate additions, downgrades, and market-gate change.
- Replace `reliabilityAvailable: totalSignalCount > 0` with a real signal-quality-backed evidence field, or rename the field so it only describes raw signal counts.
- Carry explicit `sourceModule` metadata in `NextAction` generation instead of inferring ownership from `targetRoute`.
- Wire `dataReadiness` to the market-data review-readiness contract, or rename the card to make it clear it only reflects local upstream availability.

## Blocker Classification

- Product/requirements gap only.
- No schema, route registry, or shared UI blocker was discovered in this audit scope.
- The current implementation already has enough module access for a bounded requirement; the missing piece is a clearer evidence contract, not a repo-wide rewrite.

## Team 00 Routing Recommendation

Route a narrow Research Hub explainability requirement after the accepted Lane 3 sequence. Keep it bounded to three slices:

1. persisted `whatChanged` deltas,
2. truthful signal evidence/reliability wording, and
3. explicit next-action ownership metadata.

If the queue wants one follow-on instead of three, split the delta snapshot first and leave the evidence and ownership cleanup as the next requirement.

## Validation

- Tests run: none
- Builds run: none
- UI checks run: none
- Live local data checks run: none
- Skipped reason: docs-only read-only audit

## Files Changed By Team 01

- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/audit-research-hub-explainability-2026-05-20.md`

## Files Inspected

- `backend/src/modules/research-hub/research-hub.service.ts`
- `backend/src/modules/research-hub/research-hub.types.ts`
- `backend/src/modules/research-hub/research-hub.md`
- `backend/src/modules/research-hub/research-hub.controller.ts`
- `backend/tests/modules/research-hub/research-hub.service.test.ts`
- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.service.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.md`
