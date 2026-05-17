# Top 10 Candidate Queue

Date: 2026-05-17

Status: Refreshed by Team 02 after checking current audits, ready/blocked queues, architecture queue, validation queue, active board, and risk register. This is a top-candidate list, not proof of implementation readiness. See `12-ready-queue/ready-for-implementation.md` for actual implementation-ready items.

## Current Top Candidates

There are fewer than ten active candidates after removing completed bounded slices from active pull.

| Rank | ID | Candidate | Severity | Current readiness | Reason |
| --- | --- | --- | --- | --- | --- |
| 1 | CF-W1-L3-DQ-01 | Lane 3 readiness consumer policy contract | P0 | Product policy accepted; needs child contract, QA scenario refresh, and file reservations | High unblock value for portfolio, watchlist, alerts, portfolio intelligence, research, and copilot trust surfaces. |
| 2 | CF-W1-TP-01A | Trade Plan no-target compatibility and DQ hard-block contract | P0 | Product policy accepted; needs backend-only child contract, QA scenarios, and file reservations | Trade Plan target geometry remains separate from completed Strategy Decision work and still conflicts with no-target product rules. |
| 3 | CF-W1-MD-02 | Durable Market Data readiness evidence ADR | P0 | Option B ADR direction accepted; formal ADR still needed | Schema/source implementation remains blocked until separate slices are approved. |
| 4 | CF-W1-MD-01 | Market Data validation hardening policy and QA plan | P1 | QA plan exists; validation policy still needed | Future-date, adjusted-close, suspicious-volume, and spike policy remain unresolved. |
| 5 | CF-W1-UX-02 | Copilot trust UX contract | P1 | Requirement and QA plan exist; needs Product/UX/Architect decision | Copilot summaries need visible DQ evidence, deterministic local proof, and safe blocked states. |
| 6 | CF-W1-L3-ALERT-01 | Alert readiness suppression tests | P0 | QA plan exists; blocked by `CF-W1-L3-DQ-01` and alert readiness contract | Action-like alerts must not be generated from untrusted data; keep behind parent Lane 3 policy. |
| 7 | CF-W1-UX-05 | Research-support copy pass contract | P1 | Docs-only Product/UX refinement candidate; QA checklist still pending | Advisory-feeling copy and status colors can overstate reliability. |
| 8 | CF-W1-BT-01 | Backtesting DQ fail-closed characterization | P1 | Blocked by upstream DQ and strategy trust policy | Backtests must not present unreliable results as trustworthy validation. |

## Next Non-Blocked Architecture / QA Prep Candidates

These are safe docs-only prep candidates. They are not app-code ready.

| Rank | ID | Prep gate |
| --- | --- | --- |
| 1 | CF-W1-L3-DQ-01 | Child architecture contracts and QA scenarios under approved Option B. |
| 2 | CF-W1-TP-01A | Backend-only child contract and QA refinement under approved Option B. |
| 3 | CF-W1-MD-02 | Formal ADR and ADR QA checklist for approved companion durable readiness/evidence storage direction. |
| 4 | CF-W1-MD-01 | Product/Architect validation policy for future-dated candles, adjusted-close gaps, suspicious volume, and price spikes. |
| 5 | CF-W1-UX-02 | Product/UX/Architect trust-surface decisions for copilot naming, readiness evidence fields, blocked states, and shared-file scope. |

## Implementation-Ready Result

No application-code implementation item is ready. The five current prep candidates are `CF-W1-L3-DQ-01`, `CF-W1-TP-01A`, `CF-W1-MD-02`, `CF-W1-MD-01`, and `CF-W1-UX-02`; Team 00 still owns any future Ready queue update.

The resolved decisions are policy inputs only. They do not satisfy Ready criteria by themselves.

## Completed Or Removed From Active Pull

- `CF-W1-QA-01` completed as documentation-only focused command matrix.
- `CF-W2-DQ-01` completed Data Quality fail-closed defaults.
- `CF-W2-SIG-01A` completed bounded Signal Generation run-path DQ fail-closed behavior.
- `CF-W1-SIG-01B` completed trusted signal list read-path filtering.
- `CF-W1-SIG-LATEST-01` completed latest-instrument DQ gating.
- `CF-W1-STRAT-01` completed bounded Strategy Decision Option B-Strict compatibility.
- `CF-W1-L3-AUTH-01` completed portfolio/watchlist child ownership implementation and was committed locally as `74ba6dd`.
- `CF-W1-L3-AUTH-02` completed bounded alert event ownership and was committed locally as `503bcd9`.
- `CF-W1-SIG-TRIGGER-01` completed bounded optional Signal Generation trigger DTO projection and was committed locally as `6ab3999`.

Legacy parent items `CF-W1-SIG-01`, `CF-W1-DQ-01`, and `CF-W1-TP-01` must not be pulled as active implementation work without a new split requirement.
