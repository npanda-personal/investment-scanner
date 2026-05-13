# Cross-Module Batch Performance PO Acceptance

## Product Review

The PO concern was that DB-backed batch workflows were taking too long and that Signal Quality Lab counts were misleading for investment decisions.

## Accepted Behavior

- Batch workflows now use bounded concurrency or shared lookup reuse where safe.
- Signal Quality Lab clearly distinguishes:
  - evaluated signals,
  - signals with insufficient future price rows,
  - signals missing local price history.
- The action is presented as a diagnostics refresh, not an outcome persistence or data-repair action.
- Zero-evidence screens remain conservative and point users back to market data completeness.

## Business Rule Confirmation

- Trusted data remains the priority before signals, strategies, backtests, and trades.
- Missing data is not hidden by UI language.
- No paid tools or providers were introduced.
- This improves usability without weakening research-only and paper-readiness guardrails.

## PO Acceptance

Status: accepted.

Move to GitHub Check-In and Released after scoped commit/push evidence is recorded.

