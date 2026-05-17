# TEAM-08 Outbox - UX / Research / Copilot

Date: 2026-05-17

## Heartbeat

| Field | Value |
| --- | --- |
| Team | TEAM-08 - UX / Research / Copilot |
| State | Blocked / Needs Product Refinement |
| Current assignment | `CF-W1-UX-02` Copilot trust UX preparation |
| Input source | Team 08 prompt, runtime bootstrap, ready/blocked queues, requirement, QA plan, source audit |
| Output target | Team 00 via this outbox and Decision Inbox |
| Branch/worktree | `dev` in shared workspace; no dedicated Team 08 worktree detected |
| Active requirement | `CF-W1-UX-02` |
| Can continue without human approval | Yes for docs-only audit/refinement; no for implementation |
| Next relaunch condition | Relaunch after Product/UX/Architect resolve `DECISION-20260517-copilot-trust-ux-policy` or assign another Team 08 docs-only refinement item |

## Ready Work Pulled

None.

`12-ready-queue/ready-for-implementation.md` reports no active application-code item is Ready for Implementation.

## Audits Completed

Team 08 performed a focused read-only refresh across:

- `frontend/src/features/ai-investment-copilot/**`
- `backend/src/modules/ai-investment-copilot/**`
- `frontend/src/features/stock-research-workbench/**`
- `backend/tests/modules/ai-investment-copilot/**`
- `frontend/tests/ui/research-hub.spec.ts`
- active ready/blocked/decision queues

Findings:

- Copilot is deterministic/local in implementation, but DTOs and UI do not expose strong trust proof.
- Current Copilot DTO lacks DQ readiness, use-case tier, blocker reasons, stale/latest trusted date, and explicit no-external flags.
- Current Copilot UI uses `AI Investment Copilot`, `Generate Report`, `Bullish Factors`, and status colors that may overstate trust.
- Backend service text includes `appears strong` and `high-scoring names`.
- Market brief frontend passes `region`, but backend market brief ignores query scope.
- Stock Research Workbench does not pass `region` or `assetType`, and trust state is thin.

## Requirements Refined

Existing requirement reviewed:

- `10-requirements/CF-W1-UX-02-copilot-trust-ux-requirement.md`

No direct requirement file edits were made because active dirty state includes unrelated Team 02/03/04/09 docs.

## Contracts Prepared

Created:

- `06-contracts/CF-W1-UX-02-copilot-trust-ux-contract.md`

Contract status: draft, blocked by Product/UX/Architect decision.

## QA Plans Prepared

Created:

- `04-qa/CF-W1-QA-UI-01-copilot-research-trust-states-qa-plan.md`

QA status: draft, not executable until UI scope and work packet are approved.

## Work Packets Prepared

Created:

- `08-work-packets/CF-W1-UX-02-work-packet.md`

Work packet status: blocked proposal, not Ready.

## Decisions Opened

Created:

- `99-decision-inbox/DECISION-20260517-copilot-trust-ux-policy.md`

Updated:

- `99-decision-inbox/open-decisions.md`

Decision needed: Copilot naming, blocked-summary visibility, mandatory trust fields, Stock Research inclusion/split, shared UI/navigation scope.

## Implementation Completed

None. Application source and tests were not modified.

## Tests Run

None.

Reason: docs-only preparation; no implementation was Ready. Playwright, builds, providers, servers, broad tests, Prisma, and live data checks remain approval-gated.

## Files Changed By Team 08

- `04-qa/CF-W1-QA-UI-01-copilot-research-trust-states-qa-plan.md`
- `06-contracts/CF-W1-UX-02-copilot-trust-ux-contract.md`
- `08-work-packets/CF-W1-UX-02-work-packet.md`
- `17-team-outboxes/TEAM-08-outbox.md`
- `99-decision-inbox/DECISION-20260517-copilot-trust-ux-policy.md`
- `99-decision-inbox/open-decisions.md`

## Blockers

- Product/UX/Architect decision required for `CF-W1-UX-02`.
- Shared workspace has unrelated dirty docs from other teams.
- Team 08 cannot commit safely while unrelated dirty docs remain unintegrated unless Team 00 explicitly scopes and stages only Team 08 files.

## Next Recommended Assignment

Team 00 should route `DECISION-20260517-copilot-trust-ux-policy`.

If Option B is accepted, Team 03/04 should accept or revise the contract and QA plan, then promote the Copilot-only work packet to Ready with exact file reservations.

---

## Continuation - CF-W1-UX-05

Date: 2026-05-17

State: Needs Product Refinement / Blocked.

Ready work pulled: none.

Additional docs-only work completed:

- Audited product-language and status-color risk across Copilot, Research Hub, Stock Research Workbench, Market Data UI, and shared `StatusBadge`.
- Prepared `CF-W1-UX-05` as a staged product-language and trust-copy requirement.
- Opened a true Product/UX/Architect decision for first target surface and shared UI reservation.

Files added:

- `11-module-audits/CF-W1-UX-05-product-language-status-audit.md`
- `10-requirements/CF-W1-UX-05-product-language-trust-copy-requirement.md`
- `06-contracts/CF-W1-UX-05-product-language-status-contract.md`
- `04-qa/CF-W1-UX-05-product-language-status-qa-plan.md`
- `08-work-packets/CF-W1-UX-05-work-packet.md`
- `99-decision-inbox/DECISION-20260517-ux-product-language-status-policy.md`

Files updated:

- `99-decision-inbox/open-decisions.md`
- `17-team-outboxes/TEAM-08-outbox.md`

Implementation completed: none.

Tests run: none. This was docs-only audit/refinement; no app-code item was Ready.

New decision opened:

- `DECISION-20260517-ux-product-language-status-policy`

Current blockers:

- `CF-W1-UX-02` remains blocked by Copilot trust UX policy.
- `CF-W1-UX-05` is blocked by Product/UX/Architect decision on first target surface and shared UI reservation.
- Shared worktree still contains unrelated dirty docs from other teams, so Team 08 did not commit.

Next recommendation:

- Resolve `DECISION-20260517-copilot-trust-ux-policy` before Copilot implementation.
- Resolve `DECISION-20260517-ux-product-language-status-policy` to pick the first product-language cleanup slice.
- If both choose Copilot-first, merge `CF-W1-UX-02` and `CF-W1-UX-05A` into one module-local Copilot implementation packet to avoid duplicate edits.
