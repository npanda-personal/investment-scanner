# Team Runtime Pool Policy

Date: 2026-05-17

## Purpose

Runtime slots are reusable execution capacity. A completed team report frees a slot; it does not end the scheduler.

## Pool Rules

- Runtime slots are reusable.
- If a team completes, the slot should be filled immediately.
- If a team completes but has more work, relaunch the same team.
- If a team completes and has no matching work, launch the next queued team.
- If a previously shut-down team receives new ready work, add it back to the queue immediately.
- If implementation teams have no ready work, assign them audit/refinement/prep work in their module domain.
- Do not wait for the human Product Owner to choose the next team unless there is a product-priority conflict that Team 00 cannot resolve.
- Team 00 may spawn Codex subagents to run team roles directly. Keep at most six active spawned subagents; queue additional teams in `00-control/team-agent-runtime-queue.md`.
- When a spawned subagent finishes, Team 00 consumes the output, closes the agent, updates queues, and spawns the next queued team if safe.
- Requirement-specific decisions are delegated to Team 02, structure/process decisions to Team 00, and architecture/design decisions to Team 03. Ask the human Product Owner only if those delegated roles cannot proceed or a non-delegable safety/cost/git/credential/live-provider blocker exists.

## Default Rolling Launch Priority

Always keep these factories active if possible:

1. Team 02 Requirement Factory
2. Team 03 Architecture Factory
3. Team 04 QA Factory
4. Team 00 Orchestrator
5. Team 10 Review / Release when the integration queue is non-empty

## Implementation Team Priority

1. Teams with Ready for Implementation work and exact file reservations.
2. Teams with blocked work they can unblock through docs/contracts/QA prep.
3. Teams with module audits that can generate new requirements.

## Implementation Item Priority

When multiple ready items exist, choose by:

1. Highest severity P0/P1.
2. No shared-file conflict.
3. Upstream dependency first.
4. Smaller bounded slice first.
5. Strongest test coverage available.
6. Highest product trust impact.

## Idle Handling

An implementation team with no ready implementation should not idle. It should inspect current source/docs in its lane, produce audit/refinement output, and feed Requirement, Architecture, and QA factories.
