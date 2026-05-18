# Refinement Queue

Date: 2026-05-18

Status: Refreshed by Team 02 after a Strategy Framework durable-history discovery cycle and the Product Owner investor-value priority correction. This queue is refinement-only; Team 00 owns Ready queue movement.

Current dispatch correction on 2026-05-18 after the Strategy Framework durable-history discovery cycle:

- `CF-W1-MCTX-01` is already promoted in `12-ready-queue/ready-for-implementation.md` and should stay out of the next unassigned pull.
- `CF-W1-RH-02A` is in active Team 03 architecture prep and should stay out of the next unassigned pull.
- `CF-W1-MD-03` is queued for Team 03 architecture after `CF-W1-RH-02A` and should stay out of the immediate next unassigned pull.
- `CF-W1-TP-02` is in active implementation/review follow-up and should stay out of the next unassigned pull.
- `CF-W1-SMI-01` is in active Team 04 worktree QA verification and should stay out of the next unassigned pull.
- `CF-W1-RH-01` has a QA plan ready and is pending Team 00 Ready evaluation, so it should stay out of the next unassigned pull.
- `CF-W1-L3-TREV-02` is in active Team 04 QA planning and should stay out of the next unassigned pull.
- `CF-W1-MD-02A` is queued for Team 04 QA review and should stay out of the next unassigned pull.
- `CF-W1-SQLAB-02` and `CF-W1-MD-02` remain high-value parent items but are still sequenced for new bounded routing.
- `CF-W1-STRAT-02` remains parent-only blocked after accepted `CF-W1-STRAT-02A`; the new bounded child is `CF-W1-STRAT-02B`.
- After excluding active, queued, accepted, parked, and blocked items, the next top unassigned requirement is `CF-W1-STRAT-02B`.

## Team 02 Current Priority Override

This section is the latest Team 02 ordering and supersedes older ranking text below where they conflict.

Current ordering is based on two filters:

1. direct investor/trader value first;
2. independence from Team 06's active `CF-W1-SIG-TRIGGER-02A` implementation files.

### Current Top Parallel-Safe Docs-Only Prep Stack

| Rank | ID | Why it is ahead now | Team 00 routing note |
| --- | --- | --- | --- |
| 1 | `CF-W1-STRAT-02B` | Strategy Framework now has a bounded durable-history child with direct investor-value provenance impact, and it is no longer competing with the already-promoted Market Context slice. | Ask Team 00 to route the approval-gated Team 03 architecture packet next; do not self-promote it. |
| 2 | `CF-W1-SQLAB-02` | Highest-value parent item still visible after the active/queued context and market-data lanes, but the post-preview path is sequenced. | Keep visible; do not present as the immediate pull ahead of `STRAT-02B`. |
| 3 | `CF-W1-MD-02` | Parent requirement remains useful for the durable-evidence program, but the active child split should still lead first. | Keep as parent only; do not route before `CF-W1-MD-02A`. |
| 4 | `CF-W1-MD-03` | Market Data signoff still does not hard-enforce the active `95%` price-ready / `90%` metadata-ready thresholds, but the packet is already queued behind active `RH-02A`. | Keep visible; do not present as the immediate pull. |
| 5 | `CF-W1-STRAT-02` | Parent requirement remains useful only as lineage for accepted `02A` and new child `02B`. | Keep blocked as parent; do not route directly. |
| 6 | `CF-W1-RH-02` | Parent requirement remains useful for later true-delta history work if the bounded child exposes a storage gap. | Keep as parent only; do not route before `CF-W1-RH-02A`. |

### Candidates Team 00 Can Route In Parallel Right Now

- `CF-W1-STRAT-02B`
- `CF-W1-SQLAB-02` remains visible but is not the immediate pull.
- `CF-W1-MD-02` remains visible as the next upstream durable-evidence parent.

### Additional Discovery Candidates Added This Cycle

These do not change the current top stack. They are next-wave requirement candidates created from current source gaps that still affect direct research trust and reviewability.

| ID | User value | Likely owner team | Dependencies | File-conflict risk | Parallel with active Team 06 and Team 03 work? |
| --- | --- | --- | --- | --- | --- |
| `CF-W1-RH-01` | Research Hub actionability evidence wiring so stable upstream trust dimensions stop showing as permanent placeholders. | Team 03 prep, Team 04 QA prep, later Team 08 implementation. | `CF-W1-L3-TREV-01`, `CF-W1-TP-02`, semantic alignment with `CF-W1-SQLAB-01` / `CF-W1-CAL-01`. | Medium. Clean child is `research-hub`-local; cross-module evidence widening is the main risk. | `Yes` for docs-only prep. |
| `CF-W1-RH-02A` | Research Hub `whatChanged` fail-closed basis semantics so delta labels have a real comparison basis or explicit unavailable state. | Team 03 prep, Team 04 QA prep, later Team 08 implementation. | Keeps semantic alignment with `CF-W1-RH-01` but does not wait on it if the first child only removes false-delta claims. | Medium. First child is local unless storage becomes necessary. | `Yes` for docs-only prep. |
| `CF-W1-SMI-01` | Smart Money freshness/partial-trust semantics so accumulation/distribution labels do not overclaim completeness. | Team 03 prep, Team 04 QA prep, later Team 06 implementation. | Adjacent to `CF-W1-MD-02`, `CF-W1-HCTX-01`, and `CF-W1-MCTX-01` but does not block on them. | Medium. Module-local first child is plausible. | `Yes` for docs-only prep. |
| `CF-W1-L3-TREV-02` | Today Review candidate snapshot provenance so detail pages show source-module evidence timing and compatibility-only gaps. | Team 03 prep, Team 04 QA prep, later Team 07 implementation. | `CF-W1-L3-TREV-01` first; keep target-language follow-on separate under `CF-W1-TP-02`. | Medium. `today-trade-review`-local if snapshot normalization does not widen. | `Yes` for docs-only prep. |

Team 00 promoted `CF-W1-L3-PORT-01A` to Ready on 2026-05-18. It is no longer a refinement item.

The current Ready-promotion front-runners after the PORT-01A rework routing are `CF-W1-TP-01B`, `CF-W1-NOTIF-02`, and `CF-W1-L3-ALERT-01`.

This non-active discovery cycle is focused on `CF-W1-STRAT-02B`, `CF-W1-SQLAB-02`, `CF-W1-MD-02`, `CF-W1-MD-03`, `CF-W1-SQLAB-01`, `CF-W1-UX-01`, `CF-W1-L3-INTEL-03`, `CF-W1-L3-WATCH-01`, and `CF-W1-L3-INTEL-02`. `CF-W1-MCTX-01`, `CF-W1-RH-02A`, `CF-W1-MD-02A`, `CF-W1-DQ-02`, `CF-W1-BT-02`, `CF-W1-HCTX-01`, and `CF-W1-SMI-01` are active, accepted, routed, or already queued and stay out of the immediate unassigned ranking. `CF-W1-NOTIF-02`, `CF-W1-AUTH-01`, and `CF-W1-SUB-01` remain valid backlog items, but they stay behind the market-intelligence trust stack unless a correctness or user-data-safety blocker appears.

## New Audit-Derived Requirements

These are the newest high-value discovery items from read-only module audits. None is Ready for Implementation.

| Rank | ID | Next gate |
| --- | --- | --- |
| 1 | CF-W1-MD-03 | Product refinement and architecture contract for explicit Market Data signoff threshold gates. |
| 2 | CF-W1-CAL-01 | Product refinement and architecture contract for trusted versus diagnostic calibration outputs. |
| 3 | CF-W1-SQLAB-02A | Product refinement and Team 04 QA planning for the no-schema Signal Quality Lab derived preview child. |
| 4 | CF-W1-STRAT-02B | Product refinement and approval-gated architecture packet for durable Strategy Framework revision history. |
| 5 | CF-W1-SQLAB-01 | Product refinement and architecture contract for trusted versus untrusted signal-quality outputs. |
| 6 | CF-W1-UX-01 | Product refinement and bounded architecture contract for stock research workbench trust surfaces. |
| 7 | CF-W1-L3-INTEL-03 | Product refinement and bounded architecture contract for explainable concentration and exposure review over existing portfolio detail surfaces. |
| 8 | CF-W1-L3-WATCH-01 | Product refinement and bounded architecture contract for explainable watchlist review priority and reason summaries. |
| 9 | CF-W1-L3-INTEL-02 | Product refinement and architecture contract for explainable portfolio intelligence review output. |
| 10 | CF-W1-L3-ALERT-03 | Product refinement and bounded architecture contract for post-trigger review outcomes and review-note persistence. |

## Current Cycle Non-Active Value Order

These are docs-only discovery priorities. They do not override Team 00's current Ready-promotion queue.

| Rank | ID | Why now | Next refinement need |
| --- | --- | --- | --- |
| 1 | CF-W1-STRAT-02B | Strategy provenance and historical rule identity remain the clearest upstream unassigned trust gap after Market Context promotion. | Team 03 approval-gated architecture packet and Team 04 durable-child QA planning. |
| 2 | CF-W1-SQLAB-02 | Signal outcome learning already supports a no-schema preview child, but the next post-preview path still needs definition. | Team 03/04 packet follow-up after `SQLAB-02A` closes. |
| 3 | CF-W1-MD-02 | Durable market-data evidence remains foundational, but the active child split must lead. | ADR and later child follow-ons only. |
| 4 | CF-W1-MD-03 | Market Data signoff still overstates trust when contract coverage thresholds are missed, but the packet is queued behind `RH-02A`. | Architecture contract and QA plan for one bounded signoff-threshold slice. |
| 5 | CF-W1-SQLAB-01 | Signal Quality outcome confidence needs a clear trusted-versus-untrusted contract before quality summaries shape judgment. | Architecture contract and QA plan. |
| 6 | CF-W1-UX-01 | Workbench trust remains useful, but it should follow market-data/signals/backtest evidence unless backend trust evidence is source-supported. | Backend trust-evidence parent remains blocked until source-supported fields exist. |
| 7 | CF-W1-L3-INTEL-03 | Portfolio concentration review is still useful, but it remains below the upstream market-intelligence trust stack unless a safety blocker requires earlier attention. | Architecture contract and QA plan for bounded review-first language. |
| 8 | CF-W1-L3-WATCH-01 | Watchlist review actionability can improve the trader review queue without waiting on convenience work. | Architecture contract and QA plan for explainable review priority. |
| 9 | CF-W1-L3-INTEL-02 | Review traceability remains useful once higher-value trust layers are settled. | Architecture contract and QA plan for review-output explainability. |
| 10 | CF-W1-L3-ALERT-03 | Post-trigger follow-through only matters after the evidence stack is stronger. | Architecture contract and QA plan for outcome traceability. |

## Next Unassigned Pull Stack

| Rank | ID | Why now | Next refinement need |
| --- | --- | --- | --- |
| 1 | CF-W1-STRAT-02B | Team 03 already proved the parent is blocked and the remaining work is a bounded durable-history child, so this is the next clean Team 00 routing candidate. | Team 03 approval-gated architecture packet and Team 04 durable-child QA planning. |
| 2 | CF-W1-SQLAB-02 | Signal outcome learning remains the next higher-value parent item after the current dispatch correction, but it stays sequenced behind `CF-W1-SQLAB-02A`. | Team 03 post-preview follow-up once `CF-W1-SQLAB-02A` closes. |
| 3 | CF-W1-MD-02 | Durable market-data evidence remains the next upstream parent after the new Strategy Framework child. | Team 03 ADR follow-up while `MD-02A` stays active. |

## Decision Inbox State

No open decisions.

Product Owner action not required.

Daemon should continue autonomous work.

The former Decision Inbox items moved to refinement / Ready-evaluation prep:

| ID | Approved policy | Next refinement need |
| --- | --- | --- |
| CF-W1-AUTH-01 | Option A: protected Team 09 controllers fail closed when `req.user.id` is missing. | Team 03 contract/work packet and Team 04 QA refresh are prepared; needs Team 00 Ready evaluation and a sequenced Team 09 implementation handoff. Do not run in parallel with `CF-W1-SUB-01`; combine only if Team 00 records exact shared-file reservations. |
| CF-W1-SUB-01 | Option A: ordinary users may not self-change plan or self-select `ADMIN`; plan changes are admin/manual only. | Team 03 contract/work packet and Team 04 QA refresh are prepared; needs Team 00 Ready evaluation and a sequenced Team 09 implementation handoff. Prefer sequencing after `CF-W1-AUTH-01`; combine only if Team 00 records exact shared-file reservations. |
| CF-W1-UX-02 | Option B: Copilot-only first slice, research-support naming, blocked narrative hidden, no shared UI/navigation. | Team 03 contract/work packet and Team 04 QA refresh are prepared; still needs Team 08 source-supported trust-field mapping, Team 00 Ready evaluation, and no shared UI/navigation scope. |
| CF-W1-UX-05 | Option A: Copilot-only copy cleanup after or with `CF-W1-UX-02`; no shared `StatusBadge` yet. | Team 03 contract/work packet and Team 04 QA refresh are prepared for the Copilot-only first child; sequence after or fold into `CF-W1-UX-02`. |
| CF-W1-MD-01 | Option A: future-dated candles and invalid adjusted close rejected; missing adjusted close fallback/incomplete; suspicious volume warning; spike rejection opt-in. | Team 03 validation-only contract/work packet and Team 04 QA refresh are prepared; needs Team 05 readiness acceptance and Team 00 Ready evaluation. No durable-storage/provider/schema scope. |

## Post-Decision Architecture / QA Refresh State

| ID | Resolved policy | Next refinement need |
| --- | --- | --- |
| CF-W1-L3-DQ-01 | Option B: passive `LIMITED` display with action-like blocking. | Child module contracts, DTO fields, QA scenarios, exact file reservations, and Team 00 Ready promotion. |
| CF-W1-TP-01A | Option B: backend-only compatibility direction. | Backend-only child packet as `CF-W1-TP-01B`, exact source/test file reservation, QA scenarios, and Team 00 Ready promotion. |
| CF-W1-MD-02 | Option B as ADR direction only: companion durable readiness/evidence storage. | Formal ADR, ADR QA checklist, and separate future implementation slice planning. |
| CF-W1-AUTH-01 | Option A fail-closed protected controllers. | Contract/work packet and QA refresh prepared; needs Team 00 Ready evaluation and Team 09 handoff. |
| CF-W1-SUB-01 | Option A admin/manual subscription plan changes only. | Contract/work packet and QA refresh prepared; needs Team 00 Ready evaluation and Team 09 handoff, preferably sequenced with `CF-W1-AUTH-01`. |
| CF-W1-UX-02 | Option B Copilot-only trust UX. | Contract/work packet and QA refresh prepared; needs Team 08 source-supported trust-field mapping and Team 00 Ready evaluation. |
| CF-W1-UX-05 | Option A Copilot-only copy cleanup. | Contract/work packet and QA refresh prepared; first child must sequence with or fold into `CF-W1-UX-02`. |
| CF-W1-MD-01 | Option A validation hardening policy. | Validation-only contract/work packet and QA refresh prepared; needs Team 05 readiness acceptance and Team 00 Ready evaluation. |

## Needs Architecture Acceptance / Contract Finalization

| ID | Contract status |
| --- | --- |
| CF-W1-L3-PORT-01A | Promoted to Ready by Team 00 on 2026-05-18; implementation handoff copied to Team 07. |
| CF-W1-L3-PORT-01B | Watchlist-only child remains future after portfolio slice; do not combine without Team 00 exception. |
| CF-W1-L3-AUTH-03 | Requirement, architecture review, contract, work packet, and QA plan prepared; needs Team 00 Ready evaluation. |
| CF-W1-L3-ALERT-01 | Child contract, Team 03 reservation matrix, backend reservations, and QA plan prepared; needs Team 00 Ready evaluation. |
| CF-W1-L3-INTEL-01 | Requirement, architecture review, contract, work packet, and QA plan prepared; waits for accepted `CF-W1-L3-PORT-01A` portfolio readiness DTOs. |
| CF-W1-MCTX-01 | Ready-promoted requirement | Team 00 already promoted it in `12-ready-queue/ready-for-implementation.md` on 2026-05-18 | Team 05 implementation owns the next gate | Keep out of refinement pull; active Ready-owned slice |
| CF-W1-MD-03 | Audit-derived requirement draft | Product refinement drafted | QA plan needed | Future Market Data signoff-only child only after Team 00/03 reservation | threshold-gated signoff trust and explicit blocker reasons remain explicit | Keep future-child prep; not Ready |
| CF-W1-SQLAB-02A | Audit-derived child requirement draft | Product refinement drafted | QA planning active | No-schema derived preview child only after Team 04 planning | derived journal preview and SignalOutcomeSet reuse remain explicit | Keep active QA-planning prep; not Ready |
| CF-W1-STRAT-02 | Parent blocked after accepted `CF-W1-STRAT-02A` | Keep as parent lineage only | New bounded child is `CF-W1-STRAT-02B` | Durable rule provenance and DQ-gated trust remain explicit at parent level | Keep blocked as parent; not an immediate pull |
| CF-W1-STRAT-02B | New bounded child requirement | Product refinement drafted | QA plan needed | Future approval-gated schema/repository/generated Strategy Framework child only after Team 00/03 reservation | version-keyed persisted definitions and additive durable history remain explicit | Keep future-child prep; not Ready |
| CF-W1-DQ-02 | Audit-derived requirement draft | Product refinement drafted | QA plan needed | Future Market Data / Data Quality backend-only child only after Team 00/03 reservation | currentness evidence and fail-closed gating remain explicit | Keep upstream QA-prep; not Ready |
| CF-W1-SQLAB-02 | Audit-derived requirement draft | Product refinement drafted | QA plan needed | Future signal-quality-lab durable-storage child only after separate storage packet | durable signal-outcome learning memory remains explicit | Keep future-child prep; not Ready |
| CF-W1-BT-02 | Audit-derived requirement draft | Product refinement refreshed | QA plan needed | Future backtesting-strategy-lab backend/frontend child only after Team 00/03 reservation | review outcome trust, diagnostic framing, and repair/benchmark warnings remain explicit, but need one canonical label | Keep future-child prep; not Ready |
| CF-W1-CAL-01 | Audit-derived requirement draft | Product refinement drafted | QA plan needed | Future signal-calibration-engine backend child only after Team 00/03 reservation | DQ-as-penalty behavior and missing hard gates remain explicit | Keep future-child prep; not Ready |
| CF-W1-HCTX-01 | Audit-derived requirement draft | Product refinement drafted | QA plan needed | Future historical-context-snapshots backend child only after Team 00/03 reservation | Selected-snapshot provenance and gap explanation remain explicit | Keep future-child prep; not Ready |
| CF-W1-UX-01 | Audit-derived requirement draft | Product refinement drafted | QA plan needed | Future stock-research-workbench backend/frontend child only after Team 00/03/08 reservation | Workbench trust, scope proof, blocker reasons, and downstream eligibility remain explicit | Keep future-child prep; not Ready |
| CF-W1-SQLAB-01 | Audit-derived requirement draft; future Signal Quality Lab child remains outside Ready until a Team 00/03 reservation and contract are prepared. |
| CF-W1-TP-01B | Backend-only child contract, Team 03 reservation matrix, backend reservations, Team 06 inspection, and QA plan prepared; needs Team 00 Ready evaluation. |
| CF-W1-NOTIF-02 | Requirement, architecture, contract, work packet, Team 03 reservation matrix, and platform QA plan prepared; needs Team 00/Team 09 Ready evaluation. |
| CF-W1-MD-02A | New bounded child requirement drafted; needs Team 00 routing to Team 03/04 for additive schema-packet prep and ADR QA review. |
| CF-W1-MD-02 | ADR direction accepted; formal ADR draft exists and separate future source/schema split remains. |
| CF-W1-AUTH-01 | Policy accepted; Team 03 contract/work packet prepared around module-local Team 09 controller/test scope; needs Team 00 Ready evaluation. |
| CF-W1-SUB-01 | Policy accepted; Team 03 backend-only contract/work packet prepared with UI limitation note; needs Team 00 Ready evaluation. |
| CF-W1-UX-02 | Policy accepted; Team 03 Copilot-only contract/work packet refreshed; needs Team 08 source-supported trust-field mapping and Team 00 Ready evaluation. |
| CF-W1-UX-05 | Policy accepted; Team 03 Copilot-only child sequencing refreshed; should fold into or follow `CF-W1-UX-02`. |
| CF-W1-MD-01 | Policy accepted; Team 03 validation-only contract/work packet prepared with source/test reservations only; needs Team 05 readiness acceptance and Team 00 Ready evaluation. |

## Needs QA Plan / QA Refresh

| ID | QA focus/status |
| --- | --- |
| CF-W1-MD-03 | QA plan needed; executable validation blocked until Team 00/03 reservation and implementation handoff. |
| CF-W1-CAL-01 | QA planning required; executable validation blocked until Team 00/03 reservation and exact implementation handoff. |
| CF-W1-SQLAB-02A | QA planning active; executable validation blocked until the no-schema derived preview child is finalized. |
| CF-W1-SQLAB-02 | QA plan needed; durable-storage child blocked until separate storage approval. |
| CF-W1-BT-02 | QA plan needed; executable validation blocked until Team 00/03 reservation and implementation handoff. |
| CF-W1-L3-PORT-01A | Child QA plan prepared; executable validation begins after Team 07 implementation in the dedicated worktree. |
| CF-W1-L3-PORT-01B | Child QA plan covers future watchlist slice; executable validation blocked until separate Team 00 handoff. |
| CF-W1-L3-AUTH-03 | QA plan prepared; executable validation blocked until Team 00 Ready promotion and implementation handoff. |
| CF-W1-L3-ALERT-01 | Child QA plan prepared; executable validation blocked until Team 00 Ready promotion and implementation handoff. |
| CF-W1-L3-INTEL-01 | QA plan prepared; executable validation blocked until `CF-W1-L3-PORT-01A` acceptance and Team 00 implementation handoff. |
| CF-W1-STRAT-02B | QA plan needed; executable validation blocked until Team 00/03 reservation and implementation handoff. |
| CF-W1-MD-02 | ADR direction accepted; no executable validation until future source/schema implementation is approved. |
| CF-W1-NOTIF-02 | Platform QA plan prepared; executable validation blocked until Ready promotion and implementation handoff. |
| CF-W1-AUTH-01 | Team 04 Option A platform QA refresh prepared; executable validation blocked until Ready promotion and Team 09 implementation handoff. |
| CF-W1-SUB-01 | Team 04 Option A platform QA refresh prepared; executable validation blocked until Ready promotion and Team 09 implementation handoff. |
| CF-W1-UX-02 | Team 04 Option B Copilot-only QA refresh prepared; UI smoke remains blocked until exact implementation handoff, source-supported trust mapping, startup/resource plan, and Ready promotion exist. |
| CF-W1-UX-05 | Team 04 Option A Copilot-only QA refresh prepared; executable validation should run with or after the `CF-W1-UX-02` Copilot handoff. |
| CF-W1-MD-01 | Team 04 Option A validation QA refresh prepared; executable validation blocked until Team 05 readiness acceptance, exact handoff, and Team 00 Ready promotion. |

## Next Non-Blocked Architecture / QA Prep Candidates

These items are not implementation-ready.

| Rank | ID | Prep needed |
| --- | --- | --- |
| 1 | CF-W1-STRAT-02B | Team 00/03 approval-gated architecture packet and QA plan for durable Strategy Framework revision history. |
| 2 | CF-W1-MD-03 | Team 00/03 reservation and QA plan for explicit Market Data signoff threshold gates after the queued `RH-02A` lane. |
| 3 | CF-W1-CAL-01 | Team 00/03 reservation and QA plan for signal-calibration trust-state evidence. |
| 4 | CF-W1-SQLAB-02 | Team 00/03 follow-up for the post-preview signal outcome journal path. |
| 5 | CF-W1-MD-02 | Team 00/03 ADR and split-packet prep for durable market-data readiness evidence. |
| 6 | CF-W1-SQLAB-01 | Team 00/03 reservation and QA plan for trusted-versus-untrusted signal-quality outputs. |
| 7 | CF-W1-L3-INTEL-03 | Team 00/03 reservation and QA plan for prepared portfolio concentration-review packet. |
| 8 | CF-W1-L3-WATCH-01 | Team 00/03 reservation and QA plan for prepared watchlist review-actionability packet. |
| 9 | CF-W1-L3-INTEL-02 | Team 00/03 reservation and QA plan for portfolio intelligence review traceability. |
| 10 | CF-W1-L3-ALERT-03 | Team 00/03 reservation and QA plan for prepared alert follow-through packet once active alert writers clear. |

## Queued And Follow-On Discovery Queue

These candidates are not the immediate next unassigned pull because they are either already queued, already active, or explicitly sequenced behind the current top stack.

| Rank | ID | Prep needed |
| --- | --- | --- |
| 11 | CF-W1-RH-01 | Team 03/04 contract and QA prep for bounded Research Hub actionability evidence wiring once the queued slot behind `CF-W1-SMI-01` opens. |
| 12 | CF-W1-SMI-01 | Team 03/04 contract and QA prep for Smart Money freshness and partial-trust semantics while the active architecture cycle runs. |
| 13 | CF-W1-RH-02 | Hold as parent only; use after `CF-W1-RH-02A` if Team 03 proves a separate true-delta history or storage split is required. |

## Current Priority Refinement Output

| ID | Useful next output | Owner to route |
| --- | --- | --- |
| CF-W1-STRAT-02B | Approval-gated architecture packet for durable Strategy Framework revision history. | Team 00 / Team 03 |
| CF-W1-MD-03 | Market Data signoff-threshold contract and QA plan. | Team 00 / Team 03 |
| CF-W1-CAL-01 | Signal Calibration trust-state contract and QA plan. | Team 00 / Team 03 |
| CF-W1-SQLAB-02 | Signal outcome journal parent and future durable-storage contract path. | Team 00 / Team 03 |
| CF-W1-STRAT-02 | Keep parent blocked; do not route directly. | Team 00 / Team 03 |
| CF-W1-MD-02 | Formal ADR for companion durable readiness/evidence storage and future slice plan. | Team 03 with Team 04 ADR QA checklist |
| CF-W1-SQLAB-01 | Signal Quality outcome-confidence contract and QA plan. | Team 00 / Team 03 |
| CF-W1-UX-01 | Stock Research Workbench trust-surface contract and QA plan. | Team 00 / Team 03 / Team 08 |
| CF-W1-L3-INTEL-03 | Portfolio concentration-review contract and QA plan over existing portfolio detail surfaces. | Team 00 / Team 03 |
| CF-W1-L3-WATCH-01 | Watchlist review-actionability contract and QA plan. | Team 00 / Team 03 |
| CF-W1-L3-INTEL-02 | Portfolio intelligence review traceability contract and QA plan. | Team 00 / Team 03 |
| CF-W1-L3-ALERT-03 | Alert follow-through contract and QA plan. | Team 00 / Team 03 |
| CF-W1-MD-02A | Additive companion evidence schema packet contract and ADR QA review. | Team 00 / Team 03 / Team 04 |
| CF-W1-RH-01 | Research Hub actionability evidence-wiring contract and QA plan. | Team 00 / Team 03 / Team 04 |
| CF-W1-L3-TREV-02 | Today Review candidate snapshot provenance contract and QA plan. | Team 00 / Team 03 / Team 04 |
| CF-W1-RH-02A | Research Hub `whatChanged` fail-closed comparison-basis contract and QA plan. | Team 00 / Team 03 / Team 04 |
| CF-W1-RH-02 | Hold as parent only; use later if the bounded child exposes a separate true-delta history/storage decision. | Team 00 / Team 03 / Team 04 |
| CF-W1-TP-01B | Ready-promotion check for backend-only Trade Plan DQ hard-block implementation. | Team 00 |
| CF-W1-NOTIF-02 | Ready-promotion check and implementation handoff for notification log redaction. | Team 00 + Team 09 |
| CF-W1-L3-ALERT-01 | Ready-promotion check for alert readiness suppression implementation. | Team 00 |
| CF-W1-L3-AUTH-03 | Ready-promotion check for alert rule target ownership implementation. | Team 00 |
| CF-W1-MD-02 | Formal ADR for companion durable readiness/evidence storage and future slice plan. | Team 03 with Team 04 ADR QA checklist |
| CF-W1-L3-INTEL-01 | Hold as upstream-blocked until portfolio readiness DTO implementation is accepted. | Team 00 + Team 07 |
| CF-W1-AUTH-01 | Team 00 Ready evaluation for prepared fail-closed controller packet. | Team 00 + Team 09 |
| CF-W1-SUB-01 | Team 00 Ready evaluation for prepared local/manual subscription plan backend packet. | Team 00 + Team 09 |
| CF-W1-MD-01 | Team 05 readiness acceptance and Team 00 Ready evaluation for prepared validation-hardening packet. | Team 05 + Team 00 |
| CF-W1-UX-02 | Team 08 source-supported trust-field mapping and Team 00 Ready evaluation for prepared Copilot-only trust UX packet. | Team 08 + Team 00 |
| CF-W1-UX-05 | Sequence or fold Copilot-only copy cleanup into `CF-W1-UX-02`; no separate shared UI handoff. | Team 08 + Team 00 |

## Decision Packet Routing

No current Decision Packet is open.

Create a new Decision Packet only if post-decision child preparation reveals a broader API/UI/stored-row migration, Prisma/schema/migration need, shared-file conflict, provider/startup requirement, unavailable trust evidence that needs product semantics, or unresolved product-language/UX policy.

## Completed Or Split Out Of Active Refinement

| ID | Disposition |
| --- | --- |
| CF-W1-QA-01 | Completed as documentation-only focused command matrix. |
| CF-W1-L3-AUTH-01 | Completed portfolio/watchlist child ownership implementation; local commit `74ba6dd`. |
| CF-W1-L3-AUTH-02 | Completed bounded alert event ownership through parent rule owner; local commit `503bcd9`. |
| CF-W1-SIG-TRIGGER-01 | Completed bounded optional Signal Generation trigger DTO projection; local commit `6ab3999`. Full persisted trigger snapshot / normalized trigger model / downstream adoption remains future work. |
| CF-W2-DQ-01 | Completed Data Quality fail-closed defaults. |
| CF-W2-SIG-01A | Completed Signal Generation run-path DQ fail-closed behavior. |
| CF-W1-SIG-01B | Completed trusted signal list read-path filtering. |
| CF-W1-SIG-LATEST-01 | Completed latest-instrument DQ gating. |
| CF-W1-STRAT-01 | Completed bounded Strategy Decision Option B-Strict compatibility. |
| CF-W1-SIG-01 | Parent split; do not pull as active implementation. |
| CF-W1-DQ-01 | Superseded by `CF-W2-DQ-01`; downstream consumers need separate requirements. |
| CF-W1-TP-01 | Parent split into policy `CF-W1-TP-01A`, active child `CF-W1-TP-01B`, and future broader target-geometry/API/UI migration `CF-W1-TP-02`. |
