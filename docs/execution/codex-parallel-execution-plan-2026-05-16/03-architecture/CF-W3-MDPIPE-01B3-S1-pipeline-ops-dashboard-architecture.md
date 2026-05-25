# CF-W3-MDPIPE-01B3-S1 - Pipeline Ops Dashboard Architecture

Date: 2026-05-25

Architect: Team 03

Status: Accepted and implemented as first frontend-only slice.

## Decision

Create a new read-only Bulk Pipeline Monitoring and Ops dashboard at `/pipeline-ops` that consumes `GET /api/v1/pipeline/status`.

This slice is frontend-only and does not remove existing page-local bulk controls yet. Existing controls remain until an approved pipeline command API can replace them without removing manual ad hoc capability.

## File Reservation

Allowed:

- `frontend/src/features/pipeline-ops/**`
- `frontend/src/app/routes.tsx`
- `frontend/src/app/navigationMetadata.tsx`
- `frontend/tests/ui/pipeline-ops.spec.ts`
- active execution docs

Forbidden:

- backend source/tests
- Prisma/schema/migrations
- package manifests
- shared UI components/hooks
- existing feature pages
- provider/live calls
- scheduler/startup/fanout behavior

## UI Contract

The dashboard shows module, operation, status, progress, timestamps, counts, warnings/errors, row details, and disabled manual trigger provision pending an approved command API.

Individual feature pages will receive compact status indicators in a later slice.

Next architecture gate:

- define the backend command API and allowed command matrix before any manual trigger can be enabled;
- define the phased removal/migration of existing page-local bulk controls so no current ad hoc capability is stranded;
- reserve compact indicator files per feature page before implementation.
