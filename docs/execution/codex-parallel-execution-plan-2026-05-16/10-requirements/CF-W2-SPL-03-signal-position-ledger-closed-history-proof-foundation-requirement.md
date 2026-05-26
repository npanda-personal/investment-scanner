# CF-W2-SPL-03 - Signal Position Ledger Closed-History Proof Foundation Requirement

Date: 2026-05-26

Owner: Team 02 - Product / Requirement Factory

Status: New proposal-only follow-up draft. Not Ready for Implementation. Explicit consent-gated requirement.

Parent: `CF-W2-SPL-01 - Signal Position Ledger`

Depends on active or accepted prior children:

- active `CF-W2-SPL-02 - Signal Position Ledger active surface`
- accepted `CF-W2-SPL-01B - Signal Position Ledger active positions read model`

## Product Goal

After active positions are surfaced, the next major investor/trader trust gap is truthful closed history. The user should eventually be able to answer:

- which prior signal positions truly closed;
- when the close happened;
- at what close price;
- which exit or invalidation rule proved the close; and
- what realized follow-through looked like without pretending broker execution, portfolio accounting, or fabricated lifecycle history.

Current execution docs repeatedly keep closed history placeholder-only because durable close proof does not yet exist on the source path. This requirement formalizes that later foundation as a separate consent-gated packet instead of letting it drift back in as UI-only scope.

## Why This Is Separate From `CF-W2-SPL-02`

`CF-W2-SPL-02` is the truthful active-surface child and must stay limited to active rows plus explicit placeholder-only closed history.

`CF-W2-SPL-03` is the later truth-foundation child for durable close lifecycle proof. It should not start while `CF-W2-SPL-02` is still in active review gates, and it should not be reframed as a lightweight frontend follow-on.

## Required Closed-History Truth

Any future closed-history slice must be able to prove, not infer:

- signal-position identity;
- original entry trigger identity and entry price basis;
- close timestamp/date;
- close price basis;
- close reason summary;
- exit rule or invalidation rule identity and version;
- data-quality or evidence status for the close basis;
- explicit unsupported or partial states where proof is missing.

If the source path cannot prove those fields, the product must continue to withhold closed-history rows rather than inventing them from compatibility states, latest-price deltas, or partial ledger heuristics.

## Proposal Boundary

This proposal should be treated as the first truthful closed-history foundation packet for the ledger.

It is expected to require later Team 03 and Team 00 decisions around:

- durable lifecycle or close-event storage;
- schema and generated-file scope;
- exact ownership between signal-generation, strategy-decision, and signal-position-ledger consumers; and
- whether closed-history proof can be additive or requires explicit new persistence.

## Acceptance Criteria

- Closed-history work is framed as proof-first, not UI-first.
- No future child is allowed to show close rows unless close date, close price, and close reason are supported by durable or otherwise truthful evidence.
- Exit-triggered compatibility alone is not treated as closed-history proof.
- Portfolio, broker, realized P/L, and Trade Plan target/reward language remain out of scope.
- The requirement remains explicit that additional schema/storage/generated scope is likely and must be consent-opened first.

## Non-Goals

- No implementation packet in this draft.
- No route, navigation, or shared UI decision in this draft.
- No promise that current source can already support closed history.
- No broker execution or portfolio accounting semantics.

## Next Gate

Hold as proposal-only until Team 00 intentionally opens close-lifecycle/schema-storage consent.

If Team 00 opens that path later, Team 03 should prepare the first architecture packet before any implementation routing begins.
