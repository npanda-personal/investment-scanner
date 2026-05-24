# Requirements Backlog

Date: 2026-05-24

Status: Team 00 updated after Product Owner redirected the workflow toward Trusted Signal Candidates and away from Trade Plan, R:R, arbitrary targets, and target-price framing. Product Owner priority remains direct investor/trader value first: market-data freshness/provenance, data-quality readiness, signals/triggers, strategy/rules, trusted candidate health, backtesting, calibration, market/historical context, and research explainability.

Team 00 override: `CF-W1-BT-03`, `CF-W1-CAL-01A`, `CF-W1-TP-01A`, and `CF-W1-DQ-02A` are accepted parked branch commits, not fresh backlog-front items.

## Current Cycle Requirement Focus

| ID | Why it matters now | Next gate |
| --- | --- | --- |
| `CF-W1-TSC-01A` | `/today-review` should adopt source-proven Signal Generation trigger evidence into Trusted Signal Candidate groups, counts, reasons, and conservative health. | Team 03 architecture/file-reservation prep and Team 04 QA planning; implementation only after Team 00 Ready promotion. |
| `CF-W1-TSC-01` | Parent workflow path for Trusted Signal Candidates without R:R, arbitrary targets, synthetic targets, or Trade Plan-first framing. | Route implementation through `CF-W1-TSC-01A`; keep parent out of direct implementation. |
| `CF-W1-SIG-TRIGGER-ENTRY-01` | Signal Generation now exposes source-proven trigger evidence for downstream adoption. | Accepted and locally committed as `649e645`; keep out of fresh Team 02 pulls. |
| `CF-W1-HCTX-03` | Historical context needs age and provenance warnings so nearest snapshots do not read like same-day evidence. | Accepted and locally committed as `f6034c6`; wait for clean integration sequencing. |
| `CF-W1-DQ-03` | Downstream trust consumers need a compact residual reason summary instead of raw DQ arrays. | Team 03 architecture contract and QA planning. |
| `CF-W1-MCTX-02` | Market Context needs an explicit persisted-versus-generated freshness basis label. | Accepted and locally committed as `0c802c2`; wait for clean integration sequencing. |
| `CF-W1-STRAT-04` | Strategy evidence needs freshness and stale-summary labels so compact summaries do not overclaim recency. | Accepted and locally committed as `8b3498e`; wait for clean integration sequencing. |
| `CF-W1-SQLAB-03` | Signal Quality Lab needs review-loop actionability for noisy and limited outcomes. | Accepted and locally committed as `5db98f2`; wait for clean integration sequencing. |
| `CF-W1-TP-03` | Paused/stale as framed; Trade Plan proof snapshot freshness does not match the new Trusted Signal Candidate direction. | Do not execute unless reframed into signal health with no R:R, targets, or Trade Plan-first UX. |
| `CF-W1-BT-04` | Backtesting saved runs need freshness/current-proof labels so older simulations do not read like latest proof. | Team 03 architecture contract and QA planning; keep first child additive and no-schema. |
| `CF-W1-DQ-02` residual parent | `DQ-02A` currentness evidence is accepted, but read-side/public-contract residual scope remains split-required. | Team 03 should identify a bounded no-schema follow-up or keep the parent blocked. |
| `CF-W1-L3-DQ-01A` | Passive Lane 3 readiness display still needs truthful contract semantics. | Keep contract-only unless Team 03/04 define a bounded child. |
| `CF-W1-MD-02A` | Market-data evidence storage is useful, but schema / generated / repository consent is required. | Consent-gated proposal only. |

## Current Top 10 Priority Order

| Rank | ID | State | Why now |
| --- | --- | --- | --- |
| 1 | `CF-W1-TSC-01A` | Requirement drafted / architecture next | Today Review adoption is the next direct Trusted Signal Candidate step after accepted trigger evidence. |
| 2 | `CF-W1-DQ-03` | Draft | Residual reason summary is the cleanest downstream trust gap on top of current DQ outputs. |
| 3 | `CF-W1-BT-04` | Architecture prepared | Backtesting saved runs need explicit freshness/current-proof labeling. |
| 4 | `CF-W1-DQ-02` residual parent | Split-required | Remaining read-side/public-contract scope after accepted `DQ-02A`. |
| 5 | `CF-W1-L3-DQ-01A` | Contract-only | Lane 3 passive readiness DTOs still matter, but not as the next fresh implementation pull. |
| 6 | `CF-W1-MD-02A` | Proposal-only | Market-data evidence storage remains gated. |
| 7 | `CF-W1-SQLAB-02B` | Proposal-only | Durable Signal Quality learning memory remains useful but storage-gated. |
| 8 | `CF-W1-STRAT-02B` | Proposal-only | Durable strategy revision history remains useful but schema/generated/repository-gated. |
| 9 | `CF-W1-UX-02` | Copilot-only trust UX pending | Useful downstream trust work, but behind core signal evidence. |
| 10 | `CF-W1-UX-05` | Copilot-only language cleanup | Useful wording cleanup after Copilot trust scope is settled; shared UI remains out of scope. |

## Rolling Audit Notes

- The 2026-05-20 `audit-backtesting-proof-basis-2026-05-20.md` confirms `CF-W1-BT-03` stays parked and does not become a fresh Team 02 discovery item.
- That same audit reinforces `CF-W1-BT-04` as the next backtesting trust slice because the queue still needs a compact current-proof label on saved runs.
- No new evidence from the backtesting refresh outranks the current Trusted Signal Candidate entry-price dependency.

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

1. `CF-W1-TSC-01A` as the Today Review Trusted Signal Candidate adoption child
2. `CF-W1-DQ-03` as the next bounded downstream DQ residual-summary child
3. `CF-W1-BT-04` as the next bounded Backtesting current-proof labeling child
4. `CF-W1-DQ-02` residual parent split for a possible bounded follow-up after accepted `DQ-02A`
5. `CF-W1-L3-DQ-01A` as a contract-only child if Team 00 wants the passive Lane 3 display slice refreshed
6. `CF-W1-MD-02A` as a consent-gated companion evidence packet
7. `CF-W1-SQLAB-02B` as a consent-gated durable Signal Quality memory packet
8. `CF-W1-STRAT-02B` as a consent-gated durable strategy revision history packet
9. `CF-W1-UX-02` as a Copilot-only trust UX packet behind core signal evidence
10. `CF-W1-UX-05` as Copilot-only product-language cleanup behind `CF-W1-UX-02`

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
