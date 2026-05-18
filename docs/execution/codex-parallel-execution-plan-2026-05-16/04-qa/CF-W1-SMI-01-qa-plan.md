# CF-W1-SMI-01 QA Plan

Date: 2026-05-18

Owner: Team 04 QA Factory

Status: Backend-only Smart Money evidence-freshness and partial-trust QA plan prepared. QA-plan ready for Team 00 Ready evaluation as one bounded `smart-money-intelligence` slice. Executable validation remains blocked until Team 00 promotes one exact implementation handoff for the reserved backend files.

Current status refresh: Team 03 prepared the bounded architecture/contract/work-packet set on 2026-05-18. Team 04 aligns this QA plan to the same additive evidence-framing child and does not widen it into frontend trust surfacing, repository edits, schema work, route work, shared utility/UI changes, provider/live-data work, package changes, or generated-file changes.

## Scope

Validation plan for additive Smart Money evidence provenance, freshness, coverage, and partial-trust framing in `CF-W1-SMI-01`.

In-scope surfaces after Team 00 Ready promotion:

- `backend/src/modules/smart-money-intelligence/smart-money-intelligence.service.ts`
- `backend/src/modules/smart-money-intelligence/smart-money-intelligence.types.ts`
- `backend/src/modules/smart-money-intelligence/smart-money-intelligence.md`
- `backend/tests/modules/smart-money-intelligence/smart-money-intelligence.service.test.ts`

Out of scope for this first child:

- repository, controller, router, validation, provider, module, public export, Prisma, migration, generated, or route-registry changes
- frontend Smart Money trust surfacing, feature types, page rendering, or UI smoke
- `market-data-foundation` or `data-quality-engine` source changes
- downstream consumer adoption in Historical Context, Market Context, Signal Calibration, Strategy Decision, Today Review, Portfolio Intelligence, or Copilot
- shared backend utilities, shared UI, packages, provider/live-market integration, startup/backfill, paid/cloud, telemetry, or broker work

This plan does not approve application source edits, tests, builds, services, or Ready movement. It records the QA packet only.

## Required QA Assertions

- Persisted daily snapshot reads expose provenance equivalent to `PERSISTED_SNAPSHOT`.
- On-demand detail fallback exposes provenance equivalent to `ON_DEMAND_DERIVED` and is explicitly `downstreamSafe = false`.
- Persisted-only read paths remain downstream-safe and do not auto-generate Smart Money context when the persisted daily snapshot is missing.
- Ownership placeholder evidence maps to limited/partial trust:
  - ownership trust is partial rather than complete
  - evidence status is limited rather than fully usable
  - missing ownership is not hidden only inside coarse confidence wording
- Stale persisted snapshots are surfaced as stale/limited rather than silently current or silently trusted.
- Insufficient-history fallback maps to unavailable evidence with explicit unavailable coverage/date framing.
- Coverage metadata stays explicit and additive:
  - requested range is echoed
  - persisted snapshot date is visible on persisted reads
  - data-through date is visible with a stable basis equivalent to `SNAPSHOT_DATE`, `LAST_PRICE_BAR_DATE`, or `UNAVAILABLE`
- `top()` and `distribution()` preserve their current ranking/order while adding stable evidence metadata to each row.
- Existing Smart Money summary fields remain backward-compatible, including `smartMoneyScore`, `status`, `confidence`, `explanation`, `updatedAt`, `dataStatus`, `range`, `signals`, `insiderOwnership`, and `researchUrl`.
- Research-support wording remains intact:
  - allow `confirmation context`, `evidence`, `partial trust`, `current`, `stale`, `limited`, `unavailable`, and `reason summary`
  - reject direct advice, target-price, guaranteed, broker, or automation wording
- QA must reject the packet if implementation requires frontend trust surfacing, repository edits, schema/migration/generated work, route changes, shared utility/UI work, provider/live-data work, package changes, or downstream consumer rewrites.

## Scenario Matrix

| Scenario | Expected QA assertion after implementation |
| --- | --- |
| Current persisted snapshot with ownership placeholder | Persisted read returns provenance equivalent to `PERSISTED_SNAPSHOT`, freshness equivalent to `CURRENT`, evidence state `LIMITED`, ownership trust partial, and visible snapshot/range/data-through framing. |
| Current persisted snapshot with complete ownership evidence | Persisted read can map to `USABLE` only when freshness is current and ownership evidence is complete; existing Smart Money summary fields remain unchanged. |
| Stale persisted snapshot | Persisted read returns freshness equivalent to `STALE` and evidence state `LIMITED`; output does not read like current confirmation context. |
| Missing persisted snapshot on `latestPersistedStock()` | Result stays a downstream-safe data gap and does not trigger on-demand calculation or persistence as a side effect. |
| Missing persisted snapshot on list path | Persisted-only list/read surfaces remain bounded to persisted rows only; missing rows do not quietly appear as fresh derived results. |
| Missing persisted snapshot on `stock()` detail fallback | Detail read may fall back to derived context, but provenance is equivalent to `ON_DEMAND_DERIVED`, persisted-available-at-request-start is false, and `downstreamSafe = false`. |
| Ownership placeholder on persisted snapshot | Ownership gap is surfaced as partial trust with an explicit ownership-gap reason; it is not labeled complete confirmation. |
| Insufficient history during detail fallback | Evidence state maps to `UNAVAILABLE`, data-through basis maps to `UNAVAILABLE`, and reason summary explains insufficient price history. |
| Persisted coverage framing | Persisted read exposes requested range, snapshot date, data-through date, and data-through basis equivalent to `SNAPSHOT_DATE`. |
| Derived coverage framing | On-demand fallback exposes requested range, data-through date, and data-through basis equivalent to `LAST_PRICE_BAR_DATE`. |
| `top()` ordering preserved | Ranking and order of `top()` results stay unchanged from pre-child behavior; only additive evidence metadata is added per row. |
| `distribution()` ordering preserved | Ordering and bucket semantics of `distribution()` stay unchanged from pre-child behavior; only additive evidence metadata is added per row. |
| Scope drift attempt | Any forbidden-file touch or any frontend/repository/schema/route/shared/provider/package/generated/downstream widening is a QA reject. |

## Focused Command Guidance

Commands below are guidance only. They were not run during this docs-only QA planning task.

Future focused validation after Team 00 Ready promotion and implementation handoff:

```powershell
cd backend
npm.cmd test -- smart-money-intelligence.service.test.ts --runInBand
```

Approval-gated backend build after accepted implementation and memory/resource checks:

```powershell
cd backend
npm.cmd run build
```

Optional product-language scan after reserved implementation exists:

```powershell
rg -n "buy now|sell now|must buy|must sell|price target|profit target|guaranteed|broker|automation" backend/src/modules/smart-money-intelligence backend/tests/modules/smart-money-intelligence
```

## Skipped / Forbidden Checks

Skipped in this planning pass:

- all executable tests
- backend/frontend builds
- local servers, services, provider checks, and UI smoke

Forbidden by default for this slice:

- frontend Smart Money page or feature changes as a backdoor for trust surfacing
- repository/controller/router/validation/provider/module/index widening
- downstream consumer changes in Historical Context, Market Context, Signal Calibration, Strategy Decision, Today Review, Portfolio Intelligence, or Copilot
- Market Data or DQE source/test edits as a backdoor for evidence framing
- Prisma generate, migrate, db push, db execute, or any schema/data mutation
- provider/live-market, paid/cloud, telemetry, broker, startup/backfill, or broad backend suites

## Stop Conditions

Stop QA and return to Team 00 / Architect if:

- implementation expands beyond the reserved `smart-money-intelligence` service/types/doc/test files
- implementation touches repository, controller, router, validation, provider, module, index, backend route registries, or frontend files
- implementation requires Prisma/schema/generated changes or exact persisted candle-date durability work
- implementation requires Market Data source, DQE source, shared utility/UI, package, or downstream module edits
- implementation changes Smart Money scoring math or rewrites current scoring heuristics instead of adding bounded evidence framing
- implementation widens into provider/live-data integration, startup/backfill behavior, or user-facing frontend trust rendering

## Evidence Required Later

- Exact implementation handoff limited to the reserved `smart-money-intelligence` backend files
- Scenario evidence for persisted-current, persisted-stale, missing persisted snapshot, on-demand fallback, ownership placeholder, and insufficient-history cases
- Proof that persisted-only reads stay downstream-safe and do not auto-generate Smart Money context
- Proof that `top()` and `distribution()` preserve ranking/order while adding evidence metadata
- Proof that existing Smart Money summary fields remain present and backward-compatible
- Focused service-test output only after approval
- Build output only after approval
- Explicit note that no frontend trust surfacing, repository, schema, route, shared utility/UI, provider, package, generated-file, or downstream consumer work occurred
