# Integration Queue

Date: 2026-05-17

## Purpose

The integration queue tracks accepted team output waiting for review, integration, release audit, or downstream unblocking.

## Submission

Implementation teams submit completed work through their outboxes. Review / Release Factory moves accepted items into this queue with:

- requirement id,
- source branch/worktree,
- commit SHA or patch reference,
- files changed,
- tests run,
- QA/review/architecture/PO evidence,
- rollback notes,
- downstream impact.

## Orchestrator Integration

Team 0 verifies:

- staged/integrated files match approved scope,
- no conflict with other team work,
- no forbidden files changed,
- release evidence exists,
- downstream queues are updated.

## Conflict Handling

If integration conflicts:

1. Stop only affected items.
2. Sequence or rebase if safe.
3. Create a Decision Packet only if shared/high-risk or semantic conflict remains.
4. Continue unrelated integration items.

## Rollback Notes

Every integrated item must record:

- local commit SHA,
- files changed,
- how to revert if unpushed,
- why committed work must not be reverted without human approval.

## Downstream Unblocking

Downstream modules are unblocked only when:

- upstream contract is accepted,
- implementation and tests pass,
- Review / Release accepts,
- active board and ready queue are updated.
