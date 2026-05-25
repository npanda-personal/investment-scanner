# TEAM-01 Direct Value Gap Audit - 2026-05-25

## Scope

Docs-only direct investor/trader-value audit for the next non-stale backlog gaps after `CF-W2-CAL-02`, using the active execution folder `docs/execution/codex-parallel-execution-plan-2026-05-16/`.

This pass stayed inside the assigned boundary:

- read-only on the specified execution docs
- read-only on the allowed backend/frontend module areas
- write-only to this audit file and `17-team-outboxes/TEAM-01-outbox.md`

No source edits, tests, builds, services, Prisma commands, route changes, queue mutations, or Ready movement were performed.

## Active / Accepted Exclusions Applied

This audit did not reopen:

- `CF-W2-TSC-05A` because Team 04 QA is active and Team 07 owns the Today Review writer family
- `CF-W1-DQ-02-RS1` because Team 05 implementation is active
- `CF-W2-CAL-02` because Team 03 is already queued for architecture prep
- accepted/committed/parked items called out in the assignment, including `BT-04`, `SMI-01`, `BT-03`, `CAL-01A`, `TP-01A`, `DQ-02A`, `HCTX-03`, `MCTX-02`, `STRAT-04`, `SQLAB-03`, `RH-03`, `RH-02A`, `SIG-LATEST-01`, `SIG-TRIGGER-ENTRY-01`, `W2-SIG-01A`, `W2-BT-05`, and accepted MDPIPE slices
- Trade Plan-first, R:R, target-price, synthetic target, buy/sell advice, and arbitrary target work

## Current Control-State Read

As of the latest active-board update dated 2026-05-25:

- Team 04 is active on `CF-W2-TSC-05A` QA verification
- Team 05 is active on `CF-W1-DQ-02-RS1` implementation
- Team 03 is queued for docs-only `CF-W2-CAL-02` architecture prep
- Team 01/02 are the intended thin-backlog discovery lane after `CAL-02`
- `open-decisions.md` reports no open Product Owner decisions

Source:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/00-control/active-work-board.md:43`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/99-decision-inbox/open-decisions.md:1`

## Source Evidence Snapshot

The current codebase already exposes more trust labels than earlier slices, but several of the highest-value proof surfaces remain non-durable or only partially wired:

1. Signal Quality still measures outcomes on demand and explicitly says they are not persisted.
   - `backend/src/modules/signal-quality-lab/signal-quality-lab.md:102`
   - `frontend/src/features/signal-quality-lab/components/SignalQualityLabPage.tsx:168`

2. Calibration exposes sample counts, evidence status, readiness, and generated date, but the current DTO/page shape still does not expose a truthful scoped evidence-through date or page-level evidence basis summary. That is consistent with `CF-W2-CAL-02` already being the next active architecture item.
   - `backend/src/modules/signal-calibration-engine/signal-calibration-engine.types.ts:18`
   - `frontend/src/features/signal-calibration-engine/components/SignalCalibrationEnginePage.tsx:128`

3. Market Context and Historical Context both expose freshness/status fields, but the investor-facing context surfaces are still mostly latest-state reads rather than durable evidence history.
   - `backend/src/modules/market-context-intelligence/market-context-intelligence.types.ts:17`
   - `backend/src/modules/historical-context-snapshots/historical-context-snapshots.types.ts:35`
   - `frontend/src/features/market-context-intelligence/components/MarketContextPage.tsx:23`
   - `frontend/src/features/historical-context-snapshots/components/HistoricalContextSnapshotsPage.tsx:104`

4. Research-facing actionability surfaces already define `evidenceDate`, but some upstream evidence dimensions are still intentionally not wired.
   - `frontend/src/features/research-hub/api/researchHubApi.ts:14`
   - `backend/src/modules/research-hub/research-hub.service.ts:176`

## Ranked Next Gaps After `CF-W2-CAL-02`

### 1. `CF-W1-MD-02A` - durable market-data evidence storage

Direct value rank: highest after `CAL-02`

Why it still matters:

- It is the strongest remaining upstream trust gap.
- Current Market Data and DQ surfaces can show latest readiness/currentness, but not a durable evidence trail strong enough for freshness/provenance review over time.
- This gap affects every downstream trust surface: DQ, signals, calibration, backtests, context, and research review.

Why it stays proposal-only:

- Current queues already classify it as a consent-gated schema/storage packet.
- No implementation-safe child exists without Team 00 intentionally opening storage scope.

Evidence:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/top-10-ready-candidates.md:25`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/requirements-backlog.md:36`

Recommendation:

- Keep rank immediately after `CF-W2-CAL-02`.
- Team 02 should preserve it as the first storage-gated follow-on and not downgrade it behind downstream UX or Today Review residuals.

### 2. `CF-W1-SQLAB-02B` - durable Signal Quality learning memory

Direct value rank: second after `MD-02A`

Why it still matters:

- Signal Quality currently tells the truth that measured outcomes are on-demand and non-persisted.
- That makes cross-session investor learning weaker than it should be.
- Durable measured-outcome memory is the clearest next step for forward-validation trust once `CAL-02` closes its scoped evidence-basis honesty gap.

Evidence:

- `backend/src/modules/signal-quality-lab/signal-quality-lab.md:102`
- `frontend/src/features/signal-quality-lab/components/SignalQualityLabPage.tsx:168`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/top-10-ready-candidates.md:26`

Recommendation:

- Keep it ahead of strategy-history and Lane 3 passive-readiness work.
- Do not relabel it as implementation-ready; it remains storage-consent-gated.

### 3. `CF-W1-STRAT-02B` - durable strategy definition revision history

Direct value rank: third after `MD-02A` and `SQLAB-02B`

Why it still matters:

- Backtesting, calibration, and research review all rely on exact rule/version provenance.
- The current stack already surfaces strategy/rule trust more honestly than before, but durable strategy revision history is still the missing audit spine for later review.

Evidence:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/top-10-ready-candidates.md:27`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/refinement-queue.md:22`

Recommendation:

- Keep it behind outcome memory because measured post-event evidence is more direct investor value than strategy authoring history alone.
- Preserve proposal-only status until Team 00 opens schema/generated/repository scope.

### 4. Small but real gap: evidence-date wiring on research/actionability surfaces

Suggested Team 02 candidate type: fresh requirement draft, not Ready

Why it matters:

- The actionability DTO already includes `evidenceDate`.
- Research Hub still states that Signal Quality evidence maturity, Calibration readiness, and trusted review-universe readiness are not yet wired into actionability.
- This is a smaller gap than the three storage proposals, but it is the clearest remaining research-evidence honesty issue that does not require Today Review ownership or Trade Plan-first framing.

Evidence:

- `frontend/src/features/research-hub/api/researchHubApi.ts:14`
- `backend/src/modules/research-hub/research-hub.service.ts:176`
- `backend/src/modules/research-hub/research-hub.service.ts:184`
- `backend/src/modules/research-hub/research-hub.service.ts:291`

Recommendation:

- Team 02 can draft this as a smaller post-`CAL-02` research-evidence candidate if Team 00 wants a non-storage follow-on.
- Keep it behind the three ranked durable-proof candidates unless Team 00 explicitly prefers a no-schema/no-storage packet.

### 5. `CF-W1-L3-DQ-01A` remains valid but should stay behind core trust storage/history work

Why it matters less right now:

- Passive Lane 3 readiness semantics help downstream honesty, but they do not improve upstream proof quality.
- The backlog is correct to keep it behind direct signal/data/backtest trust work.

Evidence:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/top-10-ready-candidates.md:28`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/requirements-backlog.md:39`

Recommendation:

- Do not pull it forward ahead of `MD-02A`, `SQLAB-02B`, or `STRAT-02B`.

## Items Explicitly Not Recommended For Reopening In This Pass

### `CF-W1-TSC-02` and `CF-W1-TSC-03`

Do not route from this audit.

Reason:

- They still share the Today Review writer family and are intentionally held behind Team 07 activity.

Evidence:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/next-top-10-candidates.md:22`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/00-control/active-work-board.md:43`

### Backtesting fresh-proof follow-ons

Do not reopen in this pass.

Reason:

- The strongest current backtesting freshness/proof slices are already accepted (`BT-04`, `W2-BT-05`).
- No higher-value unassigned backtesting gap surfaced ahead of the storage/history stack.

### Accepted MDPIPE slices

Do not reopen in this pass.

Reason:

- Pipeline reliability/progress work has active and accepted routing already.
- No new investor-facing trust gap surfaced here that outranks the current durable-proof backlog.

## Recommended Team 02 Next-Candidate Order After `CF-W2-CAL-02`

If Team 00 asks Team 02 for the next thin discovery pass after `CAL-02`, this audit recommends:

1. Hold `CF-W1-MD-02A` at the top of the post-`CAL-02` stack
2. Keep `CF-W1-SQLAB-02B` second
3. Keep `CF-W1-STRAT-02B` third
4. Optionally draft a smaller research-evidence-date wiring candidate as the best non-storage follow-on
5. Keep `CF-W1-L3-DQ-01A` and Today Review residuals behind that stack

## Blockers / Consent Gates

- `CF-W1-MD-02A`: storage/schema consent gate
- `CF-W1-SQLAB-02B`: storage consent gate
- `CF-W1-STRAT-02B`: schema/generated/repository consent gate
- `CF-W1-TSC-02` / `CF-W1-TSC-03`: blocked by active Today Review writer ownership
- No human Product Owner decision is currently open, but Team 00 still must intentionally open any gated storage/schema packet

## Teams Ready To Pick Up New Tasks

Based on the latest active-board state:

- Team 01/02: yes, for the next thin backlog discovery/refinement pass after `CF-W2-CAL-02`
- Team 03: occupied with `CF-W2-CAL-02` architecture prep now; next docs-only packet only after Team 00 routes it
- Team 04: not free; active QA
- Team 05: not free; active implementation
- Team 10: queued behind Team 04 acceptance

Implementation routing conclusion:

- No fresh implementation-safe investor/trader-value packet should be pulled from this audit alone.
- The next honest moves are either:
  - finish `CF-W2-CAL-02`, then keep the three durable-proof proposals ranked as proposals, or
  - let Team 02 draft the smaller research-evidence-date wiring candidate if Team 00 wants a non-storage follow-on

## Handoff Summary

- Work item: post-`CF-W2-CAL-02` direct-value gap audit
- State/mode: docs-only audit complete
- Owner: Team 01 - Audit Factory
- Lane/module focus: Market Data, Data Quality, Signal Quality, Calibration, Backtesting, Market Context, Historical Context, research evidence surfaces
- Files changed:
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/TEAM-01-direct-value-gap-audit-2026-05-25.md`
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-01-outbox.md`
- Behavior changed: none
- Contracts changed: none
- Tests run: none
- Tests skipped: all
- Skipped-test reason: assignment explicitly prohibited tests/builds/services/providers/Prisma/UI smoke
- Risks:
  - smaller research-evidence follow-on is real, but lower priority than the three durable-proof proposals
  - storage proposals still require explicit Team 00 consent-gate opening
- Next gate: Team 00/Team 02 backlog refinement only; no Ready movement
