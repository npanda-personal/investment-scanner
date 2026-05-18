# CF-W1-STRAT-02A QA Plan

Date: 2026-05-18

Owner: Team 04 QA Factory

Status: Strategy Framework no-schema rule metadata and DQ gate exposure QA plan prepared. QA-ready for Team 00 Ready evaluation as one bounded `strategy-framework` child slice. Executable validation remains blocked until Team 00 promotes one exact implementation handoff for the reserved backend and feature-local files. Durable rule-revision history remains explicitly out of scope.

## Scope

Validation plan for additive Strategy Framework trust metadata in the no-schema `CF-W1-STRAT-02A` child.

In-scope surfaces after Team 00 Ready promotion:

- `backend/src/modules/strategy-framework/strategy-framework.registry.ts`
- `backend/src/modules/strategy-framework/strategy-framework.types.ts`
- `backend/src/modules/strategy-framework/strategy-framework.service.ts`
- `backend/src/modules/strategy-framework/strategy-framework.md`
- `backend/tests/modules/strategy-framework/strategy-framework.service.test.ts`
- `frontend/src/features/strategy-framework/types.ts`
- `frontend/src/features/strategy-framework/components/StrategyFrameworkPage.tsx`
- `frontend/tests/ui/strategy-framework.spec.ts`

Out of scope for this first child:

- Prisma, migrations, generated files, durable storage, repository identity, or version-keyed persistence changes
- `strategy-framework` repository, evaluator, controller, router, validation, API client, frontend routes, or backend/frontend route registry changes
- Data Quality Engine source/export changes or duplicated DQE tier computation
- strategy math, evaluator thresholds, proof-grade semantics, registered backtest action rules, or standalone backtest config widening
- shared UI, shared utilities, package manifests, providers, startup/backfill, live-provider, paid/cloud, telemetry, broker, or historical-doc edits

This plan does not approve application source edits, tests, builds, services, or Ready movement. It records the QA packet only.

## Contract Inputs And Current Source Alignment

Primary planning inputs:

- `03-architecture/CF-W1-STRAT-02-architecture-review.md`
- `06-contracts/CF-W1-STRAT-02-strategy-framework-rule-versioning-dq-gate-policy-contract.md`
- `08-work-packets/CF-W1-STRAT-02-work-packet.md`
- `10-requirements/CF-W1-STRAT-02-strategy-framework-rule-versioning-dq-gate-policy-requirement.md`

Current Strategy Framework source surfaces show:

- strategy `version` exists already, but frontend/backend `StrategyRuleDeclaration` objects do not yet expose `ruleRevision`
- proof rows already expose `StrategyProofStatus`, sample sufficiency, readiness, warnings, and next action, so new trust/versioning metadata must remain additive rather than replacing proof semantics
- Strategy Framework detail currently lists rule labels and keeps standalone backtest enablement bound to active `ENTRY` strategies
- current UI already carries research-support disclaimers and a catalog/proof/detail structure that can host additive trust fields without route or shared UI changes

## Required QA Assertions

- Versioned rule metadata is additive. Declared per-rule `ruleRevision` markers surface through Strategy Framework list/detail payloads and feature-local rendering without removing or renaming current fields.
- Legacy undeclared metadata is explicit. If any rule declaration lacks a revision marker, the strategy surfaces `LEGACY_UNDECLARED` or equivalent limited status with a reason instead of fabricating a revision.
- DQ gate policy is exposed on service/list/detail/proof surfaces and makes the following semantics clear:
  - stronger review requires DQE `signal` tier `READY`
  - trusted standalone registered backtest promotion requires DQE `backtest` tier `READY`
  - limited or missing DQ evidence stays review-visible but not trusted
  - blocked DQ evidence is not eligible for trusted promotion
- Trust/versioning metadata stays separate from existing `StrategyProofStatus`. `PROVEN`, `LIMITED`, `UNPROVEN`, `BLOCKED`, and `MISSING` remain performance-proof states.
- Current strategy math, evaluator behavior, proof grading, and standalone backtest action rules remain unchanged for this child.
- Current route contracts, query params, API paths, and current strategy catalog/detail consumer payloads remain backward-compatible.
- Frontend changes stay additive inside `frontend/src/features/strategy-framework/types.ts`, `components/StrategyFrameworkPage.tsx`, and the feature-local UI smoke test only. No shared UI or route work is allowed.
- Research-support wording remains intact. No direct advice, target-price, guaranteed-return, broker, or automation-instruction language is introduced.
- Durable rule-revision history is not claimed or implied by the first child. The QA packet must fail if the implementation presents source-declared revisions as durable persisted history.

## Scenario Matrix

| Scenario | Expected QA assertion after implementation |
| --- | --- |
| Active strategy with declared rule revisions on all configured rules | Catalog/detail payloads expose additive per-rule revisions and overall trust metadata shows source-declared current metadata rather than legacy fallback. |
| Active strategy with one or more missing `ruleRevision` markers | Trust/versioning metadata falls back to a limited legacy-undeclared state, surfaces a reason, and does not invent a revision value. |
| Catalog consumer reads existing list payload fields | Existing fields such as code, name, category, version, status, readiness, and latest performance remain usable without rename/removal; new trust fields are additive only. |
| Detail surface renders rule and DQ trust context | Strategy version, per-rule revision markers, DQ gate policy, and trust reasons are visible alongside the existing proof panel and rule sections. |
| Proof registry/detail row already has `PROVEN` or `LIMITED` performance evidence | Existing proof-performance state remains unchanged while new trust/versioning metadata appears as a separate explanation surface. |
| DQ policy sees `signal` tier `READY` and `backtest` tier `READY` requirements declared | UI/service wording clearly distinguishes stronger review trust from standalone registered backtest trust without widening action eligibility rules. |
| DQ evidence is limited or missing | Strategy remains review-visible but not trusted, and reasons explicitly describe limited or missing evidence behavior. |
| DQ evidence is blocked | Trust metadata is blocked/not eligible, and the packet does not overrule existing blocked proof or readiness signals. |
| Strategy is `EXIT`, `GATE`, `FILTER`, or `DRAFT` | Existing standalone Backtesting Lab button behavior remains unchanged; no new trust field may enable support or draft strategies for standalone registered backtests. |
| Existing Strategy Framework page tabs and routes are exercised | Catalog, Proof Registry, and Detail keep their current tabs/routes; no shared route or API-client changes are required for the additive trust slice. |
| Feature-local UI smoke covers trust fields | `strategy-framework.spec.ts` proves additive trust/versioning rows render in catalog/proof/detail surfaces and that research-support disclaimers remain visible. |
| Implementation attempts durable history, repository identity changes, or schema work | QA rejects and returns the packet to Team 00 / Architect because durable revision persistence is a separate blocked child. |

## Focused Command Guidance

Commands below are guidance only. They were not run during this docs-only QA planning task.

Future focused validation after Team 00 Ready promotion and implementation handoff:

```powershell
cd backend
npm.cmd test -- strategy-framework.service.test.ts --runInBand
```

Approval-gated frontend UI smoke after bounded feature-local UI work, one Playwright worker, and a local startup/resource plan:

```powershell
cd frontend
npm.cmd run test:ui -- strategy-framework.spec.ts --workers=1
```

Approval-gated builds after accepted implementation and memory/resource checks:

```powershell
cd backend
npm.cmd run build
```

```powershell
cd frontend
npm.cmd run build
```

## Skipped / Forbidden Checks

Skipped in this planning pass:

- all executable tests
- backend/frontend builds
- local servers, services, provider checks, and UI smoke

Forbidden by default for this slice:

- repository, evaluator, controller, router, validation, or route-registry test widening
- DQE source edits or DQE test changes as a backdoor for trust-state logic
- frontend/shared component or shared route changes
- Prisma generate, migrate, db push, db execute, or any schema/data mutation
- provider/live-market, paid/cloud, telemetry, broker, startup/backfill, or broad backend suites

## Stop Conditions

Stop QA and return to Team 00 / Architect if:

- implementation expands beyond the reserved `strategy-framework` registry/types/service/doc/test and feature-local types/page/UI spec files
- implementation requires Prisma/schema/generated changes, repository identity changes, or version-keyed persisted history
- implementation changes evaluator math, proof-grade rules, or standalone backtest enablement rules
- implementation changes controller/router/validation/API-client paths, query params, or route contracts
- implementation duplicates Data Quality Engine tier computation locally instead of consuming declarative policy semantics
- implementation needs shared UI, shared utilities, package changes, or cross-module trust field widening

## Evidence Required Later

- Exact implementation handoff limited to the reserved `strategy-framework` backend and feature-local frontend files
- Scenario evidence for declared revisions, legacy undeclared fallback, DQ gate policy exposure, additive proof/detail trust fields, and unchanged standalone backtest action behavior
- Focused service-test output and feature-local UI smoke output only after approval
- Build output only after approval
- Confirmation that current route contracts and existing strategy catalog/detail consumers remained additive/backward-compatible
- Explicit note that durable rule-revision history stayed out of scope and blocked pending Prisma/schema/repository/generated approval
