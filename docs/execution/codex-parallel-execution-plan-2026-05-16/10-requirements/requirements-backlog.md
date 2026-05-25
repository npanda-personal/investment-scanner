# Requirements Backlog

Date: 2026-05-25

Status: Team 02 refreshed the backlog after a fresh direct-value audit. Product Owner priority remains direct investor/trader value first: market-data freshness/provenance, data-quality readiness, signals/triggers, strategy/rules, trusted candidate health, backtesting, calibration, market/historical context, and research explainability.

Team 00 override: `CF-W1-BT-03`, `CF-W1-CAL-01A`, `CF-W1-TP-01A`, and `CF-W1-DQ-02A` are accepted parked branch commits, not fresh backlog-front items.

Team 02 rolling update: `CF-W2-CAL-02A` is active with Team 06, `CF-W2-TSC-05A` addendum work is active with Team 03 plus Team 07 follow-on ownership, and `CF-W1-DQ-02-RS1` rework is active with Team 05. Backlog-front discovery excludes those active pulls and re-ranks the next honest unassigned candidates.

## Current Cycle Requirement Focus

| ID | Why it matters now | Next gate |
| --- | --- | --- |
| `CF-W2-TSC-05A` | Today Review ranking/eligibility reframe is active with Team 07. | Do not duplicate as fresh Team 02 discovery; wait for Team 07 handoff and downstream gates. |
| `CF-W1-DQ-02-RS1` | DQ residual read-side currentness packet is in active rework with Team 05. | Keep out of fresh Team 02 discovery until Team 05 completes rework and downstream QA/review/signoff gates clear. |
| `CF-W2-CAL-02` | Calibration needs a truthful scoped evidence-through date and scoped page-level evidence basis. | Parent requirement remains valid, but child `CF-W2-CAL-02A` is already active with Team 06; do not re-rank as unassigned. |
| `CF-W1-RH-01A` | Research Hub actionability already exposes per-dimension `evidenceDate`, but those dates are not wired, which weakens reviewability on the overview. | New child requirement draft; keep behind active `CF-W2-CAL-02A` and route only as a bounded no-storage follow-on. |
| `CF-W1-SIG-TRIGGER-ENTRY-01` | Signal Generation now exposes source-proven trigger evidence for downstream adoption. | Accepted and locally committed as `649e645`; keep out of fresh Team 02 pulls. |
| `CF-W1-HCTX-03` | Historical context needs age and provenance warnings so nearest snapshots do not read like same-day evidence. | Accepted and locally committed as `f6034c6`; wait for clean integration sequencing. |
| `CF-W1-DQ-03` | Downstream trust consumers need a compact residual reason summary instead of raw DQ arrays. | Accepted / routed elsewhere; do not duplicate as fresh Team 02 discovery. |
| `CF-W1-MCTX-02` | Market Context needs an explicit persisted-versus-generated freshness basis label. | Accepted and locally committed as `0c802c2`; wait for clean integration sequencing. |
| `CF-W1-STRAT-04` | Strategy evidence needs freshness and stale-summary labels so compact summaries do not overclaim recency. | Accepted and locally committed as `8b3498e`; wait for clean integration sequencing. |
| `CF-W1-SQLAB-03` | Signal Quality Lab needs review-loop actionability for noisy and limited outcomes. | Accepted and locally committed as `5db98f2`; wait for clean integration sequencing. |
| `CF-W1-TSC-02` | Active candidates need rule-based health tracking after entry until exit, invalidation, expiry, or blockage. | New requirement draft; Team 03 architecture/refinement only after the active Today Review writer family clears. |
| `CF-W1-TP-03` | Paused/stale as framed; Trade Plan proof snapshot freshness does not match the new Trusted Signal Candidate direction. | Do not execute unless reframed into signal health with no R:R, targets, or Trade Plan-first UX. |
| `CF-W1-BT-04` | Backtesting saved runs need freshness/current-proof labels so older simulations do not read like latest proof. | Accepted and locally committed; keep excluded from fresh routing. |
| `CF-W1-DQ-02` residual parent | `DQ-02A` currentness evidence is accepted, and `RS1` is in active rework. | Keep parent blocked from new discovery until the active packet clears. |
| `CF-W1-L3-DQ-01A` | Passive Lane 3 readiness display still needs truthful contract semantics. | Keep contract-only unless Team 03/04 define a bounded child. |
| `CF-W1-MD-02A` | Market-data evidence storage is useful, but schema / generated / repository consent is required. | Consent-gated proposal only. |

## Current Top 10 Priority Order

| Rank | ID | State | Why now |
| --- | --- | --- | --- |
| 1 | `CF-W1-MD-02A` | Proposal-only | Market-data evidence storage remains the next strongest upstream provenance gap once the active calibration child is excluded. |
| 2 | `CF-W1-SQLAB-02B` | Proposal-only | Durable Signal Quality learning memory remains useful but storage-gated. |
| 3 | `CF-W1-STRAT-02B` | Proposal-only | Durable strategy revision history remains useful but schema/generated/repository-gated. |
| 4 | `CF-W1-RH-01A` | New child requirement draft | Research Hub actionability tiles should surface truthful per-dimension evidence dates where the basis already exists, and explicit null plus reason where it does not. |
| 5 | `CF-W1-L3-DQ-01A` | Contract-only | Lane 3 passive readiness DTOs still matter, but not as the next fresh implementation pull. |
| 6 | `CF-W1-TSC-02` | New requirement draft | Trusted candidates need ongoing rule-based health state evidence, but it remains behind Team 07's active Today Review scope. |
| 7 | `CF-W1-TSC-03` residual/supporting-evidence path | Parent requirement | Supporting Today Review evidence still matters, but it depends on the active Today Review writer family clearing first. |
| 8 | `CF-W1-UX-01` | Open parent | Research Workbench trust gaps remain behind upstream trust/evidence work. |
| 9 | `CF-W1-UX-02` | Copilot-only trust UX pending | Useful downstream trust work, but behind core signal/data/backtest evidence. |
| 10 | `CF-W1-UX-05` | Copilot-only product-language cleanup pending | Useful downstream trust wording work, but behind core signal/data/backtest evidence. |

## Rolling Audit Notes

- `CF-W2-CAL-02` is not a duplicate of accepted `CF-W1-CAL-01A`; it focuses on scoped evidence freshness and page-level evidence-basis truth, not the DQ readiness gate already accepted.
- The bounded child `CF-W2-CAL-02A` is already active with Team 06, so the parent calibration requirement should be tracked as reserved rather than as the next unassigned backlog head.
- Team 01's follow-up evidence supports a smaller no-storage Research Hub child, `CF-W1-RH-01A`, but it stays behind the three higher-value durable-proof proposals and behind active calibration sequencing.
- The storage proposals remain valuable, but they stay honestly consent-gated and behind the new calibration trust slice.

## Active Or Parked Exclusions

Keep these out of fresh Team 02 discovery:

- `CF-W1-RH-03`
- `CF-W1-L3-DQ-01B`
- `CF-W1-L3-INTEL-02`
- `CF-W1-L3-TREV-02`
- `CF-W1-L3-INTEL-03`
- `CF-W1-L3-AUTH-03`
- `CF-W1-BT-03`
- `CF-W1-CAL-01A`
- `CF-W2-TSC-05A`
- `CF-W1-DQ-02-RS1`
- `CF-W1-TP-01A`
- `CF-W1-DQ-02A`
- `CF-W1-SQLAB-01`
- `CF-W1-SQLAB-02A`
- `CF-W1-SQLAB-03`
- `CF-W1-STRAT-04`
- `CF-W1-HCTX-03`
- `CF-W1-MCTX-02`
- `CF-W1-RH-01`
- `CF-W1-RH-02A`
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

These are already promoted, active, accepted, parked, or otherwise in the live Ready/gate path.

## Architecture-Next Candidates

These can move toward architecture/QA next without creating duplicate application-code work:

1. `CF-W1-MD-02A` as a consent-gated companion evidence packet if Team 00 intentionally opens storage/schema scope
2. `CF-W1-SQLAB-02B` as a consent-gated durable Signal Quality memory packet if Team 00 intentionally opens storage scope
3. `CF-W1-STRAT-02B` as a consent-gated durable strategy revision history packet if Team 00 intentionally opens schema/generated/repository scope
4. `CF-W1-RH-01A` as the bounded Research Hub evidence-date child after `CF-W2-CAL-02A`
5. `CF-W1-L3-DQ-01A` as a contract-only child if Team 00 wants the passive Lane 3 display slice refreshed
6. `CF-W1-TSC-02` as a new active signal health requirement draft after Team 07 clears Today Review files
7. `CF-W1-TSC-03` residual/supporting-evidence follow-on after Today Review dependencies settle
8. `CF-W1-UX-01` as the Workbench trust-evidence parent behind the core trust stack
9. `CF-W1-UX-02` as a Copilot-only trust UX packet behind core signal evidence
10. `CF-W1-UX-05` as Copilot-only trust copy cleanup behind the same stack

## Sequencing Candidates For Team 00

These are not new requirement-discovery items. They are already accepted parked branches or sequencing decisions on already-prepared work:

1. `CF-W1-BT-03`
2. `CF-W1-CAL-01A`
3. `CF-W1-TP-01A`

## Lower Priority / Sequencing-Blocked

Keep these behind the direct-value trust stack unless they block correctness, privacy, or user-data safety:

- `CF-W1-MD-02A`
- `CF-W1-SQLAB-02B`
- `CF-W1-STRAT-02B`
- `CF-W1-L3-ALERT-03`
- `CF-W1-UX-02`
- `CF-W1-UX-05`

## Low-Priority Classes

Keep these behind the direct-value trust stack unless they block correctness, privacy, or user-data safety:

- admin/settings convenience,
- auth/subscription expansion beyond existing privacy/correctness fixes,
- notifications convenience,
- alert convenience work that does not improve evidence quality or reviewability.
