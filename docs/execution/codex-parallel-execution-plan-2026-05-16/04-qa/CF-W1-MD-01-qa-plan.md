# CF-W1-MD-01 QA Plan

Date: 2026-05-18

Owner: Team 04 QA Factory

Status: Narrowed reject-only validator-child QA plan prepared. QA-ready for Team 00 Ready evaluation. Executable validation remains blocked until Team 00 promotes one validation-only implementation handoff.

Current status refresh: Team 03 narrowed the contract/work packet and Team 05 confirmed the same bounded first slice. Team 04 now aligns the QA plan to that exact reject-only child.

## Scope

Validation plan for the narrowed Market Data Foundation reject-only historical-price validator child.

In-scope surfaces after Team 00 Ready promotion:

- `backend/src/modules/market-data-foundation/market-data-foundation.validation.ts`
- `backend/tests/modules/market-data-foundation/market-data.validation.test.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.md`

Required in-scope scenarios only:

- future-dated candle rejection
- invalid `adjustedClose` rejection when `adjustedClose` is present
- negative volume remains invalid
- duplicate-row determinism regression
- spike rejection remains opt-in and off by default

Explicitly deferred from this child:

- missing `adjustedClose` fallback or incomplete-evidence behavior
- zero-volume or suspicious-volume warning/readiness evidence
- repository/provider/startup plumbing for a formal latest-session boundary
- readiness/storage invariant coverage under `CF-W1-MD-02`

This plan does not approve application source edits, Prisma changes, routes, shared utilities/UI, packages, generated files, providers, services, startup/backfill, builds, broad suites, or live data checks.

## Policy Alignment

Decision reference: `07-decisions/DECISION-20260517-market-data-validation-hardening-policy-resolution.md`.

The broader Option A policy allows additional future warning/readiness follow-up. For this first child, Team 04 carries forward only the reject-only subset already preserved in the Team 03 contract/work packet:

- reject future-dated candles within validator-local, backward-compatible boundary behavior
- reject invalid present `adjustedClose` values
- keep negative volume invalid
- preserve duplicate-row determinism
- keep spike rejection opt-in and off by default

## Required QA Assertions

- Future-dated candles are rejected and cannot silently pass through the validator as trusted rows.
- `adjustedClose`, when present, is rejected if it is non-finite, zero, negative, or otherwise out of accepted policy bounds.
- Negative volume remains invalid.
- Duplicate same-row inputs continue to resolve deterministically.
- Spike rejection stays off by default and behaves deterministically only when the opt-in threshold is enabled.
- Existing finite-number, positive-price, low/high, and duplicate-selection behavior remains explainable.
- No repository, provider, scheduler, startup/backfill, Prisma, route, shared utility, frontend, or live-provider path is required for this child.

## Scenario Matrix

| Scenario | Expected assertion after implementation |
| --- | --- |
| Candle date is after the accepted evaluation boundary | Row is rejected with explicit validation failure; it does not remain in the valid partition. |
| `adjustedClose` is present but `NaN`, infinite, zero, negative, or otherwise outside accepted bounds | Row is rejected with explicit validation failure. |
| Volume is negative | Row is rejected; current invalid-volume behavior remains unchanged. |
| Duplicate provider rows share the same symbol/date key | Validator output remains deterministic about which row is retained and which row is marked invalid. |
| Large one-day price move with spike rejection disabled | Row is not rejected by spike logic by default. |
| Large one-day price move with spike rejection enabled | Row is rejected only under the accepted opt-in threshold behavior. |

## Focused Command Guidance

Commands below are guidance only. They were not run during this docs-only QA planning task.

Future focused validation after Team 00 Ready promotion and implementation handoff:

```powershell
cd backend
npm.cmd test -- market-data.validation.test.ts --runInBand
```

Approval-gated backend build after accepted implementation, Team 00 validation approval, and memory/resource check:

```powershell
cd backend
npm.cmd run build
```

## Unsafe Or Broad Commands Excluded

Do not run by default for this narrowed child:

- readiness/storage invariant tests such as `market-data-readiness-evidence.invariants.test.ts`
- repository/provider tests
- broad backend suites with no file filters
- Playwright or UI smoke tests
- dev servers, live services, provider services, startup flows, schedulers, repair/sync/import/backfill jobs
- Prisma generate, migrate, db push, db execute, or any schema/data mutation
- Angel One, live provider, paid/cloud, telemetry, broker, or real-money flows

## Stop Conditions

Stop QA and return to Team 00 / Architect if:

- implementation expands beyond the three reserved validator/test/doc files
- implementation introduces warning/evidence semantics for missing `adjustedClose` or zero/suspicious volume
- validation behavior now requires repository/provider/startup call-site changes
- tests require readiness/storage invariant coverage to pass
- command scope broadens beyond focused backend Jest patterns for the validation child

## Evidence Required Later

- Exact implementation handoff limited to the reserved validator/test/doc file set
- Scenario results for future-date rejection, invalid `adjustedClose`, negative volume, duplicate determinism, and opt-in spike behavior
- Confirmation that missing `adjustedClose` fallback and zero/suspicious-volume evidence stayed deferred
- Focused command output only after approval
- Skipped checks with reason and next owner
