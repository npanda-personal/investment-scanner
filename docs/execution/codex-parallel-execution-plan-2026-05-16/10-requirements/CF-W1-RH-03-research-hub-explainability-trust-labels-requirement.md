# CF-W1-RH-03 - Research Hub Explainability Trust Labels Requirement

Date: 2026-05-20

## Status

Audit-derived requirement draft. Not Ready for Implementation.

## Product Value

Research Hub should not overstate trust when it cannot name the source of the next action, the current evidence owner, or the local availability state behind a card. Traders and researchers need the overview to say whether a label is backed by owned public evidence, limited by an upstream gap, or unavailable until a separate basis child lands.

This child is intentionally no-schema first. It should deliver user value through truthful labels and provenance metadata without waiting for durable snapshot storage.

## Evidence

- `backend/src/modules/research-hub/research-hub.service.ts` still infers `nextBestAction.sourceModule` from route text instead of carrying explicit ownership metadata.
- The same service treats `reliabilityAvailable` as a signal-count proxy, which makes the card look more certain than the underlying evidence warrants.
- `backend/src/modules/research-hub/research-hub.service.ts` keeps `dataReadiness` in a limited placeholder state even when the local upstream availability story is more nuanced than a single blanket label.
- `backend/src/modules/research-hub/research-hub.service.ts` still leaves `whatChanged` simulated, so any surface copy around change or review freshness must stay explicit about what is and is not actually known.
- `backend/src/modules/research-hub/research-hub.md` promises explainability and review questions that depend on honest provenance labels, not route-derived guesses.
- The Team 01 audit on 2026-05-20 called out the same trust gap: what changed, what is locally available, who owns the next action, and whether the evidence is merely limited rather than fully trusted.

## Bounded Requirement

Define the first Research Hub explainability child as a no-schema trust-label slice.

The child should focus on:

- explicit `sourceModule` or equivalent source-owner metadata on `nextBestAction` and related review surfaces instead of route-substring inference;
- truthful wording for evidence and reliability labels so `available`, `limited`, `blocked`, `unproven`, and `insufficient` states are distinguishable;
- stricter local upstream availability labels for `dataReadiness` and adjacent summary fields so the card does not imply more trust than the upstream read path supports;
- explicit simulated/unavailable wording for `whatChanged` and related copy when no auditable comparison basis exists;
- additive DTO and copy changes only, with no new persistence layer and no recomputation of upstream strategy, data-quality, or market-context logic;
- compatibility with `CF-W1-RH-02A`, which remains the fail-closed comparison-basis child if the queue later needs a stricter prior-review basis contract.

## Acceptance Criteria

- Research Hub surfaces identify the source of the next action explicitly rather than inferring ownership from the target route.
- Research Hub labels evidence and reliability states using honest upstream-owned wording, not a raw signal-count proxy.
- Research Hub distinguishes limited, blocked, unavailable, and unproven states on the overview instead of defaulting to a trusted appearance.
- `whatChanged`-adjacent copy never suggests a durable comparison basis when none is available.
- The child remains research-support only and does not imply broker authorization, buy/sell advice, or target pricing.
- Focused tests later cover at least one explicit source-owned path, one limited upstream path, and one unavailable-state path.

## Non-Goals

- No Prisma, migration, or storage work.
- No durable snapshot engine or true-delta history rewrite.
- No route registry changes.
- No upstream module math changes.
- No shared UI redesign or new global trust engine.

## Likely Owner Team

- Team 03 for the no-schema contract split and exact reservation boundaries.
- Team 04 for QA planning around provenance, honest labels, and unavailable-state copy.
- Team 08 later if the child needs feature UI copy changes after Team 00 routes it.

## Expected Architecture / QA Gate

- Keep the child additive to the current Research Hub overview contract.
- Consume only existing public outputs and metadata from Research Hub-owned read paths.
- Stop if the first child needs a persisted comparison history, schema change, or upstream private internals; that should become a separate consent-gated requirement.
- QA should prove that the overview can say limited, unavailable, or source-owned without pretending the label is richer than the evidence.

## Likely File Ownership Risk

Risk: Medium.

The clean child should remain inside `research-hub` backend/frontend/docs/test files, but risk rises if the work widens into persistence, route registries, shared UI, or upstream logic rewrites.

## Dependencies

- `CF-W1-RH-01` for the actionability evidence vocabulary that the overview must stay aligned with.
- `CF-W1-RH-02A` for the separate fail-closed comparison-basis path when the queue later needs stronger `whatChanged` semantics.

## Parallel With Active Team 06 And Team 03 Work

Yes for requirement, architecture, and QA prep.

This is a docs-only discovery item now and stays outside Team 06's active module work.

## Next Gate

Team 00 should route this as the next no-schema Research Hub explainability child after the active `RH-01` path is consumed or safely sequenced. If a later audit shows the `whatChanged` panel still needs durable delta storage, split a separate consent-gated snapshot child instead of widening this requirement.
