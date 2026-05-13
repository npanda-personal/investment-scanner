# Associate UX - Decision Workflow Surfaces Audit

Date: 2026-05-14
Mode: UX Discovery
Scope: Today Review, Research Hub, Strategy Decision, Trade Plans, Signal Quality Lab, Signal Calibration Engine

## Purpose

This audit captures the current decision workflow across the app surfaces that answer:

- Is the market permitted for review?
- Which candidates are reviewable now?
- Which positions or plans are exit-risk or blocked?
- What blockers prevent action?
- What should the user do next?

The current implementation splits those answers across multiple modules. The result is understandable in isolation, but not yet coherent as one workflow.

## Current Problems

### Cross-surface fragmentation

- The app exposes pieces of one decision chain across `Research Hub`, `Strategy Decision`, `Today Review`, and `Trade Plans`, but none of those surfaces fully answers the full user question on its own.
- `Research Hub` summarizes market readiness and next actions, but it reads more like an aggregator than a decision surface. The useful answer is often one level deeper in another module.
- `Strategy Decision` mixes market gate, review candidates, wait/watch, exits, rules, evaluate, and lookup into a single tab set. That forces translation between states instead of answering the question directly.
- `Today Review` is the clearest shortlist surface, but the main answer is still distributed across coverage, exclusion explainability, summary counts, and a wide candidate table.
- `Trade Plans` leads with generation and funnel telemetry, which makes the page feel process-first instead of decision-first.
- `Signal Quality` and `Signal Calibration` are readable diagnostic workbenches, but their role in downstream review is not front-loaded enough to feel like part of the same chain.

### Permission is not consistently separated from candidates

- Market permission, review permission, and readiness are not always visually separated from the actual candidate lists.
- In `Research Hub`, market gate status and actionability evidence are adjacent but still require the user to infer whether the workflow is open.
- In `Strategy Decision`, the market gate is a tab, while the candidate list is another tab, so permission and selection are not presented as one decision.
- In `Today Review`, the run header, coverage panel, and shortlist table are all important, but the user has to assemble the answer from multiple containers.

### Candidate, exit, blocker, and next-action states are split too far apart

- Candidate states are visible in shortlist tables, but exit-risk states live elsewhere.
- Blockers are often visible in banners or side panels, while next actions appear in a separate card or button group.
- The same concept may appear in multiple names across modules, which makes the workflow feel inconsistent even when the data is correct.

### Diagnostic depth sometimes overwhelms the primary answer

- `Today Review` and `Trade Plans` include a large amount of support evidence.
- That evidence is valuable, but it competes with the composed answer for attention.
- The user should see the decision first and the diagnostics second.

### Downstream module roles are not explicit enough

- `Signal Quality` should read as historical evidence for signal usefulness, not as a standalone analytics destination.
- `Signal Calibration` should read as a refinement layer for signal evidence, not as a parallel decision surface.
- `Research Hub` should explain why the workflow is in its current state and guide the user to the right next module, not duplicate the output of downstream screens.

## Proposed Workflow UX

### 1. Establish one shared decision rail across the app

Every decision surface should answer the same sequence in the first viewport:

1. Permission: is the workflow allowed right now?
2. Candidates: what is actionable now?
3. Exits: what needs risk reduction or review?
4. Blockers: what is preventing movement?
5. Next action: what should the user do now?

This rail does not need to use identical layout on every page, but it should use the same order and vocabulary.

### 2. Make Today Review the primary shortlist surface

`Today Review` should be the daily answer page:

- Show review mode and trust state first.
- Surface the count of long review candidates, exit-risk review, watch only, and blocked items immediately.
- Keep the candidate table, but move low-frequency explainability into a row detail surface or detail page.
- Preserve the trust and exclusion explanation, but keep it below the main shortlist answer.

### 3. Make Research Hub the command center, not the competing shortlist

`Research Hub` should:

- Summarize the state of the workflow.
- Show the strongest next action.
- Explain why the user should go to `Today Review`, `Strategy Decision`, `Signal Quality`, or `Trade Plans`.
- Avoid acting like a second shortlist page.

### 4. Make Strategy Decision a board for review candidates and exit-risk review

`Strategy Decision` should be reduced to the essentials:

- market permission
- review candidates
- exit-risk review
- wait/watch
- blockers
- evaluation controls

The current tab strip can remain, but the page should still show the answer before the subviews. The candidate preset and evaluation controls should feel like filters on the same decision board, not separate workflows.

### 5. Make Trade Plans the paper-readiness page

`Trade Plans` should answer:

- which plans are ready for paper review
- which are blocked
- which are watch only
- what is causing the blockage

Generation metrics should remain visible, but as secondary telemetry. The page should lead with readiness and blockers, not the batch engine.

### 6. Make Signal Quality and Calibration upstream evidence surfaces

`Signal Quality` should answer whether historical evidence is usable.

`Signal Calibration` should answer whether the signal model is improving or degrading the raw evidence.

Both should be visibly downstream of the review workflow and should link back to the consuming surfaces, especially `Research Hub`, `Strategy Decision`, and `Today Review`.

## Acceptance Criteria

- `Today Review` states the review mode, trust state, and scope in the first viewport.
- `Today Review` shows candidate, exit-risk, watch-only, and blocked counts before deep diagnostics.
- `Research Hub` exposes one clear next best action instead of looking like a second shortlist.
- `Strategy Decision` shows permission, candidates, exits, blockers, and next action without requiring a tab switch.
- `Trade Plans` makes paper-readiness and blockers more prominent than batch generation telemetry.
- `Signal Quality` clearly states whether evidence is usable, insufficient, or unavailable.
- `Signal Calibration` clearly states whether calibration is applied, passthrough, or limited by evidence.
- Blockers are deduplicated and visually outrank positive readiness reasons when both exist.
- Empty states name the exact failure mode: no publication, no trusted universe, no candidates, or filtered-out candidates.
- User-facing copy uses product-safe terms such as review candidate, watch only, exit-risk review, blocked, invalidation, and research support.
- Each page keeps its current scope visible and does not ask the user to re-discover it inside a nested control.
- Each page preserves a clear drilldown path to the more detailed evidence, but that drilldown is secondary to the composed answer.

## Risks

- Collapsing too much detail into one answer rail could hide useful diagnostics for power users.
- Standardizing vocabulary across modules may expose inconsistencies in backend enum names versus user-facing labels.
- Reducing the density of `Strategy Decision` and `Trade Plans` could make advanced users worry that detail has been removed, so drilldowns must stay intact.
- If the shared decision rail is added without simplifying tables and empty states, the pages may still feel overloaded.
- `Signal Quality` and `Signal Calibration` must remain clearly research support only, with no implication that they authorize action by themselves.

## Priority Order

1. `Today Review` and `Research Hub` first: these define the top-level workflow answer and the daily shortlist.
2. `Strategy Decision` second: this is where candidate, exit, and blocker reasoning needs to become readable as one board.
3. `Trade Plans` third: this converts candidate review into paper-readiness and blocker explanation.
4. `Signal Quality` fourth: this clarifies whether historical signal evidence is usable.
5. `Signal Calibration` fifth: this clarifies how raw evidence is transformed and whether it is stable enough for downstream use.

## Notes

- This audit is discovery-only and does not change runtime code.
- The recommended design direction is to make the answer visible before the diagnostics, then preserve evidence depth behind the answer.
