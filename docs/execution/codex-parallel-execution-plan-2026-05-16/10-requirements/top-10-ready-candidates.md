# Top 10 Candidate Queue

Date: 2026-05-17

Status: Refreshed by Team 02 after checking current audits, ready/blocked queues, architecture queue, validation queue, active board, risk register, Team 03 child contracts, Team 04 scenario matrix, and open Decision Inbox entries. This is a top-candidate list, not proof of implementation readiness. See `12-ready-queue/ready-for-implementation.md` for actual implementation-ready items.

## Current Top Candidates

There are ten active candidates after removing completed bounded slices from active pull.

| Rank | ID | Candidate | Severity | Current readiness | Reason |
| --- | --- | --- | --- | --- | --- |
| 1 | CF-W1-L3-PORT-01 | Portfolio/watchlist readiness DTO child | P0 | Architecture and QA plan prepared; needs Team 00 child selection and Ready promotion | Highest near-ready Lane 3 passive display slice under accepted Option B policy. |
| 2 | CF-W1-L3-AUTH-03 | Alert rule target ownership child | P0 | Requirement, architecture, contract, work packet, and QA plan prepared; needs Team 00 Ready promotion | Portfolio/watchlist alert rules must not point at another user's resource. |
| 3 | CF-W1-L3-ALERT-01 | Alert readiness suppression child | P0 | Architecture and QA plan prepared; needs Team 00 Ready promotion | Action-like alerts must not be generated from untrusted data. |
| 4 | CF-W1-TP-01B | Trade Plan backend-only DQ hard-block child | P0 | Architecture and QA plan prepared; needs Team 00 Ready promotion | Converts accepted no-target/DQ policy into a bounded backend-only candidate. |
| 5 | CF-W1-NOTIF-02 | Notification log redaction | P1 | Requirement, architecture, contract, work packet, and platform QA plan exist; needs Ready promotion | Local/free notification logs should not expose raw recipient, subject, body preview, or payload content. |
| 6 | CF-W1-MD-02 | Durable Market Data readiness evidence ADR | P0 | Option B ADR direction accepted; formal ADR still needed | Schema/source implementation remains blocked until separate slices are approved. |
| 7 | CF-W1-MD-01 | Market Data validation hardening policy and QA plan | P1 | Blocked by open Decision Inbox item; requirement and QA plan exist | Future-date, adjusted-close, suspicious-volume, and spike policy remain unresolved. |
| 8 | CF-W1-UX-02 | Copilot trust UX contract | P1 | Blocked by open Decision Inbox item | Copilot summaries need visible DQ evidence, deterministic local proof, and safe blocked states. |
| 9 | CF-W1-AUTH-01 | Platform auth fallback policy | P0 | Blocked by open Decision Inbox item | Protected controllers should not silently route missing auth to `default-user` without accepted policy. |
| 10 | CF-W1-SUB-01 | Local manual subscription plan policy | P1 | Blocked by open Decision Inbox item | Ordinary self-plan changes may bypass local validation plan limits. |

## Next Docs-Only Prep / Ready-Evaluation Candidates

These are not app-code ready. Some require Team 00 Ready evaluation; decision-blocked items require the named decision before source/test work.

| Rank | ID | Prep gate |
| --- | --- | --- |
| 1 | CF-W1-L3-PORT-01 | Team 00 child selection and Ready evaluation. |
| 2 | CF-W1-L3-AUTH-03 | Team 00 Ready evaluation. |
| 3 | CF-W1-L3-ALERT-01 | Team 00 Ready evaluation. |
| 4 | CF-W1-TP-01B | Team 00 Ready evaluation. |
| 5 | CF-W1-NOTIF-02 | Team 00/Team 09 Ready evaluation and exact implementation handoff. |
| 6 | CF-W1-MD-02 | Formal ADR and ADR QA checklist for approved companion durable readiness/evidence storage direction. |
| 7 | CF-W1-MD-01 | Product Owner/Architect/QA decision for future-dated candles, adjusted-close gaps, suspicious volume, and price spikes. |

## Implementation-Ready Result

No application-code implementation item is ready. The nearest child candidates are `CF-W1-L3-PORT-01`, `CF-W1-L3-AUTH-03`, `CF-W1-L3-ALERT-01`, `CF-W1-TP-01B`, and `CF-W1-NOTIF-02`; each still needs Team 00 Ready promotion and exact implementation handoff. Team 00 still owns any future Ready queue update.

The resolved decisions and prepared child contracts are planning inputs only. They do not satisfy Ready criteria by themselves.

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

`CF-W1-UX-05` remains active and decision-blocked, but is outside the current top ten because the near-ready `CF-W1-L3-AUTH-03` ownership slice has higher implementation maturity.
