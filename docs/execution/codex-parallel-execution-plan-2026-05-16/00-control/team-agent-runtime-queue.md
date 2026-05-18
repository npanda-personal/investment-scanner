# Team Agent Runtime Queue

Date: 2026-05-18

Owner: Team 00 - Master Orchestrator / Integration

## Purpose

Team 00 now manages the Codex factory through spawned subagents instead of requiring the human Product Owner to mediate separate team chats.

The runtime model is a rolling pool:

1. Keep up to six active subagents.
2. Queue additional teams instead of spawning a seventh active subagent.
3. When a subagent completes, Team 00 consumes its output, closes the completed agent, and spawns the next queued team.
4. Team 00 updates active execution docs, queues, and handoffs as the coordinator.
5. Human Product Owner action is requested only when the delegated Requirement / Team 00 / Architect path cannot resolve a decision or when a non-delegable safety, credential, paid-service, cloud, live-provider, force-push, or branch-risk blocker exists.

## Delegated Decision Path

Latest Product Owner direction on 2026-05-18:

- Requirement-specific decisions: Team 02 Requirement Factory decides.
- Structure, process, queueing, and runtime decisions: Team 00 decides.
- Design and architecture decisions: Team 03 Architecture Factory decides.
- Team 00 asks the human Product Owner only if Team 02, Team 00, and Team 03 cannot proceed after applying the active docs and root `AGENTS.md`, or if a non-delegable safety/cost/git/credential/live-provider blocker exists.

## Active Pool Limit

Maximum active spawned subagents: 6.

Do not spawn a seventh active team. Put it in the queued pool and launch it when an active subagent finishes and is closed.

## Active Subagent Pool

| Slot | Team | Model / Reasoning | Mode | Work Item | Write Scope | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Team 07 - Portfolio / Watchlist / Alerts | `gpt-5.3-codex`, high | implementation rework | `CF-W1-L3-PORT-01A` | Team 07 worktree only; reserved portfolio-management files | ready to spawn |
| 2 | Team 02 - Requirement Factory | `gpt-5.4-mini`, medium | docs-only refinement | top candidates and readiness queue sync | `10-requirements/`, Team 02 outbox only | ready to spawn |
| 3 | Team 03 - Architecture Factory | `gpt-5.4`, high | docs-only architecture/readiness | near-ready packets and signoff prep | `03-architecture/`, `06-contracts/`, `08-work-packets/`, Team 03 outbox only | ready to spawn |
| 4 | Team 05 - Market Data / Data Quality | `gpt-5.4`, medium | docs-only readiness inspection | `CF-W1-MD-01` acceptance for validation-only Ready evaluation | Team 05 outbox only, unless Team 00 later assigns exact docs | ready to spawn |
| 5 | Team 08 - UX / Research / Copilot | `gpt-5.4-mini`, medium | docs-only source mapping | `CF-W1-UX-02` and `CF-W1-UX-05` Copilot-only trust/copy prep | Team 08 outbox only, unless Team 00 later assigns exact docs | ready to spawn |
| 6 | Team 09 - Platform / Auth / Subscription / Notifications | `gpt-5.4`, medium | docs-only readiness inspection | `CF-W1-NOTIF-02`, `CF-W1-AUTH-01`, `CF-W1-SUB-01` sequencing | Team 09 outbox only, unless Team 00 later assigns exact docs | ready to spawn |

## Queued Subagents

| Queue | Team | Launch Trigger | Model / Reasoning | Assignment |
| --- | --- | --- | --- | --- |
| 1 | Team 04 - QA Factory | Team 07 completes `CF-W1-L3-PORT-01A` rework | `gpt-5.4`, high | QA rerun in Team 07 worktree |
| 2 | Team 10 - Review / Release | Team 04 QA rerun passes or produces evidence | `gpt-5.5`, high | release re-review for `CF-W1-L3-PORT-01A` |
| 3 | Team 03 - Architect Signoff | Team 10 re-review passes | `gpt-5.4`, high | Architect signoff for `CF-W1-L3-PORT-01A` |
| 4 | Team 00 - PO Packet / Commit | Architect signoff passes | inherited | delegated PO acceptance packet, exact staged-scope verification, local commit if allowed |
| 5 | Team 06 - Strategy / Signal / Risk | `CF-W1-TP-01B` is promoted to Ready or a slot opens for readiness inspection | `gpt-5.4`, medium | Trade Plan readiness inspection or implementation handoff after promotion |
| 6 | Team 07 - Portfolio / Watchlist / Alerts | `CF-W1-L3-ALERT-01` or `CF-W1-L3-AUTH-03` is promoted to Ready | `gpt-5.3-codex`, high | bounded implementation in a dedicated worktree |

## Current Ready Teams

- Team 07 is ready to spawn now for `CF-W1-L3-PORT-01A` rework.
- Team 02 is ready to spawn now for requirement/refinement maintenance.
- Team 03 is ready to spawn now for architecture/readiness prep.
- Team 05 is ready to spawn now for Market Data validation-readiness inspection.
- Team 08 is ready to spawn now for Copilot trust/copy source mapping.
- Team 09 is ready to spawn now for notification/auth/subscription readiness inspection.

## Current Waiting Teams

- Team 04 waits for Team 07 rework.
- Team 10 waits for Team 04 QA rerun evidence.
- Team 06 waits for `CF-W1-TP-01B` Team 00 Ready promotion or an open runtime slot for deeper readiness inspection.

## Stop Conditions

Stop the rolling agent pool only for:

- active subagent limit/resource exhaustion that prevents safe continuation;
- unsafe git state that Team 00 cannot classify;
- all workstreams blocked after Team 02, Team 00, and Team 03 attempt delegated resolution;
- non-delegable paid-service, cloud, credential, broker, live-provider, force-push, or non-`dev` push risk;
- explicit human Product Owner stop.
