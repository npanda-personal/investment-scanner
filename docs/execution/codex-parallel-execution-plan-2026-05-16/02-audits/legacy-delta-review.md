# Legacy Delta Review

## Method

Pass 1 created a first-principles plan from root `AGENTS.md`, current source, package/build/test files, Prisma schema, route registries, shared files, visible tests, git status, and current Product Owner direction.

Pass 2 reviewed legacy docs only after Pass 1. Legacy ideas were accepted only if current code or root `AGENTS.md` independently supported them.

## Accepted Or Migrated Ideas

| Legacy Idea | Decision | Current Evidence |
|---|---|---|
| Orchestrator controls shared files | migrate | Root `AGENTS.md` requires Orchestrator/Architect control for Prisma, route registries, shared UI/utilities, package manifests, generated types, and contracts. |
| One writer per file | migrate | Root `AGENTS.md` defines single-writer rule. |
| QA before PO acceptance | migrate | Root review gates require QA, review, release audit before PO acceptance. |
| Local resource gate | migrate | Root `AGENTS.md` includes laptop safety rules. |
| Model routing discipline | migrate | Current Product Owner prompt explicitly requires model routing matrix and efficient Pro usage. |
| Open Market Data/DQ risk | migrate as revalidation candidate | Current git status shows broad Market Data modifications and an untracked provider file. |

## Rejected Ideas

| Legacy Idea | Decision | Reason |
|---|---|---|
| Old active board as source of truth | reject | Current Product Owner says historical only. |
| Mandatory GitHub push/check-in | reject | Current Product Owner says no commit/push; root says push only with explicit approval. |
| Old QA evidence proves correctness | reject | Root requires current validation. |
| Old PO acceptance proves current acceptance | reject | Product Owner acceptance must happen after current QA/review/release audit. |
| Old work packets authorize implementation | reject | Sprint 0 is planning-only; implementation needs new approval. |

## Effect On Final Plan

Legacy review did not change the main recommendation. It strengthened the need for:

- New active folder.
- Open-risk migration only after revalidation.
- Local-first release checklist.
- Explicit legacy influence tracking.
