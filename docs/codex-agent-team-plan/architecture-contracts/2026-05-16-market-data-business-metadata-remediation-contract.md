# 2026-05-16 PO+Architect Remediation Contract: IN/STOCK Business Metadata Blockers

## Scope and Goal
- **In scope:** Remediate remaining **577 IN/STOCK business metadata blockers** (instrument identity, company/business fields, taxonomy/classification fields, and tradability metadata required for trusted downstream use).
- **Out of scope:** Price-history acquisition/drain logic changes, signal logic changes, strategy logic changes, trade execution changes.
- **Goal:** Raise trusted business metadata coverage/quality enough to unblock downstream workflows in a controlled, auditable way.

## Hard Constraints
- No paid data providers.
- No secrets, no private credentials, no account-bound scraping.
- Angel One scrip master is **identity-only**; do not treat it as authoritative business metadata.
- Yahoo data may be used as **best-effort enrichment only**, never as sole trust basis for critical business fields.
- Existing manual import endpoints already exist and must be used for curated corrections.
- Signals/strategy/trades remain **blocked** until acceptance criteria are met.

## Allowed Sources
1. Existing internal symbol master tables and reconciliation artifacts already in repo/db.
2. Angel One scrip master for identity joins (token/symbol/exchange mapping only).
3. NSE/BSE public reference files/pages that are free and legally accessible.
4. SEBI/public issuer disclosures for company identity/classification support.
5. Yahoo public metadata as non-authoritative fallback/enrichment.
6. Manually curated imports via existing manual import endpoints with operator evidence.

## Forbidden Sources and Actions
- Any paid/licensed commercial provider.
- Any source requiring secrets or personal/API credentials not already approved.
- DOM-fragile or rate-abusive scraping.
- Provider-heavy bulk pull jobs during this remediation.
- Marking downstream readiness `green` before trust thresholds are met.
- Editing active-work-board, operations report, QA evidence, or backend code under this contract.

## Remediation Strategy (Batched)
1. **Batch A (Top-risk first, ~150):**
   - Securities currently referenced by watchlists/screeners/near-term strategy candidates.
   - Resolve identity collisions, missing sector/industry, and issuer-name inconsistencies.
2. **Batch B (Next ~200):**
   - High-volume and high-market-cap IN/STOCK instruments not covered in Batch A.
3. **Batch C (Remaining ~227):**
   - Long-tail instruments; complete minimum business metadata contract.

Each batch uses:
- deterministic identity join (Angel One + internal keys),
- business metadata fill from allowed public sources,
- manual import for unresolved/ambiguous records,
- trust tagging (`trusted`, `provisional`, `untrusted`) with provenance note.

## Acceptance Criteria
- 577 blockers triaged into `resolved` / `needs-manual` / `deferred-with-reason`.
- At least **95%** have complete minimum business metadata fields required by contract.
- **0 unresolved identity collisions** in remediated set.
- Every remediated record has provenance (source + timestamp + operator/method).
- Yahoo-only records cannot be tagged `trusted` without corroboration from another allowed source.
- Downstream gate remains blocked unless trust threshold and QA evidence are both present.

## QA Evidence Requirements
- Per-batch reconciliation report: before vs after counts, null-field deltas, collision counts.
- Random sample audit (minimum 30 per batch) with source trace links/refs.
- Exception ledger for `needs-manual` and `deferred-with-reason`.
- Final blocker burn-down table from 577 to residual count with explicit reasons.

## Parallel Run Contract (No File Conflicts)
- This metadata remediation runs in parallel with price-history drains by strict ownership split:
  - **Metadata lane:** only business metadata staging/reconciliation artifacts and manual import payloads.
  - **Price-history lane:** only OHLCV/history drain artifacts and provider validation outputs.
- No shared file edits between lanes in the same PR/commit scope.
- Coordination handshake:
  1. Freeze shared schema assumptions at start of day.
  2. Exchange only immutable export snapshots (read-only handoff).
  3. Merge windows separated by lane to avoid conflict churn.

## Exit Decision
- PO + Architect sign-off only when acceptance criteria and QA evidence are complete.
- Until sign-off, signals/strategy/trades remain blocked by policy.
