# Next Top 10 Candidates

Date: 2026-05-24

Status: Team 00 updated after Product Owner redirected the signal workflow away from Trade Plan, R:R, arbitrary targets, and target-price framing. This is a docs-only priority and routing view. Team 00 still owns Ready movement, exact file reservations, and one-writer sequencing.

Team 00 override: `CF-W1-BT-03`, `CF-W1-CAL-01A`, `CF-W1-TP-01A`, and `CF-W1-DQ-02A` are already accepted and locally committed parked branches. They must not be presented as fresh implementation pulls.

Team 02 rolling update: `CF-W1-TSC-01A-TREV` is active with Team 07 / Team 04, `CF-W1-DQ-03` is active with Team 05, and `CF-W1-TSC-01A-SIG` is already accepted upstream. The order below is the next unassigned queue after those active pulls.

## Current Priority Order

| Rank | ID | Current state | Why it matters now | Next Team 00 action |
| --- | --- | --- | --- | --- |
| 1 | `CF-W1-TSC-02` | Requirement-ready | Today Review is the primary daily workflow, and the next direct user gap after candidate adoption is ongoing active-signal health backed by rule evidence rather than Trade Plan framing. | Route to Team 03 next for bounded architecture prep; keep out of Ready. |
| 2 | `CF-W1-BT-04` | Requirement-ready | Backtesting remains a core investor/trader trust surface, and saved runs still need current-proof labels so older simulations do not read like fresh proof. | Route to Team 03 after or alongside `TSC-02` for bounded architecture prep; keep no-schema and additive. |
| 3 | `CF-W1-DQ-02` residual parent | Split-required residual | Upstream DQ currentness still matters to signal, backtesting, and review trust, but only if Team 03 can isolate a no-schema public/read-path child. | Ask Team 03 to confirm whether a bounded `DQ-02B` exists or keep the parent blocked. |
| 4 | `CF-W1-MD-02A` | Consent-gated proposal | Durable market-data evidence storage remains high-value upstream trust work, but it is still docs-only until schema consent opens. | Keep proposal-only; use only for Team 03 / Team 04 packet prep when consent is intentionally opened. |
| 5 | `CF-W1-SQLAB-02B` | Consent-gated proposal | Durable Signal Quality learning memory would strengthen research continuity and calibration review after current trust slices. | Keep proposal-only unless Team 00 deliberately opens storage consent. |
| 6 | `CF-W1-STRAT-02B` | Consent-gated proposal | Durable strategy revision history preserves exact rule/version provenance for signals and backtests, but it is still storage-gated. | Keep proposal-only unless schema/generated/repository consent is opened. |
| 7 | `CF-W1-L3-DQ-01A` | Contract-only child | Passive readiness display is still useful, but it sits behind core data, candidate-health, and backtesting trust work. | Keep as contract refresh unless Team 03/04 define a bounded child. |
| 8 | `CF-W1-UX-02` | Copilot-only requirement-ready | Useful downstream trust UX, but behind direct data/signal/backtesting value and the primary Today Review workflow. | Keep Copilot-only and behind the higher direct-value queue. |
| 9 | `CF-W1-UX-05` | Copilot-only child | Product-language cleanup still matters, but only after Copilot trust UX scope is settled. | Fold into or follow `CF-W1-UX-02`; do not touch shared UI yet. |
| 10 | `CF-W1-TSC-01` parent residual | Parent stays out of implementation | The parent still governs the trusted-candidate workflow, but fresh execution should continue through bounded children only. | Keep parent out of Ready and route only through approved children. |

## Dispatch Notes

- `CF-W1-HCTX-03`, `CF-W1-MCTX-02`, `CF-W1-STRAT-04`, and `CF-W1-SQLAB-03` are accepted parked branch commits, not fresh pulls.
- `CF-W1-TSC-01A-TREV` is already promoted and assigned to Team 07 with Team 04 QA handling; do not re-rank it as an unassigned Team 02 candidate.
- `CF-W1-TSC-01A-SIG` is accepted and locally committed upstream; `CF-W1-DQ-03` is active with Team 05. Do not duplicate either as fresh Team 02 work.
- `CF-W1-SIG-TRIGGER-ENTRY-01` is accepted and locally committed as `649e645`; it is no longer a fresh prep item.
- `CF-W1-TSC-02` is now requirement-ready for architecture prep, but remains out of Ready for implementation.
- `CF-W1-TP-03` is paused/stale as framed because Product Owner rejected Trade Plan-first, R:R, and arbitrary target workflow direction. Do not execute it unless reframed into Trusted Signal Candidate health without targets/R:R.
- `CF-W1-BT-04` is now requirement-ready for architecture prep and remains behind active Today Review adoption work.
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
