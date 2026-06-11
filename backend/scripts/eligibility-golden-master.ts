/**
 * eligibility-golden-master.ts
 *
 * Compares legacy eligibility verdicts against the new instrument_eligibility
 * verdicts for the latest tradingDate in the universe (IN / STOCK).
 *
 * Verdicts compared:
 *
 *   signal:
 *     legacy = DataQualityEvaluation.eligibleForSignals (readinessScore>=70 && !stale)
 *              AND (if mainboard: catalogSource==='NSE_EQUITY_SECURITIES' → hasFundamentals)
 *     new    = instrument_eligibility.signalEligible
 *
 *   backtest:
 *     legacy = DataQualityEvaluation.eligibleForBacktesting (priceCount>=252 && !stale)
 *     new    = instrument_eligibility.backtestEligible
 *
 *   review:
 *     legacy = membership in MarketDataFoundationService.listTrustedReviewUniverseInstruments()
 *              (hard cuts: providerSupported, latestPriceDate >= expectedLatestTradingDate,
 *               priceHistoryBars >= 120, hasRecentVolume, not inactive/delisted)
 *     new    = instrument_eligibility.reviewEligible
 *
 * Output (per verdict): total, agreements, new-yes/legacy-no, new-no/legacy-yes,
 * plus ≤10 samples each with symbol + new reason codes + legacy fields.
 *
 * Usage (from backend/):
 *   npx ts-node scripts/eligibility-golden-master.ts
 */

import prisma from '../src/db/prisma';
import { MarketDataFoundationService } from '../src/modules/market-data-foundation/market-data-foundation.service';

// ── Types ────────────────────────────────────────────────────────────────────

interface EligRow {
  instrumentId: string;
  tradingDate: Date;
  signalEligible: boolean;
  backtestEligible: boolean;
  reviewEligible: boolean;
  signalReasons: string[];
  backtestReasons: string[];
  reviewReasons: string[];
  readinessScore: number;
  readinessStatus: string;
  priceBars: number;
  staleSessions: number;
  hasFundamentals: boolean;
  liquidityScore: number;
}

interface DqeRow {
  instrumentId: string;
  symbol: string;
  eligibleForSignals: boolean;
  eligibleForBacktesting: boolean;
  signalReadinessScore: number;
}


interface DisagreementSample {
  symbol: string;
  newReasonCodes: string[];
  readinessScore: number;
  staleSessions: number;
  priceBars: number;
  hasFundamentals: boolean;
  liquidityScore: number;
  // legacy
  legacyEligible: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function padEnd(s: string, n: number) { return s.padEnd(n); }
function padStart(s: string, n: number) { return s.padStart(n); }

function printVerdict(
  label: string,
  total: number,
  agreements: number,
  newYesLegacyNo: DisagreementSample[],
  newNoLegacyYes: DisagreementSample[],
) {
  const disagreements = newYesLegacyNo.length + newNoLegacyYes.length;
  const agreementPct = total > 0 ? ((agreements / total) * 100).toFixed(1) : '0.0';

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`  VERDICT: ${label.toUpperCase()}`);
  console.log(`${'═'.repeat(70)}`);
  console.log(`  Total instruments:       ${padStart(String(total), 6)}`);
  console.log(`  Agreements:              ${padStart(String(agreements), 6)}  (${agreementPct}%)`);
  console.log(`  Disagreements (total):   ${padStart(String(disagreements), 6)}`);
  console.log(`    new=YES / legacy=NO:   ${padStart(String(newYesLegacyNo.length), 6)}  (new grants more than legacy)`);
  console.log(`    new=NO  / legacy=YES:  ${padStart(String(newNoLegacyYes.length), 6)}  (new is stricter than legacy)`);

  function printSamples(heading: string, samples: DisagreementSample[]) {
    const shown = samples.slice(0, 10);
    if (shown.length === 0) return;
    console.log(`\n  ${heading} (showing up to 10 of ${samples.length}):`);
    console.log(`  ${'─'.repeat(66)}`);
    for (const s of shown) {
      const reasons = s.newReasonCodes.length > 0 ? s.newReasonCodes.join(', ') : '(none)';
      console.log(`  ${padEnd(s.symbol, 16)} score=${padStart(String(s.readinessScore), 3)} stale=${padStart(String(s.staleSessions), 2)} bars=${padStart(String(s.priceBars), 4)} hasFund=${String(s.hasFundamentals).padEnd(5)} liq=${padStart(String(s.liquidityScore), 3)}`);
      console.log(`    new reasons: ${reasons}`);
    }
  }

  printSamples('new=YES / legacy=NO (new grants access legacy did not)', newYesLegacyNo);
  printSamples('new=NO / legacy=YES (new blocks access legacy allowed)', newNoLegacyYes);
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n=== eligibility-golden-master ===\n');

  // ── 1. Fetch latest instrument_eligibility rows ───────────────────────────

  console.log('Loading instrument_eligibility rows...');
  const latestDateRow = await prisma.instrumentEligibility.findFirst({
    orderBy: { tradingDate: 'desc' },
    select: { tradingDate: true },
  });
  if (!latestDateRow) {
    console.error('No rows in instrument_eligibility — run the backfill first.');
    process.exit(1);
  }
  const latestTradingDate = latestDateRow.tradingDate;
  console.log(`Latest tradingDate: ${latestTradingDate.toISOString().slice(0, 10)}`);

  const eligibilityRows = await prisma.instrumentEligibility.findMany({
    where: { tradingDate: latestTradingDate },
    select: {
      instrumentId: true,
      tradingDate: true,
      signalEligible: true,
      backtestEligible: true,
      reviewEligible: true,
      signalReasons: true,
      backtestReasons: true,
      reviewReasons: true,
      readinessScore: true,
      readinessStatus: true,
      priceBars: true,
      staleSessions: true,
      hasFundamentals: true,
      liquidityScore: true,
    },
  });
  console.log(`Loaded ${eligibilityRows.length} eligibility rows for ${latestTradingDate.toISOString().slice(0, 10)}`);

  const eligByInstrumentId = new Map<string, EligRow>(
    eligibilityRows.map((r) => [r.instrumentId, {
      ...r,
      signalReasons: (r.signalReasons ?? []) as string[],
      backtestReasons: (r.backtestReasons ?? []) as string[],
      reviewReasons: (r.reviewReasons ?? []) as string[],
    }])
  );

  // ── 2. Fetch legacy DQE evaluations ──────────────────────────────────────

  console.log('Loading DataQualityEvaluation rows (legacy)...');
  // Fetch latest evaluation per instrument (by evaluatedAt desc), only for
  // instruments that have an eligibility row.
  const instrumentIds = [...eligByInstrumentId.keys()];

  // Batch the DQE fetch in chunks to avoid hitting IN-clause limits
  const DQE_CHUNK = 1000;
  const dqeRows: DqeRow[] = [];
  for (let i = 0; i < instrumentIds.length; i += DQE_CHUNK) {
    const chunk = instrumentIds.slice(i, i + DQE_CHUNK);
    const rows = await (prisma as any).dataQualityEvaluation.findMany({
      where: { instrumentId: { in: chunk } },
      select: {
        instrumentId: true,
        symbol: true,
        eligibleForSignals: true,
        eligibleForBacktesting: true,
        signalReadinessScore: true,
      },
      orderBy: { evaluatedAt: 'desc' },
    });
    // De-dup: keep latest row per instrumentId
    const seen = new Set<string>();
    for (const row of rows) {
      if (!seen.has(row.instrumentId)) {
        seen.add(row.instrumentId);
        dqeRows.push(row as DqeRow);
      }
    }
  }
  console.log(`Loaded ${dqeRows.length} DQE rows`);

  const dqeByInstrumentId = new Map<string, DqeRow>(
    dqeRows.map((r) => [r.instrumentId, r])
  );

  // ── 3. Fetch stocks for catalogSource (mainboard gate) + symbol ───────────

  console.log('Loading stocks (catalogSource + symbol)...');
  const stockRows = await (prisma as any).$queryRawUnsafe(
    `SELECT id, symbol, "catalogSource" FROM stocks WHERE "assetType"='STOCK' AND region='IN'`
  ) as Array<{ id: string; symbol: string; catalogSource: string | null }>;
  const stockById = new Map<string, { symbol: string; catalogSource: string | null }>(
    stockRows.map((s) => [s.id, { symbol: s.symbol, catalogSource: s.catalogSource }])
  );
  console.log(`Loaded ${stockById.size} stocks`);

  // ── 4. Build legacy review universe (via listTrustedReviewUniverseInstruments) ─

  console.log('\nBuilding legacy review universe (calling listTrustedReviewUniverseInstruments)...');
  console.log('(This may take 15-60 seconds for the full universe scan)');
  const mdf = new MarketDataFoundationService();
  const legacyReviewIds = new Set<string>();

  // Page through the full trusted universe
  const PAGE_SIZE = 500;
  let offset = 0;
  let pageNum = 0;
  while (true) {
    pageNum += 1;
    const page = await mdf.listTrustedReviewUniverseInstruments({
      region: 'IN',
      assetType: 'STOCK',
      limit: PAGE_SIZE,
      offset,
    });
    if (page.length === 0) break;
    for (const item of page) {
      legacyReviewIds.add(String(item.id));
    }
    offset += page.length;
    if (page.length < PAGE_SIZE) break;
    if (pageNum > 20) {
      console.warn('WARNING: pagination exceeded 20 pages, stopping');
      break;
    }
  }
  console.log(`Legacy review universe size: ${legacyReviewIds.size} instruments`);

  // ── 5. Compute comparisons ────────────────────────────────────────────────

  // For signal: legacy = DQE.eligibleForSignals && (isMainboard ? hasFundamentals : true)
  // For backtest: legacy = DQE.eligibleForBacktesting
  // For review: legacy = membership in legacyReviewIds

  let signalAgree = 0, signalNewYesLegacyNo = 0, signalNewNoLegacyYes = 0;
  let backtestAgree = 0, backtestNewYesLegacyNo = 0, backtestNewNoLegacyYes = 0;
  let reviewAgree = 0, reviewNewYesLegacyNo = 0, reviewNewNoLegacyYes = 0;

  const signalNewYesLegacyNoSamples: DisagreementSample[] = [];
  const signalNewNoLegacyYesSamples: DisagreementSample[] = [];
  const backtestNewYesLegacyNoSamples: DisagreementSample[] = [];
  const backtestNewNoLegacyYesSamples: DisagreementSample[] = [];
  const reviewNewYesLegacyNoSamples: DisagreementSample[] = [];
  const reviewNewNoLegacyYesSamples: DisagreementSample[] = [];

  let noLegacyDqeCount = 0;
  let total = 0;

  for (const [instrumentId, elig] of eligByInstrumentId) {
    total += 1;
    const stock = stockById.get(instrumentId);
    const dqe = dqeByInstrumentId.get(instrumentId);
    const symbol = stock?.symbol ?? dqe?.symbol ?? instrumentId;

    if (!dqe) {
      noLegacyDqeCount += 1;
      // No legacy data — treat as legacy=false for all verdicts
    }

    const isMainboard = stock?.catalogSource === 'NSE_EQUITY_SECURITIES';

    // signal legacy: dqe.eligibleForSignals AND (mainboard → hasFundamentals)
    const legacySignal = dqe
      ? dqe.eligibleForSignals && (!isMainboard || elig.hasFundamentals)
      : false;
    const newSignal = elig.signalEligible;

    // backtest legacy: dqe.eligibleForBacktesting
    const legacyBacktest = dqe ? dqe.eligibleForBacktesting : false;
    const newBacktest = elig.backtestEligible;

    // review legacy: membership in trusted universe
    const legacyReview = legacyReviewIds.has(instrumentId);
    const newReview = elig.reviewEligible;

    const makeSample = (reasons: string[]): DisagreementSample => ({
      symbol,
      newReasonCodes: reasons,
      readinessScore: elig.readinessScore,
      staleSessions: elig.staleSessions,
      priceBars: elig.priceBars,
      hasFundamentals: elig.hasFundamentals,
      liquidityScore: elig.liquidityScore,
      legacyEligible: false, // set by caller
    });

    // signal
    if (newSignal === legacySignal) {
      signalAgree += 1;
    } else if (newSignal && !legacySignal) {
      signalNewYesLegacyNo += 1;
      if (signalNewYesLegacyNoSamples.length < 10) {
        signalNewYesLegacyNoSamples.push({ ...makeSample(elig.signalReasons), legacyEligible: false });
      }
    } else {
      signalNewNoLegacyYes += 1;
      if (signalNewNoLegacyYesSamples.length < 10) {
        signalNewNoLegacyYesSamples.push({ ...makeSample(elig.signalReasons), legacyEligible: true });
      }
    }

    // backtest
    if (newBacktest === legacyBacktest) {
      backtestAgree += 1;
    } else if (newBacktest && !legacyBacktest) {
      backtestNewYesLegacyNo += 1;
      if (backtestNewYesLegacyNoSamples.length < 10) {
        backtestNewYesLegacyNoSamples.push({ ...makeSample(elig.backtestReasons), legacyEligible: false });
      }
    } else {
      backtestNewNoLegacyYes += 1;
      if (backtestNewNoLegacyYesSamples.length < 10) {
        backtestNewNoLegacyYesSamples.push({ ...makeSample(elig.backtestReasons), legacyEligible: true });
      }
    }

    // review
    if (newReview === legacyReview) {
      reviewAgree += 1;
    } else if (newReview && !legacyReview) {
      reviewNewYesLegacyNo += 1;
      if (reviewNewYesLegacyNoSamples.length < 10) {
        reviewNewYesLegacyNoSamples.push({ ...makeSample(elig.reviewReasons), legacyEligible: false });
      }
    } else {
      reviewNewNoLegacyYes += 1;
      if (reviewNewNoLegacyYesSamples.length < 10) {
        reviewNewNoLegacyYesSamples.push({ ...makeSample(elig.reviewReasons), legacyEligible: true });
      }
    }
  }

  // ── 6. Print results ──────────────────────────────────────────────────────

  console.log(`\n=== GOLDEN MASTER REPORT ===`);
  console.log(`TradingDate: ${latestTradingDate.toISOString().slice(0, 10)}`);
  console.log(`Total instruments in eligibility table: ${total}`);
  console.log(`Instruments with no legacy DQE row: ${noLegacyDqeCount}`);
  console.log(`Legacy review universe (listTrustedReviewUniverse): ${legacyReviewIds.size}`);

  // Signal
  printVerdict(
    'SIGNAL',
    total,
    signalAgree,
    signalNewYesLegacyNoSamples,
    signalNewNoLegacyYesSamples,
  );
  // Extra stats for signal
  console.log(`\n  [Signal detail]`);
  console.log(`  new=YES / legacy=NO: ${signalNewYesLegacyNo}  (new grants more than legacy)`);
  console.log(`  new=NO  / legacy=YES: ${signalNewNoLegacyYes}  (new is stricter than legacy)`);

  // Backtest
  printVerdict(
    'BACKTEST',
    total,
    backtestAgree,
    backtestNewYesLegacyNoSamples,
    backtestNewNoLegacyYesSamples,
  );
  console.log(`\n  [Backtest detail]`);
  console.log(`  new=YES / legacy=NO: ${backtestNewYesLegacyNo}`);
  console.log(`  new=NO  / legacy=YES: ${backtestNewNoLegacyYes}`);

  // Review
  printVerdict(
    'REVIEW',
    total,
    reviewAgree,
    reviewNewYesLegacyNoSamples,
    reviewNewNoLegacyYesSamples,
  );
  console.log(`\n  [Review detail]`);
  console.log(`  new=YES / legacy=NO: ${reviewNewYesLegacyNo}`);
  console.log(`  new=NO  / legacy=YES: ${reviewNewNoLegacyYes}`);

  // ── 7. Overall summary table ───────────────────────────────────────────────

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`  SUMMARY TABLE`);
  console.log(`${'═'.repeat(70)}`);
  console.log(`  ${'Verdict'.padEnd(12)} ${'Total'.padStart(7)} ${'Agree'.padStart(7)} ${'Agree%'.padStart(7)} ${'new>leg'.padStart(8)} ${'leg>new'.padStart(8)}`);
  console.log(`  ${'─'.repeat(57)}`);
  for (const [label, agree, nyln, nlyn] of [
    ['signal', signalAgree, signalNewYesLegacyNo, signalNewNoLegacyYes],
    ['backtest', backtestAgree, backtestNewYesLegacyNo, backtestNewNoLegacyYes],
    ['review', reviewAgree, reviewNewYesLegacyNo, reviewNewNoLegacyYes],
  ] as Array<[string, number, number, number]>) {
    const agreeStr = String(agree);
    const agreePct = total > 0 ? ((agree / total) * 100).toFixed(1) + '%' : '0.0%';
    console.log(`  ${label.padEnd(12)} ${padStart(String(total), 7)} ${padStart(agreeStr, 7)} ${padStart(agreePct, 7)} ${padStart(String(nyln), 8)} ${padStart(String(nlyn), 8)}`);
  }
  console.log(`${'═'.repeat(70)}\n`);
}

main()
  .catch((err) => {
    console.error('[eligibility-golden-master] Fatal:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
