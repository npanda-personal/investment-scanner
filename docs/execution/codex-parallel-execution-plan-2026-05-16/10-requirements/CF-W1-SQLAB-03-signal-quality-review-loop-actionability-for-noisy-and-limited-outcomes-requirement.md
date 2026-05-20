# CF-W1-SQLAB-03 - Signal Quality Review-Loop Actionability for Noisy and Limited Outcomes Requirement

Date: 2026-05-20

## Status

Audit-derived requirement draft. Not Ready for Implementation.

## Product Value

Signal Quality Lab already tells the user when outcomes are noisy, low confidence, or unavailable, but the surface still stops at diagnostics. Review users need a compact action-oriented follow-up so they know whether to rerun with more data, check a shorter horizon, ignore the signal, or treat the outcome as too limited for judgment.

## Evidence

- `backend/src/modules/signal-quality-lab/signal-quality-lab.md` says outcomes are on demand in the MVP and `evidenceUsability` can be `UNAVAILABLE`.
- The same docs show the dashboard and grouped views already surface zero-sample and noisy-signal explanations, but there is no outcome persistence table yet.
- The Team 01 audit found the module already flags noisy and low-confidence cases, but does not turn them into a compact review-oriented follow-up surface.
- `backend/src/modules/signal-generation-engine/signal-generation-engine.md` and `backend/src/modules/signal-calibration-engine/signal-calibration-engine.md` both consume Signal Quality outputs, so the review wording must stay research-supportive and not become advice.

## Dependencies

- Keep the first child read/review oriented and additive.
- Do not add outcome persistence, schema, journal routes, or learning-memory storage in the first child.
- Do not duplicate signal generation, calibration, or trade-plan logic.
- Do not add schema, route-registry, shared UI, provider/live, backfill, broker, or telemetry work.

## Bounded Requirement

Define an additive review-loop contract that turns noisy or limited outcomes into a clear next-step surface.

The first child should focus on:

- compact action labels for noisy, low-confidence, unavailable, and limited-evidence outcomes;
- stable follow-up wording such as rerun, narrow horizon, check data, or treat as insufficient evidence;
- explicit reason text for why the current outcome is not trustworthy enough for review;
- no durable journal memory or persisted learning loop yet;
- research-support copy that stays away from direct advice language.

## Acceptance Criteria

- Noisy, limited, and unavailable outcomes produce a clear review-oriented next step.
- The user can see why the outcome is not strong enough for a confident judgment.
- Existing outcome calculations, horizon logic, and grouped diagnostics remain unchanged.
- The surface stays research-supportive and does not imply a trade instruction.
- Focused tests cover noisy, limited, unavailable, and low-confidence outcome states.

## Non-Goals

- No outcome persistence table.
- No journal routes or durable learning memory.
- No schema, route registry, shared UI, provider/live, broker, or telemetry work.
- No direct advice or target-language copy.

## Next Gate

Architecture contract and QA plan for a bounded Signal Quality review-loop slice, with later implementation reserved to the signal-quality-lab module only.
