#!/usr/bin/env bash
# run-us-post-backfill.sh — run the US ingestion stages that depend on prices,
# SEQUENTIALLY (one Prisma pool at a time → safe under the 20-connection ceiling).
# Launch AFTER the full-universe price backfill (seed-us-universe --all-backfill) finishes.
#
#   cd backend && nohup bash scripts/run-us-post-backfill.sh > logs/us-post-backfill.log 2>&1 &
#
# Idempotent: every stage upserts. Continues on per-stage failure so one bad stage
# doesn't block the rest; the final validation report reveals any gaps.
set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

# Reduced connection footprint (shared 20-cap with other agents' pools).
export DATABASE_URL="$(grep '^DATABASE_URL=' .env | sed 's/^DATABASE_URL=//; s/^"//; s/"$//; s/connection_limit=10/connection_limit=5/')"
export MARKET_DATA_US_PROVIDER_ENABLED=true
export SEC_EDGAR_USER_AGENT="${SEC_EDGAR_USER_AGENT:-investment-scanner research (contact: admin@example.com)}"

TS="npx ts-node --transpile-only"
step() { echo "═══ [$(date '+%H:%M:%S')] STAGE: $1 ═══"; }

step "1/6 fundamentals (full universe)"
$TS scripts/seed-us-fundamentals.ts --limit=20000 || echo "WARN: fundamentals stage exited non-zero"

step "2/6 earnings dates (full)"
EARN_LIMIT=20000 $TS scripts/seed-us-earnings.ts || echo "WARN: earnings stage exited non-zero"

step "3/6 institutional 13F (full quarter) + Form 4 (liquid subset)"
$TS scripts/seed-us-institutional.ts --13f-only || echo "WARN: 13F stage exited non-zero"
# Form 4 per-issuer is SEC-throttle-heavy; cap to the most-traded names to keep runtime sane.
$TS scripts/seed-us-institutional.ts --form4-only --limit=2000 || echo "WARN: Form4 stage exited non-zero"

step "4/6 signals (full eligible universe)"
GEN_REGION=US GEN_CAP=20000 $TS scripts/generate-us-signals.ts || echo "WARN: signals stage exited non-zero"

step "5/6 downstream region snapshots"
GEN_REGION=US $TS scripts/populate-region-snapshots.ts || echo "WARN: snapshots stage exited non-zero"

step "6/6 VALIDATION"
$TS scripts/validate-us-ingestion.ts
VALIDATION_EXIT=$?

echo "═══ POST-BACKFILL COMPLETE (validation exit=$VALIDATION_EXIT) ═══"
exit $VALIDATION_EXIT
