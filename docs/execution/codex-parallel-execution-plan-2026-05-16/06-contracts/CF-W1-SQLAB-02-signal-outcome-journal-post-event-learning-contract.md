# CF-W1-SQLAB-02 Signal Outcome Journal and Post-Event Learning Contract

Date: 2026-05-18

Owner: Team 03 Architecture Factory

## Status

Split contract prepared. Not Ready for durable implementation.

This contract intentionally covers the no-schema first slice only. It does not authorize durable journal persistence.

## Contract Intent

Signal Quality Lab should expose a research-support post-event learning preview for measured signals without pretending that the preview is already a durable stored journal.

The module remains a research-support surface. It must not present derived lessons as direct advice, target prices, or automated trade instructions.

## Required Source Boundary

Implementation must stay inside `signal-quality-lab` service/types/docs/tests plus the module-owned frontend types/page/UI smoke test.

Allowed direction:

- derive additive journal-preview metadata from existing `SignalOutcomeSet` measurement output;
- render that metadata inside the existing instrument-history workflow;
- mark the preview explicitly as not persisted.

Forbidden:

- Prisma/schema, migrations, repository, controller, router, validation, or new route behavior;
- any write path for note entry, note editing, or journal persistence;
- reuse of `SignalResult`, `SignalCalibrationResult`, `TodayReviewRun`, or any other foreign module persistence surface for journal storage;
- signal scoring, calibration math, strategy-rule, or Data Quality source/export changes;
- shared utility/UI, package, generated, provider, startup, live-provider, paid/cloud, telemetry, or broker scope.

## Required Journal Preview Metadata

Add additive metadata equivalent to:

```ts
type SignalOutcomeJournalStatus =
  | 'EVALUATED'
  | 'INSUFFICIENT_FUTURE_DATA'
  | 'MISSING_PRICE_HISTORY';

type SignalOutcomeJournalLessonLabel =
  | 'FAVORABLE_FOLLOW_THROUGH'
  | 'ADVERSE_FOLLOW_THROUGH'
  | 'FLAT_FOLLOW_THROUGH'
  | 'PENDING_FUTURE_DATA'
  | 'MISSING_PRICE_HISTORY';

interface SignalOutcomeJournalPreview {
  scopeType: 'SIGNAL_RESULT_HORIZON';
  status: SignalOutcomeJournalStatus;
  lessonLabel: SignalOutcomeJournalLessonLabel;
  lessonSummary: string;
  persistenceStatus: 'DERIVED_NOT_PERSISTED';
}
```

The exact type name may differ, but the semantics must stay stable.

## Required Mapping Rules

- When the selected-horizon outcome is available:
  - map to `EVALUATED`;
  - map to `FAVORABLE_FOLLOW_THROUGH` when the measured return aligns with the original signal direction;
  - map to `ADVERSE_FOLLOW_THROUGH` when the measured return contradicts the original signal direction;
  - map to `FLAT_FOLLOW_THROUGH` when the measured return is effectively flat and should not be described as confirmed or contradicted.
- When price history exists but the selected horizon is not mature:
  - map to `INSUFFICIENT_FUTURE_DATA`;
  - map to `PENDING_FUTURE_DATA`;
  - explain that more trading rows are required before learning can be measured.
- When usable local price history is missing:
  - map to `MISSING_PRICE_HISTORY`;
  - map to `MISSING_PRICE_HISTORY`;
  - explain that the module cannot measure the learning outcome from current local data.

## Additive Compatibility Rule

- Existing `outcomes`, `evaluationDiagnostics`, `horizonAvailability`, `recommendedAction`, and current instrument-history fields stay backward-compatible.
- The new journal preview is additive and must not remove or rename current fields.
- The preview must not claim persistence. `persistenceStatus` or equivalent copy must remain explicit.

## Required UI Contract

- The instrument-history view may show one additive preview row or inline column per signal-result and selected horizon.
- UI copy must clearly separate:
  - measured follow-through;
  - pending future-data cases;
  - missing-history cases;
  - derived-not-persisted status.
- The first slice must stay inside the existing `Signal Quality Lab` page. No route, nav, or shared component changes are allowed.

## Forbidden Behavior

- Do not call the no-schema slice a durable journal.
- Do not add editable lesson notes, save actions, or implied persistence.
- Do not repurpose `SignalResult.explanation`, `scoringInputSummary`, or `dataQualityEligibilitySnapshot` as journal storage.
- Do not widen the first slice into calibration, Today Review, alerting, backtesting, or strategy-decision follow-up behavior.

## Durable Blocker

The full parent requirement still needs a future approved storage packet because:

- `signal-quality-lab` owns no persisted row today;
- there is no existing journal table or module-owned JSON surface to extend;
- using another module's persisted row would violate module ownership and make future migration riskier.

## Test Contract

Focused tests must prove:

- favorable follow-through preview for aligned bullish or bearish outcomes;
- adverse follow-through preview for contradicted outcomes;
- flat follow-through preview without advice language;
- pending future-data preview for insufficient selected-horizon rows;
- missing-history preview for absent local price data;
- explicit not-persisted UI copy;
- additive compatibility of current payloads and page behavior.
