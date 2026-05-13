# Brief 4 Discovery Notes - Cross-Module Actionability Consistency

Date: 2026-05-13  
Owner: Lane 3 Developer Agent  
Work packet: `WP-2026-05-13-04D - Cross-Module Actionability Discovery`  
Mode: Discovery only

## Scope Reviewed

- `docs/codex-agent-team-plan/work-packets/2026-05-13-top5-work-packets.md`
- `docs/codex-agent-team-plan/po-test-report-2026-05-13.md`
- `docs/codex-agent-team-plan/architecture-contracts/2026-05-13-top5-architecture-contracts.md`
- `docs/codex-agent-team-plan/qa-plans/2026-05-13-top5-qa-plan.md`
- `backend/src/modules/research-hub/*`
- `backend/tests/modules/research-hub/*`
- `frontend/src/features/research-hub/*`
- `frontend/tests/ui/research-hub.spec.ts`
- Read-only public surfaces in `today-trade-review`, `strategy-decision-engine`, and `trade-plan-risk-engine`

## Current State

Research Hub already owns the command-center overview at `GET /api/v1/research/overview`. The backend currently fans out to Strategy Decision, Market Context, Signal Generation, Smart Money, and Strategy Framework. It does not consume Today Review latest-run readiness or Trade Plan paper-readiness funnel state directly.

The current Research Hub risk is real: `marketReadiness.headline` can say `Environment is healthy: high-conviction setups allowed.` while Today Review may be partial and Trade Plans may have zero paper-ready plans. The existing `allowedActions` and `nextActions` are market/strategy-oriented, not a normalized cross-module actionability answer.

## Smallest Non-Conflicting Implementation Slice

The smallest future implementation should be Research Hub-local and additive:

1. Add an `actionability` object to `ResearchOverview`.
2. Compute it inside `ResearchHubService.overview` from public child-module outputs only.
3. Add deterministic Research Hub status mapping tests before UI changes.
4. Show the actionability summary on the Research Hub overview without changing shared components or other module UIs.
5. Keep all unavailable upstream dimensions conservative: unavailable Today Review or Trade Plan readiness must make `canReviewActionableSetups = false` and produce `LIMITED` or `INSUFFICIENT_DATA`, never `READY`.

This slice avoids shared enums, shared UI components, route changes, schema changes, and edits to Today Review, Strategy Decision, or Trade Plan source. It also lets the team wire stable upstream outputs later without reworking the Research Hub response shape.

## Upstream Outputs

Can consume now:

- Strategy Decision `marketGate(region)` exposes market condition, market gate, allowed actions, blockers, data status, and updated time.
- Strategy Decision `candidates(...)` exposes framework-backed review-candidate proof, blockers, warnings, data gaps, confidence, readiness label, and strategy rating.
- Strategy Framework `performance(strategy, scope)` exposes available backtest/performance summaries used by Research Hub's current proof summary.
- Trade Plan `funnelDiagnostics(query)` already exposes generated plan counts, paper-readiness counts, blocker counts, proof gaps, and data-quality gaps. This is a useful public read model, but its canonical paper-readiness semantics are part of Brief 5 and should be treated as unstable until Brief 5 is ready.
- Today Review `latest(query)` exposes latest run status, trust status, review-universe mode, grouped candidates, scan funnel, warnings, and source snapshot. This is the right public read model, but Brief 1 currently owns Today Review readiness consumption and may change the exact readiness summary.

Must wait or remain conservative:

- Brief 1: wait for stable trusted review-universe readiness summary and Today Review consumption semantics before Research Hub treats Today Review as `READY`.
- Brief 2: wait for Signal Quality Lab `evidenceUsability` and maturity buckets before Research Hub claims signal evidence is `READY`; current Signal Generation bullish/bearish counts are confirmation context only.
- Brief 3: wait for calibration readiness before any calibration dimension can be more specific than `LIMITED` or `INSUFFICIENT_DATA`.
- Brief 5: wait for stable Trade Plan paper-readiness proof-chain output before Research Hub treats trade-plan readiness as `READY`.

## Proposed Actionability Precedence

Use the Architecture-approved vocabulary: `READY`, `LIMITED`, `BLOCKED`, `UNPROVEN`, `INSUFFICIENT_DATA`.

Recommended initial reducer:

- Hard data or Today Review `NO_REVIEW` -> `BLOCKED`.
- Today Review unavailable or no latest run -> `INSUFFICIENT_DATA`.
- Trade Plan paper-readiness hard blockers -> `BLOCKED`.
- Trade Plan unavailable or no generated-plan funnel evidence -> `INSUFFICIENT_DATA`.
- No strategy proof or no backtest summaries for all review candidates -> `UNPROVEN`, unless a harder blocker exists.
- Signal/calibration unavailable -> `LIMITED` or `INSUFFICIENT_DATA`; it must not imply market health is bad.
- `canReviewActionableSetups = true` only when Today Review has reviewable candidates and Trade Plan has at least one `READY_FOR_PAPER_REVIEW` or an Architect-approved reviewable non-paper equivalent.

## Exact Proposed File Reservations

Small Research Hub implementation packet:

- `backend/src/modules/research-hub/research-hub.types.ts`
- `backend/src/modules/research-hub/research-hub.service.ts`
- `backend/tests/modules/research-hub/research-hub.service.test.ts`
- `frontend/src/features/research-hub/api/researchHubApi.ts`
- `frontend/src/features/research-hub/components/ResearchOverviewPage.tsx`
- `frontend/tests/ui/research-hub.spec.ts`

Optional only if the future packet explicitly documents constructor/import wiring for public read services:

- `backend/src/modules/research-hub/index.ts`

Do not reserve in the smallest slice:

- `backend/src/shared/*`
- `frontend/src/shared/*`
- `backend/prisma/schema.prisma`
- route registries or navigation files
- Today Review, Strategy Decision, or Trade Plan source/tests

If the Orchestrator wants all four module UIs to use shared labels in the same implementation pass, that should be a larger cross-module packet, not this smallest non-conflicting Research Hub slice.

## Risks

- Full Brief 4 implementation before Brief 1 and Brief 5 can still produce contradictory readiness if Research Hub maps unstable Today Review or Trade Plan fields.
- Treating Strategy Decision market gate as actionability is unsafe; market health is only one dimension.
- Trade Plan `funnelDiagnostics` currently provides useful counts, but Brief 5 may change blocker taxonomy or positive readiness rules.
- Signal Generation counts are not Signal Quality evidence maturity; Research Hub should not infer evidence usability from bullish/bearish totals.
- Fanout can slow the overview. Any future implementation should use persisted/latest summary methods, bounded queries, and failure-to-downgrade behavior.
- UI copy must avoid action language that suggests execution readiness. Use review, investigate, repair, evaluate, or paper-review language only.

## Recommendation

Do not start the full cross-module actionability implementation until Brief 1 and Brief 5 outputs are stable, and preferably until Brief 2 exposes stable evidence-usability semantics. The Orchestrator can proceed conservatively with the small Research Hub-local slice only if the implementation intentionally keeps `canReviewActionableSetups = false` whenever Today Review, Trade Plan, Signal Quality, or Calibration readiness is unavailable or unstable.

Best next packet: after Brief 1 reaches at least `Ready for QA`, reserve only the Research Hub files listed above and implement the additive `actionability` DTO plus backend mapping tests. Defer cross-module UI label alignment and Today Review/Trade Plan source edits to a later Orchestrator-owned packet after Brief 5.

## Revision Evidence - WP-2026-05-13-04A

Revision validation date: 2026-05-13  
Validation mode: authenticated local API against rebuilt backend on `http://localhost:3003`

Commands/checks:

- `npm.cmd run build` in `backend` passed.
- Started rebuilt backend from `backend/dist/index.js` with `PORT=3003`.
- Authenticated with the local test persona through `POST /api/v1/auth/login`.
- Queried `GET /api/v1/research/overview?region=IN&assetType=STOCK` with bearer auth.
- Ran an assertion check that fails if `canReviewActionableSetups` is not `false` or if any unstable upstream dimension is `READY`.

Observed API evidence:

```json
{
  "validation": "PASS",
  "overallStatus": "INSUFFICIENT_DATA",
  "canReviewActionableSetups": false,
  "signalEvidence": "LIMITED",
  "calibrationReadiness": "INSUFFICIENT_DATA",
  "todayReviewReadiness": "INSUFFICIENT_DATA",
  "tradePlanReadiness": "INSUFFICIENT_DATA",
  "checkedUnstableDimensionsReadyCount": 0
}
```

Additional observed context from the same authenticated response:

- `marketEnvironment`: `INSUFFICIENT_DATA`
- `dataReadiness`: `INSUFFICIENT_DATA`
- `strategyProof`: `UNPROVEN`
- `nextBestAction`: `Run Strategy Evaluation`
- blocker categories included `signal-calibration-engine:INSUFFICIENT_DATA`, `today-trade-review:INSUFFICIENT_DATA`, and `trade-plan-risk-engine:INSUFFICIENT_DATA`.

Browser/live UI note:

- Existing frontend dev server on `http://127.0.0.1:5173` proxies `/api` to the stale backend on `3000`.
- The running `3000` backend returned no `actionability` object, confirming it was not rebuilt with WP-2026-05-13-04A.
- `frontend/vite.config.ts` hardcodes the dev proxy target to `http://localhost:3000`; editing this file is outside the revision scope.
- Therefore the valid pre-QA live/local-data evidence for this revision is the authenticated rebuilt API check on `3003`.
