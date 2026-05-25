# CF-W3-MDPIPE-01B2 - Pipeline Status API QA Plan

Date: 2026-05-25

Owner: Team 04 / Team 00

Status: Executed.

## QA Checks

- Router registers only `GET /pipeline/status`.
- Query parsing defaults to `IN/STOCK/1d` and rejects invalid limits or oversized stage allowlists.
- Controller returns `Cache-Control: no-store`.
- Empty ledger is valid and returns null active/last run with empty stages.
- Service groups active and terminal stage evidence by stage key.
- Repository reads are bounded and scope-filtered.
- API path is read-only and does not call create/update/lease/complete paths.

## Evidence

```powershell
cd backend
npm.cmd test -- pipeline-orchestration --runInBand
npm.cmd run build
```

Results:

- Pipeline orchestration tests passed: 5 suites / 17 tests.
- Backend build passed.
