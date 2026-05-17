# CF-W1-MD-01 QA Plan

Date: 2026-05-17

Owner: Team 04 QA Factory

Status: QA planning only. Market Data validation hardening remains blocked from executable validation until Option A is reflected in a refreshed validation-only implementation handoff.

Current status refresh: Product Owner approved Option A on 2026-05-18. `CF-W1-MD-01` remains docs-only and QA-blocked for execution until Team 05/03/04 refresh exact validation-only file reservations and Team 00 promotes a handoff.

## Scope

Validation plan for Market Data Foundation historical price validation hardening.

Target policy areas:

- future-dated candles,
- invalid or missing `adjustedClose` behavior,
- invalid OHLC shape and finite-number checks,
- negative or suspicious volume,
- duplicate provider rows in the same batch,
- suspicious price spikes and corporate-action-safe spike policy.

This plan does not approve application source edits, test edits, Prisma changes, routes, shared utilities/UI, packages, generated files, providers, services, startup/backfill, UI implementation, builds, broad suites, or live data checks.

## Approved Policy

Product Owner approved:

- reject future-dated candles relative to accepted evaluation date or latest completed market session date;
- reject `adjustedClose` when present but non-finite, zero, negative, or outside accepted policy bounds;
- allow missing `adjustedClose` only as fallback/incomplete evidence, not trusted completeness;
- keep negative volume invalid;
- treat zero or suspicious volume as warning/readiness evidence unless a later asset-class policy marks it invalid;
- keep spike rejection opt-in until durable corporate-action evidence and source context exist.

Durable readiness evidence remains separate under `CF-W1-MD-02`.

## Required QA Assertions

- Future-dated candles cannot silently enter trusted Market Data or downstream readiness paths.
- Existing OHLC checks remain fail-closed for missing symbol, invalid date, non-finite prices, non-positive OHLC prices, `low > high`, and open/close outside low/high.
- `adjustedClose`, when present, must be finite and greater than zero unless the accepted policy says otherwise.
- Missing `adjustedClose` behavior is explicit and covered by tests rather than inferred from duplicate-row scoring.
- Negative volume remains invalid.
- Suspicious zero or extreme volume is covered according to the accepted policy and does not create a trusted downstream signal by default.
- Duplicate batch rows remain detected and the selected retained row is deterministic.
- Suspicious price spikes are covered by explicit tests that do not erase legitimate corporate-action history without accepted policy.
- Validation output remains explainable, with reason strings suitable for later Data Quality readiness evidence.
- No provider, Angel One, startup/backfill, Prisma mutation, paid/cloud, broker, or live-service path is required for this validation slice.

## Scenario Matrix

| Scenario | Expected future assertion after policy acceptance |
| --- | --- |
| Candle date is after the evaluation date or latest completed market session | Rejected or marked untrusted; cannot be counted as ready evidence. |
| `adjustedClose` is `NaN`, infinite, zero, negative, or outside low/high when policy requires range validation | Invalid row with explicit reason. |
| `adjustedClose` is missing | Accepted only if policy permits missing adjusted close; otherwise invalid or warning evidence. |
| OHLC has non-finite values, non-positive prices, `low > high`, or open/close outside range | Invalid row with existing reason coverage preserved. |
| Volume is negative | Invalid row. |
| Volume is zero or suspiciously extreme for `IN/STOCK` | Warning or invalid according to accepted policy; never silently trusted for downstream action-like workflows. |
| Duplicate provider rows share symbol/date | One deterministic valid row retained; duplicates recorded as invalid evidence. |
| Large one-day price move with spike rejection enabled | Invalid only when above accepted threshold and no corporate-action exception applies. |
| Large one-day price move with spike rejection disabled or policy-warning mode | Retained with explicit policy evidence; downstream DQ decides trust. |

## Focused Command Guidance

Commands below are guidance only. They were not run during this docs-only QA planning task.

Future focused validation after policy acceptance and implementation handoff:

```powershell
cd backend
npm.cmd test -- market-data.validation.test.ts --runInBand
```

Focused regression if duplicate/readiness evidence or repository behavior is touched:

```powershell
cd backend
npm.cmd test -- market-data.validation.test.ts market-data-readiness-evidence.invariants.test.ts market-data.repository.test.ts --runInBand
```

Approval-gated backend build after accepted implementation, Team 00 validation approval, and memory/resource check:

```powershell
cd backend
npm.cmd run build
```

## Unsafe Or Broad Commands Excluded

Do not run by default:

- broad backend suites such as `npm.cmd test` with no file filters,
- Playwright or UI smoke tests,
- dev servers, live services, or provider services,
- startup, scheduler, repair, sync, import, or backfill flows,
- Prisma generate, migrate, db push, db execute, or any schema/data mutation,
- provider tests unless explicitly mocked and approved,
- Angel One or live provider checks,
- paid/cloud, telemetry, broker, or real-money flows.

## Stop Conditions

Stop QA and return to Product Owner/Architect if:

- implementation asks for behavior outside the approved Option A validation policy,
- implementation wants to change OHLC storage, Prisma schema, route registry, packages, provider behavior, scheduler/startup behavior, or shared utilities,
- validation requires live provider data or generated provider credentials,
- tests would preserve ambiguous behavior rather than proving accepted policy,
- command scope broadens beyond focused backend Jest patterns.

## Evidence Required Later

- Accepted validation policy reference.
- Exact implementation handoff with changed files.
- Scenario matrix result for future-date, adjusted-close, volume, duplicate, OHLC, and spike cases.
- Focused command output only after approval.
- Confirmation no providers, services, startup/backfill, Prisma mutation, UI implementation, broad suites, Angel One, paid/cloud, broker, or live data checks were used.
- Skipped checks with reason and next owner.
