# CF-W1-UX-05 Product Language And Status QA Plan

Date: 2026-05-18

Owner: Team 04 QA Factory with Team 08 UX / Research / Copilot

Status: Folded companion QA note prepared. `CF-W1-UX-05A` is not a separate executable QA slice; Team 00 should evaluate it only as part of the combined `CF-W1-UX-02 + CF-W1-UX-05A` Copilot-only packet.

## Scope

This file records the copy and status-language assertions that travel with `CF-W1-UX-05A` inside the combined Copilot-only packet.

Primary executable QA plan:

- `04-qa/CF-W1-UX-02-qa-plan.md`

This companion note does not create a separate Ready candidate, separate command plan, or separate UI smoke target.

## Approved Product / UX Policy

Decision reference: `07-decisions/DECISION-20260517-ux-product-language-status-policy-resolution.md`.

Accepted first-slice rules:

- start with Copilot-only copy cleanup
- fold `CF-W1-UX-05A` into the same implementation pass as `CF-W1-UX-02`
- do not modify shared `StatusBadge`
- do not modify Research Hub, Market Data UI, routes, or navigation metadata in this first slice
- avoid advisory, certainty, recommendation-quality, target-price, or action-instruction wording

## Required Companion Assertions

- Page, action, and section labels use research-support language inside the Copilot surface.
- Blocked, limited, and trusted labels do not imply direct advice or recommendation quality.
- Forbidden copy does not appear in the reserved Copilot files: `buy now`, `sell now`, `must buy`, `must sell`, `guaranteed`, `profit target`, `price target`.
- Shared UI, navigation metadata, Research Hub, Stock Research Workbench, and Market Data UI remain out of scope.
- Copy changes do not alter documented trust-state semantics from the combined Copilot contract.

## Companion Command Guidance

Use the executable command set from `04-qa/CF-W1-UX-02-qa-plan.md`.

Optional text scan after implementation files are reserved:

```powershell
rg -n "buy now|sell now|must buy|must sell|guaranteed|profit target|price target|recommendation quality|target achieved" backend/src/modules/ai-investment-copilot frontend/src/features/ai-investment-copilot backend/tests/modules/ai-investment-copilot frontend/tests/ui
```

## Evidence Required Later

- Exact changed Copilot copy list
- Confirmation that `CF-W1-UX-05A` executed only inside the combined Copilot-only packet
- Focused backend/UI evidence referenced from the combined `CF-W1-UX-02 + CF-W1-UX-05A` QA run
- Confirmation that shared UI/navigation and non-Copilot surfaces stayed untouched
