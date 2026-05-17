# Decision Needed

Choose the implementation path for the full Signal Generation trigger object contract.

# Context

Team 03 and Team 04 prepared `CF-W1-SIG-TRIGGER-01` requirement, contract draft, architecture readiness, QA plan, and work packet draft. Existing Signal Generation slices cover DQ gating but do not complete the root trigger object contract required for downstream trusted consumers.

# Affected Workstream

Workstream: `CF-W1-SIG-TRIGGER-01`

Requirement: Full Trigger Object Contract

Module: `signal-generation-engine`

Lane: Strategy / Signal / Risk

# Affected Files

Current documentation-only files:

- `10-requirements/CF-W1-SIG-TRIGGER-01-full-trigger-object-contract-requirement.md`
- `06-contracts/CF-W1-SIG-TRIGGER-01-trigger-object-contract.md`
- `03-architecture/CF-W1-SIG-TRIGGER-01-architecture-readiness.md`
- `04-qa/CF-W1-SIG-TRIGGER-01-qa-plan.md`
- `08-work-packets/CF-W1-SIG-TRIGGER-01-work-packet.md`

Possible future implementation files after approval:

- `backend/src/modules/signal-generation-engine/**`
- `backend/tests/modules/signal-generation-engine/**`

Possible future high-risk files only if explicitly approved:

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- generated types
- route/shared/frontend/downstream consumer files

# Evidence Inspected

- Root `AGENTS.md`
- completed bounded signal slices `CF-W2-SIG-01A`, `CF-W1-SIG-01B`, and `CF-W1-SIG-LATEST-01`
- `10-requirements/CF-W1-SIG-TRIGGER-01-full-trigger-object-contract-requirement.md`
- `06-contracts/CF-W1-SIG-TRIGGER-01-trigger-object-contract.md`
- `03-architecture/CF-W1-SIG-TRIGGER-01-architecture-readiness.md`
- `04-qa/CF-W1-SIG-TRIGGER-01-qa-plan.md`

# Options

Option A: DTO projection first. Add an optional module-local `trigger` / `triggerContract` projection derived from existing signal records, marking unavailable or legacy-incomplete fields explicitly.

Option B: persisted trigger snapshot. Add a persisted trigger contract snapshot, likely JSON first. This may require Prisma/schema/migration approval.

Option C: normalized trigger table. Create a first-class trigger persistence model. This is the largest path and requires schema, repository, service, DTO, and downstream migration planning.

# Codex Recommendation

Choose Option A for the first bounded implementation slice, with explicit contract-incomplete markers for fields that current records cannot prove. Keep persisted snapshot and normalized table work as future ADRs.

# Risk If Approved

DTO projection may not fully satisfy long-term auditability for legacy records. It must not invent rule versions, trigger prices, lifecycle states, or DQ evidence when current source evidence is unavailable.

# Risk If Rejected

Downstream modules remain blocked from treating signal outputs as contract-complete trigger objects.

# Impact On Parallel Work

Other workstreams can continue: Lane 3 alert ownership decision, Lane 3 DQ policy prep, Market Data ADR prep, Trade Plan contract prep, UX trust prep, and QA plan refinement.

# Exact Consent Needed

Product Owner + Architect approval:

`Approve CF-W1-SIG-TRIGGER-01 Option A: implement a first bounded Signal Generation trigger object DTO projection only. Missing fields must be explicitly marked unavailable or contract-incomplete; no invented rule/version/trigger-price/lifecycle/DQ evidence is allowed. No Prisma/schema/migration, route registry, shared utility, frontend/UI, package, provider, paid/cloud, startup/backfill, or downstream consumer changes are approved.`

# Safe Next Step If No Decision Yet

Keep `CF-W1-SIG-TRIGGER-01` out of Ready for Implementation and continue documentation-only contract and QA refinement for unrelated work.

