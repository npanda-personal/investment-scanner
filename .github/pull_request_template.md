## Lane And Ownership

- Priority batch:
- Priority rank:
- Active work board row:
- Work state before merge:
- Lane:
- Primary module:
- Directly responsible module developer:
- Orchestrator:
- Lane agent:
- Lane agent WIP status:
- Product Owner acceptance criteria:
- Product Owner acceptance return path:
- Requirement or roadmap changes:
- Priority change impact:

## Change Summary

- Backend:
- Frontend:
- Docs:
- Shared files touched:
- Agent handoffs reviewed:
- Handoff quality complete:
- Missing handoff evidence:

## Guidelines Followed

- Baseline docs:
- Role-specific docs:
- Module docs:
- UI/data/new-module/hardening docs:
- SDLC docs:
- Guideline gaps or conflicts:

## Operating Mode

- Current mode:
- Mode owner:
- Allowed actions in current mode:
- Forbidden actions in current mode:
- Next mode:
- Clarification mode active:
- Revision mode active:
- Orchestrator intake complete, if applicable:

## Single-Writer Check

- Reserved files/modules:
- Agents that edited files:
- Conflict-prone files reviewed by orchestrator:

## Contract And Architecture Review

- [ ] Module boundary preserved.
- [ ] Cross-module access uses public exports or APIs.
- [ ] No two agents edited the same file, module, test spec, migration, route registry, generated type, or shared component.
- [ ] API/data contract changes are documented.
- [ ] Prisma/schema/shared utility changes were reviewed by the Solution Architect or Senior Fullstack Lead.
- [ ] User ownership, market scope, and subscription/auth gates were preserved where applicable.
- [ ] The design remains personal/local-first and uses only free/open-source or already-local tools.
- [ ] Latest Product Owner requirement or roadmap changes are reflected in docs where applicable.
- [ ] Product Owner and Solution Architect decisions include assumptions, tradeoffs, risks, and final decision rationale.
- [ ] Required guideline docs were loaded and any conflicts/gaps are recorded.
- [ ] Required decision records are added or marked not needed.
- [ ] Debt/blocker registers are updated where needed.

## QA Evidence

- [ ] Backend tests run or blocker recorded.
- [ ] Frontend build/typecheck run or blocker recorded.
- [ ] Playwright module smoke tests run for UI-facing changes or blocker recorded.
- [ ] Live-data validation completed for data-bearing UI/API changes or blocker recorded.
- [ ] Module docs updated for changed routes, responses, calculations, batching, or workflows.

## Post-QA Lead Validation

- [ ] Senior Fullstack Lead reviewed after QA evidence.
- [ ] Architect asks and architecture contract items were checked against the implementation.
- [ ] Shared-file, route, public export/import, and integration expectations were validated.
- [ ] Any rejection has clear reasons, responsible owner, expected correction, and return gate.
- [ ] Revision mode was used for rejected same-item corrections, if applicable.

## Post-QA Architect Signoff

- [ ] Solution Architect reviewed after QA evidence and post-QA Lead validation.
- [ ] Implemented behavior matches Product Owner business rules.
- [ ] Architecture contract and cross-module assumptions still hold.
- [ ] No solution flaw, shared-code issue, or local/free-tool violation was found.

## Release And Rollback

- Release checklist needed:
- Rollback notes:
- Data/migration impact:
- Irreversible changes:

## GitHub Check-In

- Check-in owner:
- Active branch:
- Pushed remote:
- Commit SHA:
- Files committed:
- Scoped-staging confirmation:
- Unsafe/unaccepted-file exclusion confirmation:
- Rollback notes:
- Unrelated local changes excluded:
- Rejected or unaccepted work excluded:
- Secrets, `.env`, database dumps, and generated artifacts excluded:
- CI status/link, if available:

## Signoff

- Senior Fullstack Lead:
- QA:
- QA verification result:
- Senior Fullstack Lead post-QA validation:
- Senior Fullstack Lead Architect-ask validation result:
- Solution Architect post-QA signoff after Lead validation:
- Solution Architect business-rule/solution-quality result:
- Product Owner:
- Product Owner acceptance result:
- GitHub check-in result:
