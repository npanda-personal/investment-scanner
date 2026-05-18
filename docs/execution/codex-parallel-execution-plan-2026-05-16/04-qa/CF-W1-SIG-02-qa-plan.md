# CF-W1-SIG-02 QA Plan

Date: 2026-05-19

Owner: Team 04 QA Factory

Status: Canonical trigger evidence compatibility QA plan prepared. QA-plan ready for Team 00 Ready evaluation as one bounded backend-only `signal-generation-engine` child slice. Executable validation remains blocked until Team 00 sequences the implementation on top of the accepted parked `CF-W1-SIG-TRIGGER-02A` commit `788c237`, or reconciles that same Signal Generation writer set in one pass.

## Scope

Validation plan for additive canonical trigger-evidence compatibility in `CF-W1-SIG-02`.

In-scope surfaces after Team 00 Ready promotion:

- `backend/src/modules/signal-generation-engine/signal-generation-engine.types.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.repository.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.service.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.md`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.repository.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.service.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.trigger-contract.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-dq-enforcement.invariants.test.ts`

Out of scope for this first child:

- Prisma schema, migrations, generated files, or any durable trigger-storage redesign
- `backend/src/modules/signal-generation-engine/index.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.controller.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.router.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.validation.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.module.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.config.ts`
- backend/frontend route registries
- frontend source/tests, shared backend utilities, shared UI, package manifests, or generated shared contracts
- `strategy-framework`, `strategy-decision-engine`, `today-trade-review`, `trade-plan-risk-engine`, `alerts-monitoring`, `portfolio-management`, `portfolio-intelligence`, `watchlist-management`, `ai-investment-copilot`, or `market-data-foundation` source edits
- provider, live-market, startup/backfill, paid/cloud, telemetry, broker, or broad downstream adoption work

This plan does not approve application source edits, tests, builds, services, or Ready movement. It records the QA packet only.

## Contract Inputs And Current Source Alignment

Primary planning inputs:

- `03-architecture/CF-W1-SIG-02-architecture-review.md`
- `06-contracts/CF-W1-SIG-02-canonical-trigger-evidence-compatibility-contract.md`
- `08-work-packets/CF-W1-SIG-02-work-packet.md`
- `10-requirements/CF-W1-SIG-02-canonical-trigger-evidence-compatibility-requirement.md`
- `04-qa/CF-W1-SIG-TRIGGER-02A-qa-plan.md`

Current `dev` source still shows the exact gap this child must close:

- `signal-generation-engine.service.ts` still builds `triggerContract` as a compatibility projection and still marks `created_at`, `updated_at`, `trigger_price`, `timeframe`, rule ids, and richer lifecycle state unavailable for every row.
- `signal-generation-engine.repository.ts` already owns persisted `SignalResult.createdAt`, `SignalResult.updatedAt`, `generationRunId`, `sourceDataDate`, `sourcePriceDate`, and the linked `SignalGenerationRun` timing/status evidence.
- `latestForInstrument()` can still create a signal on the read path, so request-local generation must be labeled explicitly and not mistaken for durable persisted trigger evidence.
- `signal-generation-engine.trigger-contract.test.ts` still characterizes the older unavailable-field baseline, which is useful as regression evidence but not yet the canonical completeness behavior.
- `signal-generation-dq-enforcement.invariants.test.ts` remains the guard rail for strict fail-closed DQ behavior and must not be weakened by this child.

## Required QA Assertions

- `SignalResultDto.triggerContract` remains the single canonical trigger packet. No sibling packet such as `canonicalTriggerEvidence` is introduced in this child.
- Current non-legacy persisted rows can be classified as `COMPLETE` only when provenance and timestamp evidence are explicit. If that evidence is not explicit, the row must remain `CONTRACT_INCOMPLETE` rather than being overclaimed.
- Legacy rows remain `LEGACY_INCOMPLETE` and must not inherit proof-safe completeness from newer rows.
- Compatibility-only or request-local rows do not overclaim durable trigger provenance.
- `latestForInstrument()` request-local generation is labeled as request-local, not durable persisted trigger evidence, even if the generated row is persisted before the response returns.
- Persisted `created_at` and `updated_at` are surfaced when the repository already owns those timestamps.
- Linked generation-run timing and status are surfaced only when repository-backed evidence exists.
- `asset_class`, `region`, `strategy_id`, and `strategy_version` remain compatibility-only for this child and are not promoted to persisted trigger provenance.
- `trigger_timestamp` source-date semantics are explicit:
  - `SOURCE_PRICE_DATE` when sourced from `sourcePriceDate`
  - `SOURCE_DATA_DATE` when sourced from `sourceDataDate`
  - `UNAVAILABLE` when neither source date exists
- Unavailable lifecycle, rule-id, trigger-price, and timeframe fields remain unavailable rather than being invented.
- Strict Data Quality fail-closed behavior from existing Signal Generation coverage remains preserved.
- Research-support wording remains intact. No direct advice, guarantee, target-price, broker, or automation phrasing is introduced.

## Scenario Matrix

| Scenario | Expected QA assertion after implementation |
| --- | --- |
| Current trusted persisted row with explicit provenance and repository-backed row timestamps | `triggerContract` stays the single canonical packet, resolves to `COMPLETE`, surfaces `created_at` and `updated_at`, and exposes run audit evidence when the linked run row resolves. |
| Current persisted row missing explicit provenance or timestamp evidence | The packet does not overclaim; status remains `CONTRACT_INCOMPLETE` and the missing evidence stays explicit rather than inferred. |
| Legacy row missing current audit basis | `LEGACY_INCOMPLETE`, with no fabricated timestamps or run evidence. |
| Request-local `latestForInstrument()` generation | Packet origin is explicitly request-local and cannot be mistaken for durable persisted trigger evidence, even if the row becomes persisted during the request. |
| Current row with `sourcePriceDate` present | `trigger_timestamp` semantics resolve to `SOURCE_PRICE_DATE`. |
| Current row with `sourceDataDate` fallback only | `trigger_timestamp` semantics resolve to `SOURCE_DATA_DATE`. |
| Current row with neither source date | `trigger_timestamp` is unavailable and the incomplete reason stays explicit. |
| Current row with linked run row | Run `status`, `startedAt`, and `completedAt` surface only from repository-backed evidence. |
| Current row without linked run row | No run evidence is invented. |
| Compatibility-only enrichment present | `asset_class`, `region`, `strategy_id`, and `strategy_version` remain compatibility-only and are not treated as persisted trigger provenance. |
| Current row for unavailable trigger fields | `trigger_price`, `timeframe`, rule ids, and richer lifecycle state remain unavailable. |
| Trusted DQ read/run/latest regression | DQ fail-closed behavior stays intact. |
| Forbidden file widening attempt | Reject exactly and return the packet to Team 00 / Architect. |

## Focused Command Guidance

Commands below are guidance only. They were not run during this docs-only QA planning task.

Future focused validation after Team 00 Ready promotion, explicit Signal Generation sequencing, and implementation handoff:

```powershell
cd backend
npm.cmd test -- signal-generation-engine.repository.test.ts signal-generation-engine.service.test.ts signal-generation-engine.trigger-contract.test.ts signal-generation-dq-enforcement.invariants.test.ts --runInBand
```

Approval-gated backend build after accepted implementation and memory/resource checks:

```powershell
cd backend
npm.cmd run build
```

## Skipped / Forbidden Checks

Skipped in this planning pass:

- all executable tests
- backend build
- local servers, services, provider checks, and UI smoke

Forbidden by default for this slice:

- Prisma generate, migrate, db push, db execute, or any schema/data mutation
- controller/router/validation or route-registry widening
- frontend, shared utility, shared UI, package, or generated-contract changes
- Strategy Framework or downstream consumer edits as a backdoor for trigger provenance
- provider/live-market, startup/backfill, paid/cloud, telemetry, broker, or broad backend suites

## Exact Reject Conditions

Reject the packet immediately and return it to Team 00 / Architect if implementation edits:

- `backend/prisma/schema.prisma` or any migration file
- any generated file
- `backend/src/api/routes.ts`
- `frontend/src/app/routes.tsx`
- `backend/src/modules/signal-generation-engine/index.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.controller.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.router.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.validation.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.module.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.config.ts`
- any `frontend/src/**` file
- shared backend utilities or shared frontend components
- any package manifest
- any file under `backend/src/modules/strategy-framework/**`
- any file under `backend/src/modules/strategy-decision-engine/**`
- any file under `backend/src/modules/today-trade-review/**`
- any file under `backend/src/modules/trade-plan-risk-engine/**`
- any file under `backend/src/modules/alerts-monitoring/**`
- any file under `backend/src/modules/portfolio-management/**`
- any file under `backend/src/modules/portfolio-intelligence/**`
- any file under `backend/src/modules/watchlist-management/**`
- any file under `backend/src/modules/ai-investment-copilot/**`
- any file under `backend/src/modules/market-data-foundation/**`
- any provider, live-data, paid/cloud, broker, or telemetry path

These are first-child rejection conditions, not soft warnings.

## Stop Conditions

Stop QA and return to Team 00 / Architect if:

- implementation cannot surface the bounded child using existing persisted signal/run evidence already owned by the module
- implementation needs Strategy Framework source changes, shared contracts, schema work, route work, or downstream consumer adoption to complete the packet
- implementation tries to claim durable rule provenance, rule-defined trigger price, or broader lifecycle ownership from evidence the module does not persist
- implementation treats transient `strategyMatches[]` enrichment as trusted persisted provenance
- implementation weakens current strict DQ trusted read/run/latest gates in order to expose more trigger-audit rows
- Team 00 does not explicitly stack or reconcile this child against parked `CF-W1-SIG-TRIGGER-02A` commit `788c237`

## Evidence Required Later

- Exact implementation handoff limited to the reserved Signal Generation service/types/repository/doc/test files only
- Scenario evidence for `COMPLETE`, `LEGACY_INCOMPLETE`, and the request-local origin label
- Scenario evidence for persisted `created_at`/`updated_at`, run audit metadata, source-date semantics, compatibility-only provenance labeling, unavailable-field preservation, and legacy-row handling
- Focused Signal Generation repository/service/trigger-contract/DQ-invariant test output only after approval
- Backend build output only after approval
- Confirmation that strict DQ trusted read/run/latest behavior remained intact
- Explicit note that schema, routes, frontend, shared files, downstream consumer adoption, durable rule provenance, rule-defined trigger price, and broader lifecycle ownership remained out of scope
- Explicit note that Team 00 sequencing was controlled against parked `CF-W1-SIG-TRIGGER-02A` commit `788c237`
