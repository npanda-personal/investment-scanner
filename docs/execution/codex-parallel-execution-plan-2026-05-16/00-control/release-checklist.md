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

## CF-W3-MDPIPE-01A - Market Data Official EOD Bulk

Date: 2026-05-25

Status: Accepted and locally committed as `b0c1ab7 feat: add official eod bulk market data sync`.

Evidence:

- Requirement: `10-requirements/CF-W3-MDPIPE-01-incremental-market-data-pipeline-requirement.md`
- Architecture: `03-architecture/CF-W3-MDPIPE-01-incremental-market-data-pipeline-architecture.md`
- QA verification: `04-qa/CF-W3-MDPIPE-01A-qa-verification.md`
- Architect signoff: `03-architecture/CF-W3-MDPIPE-01A-architect-signoff.md`
- PO acceptance: `09-summaries/CF-W3-MDPIPE-01A-po-acceptance-packet.md`
- Release record: `18-integration-queue/CF-W3-MDPIPE-01A-release-record.md`

Validation:

- Focused Market Data tests passed: 3 suites, 196 tests.
- Backend build passed.
- Product-language phrase scan passed.
- `git diff --check` passed with normal CRLF warnings only.

Skipped:

- Live provider/public-download execution.
- Frontend checks.
- Downstream module checks.
