# TEAM-02 Requirement Factory Outbox - 2026-05-17

Mode: read-only requirement refinement.

Files changed: none.

Tests, services, providers, staging, and commits: none.

## Queue Finding

Requirement queues need a freshness pass. The current accepted slices are:

- `CF-W2-DQ-01`
- `CF-W2-SIG-01A`
- `CF-W1-SIG-01B`
- `CF-W1-SIG-LATEST-01`
- Bounded `CF-W1-STRAT-01`

Older queue entries must not cause implementation teams to pull completed or stale forms of these requirements.

## Proposed Next Top 10

1. `CF-W1-QA-01` - focused test command matrix, docs-only.
2. `CF-W1-TP-01A` - Trade Plan no-target / exit-invalidation contract, docs-only.
3. `CF-W1-L3-DQ-01` - Lane 3 readiness consumer policy contract.
4. `CF-W1-L3-AUTH-01` - portfolio/watchlist child ownership contract and tests.
5. `CF-W1-L3-AUTH-02` - alert event ownership contract.
6. `CF-W1-L3-ALERT-01` - alert readiness suppression tests after Lane 3 contract.
7. `CF-W1-UX-02` - copilot/research trust UX contract.
8. `CF-W1-UX-05` - research-support copy pass contract.
9. `CF-W1-MD-02` - durable Market Data readiness evidence ADR.
10. `CF-W1-SIG-TRIGGER-01` - full trigger object contract completion.

## Ready Item

`CF-W1-QA-01` is ready as documentation-only work:

- Create a focused command matrix.
- Do not edit source or tests.
- Do not run tests.
- Do not change packages.

## Requirement Split Recommendations

Split the overloaded Trade Plan item:

- `CF-W1-TP-01A`: Trade Plan target-semantics contract, docs-only.
- `CF-W1-TP-01B`: Trade Plan DQ hard blockers, blocked by upstream contract.
- `CF-W1-TP-02`: Trade Plan target geometry implementation, blocked by decision/shared-file risk.

Create `CF-W1-L3-DQ-01` as the Lane 3 parent requirement before alert, portfolio, watchlist, or copilot readiness implementation.
