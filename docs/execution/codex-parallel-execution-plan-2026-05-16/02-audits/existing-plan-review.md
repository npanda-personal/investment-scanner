# Existing Plan Review

## Scope

The folder `docs/codex-agent-team-plan/` was reviewed as historical planning input only. It was not modified.

## High-Level Finding

The old plan folder contains useful evidence, but it is too large and too operationally specific to remain the active control plane. Several files declare old live authority, GitHub check-in expectations, active work states, and released items that conflict with the current Product Owner direction.

## Classification

| Legacy Area | Decision | Reason |
|---|---|---|
| `active-work-board.md` | archive | Claims live source of truth and contains old active/released rows. |
| `blocker-register.md` | migrate selected facts | Open blocker facts may be useful, but must be revalidated. |
| `codex-agent-team.md` | archive, selectively migrate concepts | Useful single-writer and orchestrator concepts, but too heavy and not authoritative. |
| `team-operating-model.md` | archive, selectively migrate concepts | Useful role/WIP concepts, but superseded by root and current prompt. |
| `sdlc-operating-model.md` | migrate gate concepts | QA/review/acceptance gates align with root, but details need simplification. |
| `release-checklist.md` | rewrite | GitHub push/check-in rules must be optional and disabled by default. |
| `architecture-contracts/` | retain as evidence | Historical rationale only. |
| `architecture-signoff/` | retain as evidence | Does not prove current correctness. |
| `developer-handoffs/` | retain as examples | Not active handoffs. |
| `github-check-in/` | archive | Historical only; not a future mandatory workflow. |
| `lead-validation/` | retain as evidence | Not current review. |
| `operations/` | migrate verified facts only | Runtime claims need current validation. |
| `po-acceptance/` | retain as history | Does not replace current PO acceptance. |
| `po-audits/`, `po-briefs/`, `po-roadmaps/` | selectively migrate | Product ideas need current PO reapproval. |
| `qa-evidence/`, `qa-plans/` | retain patterns | Evidence cannot prove current repo correctness. |
| `ux-audits/`, `ux-roadmaps/` | selectively migrate | UX ideas need current UI validation. |
| `work-packets/` | retain examples | Old packets do not authorize current implementation. |

## Conflicts With Current Direction

- Old active board must not become current source of truth.
- Old GitHub push/check-in rules must not be mandatory.
- Old QA/PO/signoff docs must not prove current correctness.
- Old work packets must not authorize implementation.

## Recommendation

Preserve the old folder untouched as historical evidence. Use the new execution folder for all active planning and future Sprint control.
