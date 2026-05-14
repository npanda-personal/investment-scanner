# P0.2A Lead PO Acceptance - Data Quality Use-Case Tier Contract

Date: 2026-05-14
Mode: PO Acceptance Mode
Owner: Lead Product Owner / Domain Expert
Work item: P0.2A Data Quality Use-Case Tier Contract

## Inputs Reviewed

- Product brief: `docs/codex-agent-team-plan/po-briefs/2026-05-14-phase0-trusted-data-and-dq-product-briefs.md`
- QA evidence: `docs/codex-agent-team-plan/qa-evidence/2026-05-14-p0-2a-data-quality-tier-contract-qa-evidence.md`
- Lead validation: `docs/codex-agent-team-plan/lead-validation/2026-05-14-p0-2a-data-quality-tier-contract-lead-validation.md`
- Architect signoff: `docs/codex-agent-team-plan/architecture-signoff/2026-05-14-p0-2a-data-quality-tier-contract-architect-signoff.md`

## Product Decision

Decision: `ACCEPT`

## Product-Value Acceptance Checks

1. **"Good enough for what" is now explicit by use case:** `PASS`
   Evidence confirms distinct tier statuses are exposed for `dailyReview`, `signal`, `backtest`, `calibration`, and `automation` rather than one generic readiness interpretation.

2. **Missing trusted-data context fails closed:** `PASS`
   Evidence confirms absent trusted-baseline context (`requiredHistoryStatus`) and missing listing-date confidence now degrade `dailyReview`/`signal` to `LIMITED` and block `backtest`/`calibration`.

3. **Automation remains blocked in Phase 0:** `PASS`
   Evidence confirms `automation` is explicitly `BLOCKED` with `PHASE0_AUTOMATION_NOT_AUTHORIZED` in both service and repository fallback paths.

4. **Legacy scores/booleans do not overstate trust after tiering:** `PASS`
   Evidence confirms legacy fields remain transitional/additive and tier outputs carry blocker reasons so higher-risk use-cases are not implied ready from generic score signals alone.

## Rejection Reasons

None. No product-value rejection conditions remain open for P0.2A in this gate.

## PO Acceptance Outcome

P0.2A is accepted for Phase 0 progression because the implemented tier contract now answers "good enough for what" conservatively, fails closed when trusted-data context is missing, keeps automation blocked, and prevents legacy readiness signals from overstating trust.
