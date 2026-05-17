# Decision Needed

Decide the approved replacement semantics for Strategy Decision `targetPrice` and target-achieved language before any source change to `strategy-decision-engine` or `trade-plan-risk-engine`.

# Context

The autonomous factory completed Signal Generation read-path trust filtering and latest-instrument DQ gating, then inspected `CF-W1-STRAT-01` as the next priority. Current Strategy Decision output still contains a user-facing `riskPlan.targetPrice`, an exit rule named `Target price achieved.`, and a rationale based on a fixed 15% momentum expectation. The active product direction says arbitrary target-price semantics must be replaced with exit rule, invalidation rule, risk condition, review level, evidence, and reason summary.

This is a true consent blocker because changing or preserving these fields changes product semantics and may affect API consumers.

# Affected Workstream

- Workstream: `CF-W1-STRAT-01`
- Requirement: Remove arbitrary target-price semantics
- Module: `strategy-decision-engine`, with follow-on impact to `trade-plan-risk-engine`
- Lane: Lane 2 strategy/risk

# Affected Files

Current evidence inspected:

- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.service.ts`
- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.types.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.types.ts`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/requirements-backlog.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/12-ready-queue/blocked-by-decision.md`

Potential implementation files if approved later:

- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.service.ts`
- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.types.ts`
- `backend/tests/modules/strategy-decision-engine/**`

Potentially affected future files if the scope expands:

- `backend/src/modules/trade-plan-risk-engine/**`
- `backend/tests/modules/trade-plan-risk-engine/**`

# Evidence Inspected

- `StrategyDecisionEngineService.buildDecisionDto()` builds `riskPlan.targetPrice = latestPrice * 1.15`.
- The same method adds `Target price achieved.` to `exitRules`.
- The same method uses the rationale `Target based on 15% standard momentum expectation.`
- `TradePlanPreview.riskPlan.targetPrice` is part of the current TypeScript DTO contract.
- `trade-plan-risk-engine` still uses target geometry internally, so a broad change may cross module and API boundaries.
- Active backlog already marks `CF-W1-STRAT-01` as blocked by Product Owner decision.
- Escalation rules classify target-price / exit / invalidation ambiguity as a true consent blocker.

# Options

Option A: Remove `targetPrice` from trusted Strategy Decision outputs now.

This best matches the product language direction but may require DTO/API consumer changes. It is not safe under standing delegation without explicit Product Owner and Architect approval.

Option B: Preserve the existing field for compatibility but reinterpret it as a non-advice `reviewLevel` / `riskReviewLevel` style output in a module-local Strategy Decision slice, and replace target-achieved wording with evidence-based exit/invalidation wording.

This avoids schema and route changes while reducing arbitrary target-price language. It still requires Product Owner and Architect approval because the DTO field would temporarily carry compatibility semantics.

Option C: Do not change source yet. Approve only a contract and QA plan defining the replacement model, then implement after downstream API and trade-plan implications are reviewed.

This is safest if the Product Owner wants full semantic clarity before any compatibility compromise.

# Codex Recommendation

Option B is recommended for the next bounded implementation slice, with a clear limitation that it is a compatibility step and does not complete the broader trade-plan target-semantics migration.

# Risk If Approved

- A compatibility field may still be misunderstood as a target price unless the DTO wording and QA checks are precise.
- Downstream modules may continue to contain separate target geometry until their own contracts are approved.
- UI/API consumers may need later migration even if this first slice stays backend module-local.

# Risk If Rejected

- Strategy Decision keeps emitting arbitrary target-price language.
- Trade Plan and downstream user-facing modules remain blocked longer.
- Alerts, backtesting, and copilot trust work cannot safely advance beyond documentation-only preparation.

# Impact On Parallel Work

The following can continue while this waits:

- Data Quality and Market Data audits and contracts.
- Lane 3 readiness consumer contracts.
- Alert ownership/readiness requirements.
- Copilot trust UX requirements.
- Focused QA command matrix work.

The following should remain blocked:

- `CF-W1-STRAT-01` source implementation.
- `CF-W1-TP-01` target-semantics implementation.
- Any downstream trusted strategy/trade-plan user-facing workflow that depends on target/exit semantics.

# Exact Consent Needed

Product Owner: approve Option B, Option C, or another explicit replacement for `targetPrice` / target-achieved wording in Strategy Decision outputs.

Architect: approve whether a compatibility-field Strategy Decision-only slice is acceptable without Prisma, route, shared type, or UI changes.

# Safe Next Step If No Decision Yet

Keep `CF-W1-STRAT-01` in the decision inbox and continue independent docs-only factory work for Lane 3 readiness consumers, alert ownership, and focused QA planning.
