# CF-W1-SIG-TRIGGER-02 - Persisted Trigger Auditability Requirement

Date: 2026-05-18

## Status

Audit-derived follow-on requirement. Not Ready for Implementation.

This follows the completed bounded `CF-W1-SIG-TRIGGER-01` optional trigger projection slice. The remaining gap is contract-complete trigger evidence that downstream review workflows can audit without inventing missing fields.

## Product Value

Signals remain one of the product's core investor-facing research artifacts. The current optional trigger projection is useful, but it still leaves gaps in trigger price, lifecycle status, rule provenance, timestamps, and durable auditability. Traders need signal evidence that can stand up to review, comparison, journaling, and downstream decision support without pretending missing fields exist.

## Evidence

- `11-module-audits/audit-strategy-signal-rules.md` still flags the trigger object contract as incomplete for strategy/version, trigger fields, rule ids, reason summary, passed/failed conditions, formal DQ status, lifecycle state, and timestamps.
- `backend/src/modules/signal-generation-engine/signal-generation-engine.md` explicitly says the current trigger contract is an optional module-local projection and that `trigger_price`, lifecycle status, rule ids, timeframe, and persisted timestamps remain unavailable.
- `backend/src/modules/signal-generation-engine/signal-generation-engine.types.ts` and `signal-generation-engine.service.ts` show additive contract fields exist, but they are still derived from current records and marked incomplete when evidence is missing.
- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.service.ts` still consumes `SignalResultDto`, which means incomplete trigger evidence can flow into later review surfaces unless the contract gap is addressed clearly.
- `backend/src/modules/today-trade-review/today-trade-review.md` depends on upstream signal evidence for candidate publication and detail narratives, so trigger auditability is not only a Signal Generation concern.

## Bounded Requirement

Define the next bounded Signal Generation trigger-evidence slice so trigger outputs become more auditable without widening into a cross-module rewrite.

This follow-on should focus on:

- durable or persisted trigger evidence for fields that the product treats as required review support;
- explicit contract status for fields that still cannot be proven from current module-owned evidence;
- rule provenance, lifecycle status, trigger timestamp semantics, and DQ evidence mapping that do not rely on invented values;
- additive compatibility for existing signal list, screener, and latest-read consumers;
- no direct financial advice, target-price language, broker behavior, or paid-provider dependency.

## Acceptance Criteria

- The requirement defines how Signal Generation exposes or persists trigger evidence for trigger price, trigger timestamp, lifecycle status, rule provenance, and audit timestamps where the module can own them.
- Fields that still cannot be proven remain explicitly unavailable or incomplete; the contract must not fabricate trigger evidence.
- Downstream consumers can distinguish trusted trigger evidence from compatibility-only projections.
- Existing DQ fail-closed run/read/latest behavior remains intact and is not weakened by the new trigger-auditability slice.
- Focused tests later prove field completeness, incomplete-field signaling, and backward-compatible read behavior.

## Non-Goals

- No downstream consumer adoption in Strategy Decision, Today Review, Trade Plan, Alerts, Portfolio, Watchlists, Copilot, or UI surfaces in this requirement.
- No schema, route, package, shared utility, or shared UI changes without separate approval.
- No normalized trigger table or broad persistence migration unless Architecture explicitly splits and approves that path.
- No rule-behavior rewrite, scoring rewrite, or paid/cloud/provider expansion.

## Future Candidate Files After Ready Promotion

- `backend/src/modules/signal-generation-engine/signal-generation-engine.service.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.types.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.repository.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.md`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.service.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.trigger-contract.test.ts`

## Priority Position

This sits ahead of Lane 3 review-convenience work because it closes a direct signal explainability and auditability gap that affects downstream trust.

## Next Gate

Product refinement and architecture contract for a bounded Signal Generation trigger-auditability child. Stop and split if the solution requires schema, shared contracts, or downstream consumer changes.
