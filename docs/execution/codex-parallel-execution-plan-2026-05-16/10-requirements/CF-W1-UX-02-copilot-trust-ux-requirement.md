# CF-W1-UX-02 - Copilot Trust UX Requirement

Date: 2026-05-17

## Status

Requirement refined. Not Ready for Implementation.

This is UX/product requirement refinement only. It does not authorize backend, frontend, route, shared UI, provider, package, or Playwright changes.

## Product Value

The local Copilot and research summaries must look as trustworthy as the underlying evidence allows, and no more. Users should see that summaries are deterministic, local, cost-free, research-support oriented, and gated by Data Quality readiness and source evidence.

## Current Evidence

Latest inputs:

- `17-team-outboxes/TEAM-08-ux-research-copilot-2026-05-17.md`
- `11-module-audits/audit-ux-research-copilot.md`
- `00-control/risk-register.md`

Observed gaps:

- Copilot summary contracts expose source modules and data gaps, but not DQ readiness, use-case tier, stale blockers, latest trusted data date, or deterministic/no-external proof.
- The UI does not visibly prove that Copilot behavior is local, deterministic, and cost-free.
- Product-language risk remains around labels such as `AI Investment Copilot`, `AI Copilot`, `Generate Report`, `Bullish Factors`, `appears strong`, and `high-scoring names`.
- Scope behavior is inconsistent: some Copilot/research paths pass or display region/scope context more clearly than others.
- Copilot and Stock Research UI smoke tests do not yet prove trusted, blocked, scoped, or safe empty states.

## UX Planning Fields

User goal:

- Review local research summaries without mistaking them for direct financial advice or externally generated recommendations.

User journey:

- Select or inherit market scope.
- Open Copilot/research summary.
- See whether required source evidence and DQ readiness exist.
- Review summary only when allowed, or see a blocked/limited state with reasons and next safe action.
- Trace summary statements back to source modules, timestamps, and rule/data limitations.

Information hierarchy:

- Primary: readiness state, blocked/limited reason, source modules, latest trusted data date, research-only status.
- Secondary: summary text, data gaps, stale warnings, scope context, rule/source versions where available.
- Tertiary: troubleshooting notes and links/actions for refreshing local data if an approved flow exists.

Empty states:

- No summary because required local evidence is missing.
- No scoped data for current `region` and `assetType`.
- No DQ-ready source evidence.

Error states:

- Local API error.
- DQ evidence unavailable.
- Scope mismatch.
- Source module unavailable.

Loading/progress states:

- Local summary request pending.
- Source evidence check pending.
- No fake progress for provider or long-running workflows.

Trust-building elements:

- Research-support disclaimer.
- Local deterministic/no-external-LLM indicator.
- Source module list and data gap list.
- DQ readiness and use-case tier.
- Stale-data and latest trusted data date.
- Blocked-state reasons when a summary should not be trusted.

Accessibility/basic usability:

- Status must not rely on color alone.
- Blocked/limited reasons must be readable and concise.
- Labels should avoid advisory wording.
- Dense evidence should be scannable without hiding blockers.

## Required Decisions

Product Owner, UX, and Architect must decide:

- whether to keep the `AI Investment Copilot` label or rename to a deterministic research-support label,
- which trust fields are mandatory before a Copilot summary can be displayed as reliable,
- whether blocked summaries should hide generated text or show it only as diagnostic/untrusted context,
- whether shared status color/label behavior must change in this slice,
- whether Stock Research Workbench trust surfaces are included or split to `CF-W1-UX-01`.

## Candidate Acceptance Criteria

Future accepted implementation must satisfy all approved UX and contract details, including:

- Copilot surfaces show DQ readiness, use-case tier, stale blockers, latest trusted data date, source modules, and data gaps where available.
- Missing or non-ready DQ evidence produces a clear blocked or limited state before reliability claims.
- The UI visibly states that summaries are local, deterministic, and research-support oriented.
- No paid AI service, hidden external LLM call, telemetry, broker integration, or cloud dependency is introduced.
- Copy avoids direct financial advice and uses research-support language.
- Scope context (`region`, `assetType`) is visible or preserved where the feature consumes scoped data.
- UI smoke tests, when approved, prove trusted and blocked states rather than only heading/page load checks.

## Non-Goals

- No application source or test change in this requirement refinement pass.
- No route registry, shared UI, package, provider, startup, Prisma, or generated-file change.
- No Copilot backend behavior change until architecture contract and QA plan exist.
- No Stock Research implementation unless explicitly approved in this requirement or split to `CF-W1-UX-01`.
- No external AI service or paid API.

## Future File Reservations After Approval

Docs first:

- `10-requirements/CF-W1-UX-02-copilot-trust-ux-requirement.md`

Likely implementation files after accepted contract, QA plan, UX approval, and work packet:

- `backend/src/modules/ai-investment-copilot/**`
- `backend/tests/modules/ai-investment-copilot/**`
- `frontend/src/features/ai-investment-copilot/**`
- `frontend/src/features/stock-research-workbench/**` only if included by approved scope
- `frontend/tests/ui/ai-investment-copilot.spec.ts`
- `frontend/tests/ui/stock-research-workbench.spec.ts` only if included by approved scope

## Forbidden Without Separate Approval

- `frontend/src/shared/components/**`
- `frontend/src/app/navigationMetadata.tsx`
- `frontend/src/app/routes.tsx`
- backend or frontend route registries
- package manifests or generated files
- Prisma schema or migrations
- provider/live-data workflows
- external AI or telemetry integration

## Stop Conditions

- Copilot naming decision remains unresolved and implementation depends on it.
- Required trust fields are not available from approved backend contracts.
- Shared UI or navigation changes are necessary but not reserved.
- UI tests would only prove page load instead of trust/blocked behavior.
- Any implementation would imply direct financial advice or paid/external AI behavior.

## Next Gate

Product/UX decision, architecture contract, and QA plan. Do not move to Ready for Implementation until exact trust fields, blocked-state behavior, file reservations, and verification plan are accepted.
