# TEAM-02 Requirement Factory

## Team 02 Rolling Queue Refresh - 2026-05-24

Root `AGENTS.md` intake completed first. Workspace was clean at the start of this pass. Team 02 stayed docs-only and wrote only inside the reserved requirement files.

### Current PO Priority Applied

- Highest user value for investor/trader comes before admin/settings/notifications.
- Priority remains: market data trust, Data Quality trust, signal quality and backtesting trust, calibration, trusted candidate workflow, and active signal health.
- Today Review remains the primary daily workflow.
- No Trade Plan-first framing, no R:R framing, and no arbitrary target-price framing.

### Requirement Refinement Result

Refined and tightened:

- `CF-W1-BT-04-backtesting-run-freshness-and-current-proof-labels-requirement.md`
- `CF-W1-TSC-02-active-signal-health-rule-evidence-requirement.md`

Result:

- `CF-W1-TSC-02` is now requirement-ready for Team 03 architecture prep.
- `CF-W1-BT-04` is now requirement-ready for Team 03 architecture prep.
- Neither item is Ready for implementation.
- No item was moved to `12-ready-queue/ready-for-implementation.md`.

### Queue Re-Sort Result

Active items excluded from fresh discovery:

- `CF-W1-TSC-01A-TREV` is already active with Team 07 / Team 04.
- `CF-W1-DQ-03` is already active with Team 05.
- `CF-W1-TSC-01A-SIG` is already accepted upstream.

Next unassigned queue after active pulls:

1. `CF-W1-TSC-02`
2. `CF-W1-BT-04`
3. `CF-W1-DQ-02` residual parent
4. `CF-W1-MD-02A`
5. `CF-W1-SQLAB-02B`
6. `CF-W1-STRAT-02B`
7. `CF-W1-L3-DQ-01A`
8. `CF-W1-UX-02`
9. `CF-W1-UX-05`
10. `CF-W1-TSC-01` parent residual

### Team 00 / Team 03 Handoff Recommendation

Recommended next Team 00 routing:

1. Send `CF-W1-TSC-02` to Team 03 for bounded architecture prep now, using the active `TSC-01A-TREV` direction but without touching Team 07 files.
2. Queue `CF-W1-BT-04` immediately behind it as the next Team 03 architecture-prep packet, or run it in parallel only if Team 03 can keep file ownership isolated.
3. Keep `CF-W1-DQ-02` as the next residual upstream review only after Team 03 confirms there is a bounded no-schema child to write.

Reason:

- `TSC-02` is the next direct-value extension of the primary Today Review workflow.
- `BT-04` is the next direct backtesting trust slice with clear user value and bounded additive scope.
- `DQ-02` still matters, but only after the residual split question is resolved.

### Files Changed In This Pass

- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-BT-04-backtesting-run-freshness-and-current-proof-labels-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-TSC-02-active-signal-health-rule-evidence-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/next-top-10-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/top-10-ready-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-02-requirement-factory.md`

### Ready Result

No item was moved to Ready by Team 02.

## Team 02 Rolling PO Discovery - Active Pull Exclusion - 2026-05-24

Root `AGENTS.md` intake completed for this pass. Product direction remains direct investor/trader value first: market data, Data Quality, source-proven signal evidence, rule-based health, backtesting/calibration trust, and research explainability. Admin, settings, auth, subscription, notifications, and alert convenience stay low priority unless they block correctness, privacy, or trust.

### Active Pulls Excluded From Fresh Discovery

- `CF-W1-TSC-01A-SIG` is active with Team 06.
- `CF-W1-DQ-03` is active with Team 05.

Team 02 did not move any item to Ready and did not edit application code.

### Next Unassigned Candidates

| Rank | ID | Product value | Dependency / next gate |
| --- | --- | --- | --- |
| 1 | `CF-W1-TSC-01A-TREV` | Today Review should consume the Team 06 trigger-evidence bridge and show trusted candidate grouping, counts, reasons, and conservative health without Trade Plan/R:R framing. | Wait for Team 06 acceptance, then Team 00/03/04 confirm Team 07 reservations. |
| 2 | `CF-W1-BT-04` | Saved backtests need current-proof labels so old simulations do not read like fresh proof. | Team 04 QA planning and Team 00 Ready evaluation later; keep additive and no-schema. |
| 3 | `CF-W1-TSC-02` | Active Trusted Signal Candidates need rule-based health tracking until exit, invalidation, expiry, or blockage. | New requirement draft; Team 03 refinement after active TSC/DQ gates settle. |
| 4 | `CF-W1-DQ-02` residual parent | Currentness parent still may need a bounded no-schema public/read-side follow-up after accepted `DQ-02A`. | Team 03 should split `DQ-02B` or keep parent blocked. |
| 5 | `CF-W1-L3-DQ-01A` | Lane 3 passive readiness display semantics still need stable contract language. | Contract refresh only unless Team 03/04 define a bounded child. |
| 6 | `CF-W1-MD-02A` | Durable market-data evidence storage has high value but needs schema/generated/repository consent. | Proposal-only until Team 00 opens a consent packet. |
| 7 | `CF-W1-SQLAB-02B` | Durable Signal Quality learning memory would preserve post-event research evidence. | Proposal-only until storage/schema consent opens. |
| 8 | `CF-W1-STRAT-02B` | Durable strategy revision history would preserve exact rule/version provenance. | Proposal-only until schema/generated/repository consent opens. |
| 9 | `CF-W1-UX-02` | Copilot trust UX remains useful after core data/signal trust paths are stronger. | Keep Copilot-only and behind direct market/signal/backtest value. |
| 10 | `CF-W1-UX-05` | Copilot-only product-language cleanup can reduce advice-like wording. | Fold into or follow `CF-W1-UX-02`; no shared UI reservation. |

### New Requirement Created

- `10-requirements/CF-W1-TSC-02-active-signal-health-rule-evidence-requirement.md`

Reason: the Product Owner explicitly wants ongoing signal health tracking after a source-proven entry trigger. `CF-W1-TSC-01A` should stay focused on Today Review adoption; `CF-W1-TSC-02` captures the next rule-evidence health gap without widening the active implementation.

### Files Changed In This Pass

- `10-requirements/CF-W1-TSC-02-active-signal-health-rule-evidence-requirement.md`
- `10-requirements/next-top-10-candidates.md`
- `10-requirements/top-10-ready-candidates.md`
- `10-requirements/refinement-queue.md`
- `10-requirements/requirements-backlog.md`
- `17-team-outboxes/TEAM-02-requirement-factory.md`

### Ready Result

No item was moved to Ready by Team 02.

## Team 02 Rolling PO Requirement Report - TSC-01A - 2026-05-24

Root `AGENTS.md` intake completed. Product direction remains: direct investor/trader value first, no Trade Plan-first framing, no R:R, no arbitrary targets, no direct financial advice, and `/today-review` is the preferred daily signal-review cockpit.

### Result For Team 00

`CF-W1-TSC-01` can be reframed into a first bounded child now that `CF-W1-SIG-TRIGGER-ENTRY-01` is accepted and locally committed as `649e645 feat: add signal trigger entry price evidence`.

Team 02 created:

`CF-W1-TSC-01A - Today Review Trusted Signal Candidate Adoption`

Status: requirement drafted; ready for Team 03 architecture/file-reservation prep and Team 04 QA planning; not Ready for implementation.

### Proposed Child Acceptance Criteria

- `/today-review` remains the primary workflow surface.
- Today Review exposes counts for `Highly Trusted`, `Trusted but Needs Review`, `Watch Only`, and `Blocked`.
- `Highly Trusted` requires trusted Data Quality plus `trigger_price_evidence.status === SOURCE_PROVEN`.
- Entry price must be the source-proven rule trigger price, not an entry zone, reference price, target, R:R-derived value, or Trade Plan field.
- Strategy/rule/version, trigger timestamp, and reason summary are shown only where source-proven.
- Missing trigger evidence, blocked DQ, unsupported scope, or stale hard blockers downgrade or block the candidate with visible reasons.
- Exit and invalidation labels require documented rule evidence; otherwise show missing or unsupported evidence.
- Today Review table filtering, sorting, pagination, and non-wrapping row behavior must not regress.
- No surface may show R:R, arbitrary targets, synthetic profit targets, direct buy/sell wording, or Trade Plan-first labels.

### Product-Language Constraints

Use: trusted candidate, entry trigger, trigger price, reason summary, evidence, trust state, health state, blocked, needs review, watch only, data quality missing, manual review required, exit rule, invalidation rule.

Avoid: buy, sell, must act, guaranteed, profit target, price target, R:R, recommendation quality, advice-like wording, and Trade Plan as the primary label.

### Updated Top 10 By Investor/Trader Value

1. `CF-W1-TSC-01A` - Today Review Trusted Signal Candidate adoption.
2. `CF-W1-DQ-03` - Data Quality residual reason summary for downstream trust consumers.
3. `CF-W1-BT-04` - Backtesting saved-run freshness/current-proof labels.
4. `CF-W1-DQ-02` residual parent - no-schema read-side/public-contract follow-up if Team 03 can split one.
5. `CF-W1-L3-DQ-01A` - passive Lane 3 readiness DTO contract refresh.
6. `CF-W1-MD-02A` - market-data companion evidence storage proposal, consent-gated.
7. `CF-W1-SQLAB-02B` - durable Signal Quality learning memory proposal, consent-gated.
8. `CF-W1-STRAT-02B` - durable strategy revision history proposal, consent-gated.
9. `CF-W1-UX-02` - Copilot-only trust UX.
10. `CF-W1-UX-05` - Copilot-only product-language cleanup after UX-02.

Admin, settings, notifications, subscription expansion, and alert convenience remain low priority unless they become correctness, privacy, or evidence-quality blockers.

### Files Changed In This Pass

- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-TSC-01A-today-review-trusted-signal-candidate-adoption-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-TSC-01-trusted-signal-candidate-workflow-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-SIG-TRIGGER-ENTRY-01-rule-trigger-entry-price-evidence-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-TSC-01-trusted-signal-candidate-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-TSC-01-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/next-top-10-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/top-10-ready-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/refinement-queue.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/requirements-backlog.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-02-requirement-factory.md`

No item was moved to Ready by Team 02.

## Team 02 Product Direction Reframe - Trusted Signal Candidates - 2026-05-24

Product Owner redirected signal workflow priority away from Trade Plan, R:R, arbitrary targets, synthetic targets, and target-price framing.

Files changed by Team 00 on behalf of the requirement lane:

- `10-requirements/CF-W1-TSC-01-trusted-signal-candidate-workflow-requirement.md`
- `10-requirements/CF-W1-TP-03-trade-plan-proof-snapshot-freshness-labels-for-generated-plans-requirement.md`
- `10-requirements/top-10-ready-candidates.md`
- `10-requirements/next-top-10-candidates.md`
- `10-requirements/refinement-queue.md`
- `10-requirements/requirements-backlog.md`

Requirement changes:

- Added `CF-W1-TSC-01` as the new top product-direction requirement.
- Anchored the first slice on `/today-review`.
- Defined candidate groups: `Highly Trusted`, `Trusted but Needs Review`, `Watch Only`, and `Blocked`.
- Defined health states: `Active`, `Healthy`, `Weakening`, `Risk Warning`, `Exit Triggered`, `Invalidated`, `Expired`, and `Blocked`.
- Marked `CF-W1-TP-03` paused/stale as framed. Do not execute Trade Plan proof-snapshot freshness work unless it is reframed into Trusted Signal Candidate health with no R:R, arbitrary targets, synthetic targets, or Trade Plan-first UX.

Next recommended Ready-promotion candidate:

- `CF-W1-TSC-01A` after Team 00 source inspection, exact file reservations, and sequencing against accepted `CF-W1-L3-TREV-02` branch commit `f1de1d5`.

---

Date: 2026-05-20

Status: Requirement refinement pass completed for the Team 01 follow-up audit and the backtesting proof-basis refresh. Root `AGENTS.md` was read first and used as the governing product constitution. This remains a docs-only routing view. Team 00 still owns Ready movement, exact file reservations, and one-writer sequencing.

## Current Pass

Team 02 processed the Team 01 direct-value audit handoff for:

1. `CF-W1-TP-03 - Trade Plan proof snapshot freshness labels for generated plans`
2. `CF-W1-BT-04 - Backtesting run freshness and current-proof labels`

Result:

- Both candidates were drafted as refinement-only requirement docs.
- Neither candidate duplicates an already active, accepted, committed, parked, or promoted requirement.
- Neither candidate was moved to Ready.
- The current top five remain unchanged: `HCTX-03`, `DQ-03`, `MCTX-02`, `STRAT-04`, `SQLAB-03`.
- `MCTX-02` was left untouched because it is already active with Team 05.

Queue impact:

- `CF-W1-TP-03` is now the first refinement item behind the current top five.
- `CF-W1-BT-04` is now the second refinement item behind the current top five.
- Both stay ahead of lower-value admin/settings/notification convenience work.
- The prior residual/contract-only stack shifts down but remains intact.

Consent-gate callouts:

- `CF-W1-TP-03` must stop and split if it expands into schema/migration, route registry, shared UI, packages, generated files, provider/live-data behavior, startup/backfill, paid/cloud, broker, or product-policy reinterpretation.
- `CF-W1-BT-04` must stop and split if it expands into the same consent-gated classes or into walk-forward/holdout/parameter-sensitivity implementation.

Product Owner action:

- No immediate Product Owner decision is required for the draft requirement records.
- Product Owner approval is required later if either item leaves additive module-local scope.

## 2026-05-20 Additional Audit: Backtesting Proof-Basis Refresh

Team 02 also reviewed the latest backtesting trust evidence after the Team 01 follow-up draft pass.

Result:

- `audit-backtesting-proof-basis-2026-05-20.md` confirms `CF-W1-BT-03` remains parked and should not re-enter fresh discovery.
- That audit reinforces `CF-W1-BT-04` as the fresh backtesting follow-on because the queue still needs a compact current-proof label on saved runs.
- No new backtesting requirement ID was created in this pass.
- The current top five remain unchanged.

## 2026-05-20 Additional Audit: Stock Research Workbench Scope Behavior

Team 02 audited one under-served direct market-intelligence workflow behind the current top five: Stock Research Workbench scope behavior for `/research/stocks/:id`.

Evidence recorded in:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/audit-stock-research-workbench-scope-behavior-2026-05-20.md`

Result:

- The workflow still has a real scope-proof gap.
- No new bounded requirement should be created in this pass.
- The gap is already covered by the open parent `CF-W1-UX-01`, which already records that the frontend sends only `range`, not `region` or `assetType`, and that scope changes/refetch expectations still need explicit semantics.
- Creating a new `UX-03`-style requirement now would duplicate existing Workbench trust-surface scope instead of producing a genuinely new queue item.

Queue impact:

- No change to the current top five.
- No new requirement ID.
- No item moved to Ready.
- No active, accepted, parked, or consent-gated item was re-ranked as a fresh pull.

Priority decision:

- Keep `CF-W1-UX-01` as the owning parent for any future Workbench scope-proof follow-on.
- Keep that parent behind the current direct-value top five and behind the current active implementation/review gates.

## Work Item

Refresh the next requirement queue after excluding accepted, committed, parked, promoted, or already-active items so later discovery keeps stale branches out of fresh-pull recommendations.

The current top-five requirement front remains:

1. `CF-W1-HCTX-03 - Historical Context nearest-snapshot age and provenance warnings`
2. `CF-W1-DQ-03 - Data Quality residual reason summary for downstream trust consumers`
3. `CF-W1-MCTX-02 - Market Context freshness basis labels for persisted vs generated summaries`
4. `CF-W1-STRAT-04 - Strategy evidence freshness and stale-summary labels`
5. `CF-W1-SQLAB-03 - Signal Quality review-loop actionability for noisy and limited outcomes`

Follow-up audit result for what now sits immediately behind those five:

- No fresh evidence outranks the current top five.
- `CF-W1-TP-03` and `CF-W1-BT-04` are the next legitimate direct-value drafts behind that top five.
- No new Today Review requirement should be drafted while `CF-W1-L3-TREV-02` is active.
- No new Research Hub requirement ID should be drafted from the latest explainability audit because that audit maps to existing `CF-W1-RH-03` coverage.
- The residual / contract-only / consent-gated stack now starts after `TP-03` and `BT-04`.

## Exclusions Applied

Do not treat these as fresh pulls:

- `CF-W1-BT-03` `8f984b1`
- `CF-W1-CAL-01A` `308cee3`
- `CF-W1-TP-01A` `309a853`
- `CF-W1-DQ-02A` `c2d6753`
- `CF-W1-SQLAB-01` `1a41d95`
- `CF-W1-SQLAB-02A` active Team 06
- `CF-W1-RH-03`
- `CF-W1-RH-02A`
- `CF-W1-L3-TREV-02`
- `CF-W1-L3-INTEL-03`
- `CF-W1-L3-DQ-01B`
- `CF-W1-L3-INTEL-02`
- `CF-W1-L3-AUTH-03`
- `CF-W1-MD-04`
- `CF-W1-HCTX-02`
- `CF-W1-MD-03`
- `CF-W1-MCTX-01`
- `CF-W1-TP-02`
- `CF-W1-SIG-02`
- `CF-W1-STRAT-03`
- `CF-W1-L3-WATCH-01`
- `CF-W1-BT-02`
- `CF-W1-CAL-01`
- `CF-W1-RH-01`

Also keep out any other parked branches already listed in the ready queue or current active gate path.

## Refreshed Top 10

| Rank | ID | State | Why it stays here |
| --- | --- | --- | --- |
| 1 | `CF-W1-HCTX-03` | Draft | Historical context needs age and provenance warnings so nearest snapshots do not read like same-day evidence. |
| 2 | `CF-W1-DQ-03` | Draft | Downstream trust consumers need a compact residual reason summary instead of raw DQ arrays. |
| 3 | `CF-W1-MCTX-02` | Draft | Market Context needs an explicit persisted-versus-generated freshness basis label. |
| 4 | `CF-W1-STRAT-04` | Draft | Strategy evidence needs freshness and stale-summary labels so compact summaries do not overclaim recency. |
| 5 | `CF-W1-SQLAB-03` | Draft | Signal Quality Lab needs review-loop actionability for noisy and limited outcomes. |
| 6 | `CF-W1-TP-03` | Draft | Trade Plan proof snapshots need explicit current/stale labels so generated plans do not overclaim recency. |
| 7 | `CF-W1-BT-04` | Draft | Backtesting saved runs need explicit freshness/current-proof labels so older simulations do not read like latest proof. |
| 8 | `CF-W1-DQ-02` residual parent | Split-required market-data / DQ trust gap | Currentness evidence still needs a bounded follow-up after `DQ-02A`; this remains the next residual trust parent. |
| 9 | `CF-W1-L3-DQ-01A` | Contract-only | Lane 3 passive readiness DTOs still matter, but not as the next fresh implementation pull. |
| 10 | `CF-W1-MD-02A` | Proposal-only | Market-data evidence storage remains gated behind schema/generated/repository consent. |

## Behind-The-Top-Five Follow-Up

| Rank | ID | Discovery result | Why it stays here |
| --- | --- | --- | --- |
| 6 | `CF-W1-TP-03` | New refinement-only requirement. | Direct Trade Plan proof-currentness labeling is a better immediate trust slice than residual admin or storage proposals. |
| 7 | `CF-W1-BT-04` | New refinement-only requirement. | Direct Backtesting run current-proof labeling stays ahead of residual admin or storage proposals. |
| 8 | `CF-W1-DQ-02` residual parent | Existing residual item stays valid. | `DQ-02A` solved the first child, but a read-side/public-contract follow-up may still exist if Team 03 can keep it no-schema and additive. |
| 9 | `CF-W1-L3-DQ-01A` | Existing contract-only item stays valid. | Lane 3 still lacks a stable passive readiness DTO story, but it is not ahead of the current top five plus the two new trust drafts. |
| 10 | `CF-W1-MD-02A` | Existing consent-gated proposal stays valid. | Durable market-data provenance still matters, but it needs schema/generated/repository consent before it becomes an implementation candidate. |

## No-New-ID Findings

- Research Hub explainability follow-up from `11-module-audits/audit-research-hub-explainability-2026-05-20.md` is already covered by drafted `CF-W1-RH-03`; Team 02 should not create a duplicate `RH` child right now.
- Today Review does not show a fresh unclaimed requirement beyond active `CF-W1-L3-TREV-02`.
- No new direct investor/trader-value gap beats the current ordering of `HCTX-03`, `DQ-03`, `MCTX-02`, `STRAT-04`, and `SQLAB-03`.
- `TP-03` and `BT-04` are fresh direct-value drafts, but they belong behind that top five.

## Top 3 Unassigned

| Rank | ID | Dependency / consent gate | Parallel-safe? | Product Owner action required? |
| --- | --- | --- | --- | --- |
| 1 | `CF-W1-HCTX-03` | Depends on historical-context lookup outputs only; keep the first child backend-local and additive. | Yes, at docs-only discovery level; keep implementation reservations separate if it later splits. | No new PO decision for discovery; yes if the follow-up widens into schema, route, or shared UI work. |
| 2 | `CF-W1-DQ-03` | Depends on current DQ residual outputs only; it should summarize existing fields rather than duplicate scoring. | Yes, at docs-only discovery level; keep implementation reservations separate if it later splits. | No new PO decision for discovery; yes if the follow-up widens into schema, route, or shared UI work. |
| 3 | `CF-W1-MCTX-02` | Depends on current Market Context summary outputs; it should remain additive to persisted-versus-generated labeling. | Yes, alongside `CF-W1-HCTX-03` and `CF-W1-DQ-03` if file reservations stay isolated. | No new PO decision for discovery; yes if the follow-up widens into schema, route, or shared UI work. |

## Secondary Notes

- `CF-W1-STRAT-04` and `CF-W1-SQLAB-03` remain useful follow-ons for strategy and review-loop trust, but they stay behind the three direct contract slices because they need a little more downstream shaping.
- `CF-W1-MD-02` remains the next upstream provenance parent after the freshness gate, but it stays behind the new fresh slices because it needs explicit storage/evidence consent before app-code work.
- `CF-W1-SIG-TRIGGER-01` stays high because signal/trigger explainability is still incomplete, but it needs broader contract prep than the read-path trust slices.
- `CF-W1-DQ-02`, `CF-W1-L3-DQ-01A`, `CF-W1-MD-02A`, `CF-W1-SQLAB-02B`, and `CF-W1-STRAT-02B` remain the correct stack behind the current top five.
- Research Hub and Today Review do not produce a fresh new Team 02 requirement in this pass; their remaining useful work is already represented by existing drafted or active items.

## Team 00 Handoff

Team 00 should keep `CF-W1-HCTX-03`, `CF-W1-DQ-03`, and `CF-W1-MCTX-02` as the next genuinely unassigned direct-value sends. `CF-W1-STRAT-04` and `CF-W1-SQLAB-03` are the next follow-ons after those three. `CF-W1-MD-02` is the next upstream provenance parent, but it still needs consent before any source or schema path opens.

## Files Changed In This Pass

- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-TP-03-trade-plan-proof-snapshot-freshness-labels-for-generated-plans-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-BT-04-backtesting-run-freshness-and-current-proof-labels-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/next-top-10-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/top-10-ready-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/refinement-queue.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/requirements-backlog.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-02-requirement-factory.md`

## Ready Result

No item is moved to Ready by this Team 02 refresh.
