import type { MarketScope } from '@/contexts/MarketScopeContext';
import { fetchDataQualitySummary } from '@/features/data-quality-engine';
import type { DataQualitySummary } from '@/features/data-quality-engine';
import {
  fetchSignalPositionLedgerActiveRows,
  type SignalPositionLedgerActiveRow,
} from '@/features/signal-position-ledger';
import {
  todayTradeReviewApi,
  type TodayReviewCandidate,
  type TodayReviewResponse,
} from '@/features/today-trade-review';
import {
  fetchEarningsIntelligenceSnapshot,
  fetchMarketPulseSnapshot,
  fetchStockInterestRadarSnapshot,
} from './marketIntelligenceService';
import type {
  EarningsIntelligenceSnapshot,
  MarketPulseSnapshot,
  SnapshotEnvelope,
  StockInterestSnapshot,
} from '../types';

const SHORTLIST_TARGET_COUNT = 10;

export type DailyReviewShortlistLane =
  | 'Active risk review'
  | 'Exit / invalidation review'
  | 'Bullish review'
  | 'Bearish review'
  | 'Special case review'
  | 'Watchlist review'
  | 'Stock interest review';

export type DailyReviewShortlistPrimarySource =
  | 'Active Positions'
  | 'Today Review'
  | 'Stock Interest';

export type DailyReviewShortlistWarningSeverity = 'None' | 'Info' | 'Watch' | 'High' | 'Blocker';

export interface DailyReviewShortlistRow {
  id: string;
  rank: number;
  symbol: string;
  companyName: string | null;
  sector: string | null;
  lane: DailyReviewShortlistLane;
  primarySource: DailyReviewShortlistPrimarySource;
  sourceOrderLabel: string;
  sourceContributions: string[];
  reasonSummary: string;
  explainability: string[];
  warningSeverity: DailyReviewShortlistWarningSeverity;
  warnings: string[];
  blockers: string[];
  dataQualityStatus: string;
  dataQualityReasons: string[];
  marketPulseContext: string;
  fundamentalsContext: string;
  portfolioNames: string[];
  watchlistNames: string[];
  detailPath: string;
}

export interface DailyReviewShortlistSourceContribution {
  source: string;
  selectedCount: number;
  availableCount: number;
}

export interface DailyReviewShortlistReviewReadiness {
  reviewMode: string | null;
  trustStatus: string | null;
  userDecision: string | null;
  trustedCount: number | null;
  catalogCount: number | null;
  requiredDataThroughDate: string | null;
  storedDataThroughDate: string | null;
  blockers: Array<{
    category: string;
    severity: string;
    affectedCount: number;
    nextActionLabel: string;
  }>;
}

export interface DailyReviewShortlistActiveExclusion {
  symbol: string;
  companyName: string | null;
  reason: string;
}

export interface DailyReviewShortlistWarningRow {
  symbol: string;
  companyName: string | null;
  source: string;
  reason: string;
  severity: DailyReviewShortlistWarningSeverity;
}

export interface DailyReviewShortlistResult {
  scope: MarketScope;
  targetCount: number;
  rows: DailyReviewShortlistRow[];
  sourceContributions: DailyReviewShortlistSourceContribution[];
  reviewReadiness: DailyReviewShortlistReviewReadiness | null;
  marketPulse: SnapshotEnvelope<MarketPulseSnapshot> | null;
  todayReview: TodayReviewResponse | null;
  stockInterest: SnapshotEnvelope<StockInterestSnapshot[]> | null;
  dataQualitySummary: DataQualitySummary | null;
  sourceWarnings: string[];
  sourceErrors: string[];
  excludedActiveRows: DailyReviewShortlistActiveExclusion[];
  warningRows: DailyReviewShortlistWarningRow[];
  generatedAt: string;
}

type ReviewReadinessResponse = {
  reviewMode?: string | null;
  trustStatus?: string | null;
  userDecision?: string | null;
  reviewUniverse?: {
    trustedCount?: number | null;
    catalogCount?: number | null;
    requiredDataThroughDate?: string | null;
    storedDataThroughDate?: string | null;
  };
  blockers?: Array<{
    category?: string;
    severity?: string;
    affectedCount?: number;
    nextActionLabel?: string;
  }>;
};

export type OverlayMaps = {
  portfolioNamesBySymbol: Map<string, string[]>;
  watchlistNamesBySymbol: Map<string, string[]>;
};

type SourceBundle = {
  marketPulse: SnapshotEnvelope<MarketPulseSnapshot> | null;
  stockInterest: SnapshotEnvelope<StockInterestSnapshot[]> | null;
  earnings: SnapshotEnvelope<EarningsIntelligenceSnapshot[]> | null;
  todayReview: TodayReviewResponse | null;
  reviewReadiness: DailyReviewShortlistReviewReadiness | null;
  dataQualitySummary: DataQualitySummary | null;
  activeLedgerRows: SignalPositionLedgerActiveRow[];
  overlays: OverlayMaps;
  sourceWarnings: string[];
  sourceErrors: string[];
};

export async function fetchDailyReviewShortlist(scope: MarketScope): Promise<DailyReviewShortlistResult> {
  const bundle = await loadSources(scope);
  const rows = buildShortlistRows(scope, bundle);

  return {
    scope,
    targetCount: SHORTLIST_TARGET_COUNT,
    rows: rows.shortlist,
    sourceContributions: sourceContributions(rows.shortlist, bundle),
    reviewReadiness: bundle.reviewReadiness,
    marketPulse: bundle.marketPulse,
    todayReview: bundle.todayReview,
    stockInterest: bundle.stockInterest,
    dataQualitySummary: bundle.dataQualitySummary,
    sourceWarnings: [...new Set(bundle.sourceWarnings)].slice(0, 20),
    sourceErrors: bundle.sourceErrors,
    excludedActiveRows: rows.excludedActiveRows,
    warningRows: rows.warningRows,
    generatedAt: new Date().toISOString(),
  };
}

async function loadSources(scope: MarketScope): Promise<SourceBundle> {
  const settled = await Promise.allSettled([
    fetchMarketPulseSnapshot(scope),
    // enrich:false — the shortlist reads only persisted candidate fields (symbol, rank, reasons,
    // dataQuality, explainability) + sourceSnapshot.reviewReadiness; it renders none of the
    // expensive read-time enrichment (52w range, smart-money), so we skip it for a fast read.
    todayTradeReviewApi.latest({ region: scope.region, assetType: scope.assetType, enrich: false }),
    fetchStockInterestRadarSnapshot(scope),
    fetchEarningsIntelligenceSnapshot(scope),
    fetchDataQualitySummary({ region: scope.region, assetType: scope.assetType }),
    fetchSignalPositionLedgerActiveRows({
      region: scope.region,
      assetType: scope.assetType,
      limit: 100,
      offset: 0,
      sortBy: 'entryTriggerTimestamp',
      sortDirection: 'desc',
    }),
  ]);

  const sourceErrors: string[] = [];
  const marketPulse = settledValue(settled[0], 'Market Pulse', sourceErrors);
  const todayReview = settledValue(settled[1], 'Today Review', sourceErrors);
  const stockInterest = settledValue(settled[2], 'Stock Interest', sourceErrors);
  const earnings = settledValue(settled[3], 'Fundamentals / Earnings', sourceErrors);
  const dataQualitySummary = settledValue(settled[4], 'Data Quality', sourceErrors);
  const activeLedger = settledValue(settled[5], 'Active Positions', sourceErrors);
  // Overlay loaded separately after first paint (slow N+1 branch) — see dailyReviewShortlistOverlays.ts.
  const overlays = emptyOverlays();

  // Review-readiness is read from the PERSISTED today-review run snapshot (the daily-review
  // pipeline already computed and stored it). We deliberately do NOT call the live
  // /market-data/review-readiness-summary endpoint from this trader page: that endpoint runs a
  // heavy operator-only universe-health recomputation (tens of seconds, blocks the Node event
  // loop and starves every sibling request), and trader pages must be persisted reads only.
  // Same data, correct source, no app-wide starvation, no more permanent loading skeleton.
  const reviewReadiness = mapReviewReadiness(
    (todayReview?.run?.sourceSnapshot as { reviewReadiness?: ReviewReadinessResponse } | undefined)?.reviewReadiness ?? null,
  );

  const sourceWarnings = [
    ...envelopeWarnings('Market Pulse', marketPulse),
    ...envelopeWarnings('Stock Interest', stockInterest),
    ...envelopeWarnings('Fundamentals', earnings),
    ...(todayReview?.run?.warnings ?? []).map((warning) => `Today Review: ${warning}`),
    ...(activeLedger?.warnings ?? []).map((warning) => `Active Positions: ${warning}`),
  ];

  return {
    marketPulse,
    stockInterest,
    earnings,
    todayReview,
    reviewReadiness,
    dataQualitySummary,
    activeLedgerRows: activeLedger?.items ?? [],
    overlays,
    sourceWarnings,
    sourceErrors,
  };
}

function mapReviewReadiness(body: ReviewReadinessResponse | null): DailyReviewShortlistReviewReadiness | null {
  // Pure mapper over the persisted today-review review-readiness snapshot (same shape the
  // live operator endpoint returns). No network call — see loadSources() for why.
  if (!body) return null;
  return {
    reviewMode: body.reviewMode ?? null,
    trustStatus: body.trustStatus ?? null,
    userDecision: body.userDecision ?? null,
    trustedCount: body.reviewUniverse?.trustedCount ?? null,
    catalogCount: body.reviewUniverse?.catalogCount ?? null,
    requiredDataThroughDate: body.reviewUniverse?.requiredDataThroughDate ?? null,
    storedDataThroughDate: body.reviewUniverse?.storedDataThroughDate ?? null,
    blockers: (body.blockers ?? []).map((blocker) => ({
      category: blocker.category ?? 'UNKNOWN',
      severity: blocker.severity ?? 'warning',
      affectedCount: blocker.affectedCount ?? 0,
      nextActionLabel: blocker.nextActionLabel ?? 'Review source module.',
    })),
  };
}

function buildShortlistRows(scope: MarketScope, bundle: SourceBundle) {
  const activeRows = bundle.activeLedgerRows;
  const activeNormalSymbols = new Set(
    activeRows
      .filter((row) => row.status === 'ACTIVE' && !row.healthState)
      .map((row) => normalizeSymbol(row.symbol))
      .filter(Boolean),
  );
  const warningActiveRows = activeRows.filter((row) => row.healthState === 'RISK_WARNING' || row.healthState === 'EXIT_TRIGGERED');
  const todayCandidates = bundle.todayReview?.groups ?? emptyTodayGroups();
  const longReview = todayCandidates.longReview ?? [];
  const shortReview = todayCandidates.shortReview ?? [];
  const exitRiskReview = todayCandidates.exitRiskReview ?? [];
  const watchOnly = todayCandidates.watchOnly ?? [];
  const specialCases = todayCandidates.specialCases ?? [];
  const blocked = todayCandidates.blocked ?? [];
  const avoid = todayCandidates.avoid ?? [];
  const insufficientData = todayCandidates.insufficientData ?? [];
  const unproven = todayCandidates.unproven ?? [];
  const stockInterestRows = bundle.stockInterest?.snapshot ?? [];
  const earningsBySymbol = bySymbol(bundle.earnings?.snapshot ?? []);
  const stockInterestBySymbol = bySymbol(stockInterestRows);
  const marketPulse = bundle.marketPulse?.snapshot ?? null;
  const selectedSymbols = new Set<string>();
  const shortlist: DailyReviewShortlistRow[] = [];
  const warningRows: DailyReviewShortlistWarningRow[] = [];

  const addRow = (row: Omit<DailyReviewShortlistRow, 'rank'>) => {
    const symbol = normalizeSymbol(row.symbol);
    if (!symbol || selectedSymbols.has(symbol) || shortlist.length >= SHORTLIST_TARGET_COUNT) return;
    selectedSymbols.add(symbol);
    shortlist.push({ ...row, rank: shortlist.length + 1 });
  };

  warningActiveRows.forEach((row, index) => {
    addRow(activeLedgerToShortlistRow(row, index, bundle, stockInterestBySymbol, earningsBySymbol, marketPulse));
  });

  const todayOrdered = [
    ...exitRiskReview.map((candidate) => ({ candidate, lane: 'Exit / invalidation review' as const })),
    ...shortReview.map((candidate) => ({ candidate, lane: 'Bearish review' as const })),
    ...longReview.map((candidate) => ({ candidate, lane: 'Bullish review' as const })),
    ...specialCases.map((candidate) => ({ candidate, lane: 'Special case review' as const })),
    ...watchOnly.map((candidate) => ({ candidate, lane: 'Watchlist review' as const })),
  ].sort((left, right) => (left.candidate.rank ?? 9999) - (right.candidate.rank ?? 9999));

  todayOrdered.forEach(({ candidate, lane }) => {
    const symbol = normalizeSymbol(candidate.symbol);
    if (!symbol || activeNormalSymbols.has(symbol)) return;
    addRow(todayCandidateToShortlistRow(candidate, lane, bundle, stockInterestBySymbol, earningsBySymbol, marketPulse));
  });

  stockInterestRows
    .filter((row) => row.category !== 'RISK_AVOID')
    .forEach((row, index) => {
      const symbol = normalizeSymbol(row.symbol);
      if (!symbol || activeNormalSymbols.has(symbol)) return;
      addRow(stockInterestToShortlistRow(row, index, scope, bundle, earningsBySymbol, marketPulse));
    });

  const excludedActiveRows = activeRows
    .filter((row) => row.status === 'ACTIVE' && !row.healthState)
    .map((row) => ({
      symbol: row.symbol,
      companyName: row.companyName,
      reason: 'Normal active ledger row excluded from new-review shortlist.',
    }));

  [
    ...blocked,
    ...avoid,
    ...insufficientData,
    ...unproven,
  ].forEach((candidate) => {
    warningRows.push({
      symbol: candidate.symbol,
      companyName: candidate.companyName,
      source: 'Today Review',
      reason: candidate.blockers[0] || candidate.watchReasons[0] || candidate.reasonSummary,
      severity: warningSeverity(candidate.state, candidate.blockers, candidate.watchReasons),
    });
  });

  stockInterestRows
    .filter((row) => row.category === 'RISK_AVOID')
    .forEach((row) => {
      warningRows.push({
        symbol: row.symbol,
        companyName: row.company,
        source: 'Stock Interest',
        reason: firstMeaningful([...(row.riskTags ?? []), ...(row.warnings ?? []), ...(row.reasonTags ?? [])]) || 'Risk avoid row from Stock Interest.',
        severity: warningSeverity(row.category, [], [...(row.warnings ?? []), ...(row.riskTags ?? [])]),
      });
    });

  return {
    shortlist,
    excludedActiveRows,
    warningRows,
  };
}

function activeLedgerToShortlistRow(
  row: SignalPositionLedgerActiveRow,
  index: number,
  bundle: SourceBundle,
  stockInterestBySymbol: Map<string, StockInterestSnapshot>,
  earningsBySymbol: Map<string, EarningsIntelligenceSnapshot>,
  marketPulse: MarketPulseSnapshot | null,
): Omit<DailyReviewShortlistRow, 'rank'> {
  const symbolKey = normalizeSymbol(row.symbol);
  const stockInterest = symbolKey ? stockInterestBySymbol.get(symbolKey) : undefined;
  const earnings = symbolKey ? earningsBySymbol.get(symbolKey) : undefined;
  const sector = stockInterest?.sector ?? null;
  const sourceContributions = contributions([
    'Active Positions',
    stockInterest ? 'Stock Interest' : null,
    earnings ? 'Fundamentals' : null,
    'Data Quality',
    'Market Pulse',
    overlayLabel(bundle.overlays, row.symbol),
  ]);
  const warnings = [...row.displayWarnings, row.exitReasonSummary].filter(Boolean) as string[];
  // Severity comes from the structured ledger health state (seed), not the warning copy — pass the
  // warnings into the warnings slot, NOT the blockers slot (which would force every warned row to Blocker).
  const severity = row.healthState === 'EXIT_TRIGGERED' ? 'High' : warningSeverity(row.healthState, [], warnings);
  const marketPulseContext = marketContextForRow(marketPulse, sector);
  const fundamentalsContext = fundamentalsForRow(earnings);
  const portfolioNames = overlayNames(bundle.overlays.portfolioNamesBySymbol, row.symbol);
  const watchlistNames = overlayNames(bundle.overlays.watchlistNamesBySymbol, row.symbol);

  return {
    id: `active:${row.ledgerKey || row.symbol}:${index}`,
    symbol: row.symbol,
    companyName: row.companyName,
    sector,
    lane: row.healthState === 'EXIT_TRIGGERED' ? 'Exit / invalidation review' : 'Active risk review',
    primarySource: 'Active Positions',
    sourceOrderLabel: `Active positions row ${index + 1}`,
    sourceContributions,
    reasonSummary: row.exitReasonSummary || row.entryReasonSummary || 'Active ledger warning needs review.',
    explainability: compactMessages([
      'Selected from Active Positions warning rows before new review candidates.',
      row.healthState ? `Ledger health state: ${formatEnum(row.healthState)}.` : null,
      row.exitRuleId ? `Exit or invalidation rule: ${row.exitRuleId}.` : null,
      dataQualitySentence(row.currentDataQualityStatus, []),
      stockInterest ? `Stock Interest overlap: ${formatEnum(stockInterest.category)}.` : null,
      fundamentalsContext,
      marketPulseContext,
      overlaySentence(portfolioNames, watchlistNames),
    ]),
    warningSeverity: severity,
    warnings,
    blockers: row.exitReasonSummary ? [row.exitReasonSummary] : [],
    dataQualityStatus: row.currentDataQualityStatus || 'Unavailable',
    dataQualityReasons: row.displayWarnings,
    marketPulseContext,
    fundamentalsContext,
    portfolioNames,
    watchlistNames,
    detailPath: `/stocks/${encodeURIComponent(row.instrumentId || row.symbol)}`,
  };
}

function todayCandidateToShortlistRow(
  candidate: TodayReviewCandidate,
  lane: DailyReviewShortlistLane,
  bundle: SourceBundle,
  stockInterestBySymbol: Map<string, StockInterestSnapshot>,
  earningsBySymbol: Map<string, EarningsIntelligenceSnapshot>,
  marketPulse: MarketPulseSnapshot | null,
): Omit<DailyReviewShortlistRow, 'rank'> {
  const symbolKey = normalizeSymbol(candidate.symbol);
  const stockInterest = symbolKey ? stockInterestBySymbol.get(symbolKey) : undefined;
  const earnings = symbolKey ? earningsBySymbol.get(symbolKey) : undefined;
  const sector = candidate.dataQualitySnapshot?.sector ?? stockInterest?.sector ?? null;
  const dailyTier = candidate.dataQualitySnapshot?.useCaseTiers?.dailyReview;
  const marketPulseContext = marketContextForRow(marketPulse, sector);
  const fundamentalsContext = fundamentalsForRow(earnings);
  const portfolioNames = overlayNames(bundle.overlays.portfolioNamesBySymbol, candidate.symbol);
  const watchlistNames = overlayNames(bundle.overlays.watchlistNamesBySymbol, candidate.symbol);
  const blockers = candidate.blockers ?? [];
  const warnings = [
    ...candidate.watchReasons,
    ...(candidate.dataQualitySnapshot?.warnings ?? []),
    ...(candidate.explainability?.watchReasons?.map((reason) => reason.label) ?? []),
    // explainability.blockers labels are rendered in the accordion via the blockers[] array;
    // do NOT include them in warnings[] — their text (e.g. "blocked", "unusable") would
    // falsely trip the Blocker branch of warningSeverity for every shortlist row.
  ];
  const sourceContributions = contributions([
    'Today Review',
    stockInterest ? 'Stock Interest' : null,
    earnings ? 'Fundamentals' : null,
    'Data Quality',
    'Market Pulse',
    overlayLabel(bundle.overlays, candidate.symbol),
  ]);

  return {
    id: `today:${candidate.id}`,
    symbol: candidate.symbol,
    companyName: candidate.companyName,
    sector,
    lane,
    primarySource: 'Today Review',
    sourceOrderLabel: `Today Review rank ${candidate.rank}`,
    sourceContributions,
    reasonSummary: candidate.reasonSummary,
    explainability: compactMessages([
      'Selected from persisted Today Review groups in source rank order.',
      candidate.boardReason ? `Board reason: ${candidate.boardReason}.` : null,
      candidate.strategyCode ? `Strategy: ${candidate.strategyCode}.` : null,
      dataQualitySentence(dailyTier?.status ?? candidate.dataQualitySnapshot?.signalReadinessStatus, dailyTier?.reasons ?? candidate.dataQualitySnapshot?.readinessReasons ?? []),
      stockInterest ? `Stock Interest overlap: ${formatEnum(stockInterest.category)}.` : null,
      fundamentalsContext,
      marketPulseContext,
      overlaySentence(portfolioNames, watchlistNames),
    ]),
    warningSeverity: warningSeverity(candidate.state, blockers, warnings),
    warnings,
    blockers,
    dataQualityStatus: dailyTier?.status ?? candidate.dataQualitySnapshot?.signalReadinessStatus ?? candidate.dataQualitySnapshot?.coverageStatus ?? 'Unavailable',
    dataQualityReasons: dailyTier?.reasons ?? candidate.dataQualitySnapshot?.readinessReasons ?? [],
    marketPulseContext,
    fundamentalsContext,
    portfolioNames,
    watchlistNames,
    detailPath: `/today-review/candidates/${encodeURIComponent(candidate.id)}`,
  };
}

function stockInterestToShortlistRow(
  row: StockInterestSnapshot,
  index: number,
  scope: MarketScope,
  bundle: SourceBundle,
  earningsBySymbol: Map<string, EarningsIntelligenceSnapshot>,
  marketPulse: MarketPulseSnapshot | null,
): Omit<DailyReviewShortlistRow, 'rank'> {
  const symbolKey = normalizeSymbol(row.symbol);
  const earnings = symbolKey ? earningsBySymbol.get(symbolKey) : undefined;
  const marketPulseContext = marketContextForRow(marketPulse, row.sector);
  const fundamentalsContext = fundamentalsForRow(earnings);
  const portfolioNames = overlayNames(bundle.overlays.portfolioNamesBySymbol, row.symbol);
  const watchlistNames = overlayNames(bundle.overlays.watchlistNamesBySymbol, row.symbol);
  const sourceContributions = contributions([
    'Stock Interest',
    earnings ? 'Fundamentals' : null,
    'Market Pulse',
    overlayLabel(bundle.overlays, row.symbol),
  ]);

  return {
    id: `stock-interest:${row.symbol}:${row.category}:${index}`,
    symbol: row.symbol,
    companyName: row.company,
    sector: row.sector,
    lane: 'Stock interest review',
    primarySource: 'Stock Interest',
    sourceOrderLabel: `Stock Interest backend row ${index + 1}`,
    sourceContributions,
    reasonSummary: firstMeaningful(row.reasonTags) || `${formatEnum(row.category)} row from persisted Stock Interest.`,
    explainability: compactMessages([
      'Selected from persisted Stock Interest backend order only after Today Review and active-risk rows.',
      `Category: ${formatEnum(row.category)}.`,
      row.freshness ? `Freshness: ${formatEnum(row.freshness)}.` : null,
      fundamentalsContext,
      marketPulseContext,
      overlaySentence(portfolioNames, watchlistNames),
      `Scope: ${scope.region} / ${scope.assetType}.`,
    ]),
    warningSeverity: warningSeverity(row.category, [], [...(row.warnings ?? []), ...(row.riskTags ?? [])]),
    warnings: [...(row.warnings ?? []), ...(row.riskTags ?? [])],
    blockers: [],
    dataQualityStatus: 'Not provided by Stock Interest row',
    dataQualityReasons: [],
    marketPulseContext,
    fundamentalsContext,
    portfolioNames,
    watchlistNames,
    detailPath: `/stocks/${encodeURIComponent(row.symbol)}`,
  };
}

function sourceContributions(rows: DailyReviewShortlistRow[], bundle: SourceBundle): DailyReviewShortlistSourceContribution[] {
  return [
    {
      source: 'Today Review',
      selectedCount: rows.filter((row) => row.primarySource === 'Today Review').length,
      availableCount: [
        ...(bundle.todayReview?.groups?.longReview ?? []),
        ...(bundle.todayReview?.groups?.shortReview ?? []),
        ...(bundle.todayReview?.groups?.exitRiskReview ?? []),
        ...(bundle.todayReview?.groups?.specialCases ?? []),
        ...(bundle.todayReview?.groups?.watchOnly ?? []),
      ].length,
    },
    {
      source: 'Stock Interest',
      selectedCount: rows.filter((row) => row.primarySource === 'Stock Interest').length,
      availableCount: (bundle.stockInterest?.snapshot ?? []).filter((row) => row.category !== 'RISK_AVOID').length,
    },
    {
      source: 'Active Positions',
      selectedCount: rows.filter((row) => row.primarySource === 'Active Positions').length,
      availableCount: bundle.activeLedgerRows.filter((row) => row.healthState === 'RISK_WARNING' || row.healthState === 'EXIT_TRIGGERED').length,
    },
    {
      source: 'Portfolio overlay',
      selectedCount: rows.filter((row) => row.portfolioNames.length > 0).length,
      availableCount: bundle.overlays.portfolioNamesBySymbol.size,
    },
    {
      source: 'Watchlist overlay',
      selectedCount: rows.filter((row) => row.watchlistNames.length > 0).length,
      availableCount: bundle.overlays.watchlistNamesBySymbol.size,
    },
  ];
}

function warningSeverity(seed: string | null | undefined, blockers: string[] = [], warnings: string[] = []): DailyReviewShortlistWarningSeverity {
  // Blocker/High come from STRUCTURED signals only — the `seed` (state/health/category enum)
  // plus real `blockers[]`. Free-text `warnings`/risk-tag copy must NOT escalate: scanning it
  // for "avoid"/"blocked" previously flagged every ordinary row Blocker. Text only sets Watch/Info.
  const seedText = (seed ?? '').toLowerCase();
  if (blockers.length > 0 || /blocked|invalidated|risk_avoid/.test(seedText)) return 'Blocker';
  if (/exit_triggered|risk_warning/.test(seedText)) return 'High';
  const warningText = warnings.filter(Boolean).join(' ').toLowerCase();
  if (/watch|limited/.test(seedText) || /partial|limited|thin|weak|low liquidity|missing|warning|risk|stale|failed|not trustworthy/.test(warningText)) return 'Watch';
  if (seedText.length > 0 || warningText.length > 0) return 'Info';
  return 'None';
}

function marketContextForRow(snapshot: MarketPulseSnapshot | null, sector: string | null | undefined): string {
  if (!snapshot) return 'Market Pulse unavailable for this row.';
  const sectorName = sector || 'Unknown sector';
  const strong = snapshot.strongSectors.map(normalizeSymbol).includes(normalizeSymbol(sectorName));
  const weak = snapshot.weakSectors.map(normalizeSymbol).includes(normalizeSymbol(sectorName));
  if (strong) return `Market Pulse: ${snapshot.marketHealthLabel}; sector appears in strong sectors.`;
  if (weak) return `Market Pulse: ${snapshot.marketHealthLabel}; sector appears in weak sectors.`;
  return `Market Pulse: ${snapshot.marketHealthLabel}; no sector overlap found.`;
}

function fundamentalsForRow(row: EarningsIntelligenceSnapshot | undefined): string {
  if (!row) return 'Fundamentals context unavailable from persisted snapshot.';
  const categories = row.categories.length > 0 ? row.categories.map(formatEnum).join(', ') : 'no category';
  const risks = row.riskTags.length > 0 ? ` Risk tags: ${row.riskTags.join(', ')}.` : '';
  return `Fundamentals context: ${categories}.${risks}`;
}

function dataQualitySentence(status: string | null | undefined, reasons: string[]): string {
  const label = status ? formatEnum(status) : 'Unavailable';
  return reasons.length > 0
    ? `Data Quality daily-review status: ${label}; ${reasons.slice(0, 2).join(', ')}.`
    : `Data Quality daily-review status: ${label}.`;
}

function overlaySentence(portfolios: string[], watchlists: string[]): string | null {
  const parts = [];
  if (portfolios.length > 0) parts.push(`Portfolio: ${portfolios.join(', ')}`);
  if (watchlists.length > 0) parts.push(`Watchlist: ${watchlists.join(', ')}`);
  return parts.length > 0 ? `Personal overlay: ${parts.join('; ')}.` : null;
}

function overlayLabel(overlays: OverlayMaps, symbol: string): string | null {
  const portfolio = overlayNames(overlays.portfolioNamesBySymbol, symbol);
  const watchlist = overlayNames(overlays.watchlistNamesBySymbol, symbol);
  if (portfolio.length > 0 && watchlist.length > 0) return 'Portfolio / Watchlist';
  if (portfolio.length > 0) return 'Portfolio';
  if (watchlist.length > 0) return 'Watchlist';
  return null;
}

function overlayNames(map: Map<string, string[]>, symbol: string): string[] {
  return map.get(normalizeSymbol(symbol)) ?? [];
}

function bySymbol<T extends { symbol: string }>(rows: T[]): Map<string, T> {
  const map = new Map<string, T>();
  rows.forEach((row) => {
    const key = normalizeSymbol(row.symbol);
    if (key && !map.has(key)) map.set(key, row);
  });
  return map;
}

function contributions(values: Array<string | null>): string[] {
  return [...new Set(values.filter(Boolean) as string[])];
}

function compactMessages(values: Array<string | null | undefined>): string[] {
  return values.filter((value): value is string => Boolean(value && value.trim()));
}

function envelopeWarnings<T>(source: string, envelope: SnapshotEnvelope<T> | null): string[] {
  if (!envelope) return [];
  const warnings = envelope.warnings.map((warning) => `${source}: ${warning}`);
  if (envelope.availability === 'ERROR') warnings.push(`${source}: ${envelope.message}`);
  return warnings;
}

function settledValue<T>(result: PromiseSettledResult<T>, source: string, sourceErrors: string[]): T | null {
  if (result.status === 'fulfilled') return result.value;
  sourceErrors.push(`${source}: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`);
  return null;
}

function emptyOverlays(): OverlayMaps {
  return {
    portfolioNamesBySymbol: new Map(),
    watchlistNamesBySymbol: new Map(),
  };
}

function emptyTodayGroups(): TodayReviewResponse['groups'] {
  return {
    longReview: [],
    shortReview: [],
    exitRiskReview: [],
    watchOnly: [],
    specialCases: [],
    blocked: [],
    avoid: [],
    insufficientData: [],
    unproven: [],
  };
}

function firstMeaningful(values: string[]): string | null {
  return values.find((value) => value && value.trim()) ?? null;
}

function normalizeSymbol(value: string | null | undefined): string {
  return String(value || '').trim().toUpperCase();
}

function formatEnum(value: string | null | undefined): string {
  if (!value) return 'Unavailable';
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part ? `${part[0].toUpperCase()}${part.slice(1)}` : part)
    .join(' ');
}
