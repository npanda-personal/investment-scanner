# Decision Needed

Decide the Market Data historical-price validation policy for future-dated candles, adjusted close, suspicious volume, and spike handling before `CF-W1-MD-01` source or test work starts.

# Context

Team 05 reviewed the current Market Data validation path and QA plan. Current validation already rejects malformed OHLC rows and negative volume, partitions duplicate provider rows, and supports opt-in spike rejection. It does not yet have an accepted policy for future-dated candles, `adjustedClose`, suspicious volume, or corporate-action-safe spike handling.

Without this policy, executable tests would either preserve ambiguous current behavior or fail against unapproved product semantics.

# Affected Workstream

Workstream: `CF-W1-MD-01` Market Data validation hardening.

Module: `market-data-foundation`.

Lane: Lane 1 - Market Data / Data Quality.

# Affected Files

Future source/test work may affect only after approval:

- `backend/src/modules/market-data-foundation/market-data-foundation.validation.ts`
- `backend/tests/modules/market-data-foundation/market-data.validation.test.ts`
- optional focused Market Data readiness tests if the accepted policy affects readiness evidence

No implementation file is approved by this decision packet.

# Evidence Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-MD-01-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-MD-01-market-data-validation-hardening-policy-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/TEAM-05-market-data-data-quality-domain-audit-2026-05-17.md`
- `backend/src/modules/market-data-foundation/market-data-foundation.validation.ts`
- `backend/tests/modules/market-data-foundation/market-data.validation.test.ts`

# Options

Option A: Conservative validation with corporate-action-safe spike handling.

- Reject future-dated candles relative to accepted evaluation or latest-completed market session date.
- Reject `adjustedClose` when present but non-finite, zero, negative, or outside accepted policy bounds.
- Permit missing `adjustedClose` as explicit fallback evidence, not as a trusted completeness claim.
- Keep negative volume invalid.
- Treat zero or suspicious volume as warning/readiness evidence unless a future asset-class-specific policy makes it invalid.
- Keep spike rejection opt-in until durable corporate-action evidence and source context can distinguish bad provider rows from legitimate corporate actions.

Option B: Strict rejection.

- Reject future-dated candles.
- Reject invalid or missing `adjustedClose`.
- Reject zero or suspicious volume for `IN/STOCK`.
- Enable spike rejection by default with only explicit corporate-action exceptions.

Option C: Quarantine-only evidence.

- Do not reject future-dated, adjusted-close, suspicious-volume, or spike rows in validation.
- Mark them only as untrusted evidence for downstream Data Quality to interpret later.

# Codex Recommendation

Choose Option A.

It prevents the clearest bad rows from entering trusted validation while avoiding false data loss from legitimate corporate actions or providers that do not supply adjusted close. It also keeps the future durable-readiness-evidence work in `CF-W1-MD-02` separate from this focused validation hardening slice.

# Risk If Approved

Future source work must be careful not to overclaim durable evidence before `CF-W1-MD-02` is implemented. Some suspicious-volume or spike cases will remain warning/readiness evidence rather than invalid rows until stronger source context exists.

# Risk If Rejected

`CF-W1-MD-01` remains blocked. Future-date, adjusted-close, suspicious-volume, and spike behavior stays ambiguous, and tests cannot safely prove accepted validation semantics.

# Impact On Parallel Work

Unrelated docs-only prep can continue.

`CF-W1-MD-02` ADR work can continue independently.

No Market Data source/test work should start for `CF-W1-MD-01` until this decision is resolved and a bounded work packet is promoted to Ready.

# Exact Consent Needed

Product Owner + Architect + QA:

Approve Option A, B, or C as the validation policy for `CF-W1-MD-01`, including whether missing `adjustedClose`, zero/suspicious volume, and price spikes should be invalid rows, warning/readiness evidence, or quarantine-only evidence.

# Safe Next Step If No Decision Yet

Keep `CF-W1-MD-01` in policy/refinement only.

Do not edit Market Data source, tests, Prisma schema, routes, shared utilities, providers, scheduler/startup, repair/backfill, frontend, package files, generated files, or live-provider paths.
