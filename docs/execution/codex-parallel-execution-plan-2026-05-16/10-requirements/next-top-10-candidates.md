# Next Top 10 Candidates

Date: 2026-05-24

Status: Team 02 rolling PO refresh after source/docs audit. Product priority is direct investor/trader value first: market-data freshness/provenance, DQ readiness, explainable signal candidates/triggers, active signal health, exit/invalidation evidence, and backtesting/calibration trust. This is a docs-only priority and routing view. Team 00 still owns Ready movement, exact file reservations, and one-writer sequencing.

Team 00 override: `CF-W1-BT-03`, `CF-W1-CAL-01A`, `CF-W1-TP-01A`, and `CF-W1-DQ-02A` are already accepted and locally committed parked branches. They must not be presented as fresh implementation pulls.

Team 02 audit update: `CF-W1-MD-05` and `CF-W1-TSC-02A-TREV-HEALTH` remain active and must not be reassigned as fresh pulls. Source/docs inspection also found residual Today Review target/reward and Trade Plan-style language plus a Backtesting take-profit simulation/evidence ambiguity; those are captured as new planning-only requirements `CF-W2-TSC-04` and `CF-W2-BT-05`.

## Current Priority Order

| Rank | ID | Current state | Why it matters now | Next Team 00 action |
| --- | --- | --- | --- | --- |
| 1 | `CF-W1-MD-05` | Promoted / assigned | Catalog sync freshness ambiguity directly undermines trust in all downstream signals, backtests, and Today Review. It is a bounded no-schema fix for session freshness and skip-reason explainability. | Team 05 implementation in dedicated worktree; do not reassign. |
| 2 | `CF-W1-TSC-02A-TREV-HEALTH` | Promoted / assigned | Today Review active-signal health is the next downstream workflow after candidate adoption, but it must stack on Team 07 commit `9fbc989`. | Team 07 implementation in dedicated stacked worktree; do not reassign. |
| 3 | `CF-W1-TSC-03` | Requirement draft | After DQ, calibration, and backtesting trust slices, the user needs one Today Review supporting-evidence chain showing DQ, calibration readiness, and backtesting proof currentness without a new score or target framing. | Route to Team 03 architecture prep after `TSC-02A`; keep out of Ready. |
| 4 | `CF-W2-SIG-01A` | Requirement-ready evidence flow | Signal generation runs should fail closed on missing/unavailable DQ by default before downstream candidates trust generated output. | Team 00 should evaluate Ready promotion after active gates clear; Team 03/04 can refresh evidence if needed. |
| 5 | `CF-W1-SIG-LATEST-01` | Requirement-ready evidence flow | Instrument detail/latest-signal reads must not expose legacy or auto-generated trusted-looking signals without DQ readiness evidence. | Team 00 should evaluate after `CF-W2-SIG-01A` or combine only if file reservations stay isolated. |
| 6 | `CF-W2-TSC-04` | New planning-only requirement | Today Review source/docs still expose target/reward and Trade Plan-style language that conflicts with the trusted signal candidate direction. | Route to Team 03/04 for a bounded no-target Today Review language/UX contract after `TSC-02A`. |
| 7 | `CF-W2-BT-05` | New planning-only requirement | Backtesting exit evidence must separate documented rule exits/invalidation from optional take-profit simulation assumptions before supporting candidate health. | Route to Team 03 after signal DQ gates; keep planning-only. |
| 8 | `CF-W1-DQ-02` residual parent | Blocked by architecture consent boundary | Team 03 found no honest second no-schema child after accepted `DQ-02A`; the residual value requires an explicit DQE persisted read-side/public-contract packet. | Keep blocked from implementation until Team 00 opens a DQE read-side/public-contract packet. |
| 9 | `CF-W1-MD-02A` | Consent-gated proposal | Durable market-data evidence storage remains high-value upstream trust work, but it is still docs-only until schema consent opens. | Keep proposal-only; use only for Team 03 / Team 04 packet prep when consent is intentionally opened. |
| 10 | `CF-W1-SQLAB-02B` | Consent-gated proposal | Durable Signal Quality learning memory would strengthen research continuity and calibration review after current trust slices. | Keep proposal-only unless Team 00 deliberately opens storage consent. |

## Dispatch Notes

- `CF-W1-HCTX-03`, `CF-W1-MCTX-02`, `CF-W1-STRAT-04`, and `CF-W1-SQLAB-03` are accepted parked branch commits, not fresh pulls.
- `CF-W1-TSC-01A-TREV` is accepted and locally committed on its Team 07 branch as `9fbc989`; do not re-rank it as an unassigned Team 02 candidate.
- `CF-W1-TSC-01A-SIG` is accepted and locally committed upstream; `CF-W1-DQ-03` is active with Team 05. Do not duplicate either as fresh Team 02 work.
- `CF-W1-SIG-TRIGGER-ENTRY-01` is accepted and locally committed as `649e645`; it is no longer a fresh prep item.
- `CF-W1-MD-05` is now the top upstream trust candidate and should be evaluated before downstream Today Review work once Team 04 QA plan exists.
- `CF-W1-TSC-02A-TREV-HEALTH` has Team 03 architecture and Team 04 QA planning, but remains out of Ready until Team 00 promotes the stacked Team 07 worktree.
- `CF-W1-TP-03` is paused/stale as framed because Product Owner rejected Trade Plan-first, R:R, and arbitrary target workflow direction. Do not execute it unless reframed into Trusted Signal Candidate health without targets/R:R.
- `CF-W1-BT-04` is no longer an unassigned requirement-ready item; it is accepted and locally committed on the Team 06 branch as `2bd794f`.
- `CF-W1-TSC-03` is a new Team 02 draft and should be the next Today Review supporting-trust architecture-prep candidate after `TSC-02A`.
- `CF-W2-SIG-01A` and `CF-W1-SIG-LATEST-01` are the next signal-side DQ enforcement candidates. They should not bypass Team 00 Ready promotion, but they now outrank admin, notification, and Copilot convenience work.
- `CF-W2-TSC-04` and `CF-W2-BT-05` are new planning-only requirements from the 2026-05-24 rolling PO audit.
- The 2026-05-20 backtesting proof-basis audit keeps `CF-W1-BT-03` parked and reinforces `CF-W1-BT-04` as the fresh backtesting current-proof slice.
- `CF-W1-RH-03` is accepted and locally committed as `5bd176b`; do not treat it as a fresh Team 02 pull.
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
