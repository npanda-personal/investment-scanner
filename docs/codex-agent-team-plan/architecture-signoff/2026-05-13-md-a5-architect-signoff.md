# MD-A5 Architect Signoff

Date: 2026-05-13
Mode: Architect Signoff Mode
Owner: Solution Architect Agent
Work item: MD-A5 - 15-Year History And Free-Source Fallback

## Architecture Review

The solution keeps the application local and free-source only. It does not add paid libraries, paid data providers, broker APIs, hosted services, or commercial free-tier vendor dependency.

Approved architectural outcomes:

- Required history is now a first-class data contract, not a 252-bar shortcut.
- Listing date is used only when present; missing listing date keeps the 15-year target visible.
- Backfill remains bounded and resumable.
- Official NSE EOD fallback is implemented as a free/public-source path with parsing and source provenance.
- BSE parser support exists, while automatic BSE download remains blocked until a stable free official URL/configured manual source is provided.
- Downstream trusted review is fail-closed when the required history window is incomplete.

## Residual Architecture Notes

- Full exchange-file caching and large-scale gap-drain optimization remain future hardening work.
- Corporate-action adjusted history is still a provenance warning; MD-A5 does not claim adjusted-close completeness.
- Full active-universe data completion must run as bounded operational batches with progress, not a single unbounded request.

## Architect Decision

Approved after post-QA Lead validation. The implementation satisfies the MD-A5 architecture contract for enforcing and repairing 15-year/listing-date history coverage without paid services.
