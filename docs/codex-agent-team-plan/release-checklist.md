# Release Checklist

Use this checklist before treating an accepted requirement, batch, or set of changes as released.

## Release Scope

- Release name/date:
- Included work items:
- Deferred work items:
- Modules affected:

## Required Signoffs

- QA evidence recorded:
- Post-QA Lead validation:
- Post-QA Architect signoff after Lead validation:
- Product Owner acceptance:

## GitHub Check-In

- Check-in owner:
- Active branch:
- Pushed remote:
- Commit SHA:
- Files committed:
- Scoped-staging confirmation:
- Unsafe/unaccepted-file exclusion confirmation:
- Rollback notes:
- Unrelated local changes excluded:
- Rejected or unaccepted work excluded:
- Secrets, `.env`, database dumps, and generated artifacts excluded:
- CI status/link, if available:

## Verification

- Backend tests:
- Frontend build/typecheck:
- Playwright UI smoke tests:
- Live-data validation:
- Manual browser checks:
- Dependency/security checks:

## Data And Migration

- Prisma/schema changes:
- Data repair scripts:
- Backup needed:
- Rollback data path:
- Irreversible changes:

## Docs

- Module docs updated:
- Architecture docs updated:
- Roadmap/priority docs updated:
- Decision records added:
- Debt/blockers recorded:

## Rollback

- Code rollback path:
- Config/env rollback path:
- Database/data rollback path:
- Post-rollback validation:

## Release Decision

- Release status: Ready / Blocked / Deferred
- Release owner:
- Date:
- Notes:
