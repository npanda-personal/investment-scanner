# Next Top 10 Candidates

Date: 2026-05-25

Status: Team 02 rolling PO refresh after source/docs audit, active Team 00 and Team 03 prep on `CF-W2-TSC-04`, active Team 00 and Team 08 gating on `CF-W3-MDPIPE-01B5`, and the B6 compact-indicator follow-up. This file is a docs-only candidate view, not proof of implementation readiness. Team 00 still owns Ready movement, exact file reservations, and one-writer sequencing.

Team 00 override: `CF-W1-BT-03`, `CF-W1-CAL-01A`, `CF-W1-TP-01A`, and `CF-W1-DQ-02A` are accepted and locally committed parked branches, not fresh implementation pulls.

Team 02 audit update: `CF-W1-MD-05` is promoted and assigned to Team 05, while `CF-W1-TSC-02A-TREV-HEALTH`, `CF-W2-SIG-01A`, `CF-W1-TSC-03A-TREV-SUPPORTING-EVIDENCE`, `CF-W2-BT-05`, and `CF-W1-BT-04` have moved through implementation/validation gates. None of those items should be reassigned as fresh Team 02 pulls. `CF-W3-MDPIPE-01B3` and `CF-W3-MDPIPE-01B4` already establish the Pipeline Ops split: `/pipeline-ops` owns monitoring and manual triggers, while individual screens may show only compact read-only freshness/progress state. Active `CF-W3-MDPIPE-01B5` and `CF-W3-MDPIPE-01B6` remain in the pipeline lane and stay out of PO discovery. Fresh-pull value should stay on Today Review cleanup, active candidate health, DQ residual truth, and durable trust evidence.

Team 00 correction: `CF-W1-SIG-LATEST-01` is not a current candidate. It was accepted under standing delegation on 2026-05-17 and is documented in `09-summaries/CF-W1-SIG-LATEST-01-summary.md`, `09-summaries/CF-W1-SIG-LATEST-01-po-acceptance-packet.md`, and gate evidence under `03-architecture/`, `04-qa/`, and `13-implementation-evidence/`.

## Current Priority Order

After `TSC-03A` and `BT-05` closure, the remaining unassigned investor/trader-value stack should be refreshed with the next direct trust gaps rather than admin or convenience work.

| Rank | ID | Current state | Why it matters now | Next Team 00 action |
| --- | --- | --- | --- | --- |
| 1 | `CF-W2-TSC-04` | Planning-only requirement | Today Review source/docs still expose target/reward and Trade Plan-style language that conflicts with the trusted signal candidate direction. | Fresh planning candidate; Team 03/04 may prepare bounded contract/QA now that `TSC-03A` released Today Review files. |
| 2 | `CF-W2-TSC-05` | Planning-only requirement | Copy cleanup alone will not remove target/R:R dependence if ranking and eligibility still use target-shaped geometry. | Fresh planning candidate; route to Team 03 for a bounded split before implementation. |
| 3 | `CF-W1-TSC-02` | Requirement-ready requirement draft | Active candidates still need rule-based health tracking after entry until exit, invalidation, expiry, or blockage. | Fresh planning candidate; Team 03 should prepare the bounded architecture packet when Today Review sequencing allows it. |
| 4 | `CF-W1-DQ-02` residual parent | Blocked by architecture consent boundary | Team 03 found the residual read-side/public-contract scope still needs a bounded no-schema follow-up after accepted `DQ-02A`. | Blocked by the residual read-side/public-contract split decision until Team 00 opens a DQE read-side/public-contract packet. |
| 5 | `CF-W1-MD-02A` | Consent-gated proposal | Durable market-data evidence storage remains high-value upstream trust work, but it is still docs-only until schema consent opens. | Blocked by schema/storage consent until Team 00 intentionally opens the evidence packet. |
| 6 | `CF-W1-SQLAB-02B` | Consent-gated proposal | Durable Signal Quality learning memory would strengthen research continuity and calibration review after current trust slices. | Blocked by storage consent until Team 00 intentionally opens the learning-memory packet. |
| 7 | `CF-W1-STRAT-02B` | Consent-gated proposal | Durable strategy revision history would preserve exact rule/version provenance for review and backtesting trust. | Blocked by schema/generated/repository consent until Team 00 intentionally opens the revision-history packet. |
| 8 | `CF-W1-L3-DQ-01A` | Contract-only | Lane 3 passive readiness semantics still need a stable truthful DTO contract. | Contract-only until Team 03/04 define a bounded child that does not collide with active Lane 3 work or shared UI rules. |
| 9 | `CF-W1-UX-02` | Downstream trust UX | Copilot trust UX still matters once the core signal/data/backtest stack is stronger. | Downstream trust UX candidate; keep behind direct investor/trader value unless a trust blocker appears. |
| 10 | `CF-W1-UX-05` | Copilot-only language cleanup | Product-language cleanup can reduce advice-like wording after Copilot trust scope is clear. | Downstream copy-cleanup candidate; fold into or follow `CF-W1-UX-02`, and do not reserve shared UI yet. |

## Dispatch Notes

- `CF-W1-HCTX-03`, `CF-W1-MCTX-02`, `CF-W1-STRAT-04`, and `CF-W1-SQLAB-03` are accepted parked branch commits, not fresh pulls.
- `CF-W1-TSC-01A-TREV` is accepted and locally committed on its Team 07 branch as `9fbc989`; do not re-rank it as an unassigned Team 02 candidate.
- `CF-W1-TSC-01A-SIG` is accepted and locally committed upstream; `CF-W1-DQ-03` is active with Team 05. Do not duplicate either as fresh Team 02 work.
- `CF-W1-SIG-TRIGGER-ENTRY-01` is accepted and locally committed as `649e645`; it is no longer a fresh prep item.
- `CF-W1-MD-05` is promoted and assigned to Team 05; keep it out of fresh Team 02 pulls.
- `CF-W1-TSC-02A-TREV-HEALTH` is already accepted and committed as `34c9993`; keep it out of fresh Team 02 pulls.
- `CF-W1-TP-03` is paused/stale as framed because Product Owner rejected Trade Plan-first, R:R, and arbitrary target workflow direction. Do not execute it unless reframed into Trusted Signal Candidate health without targets/R:R.
- `CF-W1-BT-04` is no longer an unassigned requirement-ready item; it is accepted and locally committed on the Team 06 branch as `2bd794f`.
- `CF-W1-TSC-03A-TREV-SUPPORTING-EVIDENCE` has already moved through implementation and validation; do not reopen the parent as a fresh Team 02 pull unless Team 00 intentionally opens a new child.
- `CF-W2-SIG-01A` has completed validation and local evidence commit `24f938b`; do not reopen it unless new source evidence proves a regression.
- `CF-W1-SIG-LATEST-01` is already accepted from 2026-05-17; do not route it as fresh implementation.
- `CF-W2-BT-05` is promoted and assigned to Team 06; do not route it as fresh planning work.
- `CF-W2-TSC-04` and `CF-W2-TSC-05` remain planning-only Today Review follow-ons until the active Today Review writer set is free.
- `CF-W2-TSC-04` is already in active Team 00 and Team 03 prep; keep it as the top planning slice, but do not let parallel Today Review follow-ons collide with the same writer set.
- The 2026-05-20 backtesting proof-basis audit keeps `CF-W1-BT-03` parked, and `CF-W1-BT-04` has now moved through implementation and validation.
- `CF-W1-RH-03` is accepted and locally committed as `5bd176b`; do not treat it as a fresh Team 02 pull.
- `CF-W3-MDPIPE-01B4` is accepted and locally committed as `8d45ddc`; do not treat it as a fresh Team 02 pull.
- `CF-W3-MDPIPE-01B6` is active Team 08 frontend-only work; do not treat it as a fresh Team 02 pull.
- `CF-W1-RH-02A` is accepted and locally committed as `f391a6d`; do not treat it as a fresh Team 02 pull.
- `CF-W1-BT-03` is accepted and locally committed as `8f984b1`; do not treat it as a fresh Team 02 pull.
- `CF-W1-CAL-01A` is accepted and locally committed as `308cee3`; do not treat it as a fresh Team 02 pull.
- `CF-W1-TP-01A` is accepted and locally committed as `309a853`; do not treat it as a fresh Team 02 pull.
- `CF-W1-DQ-02A` is accepted and locally committed as `c2d6753`; do not treat the completed first child as fresh.
- `CF-W1-STRAT-04` is accepted and locally committed as `8b3498e`; do not treat it as active gate work.
- `CF-W1-SQLAB-03` is accepted and locally committed as `5db98f2`; do not treat it as active gate work.
- `CF-W1-SQLAB-01` is accepted and locally committed as `1a41d95`; `SQLAB-02A` must stack on it.
- `CF-W1-SQLAB-02A` is promoted and assigned to Team 06; do not re-rank it as unassigned work.
- `CF-W1-L3-TREV-02` and `CF-W1-L3-INTEL-03` are already promoted and assigned to Team 07. Do not re-rank them as fresh Team 02 work.
- `CF-W1-L3-AUTH-03` is already promoted and assigned; do not treat it as fresh Team 02 discovery.
- `CF-W1-L3-DQ-01B` is already promoted and assigned to Team 07. Do not treat it as a fresh Team 02 pull.
- `CF-W1-L3-INTEL-02` is already promoted and assigned to Team 07. Do not re-rank it as unassigned work.
- `CF-W1-RH-01`, `CF-W1-MD-01`, `CF-W1-MD-04`, `CF-W1-HCTX-02`, `CF-W1-MD-03`, `CF-W1-MCTX-01`, `CF-W1-TP-02`, `CF-W1-SIG-02`, `CF-W1-STRAT-03`, `CF-W1-L3-WATCH-01`, `CF-W1-BT-02`, and `CF-W1-CAL-01` are accepted, committed, parked, or otherwise already in the live gate path and stay out of fresh Team 02 discovery.
- `CF-W1-TP-03` must stay separate from active/accepted `TP-01A`, `TP-01B`, and `TP-02`.
- `CF-W1-BT-04` must stay separate from accepted `BT-03` and must not be widened into advanced validation work.
- `CF-W3-MDPIPE-01B5` and `CF-W3-MDPIPE-01B6` stay in the pipeline lane. Do not open a separate Team 02 requirement unless a user-facing trust gap remains after the compact-indicator and page-control migration slices land.

## Priority Rule

Direct investor/trader value stays first:

1. market-data freshness and provenance,
2. data-quality readiness,
3. historical and market context,
4. explainable signals/triggers and Today Review trusted-candidate workflow,
5. active signal health and rule-based exit/invalidation,
6. backtesting and calibration trust,
7. research explainability and reviewability,
8. user-owned alert correctness and traceability.

Admin, auth, subscription, notifications, and alert convenience stay behind that stack unless they block correctness, privacy, or user-data safety.
