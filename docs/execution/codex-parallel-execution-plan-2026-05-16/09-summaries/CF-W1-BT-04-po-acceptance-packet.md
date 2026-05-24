# CF-W1-BT-04 - Delegated Product Owner Acceptance

Date: 2026-05-24

Owner: Team 00 - Orchestrator / Integration under standing delegation

Status: ACCEPT

## Work Item

`CF-W1-BT-04 - Backtesting saved-run freshness and current-proof labels`

## Acceptance Basis

This child is accepted because it adds bounded, additive saved-run proof-freshness evidence to Backtesting Strategy Lab without changing simulation math, persistence, route contracts, repository shape, shared UI, packages, generated files, provider/live-data, startup/backfill, paid/cloud, broker, or advice-like product semantics.

Accepted behavior:

- Saved backtesting runs expose additive `currentProof` metadata on the run and metrics payloads.
- List and selected-detail surfaces use the same derivation path for the same saved run.
- Proof-freshness status distinguishes `CURRENT_PROOF`, `STALE_PROOF`, `REPAIRED_HISTORICAL`, `LIMITED_HISTORICAL_PROOF`, and `UNAVAILABLE_PROOF_BASIS`.
- Failed, availability-error, legacy-invalid, repaired, limited, or unavailable evidence cannot become the latest current-proof basis for another run.
- Existing review disposition, proof basis, benchmark/coverage, calculation-audit, and exit-diagnostic evidence remain visible.
- Product copy stays research-support oriented and does not introduce Trade Plan-first, R:R, arbitrary target-price, profit-target, guarantee, or direct buy/sell language.

## Gate Evidence

- Developer handoff: `18-integration-queue/CF-W1-BT-04-developer-handoff.md`
- QA verification: `04-qa/CF-W1-BT-04-qa-verification.md`
- Code review: `18-integration-queue/CF-W1-BT-04-code-review.md`
- Architect signoff: `03-architecture/CF-W1-BT-04-architect-signoff.md`
- Team outboxes:
  - `17-team-outboxes/TEAM-06-CF-W1-BT-04-outbox.md`
  - `17-team-outboxes/TEAM-04-CF-W1-BT-04-qa-outbox.md`
  - `17-team-outboxes/TEAM-10-CF-W1-BT-04-review-outbox.md`
  - `17-team-outboxes/TEAM-03-CF-W1-BT-04-signoff-outbox.md`

## Validation Reviewed

- `npm.cmd test -- backtesting-strategy-lab.service.test.ts --runInBand` passed.
- `npm.cmd run build` passed in backend.
- `npm.cmd run build` passed in frontend, with the existing Vite large-chunk warning.
- Feature-local Playwright smoke passed through Team 00 runtime support on a fresh Vite runtime at `http://127.0.0.1:5224` with `--force`: `4` tests passed in `36.4s`.

## Limitations

- Existing repository `listRuns()` caps comparable-run discovery at the newest `100` rows. Team 03 and Team 10 recorded this as a non-blocking legacy limitation for deep-history direct detail retrieval, outside the approved BT-04 write scope.
- This slice does not claim forward validation, walk-forward proof, or guaranteed future performance.
- This slice does not add durable storage, schema, route, repository, or new backtesting/calibration math.

## Decision

Delegated Product Owner acceptance is `ACCEPT`.

Team 00 may create a scoped local branch commit for this child after staged-scope verification.

No push is authorized by this packet.
