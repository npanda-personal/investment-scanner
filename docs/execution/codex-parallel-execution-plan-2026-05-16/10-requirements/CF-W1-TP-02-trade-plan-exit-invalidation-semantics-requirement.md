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
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.md` still documents target/reward geometry as a core part of plan output and explicitly notes that exit candidates may need a later separate exit-review flow.
- The same module doc says trade-plan validity currently depends on entry zone, stop, target, and invalidation rules being present, which means exit/invalidation semantics are already central to user trust even when the first bounded compatibility child is handled elsewhere.
- `CF-W1-TP-01A` and `CF-W1-TP-01B` already cover the backend compatibility hard-block slice, but the broader exit/invalidation semantics remain future work.

## Bounded Requirement

Define the next Trade Plan semantics slice so exit and invalidation logic is explicit, reviewable, and research-support safe.

This follow-on should focus on:

- replacing target-like user interpretation with modeled exit-level or reward-risk exit-condition language;
- structured exit rule, invalidation rule, and reason evidence where the module owns that information;
- a clear boundary between long-entry review plans and any future exit-review flow;
- additive compatibility for existing plan persistence and list/detail reads where practical;
- no broad schema, route, or UI migration in the first child.

## Acceptance Criteria

- User-facing target semantics are replaced with modeled exit levels or reward-risk exit conditions.
- `targetRewardRisk` or equivalent inputs are capped and validated.
- Exit and invalidation output includes rule IDs, rule version, and reason evidence where the module owns that data.
- Long-entry review plans and future exit-review semantics are clearly separated so the module does not mix incompatible plan intents.
- Advice-like target-price wording does not reappear in the accepted contract.
- Focused tests cover exit-level semantics, invalidation semantics, and rejection of unsupported target-like output.

## Non-Goals

- No broad schema, route, or UI migration without separate approval.
- No paid service, broker, cloud, or external telemetry work.
- No claim that the existing compatibility child slice is replaced or merged.
- No attempt to redesign Today Review, Strategy Decision, or Backtesting in the same pass.

## Likely Owner Team

- Team 03 for the next Trade Plan contract split and exact reservation packet.
- Team 04 for QA planning around exit-condition semantics, invalidation evidence, and target-like wording rejection.
- Team 06 later for bounded implementation if the child stays inside `trade-plan-risk-engine`.

## Expected Architecture / QA Gate

- The next child must stay separate from the already accepted `CF-W1-TP-01B` compatibility hard-block slice.
- Architecture should define whether the first child is backend-only wording/contract normalization or a broader backend+frontend semantics child.
- QA should prepare focused checks for exit rule IDs, invalidation rule IDs, rule version, target-like wording rejection, and unsupported output rejection.

## Likely File Ownership Risk

Risk: Medium.

The cleanest first pass is module-local inside `trade-plan-risk-engine`, but risk rises if the slice pulls in route shape changes, shared DTOs, or frontend surfaces in the same pass.

## Dependencies

- `CF-W1-TP-01A` and `CF-W1-TP-01B` already cover the earlier no-target compatibility direction and should not be reopened.
- Root `AGENTS.md` still forbids arbitrary target prices and direct financial-advice wording.
- Any broader exit-review workflow must remain future work unless Team 03 explicitly splits it out.

## Parallel With `CF-W1-SIG-TRIGGER-02A`

Yes for docs-only architecture and QA prep.

This stays in `trade-plan-risk-engine` and can be routed now without waiting for Team 06's active `signal-generation-engine` implementation files.

## Next Gate

Product refinement and architecture contract for the broader Trade Plan exit/invalidation semantics slice, then later Team 00 Ready evaluation if the scope remains bounded.
