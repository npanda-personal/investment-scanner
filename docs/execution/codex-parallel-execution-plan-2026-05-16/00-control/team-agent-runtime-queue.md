# Team Agent Runtime Queue

Date: 2026-05-18

Owner: Team 00 - Master Orchestrator / Integration

## Purpose

Team 00 now manages the Codex factory through spawned subagents instead of requiring the human Product Owner to mediate separate team chats.

Team 02 is the persistent PO + Requirements value-discovery lane. Team 00 should keep Team 02 active across cycles, or immediately retask/relaunch it if it completes, so the factory always has a ranked user-value backlog.

The runtime model is a rolling pool:

1. Keep up to six active subagents.
2. Queue additional teams instead of spawning a seventh active subagent.
3. When a subagent completes, Team 00 consumes its output, closes the completed agent, and spawns the next queued team.
4. Team 00 updates active execution docs, queues, and handoffs as the coordinator.
5. Human Product Owner action is requested only when the delegated Requirement / Team 00 / Architect path cannot resolve a decision or when a non-delegable safety, credential, paid-service, cloud, live-provider, force-push, or branch-risk blocker exists.

Independent items should run in parallel by default. Do not make one implementation, QA, review, architecture, or requirement-prep stream wait for another unless there is a real dependency, shared-file conflict, runtime/resource limit, or unresolved blocker.

## Delegated Decision Path

Latest Product Owner direction on 2026-05-18:

- Requirement-specific decisions: Team 02 Requirement Factory decides.
- Structure, process, queueing, and runtime decisions: Team 00 decides.
- Design and architecture decisions: Team 03 Architecture Factory decides.
- Team 00 asks the human Product Owner only if Team 02, Team 00, and Team 03 cannot proceed after applying the active docs and root `AGENTS.md`, or if a non-delegable safety/cost/git/credential/live-provider blocker exists.

## Persistent PO / Requirements Lane

Team 02 must continuously:

- audit modules and workflows for investor/trader user value;
- propose new requirements, refactors, reliability improvements, and UX improvements;
- update the active ranked requirement stack from highest user value to lowest;
- identify the top unassigned item Team 00 should delegate next;
- keep implementation out of Team 02 scope.

If the current top-candidate list is thin, Team 02 should audit another module or workflow and add requirement candidates rather than idling.

## Active Pool Limit

Maximum active spawned subagents: 6.

Do not spawn a seventh active team. Put it in the queued pool and launch it when an active subagent finishes and is closed.

## Active Subagent Pool

| Slot | Team | Agent | Model / Reasoning | Mode | Work Item | Write Scope | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Team 02 - PO + Requirement Factory | `019e3a50-ed56-71f0-bfb6-621445556b85` | `gpt-5.4-mini`, medium | persistent docs-only value discovery | continuous module audits, requirement discovery, and priority reordering | `10-requirements/`, Team 02 outbox only | active / persistent |
| 2 | Team 03 - Architecture Factory | `019e3a5d-c2d9-7b90-b65d-11b31d4b3999` | `gpt-5.4`, high | docs-only architecture prep | `CF-W1-L3-PORT-01B`, `CF-W1-AUTH-02`, `CF-W1-DQ-02`, `CF-W1-TP-02`, `CF-W1-L3-INTEL-02` | `03-architecture/`, `06-contracts/`, `08-work-packets/`, Team 03 outbox only | active |
| 3 | Team 07 - Portfolio / Watchlist / Alerts | `019e3a69-8bd2-77e0-a9b7-ce0e6ea85a40` | `gpt-5.3-codex`, high | implementation | `CF-W1-L3-ALERT-01` | Team 07 alert worktree only; alerts-monitoring reserved files | active |
| 4 | Team 04 - QA Factory | `019e3a6a-2a91-79b2-b183-29499a49b592` | `gpt-5.4`, high | QA rerun | `CF-W1-TP-01B` | Team 06 worktree QA docs only | active |
| 5 | Team 10 - Review / Release | `019e3a6a-2ac8-7271-9ef4-2ea9834d10d7` | `gpt-5.5`, high | review / release precheck | `CF-W1-NOTIF-02` | Team 09 worktree review docs only; QA blocker carried | active |
| 6 | Open slot | none | pending | queued work | next independent QA/review/implementation task | n/a | open |

## Queued Subagents

| Queue | Team | Launch Trigger | Model / Reasoning | Assignment |
| --- | --- | --- | --- | --- |
| 1 | Team 10 - Review / Release | Team 04 passes `CF-W1-TP-01B` QA rerun | `gpt-5.5`, high | `CF-W1-TP-01B` release re-review |
| 2 | Team 04 - QA Factory | Team 07 completes `CF-W1-L3-ALERT-01` implementation | `gpt-5.4`, high | alert readiness suppression QA in Team 07 worktree |
| 3 | Team 10 - Review / Release | Team 04 passes `CF-W1-L3-ALERT-01` QA | `gpt-5.5`, high | alert readiness suppression release review |
| 4 | Team 00 - PO Packet / Commit | Architect signoff passes for a work item | inherited | delegated PO acceptance packet, exact staged-scope verification, local commit if allowed |
| 5 | Team 07 - Portfolio / Watchlist / Alerts | `CF-W1-L3-AUTH-03` is promoted and `CF-W1-L3-ALERT-01` clears shared alerts-monitoring files | `gpt-5.3-codex`, high | alert rule target ownership implementation |
| 6 | Team 09 - Platform / Auth / Subscription / Notifications | `CF-W1-AUTH-01` / `CF-W1-SUB-01` sequencing is promoted | `gpt-5.3-codex`, high | backend-only auth/subscription protected-route slice |

## Current Ready Teams

- Team 02 is active as persistent PO + Requirements value-discovery lane.
- Team 03 is active for new architecture prep.
- Team 07 is active on `CF-W1-L3-ALERT-01` in a dedicated worktree.
- Team 04 is active on `CF-W1-TP-01B` QA rerun.
- Team 10 is active on `CF-W1-NOTIF-02` review with the QA runtime blocker carried.

## Current Waiting Teams

- Team 10 Trade Plan re-review waits for Team 04 `CF-W1-TP-01B` QA result.
- Team 04 alert QA waits for Team 07 `CF-W1-L3-ALERT-01` developer handoff.
- Team 10 alert review waits for alert QA.
- Team 09 auth/subscription implementation waits for Team 00 sequencing of `CF-W1-AUTH-01` and `CF-W1-SUB-01`.

## Completed Subagents This Cycle

| Team | Agent | Result |
| --- | --- | --- |
| Team 06 | `019e3a50-ee96-7d80-9df0-44c5911850ad` | `CF-W1-TP-01B` recommended promotable with exact Trade Plan file reservations. Closed. |
| Team 05 | `019e3a50-ef97-7be3-adee-e5cc8a7def81` | `CF-W1-MD-01` not Ready as written; recommended narrowing to reject-only validation child. Closed. |
| Team 09 | `019e3a50-f10e-7cb3-9951-9b07394831e2` | `CF-W1-NOTIF-02` recommended Ready; `AUTH-01`/`SUB-01` should be combined or sequenced. Closed. |
| Team 07 | `019e3a50-ed1c-7872-952b-7b73f8488ce8` | `CF-W1-L3-PORT-01A` rework complete; focused test/build passed. Closed. |
| Team 04 | `019e3a57-1864-73d2-8923-e6316d68c514` | `CF-W1-L3-PORT-01A` QA rerun passed; Team 10 re-review can proceed. Closed. |
| Team 08 | `019e3a54-eb66-7a11-bbc5-ac33aca91fc1` | `CF-W1-UX-02`/`UX-05` not Ready; backend contract refresh needed for trust fields. Closed. |
| Team 03 | `019e3a50-edbe-7df0-8e99-567e7c864abb` | Near-ready architecture refresh complete; confirms `NOTIF-02` primary promotion and `TP-01B` secondary. Closed. |
| Team 10 | `019e3a5c-c67a-7ef1-a8aa-8a5a0e96c926` | `CF-W1-L3-PORT-01A` re-review passed; Architect Signoff launched. Closed. |
| Team 10 | `019e3a5c-45bc-7f52-b09c-659216041aae` | `CF-W1-TP-01B` review rejected; automation-only DQ blocker issue routed to Team 06 rework. Closed. |
| Team 03 | `019e3a5f-7a39-7112-933e-c8eee3c82272` | `CF-W1-L3-PORT-01A` Architect Signoff passed. Closed. |
| Team 06 | `019e3a61-6c87-7e70-b4cd-59cb3883909d` | `CF-W1-TP-01B` rework complete; focused tests and backend build passed; routed to Team 04 QA rerun. Closed. |
| Team 04 | `019e3a63-9ad2-7b90-930d-4be9b00646f0` | `CF-W1-NOTIF-02` QA rejected at runtime-test gate because Jest cannot resolve in the worktree; static redaction inspection passed; routed to Team 10 with QA blocker carried. Closed. |

## Stop Conditions

Stop the rolling agent pool only for:

- active subagent limit/resource exhaustion that prevents safe continuation;
- unsafe git state that Team 00 cannot classify;
- all workstreams blocked after Team 02, Team 00, and Team 03 attempt delegated resolution;
- non-delegable paid-service, cloud, credential, broker, live-provider, force-push, or non-`dev` push risk;
- explicit human Product Owner stop.
