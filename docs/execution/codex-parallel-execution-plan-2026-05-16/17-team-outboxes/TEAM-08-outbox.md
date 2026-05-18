# TEAM-08 Outbox - UX / Research / Copilot

Date: 2026-05-18

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

## Continuation - CF-W1-UX-02 / CF-W1-UX-05 Source Mapping

Date: 2026-05-18

State: Not Ready for Implementation.

### Ready-Promotion Recommendation

Do not promote `CF-W1-UX-02` or `CF-W1-UX-05A` yet.

Reason: the underlying services expose trust-adjacent evidence, but the current Copilot DTO and page contract do not surface the required trust fields without backend contract changes. Shared UI and navigation edits are not needed for the first Copilot-only slice, but the Copilot response shape itself still needs a contract refresh before implementation can be safe.

### Source-Supported Trust Mapping

Available in current source, but not yet surfaced by the Copilot response:

- `backend/src/modules/stock-research-workbench/stock-research-workbench.service.ts` exposes `trust.source`, `trust.last_updated_timestamp`, `trust.data_status`, plus chart and overview timestamps.
- `backend/src/modules/signal-generation-engine/signal-generation-engine.service.ts` already carries `data_status`, `sourceDataDate`, `sourcePriceDate`, `generated_at`, `scope`, `dataQualityEligibility`, `runAudit`, `latestGeneratedAt`, and readiness-related evaluation output.
- `backend/src/modules/smart-money-intelligence/smart-money-intelligence.service.ts` exposes `dataStatus`, `updatedAt`, `source`, `range`, `insiderOwnership.ownershipDataStatus`, and scoped run responses.
- `backend/src/modules/market-context-intelligence/market-context-intelligence.service.ts` exposes `dataStatus`, `updatedAt`, and region-scoped summaries.

Current Copilot service can already read those modules, but it only returns the flat summary payload in `backend/src/modules/ai-investment-copilot/ai-investment-copilot.types.ts`.

### Missing Trust Fields / Blockers

Missing from the current Copilot contract:

- explicit trust state
- DQ readiness evidence
- use-case tier
- blocker reasons and warning reasons
- latest trusted data date
- summary visibility state
- local-only / deterministic / no-external / no-paid-provider proof
- scope evidence in the Copilot response

Additional blocker:

- `marketBrief()` currently ignores the requested scope query, so the trust mapping cannot claim complete scope fidelity without a backend contract update.

### UX Copy Risks

Current source still uses advisory-feeling or recommendation-adjacent copy:

- page title `AI Investment Copilot`
- action label `Generate Report`
- section label `Bullish Factors`
- service copy `high-scoring names to research`
- service copy `appears strong`
- the page status chip maps `COMPLETE` to success and `MISSING` to error, which can read like recommendation quality instead of evidence readiness

The current disclaimer is useful, but it does not fully prove local/deterministic/no-external behavior in the UI.

### File Reservation Outcome

No Ready-promotion file reservation set is warranted yet.

If Team 00 promotes a revised Copilot-only handoff later, the existing contract files remain the likely docs reference point:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-UX-02-copilot-trust-ux-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-UX-05-product-language-status-contract.md`

### Focused Validation / UI Smoke Commands If Promoted

Backend:

```powershell
cd backend
npm.cmd test -- ai-investment-copilot.service.test.ts ai-investment-copilot.validation.test.ts ai-investment-copilot.routes.test.ts --runInBand
```

UI smoke after accepted UI scope, local startup plan, and memory/resource gate:

```powershell
cd frontend
npm.cmd run test:ui -- ai-investment-copilot.spec.ts --workers=1
```

Optional text-scan after implementation is reserved:

```powershell
rg -n "buy now|sell now|must buy|must sell|guaranteed|profit target|price target|recommendation quality|target achieved" backend/src/modules/ai-investment-copilot frontend/src/features/ai-investment-copilot backend/tests/modules/ai-investment-copilot frontend/tests/ui
```

### Bottom Line

`CF-W1-UX-02` and `CF-W1-UX-05A` remain docs-only. The right next step is a Copilot-only contract refresh that adds the trust object and scope fallback rules before any code promotion.

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

---

## Continuation - CF-W1-UX-02 / CF-W1-UX-05 Readiness Mapping Refresh

Date: 2026-05-18

Owner: Team 08 - UX / Research / Copilot

Mode: read-only source inspection plus outbox update only.

### Recommendation

Ready-recommended for one bounded Copilot-only slice, with two hard constraints:

1. blocked narrative hiding is not safe as a frontend-only change; it requires additive Copilot backend contract changes inside the `ai-investment-copilot` module;
2. `CF-W1-UX-05A` should be folded into the same Copilot-only implementation pass as `CF-W1-UX-02` to avoid duplicate writers on the same Copilot files.

This is a recommendation only. Team 00 still owns Ready promotion.

### Source-Supported Trust Fields - Current State

Current Copilot DTO fields that are already source-proven and already surfaced to the page:

- `title`
- `summary`
- `keyTakeaways`
- `bullishFactors`
- `bearishFactors`
- `riskFactors`
- `dataGaps`
- `suggestedNextReviews`
- `sourceModules`
- `generatedAt`
- `dataStatus`

Evidence:

- `backend/src/modules/ai-investment-copilot/ai-investment-copilot.types.ts`
- `frontend/src/features/ai-investment-copilot/types.ts`
- `frontend/src/features/ai-investment-copilot/components/AiInvestmentCopilotPage.tsx`

Current module-level trust facts that are source-proven in implementation/docs but not surfaced as structured DTO fields:

- local API only under `/api/v1/copilot`
- deterministic internal summary assembly from existing local modules
- research-support disclaimer
- no paid or mandatory external LLM/provider requirement in the current module contract

Evidence:

- `frontend/src/features/ai-investment-copilot/api/aiInvestmentCopilotService.ts`
- `backend/src/modules/ai-investment-copilot/ai-investment-copilot.service.ts`
- `backend/src/modules/ai-investment-copilot/ai-investment-copilot.md`

### Upstream Trust Evidence Already Available But Not Surfaced By Copilot DTO

Stock summary upstream evidence:

- Stock Research Workbench exposes `trust.source`, `trust.last_updated_timestamp`, `trust.data_status`.
- Signal Generation exposes `sourceDataDate`, `sourcePriceDate`, `dataQualityEligibility.signalReadinessStatus`, `data_status`, and trigger-contract evidence.
- Smart Money exposes `updatedAt`, `dataStatus`, `source`, and `insiderOwnership.ownershipDataStatus`.
- Market Context exposes `updatedAt`, `dataStatus`, and `macro.dataStatus`.

Portfolio/watchlist/alert upstream evidence:

- Portfolio summary exposes `generatedAt` and `dataStatus`, but not price timestamps.
- Portfolio intelligence exposes `generatedAt`, `dataStatus`, and red flags.
- Watchlist detail exposes `generatedAt`, latest signal timestamps per item, and latest prices.
- Alert events expose `severity`, `triggeredAt`, and scope references.

Evidence:

- `backend/src/modules/stock-research-workbench/stock-research-workbench.types.ts`
- `backend/src/modules/stock-research-workbench/stock-research-workbench.service.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.types.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.service.ts`
- `backend/src/modules/smart-money-intelligence/smart-money-intelligence.types.ts`
- `backend/src/modules/market-context-intelligence/market-context-intelligence.types.ts`
- `backend/src/modules/market-context-intelligence/market-context-intelligence.service.ts`
- `backend/src/modules/portfolio-management/portfolio-management.types.ts`
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.types.ts`
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.md`
- `backend/src/modules/watchlist-management/watchlist-management.types.ts`
- `backend/src/modules/alerts-monitoring/alerts-monitoring.types.ts`

### Source-Supported Mapping For Future Copilot Trust Object

Safe to add now from current source:

- `researchSupportOnly: true`
- `localOnly: true`
- `deterministic: true`
- `externalLlmUsed: false`
- `paidProviderUsed: false`
- `sourceModules`
- `dataGaps`
- `generatedAt`

Safe to derive with additive backend mapping:

- `warningReasons` from current `dataGaps`, partial upstream status flags, and missing-source conditions
- `blockerReasons` when a summary depends on a missing/failed upstream source or on an unsupported/unverified scope path
- `latestTrustedDataDate` when an upstream timestamp exists; otherwise `null`
- `summaryVisibility` based on trust-state rules inside Copilot service

Partially source-supported only; must not be overstated:

- `dataQualityStatus`: explicit signal DQ readiness exists for signal data, but many Copilot inputs only expose generic module `dataStatus`; Copilot must surface `UNKNOWN` or a missing-DQ marker where true DQ readiness is unavailable
- `scope`: frontend has current market scope and market brief currently sends `region`, but Copilot responses do not currently prove scoped backend consumption for stock/portfolio/watchlist/alerts and do not send `assetType`

Not source-proven today and must not be claimed without new backend mapping:

- explicit `trustState`
- explicit `useCaseTier`
- explicit blocked/limited visibility policy
- explicit scope fidelity in Copilot response

### Blocked Narrative Hiding Feasibility

Blocked narrative hiding is feasible in a Copilot-only slice, but not without backend contract changes.

Why frontend-only is not enough:

- current Copilot DTO has no trust-state field and no summary-visibility field;
- current service always returns `summary`;
- current service currently sets `dataStatus` to `PARTIAL` when any gap exists and `COMPLETE` otherwise across all Copilot flows, so the UI cannot truthfully infer a blocked state from the existing response;
- market brief scope query is sent from frontend, but the Copilot controller currently ignores query scope and does not pass it through.

Result:

- No route registry, shared UI/navigation, package, generated-type, provider, external LLM, paid-service, or broad Research Workbench change is required for the first slice.
- Additive Copilot backend contract work is required.

### UX-05 Sequencing Advice

Fold `CF-W1-UX-05A` into the same Copilot-only implementation pass as `CF-W1-UX-02`.

Reason:

- both items need the same writer set on Copilot backend/frontend files;
- page copy and blocked/limited/trusted state labels should be changed together so UI and DTO semantics do not drift;
- splitting them creates duplicate edits to `AiInvestmentCopilotPage.tsx`, Copilot DTO types, tests, and module docs.

Do not fold in:

- `frontend/src/app/navigationMetadata.tsx` (`AI Copilot` label remains out of scope);
- shared `StatusBadge` work;
- Research Hub copy;
- Market Data unsupported-asset copy;
- Stock Research Workbench UI.

### Ready-Recommendation File Reservations

Allowed writer set for one bounded Copilot-only implementation pass:

- `backend/src/modules/ai-investment-copilot/ai-investment-copilot.types.ts`
- `backend/src/modules/ai-investment-copilot/ai-investment-copilot.service.ts`
- `backend/src/modules/ai-investment-copilot/ai-investment-copilot.controller.ts`
- `backend/src/modules/ai-investment-copilot/ai-investment-copilot.validation.ts` only if scope/query parsing is added
- `backend/src/modules/ai-investment-copilot/ai-investment-copilot.md`
- `backend/tests/modules/ai-investment-copilot/ai-investment-copilot.service.test.ts`
- `backend/tests/modules/ai-investment-copilot/ai-investment-copilot.routes.test.ts`
- `backend/tests/modules/ai-investment-copilot/ai-investment-copilot.validation.test.ts` only if validation logic changes
- `frontend/src/features/ai-investment-copilot/types.ts`
- `frontend/src/features/ai-investment-copilot/api/aiInvestmentCopilotService.ts`
- `frontend/src/features/ai-investment-copilot/hooks/useAiInvestmentCopilot.ts`
- `frontend/src/features/ai-investment-copilot/components/AiInvestmentCopilotPage.tsx`
- `frontend/tests/ui/ai-investment-copilot.spec.ts`

Forbidden for the first slice:

- `frontend/src/shared/**`
- `frontend/src/app/routes.tsx`
- `frontend/src/app/navigationMetadata.tsx`
- `frontend/src/features/stock-research-workbench/**`
- `frontend/src/features/research-hub/**`
- `frontend/src/features/market-data-foundation/**`
- `backend/src/api/routes.ts`
- `backend/prisma/**`
- package manifests
- generated/common fixture files
- provider/startup/sync/import/backfill files
- external AI / telemetry / paid-service integration

### QA Scenarios Team 04 Should Carry Forward

Backend:

- trusted stock summary with all required upstream evidence present
- limited stock summary when generic data gaps exist but no explicit DQ readiness is available
- blocked summary when required upstream source is missing or scope is unsupported/unverified under the accepted policy
- latest trusted data date populated when upstream timestamps exist and `null` when they do not
- safe-language replacement for advisory/certainty wording
- market brief scope pass-through behavior for `region` and any accepted `assetType` handling

UI:

- blocked state hides narrative and shows blockers before any summary text
- limited state shows warnings without success-style recommendation framing
- trusted state shows local/deterministic/research-only proof, source modules, and data gaps
- page/action/section labels use research-support language
- current scope is visible or explicitly marked as unverified where backend scope is not proven

Focused regression note:

- notifications delivery reuses Copilot market brief and alert digest payloads, so backend tests should confirm additive Copilot DTO changes do not break `notifications-delivery` digest assembly

### Residual UX Risks

- Navigation still says `AI Copilot` in `frontend/src/app/navigationMetadata.tsx`; this remains out of scope and leaves a known naming mismatch after a Copilot-only page rename.
- Shared color semantics remain unresolved because shared `StatusBadge` is out of scope.
- Portfolio trust remains weaker than stock trust because portfolio summary lacks price timestamps, so stale-price trust cannot be proven from current source.
- Watchlists are inherently cross-region; showing current global scope as if it constrains watchlist membership would overstate scope fidelity.
- Alert digest trust is event-severity oriented, not DQ-readiness oriented; it may need a persistent `UNKNOWN` or non-DQ trust label in the first slice.

### Next Gate

Team 00 should treat this as Ready-recommended only for a single Copilot-only implementation packet that combines `CF-W1-UX-02` and `CF-W1-UX-05A`, keeps one writer on the file set above, and routes the handoff to Team 04 and Team 10 after implementation.
