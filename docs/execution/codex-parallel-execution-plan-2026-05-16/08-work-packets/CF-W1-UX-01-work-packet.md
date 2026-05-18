# CF-W1-UX-01 Work Packet

Date: 2026-05-18

## Work Item

`CF-W1-UX-01A` narrowed first child: conservative Stock Research Workbench trust framing from existing page evidence only.

## State

Architecture packet prepared. Parent `CF-W1-UX-01` is not Ready for Implementation.

This packet covers only a frontend-only child. It does not authorize backend, shared UI, Signal, Strategy, route, package, Prisma, or provider work.

## Owner / Lane / Module

- Architecture owner: Team 03 Architecture Factory
- Future implementation owner: Team 08 UX / Research / Copilot or the Team 00-assigned Lane 3 frontend owner
- Lane: Lane 3
- Module / feature: `stock-research-workbench`

## Allowed Files After Ready Promotion

- `frontend/src/features/stock-research-workbench/components/StockResearchWorkbenchPage.tsx`
- `frontend/src/features/stock-research-workbench/types.ts`
- `frontend/tests/ui/stock-research-workbench.spec.ts`

## Current Forbidden Files

- application source or tests before Team 00 promotion
- `backend/src/modules/stock-research-workbench/**`
- `backend/tests/modules/stock-research-workbench/**`
- `frontend/src/features/stock-research-workbench/api/stockResearchWorkbenchService.ts`
- `frontend/src/features/signal-generation-engine/**`
- `frontend/src/features/strategy-decision-engine/**`
- `frontend/src/shared/**`
- `frontend/src/app/routes.tsx`
- `frontend/src/app/navigationMetadata.tsx`
- `backend/src/api/routes.ts`
- `backend/prisma/**`
- package manifests
- generated files
- `docs/AGENTS.md`
- `docs/codex-agent-team-plan/**`
- active implementation or gate docs for `CF-W1-DQ-02A` and `CF-W1-STRAT-02A`

## Required Behavior

Future implementation must:

- add a page-level trust surface derived from current workbench response plus requested market scope;
- show current requested `region` and `assetType` with explicit unverified-scope wording;
- show latest evidence timestamp only when the current response includes one;
- map current workbench source status to conservative page states:
  - `COMPLETE` -> limited context
  - `PARTIAL` / `DELAYED` -> limited context with warnings
  - `MISSING` / `ERROR` -> blocked context
- label downstream Signal and Strategy panels as unverified research context when the page is not blocked;
- suppress downstream Signal and Strategy panels when the page is blocked;
- keep user-facing language research-support only.

## Explicit Non-Goals For This Child

- no DQ-backed readiness state
- no backend scope verification
- no true downstream eligibility proof
- no Signal or Strategy widget copy rewrite
- no shared status badge or shared banner component
- no route or navigation rename

## Dependency Notes

- This child is intentionally independent of backend DTO expansion because current source cannot prove the fields the parent requirement eventually wants.
- A later backend child is required if Product Owner wants verified scope, DQ-backed blocker reasons, latest trusted data date, or downstream eligibility semantics.
- The child may use `useMarketScope()` locally, but must treat it as requested scope only.

## QA Handoff Needed

Team 04 should prepare a focused UI QA plan for:

- limited-context rendering on `COMPLETE`;
- warning rendering on `PARTIAL` and `DELAYED`;
- blocked-context rendering on `MISSING` and `ERROR`;
- unverified requested scope display;
- downstream widget suppression in blocked state;
- research-support copy safety.

Suggested focused command after implementation exists:

```powershell
cd frontend
npm.cmd run test:ui -- stock-research-workbench.spec.ts --workers=1
```

## Stop Conditions

Stop and return to Team 00 / Architect if implementation requires:

- backend DTO or endpoint changes;
- `region` / `assetType` verification across the API boundary;
- DQ readiness or blocker reasons from another module;
- edits to `SignalWidget`, `StrategyDecisionWidget`, shared status components, or shared banners;
- route, navigation, package, Prisma, generated, provider, or startup scope;
- advisory wording to make the UI read coherently.

## Next Gate

- Team 04 prepares the focused QA plan.
- Team 08 or the assigned Lane 3 frontend owner accepts the narrowed file reservation set.
- Team 00 decides whether to promote this frontend-only child or wait for a later backend trust-evidence child.

Team 03 does not promote this item to Ready.
