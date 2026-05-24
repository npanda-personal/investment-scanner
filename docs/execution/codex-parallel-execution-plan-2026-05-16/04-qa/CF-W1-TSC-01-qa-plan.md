# CF-W1-TSC-01 - Trusted Signal Candidate Workflow QA Plan

Date: 2026-05-24

Owner: Team 04 - QA Factory

Status: QA Plan Draft - Not Ready For Implementation

## QA Objective

Verify that `/today-review` can evolve into Trusted Signal Candidates without Trade Plan, R:R, arbitrary target, or advice-like behavior.

## Required QA Scenarios

- Highly trusted candidates require Data Quality readiness, trigger price, trigger timestamp, strategy/rule/version, and reason summary.
- Missing Data Quality or blocked Data Quality cannot appear as `Highly Trusted`.
- Candidate counts are visible for trusted, needs-review, watch-only, and blocked groups.
- Entry price is shown as the rule-triggered price, not as advice.
- Exit/invalidation status comes only from source-proven documented rules.
- Missing exit/invalidation evidence is shown as missing or unsupported.
- No user-facing trusted candidate surface shows R:R, arbitrary target price, synthetic profit target, or direct financial-advice wording.
- Today Review remains usable as the primary workflow.

## Focused Test Commands For Future Child

Exact commands must be revalidated after Team 00 promotes a child.

Likely commands:

```powershell
cd backend
npm.cmd test -- today-trade-review.service.test.ts today-trade-review.repository.test.ts --runInBand
npm.cmd run build

cd frontend
npm.cmd run build
npm.cmd run test:ui -- today-trade-review.spec.ts --workers=1
```

## QA Risks

- Existing UI text may still mention Trade Plan or targets outside the first child scope.
- Current source may not expose all evidence needed for health state; QA should require visible missing-evidence labels instead of invented confidence.
- UI smoke may need a dedicated local dev server port when other frontend servers are active.

## Next Gate

Team 00 Ready evaluation after source inspection and exact file reservation.
