// Price-backfill candidate projection/diagnostics helpers (Phase 5c). Pure functions over
// PriceBackfillCandidate / MarketDataRepairSummary — extracted from RepairPriceBackfillService so
// the price-backfill file stays under the 500-line source cap. Bodies are byte-identical to the
// pre-extraction inline implementation.

import type {
  InstrumentUniverseReadiness,
  MarketDataRepairRequest,
  MarketDataRepairSummary,
  StockSyncTask,
} from '../market-data-foundation.types';
import type { PriceBackfillCandidate } from './market-data-foundation.repair.types';
import { defaultBackfillStartDate as defaultBackfillStartDateUtil } from '../util/market-data-foundation.util.dates';

export function priceBackfillCandidatePriority(readiness: InstrumentUniverseReadiness): number {
  if (!readiness.latestPriceDate) return 0;
  if (readiness.priceHistoryBars < 120) return 1;
  if (readiness.priceHistoryBars < 200) return 2;
  if (readiness.priceHistoryBars < 252) return 3;
  if (readiness.readinessBlockers.includes('STALE_LATEST_PRICE')) return 4;
  return 5;
}

export function historyStartDate(requiredHistoryStartDate: string, latestCompletedDate: string): Date {
  const start = new Date(`${requiredHistoryStartDate}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime())) return defaultBackfillStartDateUtil(latestCompletedDate);
  start.setUTCHours(0, 0, 0, 0);
  return start;
}

export function priceBackfillFetchPlan(
  candidate: PriceBackfillCandidate,
  latestCompletedDate: string,
  request: MarketDataRepairRequest
): { stock: any; mode: 'DEEP' | 'INCREMENTAL'; startDate: Date } {
  const forceDeep = request.fullReload === true || request.policy === 'FORCE_DEEP';
  const missingRequiredHistoryStart = !candidate.historyDiagnostics.storedHistoryStartDate
    || candidate.historyDiagnostics.storedHistoryStartDate > candidate.historyDiagnostics.requiredHistoryStartDate;
  const needsDeepHistory = forceDeep
    || !candidate.readiness.latestPriceDate
    || candidate.readiness.priceHistoryBars < 252
    || missingRequiredHistoryStart;

  if (needsDeepHistory) {
    return {
      stock: candidate.stock,
      mode: 'DEEP',
      startDate: historyStartDate(candidate.historyDiagnostics.requiredHistoryStartDate, latestCompletedDate),
    };
  }

  const latestStoredMinusOverlap = new Date(`${candidate.readiness.latestPriceDate}T00:00:00.000Z`);
  latestStoredMinusOverlap.setUTCDate(latestStoredMinusOverlap.getUTCDate() - 7);
  const latestCompletedMinusCatchUpWindow = new Date(`${latestCompletedDate}T00:00:00.000Z`);
  latestCompletedMinusCatchUpWindow.setUTCDate(latestCompletedMinusCatchUpWindow.getUTCDate() - 30);
  const startDate = latestStoredMinusOverlap > latestCompletedMinusCatchUpWindow
    ? latestStoredMinusOverlap
    : latestCompletedMinusCatchUpWindow;
  startDate.setUTCHours(0, 0, 0, 0);

  return {
    stock: candidate.stock,
    mode: 'INCREMENTAL',
    startDate,
  };
}

export function priceBackfillCandidateTask(candidate: PriceBackfillCandidate): StockSyncTask {
  const stock = candidate.stock;
  return {
    id: String(stock.id),
    symbol: String(stock.symbol),
    exchange: stock.exchange ?? null,
    providerSymbol: stock.providerSymbol ?? null,
    sourceSymbol: stock.sourceSymbol ?? null,
    displaySymbol: stock.displaySymbol ?? null,
    lastSuccessfulDataLoadTimestamp: stock.lastSuccessfulDataLoadTimestamp ?? null,
    latestStoredTimestamp: candidate.readiness.latestPriceDate
      ? new Date(`${candidate.readiness.latestPriceDate}T00:00:00.000Z`)
      : null,
  };
}

export function filterPriceBackfillCandidatesForPolicy(
  candidates: PriceBackfillCandidate[],
  policy: MarketDataRepairRequest['policy'],
  latestCompletedDate: string | null
): PriceBackfillCandidate[] {
  if (policy !== 'INCREMENTAL_LATEST_ONLY') return candidates;
  if (!latestCompletedDate) return [];
  return candidates.filter((candidate) => Boolean(
    candidate.readiness.latestPriceDate
    && candidate.readiness.latestPriceDate < latestCompletedDate
  ));
}

export function assignPriceBackfillDepthDiagnostics(summary: MarketDataRepairSummary, candidates: PriceBackfillCandidate[]) {
  summary.stillUnder120 = candidates.filter((candidate) => candidate.readiness.priceHistoryBars < 120).length;
  summary.stillUnder200 = candidates.filter((candidate) => candidate.readiness.priceHistoryBars < 200).length;
  summary.stillUnder252 = candidates.filter((candidate) => candidate.readiness.priceHistoryBars < 252).length;
  summary.historyCoverageIncomplete = candidates.filter((candidate) => !candidate.historyDiagnostics.requiredHistoryComplete).length;
  summary.historyCoverageListingDateMissing = candidates.filter((candidate) => candidate.historyDiagnostics.listingDateMissing).length;
  const requiredStarts = candidates
    .map((candidate) => candidate.historyDiagnostics.requiredHistoryStartDate)
    .filter(Boolean)
    .sort();
  if (requiredStarts.length > 0) summary.requiredHistoryStartDate = requiredStarts[0];
  summary.requiredHistoryCoverageStatus = (summary.historyCoverageFallbackRequired || 0) > 0
    ? 'FALLBACK_REQUIRED'
    : (summary.historyCoverageIncomplete || 0) > 0
      ? 'NEEDS_BACKFILL'
      : 'COMPLETE';
}

export function addPriceBackfillCoverageSample(
  summary: MarketDataRepairSummary,
  candidate: PriceBackfillCandidate,
  sourceFallbackReason: string | null
) {
  if (!summary.sampleCoverageResults) summary.sampleCoverageResults = [];
  if (summary.sampleCoverageResults.length >= 20) return;
  const diagnostics = candidate.historyDiagnostics;
  summary.sampleCoverageResults.push({
    symbol: candidate.stock.symbol,
    requiredHistoryStartDate: diagnostics.requiredHistoryStartDate,
    requiredHistoryEndDate: diagnostics.latestCompletedEodDate,
    listingDate: diagnostics.listingDate,
    listingDateMissing: diagnostics.listingDateMissing,
    storedHistoryStartDate: diagnostics.storedHistoryStartDate,
    storedHistoryEndDate: diagnostics.storedHistoryEndDate,
    storedHistoryBars: diagnostics.storedHistoryBars,
    requiredHistoryMinimumBars: diagnostics.requiredHistoryMinimumBars,
    storedHistoryCoveragePercent: diagnostics.storedHistoryCoveragePercent,
    requiredHistoryComplete: diagnostics.requiredHistoryComplete,
    coverageStatus: diagnostics.requiredHistoryComplete ? 'COMPLETE' : 'NEEDS_BACKFILL',
    sourceFallbackReason,
  });
}
