# Market Data Price Backfill Drain PO Acceptance - 2026-05-13

## Work Item

MD-A5 hotfix: price backfill no-progress drain fix.

## Product Owner Decision

Status: `Accepted`

Product acceptance reason:

The fix improves Market Data availability without lowering trust. Automatic repair runs will no longer repeatedly spend capacity on Yahoo zero-row/provider-error stocks, those rows remain blocked for approved free official/public fallback, and the queue can advance to other supported stocks.

## Acceptance Boundary

Accepted for this specific bug only. The broader Market Data Foundation is not yet considered fully product-ready, and the local stock universe is not fully populated. Rows with Yahoo zero-row/provider-error outcomes must remain `NOT_READY` until completed by approved free official/public sources and must stay blocked from downstream signal, decision, review, and trade workflows.
