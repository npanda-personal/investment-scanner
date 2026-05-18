# CF-W1-SIG-02 - Canonical Trigger Evidence Compatibility Requirement

Date: 2026-05-19

## Status

New audit-derived requirement. Not Ready for Implementation.

This requirement is docs-ready for architecture-contract and QA-plan preparation only. It must not move to app-code implementation until Team 03 and Team 04 prepare and Team 00 accepts the exact contract, QA plan, work packet, file reservations, and Ready entry.

## Product Value

Signals are one of the product's core direct investor/trader research artifacts. The current optional `triggerContract` projection is useful, but it still leaves users and downstream review workflows with a compatibility object rather than one bounded canonical trigger-evidence packet they can trust for explainability and provenance.

This gap matters directly for:

- signal review and comparison;
- Strategy Decision and Today Review downstream explainability;
- future research evidence, journaling, and trigger provenance work;
- avoiding invented trigger fields in user-facing review flows.

## Current Evidence

Latest inputs:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/audit-strategy-signal-rules.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-SIG-TRIGGER-01-full-trigger-object-contract-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-SIG-TRIGGER-02-persisted-trigger-auditability-requirement.md`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.md`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.types.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.service.ts`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-06-strategy-signal-risk-daemon-2026-05-17-iteration-2.md`

Observed gaps:

- `SignalResultDto` still remains the real downstream signal payload, while `triggerContract` is an optional module-local projection rather than the bounded canonical trigger-evidence shape.
- Current service logic still marks `trigger_price`, `timeframe`, `entry_rule_id`, `exit_rule_id`, `invalidation_rule_id`, `lifecycle_status`, and in current `dev` also `created_at` / `updated_at` as unavailable for the projection.
- Strategy provenance is attached only when a Strategy Framework match is present; otherwise `strategy_id` and `strategy_version` remain unavailable, and the contract does not yet define one proof-safe compatibility policy for that case.
- The projection currently uses `signal.explanation` plus raw triggered and negative factors, but the product still lacks an accepted bounded contract for when this is sufficient trigger evidence versus compatibility-only evidence.
- `latestForInstrument()` can still create a signal on the read path, so canonical trigger evidence must stay honest about what is persisted, what is request-local, and what remains unavailable.

## Bounded Requirement

Define the next bounded Signal Generation trigger-evidence slice so current signal outputs expose one proof-safe canonical trigger-evidence packet without fabricating missing fields and without widening into schema, route, or downstream consumer rewrites.

This requirement should focus on:

- one additive canonical trigger-evidence shape for Signal Generation read surfaces;
- explicit distinction between proven trigger evidence and compatibility-only or unavailable fields;
- clear timestamp semantics for source-price date, source-data date, persisted audit timestamps when available, and request-local generation;
- stable strategy/version provenance semantics when framework evidence exists and explicit unavailability when it does not;
- preserving research-support language and current fail-closed trusted-read behavior.

## Acceptance Criteria

Future accepted implementation must satisfy all approved contract details, including:

- Signal Generation exposes one additive canonical trigger-evidence packet on the relevant read surfaces without removing current payload fields.
- The packet clearly distinguishes:
  - proven current evidence;
  - request-local compatibility evidence;
  - unavailable fields that still need future strategy/rule or persistence work.
- The packet covers at minimum:
  - signal or trigger id;
  - instrument id and symbol;
  - asset class and region where module-owned evidence can prove them;
  - strategy id and strategy version when framework evidence exists;
  - trigger type semantics;
  - reason summary;
  - passed and failed conditions;
  - Data Quality status;
  - trigger timestamp semantics;
  - persisted audit timestamps when available from current owned evidence.
- The contract does not invent trigger price, timeframe, rule ids, lifecycle state, or rule versions when the module cannot prove them.
- Request-local generation or compatibility-only evidence is labeled explicitly and cannot be mistaken for durable persisted trigger origin.
- Existing trusted run/read/latest DQ fail-closed behavior remains intact.
- Existing raw signal score, direction, list filters, and current route behavior remain backward-compatible.
- Module docs and focused tests later prove field completeness, explicit unavailability, timestamp semantics, and trusted-versus-compatibility labeling.

## Non-Goals

- No downstream consumer adoption in Strategy Decision, Today Review, Research Hub, Trade Plan, Alerts, Portfolio, Watchlists, Copilot, or frontend UI in this requirement.
- No Prisma schema, migrations, generated files, route changes, or package changes.
- No normalized trigger table, durable snapshot redesign, or broad persistence migration unless Architecture splits and approves that path separately.
- No Strategy Framework durable rule-version history work; that remains separate from this child.
- No trigger scoring rewrite, signal math rewrite, or paid/cloud/provider expansion.

## Future Candidate Files After Ready Promotion

- `backend/src/modules/signal-generation-engine/signal-generation-engine.service.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.types.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.md`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.service.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.trigger-contract.test.ts`

Optional only if accepted architecture proves current owned persisted timestamps must be surfaced through existing repository reads without schema work:

- `backend/src/modules/signal-generation-engine/signal-generation-engine.repository.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.repository.test.ts`

## Priority Position

This sits ahead of lower-priority Lane 3 convenience work because it closes a direct signal explainability and trigger-provenance gap that affects downstream review trust.

It should now be treated as the next fresh Team 02 discovery item after `CF-W1-BT-03` moved into Team 03 architecture routing.

## Next Gate

Team 03 architecture contract and work-packet prep for a bounded Signal Generation canonical trigger-evidence child, followed by Team 04 QA planning.

Stop and split if the solution requires schema, shared contracts, route changes, frontend adoption, downstream consumer changes, or durable rule-version persistence work.
