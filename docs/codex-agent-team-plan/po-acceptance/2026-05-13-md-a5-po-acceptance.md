# MD-A5 PO Acceptance

Date: 2026-05-13
Mode: PO Acceptance Mode
Owner: Product Owner Agent
Work item: MD-A5 - 15-Year History And Free-Source Fallback

## Product Acceptance Review

PO accepts the MD-A5 implementation scope because the product no longer treats shallow data as acceptable for investor/trader workflows.

Accepted outcomes:

- Every active `IN / STOCK` now has a hard expected standard: 15 years of daily OHLCV through latest completed EOD, or listing-date-to-latest for newer listings.
- A company with less than 15 years of life is evaluated from listing date when listing date is known.
- Missing listing date does not reduce the target; it remains visible as a coverage/data blocker.
- Sparse 252-bar or boundary-only history cannot enter trusted review as complete.
- Yahoo insufficiency is not final; free official/public fallback mechanics are present.
- The UI shows incomplete coverage, listing-date gaps, fallback-required states, and sample evidence.

## Product Caveat

Acceptance is for the implementation and workflow gate. It is not a claim that the local database has already been fully populated for every active stock. The Market Data module must continue bounded repair runs until remaining history gaps are drained or classified with precise free-source/listing-date/identity/source-availability blockers.

## PO Decision

Accepted for GitHub check-in.
