# CF-W1-DQ-02B DQ Currentness Public Read-Path Contract

Date: 2026-05-24

Owner: Team 03 Architecture Factory

## Status

Blocked contract. No no-schema/no-shared `CF-W1-DQ-02B` implementation packet is authorized from this contract.

## Contract Intent

Freeze the residual parent decision after accepted `CF-W1-DQ-02A`.

The remaining contract gap is not evaluation-time classification. It is consistent public/read-path exposure of DQ currentness on persisted trust surfaces while keeping:

- Data Quality Engine as readiness evaluator;
- Market Data Foundation as owner of durable market/session evidence;
- downstream modules free of duplicated DQ logic.

## What This Contract Rejects

This contract explicitly rejects any `DQ-02B` child that claims investor/trader value while staying inside:

- service-only DQE edits,
- no repository/read-side edits,
- no route response widening,
- no schema/storage consent,
- no shared contract reservation.

Reason: that child would either duplicate accepted `DQ-02A`, selectively recompute currentness on some endpoints only, or infer public semantics from blocker strings that are too lossy for a trustworthy read-path contract.

## Residual Public Contract Gap

The unresolved gap lives on persisted DQE outputs:

- `summary()`
- `list()`
- `diagnostics()` when a persisted row exists
- helper read paths used by downstream eligibility consumers

These surfaces currently expose blocker/gap arrays and scores, not a durable or consistently reconstructed currentness object with session-aware meaning.

## Required Ownership Boundary

- Market Data Foundation owns session timing and durable upstream evidence.
- Data Quality Engine owns evaluation policy, fail-closed readiness, and any additive currentness projection it exposes.
- Downstream consumers must not reconstruct freshness/session logic on their own.

## Required Reopen Gate

If Team 00 intentionally reopens `CF-W1-DQ-02`, the packet must be framed as:

`DQ currentness persisted read-side/public-contract exposure`

Minimum writer reservation:

- `backend/src/modules/data-quality-engine/data-quality-engine.repository.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.service.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.types.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.md`
- focused DQE repository/service tests

Conditional reservation:

- controller/route response tests if additive `summary`, `list`, or `diagnostics` payload semantics are approved;
- Prisma/schema path only if durable stored currentness dates/reason codes are required.

## Required Future Semantics After Consent

Any reopened packet must ensure that persisted DQ read paths expose consistent semantics equivalent to:

- currentness status
- reason code
- latest observed trading date
- latest completed trading date where known
- plain-language reason
- fail-closed downstream impact

The exact field names may differ. The semantics may not.

## Non-Goals Under Current Contract

- No fresh `DQ-02B` implementation from `dev`
- No service-only workaround
- No Market Data Foundation source edits
- No downstream duplication of DQ/session logic
- No fake Ready movement

## QA Contract Notes

QA should reject any reopened `DQ-02B` implementation that:

- touches only DQE service/types and claims public read-path completion;
- exposes currentness on `diagnostics` but not `summary`/`list`;
- reconstructs currentness from stale blocker strings without a clearly documented public contract;
- silently widens into schema, routes, generated files, or shared utilities.

## Current Contract Result

Blocked pending Team 00 consent for a DQE read-side/public-contract packet.
