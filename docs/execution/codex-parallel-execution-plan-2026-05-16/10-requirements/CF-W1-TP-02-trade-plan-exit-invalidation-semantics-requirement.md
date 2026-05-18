# CF-W1-TP-02 - Trade Plan Exit And Invalidation Semantics Requirement

Date: 2026-05-18

## Status

Audit-derived requirement draft. Not Ready for Implementation.

## Product Value

Trade-plan output should describe exit and invalidation logic instead of looking like arbitrary target-price advice. Traders need explicit modeled exit conditions, reason evidence, and rule versioning rather than hidden target semantics.

## Evidence

- Audit `11-module-audits/audit-backtesting-trade-risk.md` found target values emitted from reward-risk geometry.
- The same audit found backtest and trade-plan invalidation output is still string-based and does not carry structured exit or invalidation rule IDs in a durable way.
- Root `AGENTS.md` forbids arbitrary target prices and direct advice language.
- `CF-W1-TP-01A` and `CF-W1-TP-01B` already cover the backend compatibility hard-block slice, but the broader exit/invalidation semantics remain future work.

## Acceptance Criteria

- User-facing target semantics are replaced with modeled exit levels or reward-risk exit conditions.
- `targetRewardRisk` or equivalent inputs are capped and validated.
- Exit and invalidation output includes rule IDs, rule version, and reason evidence where the module owns that data.
- Advice-like target-price wording does not reappear in the accepted contract.
- Focused tests cover exit-level semantics, invalidation semantics, and rejection of unsupported target-like output.

## Non-Goals

- No broad schema, route, or UI migration without separate approval.
- No paid service, broker, cloud, or external telemetry work.
- No claim that the existing compatibility child slice is replaced or merged.

## Next Gate

Product refinement and architecture contract for the broader Trade Plan exit/invalidation semantics slice, then later Team 00 Ready evaluation if the scope remains bounded.
