# Standing Delegation Policy

Date: 2026-05-17

## Authority

Codex Orchestrator is delegated authority to approve, reject, revise, iterate, QA, code review, Architect sign off, create Product Owner acceptance packets, locally commit, and continue work without asking the human Product Owner when all delegation conditions pass.

Root `AGENTS.md`, current repository state, active execution docs, current git state, and current Product Owner direction remain authoritative.

`docs/AGENTS.md` remains deleted or neutralized.

`docs/codex-agent-team-plan/` remains historical evidence only.

## Delegation Conditions

Codex may act autonomously only when all conditions are true:

1. Work stays inside an already approved boundary.
2. Work is module-local or documentation-only.
3. No forbidden/high-risk files are touched.
4. No new Product Owner policy decision is required.
5. No Angel One/live provider/broker/paid/cloud risk is involved.
6. No Prisma/schema/migration changes are required.
7. No route registry changes are required.
8. No shared utility or shared UI changes are required.
9. No package manifest or generated/common fixture changes are required.
10. Focused tests pass.
11. QA accepts.
12. Code review accepts.
13. Architect accepts when required.
14. Product Owner packet clearly states limitations and does not overclaim.
15. Staged scope is exact.
16. No stop condition is hit.

When all conditions pass, Codex may record:

```text
Human Product Owner decision: Accepted under standing Product Owner delegation for autonomous Codex factory waves.
```

## Routine Gates Codex Handles Internally

Codex must not ask the human Product Owner for these routine gates when the work stays inside the approved boundary:

- readiness check
- requirement reframing
- split into smaller bounded slice
- QA evidence
- code review evidence
- Architect signoff
- Product Owner acceptance packet
- active board update
- risk register update
- local commit
- next-ready queue update
- next contract prep
- next QA plan prep
- routine docs cleanup inside active execution folder

## Commit Authority

Codex may create one local commit per accepted requirement when:

- the acceptance packet records delegated Product Owner acceptance,
- all required evidence exists,
- focused tests passed where applicable,
- QA, code review, and Architect gates passed where applicable,
- staged files exactly match the approved scope,
- no true consent blocker occurred.

Push remains disabled unless explicitly approved.

## Limits

This policy does not authorize Codex to touch forbidden/high-risk files, use live providers, introduce paid/cloud risk, make new product policy, or continue through ambiguity that requires human Product Owner, Architect, or QA judgment.

