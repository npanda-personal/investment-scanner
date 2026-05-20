# CF-W1-L3-DQ-01 Architecture Review

Date: 2026-05-19

Owner: Team 03 Architecture Factory

## Status

Parent policy is accepted as a split-child routing packet, but the parent item is `BLOCKED` for Ready promotion in shared `dev`.

This requirement must stay split. No new broad Lane 3 readiness-consumer implementation is architecture-ready from the shared workspace until the accepted `CF-W1-L3-PORT-01A` child finishes its remaining non-architecture gates and its DTO contract exists on clean `dev`.

## Evidence Inspected

- `AGENTS.md`
- `10-requirements/CF-W1-L3-DQ-01-lane-3-readiness-consumer-policy-requirement.md`
- `03-architecture/CF-W1-L3-DQ-01-architecture-review.md`
- `06-contracts/CF-W1-L3-DQ-01-lane3-readiness-consumer-policy-contract.md`
- `08-work-packets/CF-W1-L3-DQ-01-work-packet.md`
- `03-architecture/CF-W1-L3-PORT-01A-architect-signoff.md`
- `03-architecture/CF-W1-L3-PORT-01B-architecture-review.md`
- `03-architecture/CF-W1-L3-INTEL-01-architecture-review.md`
- `18-integration-queue/CF-W1-L3-PORT-01A-team10-rereview-release.md`
- `12-ready-queue/ready-for-implementation.md`
- `backend/src/modules/data-quality-engine/index.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.service.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.types.ts`
- `backend/src/modules/portfolio-management/portfolio-management.service.ts`
- `backend/src/modules/portfolio-management/portfolio-management.types.ts`
- `backend/src/modules/watchlist-management/watchlist-management.service.ts`
- `backend/src/modules/watchlist-management/watchlist-management.types.ts`
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.service.ts`
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.types.ts`
- `backend/src/modules/alerts-monitoring/alerts-monitoring.service.ts`
- `backend/tests/modules/portfolio-management/portfolio-management.service.test.ts`
- `backend/tests/modules/watchlist-management/watchlist-management.service.test.ts`
- `backend/tests/modules/portfolio-intelligence/portfolio-intelligence.service.test.ts`

## Current Source Findings

- `portfolio-management.summary()` still derives `dataStatus` from missing current prices and does not prove Data Quality trust on its own.
- `watchlist-management.detail()` and `enrichItem()` still return current price and latest signal without readiness evidence.
- `portfolio-intelligence` still derives `healthScore`, `status`, review ranking, and `actionSuggestion` from portfolio fields that do not yet prove accepted readiness trust in current `dev`.
- `alerts-monitoring` still evaluates stock, portfolio, and watchlist rules from price/signal presence in current `dev`, but that child already has its own reserved alert workstream.
- `DataQualityEngineService` public methods are sufficient for consumer reads: `getLatestEvaluationForInstrument()` and `getEvaluationsForInstruments()` already expose the needed public DTOs.
- `diagnostics()` is not a safe default consumer-read API for this policy because it can evaluate and persist on miss.
- `data-quality-engine/index.ts` publicly exports both the service and repository. Child packets must explicitly forbid repository imports even though the export exists.
- The accepted `CF-W1-L3-PORT-01A` readiness DTO shape is still absent from shared `dev`; `backend/src/modules/portfolio-management/portfolio-management.types.ts` has no `readiness` or `readinessSummary` fields in this workspace, so downstream consumers cannot yet depend on accepted portfolio readiness source from `dev`.

## Gate-State Findings

- `CF-W1-L3-PORT-01A` is no longer an architecture-prep candidate. Its dedicated worktree passed Team 10 re-review and Team 03 Architect Signoff, with next gate recorded as delegated Product Owner acceptance and Team 00 staged-scope verification before any scoped local commit.
- No delegated Product Owner acceptance artifact or Team 00 scoped-commit verification artifact for `CF-W1-L3-PORT-01A` is present in the shared execution packet read during this pass.
- Because the accepted portfolio readiness DTOs are not yet present on clean `dev`, the parent packet cannot advance `CF-W1-L3-PORT-01B` or `CF-W1-L3-INTEL-01` as fresh Ready candidates from this workspace.

## Decision Mapping

Approved parent policy remains Option B:

| Readiness state | Passive portfolio/watchlist/research display | Trusted summary / reliability label | Alert or other action-like workflow |
| --- | --- | --- | --- |
| `READY` | Allowed | Allowed only within the child contract for that module | Allowed only within the child contract for that module |
| `LIMITED` | Allowed only as passive limited context with visible reasons/warnings | Blocked | Blocked |
| Missing DQ | Blocked or untrusted state only | Blocked | Blocked |
| `NOT_READY` | Blocked or untrusted state only | Blocked | Blocked |
| `UNUSABLE` coverage | Blocked or untrusted state only | Blocked | Blocked |
| stale hard blocker | Blocked or untrusted state only | Blocked | Blocked |
| unsupported / scope mismatch / provider-gap blocker | Blocked or untrusted state only | Blocked | Blocked |

Parent-level rule: presence of price, valuation, signal, health, review, or alert threshold data is never enough to imply trust.

## Split Decision

This requirement does split cleanly into module-local children. The broad Lane 3 scope must not be implemented together.

The first bounded child was correctly chosen as:

`CF-W1-L3-PORT-01A` - `portfolio-management` readiness DTOs only.

That child is module-local and does not require shared UI, route registries, Prisma/schema, providers, package-manifest changes, generated-file changes, or shared DTO extraction.

The next fresh readiness-consumer candidate after `CF-W1-L3-PORT-01A` lands on clean `dev` is:

`CF-W1-L3-PORT-01B` - `watchlist-management` readiness DTOs only.

That child is also module-local if it stays inside the reserved watchlist files and consumes DQ through the public service boundary only.

## Child Sequencing And Dependencies

- `CF-W1-L3-PORT-01A`: in-flight upstream baseline only. It already cleared Team 10 re-review and Architect Signoff in its dedicated worktree; parent routing now waits on delegated Product Owner acceptance and Team 00 staged-scope verification/local commit.
- `CF-W1-L3-PORT-01B`: next fresh readiness-consumer candidate. Keep blocked until `CF-W1-L3-PORT-01A` is accepted and its DTO shape is available on clean `dev`.
- `CF-W1-L3-INTEL-01`: remains blocked behind accepted `CF-W1-L3-PORT-01A` source because Portfolio Intelligence should consume portfolio readiness evidence rather than remap DQ independently.
- `CF-W1-L3-ALERT-01`: stays in its separate alert file reservation and must not run in parallel with `CF-W1-L3-AUTH-03` because the `alerts-monitoring` writer set overlaps.
- Copilot/research trust work stays docs-only until separate UX approval and explicit frontend reservations exist.

## Doc Drift Found

- The older parent packet text still frames `CF-W1-L3-PORT-01A` as only a future baseline. That is stale; architecture and release docs now show it progressed through Team 10 re-review and Team 03 Architect Signoff in its dedicated worktree.
- The shared `dev` source still lacks the accepted portfolio readiness DTO shape, so downstream child docs that require `PortfolioSummaryDto.readinessSummary` or `HoldingValuationDto.readiness` remain structurally blocked even though upstream signoff exists in worktree evidence.

These conflicting docs were not edited in this pass because they are outside the allowed write scope.

## Exact Future Reservation Matrix

Parent routing should keep one writer per file and sequence children as follows:

1. `CF-W1-L3-PORT-01A` upstream baseline already assigned in its dedicated worktree
   - `backend/src/modules/portfolio-management/portfolio-management.service.ts`
   - `backend/src/modules/portfolio-management/portfolio-management.types.ts`
   - `backend/src/modules/portfolio-management/portfolio-management.md`
   - `backend/tests/modules/portfolio-management/portfolio-management.service.test.ts`
2. `CF-W1-L3-PORT-01B` next fresh readiness-consumer child after `PORT-01A` lands on clean `dev`
   - `backend/src/modules/watchlist-management/watchlist-management.service.ts`
   - `backend/src/modules/watchlist-management/watchlist-management.types.ts`
   - `backend/src/modules/watchlist-management/watchlist-management.md`
   - `backend/tests/modules/watchlist-management/watchlist-management.service.test.ts`
3. `CF-W1-L3-INTEL-01` downstream `portfolio-intelligence` reliability-gate child after `PORT-01A` lands on clean `dev`
   - `backend/src/modules/portfolio-intelligence/portfolio-intelligence.service.ts`
   - `backend/src/modules/portfolio-intelligence/portfolio-intelligence.types.ts`
   - `backend/src/modules/portfolio-intelligence/portfolio-intelligence.md`
   - `backend/tests/modules/portfolio-intelligence/portfolio-intelligence.service.test.ts`
4. `CF-W1-L3-ALERT-01` separate `alerts-monitoring` child
   - `backend/src/modules/alerts-monitoring/alerts-monitoring.service.ts`
   - `backend/src/modules/alerts-monitoring/alerts-monitoring.types.ts`
   - `backend/src/modules/alerts-monitoring/alerts-monitoring.md`
   - `backend/tests/modules/alerts-monitoring/alerts-monitoring.service.test.ts`
   - optional only if ownership-sensitive behavior is touched: `backend/tests/modules/alerts-monitoring/alerts-monitoring.ownership.test.ts`

## Forbidden / Split Conditions

Do not mark any new child Ready from this parent packet if it would require shared/high-risk scope:

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- backend or frontend route registries
- shared backend utilities or shared DTO files
- shared frontend components
- package manifests
- generated files or generated types
- Data Quality Engine source or public-export edits
- provider/live-data/startup/backfill behavior
- frontend feature implementation
- broad UX scope
- auth/subscription ownership changes in the same pass

If any of those become necessary, split the work into a blocked child and return it to Team 00 / Architect review.

## QA Hooks For Team 04

Parent QA remains child-driven. The next fresh consumer candidate is `CF-W1-L3-PORT-01B`, but Team 04 should not execute that child until `CF-W1-L3-PORT-01A` acceptance/commit makes the upstream DTO shape available on clean `dev`.

- use `04-qa/CF-W1-L3-PORT-01-qa-plan.md` for portfolio/watchlist DTO children;
- use `04-qa/CF-W1-L3-ALERT-01-qa-plan.md` for alert suppression;
- use `04-qa/CF-W1-L3-DQ-01-qa-plan.md` as the cross-child policy baseline.

Minimum policy assertions across children:

1. consumers use DQ public service outputs only;
2. missing DQ never becomes trusted because price/signal fields exist;
3. `LIMITED` stays passive-only;
4. stale, unsupported, scope-mismatched, provider-gap, `NOT_READY`, and `UNUSABLE` evidence fail closed for trusted/action-like use;
5. no child introduces direct financial advice language.

## Readiness Result

`CF-W1-L3-DQ-01` remains `BLOCKED` for Ready promotion as a parent item.

The architecture split is accepted, and the broad scope can stay module-local only by routing one child at a time. The next gate is not a new parent implementation handoff. The next gate is delegated Product Owner acceptance plus Team 00 staged-scope verification for `CF-W1-L3-PORT-01A`; after that lands on clean `dev`, Team 00 may evaluate `CF-W1-L3-PORT-01B` as the next fresh Lane 3 readiness-consumer Ready candidate.
