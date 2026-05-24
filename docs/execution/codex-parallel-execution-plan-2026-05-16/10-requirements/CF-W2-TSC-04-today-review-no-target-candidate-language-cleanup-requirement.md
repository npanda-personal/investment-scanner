# CF-W2-TSC-04 Today Review No-Target Candidate Language Cleanup Requirement

Date: 2026-05-24

## Product Value

Today Review is the primary daily workflow for Trusted Signal Candidates. Current source/docs still expose target/reward, reward/risk, and Trade Plan-style wording in Today Review candidate surfaces. That conflicts with the Product Owner direction: trusted candidates should explain rule-triggered entry, confidence evidence, health, exit/invalidation evidence, and blockers without arbitrary targets or R:R framing.

## Audit Evidence

- `backend/src/modules/today-trade-review/today-trade-review.service.ts` still derives Lite target values from risk multiples and maps trade-plan proof-chain reasons.
- `backend/src/modules/today-trade-review/today-trade-review.md` still describes target/reward, reward/risk, and Trade Plan panels as Today Review fields.
- `frontend/src/features/today-trade-review/components/TodayReviewCandidateDetailPage.tsx` still formats target/reward style details when a plan target exists.

## Requirement

Reframe Today Review candidate list/detail language so trusted user-facing surfaces prioritize:

- candidate group and current trust state;
- rule-triggered entry price evidence where available;
- strategy/rule/version evidence;
- data-quality readiness;
- signal health, risk warning, exit-triggered, invalidated, expired, or blocked status;
- reason summary and missing-evidence explanations.

Target/reward, R:R, synthetic profit target, and Trade Plan-first labels must not appear as trusted candidate evidence.

## Acceptance Criteria

- Today Review list/detail user-facing copy does not present `R:R`, arbitrary targets, synthetic profit targets, or target/reward fields as trusted candidate evidence.
- Entry price copy means rule-triggered entry price, source-proven trigger price, or unavailable/missing evidence. It must not be inferred from target, reward/risk, stop geometry, or Trade Plan compatibility fields.
- If current persisted candidate snapshots contain target-shaped compatibility fields, the UI either hides them from trusted candidate framing or labels them compatibility-only/historical where architecture approves.
- Candidate detail keeps blockers, warnings, DQ readiness, strategy proof, calibration/backtesting evidence, and reason summaries visible.
- Existing route paths remain unchanged.
- No Prisma/schema, route registry, shared UI, package manifest, generated type, provider/live, startup/backfill, broker, paid service, or broad Research Hub rewrite is included.

## Non-Goals

- No Trade Plan source rewrite.
- No new trigger persistence table.
- No new signal scoring model.
- No schema migration.
- No shared status-badge or shared table component changes.
- No direct buy/sell advice or execution workflow.

## Likely Module Ownership

- Backend: `today-trade-review`
- Frontend: `today-trade-review`
- QA: Today Review language, table/detail smoke, no target/R:R leakage, DQ-blocked downgrade checks
- Architecture: confirm whether the first slice can remain additive/read-path without changing persisted snapshot schema

## Status

Planning-only. Team 00 must route this through Team 03 architecture and Team 04 QA before any Ready promotion.
