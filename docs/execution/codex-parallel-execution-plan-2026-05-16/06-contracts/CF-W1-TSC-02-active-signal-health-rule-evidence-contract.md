# CF-W1-TSC-02 Active Signal Health Rule Evidence Contract

Date: 2026-05-24

Owner: Team 03 - Solution Architect Factory

## Status

Draft architecture contract. Not Ready for Implementation.

This contract is prepared as a follow-on to `CF-W1-TSC-01A-TREV`; it must not be promoted until Today Review has accepted source-proven Trusted Signal Candidate adoption.

## Purpose

Define an additive active-signal health projection for Trusted Signal Candidates so Today Review can explain whether a candidate is still active, healthy, weakening, warning, exit-triggered, invalidated, expired, or blocked.

The projection is research-support only. It must not become a Trade Plan workflow, target-price workflow, R:R workflow, direct-action workflow, broker workflow, or automated trade instruction.

## Scope

Bounded first child:

- Today Review read-path health projection
- Today Review candidate row and detail rendering only
- no new persistence
- no route changes
- no shared UI
- no upstream source changes

Out of scope:

- new active monitor page
- durable health history
- Prisma/schema/migration work
- route registry work
- Signal Generation, Data Quality, Strategy, Signal Quality, Market Data, Backtesting, Trade Plan, Alerts, Portfolio, Watchlist, Copilot, or Research Hub source changes
- provider/live-data, startup/backfill, paid/cloud, broker, telemetry, or credentials

## Additive Health Fields

The first child should add fields equivalent to:

```ts
type TrustedSignalHealthState =
  | 'ACTIVE'
  | 'HEALTHY'
  | 'WEAKENING'
  | 'RISK_WARNING'
  | 'EXIT_TRIGGERED'
  | 'INVALIDATED'
  | 'EXPIRED'
  | 'BLOCKED';

type TrustedSignalHealthEvidenceStatus =
  | 'SOURCE_PROVEN'
  | 'PARTIAL'
  | 'MISSING_RULE_EVIDENCE'
  | 'UNSUPPORTED'
  | 'DATA_QUALITY_BLOCKED';

interface TrustedSignalHealthProjection {
  state: TrustedSignalHealthState;
  evidenceStatus: TrustedSignalHealthEvidenceStatus;
  summary: string;
  reasonCodes: string[];
  evidenceDate: string | null;
  sourceModule: string;
  strategyCode: string | null;
  strategyVersion: string | null;
  ruleId: string | null;
  ruleVersion: string | null;
  missingEvidenceReasons: string[];
}
```

Exact names may differ, but the semantics must remain additive and backward-compatible.

## Evidence Inputs

Allowed first-slice inputs:

- accepted `TSC-01A-TREV` Trusted Signal Candidate snapshots;
- source-proven Signal Generation trigger evidence stored or projected through `sourceSignalSnapshot`;
- existing Data Quality snapshot fields and accepted DQ residual summary fields when present;
- accepted strategy/rule/version metadata already in Today Review candidate snapshots;
- accepted exit or invalidation evidence only when source-proven and rule-backed.

Forbidden evidence inputs:

- arbitrary target prices;
- synthetic profit targets;
- R:R or reward/risk ratios;
- Trade Plan target or stop geometry;
- price movement alone;
- direct buy/sell wording;
- newly inferred rule evidence not owned by the source module.

## State Rules

- `BLOCKED`
  - Data Quality is blocked, missing, unsupported, stale-hard-blocked, scope-mismatched, or not trusted for the candidate; or
  - required source-proven entry evidence from `TSC-01A` is missing.
- `ACTIVE`
  - accepted entry evidence exists, but no rule-backed stronger health, weakening, risk, exit, invalidation, expiry, or block is proven.
- `HEALTHY`
  - documented rule/version evidence proves the candidate remains valid.
- `WEAKENING`
  - documented rule/version evidence proves weakening.
- `RISK_WARNING`
  - documented risk, DQ, or accepted module-owned warning evidence proves a warning.
- `EXIT_TRIGGERED`
  - documented exit rule evidence proves an exit trigger.
- `INVALIDATED`
  - documented invalidation rule evidence proves invalidation.
- `EXPIRED`
  - documented expiry rule evidence proves expiry.

Missing proof must produce `ACTIVE` with missing-evidence reasons or `BLOCKED` if the missing evidence is a hard requirement. Do not invent `HEALTHY`, `WEAKENING`, `RISK_WARNING`, `EXIT_TRIGGERED`, `INVALIDATED`, or `EXPIRED`.

## Display Rules

- Candidate list and detail surfaces must show the same health state and summary for the same candidate.
- Missing rule evidence must be visible.
- Data Quality blockers must be visible and must prevent trusted health.
- Exit and invalidation labels must remain missing or unsupported unless documented rule evidence proves them.
- Touched surfaces must avoid target-price, profit-target, R:R, reward/risk, buy/sell, guarantee, and direct-action wording.

## Compatibility Rules

- Existing Today Review candidate fields remain valid.
- Existing snapshots remain readable.
- Older candidates without health evidence should render as conservative `ACTIVE` or `BLOCKED` with missing-evidence reasons, not crash.
- No persisted columns are required in the first child.
- No route response must become breaking; fields are additive.

## Stop Conditions

Stop and split the child if truthful behavior requires:

- Prisma/schema/migration changes;
- Today Review repository/controller/router/validation/module/index edits;
- backend or frontend route registry edits;
- shared UI or shared backend utility edits;
- upstream module source edits;
- package or generated-file changes;
- provider/live-data, startup/backfill, paid/cloud, broker, telemetry, or credential work;
- target/R:R/Trade Plan source-of-truth semantics.

## One-Writer Rule

This contract reserves one future writer across the Today Review backend/frontend file set after `CF-W1-TSC-01A-TREV` is accepted. No parallel Today Review writer is allowed.

## Readiness Note

As of 2026-05-24, the contract is bounded but blocked from Ready. Required next gates are accepted `CF-W1-TSC-01A-TREV`, Team 04 QA planning for `CF-W1-TSC-02`, and Team 00 stacked Ready evaluation.
