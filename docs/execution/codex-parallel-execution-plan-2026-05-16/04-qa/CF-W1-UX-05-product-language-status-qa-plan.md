# CF-W1-UX-05 - Product Language And Status QA Plan

Date: 2026-05-18

Owner: Team 04 QA Factory with Team 08 UX / Research / Copilot

Status: Option A QA refresh prepared. Not executable until `CF-W1-UX-05A` is sequenced with `CF-W1-UX-02`, exact Copilot-only file reservations are accepted, and Team 00 promotes a handoff.

## Scope

Validate copy and visual status semantics for the approved Copilot-only first child slice.

This plan does not authorize code edits, Playwright, dev servers, shared UI changes, packages, providers, Prisma, route changes, or broad test suites.

## Approved Product / UX Policy

Decision reference: `07-decisions/DECISION-20260517-ux-product-language-status-policy-resolution.md`.

Product Owner approved Option A:

- Start with Copilot-only copy cleanup after or together with the Copilot trust UX slice.
- Do not modify shared `StatusBadge` yet.
- Do not reserve shared UI files yet.
- Do not modify Research Hub or Market Data unsupported asset surfaces in this first slice.
- Avoid advisory, recommendation-quality, certainty, target-price, or action-instruction wording.

## Required Preconditions

- `CF-W1-UX-02` Copilot-only trust packet is accepted first or as the companion slice.
- Exact Copilot-only file reservations are accepted.
- Work packet is promoted to Ready by Team 00.
- For UI smoke: exact spec, memory/resource check, and local app startup plan are accepted.

## Assertions

For approved `CF-W1-UX-05A`:

- No direct advice copy appears: `buy now`, `sell now`, `must buy`, `must sell`, `guaranteed`, `profit target`, `price target`.
- Copilot page/action/section labels use research-support language such as `Research Copilot`, `Prepare Research Summary`, `Supportive Evidence`, `Risk And Limitation Evidence`, `trust state`, `blocked`, `limited`, and `not ready`.
- Directional market evidence is not presented as universal success/error or recommendation quality.
- Missing or unsupported evidence remains visible as limited/not-ready, not hidden behind positive visual status.
- Copy changes preserve documented strategy, trigger, exit, invalidation, and data-quality semantics.
- Shared `StatusBadge`, Research Hub, and Market Data unsupported asset copy remain untouched unless a separate Ready packet approves them.

## Candidate Focused Commands

Backend Copilot copy assertions after Ready promotion:

```powershell
cd backend
npm.cmd test -- ai-investment-copilot.service.test.ts --runInBand
```

Copilot UI smoke, approval-gated after accepted UI implementation, local app startup plan, exact spec, Team 00 validation approval, and memory/resource check:

```powershell
cd frontend
npm.cmd run test:ui -- ai-investment-copilot.spec.ts --workers=1
```

Product-language text scan, guidance only after implementation files are reserved:

```powershell
rg -n "buy now|sell now|must buy|must sell|guaranteed|profit target|price target|recommendation quality|target achieved" backend/src/modules/ai-investment-copilot frontend/src/features/ai-investment-copilot backend/tests/modules/ai-investment-copilot frontend/tests/ui
```

## Excluded By Default

- Broad `npm test` without file filters.
- Playwright before UI scope approval.
- Research Hub, Market Data UI, or shared `StatusBadge` checks in the first child.
- Dev servers before memory/resource check.
- Provider/live-data/startup/backfill flows.
- Prisma commands.
- Package install/update commands.
- External AI, paid/cloud, telemetry, broker, or real-money flows.

## Evidence Required Later

- Exact changed copy list.
- Focused test or UI assertion output.
- Screenshots or Playwright evidence for changed UI states where approved.
- Confirmation no shared UI, route/navigation, Research Hub, Market Data UI, provider, Prisma, package, generated, or external AI files were touched.
- Skipped checks with reason and next owner.
