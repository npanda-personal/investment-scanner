# Top 10 Candidate Queue

Date: 2026-05-17

Status: Refreshed by Team 02 Requirement Factory after `CF-W1-L3-AUTH-01` completion and Decision Inbox routing.

Important: this is a top-candidate list, not proof of implementation readiness. See `12-ready-queue/ready-for-implementation.md` for actual implementation-ready items.

## Current Top 10

| Rank | ID | Candidate | Severity | Current readiness | Reason |
| --- | --- | --- | --- | --- | --- |
| 1 | CF-W1-TP-01A | Trade Plan no-target compatibility and DQ hard-block contract | P0 | Requirement refined; needs Product, Architect, and QA gates | Trade Plan target geometry remains separate from completed Strategy Decision work and still conflicts with no-target product rules. |
| 2 | CF-W1-L3-DQ-01 | Lane 3 readiness consumer policy contract | P0 | Requirement refined; blocked by display-vs-action policy decision | Portfolio/watchlist/alerts need one parent readiness policy before downstream code slices. |
| 3 | CF-W1-L3-AUTH-02 | Alert event ownership contract | P0 | Blocked by Decision Inbox `DECISION-20260517-alert-event-ownership-model` | Alert inbox actions are global unless scoped by an accepted ownership model. |
| 4 | CF-W1-L3-ALERT-01 | Alert readiness suppression tests | P0 | Blocked by `CF-W1-L3-DQ-01` and alert ownership decision | Action-like alerts must not be generated from untrusted data. |
| 5 | CF-W1-UX-02 | Copilot trust UX contract | P1 | Requirement refined; needs Product/UX/Architect decision | Copilot summaries need visible DQ evidence, deterministic local proof, and safe blocked states. |
| 6 | CF-W1-UX-05 | Research-support copy pass contract | P1 | Docs-only Product/UX refinement candidate | Advisory-feeling copy and status colors can overstate reliability. |
| 7 | CF-W1-MD-02 | Durable Market Data readiness evidence ADR | P0 | Docs-only Architecture/QA prep candidate | Storage/provenance decision is needed before schema or source changes. |
| 8 | CF-W1-MD-01 | Market Data validation hardening policy and QA plan | P1 | Docs-only QA/policy prep candidate | Future-date, adjusted-close, and spike policy remain unresolved. |
| 9 | CF-W1-SIG-TRIGGER-01 | Full trigger object contract completion | P1 | Blocked by Decision Inbox `DECISION-20260517-trigger-object-contract-path` | Completed SGE slices do not complete the full root trigger object contract. |
| 10 | CF-W1-BT-01 | Backtesting DQ fail-closed characterization | P1 | Blocked by upstream DQ and strategy trust policy | Backtests must not present unreliable results as trustworthy validation. |

## Next Non-Blocked Architecture / QA Prep Candidates

These are safe docs-only prep candidates while `CF-W1-L3-AUTH-02` and `CF-W1-SIG-TRIGGER-01` remain blocked by Decision Inbox:

| Rank | ID | Prep gate |
| --- | --- | --- |
| 1 | CF-W1-TP-01A | Architecture contract + QA plan for no-target Trade Plan compatibility and DQ hard-block states. |
| 2 | CF-W1-MD-02 | ADR packet + ADR QA checklist for durable market-data readiness evidence. |
| 3 | CF-W1-MD-01 | Validation policy + QA plan for future-dated candles, adjusted-close gaps, and suspicious price spikes. |
| 4 | CF-W1-UX-05 | Product/UX copy refinement + QA checklist for research-support wording. |

## Implementation-Ready Result

No application-code implementation item is ready.

The refreshed requirement docs for `CF-W1-TP-01A`, `CF-W1-L3-DQ-01`, and `CF-W1-UX-02` are planning artifacts only. They do not satisfy the ready criteria by themselves.

## Completed Or Removed From Active Pull

- `CF-W1-QA-01` completed as documentation-only focused command matrix.
- `CF-W2-DQ-01` completed Data Quality fail-closed defaults.
- `CF-W2-SIG-01A` completed bounded Signal Generation run-path DQ fail-closed behavior.
- `CF-W1-SIG-01B` completed trusted signal list read-path filtering.
- `CF-W1-SIG-LATEST-01` completed latest-instrument DQ gating.
- `CF-W1-STRAT-01` completed bounded Strategy Decision Option B-Strict compatibility.
- `CF-W1-L3-AUTH-01` completed portfolio/watchlist child ownership implementation and was committed locally as `74ba6dd`.

Legacy parent items `CF-W1-SIG-01`, `CF-W1-DQ-01`, and `CF-W1-TP-01` must not be pulled as active implementation work without a new split requirement.
