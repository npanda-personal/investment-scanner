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
| 2 | Team 04 - QA Factory | `019e3a7b-9b97-7073-a2d9-6db28aaf0923` | `gpt-5.4`, high | QA plan consolidation | narrowed `CF-W1-MD-01`; combined `CF-W1-UX-02` / `CF-W1-UX-05A` | `04-qa/`, Team 04 outbox only | active |
| 3 | Team 07 - Portfolio / Watchlist / Alerts | `019e3a7a-9f41-7240-84a1-a905365f1b1c` | `gpt-5.3-codex`, high | implementation rework | `CF-W1-L3-ALERT-01` | Team 07 alert worktree only; alerts-monitoring reserved files | active |
| 4 | Team 03 - Architect Signoff | `019e3a78-6f2a-7100-8608-dce4dfc974f9` | `gpt-5.4`, high | architect signoff | `CF-W1-TP-01B` | Team 06 worktree architecture signoff docs only | active |
| 5 | Team 03 - Architecture Factory | `019e3a7e-fcae-7521-8dc4-68e523570d92` | `gpt-5.4`, high | docs-only architecture prep | `CF-W1-CAL-01`, `CF-W1-HCTX-01`, `CF-W1-SQLAB-01` | `03-architecture/`, `06-contracts/`, `08-work-packets/`, Team 03 outbox only | active |
| 6 | Team 10 - Review / Release | `019e3a77-b88e-7ab0-a7e2-e3522a2fc2b0` | `gpt-5.5`, high | release recheck | `CF-W1-NOTIF-02` | Team 09 notification worktree review docs only | active |

## Queued Subagents

| Queue | Team | Launch Trigger | Model / Reasoning | Assignment |
| --- | --- | --- | --- | --- |
| 1 | Team 00 - PO Packet / Commit | Team 03 accepts `CF-W1-TP-01B` Architect Signoff | inherited | delegated PO acceptance packet, exact staged-scope verification, local commit if allowed |
| 2 | Team 04 - QA Factory | Team 07 completes `CF-W1-L3-ALERT-01` bounded rework | `gpt-5.4`, high | alert readiness suppression QA rerun |
| 3 | Team 00 - PO Packet / Commit | Architect signoff passes for a work item | inherited | delegated PO acceptance packet, exact staged-scope verification, local commit if allowed |
| 4 | Team 07 - Portfolio / Watchlist / Alerts | `CF-W1-L3-AUTH-03` is promoted and `CF-W1-L3-ALERT-01` clears shared alerts-monitoring files | `gpt-5.3-codex`, high | alert rule target ownership implementation |
| 5 | Team 09 - Platform / Auth / Subscription / Notifications | `CF-W1-AUTH-01` / `CF-W1-SUB-01` sequencing is promoted | `gpt-5.3-codex`, high | backend-only auth/subscription protected-route slice |
| 6 | Team 03 - Architect Signoff | Team 10 accepts `CF-W1-NOTIF-02` release recheck | `gpt-5.4`, high | notification redaction architecture signoff |
| 7 | Team 03 - Architecture Factory | Team 02 discovers another high-value requirement and an active slot opens | `gpt-5.4`, high | next architecture prep packet |

## Current Ready Teams

- Team 02 is active as persistent PO + Requirements value-discovery lane.
- Team 04 is active for QA-plan consolidation on narrowed Market Data and combined Copilot packets.
- Team 03 is active for architecture prep on `CF-W1-CAL-01`, `CF-W1-HCTX-01`, and `CF-W1-SQLAB-01`.
- Team 07 is active on `CF-W1-L3-ALERT-01` bounded QA rework.
- Team 03 is active on `CF-W1-TP-01B` Architect Signoff after QA and Team 10 acceptance.
- Team 10 is active on `CF-W1-NOTIF-02` release recheck after runtime QA pass.

Status correction after completed agents:

- Team 04 QA-plan consolidation completed; `CF-W1-MD-01` and combined `CF-W1-UX-02` / `CF-W1-UX-05A` are QA-ready for Team 00 Ready evaluation.
- Team 07 alert rework completed; Team 04 alert QA rerun is active.
- Team 03 Trade Plan signoff completed; Team 00 created scoped local commit `8ff22fd` on `codex/team06-strategy-signal/CF-W1-TP-01B`.
- Team 10 notification recheck completed and Team 03 signoff completed; Team 00 created scoped local commit `c77ece7` on `codex/team09-platform/CF-W1-NOTIF-02`.
- Team 05 is active on newly promoted `CF-W1-MD-01` in `codex/team05-market-data/CF-W1-MD-01`.

Updated active snapshot:

| Slot | Team | Agent | Model / Reasoning | Mode | Work Item | Write Scope | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Team 02 - PO + Requirement Factory | `019e3a50-ed56-71f0-bfb6-621445556b85` | `gpt-5.4-mini`, medium | persistent docs-only value discovery | continuous module audits, requirement discovery, and priority reordering | `10-requirements/`, Team 02 outbox only | active / persistent |
| 2 | Team 03 - Architecture Factory | `019e3a7e-fcae-7521-8dc4-68e523570d92` | `gpt-5.4`, high | docs-only architecture prep | `CF-W1-CAL-01`, `CF-W1-HCTX-01`, `CF-W1-SQLAB-01` | `03-architecture/`, `06-contracts/`, `08-work-packets/`, Team 03 outbox only | active |
| 3 | Team 04 - QA Factory | `019e3a80-0700-7373-a66e-c1cbace95b55` | `gpt-5.4`, high | QA rerun | `CF-W1-L3-ALERT-01` | Team 07 alert worktree QA docs only | active |
| 4 | Team 05 - Market Data / Data Quality | `019e3a84-0c18-7420-8bc6-c5dd05464833` | `gpt-5.3-codex`, high | implementation | `CF-W1-MD-01` | Team 05 Market Data worktree only; validator reserved files | active |
| 5 | Open slot | none | pending | queued work | next independent review / QA / implementation task | n/a | open |
| 6 | Open slot | none | pending | queued work | next independent review / QA / implementation task | n/a | open |

Latest active snapshot:

| Slot | Team | Agent | Model / Reasoning | Mode | Work Item | Write Scope | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Team 02 - PO + Requirement Factory | `019e3a50-ed56-71f0-bfb6-621445556b85` | `gpt-5.4-mini`, medium | persistent docs-only value discovery | continuous module audits, requirement discovery, and priority reordering | `10-requirements/`, Team 02 outbox only | active / persistent |
| 2 | Team 03 - Architect Signoff | `019e3a8a-c54d-7413-b247-c88de3852974` | `gpt-5.4`, high | architect signoff | `CF-W1-L3-ALERT-01` | Team 07 alert worktree architecture signoff docs only | active |
| 3 | Team 04 - QA Factory | `019e3a8c-69e3-7c83-8a14-79210734cccb` | `gpt-5.4`, high | QA verification | `CF-W1-MD-01` | Team 05 Market Data worktree QA docs only | active |
| 4 | Open slot | none | pending | queued work | next independent review / QA / implementation task | n/a | open |
| 5 | Open slot | none | pending | queued work | next independent review / QA / implementation task | n/a | open |
| 6 | Open slot | none | pending | queued work | next independent review / QA / implementation task | n/a | open |
- Team 10 completed `CF-W1-NOTIF-02` source review with no source findings; release remains blocked by notification runtime QA.

## Current Waiting Teams

- Team 00 Trade Plan PO packet / scoped commit waits for Team 03 `CF-W1-TP-01B` Architect Signoff.
- Team 04 alert QA waits for Team 07 `CF-W1-L3-ALERT-01` bounded rework.
- Team 10 alert review waits for alert QA.
- Team 09 auth/subscription implementation waits for Team 00 sequencing of `CF-W1-AUTH-01` and `CF-W1-SUB-01`.
- Team 03 notification Architect Signoff waits for Team 10 release recheck acceptance.

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
| Team 10 | `019e3a6a-2ac8-7271-9ef4-2ea9834d10d7` | `CF-W1-NOTIF-02` preaccepted at source-review level with no source findings; release remains blocked until focused Jest runtime QA passes. Closed. |
| Team 04 | `019e3a6a-2a91-79b2-b183-29499a49b592` | `CF-W1-TP-01B` QA rerun passed; focused tests and backend build passed; routed to Team 10 re-review. Closed. |
| Team 07 | `019e3a69-8bd2-77e0-a9b7-ce0e6ea85a40` | `CF-W1-L3-ALERT-01` implementation complete in worktree; initial validation blocked by missing worktree toolchain; dependency link created and routed to Team 04 QA. Closed. |
| Team 05 | `019e3a6f-61d5-7153-8214-615d5db2fd78` | `CF-W1-MD-01` ready-recommended only as narrowed reject-only validation child; routed to Team 03/04 for contract and QA narrowing. Closed. |
| Team 08 | `019e3a6f-6208-7841-b950-853fb3c1b49e` | `CF-W1-UX-02` / `CF-W1-UX-05A` ready-recommended only as one combined Copilot-only backend+frontend slice; routed to Team 03 for packet consolidation. Closed. |
| Team 04 | `019e3a73-5537-72b1-8914-2bc8b8eec25c` | `CF-W1-NOTIF-02` runtime QA passed after dependency-link unblock; focused test and backend build passed; routed to Team 10 release recheck. Closed. |
| Team 10 | `019e3a70-b8e2-75a2-b2ac-7e1cf570caed` | `CF-W1-TP-01B` re-review accepted with no blocking findings; routed to Architect Signoff. Closed. |
| Team 04 | `019e3a73-54b2-7341-94c6-313138baf858` | `CF-W1-L3-ALERT-01` QA rejected because ownership regression was not proven under runnable READY DQ evidence; routed to Team 07 bounded rework. Closed. |
| Team 03 | `019e3a5d-c2d9-7b90-b65d-11b31d4b3999` | Narrowed `CF-W1-MD-01` to reject-only validator child and consolidated `CF-W1-UX-02` / `CF-W1-UX-05A` into one Copilot-only packet; routed to Team 04 QA-plan consolidation. Closed. |
| Team 04 | `019e3a7b-9b97-7073-a2d9-6db28aaf0923` | QA plans updated; narrowed `CF-W1-MD-01` and combined `CF-W1-UX-02` / `CF-W1-UX-05A` are QA-ready for Team 00 Ready evaluation. Closed. |
| Team 03 | `019e3a78-6f2a-7100-8608-dce4dfc974f9` | `CF-W1-TP-01B` Architect Signoff accepted; Team 00 committed `8ff22fd` on the Team 06 branch. Closed. |
| Team 10 | `019e3a77-b88e-7ab0-a7e2-e3522a2fc2b0` | `CF-W1-NOTIF-02` release recheck accepted; routed to Architect Signoff. Closed. |
| Team 03 | `019e3a7d-68ce-7cc3-a8df-1f3b986f5046` | `CF-W1-NOTIF-02` Architect Signoff accepted; Team 00 committed `c77ece7` on the Team 09 branch. Closed. |
| Team 07 | `019e3a7a-9f41-7240-84a1-a905365f1b1c` | `CF-W1-L3-ALERT-01` bounded rework passed developer validation; routed to Team 04 QA rerun. Closed. |

## Stop Conditions

Stop the rolling agent pool only for:

- active subagent limit/resource exhaustion that prevents safe continuation;
- unsafe git state that Team 00 cannot classify;
- all workstreams blocked after Team 02, Team 00, and Team 03 attempt delegated resolution;
- non-delegable paid-service, cloud, credential, broker, live-provider, force-push, or non-`dev` push risk;
- explicit human Product Owner stop.

---

# Latest Active Snapshot

Date: 2026-05-18

## Active Subagent Pool

| Slot | Team | Agent | Mode | Work Item | Status |
| --- | --- | --- | --- | --- | --- |
| 1 | Team 02 - PO + Requirement Factory | `019e3a50-ed56-71f0-bfb6-621445556b85` | persistent docs-only value discovery | continuous module audits, requirement discovery, and priority reordering | active / persistent |
| 2 | Open slot | none | queued work | Team 07 Today Review implementation | ready to spawn |
| 3 | Open slot | none | queued work | Team 04 QA after Today Review handoff | waiting |
| 4 | Open slot | none | queued work | Team 10 review after QA | waiting |
| 5 | Open slot | none | queued work | Team 03 Architect Signoff after review | waiting |
| 6 | Open slot | none | queued work | next architecture/QA prep from Team 02 priority stack | waiting |

## Completed Since Previous Snapshot

- Team 04 `019e3a94-82de-7632-8e95-6e696c168b59`: completed `CF-W1-L3-TREV-01` QA plan.
- Team 10 `019e3a99-3efc-7ad1-b16f-5cab1d3eb9fe`: accepted `CF-W1-MD-01` review/release artifact.
- Team 00 committed `CF-W1-MD-01` on Team 05 branch as `913b56b fix: harden market data validation`.

## Next Spawn

Team 07 should be spawned for:

- Work item: `CF-W1-L3-TREV-01`
- Branch: `codex/team07-portfolio-alerts/CF-W1-L3-TREV-01`
- Worktree: `../investment-scanner-worktrees/team07-CF-W1-L3-TREV-01`
- Prompt source: `16-team-inboxes/TEAM-07-current-assignment.md`

## Teams Ready To Pick Up New Tasks

- Team 07: ready for `CF-W1-L3-TREV-01`.
- Team 04: ready for QA after Today Review implementation handoff.
- Team 10: ready for review after QA evidence exists.
- Team 03: ready for Architect Signoff after Team 10 acceptance.
- Team 02: active and should continue persistent requirement discovery.

---

# Latest Active Snapshot

Date: 2026-05-18

## Active Subagent Pool

No spawned subagent is active at the moment this snapshot is written. Team 06 has completed `CF-W1-SQLAB-01` and has been closed.

## Completed Since Previous Snapshot

- Team 06 `019e3ace-0d5c-7503-a928-ba12a0e5be6a`: completed `CF-W1-SQLAB-01` implementation in the Team 06 worktree. Developer validation passed: `signal-quality-lab.service.test.ts` (`30/30`) and backend build.
- Team 03 `019e3aca-7848-7892-97ff-f3c6e35e64aa`: completed `CF-W1-SQLAB-02` architecture split. Durable storage remains blocked; no-schema child is ready for QA planning only.

## Queued Subagents

| Queue | Team | Launch Trigger | Recommended Model / Reasoning | Assignment |
| --- | --- | --- | --- | --- |
| 1 | Team 04 - QA Verification | immediately | `gpt-5.4`, high | Verify `CF-W1-SQLAB-01` in `../investment-scanner-worktrees/team06-CF-W1-SQLAB-01`. |
| 2 | Team 03 - Architecture Factory | immediately | `gpt-5.4`, high | Prepare architecture review, contract, and work packet for `CF-W1-STRAT-02`. |
| 3 | Team 02 - PO + Requirement Factory | immediately | `gpt-5.4-mini`, medium | Continue persistent module audits, requirement discovery, and priority reordering. |
| 4 | Team 10 - Review / Release | Team 04 accepts `CF-W1-SQLAB-01` | `gpt-5.5`, high | Review `CF-W1-SQLAB-01` implementation and release evidence. |
| 5 | Team 03 - Architect Signoff | Team 10 accepts `CF-W1-SQLAB-01` | `gpt-5.4`, high | Architect Signoff for `CF-W1-SQLAB-01`. |

## Teams Ready To Pick Up New Tasks

- Team 04: `CF-W1-SQLAB-01` QA verification.
- Team 03: `CF-W1-STRAT-02` architecture prep.
- Team 02: persistent PO/Requirements discovery.
- Team 10: idle until the next QA-accepted handoff.
