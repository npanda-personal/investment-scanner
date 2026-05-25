# CF-W3-MDPIPE-01B3 - Bulk Pipeline Ops Dashboard Requirement

Date: 2026-05-25

Owner: Team 00 / Team 08 / Team 03 / Team 04

Status: Requirement captured. Not Ready for implementation until UX, architecture, QA, and route/frontend reservations are accepted.

## Product Direction

Bulk operation controls should not be scattered across individual feature pages.

Create a dedicated Ops-style Bulk Pipeline Dashboard for monitoring and operations.

## User Value

As an investor/trader running a local app, I need one operational screen where I can monitor automated data load and downstream processing status, see progress for each module/op, and manually trigger supported bulk operations when needed.

## Required Dashboard Columns / Fields

- module name
- operation name
- status
- progress
- last run date/time
- started/completed date/time
- success/partial/fail/skipped counts
- warnings/errors
- manual trigger provision where safe and approved

## Feature Page Direction

Individual screens should only show a compact progress/status indicator so the user knows backend pipeline freshness is running or stale. Feature pages should not own full bulk operation controls.

## Non-Goals For First UI Slice

- No new manual trigger endpoint until architecture approves the command contract.
- No provider/live call from UI status rendering.
- No broad shared UI component unless Team 00 reserves it.
- No route/navigation change without explicit frontend route reservation.
