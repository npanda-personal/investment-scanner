# CF-W1-SIG-TRIGGER-ENTRY-01 QA Evidence

Date: 2026-05-24

Owner: Team 04 - QA Factory

Status: Verification In Progress

## Scope Verified By Team 00 Developer Validation

Changed files:

- `backend/src/modules/signal-generation-engine/signal-generation-engine.types.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.service.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.md`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.trigger-contract.test.ts`

## Commands Run

```powershell
cd backend
npm.cmd test -- signal-generation-engine.trigger-contract.test.ts signal-generation-engine.service.test.ts signal-generation-dq-enforcement.invariants.test.ts --runInBand
npm.cmd test -- signal-generation-engine --runInBand
npm.cmd run build
```

## Result

- Signal Generation focused suite passed after Team 10 rework: 3 suites, 34 tests.
- Broader Signal Generation suite passed after rework: 6 suites, 50 tests.
- Backend TypeScript build passed.

## Covered Assertions

- Trigger contract still marks missing strategy/price/rule evidence unavailable.
- Legacy rows remain incomplete and do not invent Data Quality or trigger evidence.
- Strategy-aware enrichment can expose compatibility-only source-proven trigger-price evidence from the latest local price row when the local row date matches the signal source-price date and Strategy Framework entry rule evidence is present.
- Strategy-aware enrichment downgrades trigger-price evidence when the latest local price-row date does not match the signal source-price date.
- Non-entry Strategy Framework matches cannot emit source-proven entry trigger-price evidence.
- Trigger-price evidence does not include target price, profit target, price target, R:R, direct buy/sell advice, or guarantee wording.
- Existing Signal Generation service and Data Quality enforcement invariants still pass.

## Rework Note

Team 10 rejected the first pass because `SOURCE_PROVEN` could use a signal source-date fallback when the local price row did not itself provide the timestamp. Team 00 fixed the trust-boundary logic so source-proven trigger-price evidence requires the local price row timestamp directly, then added downgrade coverage.

Team 10 rejected the rereview because top-level `trigger_timestamp` could still fall back to persisted signal source dates when strategy-aware trigger evidence was unavailable. Team 00 fixed the projection so strategy-aware trigger timestamp is exposed only from `SOURCE_PROVEN` evidence, then added assertions that mismatch and non-entry downgrade cases keep `trigger_timestamp` unavailable.

## Remaining Gate

Separate Team 04 QA Verification, Team 10 Code Review, and Team 03 Architect Signoff agents are reviewing the current implementation diff before delegated PO acceptance and scoped commit.
