# CF-W1-L3-INTEL-03 - Portfolio Intelligence Concentration Review Requirement

Status: Requirement draft prepared. Not Ready for Implementation. Docs-only discovery item for the active portfolio-risk review workflow.

## Problem

Portfolio Intelligence already computes concentration, sector, country, and holding-level review signals. What it does not yet provide is a durable concentration-review workflow that tells an investor which exposures matter first and why.

The current panel can show health score, red flags, review ranking, and grouped summaries, but it does not make the concentration/exposure review itself explicit enough to support a structured risk pass.

## User Value

Investors and traders need to review exposure, not just score.

They need to know:

- which holdings are most concentrated;
- whether risk is dominated by a single holding, sector, or country;
- why a holding is marked high-risk or review-worthy;
- which exposure is diagnostic versus actionable in a bounded research-support sense;
- how to review concentration without turning the module into an optimizer, rebalance engine, or advice surface.

## Bounded Requirement

Define a bounded portfolio concentration-review contract that surfaces the highest-risk exposures first and explains the concentration driver using existing allocation and review data.

The first child slice should focus on:

- a clear concentration-review taxonomy for holding, sector, and country exposure;
- deterministic ranking of which exposures deserve review first;
- reason summaries grounded in existing allocation, signal overlay, loss, and red-flag evidence;
- portfolio-level and holding-level concentration explanations that stay research-supportive;
- no optimizer, no rebalance suggestion, no tax engine, and no direct financial advice language;
- keep `INTEL-02` as the review-traceability work, not this concentration-exposure layer.

## Evidence Consumed

- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.md`
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.service.ts`
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.types.ts`
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.validation.ts`
- `backend/src/modules/portfolio-management/portfolio-management.md`
- `backend/src/modules/portfolio-management/portfolio-management.service.ts`
- `frontend/src/features/portfolio-intelligence/components/PortfolioIntelligencePanel.tsx`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/audit-portfolio-watchlist-alerts.md`

## What This Is Not

- Not portfolio readiness traceability.
- Not a portfolio optimizer.
- Not a rebalance recommendation engine.
- Not a tax or performance-attribution system.
- Not Ready for Implementation.

## Allowed Future Scope

After Team 00/03 reservation and contract prep, the future child slice may use:

- `backend/src/modules/portfolio-intelligence/**`
- `frontend/src/features/portfolio-intelligence/**`
- `backend/tests/modules/portfolio-intelligence/**`

The first pass should stay inside the portfolio-intelligence workflow and should not require new optimizer logic or broad portfolio-management rewrites.

## Priority Position

This requirement is ranked behind `CF-W1-L3-TREV-01`, `CF-W1-BT-02`, and `CF-W1-L3-ALERT-03`, and ahead of watchlist/calibration/context items because current-holdings concentration review is a higher-value investor workflow than idea-list actionability.

## Next Gate

Team 00/03 reservation and an architecture/QA prep packet are required before any implementation handoff.
