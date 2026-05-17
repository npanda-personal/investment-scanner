# Local-First Release Checklist

This checklist is for future accepted requirements. Sprint 0 artifact creation is planning-only and does not release product behavior.

## Default Policy

- Local commit evidence is allowed only after Product Owner acceptance.
- GitHub push is optional and disabled by default.
- Push requires explicit Product Owner approval.
- Do not commit unrelated local changes.
- Do not commit rejected or unaccepted work.
- Do not commit `.env`, secrets, database dumps, credentials, or generated sensitive artifacts.

## Required Gates

1. Product Owner-approved requirement.
2. Architecture contract.
3. UX plan if user-facing.
4. QA verification plan.
5. Orchestrator work packet with file reservations.
6. Developer self-check.
7. QA verification.
8. Code Review / Lead validation.
9. Architect signoff.
10. Product Owner acceptance.
11. Release audit.

## Evidence Required

- Files changed.
- Files intentionally excluded.
- Tests/builds/UI checks run.
- Skipped checks and reasons.
- Data correctness evidence where applicable.
- Local/free constraint confirmation.
- Rollback notes.
- Local commit SHA if committed.
- GitHub push evidence only if explicitly approved.

## Release Decision

No requirement is released until Product Owner acceptance and release evidence are recorded in the active execution plan.
