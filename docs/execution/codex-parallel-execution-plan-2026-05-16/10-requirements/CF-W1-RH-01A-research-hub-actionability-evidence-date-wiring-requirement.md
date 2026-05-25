# CF-W1-RH-01A - Research Hub Actionability Evidence-Date Wiring Requirement

Date: 2026-05-25

## Status

Audit-derived child requirement draft. Not Ready for Implementation.

## Parent

- `CF-W1-RH-01 - Research Hub Actionability Evidence Wiring Requirement`

## Product Value

Research Hub already exposes an `actionability` contract with per-dimension `evidenceDate`, but the current service leaves those dates unwired while still presenting actionability status cards. That weakens reviewability because the user can see a status and a message without seeing when the supporting evidence was actually measured, generated, or last made available.

This is a smaller trust gap than durable market-data, Signal Quality memory, or strategy revision history. It is still worth defining because it is a bounded no-storage follow-on that improves research honesty without reopening Today Review ownership, Trade Plan-first wording, target-price framing, or schema scope.

## Evidence

- `backend/src/modules/research-hub/research-hub.types.ts` already includes optional `evidenceDate?: string | null` on `ActionabilityDimension`.
- `frontend/src/features/research-hub/api/researchHubApi.ts` exposes the same `evidenceDate?: string | null` field to the frontend.
- `backend/src/modules/research-hub/research-hub.service.ts` builds actionability dimensions through `marketEnvironmentDimension`, `dataReadinessDimension`, `strategyProofDimension`, and `unstableDimension`, but none of those builders currently populate `evidenceDate`.
- `backend/src/modules/research-hub/research-hub.service.ts` still hard-codes placeholder messages for Signal Quality evidence maturity, Calibration readiness, and trusted review-universe readiness, so missing dates are currently silent contract gaps rather than explicit fail-closed outputs.
- `backend/src/modules/research-hub/research-hub.md` documents actionability as a conservative adapter over stable public outputs, which supports a bounded child that wires dates only where the date basis is truthful.
- `frontend/src/features/research-hub/components/ResearchOverviewPage.tsx` already renders per-dimension actionability tiles and can consume additive date metadata without a route or shared-component redesign.

## Bounded Requirement

Define a narrow `RH-01` child that wires `actionability.dimensions.*.evidenceDate` only when Research Hub already has a truthful upstream or module-owned date basis.

The first child should focus on:

- populating `evidenceDate` for actionability dimensions only when the existing read path already owns a trustworthy basis such as an upstream generated timestamp, evidence-through date, or latest measurable date;
- returning `evidenceDate: null` plus an explicit fail-closed message when the dimension is still placeholder-only or when the current read path does not expose a truthful date basis;
- staying additive to the existing `ResearchActionability` contract and existing actionability tiles;
- staying compatible with `CF-W2-CAL-02`, which is expected to define the calibration-owned evidence-through basis before Research Hub claims a calibration evidence date;
- keeping status semantics conservative and research-support only, with no advice-like wording and no upgrade to `READY` based on timestamp presence alone.

## Acceptance Criteria

- Research Hub returns `evidenceDate` for an actionability dimension only when that date comes from an existing truthful upstream or module-owned read surface.
- Research Hub does not fabricate a shared overview timestamp as a substitute for dimension-specific evidence timing.
- Dimensions that remain unwired, placeholder-based, or truthfully date-unknown return `evidenceDate: null` and keep an explicit message explaining the missing evidence basis.
- `signalEvidence`, `calibrationReadiness`, `todayReviewReadiness`, and `tradePlanReadiness` must not claim an evidence date until the relevant upstream date basis is stable and publicly consumable.
- `CF-W2-CAL-02` remains the prerequisite for any non-placeholder calibration evidence date shown in Research Hub.
- The frontend actionability surface can display evidence dates additively where present and remain understandable where the date is null.
- Research Hub language stays research-support only: review, evidence, readiness, limited, blocked, unproven, insufficient data. No buy/sell, target-price, reward/risk, or Trade Plan-first wording is introduced.
- Focused tests later prove both paths:
  - date present when the upstream basis is truthful;
  - date absent with an explicit explanation when the basis is not wired.

## Non-Goals

- No new storage, schema, Prisma, generated type, provider, or route work.
- No broad Research Hub redesign, shared UI changes, or `whatChanged` scope.
- No Today Review ranking, Trusted Signal Candidate, Trade Plan geometry, target-price, or reward/risk logic.
- No new scoring engine or inferred actionability math inside Research Hub.

## Likely Owner Team

- Team 03 for the bounded child contract split, dependency check against `CF-W2-CAL-02`, and exact file reservation plan.
- Team 04 for QA planning around truthful date-present versus date-missing scenarios.
- Later implementation team only after Team 00 routing.

## Expected Architecture / QA Gate

- Keep the child inside `research-hub` contract/service/frontend-owned files unless Team 03 proves a safe additive dependency on already-public upstream date fields.
- Treat calibration evidence date as dependency-gated on `CF-W2-CAL-02`, not as a parallel reinvention inside Research Hub.
- QA should verify that each surfaced date is dimension-specific and not silently substituted from `generatedAt`.

## Likely File Ownership Risk

Risk: Low to Medium.

The bounded child should stay inside `research-hub` backend/frontend docs and tests. Risk rises if it widens into upstream contract creation, shared actionability UI, or date fabrication from non-public internals.

## Dependencies

- `CF-W1-RH-01` parent semantics.
- `CF-W2-CAL-02` for calibration evidence-through date and scoped basis.
- Any already-public upstream generated/evidence dates that Team 03 can prove are safe to consume without reopening module ownership.

## Parallel With Active Team Work

Yes for docs-only architecture and QA prep after the current `CF-W2-CAL-02` packet is handled.

This child does not require Today Review writer ownership, DQ residual file ownership, storage consent, or Trade Plan-first scope.

## Next Gate

Keep this child behind `CF-W2-CAL-02` and behind the three higher-value consent-gated durable-proof proposals in product ranking.

If Team 00 wants the next bounded non-storage follow-on after `CF-W2-CAL-02`, route `CF-W1-RH-01A` to Team 03 for a small contract/dependency packet and to Team 04 for date-truth QA planning.
