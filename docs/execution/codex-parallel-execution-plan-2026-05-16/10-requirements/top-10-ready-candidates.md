# Top 10 Candidate Queue

Date: 2026-05-17

Status: Refreshed by Team 00 after Product Owner resolved the five current Decision Inbox items. This is a top-candidate list, not proof of implementation readiness. See `12-ready-queue/ready-for-implementation.md` for actual implementation-ready items.

## Current Top Candidates

There are ten active candidates after removing completed bounded slices from active pull.

| Rank | ID | Candidate | Severity | Current readiness | Reason |
| --- | --- | --- | --- | --- | --- |
| 1 | CF-W1-L3-PORT-01A | Portfolio readiness DTO child | P0 | Requirement, architecture, work packet, QA plan, Team 03 file-reservation matrix, and Team 07 readiness inspection prepared; needs Team 00 Ready promotion | Highest near-ready Lane 3 passive display slice; portfolio-only scope avoids combining watchlist work in the first pass. |
| 2 | CF-W1-TP-01B | Trade Plan backend-only DQ hard-block child | P0 | Architecture, QA plan, Team 03 file-reservation matrix, and Team 06 readiness inspection prepared; needs Team 00 Ready promotion | Current Team 00 dispatch ranks this as the next Team 06 candidate after portfolio readiness. |
| 3 | CF-W1-NOTIF-02 | Notification log redaction | P1 | Requirement, architecture, contract, work packet, platform QA plan, and Team 03 file-reservation matrix exist; needs Ready promotion | Current Team 00 dispatch ranks this as the next Team 09 candidate; auth/subscription decisions do not block the redaction slice. |
| 4 | CF-W1-L3-ALERT-01 | Alert readiness suppression child | P0 | Architecture, QA plan, and Team 03 file-reservation matrix prepared; needs Team 00 Ready promotion | Action-like alerts must not be generated from untrusted data, but this remains behind the current PORT/TP/NOTIF dispatch order. |
| 5 | CF-W1-L3-AUTH-03 | Alert rule target ownership child | P0 | Requirement, architecture, contract, work packet, and QA plan prepared; needs Team 00 Ready promotion | Portfolio/watchlist alert rules must not point at another user's resource. |
| 6 | CF-W1-MD-02 | Durable Market Data readiness evidence ADR | P0 | Option B ADR direction accepted; formal ADR still needed | Schema/source implementation remains blocked until separate slices are approved. |
| 7 | CF-W1-MD-01 | Market Data validation hardening policy and QA plan | P1 | Option A resolved; requirement and QA plan exist; needs validation-only contract/work-packet refresh | Future implementation must stay in Market Data validation source/tests with no durable-storage/provider/schema scope. |
| 8 | CF-W1-UX-02 | Copilot trust UX contract | P1 | Option B resolved; needs Copilot-only contract/QA/file-reservation refresh | Copilot summaries need visible DQ evidence, deterministic local proof, safe blocked states, and no shared UI/navigation changes. |
| 9 | CF-W1-AUTH-01 | Platform auth fallback policy | P0 | Option A resolved; needs Team 09 backend packet refresh | Protected controllers must fail closed when `req.user.id` is missing; shared auth and route changes remain forbidden. |
| 10 | CF-W1-SUB-01 | Local manual subscription plan policy | P1 | Option A resolved; needs Team 09 backend packet refresh | Ordinary users may not self-change plan or self-select `ADMIN`; frontend UI remains out of scope. |

## Next Docs-Only Prep / Ready-Evaluation Candidates

These are not app-code ready. No item is blocked by an open Decision Inbox item, but policy-resolved items still need child packet refresh before source/test work.

| Rank | ID | Prep gate |
| --- | --- | --- |
| 1 | CF-W1-L3-PORT-01A | Team 00 Ready evaluation for the portfolio-only child. |
| 2 | CF-W1-TP-01B | Team 00 Ready evaluation. |
| 3 | CF-W1-NOTIF-02 | Team 00/Team 09 Ready evaluation and exact implementation handoff. |
| 4 | CF-W1-L3-ALERT-01 | Team 00 Ready evaluation. |
| 5 | CF-W1-L3-AUTH-03 | Team 00 Ready evaluation. |
| 6 | CF-W1-MD-02 | Formal ADR and ADR QA checklist for approved companion durable readiness/evidence storage direction. |
| 7 | CF-W1-MD-01 | Team 05/Team 03/Team 04 validation-only packet refresh after Option A. |
| 8 | CF-W1-UX-02 | Team 08/Team 03/Team 04 Copilot-only trust packet refresh after Option B. |
| 9 | CF-W1-AUTH-01 | Team 09/Team 03/Team 04 backend fail-closed controller packet refresh after Option A. |
| 10 | CF-W1-SUB-01 | Team 09/Team 03/Team 04 backend admin/manual-only subscription packet refresh after Option A. |

## Implementation-Ready Result

No application-code implementation item is ready. The nearest child candidates are `CF-W1-L3-PORT-01A`, `CF-W1-TP-01B`, `CF-W1-NOTIF-02`, `CF-W1-L3-ALERT-01`, and `CF-W1-L3-AUTH-03`; each still needs Team 00 Ready promotion and exact implementation handoff. Team 00 still owns any future Ready queue update. Team 03's 2026-05-18 near-ready file-reservation matrix is supporting evidence only, not a Ready promotion.

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

`CF-W1-L3-PORT-01` remains the parent portfolio/watchlist requirement. `CF-W1-L3-PORT-01B` watchlist readiness DTOs remain a future child after the portfolio-only slice is handled.

`CF-W1-UX-05` remains active outside the current top ten because the near-ready `CF-W1-L3-AUTH-03` ownership slice has higher implementation maturity. Its approved first slice is Copilot-only and should be sequenced after or together with `CF-W1-UX-02`; shared `StatusBadge` work remains future.
