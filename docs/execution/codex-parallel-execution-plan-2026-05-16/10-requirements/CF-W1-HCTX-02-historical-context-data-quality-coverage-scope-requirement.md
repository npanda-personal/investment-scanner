# CF-W1-HCTX-02 - Historical Context Data-Quality Coverage Scope Requirement

Date: 2026-05-19

## Status

Audit-derived requirement. Not Ready for Implementation.

## Product Value

Historical context coverage is only trustworthy if the scope of the data-quality counts is explicit. The current historical-context layer counts `dataQualitySnapshot` rows globally even though the rows are keyed by instrument and date, so a scoped lookup can look more complete than it really is. That weakens trust in downstream calibration and research workflows that depend on historical context completeness.

## Evidence

- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.repository.ts` uses `dataQualitySnapshot.count()` inside `coverage(...)` without `region` or `assetType` filtering.
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.md` already says data-quality snapshot rows are keyed by instrument and date, and that coverage counts are global until the model gains a stock relation or persisted scope fields.
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.types.ts` exposes `SnapshotCoverage.dataQualitySnapshots` but does not distinguish global coverage from scope-proven coverage.
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.service.ts` returns the raw count directly, so downstream consumers cannot tell whether the count is global or instrument-scoped.
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.md` depends on historical-context snapshots for regime and adjustment evidence, so misleading coverage scope can weaken calibration trust.
- `CF-W1-HCTX-01` already covers selected-snapshot provenance; the remaining gap is specifically the meaning of the data-quality coverage number.

## Dependencies

- Keep the first child additive and module-local to `historical-context-snapshots`.
- Do not duplicate Data Quality scoring logic or invent a new coverage model.
- Reuse existing coverage counts and surface when those counts are only global.
- Any future schema relation or persisted scope-field work stays out of the first child.

## Bounded Requirement

Define a bounded coverage-scope provenance contract so historical-context coverage cannot overstate data-quality completeness.

The first child slice should focus on:

- additive coverage scope for `dataQualitySnapshots`, with a stable label for global, instrument-scoped, or unavailable cases;
- keeping the current raw count for backward compatibility;
- a stable warning or reason string when the count is only global coverage;
- honest downstream consumption by calibration and other historical-context readers;
- no schema, route, provider, or cross-module rewrite in the first child.

## Acceptance Criteria

- Coverage responses clearly label data-quality snapshot coverage scope.
- Users can tell when the count is global-only versus scope-proven.
- Global counts are never represented as instrument-scoped completeness.
- Existing coverage counts and lookup behavior remain backward-compatible.
- Focused tests cover global-only, scope-proven, and unavailable coverage-scope states.

## Non-Goals

- No schema, migration, route, or provider work.
- No new data-quality scoring.
- No duplicate downstream trust logic.

## Future Candidate Files After Ready Promotion

- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.service.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.types.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.md`
- `backend/tests/modules/historical-context-snapshots/historical-context-snapshots.service.test.ts`

## Next Gate

Route to Team 03 for a bounded historical-context coverage-scope contract, then Team 04 QA planning. Stop and split if the first child needs schema, route, provider, or cross-module trust-logic changes.
