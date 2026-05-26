# CF-W1-RH-01A - Research Hub Actionability Evidence-Date Wiring Requirement

Date: 2026-05-26

## Status

Refined child requirement draft. Architecture-next if Team 00 wants the next bounded non-consent requirement that does not collide with current Daily Overview or Signal Position Ledger gate work. Not Ready for Implementation.

## Parent

- `CF-W1-RH-01 - Research Hub Actionability Evidence Wiring Requirement`

## Product Value

Research Hub already exposes an `actionability` contract with per-dimension `evidenceDate`, but the current service leaves those dates unwired while still presenting actionability status cards. That weakens reviewability because the user can see a status and a message without seeing when the supporting evidence was actually measured, generated, or last made available.

This is still a smaller trust gap than durable market-data, Signal Quality memory, or strategy revision history. It is worth refining now because it is the cleanest next non-consent, no-storage follow-on after the current Daily Overview and Signal Position Ledger gate packets: direct user-facing, bounded to Research Hub-owned read surfaces, and additive to an already published contract.

## Evidence

- `backend/src/modules/research-hub/research-hub.types.ts` already includes optional `evidenceDate?: string | null` on `ActionabilityDimension`.
- `frontend/src/features/research-hub/api/researchHubApi.ts` exposes the same `evidenceDate?: string | null` field to the frontend.
- `backend/src/modules/research-hub/research-hub.service.ts` builds actionability dimensions through `marketEnvironmentDimension`, `dataReadinessDimension`, `strategyProofDimension`, and `unstableDimension`, but none of those builders currently populate `evidenceDate`.
- `frontend/src/features/research-hub/components/ResearchOverviewPage.tsx` renders actionability tiles with label, status, source module, and message only; no evidence-date field is currently shown even when the contract would allow it.
- `backend/src/modules/research-hub/research-hub.service.ts` still hard-codes placeholder messages for Signal Quality evidence maturity, Calibration readiness, and trusted review-universe readiness, so missing dates are currently silent contract gaps rather than explicit fail-closed outputs.
- `backend/src/modules/research-hub/research-hub.md` documents actionability as a conservative adapter over stable public outputs, which supports a bounded child that wires dates only where the date basis is truthful.
- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.service.ts` already returns `updatedAt` on market-gate responses, and Research Hub candidate/backtest inputs already expose generated timestamps in some downstream DTOs. Those are possible truthful bases for a subset of actionability dimensions, but only if Team 03 can prove a dimension-specific mapping without inventing a synthetic shared timestamp.

## Bounded Requirement

Define a narrow `RH-01` child that wires `actionability.dimensions.*.evidenceDate` only when Research Hub already has a truthful upstream or module-owned date basis.

The first child should focus on:

- populating `evidenceDate` for actionability dimensions only when the existing read path already owns a trustworthy basis such as an upstream generated timestamp, evidence-through date, or latest measurable date;
- returning `evidenceDate: null` plus an explicit fail-closed message when the dimension is still placeholder-only or when the current read path does not expose a truthful date basis;
- staying additive to the existing `ResearchActionability` contract and existing actionability tiles;
- staying compatible with the calibration-owned evidence-basis path delivered by `CF-W2-CAL-02A`; Research Hub must not claim a calibration actionability date until Team 03 proves the accepted calibration basis is safely consumable from current public reads;
- proving each actionability dimension independently instead of assuming one shared overview timestamp is good enough for all seven dimensions;
- adding bounded UI support so an actionability tile can show an evidence date when present and remain readable when the value is null;
- keeping status semantics conservative and research-support only, with no advice-like wording and no upgrade to `READY` based on timestamp presence alone.

### Dimension-Level Truth Rule

The architecture pass should explicitly classify each current dimension into one of these buckets:

1. date can be wired now from an existing truthful public basis;
2. date must remain `null` with an explicit basis-missing message;
3. date is dependency-gated on another accepted packet becoming consumable on the current repo base.

Expected starting posture from current source:

- `marketEnvironment`: maybe wireable if `strategy-decision-engine` market-gate `updatedAt` is already a truthful public basis for this exact dimension.
- `strategyProof`: maybe wireable only if Team 03 can define one conservative proof date basis from already-public strategy/backtest evidence without inventing a blended timestamp.
- `dataReadiness`: likely remains `null` unless the current Research Hub-owned data-gap read path exposes a real dimension date.
- `signalEvidence`, `calibrationReadiness`, `todayReviewReadiness`, `tradePlanReadiness`: default to `null` unless Team 03 proves a stable public basis already exists.

## Acceptance Criteria

- Research Hub returns `evidenceDate` for an actionability dimension only when that date comes from an existing truthful upstream or module-owned read surface.
- Research Hub does not fabricate a shared overview timestamp as a substitute for dimension-specific evidence timing.
- Dimensions that remain unwired, placeholder-based, or truthfully date-unknown return `evidenceDate: null` and keep an explicit message explaining the missing evidence basis.
- Research Hub does not infer or backfill `evidenceDate` from `generatedAt` on the outer overview response.
- `signalEvidence`, `calibrationReadiness`, `todayReviewReadiness`, and `tradePlanReadiness` must not claim an evidence date until the relevant upstream date basis is stable and publicly consumable.
- The calibration-owned evidence-basis path delivered by `CF-W2-CAL-02A` remains the prerequisite for any non-placeholder calibration evidence date shown in Research Hub.
- The frontend actionability surface displays evidence dates additively where present and remains understandable where the date is null.
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

- Team 03 for the bounded child contract split, dependency check against `CF-W2-CAL-02A`, and exact file reservation plan.
- Team 04 for QA planning around truthful date-present versus date-missing scenarios.
- Later implementation team only after Team 00 routing.

## Expected Architecture / QA Gate

- Keep the child inside `research-hub` contract/service/frontend-owned files unless Team 03 proves a safe additive dependency on already-public upstream date fields.
- Treat calibration evidence date as dependency-gated on `CF-W2-CAL-02A`, not as a parallel reinvention inside Research Hub.
- QA should verify that each surfaced date is dimension-specific and not silently substituted from `generatedAt`.

## Likely File Ownership Risk

Risk: Low to Medium.

The bounded child should stay inside `research-hub` backend/frontend docs and tests. Risk rises if it widens into upstream contract creation, shared actionability UI, or date fabrication from non-public internals.

## Dependencies

- `CF-W1-RH-01` parent semantics.
- `CF-W2-CAL-02A` calibration evidence-basis packet if Team 03 decides any calibration-owned date can now be consumed safely.
- Any already-public upstream generated/evidence dates that Team 03 can prove are safe to consume without reopening module ownership.

## Parallel With Active Team Work

Yes.

This child does not require Today Review writer ownership, DQ residual file ownership, storage consent, or Trade Plan-first scope. It also stays out of the current `CF-W2-DOV-01` frontend-first dashboard packet and the current `CF-W2-SPL-01B` backend-only ledger packet.

## Next Gate

Keep this child behind the three higher-value consent-gated durable-proof proposals in product ranking.

If Team 00 wants the next bounded non-storage, non-colliding follow-on while `CF-W2-DOV-01` and `CF-W2-SPL-01B` continue through their current gates, route `CF-W1-RH-01A` to Team 03 for a small contract/dependency packet and then to Team 04 for date-truth QA planning.
