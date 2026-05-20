# Audit: Direct Investor/Trader Value Gap Follow-up

Date: 2026-05-19

Mode: Read-only source inspection plus docs-only audit output.

## Scope Inspected

- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/next-top-10-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/refinement-queue.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/12-ready-queue/ready-for-implementation.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/00-control/risk-register.md`
- `backend/src/modules/research-hub/research-hub.service.ts`
- `backend/src/modules/research-hub/research-hub.md`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.service.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.md`
- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.md`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.md`

This follow-up intentionally does not duplicate the already routed or active slices `CF-W1-MD-04`, `CF-W1-HCTX-02`, `CF-W1-SIG-02`, `CF-W1-TP-01A`, or `CF-W1-CAL-01A`.

## Queue Reconciliation

- `CF-W1-CAL-01A` remains the top calibration discovery gap in the queue docs, but it is already excluded from this follow-up because you asked not to duplicate it.
- `CF-W1-BT-03` is a real trader-value gap, but it is already routed to Team 03 architecture, so it is not treated here as a fresh Team 02 discovery candidate.
- `CF-W1-RH-01`, `CF-W1-RH-02A`, `CF-W1-SQLAB-02B`, and `CF-W1-L3-DQ-01` are the remaining non-duplicative gaps that still affect direct research trust, reviewability, and trader-facing correctness.

## Ranked Gaps

### 1. `CF-W1-L3-DQ-01`

This is the tightest correctness and user-safety gap left after the routed work. The current queue says it is the next gate after calibration, and the source/docs still show that trusted review surfaces do not yet have a stable readiness consumer contract.

Evidence:

- The refinement queue says `CF-W1-L3-DQ-01` is the next correctness and user-safety slice and that it blocks unready market data from being treated as trusted in trader-facing surfaces. `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/refinement-queue.md:41-46`
- Research Hub still marks `dataReadiness` as limited because trusted review-universe readiness is not yet wired. `backend/src/modules/research-hub/research-hub.md:57-63`
- Research Hub also keeps `signalEvidence`, `calibrationReadiness`, `todayReviewReadiness`, and `tradePlanReadiness` in placeholder or insufficient states rather than stable actionability inputs. `backend/src/modules/research-hub/research-hub.service.ts:167-200`

Why it matters:

- It prevents unready data from being read as trusted on trader-facing surfaces.
- It is the smallest bounded trust gate that still has direct investor value.
- It avoids schema, provider, and broader strategy rewrites.

### 2. `CF-W1-RH-01`

Research Hub still simulates part of the trust story instead of showing stable evidence. The biggest gap is that the hub can aggregate candidates and confirmations, but its "what changed" block is still simulated and its actionability dimensions still rely on placeholders for downstream evidence.

Evidence:

- The service explicitly says `whatChanged` is simulated for MVP until snapshots are tracked for deltas. `backend/src/modules/research-hub/research-hub.service.ts:132-138`
- The service still treats signal evidence and calibration readiness as not yet wired into Research Hub actionability. `backend/src/modules/research-hub/research-hub.service.ts:167-199`
- The module doc repeats that `signalEvidence`, `calibrationReadiness`, `todayReviewReadiness`, and `tradePlanReadiness` are not yet stable inputs, which means the hub cannot yet explain the full evidence chain from source modules. `backend/src/modules/research-hub/research-hub.md:64-98`
- The queue already frames `CF-W1-RH-01` as source-backed evidence wiring that replaces permanent placeholders with stable upstream outputs. `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/refinement-queue.md:61-64`

Why it matters:

- This is the clearest explainability gap for research workflow trust.
- It affects how a user understands whether a candidate or warning is evidence-backed or merely inferred.
- It stays local to the Research Hub adapter layer and does not require new market data math.

### 3. `CF-W1-SQLAB-02B`

Signal Quality Lab still calculates outcomes on demand, and the module doc says there is no persisted `SignalOutcome` table in the MVP. That means the evidence needed for post-event learning can disappear from the user experience instead of accumulating as durable research memory.

Evidence:

- The module doc says outcomes are still calculated on demand and `outcomesPersisted = false`. `backend/src/modules/signal-quality-lab/signal-quality-lab.md:60-103`
- The same doc says no `SignalOutcome` table is persisted in this MVP. `backend/src/modules/signal-quality-lab/signal-quality-lab.md:113-126`
- The refinement queue says the remaining durable gap is explicit child `CF-W1-SQLAB-02B`, described as durable local learning memory. `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/refinement-queue.md:21-26, 72-73, 101-103, 113-116`

Why it matters:

- It is the cleanest research-evidence memory gap after correctness gating.
- It improves repeatability of signal-quality review without changing signal generation.
- It is still bounded, but it should stay behind the correctness gate because it depends on storage consent.

### 4. `CF-W1-RH-02A`

The Research Hub still has a simulated `whatChanged` block, which means delta labels can overstate confidence when no comparison basis exists. That is a narrower but still important explainability gap.

Evidence:

- The service's `whatChanged` block is currently simulated and returns empty `downgradedCandidates` with `marketGateChange: null`. `backend/src/modules/research-hub/research-hub.service.ts:132-138`
- The queue frames `CF-W1-RH-02A` as fail-closed delta semantics so delta labels have a real comparison basis or an explicit unavailable state. `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/refinement-queue.md:63-66`

Why it matters:

- It improves reviewability after a user has already seen the main candidate list.
- It closes a smaller trust gap than `CF-W1-RH-01`, but it is still material for explainability.
- It is a good follow-up only after the higher-value readiness gating and evidence wiring are lined up.

## Recommendation

Team 02 should turn `CF-W1-L3-DQ-01` into the next bounded requirement.

Reasoning:

- it is the closest direct correctness and user-safety gate still open after the routed work;
- it protects trader-facing surfaces from treating unready data as trusted;
- it is smaller and safer than the broader Research Hub wiring work;
- it does not collide with the already routed `CF-W1-MD-04`, `CF-W1-HCTX-02`, `CF-W1-SIG-02`, `CF-W1-TP-01A`, or `CF-W1-CAL-01A` slices.

## Audit Result

This is a real direct-value gap set, not a new requirement invention.

No requirement was created and nothing was promoted to Ready.
