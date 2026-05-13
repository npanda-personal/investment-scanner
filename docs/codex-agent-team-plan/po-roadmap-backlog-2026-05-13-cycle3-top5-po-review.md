# PO Review - Cycle 3 Top 5

Date: 2026-05-13
Mode: Product Owner review only
Scope: `IN / STOCK` personal/local research support. No implementation authorization.

## Evidence Reviewed

- `po-roadmap-backlog-2026-05-13-cycle3-top5.md`
- `po-roadmap-backlog-2026-05-13-cycle3-discovery.md`
- `active-work-board.md`
- `blocker-register.md`
- Cycle 2 QA evidence for C2-WP-01 through C2-WP-04
- Cycle 2 runtime-risk fixes handoff
- Cycle 3 pre-architecture notes
- C2-WP-02 Signal Quality model-version gap discovery
- Cycle 2 current-state PO review

## Current Cycle 2 Blocker State

Cycle 3 implementation should not start yet.

| Item | Current state | PO interpretation |
| --- | --- | --- |
| C2-WP-01 Trusted Universe Repair Workbench | `Blocked`; BLK-0002 open | Static evidence is favorable, but runtime UI/API proof is still required. The lane-click scope risk has a recorded fix, but it still needs runtime regression proof. |
| C2-WP-02 Raw Signal Generation Scope And Model-Version Audit | `Blocked`; BLK-0003 open | Signal Generation static evidence is strong. Signal Quality model-version filter was identified as a real gap and has a runtime-risk fix handoff, but runtime/API/migration evidence and architecture acceptance are still pending. |
| C2-WP-03 Strategy Proof Registry And Evidence Index | `Blocked`; BLK-0004 open | Source contract review is favorable. Final signoff is blocked on focused Strategy Framework runtime UI evidence. |
| C2-WP-04 Today Review Explainability And Exclusion Reasons | `Blocked`; BLK-0005 open | Static evidence is favorable. Runtime UI/API evidence is still required; the `SIGNAL_MATURITY` and `CALIBRATION` summary gap has a recorded fix but still needs proof. |
| C2-WP-05 Research Thesis And Evidence Checklist | `Blocked` in board; not listed as a blocker-register row | Implementation is still blocked by the Prisma schema slot reserved by C2-WP-02 unless Orchestrator explicitly batches schema ownership. |

Additional process note: the active board references in-progress risk-fix QA and architecture addendum artifacts that were not present in the file list at review time. Do not treat the risk fixes as accepted until those addenda or equivalent signoff evidence exists.

## Ranking Decision

Recommendation: change the order.

The proposed Top 5 contains the right themes, but the order is too user-surface-heavy for the current state. The app's biggest product risk is not lack of another discovery screen; it is false confidence from unaccepted readiness, proof, calibration, and run-explainability contracts. Cycle 3 should first harden quant integrity and explain movement, then add broad discovery and personal overlays.

Recommended Cycle 3 order after the relevant Cycle 2 gates are accepted:

1. Strategy Decision Proof And Calibration Consumption
2. Review Run History And Diff
3. Research Hub Readiness Wiring
4. Evidence-Aware Advanced Screener
5. Portfolio And Watchlist Evidence Overlay

If the Orchestrator wants a user-facing discovery item first, the Evidence-Aware Screener should be limited to a read-only current-state slice with no saved screens and no persisted result sets until source contracts are accepted. That is not my preferred order.

## Why Change The Order

### 1. Strategy Decision Proof And Calibration Consumption

Move from rank 5 to rank 1.

This is the highest quant-integrity item. Current Trade Plan evidence shows `0` paper-ready plans and strategy proof/risk blockers. If Strategy Decision does not consume proof and calibration readiness explicitly, downstream screens can still surface attractive but unproven ideas. A screener built before this can amplify weak evidence.

Tightened acceptance criteria:

- Strategy Decision exposes `decisionBeforeEvidenceGates`, `evidenceGates`, final decision state, confidence cap, downgrade reasons, and blocking reasons.
- Calibration consumption respects downstream influence: `NONE` cannot adjust decisions, `LIMITED` can cap confidence only, and normal influence must be bounded and disclosed.
- Strategy proof is matched by strategy code/version, timeframe, region, asset type, and evidence date; mismatched proof produces `UNPROVEN` or `MISSING`, not a downgrade-only pass.
- Weak proof, stale proof, insufficient sample size, missing calibration, stale calibration, and missing source data each produce distinct user-facing research reasons.
- Tests cover proven, limited, blocked, missing, stale, insufficient sample, model-version mismatch, and calibration influence `NONE` states.
- No buy/sell/enter/exit/execute wording is introduced.

### 2. Review Run History And Diff

Keep near the top, moving from rank 2 to rank 2.

This has strong daily-trader value because it explains what changed, which is more useful than a static ranked list. It also creates a defensible baseline for later deterioration overlays and alerts.

Tightened acceptance criteria:

- Diff compares run snapshot to run snapshot by default, not old run to live source state.
- Default history is bounded, for example latest 30 runs or 90 days, with clear handling of missing older snapshots.
- Diff buckets include newly eligible, newly excluded, improved, deteriorated, unchanged, bucket changed, blocker changed, evidence changed, and unknown due to legacy/missing snapshot.
- Score movement must show component movement where available, not just final score delta.
- Data-repair attribution can be claimed only when a repair run id, source timestamp, or before/after readiness evidence exists.
- Existing runs without full explainability show `LEGACY_MISSING` or `UNKNOWN`, not inferred precision.

### 3. Research Hub Readiness Wiring

Move from rank 4 to rank 3.

Given the current blocked state, a readiness console has more immediate value than a broad screener. It tells the user where the research system is blocked and where to inspect next. It should remain a read-only aggregator, not a control plane.

Tightened acceptance criteria:

- Research Hub displays each source independently: Market Data, Signal Generation, Signal Quality, Calibration, Strategy Proof, Today Review, Trade Plan proof chain, and Research Thesis only if C2-WP-05 is accepted.
- Each source card shows source module, status, source date, last updated time, missing evidence, blocker count, and inspect route.
- Hub status cannot collapse into a single optimistic "ready" state unless all required source gates are accepted and current.
- If a source module is unavailable or unaccepted, the hub shows `NOT_WIRED`, `UNKNOWN`, or `NOT_READY` with reason.
- The hub does not trigger repair, generation, backtest, thesis mutation, trade-plan creation, or any provider-heavy job.

### 4. Evidence-Aware Advanced Screener

Move from rank 1 to rank 4.

This remains high-value, but it is the most likely item to create a false sense of precision if built before Cycle 2 runtime gates and Strategy Decision consumption are accepted. It also has schema risk if saved screens are included.

Tightened acceptance criteria:

- First slice must state whether saved screens are in or out. If saved screens are in, one Prisma owner must be reserved before intake.
- Results show source-specific evidence states separately; no blended master readiness score unless PO/Architecture approve the reducer.
- Filters include data readiness, raw signal audit model/ruleset version, Signal Quality usability, calibration influence, strategy proof, Today Review bucket, trade-plan paper-readiness, watchlist/holding state, liquidity, sector, volatility, and stale/source-date gates.
- Liquidity must use available local fields such as average traded value or volume stability where present; otherwise display `UNKNOWN`, not pass.
- Each row shows why it is reviewable or not reviewable, next research action, missing evidence, and source freshness.
- Sorting must not imply a recommendation. Prefer labels such as `research priority`, `evidence completeness`, and `needs inspection`.
- Corporate-action/event-risk state should be shown as `UNKNOWN` if no free/local source exists. Do not silently ignore known gap-risk dimensions.
- No persisted result rows in first slice unless retention and invalidation semantics are explicitly accepted.

### 5. Portfolio And Watchlist Evidence Overlay

Move from rank 3 to rank 5.

This is useful, but the current brief overstates "improving/deteriorating" without requiring a baseline. It also depends on C2-WP-05 if thesis links are included and can easily drift into advice language.

Tightened acceptance criteria:

- Split source ownership first: portfolio owns held state; watchlist owns watch state; Today Review only displays accepted public outputs.
- "Improving/deteriorating" can be shown only when a prior run/history baseline exists. Otherwise show current evidence state only.
- Overlay must not alter Today Review ranking or promotion unless explicitly approved as a separate ranking-policy change.
- Holding/watchlist badges use research language only: `held`, `watchlisted`, `new to review`, `has thesis`, `needs evidence review`.
- Unknown membership is explicit.
- Thesis badges and links are excluded until C2-WP-05 is accepted.
- Portfolio import, broker sync, transaction accounting, P&L, and rebalance language are out of scope.

## Missing Trader/Investor Value

- Event and corporate-action risk remains underrepresented. Earnings, dividends, splits, suspensions, symbol changes, and stale adjustment status can invalidate short-horizon signal interpretation. Keep Local Event-Risk Awareness deferred until free/local feasibility is proven, but add explicit `UNKNOWN` event/corporate-action status to screener/readiness surfaces where possible.
- Liquidity needs tighter domain language. "Volume" is not enough for India small/mid-cap research. Use median traded value, turnover, volume stability, and missing-liquidity warnings when available.
- Strategy robustness is still deferred. That is acceptable, but Strategy Decision should at least expose sample sufficiency, timeframe mismatch, drawdown/cap warnings, and proof staleness so weak backtests do not pass as usable proof.
- Deterioration features need a baseline. Run history should land before overlay/alerts claim improving or deteriorating evidence.
- Portfolio risk diagnostics remain a later item, but overlay acceptance should avoid implying that a held stock deserves more or less action. It should only change research priority and inspection context.

## Intake Gates

- Do not start Cycle 3 implementation until BLK-0002 through BLK-0005 are closed or explicitly split by Orchestrator with PO acceptance of the remaining risk.
- Do not include thesis links, thesis counts, or checklist state in Cycle 3 work until C2-WP-05 is accepted or explicitly excluded.
- Do not start any new Prisma work for Cycle 3 while C2-WP-02/C2-WP-05 schema ownership is unresolved.
- Prefer Wave 1 items with no schema and low source coupling: Strategy Decision proof/calibration, Today Review run diff, and Research Hub read-only wiring.
- Treat Evidence-Aware Screener as Wave 2 unless it is narrowed to a read-only current-state screen with no saved-screen persistence.
