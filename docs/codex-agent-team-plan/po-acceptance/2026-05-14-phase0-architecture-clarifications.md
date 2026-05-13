# Lead PO Clarifications - Phase 0 Trusted Data And Data Quality Tiers

Date: 2026-05-14
Mode: Product Planning / PO Acceptance Mode
Owner: Lead Product Owner
Scope: unblock Phase 0 architecture authorization for `P0.1 Trusted IN/STOCK data baseline` and `P0.2 Data Quality use-case tiers`

## Decision Summary

Phase 0 remains authorized for implementation after these clarifications are applied. The implementation must keep Market Data Foundation as the owner of trusted data truth and Data Quality Engine as a conservative consumer of that truth.

The first implementation path should be additive and low migration risk. Do not start broad schema rewrites, broker automation, paid-provider integration, or downstream gate relaxation in Phase 0.

## Clarifications

### 1. Tier history persistence

Decision: do not require a new persisted tier-history table in the first Phase 0 slice.

Required now:

- expose contract version and `asOfTradingDate` in Data Quality tier DTOs,
- keep current/latest tier output deterministic and testable,
- avoid silently redefining existing `DataQualityEvaluation` fields,
- leave the versioned historical tier ledger as a later work item after the live tier contract is proven.

Rationale: the product needs correct current gating before historical tier analytics.

### 2. Missing listing date and 15-year history

Decision: `listingDate missing + apparent 15-year coverage` can support daily review only when freshness and stored-history checks pass, but it cannot be fully backtest-ready.

Rules:

- daily review may be `LIMITED` when recent trusted EOD and enough price history exist but listing date remains unproven,
- backtest readiness must remain at most `LIMITED` until listing date is proven or the historical window is otherwise explicitly verified,
- calibration readiness must remain `BLOCKED` or `LIMITED` when the missing listing date prevents confidence in full-window outcome evidence,
- automation readiness remains blocked in all Phase 0 cases.

### 3. Signal generation gating

Decision: signal generation and signal consumption must remain gated by scope-level and instrument-level trust.

Rules:

- normal signal runs must not promote untrusted instruments into reviewable candidates,
- a developer/debug override may exist only if it is clearly named, not used by default, and cannot feed promoted decision surfaces,
- downstream modules must consume Data Quality tiers or Market Data trust outputs instead of creating their own freshness/depth heuristics.

### 4. Automation tier

Decision: include `automation` as a visible policy-blocked tier now.

Required behavior:

- Phase 0 DTOs may expose `automation: BLOCKED`,
- reason code must include `PHASE0_AUTOMATION_NOT_AUTHORIZED`,
- UI copy must not imply live trading, broker readiness, or execution eligibility,
- later Angel One work must remain blocked until paper execution, broker abstraction, reconciliation, risk controls, and explicit arming exist.

### 5. First downstream consumer

Decision: Data Quality Engine is the first downstream consumer of the Market Data trusted baseline. Today Review may consume the tier output as read-only context after the Data Quality contract is stable.

Priority order:

1. Market Data Foundation publishes additive trusted-baseline fields.
2. Data Quality Engine computes and exposes use-case tiers from those fields.
3. Data Quality UI shows tier states and blockers.
4. Today Review reads the summary conservatively without changing candidate generation rules in this slice.

## Approval

Lead PO approves Phase 0 implementation planning with these constraints.

Status: `APPROVED_FOR_ORCHESTRATOR_WORK_PACKET`
