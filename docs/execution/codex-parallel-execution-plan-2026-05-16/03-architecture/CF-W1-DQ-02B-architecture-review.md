# CF-W1-DQ-02B Architecture Review

Date: 2026-05-24

Owner: Team 03 Architecture Factory

## Status

Blocked. No honest no-schema, no-shared, public/read-path `CF-W1-DQ-02B` child is feasible on current `dev`.

`CF-W1-DQ-02A` already captured the bounded service-local currentness classifier on its accepted parked branch (`c2d6753`). The residual investor/trader value sits in persisted Data Quality Engine read paths, not in another module-local evaluation slice.

## Scope Of This Review

Determine whether the residual `CF-W1-DQ-02` parent can be split into a bounded child that:

- stays no-schema;
- avoids shared utility and route changes;
- avoids Market Data Foundation source edits;
- avoids Prisma/generated/storage changes;
- still gives direct investor/trader value through existing public/read paths.

Verdict: no.

## Evidence Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/next-top-10-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/top-10-ready-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-DQ-02-dq-currentness-evidence-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-DQ-02-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-DQ-02-dq-currentness-evidence-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-DQ-02-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/audit-market-data-data-quality.md`
- `backend/src/modules/data-quality-engine/data-quality-engine.service.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.repository.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.types.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.md`
- `backend/src/modules/market-data-foundation/index.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.market-session.ts`
- accepted parked branch evidence: `git show --stat --oneline c2d6753`

## Current Source Findings

- `data-quality-engine.service.ts` on current `dev` still uses `STALE_PRICE_DAYS = 7` and the existing `summary()`, `list()`, `diagnostics()`, `getLatestEvaluationForInstrument()`, and `getEvaluationsForInstruments()` methods are read-side wrappers over repository output.
- `diagnostics()` returns the persisted repository row when one exists, and only evaluates live when no persisted row exists. That means investor-facing diagnostics are persistence-shaped first.
- `data-quality-engine.repository.ts` persists and reconstructs `dataGaps`, `warnings`, `readinessReasons`, and `readinessBlockers`, but it does not expose a durable session-aware currentness object, dates, or reason codes.
- `summary()` derives stale counts from blocker/gap text such as `latest price is stale`; it cannot produce trustworthy currentness breakdowns without widening repository semantics.
- `market-data-foundation/index.ts` already exports `latestCompletedTradingDateForRegion()` from `market-data-foundation.market-session.ts`. Market Data Foundation already owns session timing; `DQ-02B` should not duplicate it downstream.
- Accepted parked branch `c2d6753` proves the bounded child already used the safe writer set: DQE service/types/doc/tests only. The residual gap is therefore read-side/public-contract scope, not another service-only slice.

## Why No Honest `DQ-02B` Exists Under Current Constraints

The remaining user value is "show currentness consistently on persisted DQ trust surfaces." In the live module, those trust surfaces are:

- `summary()`
- `list()`
- `diagnostics()` when a row already exists
- helper read paths that feed downstream eligibility consumers

Any child that avoids repository/read-side edits has only three options, and all are architecturally misleading:

1. Add more service-local evaluation logic only.
   This duplicates `DQ-02A` value and does not reach persisted read paths.
2. Recompute currentness selectively at read time for a subset of endpoints.
   This creates inconsistent behavior between persisted rows and live recomputation.
3. Infer new public semantics from existing blocker strings only.
   This is too lossy for a trustworthy investor/trader read-path contract and would still require repository/service widening to become public.

Because the direct value is read-side consistency, a no-repository/no-route child would either underdeliver or create selective truth depending on endpoint. That fails the architecture bar.

## Specific Consent Blocker

Before `CF-W1-DQ-02` can reopen honestly, Team 00 must explicitly authorize a DQE persisted read-side/public-contract packet.

Minimum consent-gated implementation surface:

- `backend/src/modules/data-quality-engine/data-quality-engine.repository.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.service.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.types.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.md`
- focused repository/service tests

Conditional additional consent:

- if HTTP response payloads for `summary`, `list`, or `diagnostics` become additively currentness-aware, reserve controller/route response tests;
- if Product Owner wants durable replayable currentness dates or reason codes instead of read-time reconstruction, stop and request separate Prisma/schema approval.

## Exact Reservation Result

No application-file reservation is safe now for `CF-W1-DQ-02B`.

Current allowed writer set for this Team 03 pass only:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-DQ-02B-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-DQ-02B-dq-currentness-public-read-path-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-DQ-02B-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-CF-W1-DQ-02B-architecture-outbox.md`

Future consent-gated implementation writer set, if Team 00 reopens:

- `backend/src/modules/data-quality-engine/data-quality-engine.repository.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.service.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.types.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.md`
- `backend/tests/modules/data-quality-engine/data-quality-engine.service.test.ts`
- `backend/tests/modules/data-quality-engine/data-quality-engine.invariants.test.ts`
- `backend/tests/modules/data-quality-engine/data-quality-engine.repository.test.ts` if created
- controller/route response tests only if additive HTTP payload changes are approved

## Exact Forbidden Files Under Current Constraint Set

- `backend/src/modules/market-data-foundation/**`
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- `backend/src/api/routes.ts`
- `frontend/src/app/routes.tsx`
- shared backend utilities
- shared frontend components
- package manifests
- generated files
- all frontend source/tests
- any storage, schema, generated-type, route-registry, or shared-utility file not listed above

## QA Handoff Notes

Team 04 should not plan executable `DQ-02B` verification under the current no-schema/no-shared constraint set.

What QA can validate now:

- the blocker is real and tied to persisted read-side behavior;
- `DQ-02A` already captured the safe service-local classifier on accepted branch `c2d6753`;
- any reopened packet must prove consistent currentness on persisted `summary`, `list`, and `diagnostics` paths, not only fresh evaluation responses.

Required future QA scenarios after explicit reopening:

- persisted stale/current/missing/blocked rows surface consistently on `summary`, `list`, and `diagnostics`;
- currentness dates/reason codes align with Market Data Foundation session evidence;
- strict downstream consumers remain fail-closed without duplicating DQ logic;
- no Market Data source edits, schema edits, or shared-file drift occur unless separately approved.

## Ready Recommendation

Blocked.

- `Ready candidate`: no
- `Split required`: already exhausted by accepted `DQ-02A`
- `Blocked`: yes

Team 00 should keep the residual parent out of Ready and route Team 03 next toward `CF-W1-TSC-02` or the next requirement-ready direct-value packet instead of forcing a fake `DQ-02B`.
