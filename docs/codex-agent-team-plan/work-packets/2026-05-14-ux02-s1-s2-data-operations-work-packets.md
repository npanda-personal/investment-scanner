# UX-02 S1/S2 Data Operations Gate-First Work Packets

Date: 2026-05-14  
Mode: Lead Work Packet Mode  
Work item: `UX-02 - Data Operations Gate-First UX`  
Dependency update: `P0.2B` released at commit `a5c6f26`  
Packet activation scope: **S1/S2 only**

## 1) Scope Decision

This intake activates only:

- `UX-02.S1` Market Data gate header + repair evidence
- `UX-02.S2` shared batch/blocker presentation hardening

This intake does **not** activate:

- `UX-02.S3` Data Quality tier gate surface
- `UX-02.S4` cross-module consistency/final QA

Even with `P0.2B` released, `S3/S4` remain future slices for a separate packet.

## 2) Global Guardrails (Mandatory)

1. Do not edit backend modules, schemas, or API contracts.
2. Do not edit active board docs, GitHub check-in docs, or accepted architecture/QA/PO docs.
3. **Do not edit any Data Quality feature-folder files in S1/S2**, including:
   - `frontend/src/features/data-quality-engine/**`
   - `frontend/tests/ui/data-quality-engine.spec.ts`
4. Preserve Phase-0 policy posture: no broker automation readiness cues, no paid-provider assumptions.

## 3) Single-Writer Ownership and Conflict Rules

## 3.1 Developer owners

- `UX-02.S1` owner: **Dev A (Market Data lane)**
- `UX-02.S2` owner: **Dev B (Shared UI lane)**

Exactly one developer owns writes per slice. No co-editing in the same file during active execution.

## 3.2 Conflict protocol

1. If S2 needs behavior visible in S1 pages, S2 ships shared component changes first behind existing-safe defaults.
2. S1 then consumes those shared changes in Market Data files.
3. If both slices need `frontend/tests/ui/market-data-foundation.spec.ts`, only one writer at a time:
   - S2 writes shared-semantics assertions first.
   - S1 rebases and appends gate-header/repair-evidence assertions second.
4. No cherry-picking Data Quality edits into this packet.

## 4) Slice Packet: UX-02.S1

Status: **Ready**

Objective:
Implement a single gate-first Market Data header and explicit repair/run evidence semantics with bounded-action framing.

Reserved write scope:

- `frontend/src/features/market-data-foundation/components/MarketDataStatusPanel.tsx`
- `frontend/src/features/market-data-foundation/components/MarketDataFoundationPage.tsx`
- `frontend/src/features/market-data-foundation/types.ts`
- `frontend/src/features/market-data-foundation/api/marketDataFoundationService.ts`
- `frontend/tests/ui/market-data-foundation.spec.ts`
- `frontend/tests/ui/market-data-foundation-instrument.spec.ts`

Implementation requirements:

1. Top band renders one downstream gate container (`ALLOWED`/`LIMITED`/`BLOCKED`) before diagnostics.
2. Trust/signoff/date-boundary context remains explicit and not collapsed into optimistic health.
3. Primary bounded next action appears with disabled-state reason when prerequisites fail.
4. Repair evidence surfaces queue/eligibility/manual-required context and latest run delta framing.
5. Partial/manual-required outcomes are visually distinct from success.

Developer validation commands:

- `cd frontend`
- `npm.cmd run test:ui -- market-data-foundation.spec.ts market-data-foundation-instrument.spec.ts --workers=1 --project=chromium --reporter=list`

Acceptance criteria:

1. Gate-first reading order is preserved on `/market-data-foundation`.
2. Disabled actions always include deterministic reason text.
3. Repair evidence indicates “another run needed” vs “drain complete” without false-ready cues.
4. No Data Quality feature-folder edits are present in the S1 change set.

## 5) Slice Packet: UX-02.S2

Status: **Ready**

Objective:
Harden shared batch and blocker presentation semantics used by Market Data in an additive, backward-safe way.

Reserved write scope:

- `frontend/src/shared/components/BatchProgressBar.tsx`
- `frontend/src/shared/components/StatusBadge.tsx` (only if required for semantics)
- `frontend/src/shared/components/DataTable.tsx` (only additive blocker-ordering affordances)
- `frontend/tests/ui/market-data-foundation.spec.ts`

Implementation requirements:

1. Batch progress distinguishes `processed`, `evaluated`, `skipped`, `failed`, `outOfScope` (and `pending` when known).
2. Terminal states are visually distinct: complete, partial completion, error.
3. Blockers remain ordered before warnings/info with stable coded reason visibility.
4. Changes remain additive and must not require backend payload contract changes.

Developer validation commands:

- `cd frontend`
- `npm.cmd run test:ui -- market-data-foundation.spec.ts --workers=1 --project=chromium --reporter=list`

Acceptance criteria:

1. Shared progress presentation no longer collapses operational buckets to a single ambiguous line.
2. Blocker-first ordering is deterministic in Market Data diagnostics surfaces.
3. Existing Market Data flows render without regressions in compact layouts.
4. No Data Quality feature-folder edits are present in the S2 change set.

## 6) QA Handoff Requirements (S1/S2 Packet)

QA handoff must include:

1. One Playwright invocation with `--workers=1` for packet scope specs only.
2. Visual evidence for blocked vs allowed gate header, and partial vs complete repair outcomes.
3. Evidence that disabled actions carry explicit reason text in blocked and in-flight states.
4. Confirmation note: no unbounded repair/backfill execution was triggered during validation.
5. Confirmation note: no Data Quality feature-folder files were modified in this packet.

## 7) Blocked / Future Slices

- `UX-02.S3`: **Not activated in this intake (future packet)**
- `UX-02.S4`: **Not activated in this intake (future packet, after S3)**

Rationale:
This packet is intentionally constrained to S1/S2 execution to reduce overlap and keep Data Quality feature-folder scope unchanged, despite `P0.2B` release.

## 8) Dependency Risks

1. `P0.2B` is released, but accidental cross-slice expansion into Data Quality files remains the primary execution risk.
2. Shared component hardening in S2 can create subtle presentation drift; enforce additive-only edits and focused Market Data regression checks.
3. Dual-slice touch on `market-data-foundation.spec.ts` can cause merge churn; enforce the single-writer sequencing rule in Section 3.2.
