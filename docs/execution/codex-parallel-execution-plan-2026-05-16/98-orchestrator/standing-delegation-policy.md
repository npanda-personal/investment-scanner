# Standing Delegation Policy

Date: 2026-05-17

## Authority

Codex Orchestrator is delegated authority to approve, reject, revise, iterate, QA, code review, Architect sign off, create Product Owner acceptance packets, locally commit, push accepted scoped commits to `dev`, and continue work without asking the human Product Owner when all delegation conditions pass.

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

These conditions apply to each persistent team independently. A blocked Team 6 item must not stop Team 1 audits, Team 2 requirement refinement, Team 3 architecture prep, Team 4 QA planning, or unrelated implementation teams.

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
- one or two revision cycles inside approved files
- ready queue update
- team inbox/outbox update
- integration queue update

## Commit Authority

Codex may create one local commit per accepted requirement when:

- the acceptance packet records delegated Product Owner acceptance,
- all required evidence exists,
- focused tests passed where applicable,
- QA, code review, and Architect gates passed where applicable,
- staged files exactly match the approved scope,
- no true consent blocker occurred.

## Standing Push Authority

As of 2026-05-17, the Product Owner explicitly approved scoped push to `dev` under strict gates.

Codex may push a local commit to `dev` only when all conditions are true:

1. The work item is accepted under standing delegation.
2. The commit is scoped to one accepted requirement or one docs-only factory update.
3. Staged files exactly match the approved scope.
4. `git diff --cached --name-status` has been checked before commit.
5. No forbidden files are staged.
6. No secrets, `.env`, database dumps, generated logs, or unrelated files are staged.
7. Focused tests or builds required by the work packet have passed.
8. QA accepted.
9. Code review accepted.
10. Architect accepted when required.
11. Product Owner packet records delegated acceptance when required.
12. `git status --short` is clean after commit before push.
13. The push target is the active `dev` branch.
14. The push is not a force push.
15. The push is not to `main` or `master`.
16. No unresolved open decision affects the work item.
17. There is no uncertainty about scope.

If push fails, Codex records the failure and continues local autonomous work where safe.

## Limits

This policy does not authorize Codex to touch forbidden/high-risk files, use live providers, introduce paid/cloud risk, make new product policy, or continue through ambiguity that requires human Product Owner, Architect, or QA judgment.

## Multi-Team Rule

Routine gates are handled by the assigned team and Review / Release Factory. Team 0 should coordinate and integrate; it should not become a human-style approval router.

## Spawned Team Agent Delegation

As of 2026-05-18, the Product Owner directed Team 00 to reduce manual mediation by spawning and managing team subagents directly.

Delegated decision ownership:

- Team 02 owns requirement-specific decisions.
- Team 00 owns structure, process, runtime, queueing, and integration decisions.
- Team 03 owns architecture and design decisions.

Team 00 should consult the human Product Owner only when those delegated roles cannot proceed after applying the active docs and root `AGENTS.md`, or when a non-delegable safety/cost/git/credential/live-provider blocker exists.
