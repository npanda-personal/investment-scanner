---
name: Module work
about: Plan and assign a vertical module slice to a parallel implementation lane
title: "[lane:<lane>] <module>: <workflow/change>"
labels: ""
assignees: ""
---

## Product Owner Intake

- Priority batch:
- Priority rank:
- Active work board row:
- Work state:
- Next PO batch impact:
- User workflow:
- User value:
- Domain assumptions:
- Product Owner decision rationale:
- Options/tradeoffs considered:
- Requirement or roadmap changes:
- Priority change impact:
- Continue / pause / revise / cancel:
- In scope:
- Out of scope:
- Acceptance criteria:
- Acceptance return path:

## Guidelines Loaded

- Baseline docs:
- Role-specific docs:
- Module docs:
- UI/data/new-module/hardening docs:
- SDLC docs:
- Guideline conflicts or ambiguities:

## Operating Mode

- Current mode:
- Mode owner:
- Allowed actions in current mode:
- Forbidden actions in current mode:
- Next mode:
- Clarification mode active:
- Revision mode active:
- Orchestrator intake complete, if applicable:

## Lane Assignment

- Lane: `lane:data-quality` / `lane:strategy-signals-risk` / `lane:portfolio-alerts-ux`
- Primary module:
- New module or existing module:
- New module justification:
- Architect module decision:
- Assigned ownership lane for new module:
- Supporting modules:
- Directly responsible module developer:

## Codex Agent Assignment

- Orchestrator agent:
- Product Owner agent:
- Product Owner agent reasoning effort:
- Solution Architect agent:
- Solution Architect agent reasoning effort:
- Lane implementation agent:
- Lane implementation agent active task:
- Lane implementation agent WIP status:
- QA agent:
- Allowed write scope:
- Reserved files/modules:
- Read-only files/modules:
- Explicitly forbidden/conflict-prone files:
- Shared files requiring orchestrator ownership:

## Solution Architect Notes

- Module ownership confirmed:
- API/data contracts:
- Schema or migration impact:
- Upstream dependencies:
- Downstream dependencies:
- Scalability/robustness notes:
- Personal/local-first and free-tool compliance:
- Architecture decision rationale:
- Options/tradeoffs considered:
- Shared files requiring Senior Fullstack Lead review:

## Implementation Checklist

- Product brief, architecture contract, QA plan, and Orchestrator work packet exist before implementation starts.
- Work state is `Ready for Implementation` before `Implementation Mode` begins.
- Single-writer reservations are documented before implementation starts.
- The lane implementation agent has no other active implementation task.
- No two agents edited the same file, module, test spec, migration, route registry, generated type, or shared component.
- Decision record need is resolved or recorded.
- Blockers/debt are resolved or recorded.
- Backend module changes completed.
- Frontend feature changes completed.
- Module docs updated.
- Public exports updated only where needed.
- Route registration updated only where needed.
- Shared-code changes reviewed by Senior Fullstack Lead.

## QA Plan

- Backend tests:
- Frontend build/typecheck:
- Playwright module smoke tests:
- Manual live-data validation:
- Known blockers or regression risks:
- Release/rollback impact:
- Technical debt entries:
- Blocker entries:

## GitHub Check-In

- Check-in required:
- Check-in owner:
- Active branch:
- Pushed remote:
- Commit SHA:
- Files committed:
- Scoped-staging confirmation:
- Unsafe/unaccepted-file exclusion confirmation:
- Unrelated local changes excluded:
- Rejected or unaccepted work excluded:
- Secrets, `.env`, database dumps, and generated artifacts excluded:
- Rollback notes:
- CI status/link, if available:

## Agent Handoffs

- Product Owner handoff:
- Solution Architect handoff:
- Lane implementation handoff:
- QA handoff:
- Post-QA Senior Fullstack Lead validation handoff:
- Post-QA Solution Architect handoff after Lead validation:
- Handoff quality complete:
- Missing handoff evidence:
- Guideline gaps or skipped docs:

## Rejections And Clarifications

- Rejection gate:
- Rejecting role:
- Rejection reason:
- Failed criterion/ask/contract:
- Evidence:
- Expected correction:
- Responsible owner:
- Return gate:
- Clarification path used:
- Blocker escalation path:
- Blocker review date:
- Parallel work available while blocked:
- Current revision mode owner:
- Return-to-gate criteria:

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
