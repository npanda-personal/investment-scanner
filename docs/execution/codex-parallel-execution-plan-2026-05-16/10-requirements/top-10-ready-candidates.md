# Top 10 Candidate Queue

Date: 2026-05-20

Status: Team 00 corrected after RH-03 acceptance, the `7bad648` catalog-freshness hotfix, and branch-evidence verification. This file is a docs-only candidate view, not proof of implementation readiness. Team 00 owns all Ready queue movement.

Team 00 override: `CF-W1-BT-03`, `CF-W1-CAL-01A`, `CF-W1-TP-01A`, and `CF-W1-DQ-02A` are accepted and locally committed parked branches, not fresh candidates.

## Team 02 Current Read

| Rank | ID | Why now | Next gate |
| --- | --- | --- | --- |
| 1 | `CF-W1-HCTX-03` | Historical context needs age and provenance warnings so nearest snapshots do not read like same-day evidence. | Team 03 architecture contract and QA planning. |
| 2 | `CF-W1-DQ-03` | Downstream trust consumers need a compact residual reason summary instead of raw DQ arrays. | Team 03 architecture contract and QA planning. |
| 3 | `CF-W1-MCTX-02` | Market Context needs an explicit persisted-versus-generated freshness basis label. | Team 03 architecture contract and QA planning. |
| 4 | `CF-W1-STRAT-04` | Strategy evidence needs freshness and stale-summary labels so compact summaries do not overclaim recency. | Team 03 architecture contract and QA planning. |
| 5 | `CF-W1-SQLAB-03` | Signal Quality Lab needs review-loop actionability for noisy and limited outcomes. | Team 03 architecture contract and QA planning. |
| 6 | `CF-W1-TP-03` | Trade Plan proof snapshots need current/stale labels so generated plans do not overclaim recency. | Team 03 architecture contract and QA planning; stop and split if schema/route/shared scope appears. |
| 7 | `CF-W1-BT-04` | Backtesting saved runs need current-proof labels so older simulations do not read like latest proof. | Team 03 architecture contract and QA planning; stop and split if schema/route/shared scope appears. |
| 8 | `CF-W1-DQ-02` residual parent | `DQ-02A` is complete, but parent read-side/public-contract scope remains split-required. | Team 03 should identify a bounded no-schema follow-up or keep the parent blocked. |
| 9 | `CF-W1-L3-DQ-01A` | Passive readiness DTO semantics remain a contract gap, but not a fresh implementation pull. | Contract refresh only unless Team 03/04 define a bounded child. |
| 10 | `CF-W1-MD-02A` | Market-data evidence storage is useful, but schema / generated / repository consent is required. | Proposal-only until explicit storage consent opens. |

## Fresh Pull Exclusions

Do not treat these as the next fresh Team 02 pull:

- `CF-W1-RH-03` is accepted and locally committed as `5bd176b`; do not treat it as a fresh Team 02 pull.
- `CF-W1-RH-02A` is accepted and locally committed as `f391a6d`; do not treat it as a fresh Team 02 pull.
- `CF-W1-BT-03` is accepted and locally committed as `8f984b1`.
- `CF-W1-CAL-01A` is accepted and locally committed as `308cee3`.
- `CF-W1-TP-01A` is accepted and locally committed as `309a853`.
- `CF-W1-DQ-02A` is accepted and locally committed as `c2d6753`.
- `CF-W1-SQLAB-01` is accepted and locally committed as `1a41d95`.
- `CF-W1-SQLAB-02A` is now promoted and assigned to Team 06; do not treat it as unassigned.
- `CF-W1-L3-TREV-02` and `CF-W1-L3-INTEL-03` are already promoted and assigned to Team 07.
- `CF-W1-L3-AUTH-03` is already promoted and assigned; do not pull it as fresh Team 02 discovery.
- `CF-W1-L3-DQ-01B` is already promoted and assigned to Team 07.
- `CF-W1-L3-INTEL-02` is already promoted and assigned to Team 07.
- `CF-W1-RH-01` is already in active implementation/QA/review flow.
- `CF-W1-MD-01`, `CF-W1-MD-04`, `CF-W1-HCTX-02`, `CF-W1-MD-03`, `CF-W1-MCTX-01`, `CF-W1-TP-02`, `CF-W1-SIG-02`, `CF-W1-STRAT-03`, `CF-W1-L3-WATCH-01`, `CF-W1-BT-02`, and `CF-W1-CAL-01` are active, accepted, parked, or already in the live gate path.
- `CF-W1-TP-03` is a new draft only. It must not be merged into active/accepted `TP-01A`, `TP-01B`, or `TP-02`.
- `CF-W1-BT-04` is a new draft only. It must not be merged into accepted `BT-03` or widened into advanced validation scope.

## Routing Guidance

- Use `CF-W1-HCTX-03`, `CF-W1-DQ-03`, and `CF-W1-MCTX-02` as the next Team 03 architecture items.
- Use `CF-W1-STRAT-04` as the next follow-on if the first three stay cleanly additive.
- Use `CF-W1-SQLAB-03` as the next review-loop trust slice after the historical and DQ contracts are drafted.
- Use `CF-W1-TP-03` and `CF-W1-BT-04` as the next refinement-only trade-plan/backtesting trust slices behind the current top five.
- Treat `CF-W1-DQ-02` as the next Market Data / Data Quality residual parent only after the two new trade-plan/backtesting drafts are placed.
- Keep `CF-W1-MD-02A` and `CF-W1-SQLAB-02B` proposal-only until explicit consent opens the gated paths.

## Ready Result

No item is moved to Ready by this Team 02 refresh.
