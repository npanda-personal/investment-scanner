# Next Top 10 Candidates

Date: 2026-05-24

Status: Team 00 updated after Product Owner redirected the signal workflow away from Trade Plan, R:R, arbitrary targets, and target-price framing. This is a docs-only priority and routing view. Team 00 still owns Ready movement, exact file reservations, and one-writer sequencing.

Team 00 override: `CF-W1-BT-03`, `CF-W1-CAL-01A`, `CF-W1-TP-01A`, and `CF-W1-DQ-02A` are already accepted and locally committed parked branches. They must not be presented as fresh implementation pulls.

## Current Priority Order

| Rank | ID | Current state | Why it matters now | Next Team 00 action |
| --- | --- | --- | --- | --- |
| 1 | `CF-W1-TSC-01` | Requirement/architecture/QA path drafted | Trusted Signal Candidates should replace Trade Plan/R:R/target-first review framing and use `/today-review` as the daily cockpit. | Inspect current source/tests and evaluate a bounded `TSC-01A` Ready child after STRAT-04/SQLAB-03 gates. |
| 2 | `CF-W1-HCTX-03` | Accepted branch commit | Historical context age/provenance is accepted and parked as `f6034c6`. | Keep parked until clean integration sequencing. |
| 3 | `CF-W1-DQ-03` | Draft requirement | Downstream trust consumers need a compact residual reason summary instead of raw DQ arrays. | Team 03 architecture contract and QA planning. |
| 4 | `CF-W1-MCTX-02` | Accepted branch commit | Market Context freshness-basis work is accepted and parked as `0c802c2`. | Keep parked until clean integration sequencing. |
| 5 | `CF-W1-STRAT-04` | Implementation gate active | Strategy evidence freshness and stale-summary labels keep compact summaries honest. | Finish QA/review/signoff/acceptance. |
| 6 | `CF-W1-SQLAB-03` | Implementation gate active | Signal Quality Lab needs review-loop actionability for noisy and limited outcomes. | Finish QA/review/signoff/acceptance. |
| 7 | `CF-W1-BT-04` | Architecture prepared | Backtesting needs saved-run freshness/current-proof labels so older saved simulations do not read like current proof. | Team 04 QA planning later; do not outrank TSC workflow. |
| 8 | `CF-W1-DQ-02` residual parent | Needs Team 03 follow-up split | `DQ-02A` currentness evidence is accepted, but the parent still has read-side/public-contract residual scope. | Team 03 should identify whether a no-schema `DQ-02B` child exists or keep the parent blocked. |
| 9 | `CF-W1-L3-DQ-01A` | Contract-only child | Passive readiness display remains a Lane 3 trust contract gap, but not the next app-code pull. | Keep as contract refresh unless Team 03/04 produce a bounded child. |
| 10 | `CF-W1-MD-02A` | Consent-gated schema proposal | Durable market-data evidence storage remains valuable but schema/generated/repository scope is gated. | Keep proposal-only unless a true consent packet is opened. |

## Dispatch Notes

- `CF-W1-HCTX-03`, `CF-W1-DQ-03`, `CF-W1-MCTX-02`, `CF-W1-STRAT-04`, and `CF-W1-SQLAB-03` are fresh draft requirements from the 2026-05-20 Team 01 audit. They are not Ready and do not move to Ready in this update.
- `CF-W1-TP-03` is paused/stale as framed because Product Owner rejected Trade Plan-first, R:R, and arbitrary target workflow direction. Do not execute it unless reframed into Trusted Signal Candidate health without targets/R:R.
- `CF-W1-BT-04` remains a later refinement-only draft behind Trusted Signal Candidate work.
- The 2026-05-20 backtesting proof-basis audit keeps `CF-W1-BT-03` parked and reinforces `CF-W1-BT-04` as the fresh backtesting current-proof slice.
- `CF-W1-RH-03` is accepted and locally committed as `5bd176b`; do not treat it as a fresh Team 02 pull.
- `CF-W1-RH-02A` is accepted and locally committed as `f391a6d`; do not treat it as a fresh Team 02 pull.
- `CF-W1-BT-03` is accepted and locally committed as `8f984b1`; do not treat it as a fresh Team 02 pull.
- `CF-W1-CAL-01A` is accepted and locally committed as `308cee3`; do not treat it as a fresh Team 02 pull.
- `CF-W1-TP-01A` is accepted and locally committed as `309a853`; do not treat it as a fresh Team 02 pull.
- `CF-W1-DQ-02A` is accepted and locally committed as `c2d6753`; do not treat the completed first child as fresh.
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
4. explainable signals/triggers and strategy evidence,
5. trusted signal candidate health and rule-based exit/invalidation,
6. backtesting and calibration trust,
7. research explainability and reviewability,
8. user-owned alert correctness and traceability.

Admin, auth, subscription, notifications, and alert convenience stay behind that stack unless they block correctness, privacy, or user-data safety.
