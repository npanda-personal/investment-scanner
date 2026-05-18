# TEAM-08 Current Assignment

Date: 2026-05-18

Team: TEAM-08 - UX / Research / Copilot

Prompt file: `docs/execution/codex-parallel-execution-plan-2026-05-16/15-automation-prompts/AUTO-08-ux-research-copilot.md`

## Assignment

Pull `CF-W1-UX-01A` as the active Team 08 implementation item.

This is a narrowed frontend-only Stock Research Workbench trust-framing child. The full parent `CF-W1-UX-01` remains blocked for later backend trust evidence. Do not widen this slice.

Branch/worktree:

- Branch: `codex/team08-ux-research/CF-W1-UX-01A`
- Worktree: `../investment-scanner-worktrees/team08-CF-W1-UX-01A`

Gate evidence:

- Requirement: `10-requirements/CF-W1-UX-01-stock-research-workbench-trust-surfaces-requirement.md`
- Architecture review: `03-architecture/CF-W1-UX-01-architecture-review.md`
- Contract: `06-contracts/CF-W1-UX-01-stock-research-workbench-trust-surfaces-contract.md`
- Work packet: `08-work-packets/CF-W1-UX-01-work-packet.md`
- QA plan: `04-qa/CF-W1-UX-01-qa-plan.md`
- Source mapping: `09-summaries/CF-W1-UX-01-ux-source-mapping.md`

## Scope

Allowed writes:

- `frontend/src/features/stock-research-workbench/components/StockResearchWorkbenchPage.tsx`
- `frontend/src/features/stock-research-workbench/types.ts`
- `frontend/tests/ui/stock-research-workbench.spec.ts`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-08-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-UX-01A-developer-handoff.md`

Forbidden:

- backend source/tests
- `frontend/src/features/stock-research-workbench/api/stockResearchWorkbenchService.ts`
- `frontend/src/features/signal-generation-engine/**`
- `frontend/src/features/strategy-decision-engine/**`
- shared UI
- navigation or route files
- package manifests
- Prisma/schema/migrations
- generated files
- providers, startup/backfill, live-provider, broker, paid/cloud, telemetry, or automation flows

Required behavior:

- derive page trust framing only from existing Workbench response fields plus current requested market scope;
- show scope as requested/unverified only;
- keep `COMPLETE` as limited research context, not trusted or ready;
- show warnings for `PARTIAL` / `DELAYED`;
- show blocked context and suppress downstream widgets for `MISSING` / `ERROR`;
- do not edit Signal or Strategy widget internals;
- avoid `Trusted`, `Ready`, `Verified scope`, `Data quality passed`, `Eligible signal`, `Eligible decision`, `Reliable`, `Safe to trade`, buy/sell/advice-like wording, or target/profit language.

Required validation:

```powershell
cd frontend
npm.cmd run build
npm.cmd run test:ui -- stock-research-workbench.spec.ts --workers=1
```

Stop and return to Team 00 if backend/API/widget/shared/route/package/generated work is needed.

## Branch / Worktree

Use the dedicated implementation worktree for this item. Do not implement in shared `dev`.

## Blockers

No UX Decision Inbox item remains open. `CF-W1-UX-01A` is Ready only as the narrowed frontend-only child above.

## Expected Outbox

Update `17-team-outboxes/TEAM-08-outbox.md`.

Also write `18-integration-queue/CF-W1-UX-01A-developer-handoff.md` after implementation and validation.
