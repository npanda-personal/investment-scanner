import fs from 'fs/promises';
import { createHash } from 'crypto';
import net from 'net';
import path from 'path';
import { inflateRawSync } from 'zlib';
import { MarketDataFoundationRepository } from './market-data-foundation.repository';
import { YahooFinanceIngestionService } from './market-data-foundation.provider';
import { AngelOneMarketDataProvider } from './market-data-foundation.angel-one-provider';
import { enqueueIngestionJob } from './market-data-foundation.queue';
import { getCatalogDownloadConfig, getCatalogSourceConfig, getCatalogSourceConfigs } from './market-data-foundation.catalog-sources';
import type {
  CreateStockRequest,
  CorporateAction,
  CoreFundamentals,
  HistoricalPrice,
  MarketDataStatus,
  MarketDataRepairPlan,
  MarketDataRepairLane,
  MarketDataRepairLaneCode,
  MarketDataRepairRequest,
  MarketDataRepairRunAction,
  MarketDataRepairRunActionResult,
  MarketDataRepairRunRecord,
  MarketDataRepairRunRequest,
  MarketDataRepairRunResponse,
  MarketDataRepairRunStatus,
  MarketDataRepairSourceIdentity,
  MarketDataRepairSummary,
  MarketDataUniverseSignoff,
  MarketDataManualMetadataTemplate,
  MarketDataProviderBusinessRepairStatus,
  MarketDataPriceIdentityRepairCandidate,
  MarketDataPriceIdentityRepairSummary,
  MarketDataRepairStateStatus,
  MarketDataUniverseHealth,
  MarketMapGroup,
  MarketMapSummary,
  StockColumnMissingDataDiagnostic,
  StockExpectedNullColumnDiagnostic,
  StockIdentityMismatchWarning,
  StockIdentityMismatchDiagnostic,
  StockMissingDataDiagnostics,
  StockMissingDataDiagnosticsActionCounts,
  StockMissingDataDiagnosticsCountMap,
  StockMissingDataIssueKind,
  StockMissingDataSample,
  ProviderSupportStatus,
  ProviderValidationClassification,
  ProviderValidationResult,
  ReviewReadinessBlocker,
  ReviewReadinessNextAction,
  ReviewReadinessSummary,
  MarketDataSyncSkipReason,
  MarketMoverRange,
  MarketMoverRangeSummary,
  MarketMoversSummary,
  InstrumentUniverseReadiness,
  TrustedReviewUniverseHealth,
  TrustedReviewUniverseInstrument,
  TrustedUniverseRepairWorkbench,
  TrustedReviewUniverseMode,
  TrustedReviewUniverseStatus,
  TrustedBaselineListingDateStatus,
  TrustedBaselineProviderFallbackState,
  TrustedBaselineRequiredHistoryStatus,
  TrustedBaselineResidualState,
  UniverseTrustStatus,
  ScheduledRegionSyncSummary,
  OfficialEodBulkSyncEvidence,
  PaginationOptions,
  CatalogBackfillRequest,
  CatalogBackfillSummary,
  CatalogImportRequest,
  CatalogImportSummary,
  CatalogSource,
  CatalogSyncRunRequest,
  CatalogSyncRunStatus,
  CatalogSyncRunStatusResponse,
  PriceBackfillRunRequest,
  PriceBackfillRunStatusResponse,
  SearchResult,
  StockSyncTask,
  SyncSummary,
  UpdateStockRequest,
  V1CreateInstrumentRequest,
  V1IngestionRequest,
  V1Instrument,
  V1SyncResult,
} from './market-data-foundation.types';
import { validateInstrumentInput } from './market-data-foundation.validation';
import { getMarketSessionConfig, latestCompletedTradingDateForRegion, shouldRunMarketDataSync, tradingDateForRegion } from './market-data-foundation.market-session';
import { isKnownNseFnoStockUnderlying } from './market-data-foundation.fno-underlyings';
import {
  classifyInstrumentUniverseReadiness,
  normalizeProviderStatus,
  STANDARD_REVIEW_MIN_BARS,
  UNIVERSE_STATES,
} from './market-data-foundation.universe';
import {
  buildNseOfficialArchiveUrls,
  buildNseSecurityBhavdataArchiveUrl,
  buildNseUdiffCmBhavcopyArchiveUrl,
  type NseArchiveUrl,
  parseIndianExchangeEodCsv,
} from './market-data-foundation.exchange-eod-adapter';

const TRUSTED_REVIEW_SCAN_ORDERING = 'recentVolumeDesc_priceHistoryCompleteness_latestFreshness_symbol';
const MARKET_MOVER_LOOKBACK_DAYS: Record<MarketMoverRange, number> = {
  '1D': 1,
  '1W': 7,
  '1M': 30,
  '3M': 90,
  '6M': 180,
  '1Y': 365,
};
const MARKET_MOVER_MIN_HISTORY_BARS: Record<MarketMoverRange, number> = {
  '1D': 2,
  '1W': 5,
  '1M': 20,
  '3M': 60,
  '6M': 120,
  '1Y': 240,
};
const MARKET_MOVER_MAX_ABS_RETURN: Record<MarketMoverRange, number> = {
  '1D': 10,
  '1W': 25,
  '1M': 50,
  '3M': 100,
  '6M': 250,
  '1Y': 1000,
};
const NSE_BSE_ONLY_PROVIDER_DISABLED_CODE = 'EXTERNAL_PROVIDER_DISABLED_NSE_BSE_ONLY';
const NSE_BSE_ONLY_PROVIDER_DISABLED_MESSAGE =
  'External Yahoo/yfinance and Angel One provider paths are disabled. Use NSE/BSE exchange-file imports or manual verified evidence only.';

type TrustedReviewUniverseOptions = Pick<PaginationOptions, 'region' | 'assetType'> & { now?: Date };
type UniverseComputationSnapshot = {
  scope: { region: string; assetType: string };
  stocks: any[];
  readinessBySymbol: Map<string, InstrumentUniverseReadiness>;
  statsBySymbol: Map<string, any>;
  validationWindow: ReturnType<MarketDataFoundationService['providerValidationWindow']>;
  priceBackfillBlockedStockIds: Set<string>;
  repairStatesByStockId?: Map<string, any[]>;
};
type UniverseComputationSnapshotCacheEntry = {
  expiresAt: number;
  snapshot?: UniverseComputationSnapshot;
  promise?: Promise<UniverseComputationSnapshot>;
};
type HistoricalStoreOptions = {
  sourceFileImportId?: string | null;
};
type ExchangeDailyImportSummary = {
  status: 'COMPLETED' | 'SKIPPED_DUPLICATE' | 'FAILED';
  source: 'NSE' | 'BSE';
  segment: string;
  tradingDate: string;
  sourceName: string;
  fileName: string;
  fileUrl: string | null;
  sourceFileImportId: string | null;
  sourceFingerprint: string | null;
  rowsRead: number;
  rowsParsed: number;
  rowsInserted: number;
  rowsUpdated: number;
  rowsNoOp: number;
  rowsSkipped: number;
  warningCount: number;
  warnings: string[];
  errors: string[];
  changedSymbols?: string[];
  downstreamSymbols?: string[];
};
type StockMissingDataColumnConfig = {
  column: string;
  label: string;
  nullable: boolean;
  value: (stock: any) => unknown;
  expectedNull?: (stock: any) => boolean;
  expectedNullReason?: string;
  expected?: (stock: any) => string | null;
  invalid?: (stock: any, value: unknown, priceStatsBySymbol: Map<string, any>) => string | null;
};

type CatalogSyncRunRecord = CatalogSyncRunStatusResponse & {
  activeKey: string;
  cancelRequested: boolean;
  force: boolean;
  fullReload: boolean;
  tradingDate: string;
  targetTradingDate: string;
  providerEndDate?: Date;
  processedTaskIds: Set<string>;
};

type PriceBackfillRunRecord = PriceBackfillRunStatusResponse & {
  activeKey: string;
  cancelRequested: boolean;
  force: boolean;
  fullReload: boolean;
  policy: MarketDataRepairRequest['policy'];
  triggerType: 'startup' | 'backfill' | 'manual' | 'scheduled';
  processedStockIds: Set<string>;
};

const KNOWN_NSE_FNO_STOCK_UNDERLYINGS = new Set([
  '360ONE',
  'ABB',
  'ABCAPITAL',
  'ABFRL',
  'ADANIENSOL',
  'ADANIENT',
  'ADANIGREEN',
  'ADANIPORTS',
  'ALKEM',
  'AMBER',
  'AMBUJACEM',
  'ANGELONE',
  'APLAPOLLO',
  'APOLLOHOSP',
  'ASHOKLEY',
  'ASIANPAINT',
  'ASTRAL',
  'ATGL',
  'AUBANK',
  'AUROPHARMA',
  'AXISBANK',
  'BAJAJ-AUTO',
  'BAJAJFINSV',
  'BAJFINANCE',
  'BALKRISIND',
  'BANDHANBNK',
  'BANKBARODA',
  'BANKINDIA',
  'BDL',
  'BEL',
  'BHARATFORG',
  'BHARTIARTL',
  'BHEL',
  'BIOCON',
  'BLUESTARCO',
  'BOSCHLTD',
  'BPCL',
  'BRITANNIA',
  'BSE',
  'CAMS',
  'CANBK',
  'CDSL',
  'CGPOWER',
  'CHAMBLFERT',
  'CHOLAFIN',
  'CIPLA',
  'COALINDIA',
  'COFORGE',
  'COLPAL',
  'CONCOR',
  'CROMPTON',
  'CUMMINSIND',
  'CYIENT',
  'DABUR',
  'DALBHARAT',
  'DELHIVERY',
  'DIVISLAB',
  'DIXON',
  'DLF',
  'DMART',
  'DRREDDY',
  'EICHERMOT',
  'ETERNAL',
  'EXIDEIND',
  'FEDERALBNK',
  'FORTIS',
  'GAIL',
  'GLENMARK',
  'GMRINFRA',
  'GODREJCP',
  'GODREJPROP',
  'GRANULES',
  'GRASIM',
  'HAL',
  'HAVELLS',
  'HCLTECH',
  'HDFCAMC',
  'HDFCBANK',
  'HDFCLIFE',
  'HEROMOTOCO',
  'HFCL',
  'HINDALCO',
  'HINDCOPPER',
  'HINDPETRO',
  'HINDUNILVR',
  'HINDZINC',
  'HUDCO',
  'ICICIBANK',
  'ICICIGI',
  'ICICIPRULI',
  'IDEA',
  'IDFCFIRSTB',
  'IEX',
  'IGL',
  'IIFL',
  'INDHOTEL',
  'INDIANB',
  'INDIGO',
  'INDUSINDBK',
  'INDUSTOWER',
  'INFY',
  'INOXWIND',
  'IOC',
  'IRB',
  'IRCTC',
  'IREDA',
  'IRFC',
  'ITC',
  'JINDALSTEL',
  'JIOFIN',
  'JSL',
  'JSWENERGY',
  'JSWSTEEL',
  'JUBLFOOD',
  'KALYANKJIL',
  'KAYNES',
  'KEI',
  'KFINTECH',
  'KOTAKBANK',
  'KPITTECH',
  'LAURUSLABS',
  'LICHSGFIN',
  'LICI',
  'LODHA',
  'LT',
  'LTF',
  'LTIM',
  'LUPIN',
  'M&M',
  'M&MFIN',
  'MANAPPURAM',
  'MANKIND',
  'MARICO',
  'MARUTI',
  'MAXHEALTH',
  'MAZDOCK',
  'MCX',
  'MFSL',
  'MOTHERSON',
  'MPHASIS',
  'MUTHOOTFIN',
  'NATIONALUM',
  'NAUKRI',
  'NBCC',
  'NCC',
  'NESTLEIND',
  'NHPC',
  'NMDC',
  'NTPC',
  'NYKAA',
  'OBEROIRLTY',
  'OFSS',
  'OIL',
  'ONGC',
  'PAGEIND',
  'PATANJALI',
  'PAYTM',
  'PERSISTENT',
  'PETRONET',
  'PFC',
  'PGEL',
  'PHOENIXLTD',
  'PIDILITIND',
  'PIIND',
  'PNB',
  'PNBHOUSING',
  'POLICYBZR',
  'POLYCAB',
  'POONAWALLA',
  'POWERGRID',
  'PRESTIGE',
  'RBLBANK',
  'RECLTD',
  'RELIANCE',
  'SAIL',
  'SBICARD',
  'SBILIFE',
  'SBIN',
  'SHREECEM',
  'SHRIRAMFIN',
  'SIEMENS',
  'SJVN',
  'SOLARINDS',
  'SONACOMS',
  'SRF',
  'SUNPHARMA',
  'SUPREMEIND',
  'SUZLON',
  'SYNGENE',
  'TATACHEM',
  'TATACOMM',
  'TATACONSUM',
  'TATAELXSI',
  'TATAMOTORS',
  'TATAPOWER',
  'TATASTEEL',
  'TATATECH',
  'TCS',
  'TECHM',
  'TIINDIA',
  'TITAGARH',
  'TITAN',
  'TORNTPHARM',
  'TORNTPOWER',
  'TRENT',
  'TVSMOTOR',
  'ULTRACEMCO',
  'UNIONBANK',
  'UNITDSPR',
  'UNOMINDA',
  'UPL',
  'VBL',
  'VEDL',
  'VOLTAS',
  'WIPRO',
  'YESBANK',
  'ZYDUSLIFE',
]);

type CatalogIdentityRowsSnapshot = {
  catalogSource: CatalogSource;
  rows: CreateStockRequest[];
  warnings: string[];
  downloaded: boolean;
  sourceFingerprint: string;
  sourceIdentity: MarketDataRepairSourceIdentity;
};

type CatalogIdentityWorkItem = {
  stock: any;
  row: CreateStockRequest;
  filledFields: string[];
};

type RepairRunSourceSnapshot = {
  fingerprint?: string;
  identity?: MarketDataRepairSourceIdentity;
  catalogSnapshot?: CatalogIdentityRowsSnapshot;
  error?: string;
  warnings?: string[];
};

type PriceBackfillCandidate = {
  stock: any;
  readiness: InstrumentUniverseReadiness;
  historyDiagnostics: {
    requiredHistoryStartDate: string;
    latestCompletedEodDate: string | null;
    listingDate: string | null;
    listingDateMissing: boolean;
    storedHistoryStartDate: string | null;
    storedHistoryEndDate: string | null;
    storedHistoryBars: number;
    requiredHistoryMinimumBars: number;
    storedHistoryCoveragePercent: number;
    requiredHistoryComplete: boolean;
  };
};

type TrustedBaselineSnapshot = {
  trustedBaselineResidualState: TrustedBaselineResidualState;
  trustedBaselineBlockerCodes: string[];
  latestCompletedEodDate: string | null;
  latestCompletedEodPresent: boolean;
  storedDataThroughDate: string | null;
  requiredHistoryStartDate: string | null;
  requiredHistoryEndDate: string | null;
  requiredHistoryStatus: TrustedBaselineRequiredHistoryStatus;
  listingDate: string | null;
  listingDateStatus: TrustedBaselineListingDateStatus;
  providerFallbackState: TrustedBaselineProviderFallbackState;
  primarySourceAttempted: 'YAHOO' | null;
  fallbackSourcesAttempted: string[];
  sourceFallbackReason: string | null;
};

type RepairStateLookup = {
  providerValidation: any | null;
  priceBackfill: any | null;
  catalogIdentity: any | null;
};

type IndianExchangeFallbackResult = {
  attempted: boolean;
  prices: HistoricalPrice[];
  warnings: string[];
  sourceName: string | null;
  daysAttempted: number;
  rowsParsed: number;
};

type OfficialNseEodBulkSyncResult = {
  evidence: OfficialEodBulkSyncEvidence;
  matchedTaskIds: Set<string>;
  summaryByTaskId: Map<string, SyncSummary>;
};

type HistoricalBulkStoreResult = SyncSummary & {
  summaryBySymbol: Map<string, SyncSummary>;
};

type PriceRegionInfo = {
  region: string;
  exchange?: string | null;
};

type MarketDataPipelineRecorder = {
  recordMarketDataStageSnapshot(input: {
    region: string;
    assetType: string;
    timeframe: '1d';
    pipelineKey: 'market-intelligence';
    triggerType: 'startup' | 'backfill' | 'scheduled' | 'manual';
    operation: 'PRICE_BACKFILL';
    runId: string;
    status: PriceBackfillRunStatusResponse['status'];
    dataThroughDate?: string | null;
    totalCount: number;
    processedCount: number;
    succeededCount: number;
    failedCount: number;
    skippedCount: number;
    unchangedCount: number;
    changedInstrumentIds?: string[];
    batchSize: number;
    nextOffset: number | null;
    hasMore: boolean;
    startedAt: string;
    completedAt: string | null;
    warnings: string[];
    errors: string[];
    metadata: Record<string, unknown>;
  }): Promise<unknown>;
};

type MarketDataPipelineSnapshotInput = Parameters<MarketDataPipelineRecorder['recordMarketDataStageSnapshot']>[0];

export class MarketDataFoundationService {
  private static lastIngestionAt = 0;
  private static ingestionThrottleChain: Promise<void> = Promise.resolve();
  private static catalogSyncRuns = new Map<string, CatalogSyncRunRecord>();
  private static activeCatalogSyncRuns = new Map<string, string>();
  private static priceBackfillRuns = new Map<string, PriceBackfillRunRecord>();
  private static activePriceBackfillRuns = new Map<string, string>();
  private static priceBackfillPipelineSnapshotChains = new Map<string, Promise<void>>();
  private readonly manualSyncCooldownMinutes = this.readPositiveNumber(
    process.env.MARKET_DATA_MANUAL_SYNC_COOLDOWN_MINUTES,
    15
  );
  private readonly universeSnapshotCacheTtlMs = Math.max(
    this.readPositiveNumber(process.env.MARKET_DATA_UNIVERSE_SNAPSHOT_CACHE_TTL_MS, 60000),
    1000
  );
  private readonly universeSnapshotCache = new Map<string, UniverseComputationSnapshotCacheEntry>();

  constructor(
    private readonly repository = new MarketDataFoundationRepository(),
    private readonly marketDataProvider = new YahooFinanceIngestionService(),
    private readonly angelOneMarketDataProvider = new AngelOneMarketDataProvider(),
    private readonly pipelineRecorder?: MarketDataPipelineRecorder
  ) {}

  list(options: PaginationOptions) {
    return this.repository.listStocks(options);
  }

  providerDataCleanupReport() {
    return this.repository.providerDataCleanupReport();
  }

  executeProviderDataCleanup() {
    return this.repository.executeProviderDataCleanup();
  }

  async health(options: Pick<PaginationOptions, 'region' | 'assetType'> = {}) {
    const [instrumentCount, latestDataTimestamp] = await Promise.all([
      this.repository.instrumentCount(options),
      this.repository.latestDataTimestamp(options),
    ]);

    console.log('[MarketDataFoundation] health market filter', {
      receivedRegion: options.region || 'GLOBAL',
      receivedAssetType: options.assetType || 'ALL',
      instrumentCount,
    });

    return {
      status: 'ok',
      module: 'market-data-foundation',
      instrumentCount,
      latestDataTimestamp: latestDataTimestamp?.toISOString() ?? null,
      source: 'database',
      ingestion_timestamp: new Date().toISOString(),
      last_updated_timestamp: latestDataTimestamp?.toISOString() ?? null,
      data_status: latestDataTimestamp ? 'COMPLETE' : 'MISSING',
      timestamp: new Date().toISOString(),
      region: options.region || 'GLOBAL',
      assetType: options.assetType || 'ALL',
    };
  }

  async marketMovers(options: Pick<PaginationOptions, 'region' | 'assetType'> & { limit?: number; range?: string } = {}): Promise<MarketMoversSummary> {
    const scope = {
      region: options.region?.trim().toUpperCase() || 'IN',
      assetType: options.assetType?.trim().toUpperCase() || 'STOCK',
    };
    const limit = Math.max(1, Math.min(options.limit ?? 5, 20));
    const requestedRange = this.marketMoverRange(options.range);
    const requestedRanges = requestedRange
      ? [requestedRange]
      : (Object.keys(MARKET_MOVER_LOOKBACK_DAYS) as MarketMoverRange[]);
    const latestDataTimestamp = await this.repository.latestDataTimestamp(scope).catch(() => null);
    const latestDateStart = latestDataTimestamp ? new Date(latestDataTimestamp) : null;
    latestDateStart?.setUTCHours(0, 0, 0, 0);
    const latestDateEnd = latestDateStart ? new Date(latestDateStart) : null;
    latestDateEnd?.setUTCDate(latestDateEnd.getUTCDate() + 1);
    const ranges = await Promise.all(
      requestedRanges.map(async (range): Promise<MarketMoverRangeSummary> => {
        const rows = await this.repository.marketMoversForRange(MARKET_MOVER_LOOKBACK_DAYS[range], {
          ...scope,
          limit,
          minHistoryBars: MARKET_MOVER_MIN_HISTORY_BARS[range],
          maxAbsReturn: MARKET_MOVER_MAX_ABS_RETURN[range],
          recentBars: Math.min(20, MARKET_MOVER_MIN_HISTORY_BARS[range]),
          latestDateStart,
          latestDateEnd,
        });
        const ordered = rows.filter((row) => Number.isFinite(row.returnPercent));
        const gainers = ordered
          .filter((row) => row.returnPercent > 0)
          .sort((left, right) => right.returnPercent - left.returnPercent)
          .slice(0, limit);
        const losers = ordered
          .filter((row) => row.returnPercent < 0)
          .sort((left, right) => left.returnPercent - right.returnPercent)
          .slice(0, limit);
        const warnings = rows.length === 0
          ? [`No priced stocks have enough ${range} history for movers in ${scope.region}/${scope.assetType}.`]
          : ['Price movers use the latest scoped candle date available in the database and exclude unsupported instruments, stale latest candles, insufficient liquidity/history, mixed sources, and mixed adjusted/close basis.'];
        return { range, gainers, losers, warnings };
      }),
    );

    return {
      scope,
      generatedAt: new Date().toISOString(),
      ranges,
    };
  }

  async marketMap(options: Pick<PaginationOptions, 'region' | 'assetType'> & { limit?: number; range?: string } = {}): Promise<MarketMapSummary> {
    const scope = {
      region: options.region?.trim().toUpperCase() || 'IN',
      assetType: options.assetType?.trim().toUpperCase() || 'STOCK',
    };
    const range = this.marketMoverRange(options.range) ?? '1D';
    const limit = Math.max(1, Math.min(Number(options.limit) || 60, 100));
    const latestDataTimestamp = await this.repository.latestDataTimestamp(scope).catch(() => null);
    const latestDateStart = latestDataTimestamp ? new Date(latestDataTimestamp) : null;
    latestDateStart?.setUTCHours(0, 0, 0, 0);
    const latestDateEnd = latestDateStart ? new Date(latestDateStart) : null;
    latestDateEnd?.setUTCDate(latestDateEnd.getUTCDate() + 1);
    const rowLimit = Math.max(1, Math.ceil(limit / 2));
    const rows = await this.repository.marketMoversForRange(MARKET_MOVER_LOOKBACK_DAYS[range], {
      ...scope,
      limit: rowLimit,
      minHistoryBars: MARKET_MOVER_MIN_HISTORY_BARS[range],
      maxAbsReturn: MARKET_MOVER_MAX_ABS_RETURN[range],
      recentBars: Math.min(20, MARKET_MOVER_MIN_HISTORY_BARS[range]),
      latestDateStart,
      latestDateEnd,
    }).catch(() => []);
    const seen = new Set<string>();
    const orderedRows = rows
      .filter((row) => Number.isFinite(row.returnPercent))
      .sort((left, right) => Math.abs(right.returnPercent) - Math.abs(left.returnPercent))
      .filter((row) => {
        if (seen.has(row.instrumentId)) return false;
        seen.add(row.instrumentId);
        return true;
      })
      .slice(0, limit);

    const tiles = orderedRows.map((row) => ({
      instrumentId: row.instrumentId,
      symbol: row.symbol,
      displaySymbol: row.symbol,
      companyName: row.companyName,
      sector: row.sector,
      derivativesEligible: null,
      dataStatus: 'COMPLETE' as MarketDataStatus,
      returnPercent: row.returnPercent,
      latestDate: row.latestDate,
      priceBasis: row.priceBasis,
    }));
    const groups = this.marketMapGroups(tiles);
    const hasMissingSector = tiles.some((tile) => !tile.sector?.trim());
    const gaps = [
      ...(tiles.length === 0 ? ['Market map needs catalog rows and stored price movement evidence for the selected scope.'] : []),
      'Additional stock overlays require later saved evidence before they can appear here.',
      'Additional grouping modes require later saved evidence before they can appear here.',
      ...(hasMissingSector ? ['Some map rows are missing sector metadata and are not included in sector groups.'] : []),
    ];
    const warnings = tiles.length > 0
      ? ['Map returns are based on stored daily candles for the selected range and exclude unsupported, stale, insufficient-history, low-liquidity, or mixed-source rows.']
      : ['No priced stocks have enough stored movement evidence for the selected Market Map range.'];

    return {
      status: tiles.length > 0 ? 'ready' : 'missing',
      scope,
      asOf: latestDataTimestamp?.toISOString() ?? null,
      range,
      materialized: false,
      sourceLabels: {
        catalog: 'Market Data Foundation stock catalog',
        prices: 'Stored daily price history',
      },
      warnings,
      gaps,
      groups,
      tiles,
    };
  }

  private marketMoverRange(value: unknown): MarketMoverRange | null {
    if (typeof value !== 'string') return null;
    const normalized = value.trim().toUpperCase();
    return Object.prototype.hasOwnProperty.call(MARKET_MOVER_LOOKBACK_DAYS, normalized)
      ? normalized as MarketMoverRange
      : null;
  }

  private marketMapGroups(tiles: MarketMapSummary['tiles']): MarketMapGroup[] {
    const groups = new Map<string, MarketMapSummary['tiles']>();
    for (const tile of tiles) {
      const key = tile.sector?.trim();
      if (!key) continue;
      groups.set(key, [...(groups.get(key) || []), tile]);
    }
    return [...groups.entries()]
      .map(([key, rows]) => ({
        key,
        label: key,
        tileCount: rows.length,
        avgReturnPercent: this.roundNullable(this.averageNumber(rows.map((row) => row.returnPercent).filter(this.isFiniteNumber))),
      }))
      .sort((left, right) => {
        const leftAbs = Math.abs(left.avgReturnPercent ?? 0);
        const rightAbs = Math.abs(right.avgReturnPercent ?? 0);
        return rightAbs - leftAbs || left.label.localeCompare(right.label);
      });
  }

  private averageNumber(values: number[]): number | null {
    if (values.length === 0) return null;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  private isFiniteNumber(value: number | null): value is number {
    return typeof value === 'number' && Number.isFinite(value);
  }

  private roundNullable(value: number | null): number | null {
    return value === null ? null : Number(value.toFixed(6));
  }

  async stockMissingDataDiagnostics(options: Pick<PaginationOptions, 'region' | 'assetType'> & { sampleLimit?: number } = {}): Promise<StockMissingDataDiagnostics> {
    const scope = {
      region: options.region?.trim().toUpperCase() || 'IN',
      assetType: options.assetType?.trim().toUpperCase() || 'STOCK',
    };
    const sampleLimit = Math.max(1, Math.min(Number(options.sampleLimit) || 5, 50));
    const stocks = (await this.repository.listStocksForUniverseHealth(scope))
      .filter((stock) => stock.isActive !== false && stock.isDelisted !== true);
    const identitySymbols = [...new Set(stocks.flatMap((stock) => [
      stock.symbol,
      stock.providerSymbol,
      stock.sourceSymbol,
      stock.displaySymbol,
    ]).filter((value): value is string => typeof value === 'string' && value.trim().length > 0))];
    const warnings: string[] = [];
    const repositoryAny = this.repository as any;
    const priceStatsBySymbol: Map<string, any> = typeof repositoryAny.priceReadinessStatsForSymbols === 'function'
      ? await repositoryAny.priceReadinessStatsForSymbols(identitySymbols)
      : new Map();
    if (typeof repositoryAny.priceReadinessStatsForSymbols !== 'function') {
      warnings.push('Price identity diagnostics are limited because price readiness stats are unavailable.');
    }

    const columns = this.stockMissingDataColumnConfigs(scope).map((config) =>
      this.stockColumnMissingDataDiagnostic(config, stocks, priceStatsBySymbol, sampleLimit)
    );
    const expectedNullColumns = columns
      .filter((column) => column.expectedNullCount > 0)
      .map((column): StockExpectedNullColumnDiagnostic => ({
        column: column.column,
        reason: column.expectedNullReason || 'Column is expected to remain null for at least one active scoped stock.',
        expectedNullCount: column.expectedNullCount,
        unexpectedNonNullCount: column.unexpectedNonNullCount,
        samples: column.samples.filter((sample) => sample.issue === 'UNEXPECTED_NON_NULL').slice(0, sampleLimit),
      }));
    const { diagnostics: identityMismatches, affectedRows: identityMismatchRows } = this.stockIdentityMismatchDiagnostics(stocks, priceStatsBySymbol, sampleLimit);
    const counts = this.stockMissingDataCounts(stocks, columns, priceStatsBySymbol, identityMismatchRows);
    const actionCounts = this.stockMissingDataActionCounts(counts);
    const identityMismatchWarnings = this.stockIdentityMismatchWarnings(identityMismatches, sampleLimit);

    return {
      scope,
      generatedAt: new Date().toISOString(),
      activeStockCount: stocks.length,
      sampleLimit,
      columns,
      expectedNullColumns,
      identityMismatches,
      identityMismatchWarnings,
      counts,
      actionCounts,
      totals: {
        columnsAudited: columns.length,
        columnsWithIssues: columns.filter((column) => column.affectedCount > 0).length,
        nullCount: columns.reduce((sum, column) => sum + column.nullCount, 0),
        blankCount: columns.reduce((sum, column) => sum + column.blankCount, 0),
        nullEquivalentCount: columns.reduce((sum, column) => sum + column.nullEquivalentCount, 0),
        invalidCount: columns.reduce((sum, column) => sum + column.invalidCount, 0),
        unexpectedNonNullCount: columns.reduce((sum, column) => sum + column.unexpectedNonNullCount, 0),
        affectedColumnValues: columns.reduce((sum, column) => sum + column.affectedCount, 0),
        identityMismatchRows,
      },
      warnings,
    };
  }

  async repairPriceIdentity(options: MarketDataRepairRequest & { dryRun?: boolean } = {}): Promise<MarketDataPriceIdentityRepairSummary> {
    const scope = {
      region: options.region?.trim().toUpperCase() || 'IN',
      assetType: options.assetType?.trim().toUpperCase() || 'STOCK',
    };
    const batchSize = Math.max(1, Math.min(options.batchSize ?? options.limit ?? 25, 100));
    const offset = Math.max(0, options.offset ?? 0);
    const dryRun = options.dryRun !== false;
    const stocks = (await this.repository.listStocksForUniverseHealth(scope))
      .filter((stock) => stock.isActive !== false && stock.isDelisted !== true);
    const symbols = [...new Set(stocks.flatMap((stock) => [stock.symbol, stock.providerSymbol]).filter((value): value is string => typeof value === 'string' && value.trim().length > 0))];
    const priceStatsBySymbol = await this.repository.priceReadinessStatsForSymbols(symbols);
    const providerOwnerCounts = new Map<string, number>();
    const baseOwnerCounts = new Map<string, Set<string>>();
    for (const stock of stocks) {
      const providerSymbol = this.trimmedUpper(stock.providerSymbol);
      if (providerSymbol) providerOwnerCounts.set(providerSymbol, (providerOwnerCounts.get(providerSymbol) || 0) + 1);
      for (const value of [stock.symbol, stock.providerSymbol, stock.sourceSymbol, stock.displaySymbol]) {
        const base = this.baseSymbolFromProviderSymbol(String(value || ''));
        if (!base) continue;
        const owners = baseOwnerCounts.get(base) || new Set<string>();
        owners.add(String(stock.id || stock.symbol || base));
        baseOwnerCounts.set(base, owners);
      }
    }

    const candidates = stocks
      .map((stock) => this.priceIdentityRepairCandidate(stock, priceStatsBySymbol, providerOwnerCounts, baseOwnerCounts))
      .filter((candidate): candidate is MarketDataPriceIdentityRepairCandidate => Boolean(candidate));
    const batch = candidates.slice(offset, offset + batchSize);
    const samples: MarketDataPriceIdentityRepairCandidate[] = [];
    const warnings: string[] = [];
    let repaired = 0;
    let skipped = 0;
    let priceRowsMoved = 0;
    let latestPricesMoved = 0;
    const skipReasonCounts: Record<string, number> = {};
    const recordSkip = (candidate: MarketDataPriceIdentityRepairCandidate, code = candidate.skippedReasonCode || 'UNKNOWN_SKIP') => {
      skipped += 1;
      skipReasonCounts[code] = (skipReasonCounts[code] || 0) + 1;
    };

    for (const candidate of batch) {
      if (candidate.skippedReason) {
        recordSkip(candidate);
        samples.push({ ...candidate, action: 'SKIPPED' });
        continue;
      }
      if (dryRun) {
        samples.push({ ...candidate, action: 'DRY_RUN' });
        continue;
      }
      try {
        if (await this.repository.latestPriceExists(candidate.symbol)) {
          const skippedCandidate = { ...candidate, action: 'SKIPPED' as const, skippedReasonCode: 'TARGET_LATEST_PRICE_COLLISION', skippedReason: 'Target latest price already exists.' };
          recordSkip(skippedCandidate);
          samples.push(skippedCandidate);
          continue;
        }
        const result = await this.repository.reassignPriceRowsToCanonicalSymbol({
          stockId: candidate.stockId,
          fromSymbol: candidate.providerSymbol as string,
          toSymbol: candidate.symbol,
        });
        repaired += 1;
        priceRowsMoved += result.priceRowsMoved;
        latestPricesMoved += result.latestPricesMoved;
        samples.push({
          ...candidate,
          action: 'REPAIRED',
          priceRowsMoved: result.priceRowsMoved,
          latestPricesMoved: result.latestPricesMoved,
        });
      } catch (error: any) {
        const message = error?.message || 'Price identity reassignment failed.';
        const code = typeof message === 'string' && message.includes(':') ? message.split(':')[0] : 'REASSIGN_FAILED';
        const skippedCandidate = { ...candidate, action: 'SKIPPED' as const, skippedReasonCode: code, skippedReason: message };
        recordSkip(skippedCandidate, code);
        samples.push(skippedCandidate);
      }
    }

    if (candidates.length > offset + batchSize) warnings.push(`${candidates.length - offset - batchSize} price identity candidates remain after this bounded batch.`);
    if (dryRun) warnings.push('Dry run only; no price rows were reassigned.');

    return {
      scope,
      generatedAt: new Date().toISOString(),
      dryRun,
      totalCandidates: candidates.length,
      repaired,
      skipped,
      priceRowsMoved,
      latestPricesMoved,
      skipReasonCounts,
      samples,
      warnings,
    };
  }

  async universeHealth(
    options: Pick<PaginationOptions, 'region' | 'assetType'> = {},
    snapshot?: UniverseComputationSnapshot
  ): Promise<MarketDataUniverseHealth> {
    const scope = {
      region: options.region?.trim().toUpperCase() || 'IN',
      assetType: options.assetType?.trim().toUpperCase() || 'STOCK',
    };
    const activeSnapshot = snapshot ?? await this.tryUniverseComputationSnapshot(scope);
    const stocks = activeSnapshot?.stocks ?? await this.repository.listStocksForUniverseHealth(scope);
    const readinessAndStats = activeSnapshot ? null : await this.universeReadinessAndStatsForStocks(stocks, scope);
    const readinessBySymbol = activeSnapshot?.readinessBySymbol ?? readinessAndStats!.readinessBySymbol;
    const statsBySymbol = activeSnapshot?.statsBySymbol ?? readinessAndStats!.statsBySymbol;
    const validationWindow = activeSnapshot?.validationWindow ?? this.providerValidationWindow(scope);
    const latestStoredEodDate = this.latestDateFromReadiness(readinessBySymbol);
    const expectedLatestTradingDate = latestCompletedTradingDateForRegion(scope.region);
    const priceBackfillBlockedStockIds = activeSnapshot?.priceBackfillBlockedStockIds ?? await this.blockedPriceBackfillStockIds(scope);
    const generatedAt = new Date().toISOString();
    const counts = this.emptyUniverseCounts();
    const blockerCounts = new Map<string, number>();
    let metadataCompleteCount = 0;

    for (const stock of stocks) {
      const readiness = readinessBySymbol.get(stock.symbol);
      if (!readiness) continue;
      let hasRequiredHistoryCoverage = true;
      counts.totalCatalogInstruments += 1;
      counts[readiness.universeState] += 1;
      counts.byUniverseState[readiness.universeState] += 1;
      const isInactiveOrDelisted = stock.isActive === false || stock.isDelisted === true;
      if (isInactiveOrDelisted) counts.inactiveOrDelistedInstruments += 1;
      else counts.activeInstruments += 1;
      const providerStatus = normalizeProviderStatus(stock.providerSupportStatus);
      if (!isInactiveOrDelisted) {
        const priceBackfillBlockReason = providerStatus === 'SUPPORTED'
          ? this.priceBackfillBlockReason(activeSnapshot?.repairStatesByStockId, stock.id, priceBackfillBlockedStockIds.has(stock.id))
          : null;
        let priceBackfillFallbackCounted = false;
        const recordSupportedPriceBackfillNeed = () => {
          if (priceBackfillBlockReason === 'retry') return;
          if (priceBackfillBlockReason === 'manual') {
            if (!priceBackfillFallbackCounted) {
              counts.historyCoverageFallbackRequired = (counts.historyCoverageFallbackRequired || 0) + 1;
              priceBackfillFallbackCounted = true;
            }
            return;
          }
          counts.supportedPriceBackfillNeeded += 1;
        };
        if (providerStatus === 'SUPPORTED') counts.providerSupported += 1;
        if (providerStatus === 'UNKNOWN') {
          counts.providerUnknown += 1;
          counts.providerUnknownValidationNeeded += 1;
        }
        if (providerStatus === 'VALIDATION_FAILED') {
          counts.providerRetryValidationNeeded += 1;
          counts.providerValidationFailed += 1;
        }
        if (providerStatus === 'UNSUPPORTED') {
          counts.unsupported += 1;
          counts.unsupportedExcluded += 1;
          counts.providerUnsupportedExcluded += 1;
        }
        if (providerStatus === 'VALIDATION_FAILED') counts.unsupported += 1;
        if (providerStatus === 'SUPPORTED' && (readiness.readinessBlockers.includes('MISSING_ISIN') || readiness.readinessBlockers.includes('MISSING_LISTING_DATE'))) {
          counts.supportedCatalogIdentityRepairNeeded += 1;
        }
        if (providerStatus === 'SUPPORTED' && (readiness.readinessBlockers.includes('MISSING_SECTOR') || readiness.readinessBlockers.includes('MISSING_INDUSTRY') || readiness.readinessBlockers.includes('MISSING_MARKET_CAP'))) {
          counts.supportedBusinessMetadataRepairNeeded += 1;
        }
        if (providerStatus === 'SUPPORTED' && readiness.priceReadiness !== 'READY') {
          recordSupportedPriceBackfillNeed();
        }
        if (providerStatus === 'SUPPORTED') {
          const historyDiagnostics = this.requiredHistoryDiagnostics(stock, validationWindow, this.priceStatsForStock(statsBySymbol, stock));
          if (!historyDiagnostics.requiredHistoryComplete) {
            hasRequiredHistoryCoverage = false;
            counts.historyCoverageIncomplete = (counts.historyCoverageIncomplete || 0) + 1;
            if (readiness.priceReadiness === 'READY') recordSupportedPriceBackfillNeed();
          }
          if (historyDiagnostics.listingDateMissing) {
            counts.historyCoverageListingDateMissing = (counts.historyCoverageListingDateMissing || 0) + 1;
          }
        }
        if (readiness.universeState === 'CATALOG_ONLY') counts.catalogOnly += 1;
        if (readiness.universeState === 'STALE_OR_INCOMPLETE') counts.staleOrIncomplete += 1;
        if (readiness.isPriceReady) {
          counts.priceReady += 1;
          counts.readiness.priceReady += 1;
        }
        if (readiness.isContextReady) {
          counts.contextReady += 1;
          counts.readiness.contextReady += 1;
        }
        if (readiness.isReviewReady && hasRequiredHistoryCoverage) {
          counts.reviewReady += 1;
          counts.readiness.reviewReady += 1;
        }
        if (!readiness.latestPriceDate) counts.missingLatestPrice += 1;
        if (readiness.readinessBlockers.includes('STALE_LATEST_PRICE')) counts.staleLatestPrice += 1;
        if (readiness.readinessBlockers.includes('INADEQUATE_PRICE_HISTORY') || readiness.readinessBlockers.includes('INADEQUATE_ROLLING_PRICE_WINDOW') || readiness.readinessBlockers.includes('PRICE_HISTORY_GAPS')) counts.missingOrInadequatePriceHistory += 1;
        if (readiness.readinessBlockers.includes('MISSING_RECENT_VOLUME') || readiness.readinessBlockers.includes('LOW_RECENT_VOLUME_COVERAGE')) counts.missingRecentVolume += 1;
        if (readiness.readinessBlockers.includes('MISSING_SECTOR')) counts.missingSector += 1;
        if (readiness.readinessBlockers.includes('MISSING_INDUSTRY')) counts.missingIndustry += 1;
        if (readiness.readinessBlockers.includes('MISSING_COUNTRY')) counts.missingCountry += 1;
        if (readiness.readinessBlockers.includes('MISSING_CURRENCY')) counts.missingCurrency += 1;
        if (readiness.readinessBlockers.includes('MISSING_MARKET_CAP')) counts.missingMarketCap += 1;
        if (readiness.readinessBlockers.includes('MISSING_ISIN')) counts.missingIsin += 1;
        if (readiness.readinessBlockers.includes('MISSING_LISTING_DATE')) counts.missingListingDate += 1;
        if (readiness.metadataCompletenessScore === 100) metadataCompleteCount += 1;
      }
      for (const blocker of readiness.readinessBlockers) {
        blockerCounts.set(blocker, (blockerCounts.get(blocker) || 0) + 1);
      }
    }

    const activeDenominator = counts.activeInstruments || counts.totalCatalogInstruments || 1;
    await this.assignProviderValidationQueueCounts(counts, scope, activeSnapshot);
    const coverage = {
      priceCoveragePercentage: this.percent(counts.priceReady, activeDenominator),
      metadataCoveragePercentage: this.percent(metadataCompleteCount, activeDenominator),
      reviewReadyPercentage: this.percent(counts.reviewReady, activeDenominator),
    };
    const warnings: string[] = [];
    if (counts.providerUnknown > 0) warnings.push(`${counts.providerUnknown} instruments still have UNKNOWN provider support.`);
    if (counts.providerRetryValidationNeeded > 0) warnings.push(`${counts.providerRetryValidationNeeded} provider validations failed and need an explicit retry or provider diagnosis.`);
    if (counts.missingLatestPrice > 0) warnings.push(`${counts.missingLatestPrice} instruments have no latest stored EOD price.`);
    if (counts.missingSector > 0 || counts.missingIndustry > 0) {
      warnings.push(`${counts.missingSector} instruments are missing sector and ${counts.missingIndustry} are missing industry metadata.`);
    }
    if (counts.missingIsin > 0 || counts.missingListingDate > 0) {
      warnings.push(`${counts.missingIsin} instruments are missing ISIN and ${counts.missingListingDate} are missing listing date metadata.`);
    }
    if (counts.reviewReady === 0 && counts.totalCatalogInstruments > 0) warnings.push('No instruments currently satisfy REVIEW_READY rules.');

    const trustReasons = this.universeTrustReasons(counts, coverage);
    const healthWithoutSignoff = {
      scope,
      generatedAt,
      latestStoredEodDate,
      expectedLatestTradingDate,
      counts,
      coverage,
      topBlockers: this.topUniverseBlockers(blockerCounts),
      warnings,
      trustStatus: this.universeTrustStatus(counts, coverage),
      trustReasons,
    } as Omit<MarketDataUniverseHealth, 'universeSignoff'>;
    return {
      ...healthWithoutSignoff,
      universeSignoff: this.universeSignoffFromHealth(healthWithoutSignoff),
    };
  }

  async trustedReviewUniverseHealth(options: TrustedReviewUniverseOptions = {}): Promise<TrustedReviewUniverseHealth> {
    const scope = {
      region: options.region?.trim().toUpperCase() || 'IN',
      assetType: options.assetType?.trim().toUpperCase() || 'STOCK',
    };
    const snapshot = await this.tryUniverseComputationSnapshot(scope, options.now);
    return (await this.trustedReviewUniverseEvaluation(options, snapshot ?? undefined)).health;
  }

  async reviewReadinessSummary(options: TrustedReviewUniverseOptions = {}): Promise<ReviewReadinessSummary> {
    const scope = {
      region: options.region?.trim().toUpperCase() || 'IN',
      assetType: options.assetType?.trim().toUpperCase() || 'STOCK',
    };
    const snapshot = await this.tryUniverseComputationSnapshot(scope, options.now);
    const [health, reviewUniverse, repairPlan] = await Promise.all([
      this.universeHealth(scope, snapshot ?? undefined),
      snapshot
        ? this.trustedReviewUniverseEvaluation({ ...scope, now: options.now }, snapshot).then((result) => result.health)
        : this.trustedReviewUniverseHealth({ ...scope, now: options.now }),
      this.repairPlan(scope, snapshot ?? undefined),
    ]);
    const readinessCounts = {
      priceReady: health.counts.priceReady,
      contextReady: health.counts.contextReady,
      reviewReady: health.counts.reviewReady,
      missingLatestPrice: health.counts.missingLatestPrice,
      staleLatestPrice: health.counts.staleLatestPrice,
      inadequateHistory: health.counts.missingOrInadequatePriceHistory,
      missingRecentVolume: health.counts.missingRecentVolume,
      providerUnknown: repairPlan.providerUnknownValidationNeeded ?? health.counts.providerUnknownValidationNeeded,
      providerValidationFailedRetryable: repairPlan.providerRetryValidationNeeded ?? health.counts.providerRetryValidationNeeded,
      unsupportedExcluded: repairPlan.providerUnsupportedExcluded ?? health.counts.unsupportedExcluded,
    };
    const blockers = this.reviewReadinessBlockers(scope, health, reviewUniverse, repairPlan);
    const nextAction = this.reviewReadinessNextAction(blockers);
    const userDecision = this.reviewReadinessUserDecision(reviewUniverse.mode, health.trustStatus, blockers, nextAction);

    return {
      scope,
      generatedAt: new Date().toISOString(),
      reviewMode: reviewUniverse.mode,
      trustStatus: health.trustStatus,
      userDecision,
      reviewUniverse: {
        catalogCount: reviewUniverse.catalogCount,
        providerSupportedCount: reviewUniverse.providerSupportedCount,
        trustedCount: reviewUniverse.trustedCount,
        targetTradingDate: reviewUniverse.targetTradingDate,
        requiredDataThroughDate: reviewUniverse.requiredDataThroughDate,
        storedDataThroughDate: reviewUniverse.storedDataThroughDate,
      },
      readinessCounts,
      blockers,
      nextAction,
      warnings: [...new Set([
        ...reviewUniverse.warnings,
        ...health.warnings,
        ...repairPlan.warnings,
      ])].slice(0, 12),
    };
  }

  async trustedUniverseRepairWorkbench(options: TrustedReviewUniverseOptions = {}): Promise<TrustedUniverseRepairWorkbench> {
    const scope = {
      region: 'IN' as const,
      assetType: 'STOCK' as const,
    };
    const [readinessSummary, repairPlan, latestRun] = await Promise.all([
      this.reviewReadinessSummary({ ...options, region: scope.region, assetType: scope.assetType }),
      this.repairPlan(scope),
      this.latestRepairRun(scope),
    ]);
    const runActive = latestRun?.status === 'RUNNING';
    const boundedBatchSize = 50;
    const trustedUniverseBlocker = readinessSummary.blockers.find((item) => item.category === 'INSUFFICIENT_TRUSTED_UNIVERSE');
    const lanes: MarketDataRepairLane[] = [
      this.buildRepairLane({
        code: 'PROVIDER_VALIDATION',
        label: 'Provider validation',
        actionCodes: ['VALIDATE_PROVIDERS', 'RETRY_FAILED_PROVIDERS'],
        actionCode: (repairPlan.providerUnknownValidationNeeded ?? repairPlan.providerValidationNeeded) > 0 ? 'VALIDATE_PROVIDERS' : 'RETRY_FAILED_PROVIDERS',
        endpoint: '/api/v1/market-data/provider/validate',
        affectedCount: (repairPlan.providerUnknownValidationNeeded ?? repairPlan.providerValidationNeeded ?? 0) + (repairPlan.providerRetryValidationNeeded ?? repairPlan.retryFailedValidations ?? 0),
        eligibleNowCount: (repairPlan.providerUnknownValidationNeeded ?? repairPlan.providerValidationNeeded ?? 0) + (repairPlan.providerRetryValidationNeeded ?? repairPlan.retryFailedValidations ?? 0),
        retryableFailureCount: repairPlan.providerRetryValidationNeeded ?? repairPlan.retryFailedValidations ?? 0,
        manualRequiredCount: 0,
        skippedRecentAttemptCount: 0,
        expectedEffect: 'Validates UNKNOWN and retry-failed provider support before instruments can enter downstream price and identity repair lanes.',
        latestRun,
        runActive,
        boundedBatchSize,
        request: {
          region: scope.region,
          assetType: scope.assetType,
          batchSize: boundedBatchSize,
          offset: 0,
          queueMode: (repairPlan.providerUnknownValidationNeeded ?? repairPlan.providerValidationNeeded ?? 0) > 0 ? 'UNKNOWN_FIRST' : 'RETRY_FAILED',
        },
      }),
      this.buildRepairLane({
        code: 'PRICE_BACKFILL',
        label: 'Price backfill',
        actionCodes: ['BACKFILL_PRICES'],
        actionCode: 'BACKFILL_PRICES',
        endpoint: '/api/v1/market-data/prices/backfill',
        affectedCount: repairPlan.supportedPriceBackfillNeeded ?? repairPlan.priceBackfillNeeded ?? 0,
        eligibleNowCount: repairPlan.supportedPriceBackfillNeeded ?? repairPlan.priceBackfillNeeded ?? 0,
        retryableFailureCount: 0,
        manualRequiredCount: 0,
        skippedRecentAttemptCount: 0,
        expectedEffect: 'Backfills bounded EOD price history for provider-supported stocks that are missing latest or adequate historical bars.',
        latestRun,
        runActive,
        boundedBatchSize,
        request: { region: scope.region, assetType: scope.assetType, batchSize: boundedBatchSize, offset: 0 },
      }),
      this.buildRepairLane({
        code: 'STALE_EOD',
        label: 'Stale EOD',
        actionCodes: ['BACKFILL_PRICES'],
        actionCode: 'BACKFILL_PRICES',
        endpoint: '/api/v1/market-data/prices/backfill',
        affectedCount: readinessSummary.readinessCounts.staleLatestPrice,
        eligibleNowCount: Math.min(readinessSummary.readinessCounts.staleLatestPrice, repairPlan.supportedPriceBackfillNeeded ?? repairPlan.priceBackfillNeeded ?? 0),
        retryableFailureCount: 0,
        manualRequiredCount: 0,
        skippedRecentAttemptCount: 0,
        expectedEffect: 'Refreshes stale daily candles toward the required data-through date without launching an unbounded full-universe sweep.',
        latestRun,
        runActive,
        boundedBatchSize,
        request: { region: scope.region, assetType: scope.assetType, batchSize: boundedBatchSize, offset: 0 },
      }),
      this.buildRepairLane({
        code: 'CATALOG_IDENTITY',
        label: 'Catalog identity',
        actionCodes: ['CATALOG_IDENTITY_REPAIR'],
        actionCode: 'CATALOG_IDENTITY_REPAIR',
        endpoint: '/api/v1/market-data/catalog/identity-repair',
        affectedCount: repairPlan.supportedCatalogIdentityRepairNeeded ?? repairPlan.catalogIdentityRepairNeeded ?? 0,
        eligibleNowCount: repairPlan.supportedCatalogIdentityRepairNeeded ?? repairPlan.catalogIdentityRepairNeeded ?? 0,
        retryableFailureCount: 0,
        manualRequiredCount: 0,
        skippedRecentAttemptCount: 0,
        expectedEffect: 'Repairs provider symbol, source symbol, ISIN, listing date, and exchange identity from the configured bounded catalog source.',
        latestRun,
        runActive,
        boundedBatchSize,
        request: { region: scope.region, assetType: scope.assetType, batchSize: boundedBatchSize, offset: 0 },
      }),
      this.buildRepairLane({
        code: 'PROVIDER_BUSINESS_METADATA',
        label: 'Provider business metadata',
        actionCodes: ['PROVIDER_BUSINESS_METADATA_REPAIR'],
        actionCode: 'PROVIDER_BUSINESS_METADATA_REPAIR',
        endpoint: '/api/v1/market-data/metadata/provider-business/repair',
        affectedCount: repairPlan.supportedBusinessMetadataRepairNeeded ?? repairPlan.businessMetadataRepairNeeded ?? 0,
        eligibleNowCount: repairPlan.businessMetadataAutoRepairable + repairPlan.businessMetadataRetryEligible,
        retryableFailureCount: repairPlan.businessMetadataRetryEligible,
        manualRequiredCount: repairPlan.businessMetadataManualRequired + repairPlan.manualBusinessMetadataRequired,
        skippedRecentAttemptCount: repairPlan.businessMetadataRecentlyAttempted,
        expectedEffect: 'Fills sector, industry, market cap, ISIN, or listing-date fields when provider business metadata is available.',
        latestRun,
        runActive,
        boundedBatchSize,
        request: { region: scope.region, assetType: scope.assetType, batchSize: boundedBatchSize, offset: 0 },
      }),
      this.buildRepairLane({
        code: 'MANUAL_METADATA_IMPORT',
        label: 'Manual metadata import',
        actionCodes: ['MANUAL_METADATA_IMPORT'],
        actionCode: 'MANUAL_METADATA_IMPORT',
        endpoint: '/api/v1/market-data/metadata/manual-import',
        affectedCount: repairPlan.manualBusinessMetadataRequired ?? repairPlan.manualMetadataRequired ?? 0,
        eligibleNowCount: 0,
        retryableFailureCount: 0,
        manualRequiredCount: repairPlan.manualBusinessMetadataRequired ?? repairPlan.manualMetadataRequired ?? 0,
        skippedRecentAttemptCount: 0,
        expectedEffect: 'Imports operator-curated business metadata from an explicit CSV payload after provider repair cannot fill the gap.',
        latestRun,
        runActive,
        boundedBatchSize,
        disabledReason: (repairPlan.manualBusinessMetadataRequired ?? repairPlan.manualMetadataRequired ?? 0) > 0 ? 'Requires explicit manual metadata CSV payload.' : undefined,
        request: { region: scope.region, assetType: scope.assetType, batchSize: boundedBatchSize, offset: 0 },
      }),
      this.buildRepairLane({
        code: 'INSUFFICIENT_TRUSTED_UNIVERSE',
        label: 'Insufficient trusted universe',
        actionCodes: [],
        actionCode: 'REVIEW_REPAIR_PLAN',
        endpoint: '/api/v1/market-data/universe/repair-plan',
        affectedCount: trustedUniverseBlocker?.affectedCount ?? 0,
        eligibleNowCount: 0,
        retryableFailureCount: 0,
        manualRequiredCount: 0,
        skippedRecentAttemptCount: 0,
        expectedEffect: 'Reconciles trusted count, blocker counts, and review mode after the concrete repair lanes complete.',
        latestRun,
        runActive,
        boundedBatchSize,
        disabledReason: 'Run a concrete provider, catalog, metadata, or price lane first.',
        request: { region: scope.region, assetType: scope.assetType, batchSize: boundedBatchSize },
      }),
    ];

    const recommendedNextLane = this.recommendedRepairLane(readinessSummary.nextAction?.code, lanes);
    return {
      scope,
      generatedAt: new Date().toISOString(),
      readinessSummary,
      repairRun: latestRun,
      lanes,
      recommendedNextLane,
      warnings: [...new Set([
        ...readinessSummary.warnings,
        ...repairPlan.warnings,
        ...(latestRun?.warnings || []),
      ])].slice(0, 20),
    };
  }

  async listTrustedReviewUniverseInstruments(
    options: TrustedReviewUniverseOptions & { limit?: number; offset?: number } = {}
  ): Promise<TrustedReviewUniverseInstrument[]> {
    const limit = Math.max(1, Math.min(Number(options.limit) || 100, 500));
    const offset = Math.max(Number(options.offset) || 0, 0);
    const evaluation = await this.trustedReviewUniverseEvaluation(options);
    const selected = evaluation.trustedStocks.slice(offset, offset + limit);
    const selectedReadinessBySymbol = new Map(selected.map((item) => [item.stock.symbol, item.readiness]));
    const selectedStatsBySymbol = new Map(selected.map((item) => [item.stock.symbol, item.stats]));
    const baselineByStockId = await this.trustedBaselineByStockId(
      selected.map((item) => item.stock),
      selectedReadinessBySymbol,
      selectedStatsBySymbol,
      evaluation.health.scope
    );
    const historyBySymbol = typeof (this.repository as any).priceHistoryForSymbols === 'function'
      ? await (this.repository as any).priceHistoryForSymbols(selected.map((item) => item.stock.symbol), { perSymbolLimit: 320 })
      : new Map<string, never[]>();

    return selected.map(({ stock, readiness, stats, contextGaps, warnings }) => ({
      id: stock.id,
      symbol: stock.symbol,
      companyName: stock.name || null,
      region: stock.region || evaluation.health.scope.region,
      assetType: stock.assetType || evaluation.health.scope.assetType,
      exchange: stock.exchange || null,
      providerSymbol: stock.providerSymbol || stock.symbol || null,
      latestPriceDate: readiness.latestPriceDate,
      priceHistoryBars: readiness.priceHistoryBars,
      rollingWindowBars: readiness.rollingWindowBars,
      hasRecentVolume: readiness.hasRecentVolume,
      latestClose: this.numericOrNull(stats?.latestClose),
      latestVolume: this.numericOrNull(stats?.latestVolume),
      adjustedCloseAvailable: !readiness.usesAdjustedCloseFallback,
      usesAdjustedCloseFallback: readiness.usesAdjustedCloseFallback,
      trustedBaselineResidualState: baselineByStockId.get(stock.id)?.trustedBaselineResidualState ?? 'REVIEW_READY',
      trustedBaselineBlockerCodes: baselineByStockId.get(stock.id)?.trustedBaselineBlockerCodes ?? [],
      latestCompletedEodDate: baselineByStockId.get(stock.id)?.latestCompletedEodDate ?? null,
      latestCompletedEodPresent: baselineByStockId.get(stock.id)?.latestCompletedEodPresent ?? false,
      storedDataThroughDate: baselineByStockId.get(stock.id)?.storedDataThroughDate ?? readiness.latestPriceDate,
      requiredHistoryStartDate: baselineByStockId.get(stock.id)?.requiredHistoryStartDate ?? null,
      requiredHistoryEndDate: baselineByStockId.get(stock.id)?.requiredHistoryEndDate ?? null,
      requiredHistoryStatus: baselineByStockId.get(stock.id)?.requiredHistoryStatus ?? 'INCOMPLETE',
      listingDate: baselineByStockId.get(stock.id)?.listingDate ?? null,
      listingDateStatus: baselineByStockId.get(stock.id)?.listingDateStatus ?? 'MISSING_USED_15_YEAR_TARGET',
      providerFallbackState: baselineByStockId.get(stock.id)?.providerFallbackState ?? 'PROVIDER_SUPPORTED',
      primarySourceAttempted: baselineByStockId.get(stock.id)?.primarySourceAttempted ?? 'YAHOO',
      fallbackSourcesAttempted: baselineByStockId.get(stock.id)?.fallbackSourcesAttempted ?? [],
      sourceFallbackReason: baselineByStockId.get(stock.id)?.sourceFallbackReason ?? null,
      contextGaps,
      warnings,
      priceHistory: historyBySymbol.get(stock.symbol) || [],
    }));
  }

  private async trustedReviewUniverseEvaluation(
    options: TrustedReviewUniverseOptions = {},
    snapshot?: UniverseComputationSnapshot
  ) {
    const scope = {
      region: options.region?.trim().toUpperCase() || 'IN',
      assetType: options.assetType?.trim().toUpperCase() || 'STOCK',
    };
    const now = options.now instanceof Date && Number.isFinite(options.now.getTime()) ? options.now : new Date();
    const stocks = snapshot?.stocks ?? await this.repository.listStocksForUniverseHealth(scope);
    const readinessAndStats = snapshot ? null : await this.universeReadinessAndStatsForStocks(stocks, scope);
    const readinessBySymbol = snapshot?.readinessBySymbol ?? readinessAndStats!.readinessBySymbol;
    const statsBySymbol = snapshot?.statsBySymbol ?? readinessAndStats!.statsBySymbol;
    const reviewDatePolicy = this.trustedReviewDatePolicy(scope.region, now);
    const validationWindow = snapshot?.validationWindow ?? this.providerValidationWindow(scope, now);
    const expectedLatestTradingDate = reviewDatePolicy.requiredDataThroughDate;
    const minLiteCount = Math.max(this.readPositiveNumber(process.env.TRUSTED_REVIEW_MIN_LITE, 100), 1);
    const minFullCount = Math.max(this.readPositiveNumber(process.env.TRUSTED_REVIEW_MIN_FULL, 300), minLiteCount);
    const excludedCounts = this.emptyTrustedReviewExcludedCounts();
    const contextGapCounts = this.emptyTrustedReviewContextGapCounts();
    const trustedStocks: Array<{
      stock: any;
      readiness: InstrumentUniverseReadiness;
      stats: any;
      contextGaps: string[];
      warnings: string[];
    }> = [];
    let providerSupportedCount = 0;
    let dataThroughDate: string | null = null;
    let storedDataThroughDate: string | null = null;

    for (const stock of stocks) {
      const readiness = readinessBySymbol.get(stock.symbol);
      if (!readiness) continue;
      const stats = this.priceStatsForStock(statsBySymbol, stock) || null;
      const isInactiveOrDelisted = stock.isActive === false || stock.isDelisted === true;
      if (isInactiveOrDelisted) {
        excludedCounts.inactiveOrDelisted += 1;
        continue;
      }

      const providerStatus = normalizeProviderStatus(stock.providerSupportStatus);
      if (providerStatus === 'UNKNOWN') {
        excludedCounts.providerUnknown += 1;
        continue;
      }
      if (providerStatus === 'VALIDATION_FAILED') {
        excludedCounts.providerRetryFailed += 1;
        continue;
      }
      if (providerStatus === 'UNSUPPORTED') {
        excludedCounts.providerUnsupported += 1;
        continue;
      }

      providerSupportedCount += 1;
      if (!readiness.latestPriceDate) {
        excludedCounts.noLatestPrice += 1;
        continue;
      }
      if (!storedDataThroughDate || readiness.latestPriceDate > storedDataThroughDate) storedDataThroughDate = readiness.latestPriceDate;
      if (!expectedLatestTradingDate || readiness.latestPriceDate < expectedLatestTradingDate) {
        excludedCounts.staleLatestPrice += 1;
        continue;
      }
      if (readiness.priceHistoryBars < 120) {
        excludedCounts.insufficientBarsUnder120 += 1;
        continue;
      }
      if (!readiness.hasRecentVolume) {
        excludedCounts.missingRecentVolume += 1;
        continue;
      }
      if (readiness.readinessBlockers.includes('CRITICAL_CORPORATE_ACTION_PRICE_WARNING')) {
        excludedCounts.corporateActionBlocked += 1;
        continue;
      }
      const historyDiagnostics = this.requiredHistoryDiagnostics(stock, validationWindow, stats);
      if (!historyDiagnostics.requiredHistoryComplete) {
        excludedCounts.requiredHistoryIncomplete += 1;
        continue;
      }
      if (readiness.priceHistoryBars < 252) excludedCounts.insufficientBarsUnder252 += 1;

      const contextGaps = this.trustedReviewContextGaps(stock);
      for (const gap of contextGaps) {
        if (gap === 'sector') contextGapCounts.missingSector += 1;
        if (gap === 'industry') contextGapCounts.missingIndustry += 1;
        if (gap === 'marketCap') contextGapCounts.missingMarketCap += 1;
        if (gap === 'isin') contextGapCounts.missingIsin += 1;
        if (gap === 'listingDate') contextGapCounts.missingListingDate += 1;
      }
      const warnings = [
        ...readiness.readinessWarnings,
        ...(readiness.usesAdjustedCloseFallback ? ['Adjusted close is missing for at least one recent candle; close fallback is used for lite review.'] : []),
        ...(readiness.priceHistoryBars < 252 ? ['Less than 252 bars; lite review only.'] : []),
        ...(contextGaps.length > 0 ? [`Context gaps: ${contextGaps.join(', ')}.`] : []),
      ];
      if (!dataThroughDate || readiness.latestPriceDate > dataThroughDate) dataThroughDate = readiness.latestPriceDate;
      trustedStocks.push({ stock, readiness, stats, contextGaps, warnings });
    }

    trustedStocks.sort((left, right) => {
      const volumeDiff = (this.numericOrNull(right.stats?.latestVolume) ?? 0) - (this.numericOrNull(left.stats?.latestVolume) ?? 0);
      if (volumeDiff !== 0) return volumeDiff;
      const historyDiff = (right.readiness.priceHistoryBars || 0) - (left.readiness.priceHistoryBars || 0);
      if (historyDiff !== 0) return historyDiff;
      const rightDate = right.readiness.latestPriceDate || '';
      const leftDate = left.readiness.latestPriceDate || '';
      if (rightDate !== leftDate) return rightDate.localeCompare(leftDate);
      return String(left.stock.symbol || '').localeCompare(String(right.stock.symbol || ''));
    });

    const trustedCount = trustedStocks.length;
    const status: TrustedReviewUniverseStatus = trustedCount >= minFullCount ? 'READY' : trustedCount >= minLiteCount ? 'LIMITED' : 'NOT_READY';
    const mode: TrustedReviewUniverseMode = status === 'READY' ? 'FULL_REVIEW' : status === 'LIMITED' ? 'LIMITED_REVIEW' : 'NO_REVIEW';
    const warnings: string[] = [];
    if (mode === 'LIMITED_REVIEW') warnings.push('Limited review mode: candidates are generated only from stocks with current price, sufficient OHLCV history, and recent volume.');
    if (mode === 'NO_REVIEW') warnings.push(`Trusted review universe has ${trustedCount} instruments; at least ${minLiteCount} are required for Today review generation.`);
    if (Object.values(contextGapCounts).some((count) => count > 0)) {
      warnings.push('Missing metadata is shown as context gap, not a hard blocker for price-action review.');
    }
    if (excludedCounts.insufficientBarsUnder252 > 0) {
      warnings.push(`${excludedCounts.insufficientBarsUnder252} trusted instruments have fewer than 252 bars and are limited to lite evidence.`);
    }
    if (excludedCounts.requiredHistoryIncomplete > 0) {
      warnings.push(`${excludedCounts.requiredHistoryIncomplete} provider-supported instruments are excluded until they have 15 years of daily OHLCV, or listing-date-to-latest coverage for newer listings.`);
    }
    if (storedDataThroughDate && expectedLatestTradingDate && storedDataThroughDate < expectedLatestTradingDate) {
      warnings.push(`Stored data-through date ${storedDataThroughDate} is older than required data-through date ${expectedLatestTradingDate}.`);
    }

    return {
      health: {
        scope,
        asOfDate: now.toISOString().slice(0, 10),
        targetTradingDate: reviewDatePolicy.targetTradingDate,
        requiredDataThroughDate: reviewDatePolicy.requiredDataThroughDate,
        storedDataThroughDate,
        catalogCount: stocks.length,
        providerSupportedCount,
        trustedCount,
        status,
        mode,
        minLiteCount,
        minFullCount,
        dataThroughDate: dataThroughDate || storedDataThroughDate,
        scanPolicy: {
          scanLimit: trustedCount,
          scanComplete: true,
          scanOrdering: TRUSTED_REVIEW_SCAN_ORDERING,
        },
        excludedCounts,
        contextGapCounts,
        warnings,
      },
      trustedStocks,
    };
  }

  async repairPlan(
    options: Pick<PaginationOptions, 'region' | 'assetType'> = {},
    snapshot?: UniverseComputationSnapshot
  ): Promise<MarketDataRepairPlan> {
    const scope = {
      region: options.region?.trim().toUpperCase() || 'IN',
      assetType: options.assetType?.trim().toUpperCase() || 'STOCK',
    };
    const activeSnapshot = snapshot ?? await this.tryUniverseComputationSnapshot(scope);
    const stocks = activeSnapshot?.stocks ?? await this.repository.listStocksForUniverseHealth(scope);
    const readinessAndStats = activeSnapshot ? null : await this.universeReadinessAndStatsForStocks(stocks, scope);
    const readinessBySymbol = activeSnapshot?.readinessBySymbol ?? readinessAndStats!.readinessBySymbol;
    const statsBySymbol = activeSnapshot?.statsBySymbol ?? readinessAndStats!.statsBySymbol;
    const validationWindow = activeSnapshot?.validationWindow ?? this.providerValidationWindow(scope);
    const priceBackfillBlockedStockIds = activeSnapshot?.priceBackfillBlockedStockIds ?? await this.blockedPriceBackfillStockIds(scope);
    let providerUnknownValidationNeeded = 0;
    let providerRetryValidationNeeded = 0;
    let providerUnsupportedExcluded = 0;
    let providerValidationFailed = 0;
    let providerValidationNeeded = 0;
    let retryFailedValidations = 0;
    let providerRetryBlocked = 0;
    let providerManualRepairRequired = 0;
    let nextProviderRetryAtMin: string | null = null;
    let historyCoverageIncomplete = 0;
    let historyCoverageListingDateMissing = 0;
    let historyCoverageFallbackRequired = 0;
    let supportedCatalogIdentityRepairNeeded = 0;
    let supportedBusinessMetadataRepairNeeded = 0;
    let supportedPriceBackfillNeeded = 0;
    let unsupportedExcluded = 0;
    let catalogIdentityRepairNeeded = 0;
    let priceBackfillNeeded = 0;
    let businessMetadataRepairNeeded = 0;
    let businessMetadataAutoRepairable = 0;
    let businessMetadataManualRequired = 0;
    let businessMetadataRetryBlocked = 0;
    let businessMetadataRetryEligible = 0;
    let businessMetadataRecentlyAttempted = 0;
    let metadataEnrichmentNeeded = 0;
    let manualMetadataRequired = 0;
    let manualBusinessMetadataRequired = 0;
    let missingIsin = 0;
    let missingListingDate = 0;
    let missingSector = 0;
    let missingIndustry = 0;
    let missingMarketCap = 0;
    let manualSectorIndustryRequired = 0;
    let activeInstruments = 0;
    let reviewReadyActual = 0;
    let latestStoredEodDate: string | null = null;
    const expectedLatestTradingDate = latestCompletedTradingDateForRegion(scope.region);

    for (const stock of stocks) {
      if (stock.isActive === false || stock.isDelisted === true) continue;
      activeInstruments += 1;
      const providerStatus = normalizeProviderStatus(stock.providerSupportStatus);
      const readiness = readinessBySymbol.get(stock.symbol);
      if (readiness?.isReviewReady) reviewReadyActual += 1;
      if (readiness?.latestPriceDate && (!latestStoredEodDate || readiness.latestPriceDate > latestStoredEodDate)) latestStoredEodDate = readiness.latestPriceDate;
      const isProviderSupported = providerStatus === 'SUPPORTED';
      if (providerStatus === 'UNKNOWN') providerUnknownValidationNeeded += 1;
      if (providerStatus === 'VALIDATION_FAILED') {
        providerRetryValidationNeeded += 1;
        providerValidationFailed += 1;
      }
      if (providerStatus === 'UNSUPPORTED') {
        providerUnsupportedExcluded += 1;
        unsupportedExcluded += 1;
      }
      const priceBackfillFallbackRequired = isProviderSupported && priceBackfillBlockedStockIds.has(stock.id);
      const priceBackfillBlockReason = isProviderSupported
        ? this.priceBackfillBlockReason(activeSnapshot?.repairStatesByStockId, stock.id, priceBackfillFallbackRequired)
        : null;
      let priceBackfillFallbackCounted = false;
      const recordPriceBackfillNeed = () => {
        if (priceBackfillBlockReason === 'retry') return;
        if (priceBackfillBlockReason === 'manual') {
          if (!priceBackfillFallbackCounted) {
            historyCoverageFallbackRequired += 1;
            priceBackfillFallbackCounted = true;
          }
          return;
        }
        priceBackfillNeeded += 1;
        supportedPriceBackfillNeeded += 1;
      };
      if (this.needsCatalogIdentityRepair(stock)) catalogIdentityRepairNeeded += 1;
      if (isProviderSupported && this.needsCatalogIdentityRepair(stock)) supportedCatalogIdentityRepairNeeded += 1;
      if (isProviderSupported && readiness?.priceReadiness !== 'READY') {
        recordPriceBackfillNeed();
      }
      if (isProviderSupported) {
        const historyDiagnostics = this.requiredHistoryDiagnostics(stock, validationWindow, this.priceStatsForStock(statsBySymbol, stock));
        if (!historyDiagnostics.requiredHistoryComplete) {
          historyCoverageIncomplete += 1;
          if (readiness?.priceReadiness === 'READY') {
            recordPriceBackfillNeed();
          }
        }
        if (historyDiagnostics.listingDateMissing) historyCoverageListingDateMissing += 1;
      }
      if (this.needsBusinessMetadataRepair(stock)) businessMetadataRepairNeeded += 1;
      if (isProviderSupported && this.needsBusinessMetadataRepair(stock)) supportedBusinessMetadataRepairNeeded += 1;
      if (isProviderSupported && this.needsBusinessMetadataRepair(stock)) manualBusinessMetadataRequired += 1;
      if (this.needsMetadataEnrichment(stock)) metadataEnrichmentNeeded += 1;
      if (this.isBlank(stock.isin)) missingIsin += 1;
      if (!stock.ipoDate) missingListingDate += 1;
      if (!this.hasValidMetadataValue(stock.sector)) missingSector += 1;
      if (!this.hasValidMetadataValue(stock.industry)) missingIndustry += 1;
      if (!this.hasValidMarketCap(stock.marketCap)) missingMarketCap += 1;
      if (!this.hasValidMetadataValue(stock.sector) || !this.hasValidMetadataValue(stock.industry)) manualSectorIndustryRequired += 1;
      if (this.needsMetadataEnrichment(stock)) manualMetadataRequired += 1;
    }
    providerValidationNeeded = providerUnknownValidationNeeded;
    retryFailedValidations = providerRetryValidationNeeded;

    const repositoryAny = this.repository as any;
    let businessMetadataQueueRepairable = 0;
    const snapshotRepairCounts = activeSnapshot?.repairStatesByStockId
      ? this.repairPlanCountsFromSnapshot(activeSnapshot)
      : null;
    if (snapshotRepairCounts) {
      businessMetadataQueueRepairable = snapshotRepairCounts.businessMetadataQueueRepairable;
      businessMetadataAutoRepairable = snapshotRepairCounts.businessMetadataAutoRepairable;
      businessMetadataManualRequired = snapshotRepairCounts.businessMetadataManualRequired;
      businessMetadataRetryBlocked = snapshotRepairCounts.businessMetadataRetryBlocked;
      businessMetadataRetryEligible = snapshotRepairCounts.businessMetadataRetryEligible;
      businessMetadataRecentlyAttempted = snapshotRepairCounts.businessMetadataRecentlyAttempted;
      providerRetryBlocked = snapshotRepairCounts.providerRetryBlocked;
      providerManualRepairRequired = snapshotRepairCounts.providerManualRepairRequired;
      nextProviderRetryAtMin = snapshotRepairCounts.nextProviderRetryAtMin;
      providerRetryValidationNeeded = snapshotRepairCounts.providerRetryValidationNeeded(providerValidationFailed);
      retryFailedValidations = providerRetryValidationNeeded;
    } else if (typeof repositoryAny.countStocksForBusinessMetadataRepair === 'function') {
      businessMetadataQueueRepairable = await repositoryAny.countStocksForBusinessMetadataRepair({
        ...scope,
        includeManualRequired: false,
        includeRetryable: false,
      });
      businessMetadataAutoRepairable = businessMetadataQueueRepairable;
    } else {
      businessMetadataAutoRepairable = businessMetadataRepairNeeded;
      businessMetadataQueueRepairable = businessMetadataAutoRepairable;
    }
    if (!snapshotRepairCounts && typeof repositoryAny.countBusinessMetadataRepairStates === 'function') {
      businessMetadataManualRequired = await repositoryAny.countBusinessMetadataRepairStates({
        ...scope,
        statuses: ['MANUAL_REQUIRED'],
      });
      businessMetadataRetryBlocked = await repositoryAny.countBusinessMetadataRepairStates({
        ...scope,
        statuses: ['FAILED_RETRYABLE'],
        retryTiming: 'blocked',
      });
      businessMetadataRetryEligible = await repositoryAny.countBusinessMetadataRepairStates({
        ...scope,
        statuses: ['FAILED_RETRYABLE'],
        retryTiming: 'eligible',
      });
      const retryCooldown = await repositoryAny.countBusinessMetadataRepairStates({
        ...scope,
        statuses: ['RETRY_COOLDOWN'],
      });
      businessMetadataRecentlyAttempted = businessMetadataManualRequired + businessMetadataRetryBlocked + retryCooldown;
      businessMetadataAutoRepairable = Math.max(businessMetadataQueueRepairable - businessMetadataRetryEligible, 0);
    } else {
      businessMetadataRecentlyAttempted = Math.max(businessMetadataRepairNeeded - businessMetadataAutoRepairable, 0);
      businessMetadataManualRequired = businessMetadataRecentlyAttempted;
    }
    if (!snapshotRepairCounts && typeof repositoryAny.countProviderValidationRepairStates === 'function') {
      const [retryEligible, retryBlocked, manualRequired, nextRetryAt] = await Promise.all([
        repositoryAny.countProviderValidationRepairStates({ ...scope, status: 'eligible' }),
        repositoryAny.countProviderValidationRepairStates({ ...scope, status: 'blocked' }),
        repositoryAny.countProviderValidationRepairStates({ ...scope, status: 'manual' }),
        typeof repositoryAny.nextProviderValidationRetryAt === 'function'
          ? repositoryAny.nextProviderValidationRetryAt(scope)
          : Promise.resolve(null),
      ]);
      const knownStateTotal = retryEligible + retryBlocked + manualRequired;
      const retryWithoutState = Math.max(providerValidationFailed - knownStateTotal, 0);
      providerRetryBlocked = retryBlocked;
      providerManualRepairRequired = manualRequired;
      providerRetryValidationNeeded = retryEligible + retryWithoutState;
      retryFailedValidations = providerRetryValidationNeeded;
      nextProviderRetryAtMin = nextRetryAt ? nextRetryAt.toISOString() : null;
    }

    const warnings: string[] = [];
    if (providerValidationNeeded > 0) warnings.push(`${providerValidationNeeded} UNKNOWN instruments need provider validation before review workflows can trust them.`);
    if (retryFailedValidations > 0) warnings.push(`${retryFailedValidations} failed provider validations need explicit retry or provider diagnosis.`);
    if (providerRetryBlocked > 0) warnings.push(`${providerRetryBlocked} provider validations are retry-blocked until cooldown expires.`);
    if (providerManualRepairRequired > 0) warnings.push(`${providerManualRepairRequired} provider validations require manual symbol/source repair.`);
    if (supportedCatalogIdentityRepairNeeded > 0) warnings.push(`${supportedCatalogIdentityRepairNeeded} provider-supported instruments need catalog identity repair for ISIN, listing date, exchange, or provider symbol.`);
    if (supportedPriceBackfillNeeded > 0) warnings.push(`${supportedPriceBackfillNeeded} provider-supported instruments need price backfill or latest EOD repair.`);
    if (historyCoverageFallbackRequired > 0) warnings.push(`${historyCoverageFallbackRequired} provider-supported instruments require approved free official/public exchange fallback for price history.`);
    if (historyCoverageIncomplete > 0) warnings.push(`${historyCoverageIncomplete} provider-supported instruments do not yet have the required 15-year/listing-date daily OHLCV window.`);
    if (historyCoverageListingDateMissing > 0) warnings.push(`${historyCoverageListingDateMissing} provider-supported instruments are missing listing date, so the 15-year target remains required and listing-date repair stays visible.`);
    if (businessMetadataAutoRepairable > 0) warnings.push(`${businessMetadataAutoRepairable} instruments are auto-repairable through provider business metadata repair.`);
    if (businessMetadataManualRequired > 0) warnings.push(`${businessMetadataManualRequired} instruments are marked manual-required after provider business metadata attempts.`);
    if (businessMetadataRetryBlocked > 0) warnings.push(`${businessMetadataRetryBlocked} provider business metadata repairs are retry-blocked until their next retry time.`);
    if (businessMetadataRetryEligible > 0) warnings.push(`${businessMetadataRetryEligible} provider business metadata repairs are retry-eligible.`);
    if (manualBusinessMetadataRequired > 0) warnings.push(`${manualBusinessMetadataRequired} instruments may require manual business metadata for sector, industry, or market cap if provider enrichment cannot fill them.`);

    const topActions: MarketDataRepairPlan['topActions'] = [
      { action: 'VALIDATE_PROVIDERS' as const, label: 'Validate unknown providers', count: providerValidationNeeded },
      { action: 'RETRY_FAILED_PROVIDERS' as const, label: 'Retry failed providers', count: retryFailedValidations },
      { action: 'CATALOG_IDENTITY_REPAIR' as const, label: 'Repair catalog identity', count: supportedCatalogIdentityRepairNeeded },
      { action: 'PROVIDER_BUSINESS_METADATA_REPAIR' as const, label: 'Enrich provider business metadata', count: businessMetadataAutoRepairable + businessMetadataRetryEligible },
      { action: 'BACKFILL_PRICES' as const, label: 'Backfill prices', count: supportedPriceBackfillNeeded },
      { action: 'MANUAL_METADATA_IMPORT' as const, label: 'Import manual metadata', count: manualBusinessMetadataRequired },
    ].filter((item) => item.count > 0);
    const businessMetadataBlockerDiagnostics = scope.region === 'IN' && scope.assetType === 'STOCK'
      ? this.businessMetadataBlockerDiagnostics(stocks)
      : undefined;

    const planWithoutSignoff = {
      scope,
      generatedAt: new Date().toISOString(),
      totalCatalogInstruments: stocks.length,
      providerUnknownValidationNeeded,
      providerRetryValidationNeeded,
      providerUnsupportedExcluded,
      providerValidationFailed,
      providerValidationNeeded,
      retryFailedValidations,
      providerRetryBlocked,
      providerManualRepairRequired,
      nextProviderRetryAtMin,
      historyCoverageIncomplete,
      historyCoverageListingDateMissing,
      historyCoverageFallbackRequired,
      supportedCatalogIdentityRepairNeeded,
      supportedBusinessMetadataRepairNeeded,
      supportedPriceBackfillNeeded,
      unsupportedExcluded,
      catalogIdentityRepairNeeded,
      priceBackfillNeeded,
      businessMetadataRepairNeeded,
      businessMetadataAutoRepairable,
      businessMetadataManualRequired,
      businessMetadataRetryBlocked,
      businessMetadataRetryEligible,
      businessMetadataRecentlyAttempted,
      metadataEnrichmentNeeded,
      manualMetadataRequired,
      manualBusinessMetadataRequired,
      missingIsin,
      missingListingDate,
      missingSector,
      missingIndustry,
      missingMarketCap,
      businessMetadataBlockerDiagnostics,
      manualSectorIndustryRequired,
      topActions,
      warnings,
    } as Omit<MarketDataRepairPlan, 'universeSignoff'>;
    return {
      ...planWithoutSignoff,
      universeSignoff: this.universeSignoffFromRepairPlan(planWithoutSignoff, {
        activeInstruments,
        reviewReadyActual,
        latestStoredEodDate,
        expectedLatestTradingDate,
      }),
    };
  }

  async manualMetadataTemplate(options: Pick<PaginationOptions, 'region' | 'assetType'> = {}): Promise<MarketDataManualMetadataTemplate> {
    const scope = {
      region: options.region?.trim().toUpperCase() || 'IN',
      assetType: options.assetType?.trim().toUpperCase() || 'STOCK',
    };
    const stocks = (await this.repository.listStocksForUniverseHealth(scope))
      .filter((stock) => stock.isActive !== false && stock.isDelisted !== true)
      .filter((stock) => normalizeProviderStatus(stock.providerSupportStatus) === 'SUPPORTED')
      .filter((stock) => this.needsBusinessMetadataRepair(stock));
    const rows = stocks.map((stock) => {
      const requiredFields = this.missingBusinessMetadataFields(stock);
      return {
        symbol: stock.symbol,
        providerSymbol: stock.providerSymbol || null,
        companyName: stock.name || null,
        exchange: stock.exchange || null,
        currentSector: stock.sector || null,
        currentIndustry: stock.industry || null,
        currentMarketCap: this.hasValidMarketCap(stock.marketCap) ? Number(stock.marketCap) : null,
        requiredFields,
        suggestedSource: 'Manual curated exchange/company reference',
        notes: `Fill required business metadata: ${requiredFields.join(', ')}.`,
      };
    });
    const header = [
      'symbol',
      'providerSymbol',
      'companyName',
      'exchange',
      'currentSector',
      'currentIndustry',
      'currentMarketCap',
      'sector',
      'industry',
      'marketCap',
      'requiredFields',
      'suggestedSource',
      'notes',
    ];
    const csvRows = rows.map((row) => [
      row.symbol,
      row.providerSymbol || '',
      row.companyName || '',
      row.exchange || '',
      row.currentSector || '',
      row.currentIndustry || '',
      row.currentMarketCap ?? '',
      '',
      '',
      '',
      row.requiredFields.join('|'),
      row.suggestedSource,
      row.notes,
    ].map((value) => this.csvEscape(value)).join(','));
    return {
      scope,
      generatedAt: new Date().toISOString(),
      count: rows.length,
      rows,
      csvText: [header.join(','), ...csvRows].join('\n'),
    };
  }

  async repairRun(request: MarketDataRepairRunRequest = {}): Promise<MarketDataRepairRunResponse> {
    const startedAt = new Date();
    const scope = this.repairScope(request);
    const batchSize = Math.min(Math.max(Number(request.batchSize ?? request.limit) || 50, 1), 100);
    const maxBatchesPerAction = Math.min(Math.max(Number(request.maxBatchesPerAction) || 5, 1), 100);
    const drainMode = request.mode === 'DRAIN_UNTIL_BLOCKED';
    const actions = this.normalizeRepairRunActions(request.actions, request.mode, request.csvText);
    const beforeSnapshot = await this.tryUniverseComputationSnapshot(scope);
    const beforeHealth = await this.universeHealth(scope, beforeSnapshot ?? undefined);
    const beforeRepairPlan = await this.repairPlan(scope, beforeSnapshot ?? undefined);
    const dryRun = Boolean(request.dryRun);
    const plannedActions = actions.map((action) => this.createRepairRunActionResult(
      action,
      beforeRepairPlan,
      batchSize,
      maxBatchesPerAction,
      dryRun
    ));

    if (dryRun) {
      const summary = this.repairRunTotals(plannedActions, actions);
      const warnings = this.repairRunWarnings(beforeHealth, beforeRepairPlan, plannedActions, true);
      const expectedNextAction = this.expectedNextRepairRunAction(beforeRepairPlan, actions);
      return {
        id: null,
        dryRun: true,
        scope,
        status: 'COMPLETED',
        startedAt: startedAt.toISOString(),
        completedAt: new Date().toISOString(),
        beforeHealth,
        afterHealth: beforeHealth,
        beforeRepairPlan,
        afterRepairPlan: beforeRepairPlan,
        actions: plannedActions,
        summary,
        warnings,
        anotherRunNeeded: plannedActions.some((action) => action.estimatedTotal > 0),
        hardBlockersRemaining: this.hardBlockersFromHealth(beforeHealth),
        expectedNextAction,
        afterTrustStatus: beforeHealth.trustStatus,
        universeSignoff: beforeHealth.universeSignoff,
        error: null,
      };
    }

    const repositoryAny = this.repository as any;
    const sourceFingerprints = await this.repairRunSourceFingerprints(request, scope, actions);
    const startState = await this.repairRunStartOffsets(scope, actions, sourceFingerprints);
    const sourceFingerprintMetadata = this.repairRunSourceFingerprintMetadata(sourceFingerprints);
    const runRecord = typeof repositoryAny.createRepairRun === 'function'
      ? await repositoryAny.createRepairRun({
        region: scope.region,
        assetType: scope.assetType,
        status: 'RUNNING' as MarketDataRepairRunStatus,
        beforeHealthJson: this.jsonSnapshot(beforeHealth),
        beforeRepairPlanJson: this.jsonSnapshot(beforeRepairPlan),
        actionsJson: this.jsonSnapshot({ actions, batchSize, maxBatchesPerAction, sourceFingerprints: sourceFingerprintMetadata }),
        warningsJson: [],
      })
      : null;

    const results: MarketDataRepairRunActionResult[] = [];
    const warnings: string[] = [];
    let error: string | null = null;
    let blockedStatus: MarketDataRepairRunStatus | null = null;
    let actionPlan = beforeRepairPlan;

    for (const action of actions) {
      const result = this.createRepairRunActionResult(action, actionPlan, batchSize, maxBatchesPerAction, false);
      const sourceFingerprint = sourceFingerprints[action];
      if (sourceFingerprint?.fingerprint) {
        result.sourceFingerprint = sourceFingerprint.fingerprint;
        result.sourceIdentity = sourceFingerprint.identity;
      }
      result.resumeOffset = startState.offsets[action] || 0;
      result.warnings.push(...(startState.warningsByAction[action] || []));
      result.warnings.push(...(sourceFingerprint?.warnings || []));
      results.push(result);
      if (drainMode && action === 'RETRY_FAILED_PROVIDERS' && (actionPlan.providerValidationNeeded ?? actionPlan.providerUnknownValidationNeeded ?? 0) > 0) {
        const message = 'Unknown provider validations remain; retry-failed providers are deferred until the UNKNOWN queue is drained.';
        result.hasMore = true;
        result.anotherRunNeeded = true;
        result.warnings.push(message);
        warnings.push(message);
        break;
      }
      try {
        const beforeActionCount = this.repairRunActionCount(action, actionPlan);
        await this.executeRepairRunAction(action, request, scope, batchSize, maxBatchesPerAction, result, result.resumeOffset || 0, sourceFingerprint);
        this.invalidateUniverseComputationSnapshot(scope);
        if (drainMode && beforeActionCount <= 0) {
          continue;
        }
        if (drainMode) {
          const afterActionPlan = await this.repairPlan(scope);
          const afterActionCount = this.repairRunActionCount(action, afterActionPlan);
          if (beforeActionCount > 0 && afterActionCount >= beforeActionCount && result.batchesExecuted > 0) {
            blockedStatus = 'PARTIAL_BLOCKED';
            const message = action === 'RETRY_FAILED_PROVIDERS'
              ? 'Retry failed provider validations did not reduce; manual/provider diagnosis required.'
              : `${result.label} did not reduce its queue; stopping drain before downstream actions.`;
            result.warnings.push(message);
            warnings.push(message);
            actionPlan = afterActionPlan;
            break;
          }
          actionPlan = afterActionPlan;
          if (result.hasMore || result.anotherRunNeeded) {
            warnings.push(`${result.label} still has more rows; another bounded drain run is needed before downstream actions.`);
            break;
          }
        }
      } catch (err) {
        error = err instanceof Error ? err.message : `${action} failed`;
        result.error = error;
        result.warnings.push(error);
        warnings.push(`${this.repairRunActionLabel(action)} failed: ${error}`);
        break;
      }
      warnings.push(...result.warnings);
    }

    this.invalidateUniverseComputationSnapshot(scope);
    const afterHealth = await this.universeHealth(scope);
    const afterRepairPlan = await this.repairPlan(scope);
    const completedAt = new Date();
    const summary = this.repairRunTotals(results, actions);
    const manualOnlyRemaining = drainMode && !request.csvText?.trim() && this.onlyManualMetadataRemains(afterRepairPlan);
    const expectedNextAction = this.expectedNextRepairRunAction(afterRepairPlan, actions)
      || afterRepairPlan.universeSignoff.nextAction
      || (manualOnlyRemaining && afterRepairPlan.universeSignoff.nextAction === 'MANUAL_METADATA_IMPORT'
        ? 'MANUAL_METADATA_IMPORT'
        : null);
    const hardBlockersRemaining = this.hardBlockersFromHealth(afterHealth);
    if (!blockedStatus && manualOnlyRemaining) {
      blockedStatus = 'PARTIAL_MANUAL_REQUIRED';
    }
    const anotherRunNeeded = error
      ? true
      : Boolean(blockedStatus)
        || results.some((action) => action.anotherRunNeeded || action.hasMore)
        || expectedNextAction !== null;
    const status: MarketDataRepairRunStatus = error
      ? 'PARTIAL'
      : blockedStatus
        ? blockedStatus
      : anotherRunNeeded
        ? 'PARTIAL'
        : 'COMPLETED';
    const runWarnings = [
      ...this.repairRunWarnings(afterHealth, afterRepairPlan, results, false),
      ...warnings,
    ].slice(0, 50);

    if (runRecord?.id && typeof repositoryAny.updateRepairRun === 'function') {
      await repositoryAny.updateRepairRun(runRecord.id, {
        status,
        completedAt,
        afterHealthJson: this.jsonSnapshot(afterHealth),
        afterRepairPlanJson: this.jsonSnapshot(afterRepairPlan),
        summaryJson: this.jsonSnapshot({
          actions: results,
          summary,
          anotherRunNeeded,
          expectedNextAction,
          hardBlockersRemaining,
          afterTrustStatus: afterHealth.trustStatus,
          universeSignoff: afterHealth.universeSignoff,
        }),
        warningsJson: this.jsonSnapshot(runWarnings),
        error,
      });
    }

    return {
      id: runRecord?.id ?? null,
      dryRun: false,
      scope,
      status,
      startedAt: startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      beforeHealth,
      afterHealth,
      beforeRepairPlan,
      afterRepairPlan,
      actions: results,
      summary,
      warnings: runWarnings,
      anotherRunNeeded,
      hardBlockersRemaining,
      expectedNextAction,
      afterTrustStatus: afterHealth.trustStatus,
      universeSignoff: afterHealth.universeSignoff,
      error,
    };
  }

  async latestRepairRun(options: Pick<PaginationOptions, 'region' | 'assetType'> = {}): Promise<MarketDataRepairRunRecord | null> {
    const scope = this.repairScope(options);
    const repositoryAny = this.repository as any;
    if (typeof repositoryAny.latestRepairRun !== 'function') return null;
    const row = await repositoryAny.latestRepairRun(scope);
    if (!row) return null;
    const summaryJson = row.summaryJson || {};
    return {
      id: row.id,
      scope: {
        region: row.region,
        assetType: row.assetType || scope.assetType,
      },
      status: row.status as MarketDataRepairRunStatus,
      startedAt: row.startedAt instanceof Date ? row.startedAt.toISOString() : String(row.startedAt),
      completedAt: row.completedAt ? (row.completedAt instanceof Date ? row.completedAt.toISOString() : String(row.completedAt)) : null,
      beforeHealth: row.beforeHealthJson || null,
      afterHealth: row.afterHealthJson || null,
      beforeRepairPlan: row.beforeRepairPlanJson || null,
      afterRepairPlan: row.afterRepairPlanJson || null,
      actions: Array.isArray(summaryJson.actions) ? summaryJson.actions : [],
      summary: summaryJson.summary || null,
      warnings: Array.isArray(row.warningsJson) ? row.warningsJson : [],
      anotherRunNeeded: Boolean(summaryJson.anotherRunNeeded),
      hardBlockersRemaining: Array.isArray(summaryJson.hardBlockersRemaining) ? summaryJson.hardBlockersRemaining : [],
      expectedNextAction: summaryJson.expectedNextAction || null,
      afterTrustStatus: summaryJson.afterTrustStatus || row.afterHealthJson?.trustStatus || null,
      universeSignoff: summaryJson.universeSignoff || row.afterHealthJson?.universeSignoff || null,
      error: row.error || null,
    };
  }

  async validateProviders(request: MarketDataRepairRequest = {}): Promise<MarketDataRepairSummary> {
    return this.providerDisabledRepairSummary(request, 'Provider validation is disabled for NSE/BSE-only market data.');
    // Legacy provider validation remains below as historical code only. It is unreachable from the approved runtime path.
    const started = Date.now();
    const scope = this.repairScope(request);
    const batch = this.mutatingRepairBatch(request);
    const providerValidationQueue = request.providerValidationQueue === 'RETRY_FAILED' ? 'RETRY_FAILED' : 'UNKNOWN_FIRST';
    const validationWindow = this.providerValidationWindow(scope);
    const retryQueueOptions = providerValidationQueue === 'RETRY_FAILED' ? { force: Boolean(request.force) } : {};
    const { stocks, total } = await this.repository.listStocksForProviderValidation({
      ...scope,
      ...batch,
      providerValidationQueue,
      ...retryQueueOptions,
    });
    const summary = this.emptyRepairSummary(scope, batch, total, true);
    summary.providerValidationQueue = providerValidationQueue;
    summary.providerValidated = 0;
    summary.providerSupported = 0;
    summary.providerUnsupported = 0;
    summary.validationFailed = 0;
    summary.supportedFromStoredPrices = 0;
    summary.unsupportedNoProviderSymbol = 0;
    summary.unsupportedNoCandlesWideWindow = 0;
    summary.retryableTimeout = 0;
    summary.retryableProviderError = 0;
    summary.retryableRateLimited = 0;
    summary.manualSymbolRepairRequired = 0;
    summary.retryCooldownSkipped = 0;
    summary.manualRequiredSkipped = 0;
    summary.providerCalls = 0;
    summary.providerTimeouts = 0;
    summary.providerRetryableFailures = 0;
    summary.freeFallbackRequired = 0;
    summary.fallbackSourceAttempted = null;
    summary.slowProviderCalls = 0;
    summary.maxProviderCallMs = 0;
    summary.p95ProviderCallMs = 0;
    summary.latestCompletedEodDate = validationWindow.latestCompletedEodDate;
    summary.validationWindowStartDate = validationWindow.startDateIso;
    summary.validationWindowEndDate = validationWindow.endDateIso;
    summary.requiredHistoryStartDate = validationWindow.defaultRequiredHistoryStartDateIso;
    summary.requiredHistoryCoverageStatus = stocks.length > 0 ? 'COMPLETE' : 'NEEDS_BACKFILL';
    summary.sampleResults = [];
    const providerCallDurations: number[] = [];
    let requiredHistoryIncomplete = stocks.length > 0 ? false : true;
    const priceStatsBySymbol: Map<string, any> = stocks.length > 0 && typeof (this.repository as any).priceReadinessStatsForSymbols === 'function'
      ? await (this.repository as any).priceReadinessStatsForSymbols(stocks.map((stock: any) => stock.symbol))
      : new Map<string, any>();

    for (const stock of stocks) {
      summary.processedCount += 1;
      const storedStats = this.priceStatsForStock(priceStatsBySymbol, stock);
      const historyDiagnostics = this.requiredHistoryDiagnostics(stock, validationWindow, storedStats);
      summary.requiredHistoryStartDate = summary.requiredHistoryStartDate || historyDiagnostics.requiredHistoryStartDate;
      if (historyDiagnostics.listingDate) summary.listingDate = summary.listingDate || historyDiagnostics.listingDate;
      if (historyDiagnostics.listingDateMissing) summary.listingDateMissing = true;
      if (historyDiagnostics.storedHistoryStartDate) summary.storedHistoryStartDate = summary.storedHistoryStartDate || historyDiagnostics.storedHistoryStartDate;
      if (historyDiagnostics.storedHistoryEndDate) summary.storedHistoryEndDate = summary.storedHistoryEndDate || historyDiagnostics.storedHistoryEndDate;
      summary.storedHistoryBars = Math.max(summary.storedHistoryBars || 0, historyDiagnostics.storedHistoryBars || 0);
      summary.requiredHistoryComplete = Boolean(summary.requiredHistoryComplete) || historyDiagnostics.requiredHistoryComplete;
      if (!historyDiagnostics.requiredHistoryComplete) requiredHistoryIncomplete = true;
      if (
        normalizeProviderStatus(stock.providerSupportStatus) === 'UNKNOWN'
        && storedStats?.latestPriceDate
        && Number(storedStats.priceHistoryBars || 0) > 0
      ) {
        await this.repository.markProviderSupportedFromStoredPrices([stock.symbol]);
        summary.updated += 1;
        summary.providerSupported = (summary.providerSupported || 0) + 1;
        summary.supportedFromStoredPrices = (summary.supportedFromStoredPrices || 0) + 1;
        await this.recordProviderValidationAttempt(stock, scope, {
          status: 'SUPPORTED',
          classification: 'SUPPORTED_FROM_STORED_PRICES',
          stateStatus: 'RESOLVED',
          evidence: {
            candlesFound: Number(storedStats.priceHistoryBars || 0),
            latestPriceDate: storedStats.latestPriceDate,
            sourceName: 'STORED_PRICE_TICKS',
            ...historyDiagnostics,
          },
        });
        this.addProviderValidationSample(summary, {
          stock,
          providerSymbol: stock.providerSymbol || stock.symbol,
          status: 'SUPPORTED',
          classification: 'SUPPORTED_FROM_STORED_PRICES',
          candlesFound: Number(storedStats.priceHistoryBars || 0),
          message: null,
          historyDiagnostics,
          sourceName: 'STORED_PRICE_TICKS',
        });
        continue;
      }

      const providerSymbol = stock.providerSymbol || this.normalizeCatalogSymbol({
        symbol: stock.symbol,
        sourceSymbol: stock.sourceSymbol,
        providerSymbol: stock.providerSymbol,
        displaySymbol: stock.displaySymbol,
        exchange: stock.exchange,
      }).providerSymbol;
      if (!providerSymbol) {
        const message = 'Provider symbol could not be mapped.';
        await this.repository.updateProviderSupportStatus(stock.symbol, 'UNSUPPORTED', message);
        summary.updated += 1;
        summary.providerUnsupported = (summary.providerUnsupported || 0) + 1;
        summary.unsupportedNoProviderSymbol = (summary.unsupportedNoProviderSymbol || 0) + 1;
        summary.manualSymbolRepairRequired = (summary.manualSymbolRepairRequired || 0) + 1;
        await this.recordProviderValidationAttempt(stock, scope, {
          status: 'UNSUPPORTED',
          classification: 'UNSUPPORTED_NO_PROVIDER_SYMBOL',
          stateStatus: 'MANUAL_REQUIRED',
          error: message,
          manualRequiredReason: message,
          evidence: historyDiagnostics,
        });
        this.addProviderValidationSample(summary, {
          stock,
          providerSymbol: null,
          status: 'UNSUPPORTED',
          classification: 'UNSUPPORTED_NO_PROVIDER_SYMBOL',
          message,
          historyDiagnostics,
          sourceName: null,
        });
        continue;
      }

      if (!validationWindow.latestCompletedEodDate) {
        const message = `Latest completed EOD could not be resolved for ${scope.region}; provider validation skipped.`;
        await this.repository.updateProviderSupportStatus(stock.symbol, 'VALIDATION_FAILED', message);
        const nextRetryAt = await this.nextProviderValidationRetryAt(stock);
        summary.updated += 1;
        summary.failed += 1;
        summary.validationFailed = (summary.validationFailed || 0) + 1;
        summary.retryableProviderError = (summary.retryableProviderError || 0) + 1;
        summary.providerRetryableFailures = (summary.providerRetryableFailures || 0) + 1;
        await this.recordProviderValidationAttempt(stock, scope, {
          status: 'VALIDATION_FAILED',
          classification: 'VALIDATION_SKIPPED_CALENDAR_UNCERTAIN',
          stateStatus: 'FAILED_RETRYABLE',
          error: message,
          nextRetryAt,
          evidence: historyDiagnostics,
        });
        this.addProviderValidationSample(summary, {
          stock,
          providerSymbol,
          status: 'VALIDATION_FAILED',
          classification: 'VALIDATION_SKIPPED_CALENDAR_UNCERTAIN',
          message,
          nextRetryAt,
          historyDiagnostics,
          sourceName: 'MARKET_CALENDAR',
        });
        continue;
      }

      try {
        const validation = await this.validateProviderSymbolForScope(providerSymbol, scope, validationWindow);
        const sourceName = validation.sourceName || 'YAHOO_CHART';
        const providerName = validation.provider || (sourceName === 'ANGEL_ONE_HISTORICAL' ? 'angel_one' : 'yahoo');
        const fallbackSourceAttempted = validation.fallbackSourceAttempted
          ?? (sourceName === 'ANGEL_ONE_HISTORICAL' ? null : this.shouldUseAngelProviderValidation(providerSymbol, scope) ? 'YAHOO_CHART' : null);
        summary.providerValidated = (summary.providerValidated || 0) + 1;
        summary.providerCalls = (summary.providerCalls || 0) + 1;
        const providerCallMs = Number(validation.providerCallMs);
        if (Number.isFinite(providerCallMs)) {
          providerCallDurations.push(providerCallMs);
          summary.maxProviderCallMs = Math.max(summary.maxProviderCallMs || 0, providerCallMs);
          if (providerCallMs >= 3000) summary.slowProviderCalls = (summary.slowProviderCalls || 0) + 1;
        }
        const classification = validation.classification || this.compatibleProviderValidationClassification(validation);
        const status = this.providerStatusForValidation(validation, classification);
        const nextRetryAt = this.isRetryableProviderValidation(classification) ? await this.nextProviderValidationRetryAt(stock) : null;
        await this.repository.updateProviderSupportStatus(stock.symbol, status, validation.message);
        summary.updated += 1;
        this.addProviderValidationCounts(summary, status, classification);
        await this.recordProviderValidationAttempt(stock, scope, {
          status,
          classification,
          stateStatus: this.providerValidationStateStatus(classification),
          error: status === 'VALIDATION_FAILED' ? validation.message : undefined,
          manualRequiredReason: classification === 'MANUAL_SYMBOL_REPAIR_REQUIRED' ? validation.message : undefined,
          nextRetryAt,
          evidence: {
            provider: providerName,
            providerSymbol,
            candlesFound: validation.candlesFound ?? 0,
            providerCallMs: validation.providerCallMs,
            validationWindowStartDate: validation.validationWindowStartDate || validationWindow.startDateIso,
            validationWindowEndDate: validation.validationWindowEndDate || validationWindow.endDateIso,
            fallbackSourceAttempted,
            freeFallbackRequired: validation.freeFallbackRequired || classification === 'FREE_FALLBACK_REQUIRED',
            sourceName,
            ...historyDiagnostics,
          },
        });
        this.addProviderValidationSample(summary, {
          stock,
          providerSymbol,
          status,
          classification,
          candlesFound: validation.candlesFound,
          providerCallMs: validation.providerCallMs,
          nextRetryAt,
          message: validation.message ?? null,
          historyDiagnostics,
          sourceName,
        });
        if (status === 'VALIDATION_FAILED') {
          summary.failed += 1;
        }
      } catch (error) {
        const message = error instanceof Error ? (error as Error).message : 'Provider validation failed.';
        const classification: ProviderValidationClassification = /timeout/i.test(message) ? 'RETRYABLE_TIMEOUT' : 'RETRYABLE_PROVIDER_ERROR';
        const nextRetryAt = await this.nextProviderValidationRetryAt(stock);
        await this.repository.updateProviderSupportStatus(stock.symbol, 'VALIDATION_FAILED', message);
        summary.failed += 1;
        summary.validationFailed = (summary.validationFailed || 0) + 1;
        summary.retryableProviderError = (summary.retryableProviderError || 0) + (classification === 'RETRYABLE_PROVIDER_ERROR' ? 1 : 0);
        summary.retryableTimeout = (summary.retryableTimeout || 0) + (classification === 'RETRYABLE_TIMEOUT' ? 1 : 0);
        summary.providerTimeouts = (summary.providerTimeouts || 0) + (classification === 'RETRYABLE_TIMEOUT' ? 1 : 0);
        summary.providerRetryableFailures = (summary.providerRetryableFailures || 0) + 1;
        summary.warnings.push(`${stock.symbol}: ${message}`);
        await this.recordProviderValidationAttempt(stock, scope, {
          status: 'VALIDATION_FAILED',
          classification,
          stateStatus: this.providerValidationStateStatus(classification),
          error: message,
          nextRetryAt,
          evidence: {
            provider: 'yahoo',
            providerSymbol,
            validationWindowStartDate: validationWindow.startDateIso,
            validationWindowEndDate: validationWindow.endDateIso,
            ...historyDiagnostics,
          },
        });
        this.addProviderValidationSample(summary, {
          stock,
          providerSymbol,
          status: 'VALIDATION_FAILED',
          classification,
          nextRetryAt,
          message,
          historyDiagnostics,
          sourceName: 'YAHOO_CHART',
        });
      }
    }

    summary.p95ProviderCallMs = this.percentile(providerCallDurations, 0.95);
    summary.requiredHistoryCoverageStatus = (summary.freeFallbackRequired || 0) > 0
      ? 'FALLBACK_REQUIRED'
      : requiredHistoryIncomplete
        ? 'NEEDS_BACKFILL'
        : 'COMPLETE';
    await this.assignProviderValidationRemaining(summary, scope);
    this.finishRepairSummary(summary, started);
    return summary;
  }

  private async validateProviderSymbolForScope(
    providerSymbol: string,
    scope: { region: string; assetType: string },
    validationWindow: ReturnType<MarketDataFoundationService['providerValidationWindow']>
  ): Promise<ProviderValidationResult> {
    if (!this.shouldUseAngelProviderValidation(providerSymbol, scope)) {
      return this.marketDataProvider.validateProviderSymbol(providerSymbol, {
        region: scope.region,
        assetType: scope.assetType,
        validationWindowStartDate: validationWindow.startDate,
        validationWindowEndDate: validationWindow.endDate,
        timeoutMs: 8000,
      });
    }

    const angelValidation = await this.angelOneMarketDataProvider.validateProviderSymbol(providerSymbol, {
      region: scope.region,
      assetType: scope.assetType,
      validationWindowStartDate: validationWindow.startDate,
      validationWindowEndDate: validationWindow.endDate,
    });
    const classification = angelValidation.classification || this.compatibleProviderValidationClassification(angelValidation);
    if (this.isRetryableProviderValidation(classification) && !this.angelOneMarketDataProvider.shouldFailClosed()) {
      const yahooValidation = await this.marketDataProvider.validateProviderSymbol(providerSymbol, {
        region: scope.region,
        assetType: scope.assetType,
        validationWindowStartDate: validationWindow.startDate,
        validationWindowEndDate: validationWindow.endDate,
        timeoutMs: 8000,
      });
      return {
        ...yahooValidation,
        fallbackSourceAttempted: 'YAHOO_CHART',
      };
    }
    return angelValidation;
  }

  private shouldUseAngelProviderValidation(providerSymbol: string, scope: { region: string; assetType: string }): boolean {
    return this.angelOneMarketDataProvider.canHandleHistorical(providerSymbol, {
      region: scope.region,
      assetType: scope.assetType,
    });
  }

  async repairCatalogIdentity(request: MarketDataRepairRequest = {}): Promise<MarketDataRepairSummary> {
    const scope = this.repairScope(request);
    const catalogSource = this.normalizeCatalogSource(request.catalogSource || this.defaultCatalogIdentitySource(scope));
    const catalog = await this.loadCatalogIdentityRows(catalogSource, request.csvText, request.importMode);
    return this.repairCatalogIdentityFromRows(request, {
      catalogSource,
      ...catalog,
    });
  }

  private async repairCatalogIdentityFromRows(
    request: MarketDataRepairRequest,
    catalog: CatalogIdentityRowsSnapshot,
    options: { actionableOnly?: boolean } = {}
  ): Promise<MarketDataRepairSummary> {
    const started = Date.now();
    const scope = this.repairScope(request);
    const batch = this.stableSourceRepairBatch(request);
    const sourceRows = catalog.rows;
    const scopedStocks = (await this.repository.listStocksForUniverseHealth(scope))
      .filter((stock) => stock.isActive !== false && stock.isDelisted !== true);
    const stocksByKey = this.stocksByIdentityKey(scopedStocks);
    const workItems: Array<Partial<CatalogIdentityWorkItem> & { row: CreateStockRequest }> = options.actionableOnly
      ? this.actionableCatalogIdentityWorkItems(sourceRows, stocksByKey)
      : sourceRows.map((row) => ({ row }));
    const page = workItems.slice(batch.offset, batch.offset + batch.batchSize);
    const summary = this.emptyRepairSummary(scope, batch, workItems.length, false);
    summary.catalogSource = catalog.catalogSource;
    summary.catalogRowsRead = sourceRows.length;
    summary.downloaded = catalog.downloaded;
    summary.sourceFingerprint = catalog.sourceFingerprint;
    summary.sourceIdentity = catalog.sourceIdentity;
    summary.fieldsFilled = {};
    summary.fieldProvenance = [];
    summary.warnings.push(...catalog.warnings);

    for (const item of page) {
      summary.processedCount += 1;
      const row = item.row;
      const stock = item.stock || this.findStockForCatalogIdentityRow(row, stocksByKey);
      if (!stock) {
        summary.skipped += 1;
        summary.noOp = (summary.noOp || 0) + 1;
        summary.unmatchedCatalogRows = (summary.unmatchedCatalogRows || 0) + 1;
        continue;
      }
      summary.matchedExistingRows = (summary.matchedExistingRows || 0) + 1;

      const filledFields = item.filledFields || this.repairedCatalogIdentityFields(stock, row);
      if (filledFields.length === 0) {
        summary.skipped += 1;
        summary.noOp = (summary.noOp || 0) + 1;
        if (this.needsCatalogIdentityRepair(stock)) summary.manualRequired = (summary.manualRequired || 0) + 1;
        continue;
      }

      const result = await this.repository.repairCatalogIdentityForStock(stock.id, row, { force: Boolean(request.force) });
      if (result.action === 'updated') {
        summary.updated += 1;
        summary.catalogIdentityRepaired = (summary.catalogIdentityRepaired || 0) + 1;
        for (const field of filledFields) {
          summary.fieldsFilled[field] = (summary.fieldsFilled[field] || 0) + 1;
        }
        summary.fieldProvenance.push({
          instrumentId: stock.id,
          symbol: stock.symbol,
          isinSource: row.isin ? catalog.catalogSource : stock.isin ? 'existing_db' : null,
          listingDateSource: row.ipoDate ? catalog.catalogSource : stock.ipoDate ? 'existing_db' : null,
          metadataUpdatedAt: new Date().toISOString(),
        });
      } else {
        summary.skipped += 1;
        summary.noOp = (summary.noOp || 0) + 1;
      }
    }

    if (summary.updated > 0) {
      this.invalidateUniverseComputationSnapshot(scope);
    }
    this.finishRepairSummary(summary, started);
    return summary;
  }

  async repairProviderBusinessMetadata(request: MarketDataRepairRequest = {}): Promise<MarketDataRepairSummary> {
    const started = Date.now();
    const scope = this.repairScope(request);
    const batch = this.mutatingRepairBatch(request);
    const workerConcurrency = this.providerBusinessMetadataRepairConcurrency(request);
    const repositoryAny = this.repository as any;
    const { stocks, total } = await repositoryAny.listStocksForBusinessMetadataRepair({
      ...scope,
      ...batch,
      includeManualRequired: Boolean(request.force),
      includeRetryable: Boolean(request.force),
    });
    const summary = this.emptyRepairSummary(scope, batch, total, true);
    summary.workerConcurrency = workerConcurrency;
    summary.fieldsFilled = {};
    summary.fieldProvenance = [];
    if (!request.force && typeof repositoryAny.countBusinessMetadataRepairStates === 'function') {
      const [manualRequired, retryCooldown, retryBlocked] = await Promise.all([
        repositoryAny.countBusinessMetadataRepairStates({ ...scope, statuses: ['MANUAL_REQUIRED'] }),
        repositoryAny.countBusinessMetadataRepairStates({ ...scope, statuses: ['RETRY_COOLDOWN'] }),
        repositoryAny.countBusinessMetadataRepairStates({ ...scope, statuses: ['FAILED_RETRYABLE'], retryTiming: 'blocked' }),
      ]);
      summary.skippedRecentAttempt = manualRequired + retryCooldown + retryBlocked;
    } else {
      summary.skippedRecentAttempt = 0;
    }
    summary.remainingManualRequired = summary.skippedRecentAttempt;

    await this.eachWithConcurrency(stocks as any[], workerConcurrency, async (stock: any) => {
      summary.processedCount += 1;
      const providerSymbol = stock.providerSymbol || stock.symbol;
      const fieldsFilledSummary = summary.fieldsFilled as Record<string, number>;
      const fieldProvenance = summary.fieldProvenance as NonNullable<MarketDataRepairSummary['fieldProvenance']>;
      try {
        const missingBefore = this.missingBusinessMetadataFields(stock);
        const providerData = await this.marketDataProvider.fetchCompanyMasterData(providerSymbol);
        if (!this.providerBusinessMetadataHasUsefulFields(providerData)) {
          summary.providerNotFound = (summary.providerNotFound || 0) + 1;
          summary.noOp = (summary.noOp || 0) + 1;
          summary.skipped += 1;
          summary.manualRequired = (summary.manualRequired || 0) + 1;
          summary.warnings.push(`${stock.symbol}: provider returned no usable business metadata; manual metadata is required for ${missingBefore.join(', ')}.`);
          await this.recordProviderBusinessRepairAttempt(stock, scope, 'NO_PROVIDER_DATA', {}, 'Provider returned no usable sector, industry, or market cap.', 'Provider business metadata was unavailable.');
          return;
        }

        const update = this.providerBusinessMetadataUpdate(stock, providerData);
        const filledFields = this.repairedMetadataFields(stock, update, missingBefore)
          .filter((field) => ['sector', 'industry', 'marketCap'].includes(field));
        if (filledFields.length === 0) {
          summary.noOp = (summary.noOp || 0) + 1;
          summary.skipped += 1;
          summary.manualRequired = (summary.manualRequired || 0) + 1;
          summary.warnings.push(`${stock.symbol}: provider metadata did not fill any missing business fields; manual metadata is required for ${missingBefore.join(', ')}.`);
          await this.recordProviderBusinessRepairAttempt(stock, scope, 'NO_FIELDS_FILLED', {}, 'Provider data did not improve missing business metadata.', 'Provider business metadata did not fill required fields.');
          return;
        }

        await this.repository.updateCompanyMasterData(stock.id, update);
        const stockAfterRepair = { ...stock, ...update };
        const repairState = this.providerBusinessStateAfterRepair(stockAfterRepair, filledFields);
        summary.updated += 1;
        summary.providerBusinessMetadataRepaired = (summary.providerBusinessMetadataRepaired || 0) + 1;
        summary.metadataEnriched = (summary.metadataEnriched || 0) + 1;
        if (repairState.attemptStatus === 'PARTIAL_SUCCESS') {
          summary.partialSuccess = (summary.partialSuccess || 0) + 1;
          summary.manualRequired = (summary.manualRequired || 0) + 1;
          summary.warnings.push(`${stock.symbol}: partial metadata repair filled ${filledFields.join(', ')} but still requires ${repairState.remainingFields.join(', ')}.`);
        }
        const fieldsFilled: Record<string, number> = {};
        for (const field of filledFields) {
          fieldsFilledSummary[field] = (fieldsFilledSummary[field] || 0) + 1;
          fieldsFilled[field] = 1;
        }
        fieldProvenance.push({
          instrumentId: stock.id,
          symbol: stock.symbol,
          sectorSource: filledFields.includes('sector') ? 'yahoo' : stock.sector ? 'existing_db' : null,
          industrySource: filledFields.includes('industry') ? 'yahoo' : stock.industry ? 'existing_db' : null,
          marketCapSource: filledFields.includes('marketCap') ? 'yahoo' : stock.marketCap ? 'existing_db' : null,
          metadataUpdatedAt: new Date().toISOString(),
        });
        await this.recordProviderBusinessRepairAttempt(
          stock,
          scope,
          repairState.attemptStatus,
          fieldsFilled,
          undefined,
          repairState.manualRequiredReason,
          repairState.stateStatus
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : 'provider business metadata repair failed';
        summary.failed += 1;
        summary.warnings.push(`${stock.symbol}: ${message}`);
        await this.recordProviderBusinessRepairAttempt(stock, scope, 'FAILED', {}, message);
      }
    });

    if (typeof repositoryAny.countStocksForBusinessMetadataRepair === 'function') {
      summary.remainingAutoRepairable = await repositoryAny.countStocksForBusinessMetadataRepair({
        ...scope,
        includeManualRequired: Boolean(request.force),
        includeRetryable: Boolean(request.force),
      });
    } else {
      summary.remainingAutoRepairable = Math.max(total - summary.processedCount, 0);
    }
    if (typeof repositoryAny.countBusinessMetadataRepairStates === 'function') {
      summary.remainingManualRequired = await repositoryAny.countBusinessMetadataRepairStates({
        ...scope,
        statuses: ['MANUAL_REQUIRED'],
      });
    } else {
      summary.remainingManualRequired = (summary.skippedRecentAttempt || 0) + (summary.manualRequired || 0);
    }

    if (summary.processedCount > 0) {
      this.invalidateUniverseComputationSnapshot(scope);
    }
    this.finishRepairSummary(summary, started);
    return summary;
  }

  async enrichMetadata(request: MarketDataRepairRequest = {}): Promise<MarketDataRepairSummary> {
    const started = Date.now();
    const scope = this.repairScope(request);
    const batch = this.mutatingRepairBatch(request);
    const catalogOverrides = this.metadataOverridesFromCsv(request.csvText || '', request.catalogSource || 'NSE_EQUITY_SECURITIES');
    const { stocks, total } = await this.repository.listStocksForMetadataEnrichment({
      ...scope,
      ...batch,
    });
    const summary = this.emptyRepairSummary(scope, batch, total, true);
    summary.fieldProvenance = [];
    summary.fieldsFilled = {};

    for (const stock of stocks) {
      summary.processedCount += 1;
      try {
        const missingBefore = this.missingRepairFields(stock);
        const providerSymbol = stock.providerSymbol || stock.symbol;
        const providerData = await this.marketDataProvider.fetchCompanyMasterData(providerSymbol).catch(() => null);
        const providerUseful = this.providerMetadataHasUsefulFields(providerData);
        const providerUpdate = providerUseful ? providerData : null;
        if (!providerUseful) summary.providerNotFound = (summary.providerNotFound || 0) + 1;
        const override = catalogOverrides.get(String(stock.sourceSymbol || stock.displaySymbol || stock.symbol).replace(/\.(NS|BO)$/i, '').toUpperCase())
          || catalogOverrides.get(String(stock.symbol || '').replace(/\.(NS|BO)$/i, '').toUpperCase())
          || catalogOverrides.get(String(stock.providerSymbol || '').replace(/\.(NS|BO)$/i, '').toUpperCase());
        const update: Partial<CreateStockRequest> = {
          name: providerUpdate?.companyName || stock.name,
          region: stock.region || (providerUpdate?.country === 'India' ? 'IN' : undefined),
          exchange: providerUpdate?.exchange || stock.exchange || undefined,
          country: providerUpdate?.country || stock.country || this.defaultCountryForInstrument(stock.symbol, stock.exchange, stock.region) || undefined,
          sector: providerUpdate?.sector || stock.sector || undefined,
          industry: providerUpdate?.industry || stock.industry || undefined,
          currency: providerUpdate?.currency || stock.currency || this.defaultCurrencyForInstrument(stock.symbol, stock.exchange, stock.region),
          marketCap: providerUpdate?.marketCap ?? (stock.marketCap !== null && stock.marketCap !== undefined ? Number(stock.marketCap) : undefined),
          assetType: providerUpdate?.assetType || stock.assetType || undefined,
          isDelisted: providerUpdate?.isDelisted ?? stock.isDelisted,
          ipoDate: override?.ipoDate || stock.ipoDate || undefined,
          isin: override?.isin || stock.isin || undefined,
          source: providerUseful ? 'yahoo' : stock.source,
        };
        const filledFields = this.repairedMetadataFields(stock, update, missingBefore);
        const missingAfter = this.missingRepairFields({ ...stock, ...update });

        if (missingAfter.length > 0) {
          summary.manualRequired = (summary.manualRequired || 0) + 1;
        }

        if (filledFields.length === 0) {
          summary.noOp = (summary.noOp || 0) + 1;
          summary.skipped += 1;
          summary.warnings.push(`${stock.symbol}: no missing metadata fields were repaired; manual metadata remains required for ${missingAfter.join(', ') || 'none'}.`);
          continue;
        }

        await this.repository.updateCompanyMasterData(stock.id, update);
        summary.updated += 1;
        summary.metadataEnriched = (summary.metadataEnriched || 0) + 1;
        for (const field of filledFields) {
          summary.fieldsFilled[field] = (summary.fieldsFilled[field] || 0) + 1;
        }
        if (filledFields.some((field) => ['isin', 'ipoDate', 'exchange', 'providerSymbol', 'sourceSymbol'].includes(field))) {
          summary.catalogIdentityRepaired = (summary.catalogIdentityRepaired || 0) + 1;
        }
        if (filledFields.some((field) => ['sector', 'industry', 'marketCap', 'country', 'currency'].includes(field))) {
          summary.providerBusinessMetadataRepaired = (summary.providerBusinessMetadataRepaired || 0) + 1;
        }
        summary.fieldProvenance.push({
          instrumentId: stock.id,
          symbol: stock.symbol,
          sectorSource: providerUpdate?.sector ? 'yahoo' : stock.sector ? 'existing_db' : null,
          industrySource: providerUpdate?.industry ? 'yahoo' : stock.industry ? 'existing_db' : null,
          marketCapSource: providerUpdate?.marketCap !== null && providerUpdate?.marketCap !== undefined ? 'yahoo' : stock.marketCap ? 'existing_db' : null,
          isinSource: override?.isin ? String(request.catalogSource || 'manual_csv') : stock.isin ? 'existing_db' : null,
          listingDateSource: override?.ipoDate ? String(request.catalogSource || 'manual_csv') : stock.ipoDate ? 'existing_db' : null,
          metadataUpdatedAt: new Date().toISOString(),
        });
      } catch (error) {
        summary.failed += 1;
        summary.warnings.push(`${stock.symbol}: ${error instanceof Error ? error.message : 'metadata enrichment failed'}`);
      }
    }

    this.finishRepairSummary(summary, started);
    return summary;
  }

  async importManualMetadata(request: MarketDataRepairRequest = {}): Promise<MarketDataRepairSummary> {
    const started = Date.now();
    const scope = this.repairScope(request);
    const batch = this.stableSourceRepairBatch(request);
    const csvText = request.csvText || '';
    if (!csvText.trim()) {
      throw new Error('Manual metadata import requires CSV text.');
    }
    const rows = this.parseCsv(csvText);
    const firstRow = rows[0] || {};
    const headers = new Set(Object.keys(firstRow).map((key) => key.toUpperCase()));
    const hasSymbolColumn = headers.has('SYMBOL') || headers.has('PROVIDERSYMBOL') || headers.has('PROVIDER SYMBOL');
    if (!hasSymbolColumn) {
      throw new Error('Manual metadata import requires symbol or providerSymbol column.');
    }
    if (!headers.has('SECTOR') || !headers.has('INDUSTRY')) {
      throw new Error('Manual metadata import requires sector and industry columns.');
    }
    if (!headers.has('MARKETCAP') && !headers.has('MARKET CAP')) {
      throw new Error('Manual metadata import requires marketCap column.');
    }
    const page = rows.slice(batch.offset, batch.offset + batch.batchSize);
    const scopedStocks = (await this.repository.listStocksForUniverseHealth(scope))
      .filter((stock) => stock.isActive !== false && stock.isDelisted !== true);
    const stocksByKey = this.stocksByIdentityKey(scopedStocks);
    const summary = this.emptyRepairSummary(scope, batch, rows.length, false);
    summary.catalogSource = 'MANUAL';
    const manualSource = this.repairSourceIdentity({
      action: 'MANUAL_METADATA_IMPORT',
      importMode: 'MANUAL_CSV',
      sourceKey: 'MANUAL_CSV',
      rawText: csvText,
      rows,
    });
    summary.sourceFingerprint = manualSource.fingerprint;
    summary.sourceIdentity = manualSource.identity;
    summary.fieldsFilled = {};
    summary.fieldProvenance = [];

    for (const row of page) {
      summary.processedCount += 1;
      const symbol = this.readCsv(row, ['SYMBOL', 'symbol', 'SOURCE SYMBOL', 'TRADING SYMBOL']);
      const providerSymbol = this.readCsv(row, ['PROVIDERSYMBOL', 'PROVIDER SYMBOL', 'providerSymbol']);
      if (!symbol) {
        if (!providerSymbol) {
          summary.failed += 1;
          summary.warnings.push('Manual metadata row rejected: symbol or providerSymbol is required.');
          continue;
        }
      }
      const lookupSymbol = symbol || providerSymbol;
      const sector = this.readCsv(row, ['SECTOR', 'sector']);
      const industry = this.readCsv(row, ['INDUSTRY', 'industry']);
      const marketCapText = this.readCsv(row, ['MARKET CAP', 'MARKETCAP', 'marketCap']);
      const marketCap = Number(marketCapText);
      if (!this.hasValidMetadataValue(sector) || !this.hasValidMetadataValue(industry)) {
        summary.failed += 1;
        summary.warnings.push(`${lookupSymbol}: manual sector/industry rejected because both fields are required and cannot be null-equivalent.`);
        continue;
      }
      if (!marketCapText || !this.hasValidMarketCap(marketCap)) {
        summary.failed += 1;
        summary.manualRequired = (summary.manualRequired || 0) + 1;
        summary.warnings.push(`${lookupSymbol}: manual marketCap rejected because a positive numeric marketCap is required to resolve business metadata.`);
        continue;
      }
      const stock = this.findStockForCatalogIdentityRow({
        symbol: lookupSymbol,
        sourceSymbol: symbol || this.baseSymbolFromProviderSymbol(providerSymbol),
        providerSymbol: providerSymbol || this.providerSymbolForExchange(lookupSymbol, this.readCsv(row, ['EXCHANGE', 'exchange']) || undefined),
        displaySymbol: symbol || this.baseSymbolFromProviderSymbol(providerSymbol),
        name: lookupSymbol,
        region: scope.region,
        assetType: scope.assetType,
        exchange: this.readCsv(row, ['EXCHANGE', 'exchange']) || undefined,
      } as CreateStockRequest, stocksByKey);
      if (!stock) {
        summary.skipped += 1;
        summary.manualRequired = (summary.manualRequired || 0) + 1;
        summary.warnings.push(`${lookupSymbol}: no existing scoped instrument matched manual metadata row.`);
        continue;
      }

      const listingDateText = this.readCsv(row, ['LISTING DATE', 'LISTINGDATE', 'DATE OF LISTING', 'IPO DATE', 'IPODATE']);
      const update: Partial<CreateStockRequest> = {
        sector: sector.trim(),
        industry: industry.trim(),
        isin: this.readCsv(row, ['ISIN', 'ISIN NUMBER', 'ISINNUMBER']) || stock.isin || undefined,
        ipoDate: listingDateText ? this.parseCatalogDate(listingDateText) || stock.ipoDate || undefined : stock.ipoDate || undefined,
        exchange: this.readCsv(row, ['EXCHANGE', 'exchange']) || stock.exchange || undefined,
        marketCap,
        source: stock.source || 'manual_metadata',
      };
      const missingBefore = this.missingRepairFields(stock);
      const filledFields = this.repairedMetadataFields(stock, update, missingBefore);
      if (filledFields.length === 0) {
        summary.skipped += 1;
        summary.noOp = (summary.noOp || 0) + 1;
        summary.manualRequired = (summary.manualRequired || 0) + 1;
        continue;
      }

      await this.repository.updateCompanyMasterData(stock.id, update);
      const stockAfterRepair = { ...stock, ...update };
      await this.recordManualMetadataRepairSuccess(stockAfterRepair, scope, filledFields);
      const businessRepairState = this.providerBusinessStateAfterRepair(
        stockAfterRepair,
        filledFields.filter((field) => ['sector', 'industry', 'marketCap'].includes(field))
      );
      if (businessRepairState.attemptStatus === 'PARTIAL_SUCCESS') {
        summary.partialSuccess = (summary.partialSuccess || 0) + 1;
        summary.manualRequired = (summary.manualRequired || 0) + 1;
        summary.warnings.push(`${stock.symbol}: manual metadata import remains incomplete; required fields still missing: ${businessRepairState.remainingFields.join(', ')}.`);
      }
      summary.updated += 1;
      for (const field of filledFields) {
        summary.fieldsFilled[field] = (summary.fieldsFilled[field] || 0) + 1;
      }
      summary.fieldProvenance.push({
        instrumentId: stock.id,
        symbol: stock.symbol,
        sectorSource: filledFields.includes('sector') ? 'manual_csv' : stock.sector ? 'existing_db' : null,
        industrySource: filledFields.includes('industry') ? 'manual_csv' : stock.industry ? 'existing_db' : null,
        isinSource: filledFields.includes('isin') ? 'manual_csv' : stock.isin ? 'existing_db' : null,
        listingDateSource: filledFields.includes('ipoDate') ? 'manual_csv' : stock.ipoDate ? 'existing_db' : null,
        metadataUpdatedAt: new Date().toISOString(),
      });
    }

    if (summary.updated > 0) {
      this.invalidateUniverseComputationSnapshot(scope);
    }
    this.finishRepairSummary(summary, started);
    return summary;
  }

  async backfillPrices(request: MarketDataRepairRequest = {}): Promise<MarketDataRepairSummary> {
    const started = Date.now();
    const scope = this.repairScope(request);
    const batch = this.mutatingRepairBatch(request);
    const workerConcurrency = this.priceBackfillConcurrency(request);
    const providerThrottleMs = this.priceBackfillProviderThrottleMs();
    const excludeStockIds = new Set((request.excludeStockIds || []).filter(Boolean));
    const includeRetryableBlocked = request.force === true || request.fullReload === true;
    const latestCompletedDate = latestCompletedTradingDateForRegion(scope.region);
    const candidates = this.filterPriceBackfillCandidatesForPolicy(
      await this.priceBackfillCandidates(scope, excludeStockIds, { includeRetryableBlocked }),
      request.policy,
      latestCompletedDate
    );
    const page = candidates.slice(0, batch.batchSize);
    const summary = this.emptyRepairSummary(scope, batch, candidates.length, true);
    summary.workerConcurrency = workerConcurrency;
    summary.providerThrottleMs = providerThrottleMs;
    summary.priceRowsReceived = 0;
    summary.priceRowsInserted = 0;
    summary.priceRowsUpdated = 0;
    summary.priceRowsNoOp = 0;
    summary.officialEodBulk = null;
    summary.zeroRowProviderReturns = 0;
    summary.deepReloaded = 0;
    summary.incrementalCaughtUp = 0;
    summary.historyCoverageFallbackRequired = 0;
    summary.sampleCoverageResults = [];
    summary.processedStockIds = [];
    summary.latestCompletedEodDate = latestCompletedDate;

    if (!latestCompletedDate) {
      summary.remainingCandidates = candidates.length;
      this.assignPriceBackfillDepthDiagnostics(summary, candidates);
      summary.warnings.push(`MARKET_CALENDAR_UNCERTAIN: latest completed EOD is unavailable for ${scope.region}.`);
      this.finishRepairSummary(summary, started);
      return summary;
    }

    const safeEndDate = this.endOfTradingDateUtc(latestCompletedDate);
    summary.targetEndDate = safeEndDate.toISOString();
    const providerPage = await this.applyOfficialEodBulkForIncrementalPriceBackfill({
      policy: request.policy,
      scope,
      targetTradingDate: latestCompletedDate,
      candidates,
      page,
      summary,
    });

    await this.eachWithConcurrency(providerPage, workerConcurrency, async (candidate) => {
      const { stock, mode, startDate } = this.priceBackfillFetchPlan(candidate, latestCompletedDate, request);
      summary.processedCount += 1;
      if (stock.id) summary.processedStockIds!.push(stock.id);
      if (mode === 'DEEP') summary.deepReloaded = (summary.deepReloaded || 0) + 1;
      else summary.incrementalCaughtUp = (summary.incrementalCaughtUp || 0) + 1;
      try {
        await this.throttleIngestion(providerThrottleMs);
        const result = await this.ingestSymbol(stock.symbol, startDate, safeEndDate, Boolean(request.fullReload), {
          force: request.force === true || request.fullReload === true,
          region: scope.region,
          assetType: scope.assetType,
          skipFreshnessGate: true,
          preserveProviderSupportOnZeroRows: true,
        });
        summary.priceRowsReceived = (summary.priceRowsReceived || 0) + result.rowsReceived;
        summary.priceRowsInserted = (summary.priceRowsInserted || 0) + result.rowsInserted;
        summary.priceRowsUpdated = (summary.priceRowsUpdated || 0) + result.rowsUpdated;
        summary.priceRowsNoOp = (summary.priceRowsNoOp || 0) + (result.rowsNoOp || 0);
        if (result.rowsReceived === 0 && !result.noNewData) {
          summary.zeroRowProviderReturns = (summary.zeroRowProviderReturns || 0) + 1;
          summary.historyCoverageFallbackRequired = (summary.historyCoverageFallbackRequired || 0) + 1;
          summary.skipped += 1;
          const manualRequiredReason = 'Yahoo returned zero usable price rows; approved free official/public exchange fallback is required before accepting missing history.';
          await this.recordPriceBackfillRepairAttempt(stock, scope, 'YAHOO_ZERO_ROWS', {
            rowsReceived: result.rowsReceived,
            rowsInserted: result.rowsInserted,
            rowsUpdated: result.rowsUpdated,
            rowsNoOp: result.rowsNoOp || 0,
          }, null, manualRequiredReason, 'MANUAL_REQUIRED');
          summary.warnings.push(`${stock.symbol}: provider returned zero usable price rows; approved free official/public exchange fallback is required before accepting missing history.`);
          this.addPriceBackfillCoverageSample(summary, candidate, 'YAHOO_ZERO_ROWS');
        } else if (result.rowsInserted > 0 || result.rowsUpdated > 0) {
          summary.updated += 1;
          this.addPriceBackfillCoverageSample(summary, candidate, null);
        } else if ((result.rowsNoOp || 0) > 0) {
          summary.noOp = (summary.noOp || 0) + 1;
          this.addPriceBackfillCoverageSample(summary, candidate, null);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'price backfill failed';
        if (this.isYahooRateLimitError(errorMessage)) {
          summary.failed += 1;
          summary.providerRetryableFailures = (summary.providerRetryableFailures || 0) + 1;
          await this.recordPriceBackfillRepairAttempt(stock, scope, 'YAHOO_RATE_LIMITED', {}, errorMessage, null, 'FAILED_RETRYABLE');
          summary.warnings.push(`${stock.symbol}: Yahoo rate limit hit; retry is cooling down before another provider call.`);
          this.addPriceBackfillCoverageSample(summary, candidate, 'YAHOO_RATE_LIMITED');
          return;
        }
        if (this.isAngelOneTokenNotFoundError(errorMessage)) {
          summary.manualRequired = (summary.manualRequired || 0) + 1;
          summary.historyCoverageFallbackRequired = (summary.historyCoverageFallbackRequired || 0) + 1;
          const manualRequiredReason = 'Angel One scrip master token was not found; catalog symbol lifecycle or broker-symbol mapping must be reviewed before retrying automatic backfill.';
          await this.recordPriceBackfillRepairAttempt(stock, scope, 'ANGEL_ONE_TOKEN_NOT_FOUND', {}, errorMessage, manualRequiredReason, 'MANUAL_REQUIRED');
          summary.warnings.push(`${stock.symbol}: ${manualRequiredReason}`);
          this.addPriceBackfillCoverageSample(summary, candidate, 'ANGEL_ONE_TOKEN_NOT_FOUND');
          return;
        }
        summary.failed += 1;
        summary.historyCoverageFallbackRequired = (summary.historyCoverageFallbackRequired || 0) + 1;
        await this.recordPriceBackfillRepairAttempt(stock, scope, 'YAHOO_PROVIDER_ERROR', {}, errorMessage, null, 'FAILED_RETRYABLE');
        summary.warnings.push(`${stock.symbol}: ${errorMessage}`);
        this.addPriceBackfillCoverageSample(summary, candidate, 'YAHOO_PROVIDER_ERROR');
      }
    });

    const attemptedStockIds = new Set([...excludeStockIds, ...(summary.processedStockIds || [])]);
    const remainingCandidates = this.filterPriceBackfillCandidatesForPolicy(
      await this.priceBackfillCandidates(scope, attemptedStockIds, { includeRetryableBlocked }),
      request.policy,
      latestCompletedDate
    );
    summary.remainingCandidates = remainingCandidates.length;
    summary.hasMore = remainingCandidates.length > 0;
    summary.nextOffset = summary.hasMore ? 0 : null;
    this.assignPriceBackfillDepthDiagnostics(summary, remainingCandidates);
    if (summary.processedCount > 0) {
      this.invalidateUniverseComputationSnapshot(scope);
    }
    this.finishRepairSummary(summary, started);
    return summary;
  }

  async startPriceBackfillRun(request: PriceBackfillRunRequest = {}): Promise<PriceBackfillRunStatusResponse> {
    const scope = this.repairScope(request);
    const now = new Date();
    return {
      success: false,
      runId: `provider-backfill-disabled-${now.toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`,
      status: 'FAILED',
      message: NSE_BSE_ONLY_PROVIDER_DISABLED_MESSAGE,
      region: scope.region,
      assetType: scope.assetType,
      scopeType: 'PRICE_BACKFILL',
      batchSize: 0,
      workerConcurrency: 0,
      providerThrottleMs: 0,
      maxBatches: 0,
      totalCount: 0,
      processedCount: 0,
      currentBatchNumber: 0,
      batchesPlanned: 0,
      batchesExecuted: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      noOp: 0,
      priceRowsReceived: 0,
      priceRowsInserted: 0,
      priceRowsUpdated: 0,
      priceRowsNoOp: 0,
      zeroRowProviderReturns: 0,
      warningCount: 1,
      warnings: [NSE_BSE_ONLY_PROVIDER_DISABLED_CODE],
      recentErrors: [],
      latestBatch: null,
      remainingCandidates: 0,
      hasMore: false,
      percentComplete: 100,
      startedAt: now.toISOString(),
      updatedAt: now.toISOString(),
      completedAt: now.toISOString(),
      statusUrl: '',
    };
    // Legacy provider backfill remains below as historical code only. It is unreachable from the approved runtime path.
    const activeKey = this.priceBackfillActiveKey(scope.region, scope.assetType);
    const activeRunId = MarketDataFoundationService.activePriceBackfillRuns.get(activeKey);
    if (activeRunId) {
      const activeRun = MarketDataFoundationService.priceBackfillRuns.get(activeRunId as string) as PriceBackfillRunRecord | undefined;
      if (!activeRun) {
        MarketDataFoundationService.activePriceBackfillRuns.delete(activeKey);
      } else {
        const activeRunRecord = activeRun as PriceBackfillRunRecord;
        if (!activeRunRecord.completedAt) {
          return this.toPriceBackfillRunResponse(activeRunRecord, {
            alreadyRunning: true,
            message: `A price backfill run is already running for ${scope.region}/${scope.assetType}.`,
          });
        }
        MarketDataFoundationService.activePriceBackfillRuns.delete(activeKey);
      }
    }

    const clamped = this.normalizePriceBackfillRunRequest(request);
    const policy = request.policy || (request.fullReload ? 'FORCE_DEEP' : 'INCREMENTAL_LATEST_ONLY');
    const totalCount = await this.countPriceBackfillRunCandidates(scope, { ...request, policy });
    const runId = this.createPriceBackfillRunId(now);
    const run: PriceBackfillRunRecord = {
      success: true,
      runId,
      status: 'RUNNING',
      message: 'Price backfill started in the background.',
      region: scope.region,
      assetType: scope.assetType,
      scopeType: 'PRICE_BACKFILL',
      batchSize: clamped.batchSize,
      workerConcurrency: clamped.workerConcurrency,
      providerThrottleMs: clamped.providerThrottleMs,
      maxBatches: clamped.maxBatches,
      totalCount,
      processedCount: 0,
      currentBatchNumber: 0,
      batchesPlanned: Math.min(clamped.maxBatches, Math.ceil(totalCount / clamped.batchSize)),
      batchesExecuted: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      noOp: 0,
      priceRowsReceived: 0,
      priceRowsInserted: 0,
      priceRowsUpdated: 0,
      priceRowsNoOp: 0,
      zeroRowProviderReturns: 0,
      warningCount: 0,
      warnings: [],
      recentErrors: [],
      latestBatch: null,
      remainingCandidates: totalCount,
      hasMore: totalCount > 0,
      percentComplete: totalCount > 0 ? 0 : 100,
      startedAt: now.toISOString(),
      updatedAt: now.toISOString(),
      completedAt: null,
      statusUrl: `/api/v1/market-data/prices/backfill-runs/${runId}`,
      activeKey,
      cancelRequested: false,
      force: request.force === true || request.fullReload === true,
      fullReload: request.fullReload === true,
      policy,
      triggerType: request.triggerType ?? 'backfill',
      processedStockIds: new Set<string>(),
    };

    for (const warning of clamped.warnings) this.addPriceBackfillRunWarning(run, warning);
    MarketDataFoundationService.priceBackfillRuns.set(runId, run);
    MarketDataFoundationService.activePriceBackfillRuns.set(activeKey, runId);
    this.prunePriceBackfillRuns();
    this.enqueuePriceBackfillPipelineSnapshot(run);

    setTimeout(() => {
      void this.processPriceBackfillRun(runId);
    }, 0);

    return this.toPriceBackfillRunResponse(run);
  }

  getPriceBackfillRun(runId: string): PriceBackfillRunStatusResponse | null {
    const run = MarketDataFoundationService.priceBackfillRuns.get(runId);
    return run ? this.toPriceBackfillRunResponse(run) : null;
  }

  activePriceBackfillRun(request: Pick<MarketDataRepairRequest, 'region' | 'assetType'> = {}): PriceBackfillRunStatusResponse | null {
    const scope = this.repairScope(request);
    const activeKey = this.priceBackfillActiveKey(scope.region, scope.assetType);
    const activeRunId = MarketDataFoundationService.activePriceBackfillRuns.get(activeKey);
    if (!activeRunId) return null;
    const run = MarketDataFoundationService.priceBackfillRuns.get(activeRunId);
    if (!run || run.completedAt) {
      MarketDataFoundationService.activePriceBackfillRuns.delete(activeKey);
      return null;
    }
    return this.toPriceBackfillRunResponse(run);
  }

  cancelPriceBackfillRun(runId: string): PriceBackfillRunStatusResponse | null {
    const run = MarketDataFoundationService.priceBackfillRuns.get(runId);
    if (!run) return null;
    if (this.isCatalogSyncTerminal(run.status)) {
      return this.toPriceBackfillRunResponse(run);
    }
    run.cancelRequested = true;
    run.status = 'PARTIAL';
    run.message = 'Cancellation requested. The current price-backfill batch will finish before the run stops.';
    this.touchPriceBackfillRun(run);
    return this.toPriceBackfillRunResponse(run);
  }

  get(id: string) {
    return this.repository.findStockById(id);
  }

  baseSymbolFromProviderSymbol(symbol: string): string {
    return symbol.trim().toUpperCase().replace(/\.(NS|BO|BS|NL)$/i, '');
  }

  providerSymbolForExchange(sourceSymbol: string, exchange?: string | null): string {
    const symbol = sourceSymbol.trim().toUpperCase();
    if (!symbol || symbol.startsWith('^')) return symbol;
    if (/\.(NS|BO)$/i.test(symbol)) return symbol;
    const normalizedExchange = exchange?.trim().toUpperCase();
    if (normalizedExchange === 'BSE') return `${symbol}.BO`;
    if (normalizedExchange === 'NSE' || normalizedExchange === 'NSE_EQ' || normalizedExchange === 'NSE_EQUITY') return `${symbol}.NS`;
    return symbol;
  }

  private internalStorageSymbol(symbol: string, options: { region?: string; assetType?: string; exchange?: string | null } = {}): string {
    const normalized = symbol.trim().toUpperCase();
    const region = options.region?.trim().toUpperCase();
    const assetType = options.assetType?.trim().toUpperCase() || 'STOCK';
    const exchange = options.exchange?.trim().toUpperCase();
    if (region === 'IN' && assetType === 'STOCK' && (exchange === 'NSE' || normalized.endsWith('.NS'))) {
      return this.baseSymbolFromProviderSymbol(normalized);
    }
    return normalized;
  }

  private yahooHistoricalProviderSymbol(symbol: string, options: { region?: string; assetType?: string; exchange?: string | null } = {}): string {
    const normalized = symbol.trim().toUpperCase();
    if (!normalized || normalized.startsWith('^') || /\.(NS|BO)$/i.test(normalized)) return normalized;
    const region = options.region?.trim().toUpperCase();
    const assetType = options.assetType?.trim().toUpperCase() || 'STOCK';
    if (region !== 'IN' || assetType !== 'STOCK') return normalized;
    return this.providerSymbolForExchange(normalized, options.exchange || 'NSE');
  }

  normalizeCatalogSymbol(row: { symbol?: string | null; sourceSymbol?: string | null; providerSymbol?: string | null; displaySymbol?: string | null; exchange?: string | null }, source?: string) {
    const rawSymbol = (row.sourceSymbol || row.providerSymbol || row.symbol || '').trim().toUpperCase();
    const exchange = row.exchange?.trim().toUpperCase() || (source?.startsWith('BSE') ? 'BSE' : source?.startsWith('NSE') ? 'NSE' : undefined);
    const baseSymbol = this.baseSymbolFromProviderSymbol(rawSymbol);
    const existingProviderSymbol = row.providerSymbol?.trim().toUpperCase();
    const shouldRebuildProviderSymbol = Boolean(exchange && ['NSE', 'BSE', 'NSE_EQ', 'NSE_EQUITY'].includes(exchange))
      && (!existingProviderSymbol || !new RegExp(exchange === 'BSE' ? '\\.BO$' : '\\.NS$', 'i').test(existingProviderSymbol));
    const providerSymbol = shouldRebuildProviderSymbol
      ? this.providerSymbolForExchange(baseSymbol, exchange)
      : existingProviderSymbol || this.providerSymbolForExchange(baseSymbol, exchange);
    return {
      sourceSymbol: baseSymbol,
      providerSymbol,
      displaySymbol: row.displaySymbol?.trim().toUpperCase() || baseSymbol,
    };
  }

  async create(data: CreateStockRequest, triggerIngestion = true) {
    const existing = await this.repository.findStockBySymbol(data.symbol);
    if (existing) {
      throw new Error(`Stock with symbol ${data.symbol} already exists`);
    }

    const stock = await this.repository.createStock(data);

    if (triggerIngestion) {
      enqueueIngestionJob(stock.symbol).catch((err) =>
        console.error(`Failed to enqueue ingestion job for ${stock.symbol}:`, err)
      );
    }

    return stock;
  }

  async listInstruments(options: Partial<PaginationOptions> = {}) {
    const requestOptions: PaginationOptions = {
      page: options.page ?? 1,
      pageSize: options.pageSize ?? 50,
      sortBy: options.sortBy,
      sortOrder: options.sortOrder,
      region: options.region,
      country: options.country,
      exchange: options.exchange,
      assetType: options.assetType,
      instrumentSegment: options.instrumentSegment,
      currency: options.currency,
      sector: options.sector,
      industry: options.industry,
      dataStatus: options.dataStatus,
      catalogSource: options.catalogSource,
      providerSupportStatus: options.providerSupportStatus,
      derivativesEligible: options.derivativesEligible,
      search: options.search,
    };
    const result = await this.list(requestOptions);
    const { readinessBySymbol, statsBySymbol } = await this.universeReadinessAndStatsForStocks(result.stocks, requestOptions);
    const baselineByStockId = await this.trustedBaselineByStockId(result.stocks, readinessBySymbol, statsBySymbol, requestOptions);

    return {
      instruments: result.stocks.map((stock) => this.toV1Instrument({
        ...stock,
        universeReadiness: readinessBySymbol.get(stock.symbol),
        trustedBaseline: baselineByStockId.get(stock.id),
      })),
      pagination: result.pagination,
    };
  }

  async getInstrument(id: string, options: Pick<PaginationOptions, 'region' | 'assetType'> = {}) {
    const stock = await this.repository.findStockByIdInScope(id, options);
    if (!stock) return null;
    const { readinessBySymbol, statsBySymbol } = await this.universeReadinessAndStatsForStocks([stock], options);
    const baselineByStockId = await this.trustedBaselineByStockId([stock], readinessBySymbol, statsBySymbol, options);
    return this.toV1Instrument({
      ...stock,
      universeReadiness: readinessBySymbol.get(stock.symbol),
      trustedBaseline: baselineByStockId.get(stock.id),
    });
  }

  async importCatalog(request: CatalogImportRequest): Promise<CatalogImportSummary> {
    const started = Date.now();
    const catalogSource = this.normalizeCatalogSource(request.catalogSource);
    const sourceConfig = getCatalogSourceConfig(catalogSource);
    const importMode = request.importMode || (sourceConfig?.supportsInternalSeed ? 'INTERNAL_SEED' : request.csvText ? 'MANUAL_CSV' : 'MANUAL_CSV');
    const batchSize = Math.min(Math.max(Number(request.batchSize) || 100, 1), 250);
    const offset = Math.max(Number(request.offset) || 0, 0);
    const warnings: string[] = [];
    let csvText = request.csvText || '';
    let downloadInfo: Awaited<ReturnType<MarketDataFoundationService['downloadConfiguredCatalogCsv']>> | null = null;
    try {
      if (importMode === 'CONFIGURED_URL') {
        downloadInfo = await this.downloadConfiguredCatalogCsv(catalogSource);
        csvText = downloadInfo.csvText;
      } else if (importMode === 'INTERNAL_SEED') {
        if (!sourceConfig?.supportsInternalSeed) {
          throw new Error(`Catalog source ${catalogSource} does not support internal seed import.`);
        }
        csvText = '';
      }
      this.validateCsvColumns(catalogSource, csvText);
      let rows = this.catalogRowsForSource(catalogSource, csvText, warnings);
      const sourceRows = rows.length;
      rows = rows.slice(offset, offset + batchSize);

      const summary: CatalogImportSummary = {
        catalogSource,
        importMode,
        downloaded: importMode === 'CONFIGURED_URL',
        downloadUrlName: downloadInfo?.sourceName,
        fileSizeBytes: downloadInfo?.fileSizeBytes,
        tempFileDeleted: downloadInfo?.tempFileDeleted,
        tempFileDeleteError: downloadInfo?.tempFileDeleteError,
        sourceRows,
        processedCount: rows.length,
        totalCount: sourceRows,
        batchSize,
        offset,
        nextOffset: offset + batchSize < sourceRows ? offset + batchSize : null,
        hasMore: offset + batchSize < sourceRows,
        inserted: 0,
        updated: 0,
        noOp: 0,
        skipped: 0,
        invalid: 0,
        providerValidated: 0,
        providerUnsupported: 0,
        underlyingsRead: catalogSource === 'NSE_EQUITY_DERIVATIVES_UNDERLYINGS' ? sourceRows : undefined,
        stockUnderlyingsMatched: catalogSource === 'NSE_EQUITY_DERIVATIVES_UNDERLYINGS' ? 0 : undefined,
        indexUnderlyingsMatched: catalogSource === 'NSE_EQUITY_DERIVATIVES_UNDERLYINGS' ? 0 : undefined,
        newInstrumentsCreated: catalogSource === 'NSE_EQUITY_DERIVATIVES_UNDERLYINGS' ? 0 : undefined,
        unmatchedUnderlyings: catalogSource === 'NSE_EQUITY_DERIVATIVES_UNDERLYINGS' ? 0 : undefined,
        warnings,
        durationMs: 0,
      };

      for (const row of rows) {
        if (!row.symbol || !row.name) {
          summary.invalid += 1;
          continue;
        }

        const result = await this.repository.upsertCatalogInstrument(row);
        if (result.action === 'inserted') summary.inserted += 1;
        if (result.action === 'updated') summary.updated += 1;
        if (result.action === 'noOp') summary.noOp += 1;

        if (catalogSource === 'NSE_EQUITY_DERIVATIVES_UNDERLYINGS') {
          if (row.assetType === 'INDEX') summary.indexUnderlyingsMatched! += result.action === 'inserted' ? 0 : 1;
          if (row.assetType === 'STOCK') summary.stockUnderlyingsMatched! += result.action === 'inserted' ? 0 : 1;
          if (result.action === 'inserted') summary.newInstrumentsCreated! += 1;
        }

        if (request.validateProvider && row.providerSymbol) {
          const validation = await this.marketDataProvider.validateProviderSymbol(row.providerSymbol, {
            region: row.region,
            assetType: row.assetType || undefined,
          });
          summary.providerValidated += 1;
          if (!validation.supported) summary.providerUnsupported += 1;
          await this.repository.updateProviderSupportStatus(
            row.symbol,
            this.providerStatusForValidation(validation, validation.classification || this.compatibleProviderValidationClassification(validation)),
            validation.message
          );
        }
      }

      if (downloadInfo) {
        await this.cleanupCatalogTempFile(downloadInfo);
        summary.tempFileDeleted = downloadInfo.tempFileDeleted;
        summary.tempFileDeleteError = downloadInfo.tempFileDeleteError;
      }
      summary.insertedCount = summary.inserted;
      summary.updatedCount = summary.updated;
      summary.noOpCount = summary.noOp;
      summary.invalidCount = summary.invalid;
      summary.providerValidatedCount = summary.providerValidated;
      summary.providerUnsupportedCount = summary.providerUnsupported;
      summary.durationMs = Date.now() - started;
      console.log('[MarketDataFoundation] catalog import summary', {
        catalogSource,
        importMode,
        fileSizeBytes: summary.fileSizeBytes,
        sourceRows: summary.sourceRows,
        processedCount: summary.processedCount,
        inserted: summary.inserted,
        updated: summary.updated,
        noOp: summary.noOp,
        invalid: summary.invalid,
        providerValidated: summary.providerValidated,
        providerUnsupported: summary.providerUnsupported,
        tempFileDeleted: summary.tempFileDeleted,
      });
      return summary;
    } catch (error) {
      if (downloadInfo && downloadInfo.tempFileDeleted === false) {
        await this.cleanupCatalogTempFile(downloadInfo).catch(() => undefined);
      }
      throw error;
    }
  }

  listCatalogSources() {
    return {
      sources: getCatalogSourceConfigs().map((source) => ({
        catalogSource: source.catalogSource,
        displayName: source.displayName,
        enabled: source.enabled,
        region: source.region,
        assetType: source.assetType,
        segmentClass: source.segmentClass,
        fileType: source.fileType,
        parserType: source.parserType,
        importModes: [
          ...(source.supportsConfiguredUrl ? ['CONFIGURED_URL'] : []),
          ...(source.supportsInternalSeed ? ['INTERNAL_SEED'] : []),
          ...(source.supportsManualCsv ? ['MANUAL_CSV'] : []),
        ],
        urlConfigured: Boolean(source.url),
        urlSource: source.urlSource,
        setupHint: source.setupHint,
        supportsManualCsv: source.supportsManualCsv,
        supportsConfiguredUrl: source.supportsConfiguredUrl,
        supportsInternalSeed: source.supportsInternalSeed,
        lastImportedAt: null,
      })),
    };
  }

  async backfillCatalogMetadata(request: CatalogBackfillRequest = {}): Promise<CatalogBackfillSummary> {
    const started = Date.now();
    const batchSize = Math.min(Math.max(Number(request.batchSize ?? request.limit) || 100, 1), 250);
    const offset = Math.max(Number(request.offset) || 0, 0);
    const catalogSource = request.catalogSource ? this.normalizeCatalogSource(String(request.catalogSource)) : undefined;
    const workerConcurrency = this.catalogBackfillConcurrency(request);
    const { stocks, total } = await this.repository.listStocksForCatalogBackfill({
      region: request.region || 'IN',
      assetType: request.assetType,
      catalogSource,
      offset,
      batchSize,
    });
    const summary: CatalogBackfillSummary = {
      catalogSource,
      processedCount: 0,
      totalCount: total,
      batchSize,
      workerConcurrency,
      offset,
      nextOffset: null,
      hasMore: false,
      updated: 0,
      noOp: 0,
      skipped: 0,
      validated: 0,
      providerUnsupported: 0,
      warnings: [],
      durationMs: 0,
    };

    const itemResults: Array<Pick<CatalogBackfillSummary, 'processedCount' | 'updated' | 'noOp' | 'skipped' | 'validated' | 'providerUnsupported'> & { warnings: string[] }> = [];
    await this.eachWithConcurrency(stocks, workerConcurrency, async (stock: any) => {
      const item = {
        processedCount: 0,
        updated: 0,
        noOp: 0,
        skipped: 0,
        validated: 0,
        providerUnsupported: 0,
        warnings: [] as string[],
      };
      const normalized = this.catalogBackfillRow(stock);
      if (!normalized) {
        item.skipped += 1;
        itemResults.push(item);
        return;
      }
      const result = await this.repository.upsertCatalogInstrument(normalized);
      item.processedCount += 1;
      if (result.action === 'updated') item.updated += 1;
      if (result.action === 'noOp') item.noOp += 1;

      if (request.validateProvider && normalized.providerSymbol) {
        const validation = await this.marketDataProvider.validateProviderSymbol(normalized.providerSymbol, {
          region: normalized.region,
          assetType: normalized.assetType || undefined,
        });
        item.validated += 1;
        if (!validation.supported) item.providerUnsupported += 1;
        await this.repository.updateProviderSupportStatus(
          normalized.symbol,
          this.providerStatusForValidation(validation, validation.classification || this.compatibleProviderValidationClassification(validation)),
          validation.message
        );
      }
      itemResults.push(item);
    });

    for (const item of itemResults) {
      summary.processedCount += item.processedCount;
      summary.updated += item.updated;
      summary.noOp += item.noOp;
      summary.skipped += item.skipped;
      summary.validated += item.validated;
      summary.providerUnsupported += item.providerUnsupported;
      summary.warnings.push(...item.warnings);
    }

    const nextOffset = offset + batchSize;
    summary.hasMore = nextOffset < total;
    summary.nextOffset = summary.hasMore ? nextOffset : null;
    summary.durationMs = Date.now() - started;
    return summary;
  }

  async getInstrumentsByIds(ids: string[]) {
    const stocks = await this.repository.prisma.stock.findMany({
      where: { id: { in: ids } },
    });
    return stocks.map((stock) => this.toV1Instrument(stock));
  }

  async getLatestPricesBySymbols(symbols: string[]) {
    const prices = await this.repository.prisma.priceTick.findMany({
      where: { symbol: { in: symbols } },
      orderBy: { timestamp: 'desc' },
      distinct: ['symbol'],
    });
    return prices.map((price) => ({
      symbol: price.symbol,
      date: price.timestamp,
      close: Number(price.close),
      adjusted_close: price.adjustedClose !== null ? Number(price.adjustedClose) : Number(price.close),
      timestamp: price.timestamp,
    }));
  }

  async listRecentPriceWindowsByInstrumentIds(
    instrumentIds: string[],
    limit = 500,
    _options: Pick<PaginationOptions, 'region' | 'assetType'> = {}
  ) {
    const uniqueIds = [...new Set(instrumentIds.filter(Boolean))];
    if (uniqueIds.length === 0) return new Map<string, any[]>();

    const stocks = await this.repository.prisma.stock.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true, symbol: true },
    });
    if (stocks.length === 0) return new Map<string, any[]>();

    const safeLimit = Math.max(1, Math.min(Math.floor(Number(limit) || 500), 5000));
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - Math.max(365, safeLimit * 3));
    const instrumentIdBySymbol = new Map(stocks.map((stock) => [stock.symbol, stock.id]));
    const prices = await this.repository.prisma.priceTick.findMany({
      where: {
        symbol: { in: stocks.map((stock) => stock.symbol) },
        timestamp: { gte: cutoff },
      },
      orderBy: [{ symbol: 'asc' }, { timestamp: 'desc' }],
      select: {
        symbol: true,
        timestamp: true,
        open: true,
        high: true,
        low: true,
        close: true,
        adjustedClose: true,
        volume: true,
        source: true,
        ingestionTimestamp: true,
        lastUpdatedTimestamp: true,
        dataStatus: true,
      },
    });

    const byInstrumentId = new Map(uniqueIds.map((id) => [id, [] as any[]]));
    for (const price of prices) {
      const instrumentId = instrumentIdBySymbol.get(price.symbol);
      if (!instrumentId) continue;
      const bucket = byInstrumentId.get(instrumentId);
      if (!bucket || bucket.length >= safeLimit) continue;
      bucket.push({
        date: price.timestamp,
        open: Number(price.open),
        high: Number(price.high),
        low: Number(price.low),
        close: Number(price.close),
        adjusted_close: price.adjustedClose !== null ? Number(price.adjustedClose) : Number(price.close),
        volume: price.volume !== null ? Number(price.volume) : null,
        source: price.source || 'database',
        ingestion_timestamp: price.ingestionTimestamp instanceof Date ? price.ingestionTimestamp.toISOString() : new Date().toISOString(),
        last_updated_timestamp: price.lastUpdatedTimestamp instanceof Date ? price.lastUpdatedTimestamp.toISOString() : new Date().toISOString(),
        data_status: price.dataStatus || 'COMPLETE',
      });
    }
    return byInstrumentId;
  }

  async storedFundamentalsByInstrumentIds(instrumentIds: string[], _options: Pick<PaginationOptions, 'region' | 'assetType'> = {}) {
    const uniqueIds = [...new Set(instrumentIds.filter(Boolean))];
    if (uniqueIds.length === 0) return new Map<string, any>();
    const stocks = await this.repository.prisma.stock.findMany({
      where: { id: { in: uniqueIds } },
    });
    const records = await this.repository.prisma.fundamental.findMany({
      where: { stockId: { in: stocks.map((stock) => stock.id) } },
      orderBy: [{ stockId: 'asc' }, { periodEndDate: 'desc' }],
    });
    const recordsByStockId = new Map<string, any[]>();
    for (const record of records) {
      const bucket = recordsByStockId.get(record.stockId) || [];
      bucket.push(record);
      recordsByStockId.set(record.stockId, bucket);
    }
    return new Map(stocks.map((stock) => [stock.id, this.formatFundamentalsResponse(stock, recordsByStockId.get(stock.id) || [])]));
  }

  async createInstrument(data: V1CreateInstrumentRequest) {
    const errors = validateInstrumentInput(data);
    if (errors.length > 0) {
      throw new Error(errors.join('; '));
    }

    const existing = await this.repository.findStockBySymbolAndExchange(data.symbol, data.exchange);
    if (existing) {
      throw new Error(`Instrument with symbol ${data.symbol} and exchange ${data.exchange} already exists`);
    }

    const stock = await this.create({
      symbol: data.symbol.trim().toUpperCase(),
        name: data.company_name.trim(),
        region: this.inferRegionFromInstrument(data),
        exchange: data.exchange.trim().toUpperCase(),
        country: data.country,
        sector: data.sector,
        industry: data.industry,
        currency: data.currency.trim().toUpperCase(),
        marketCap: data.market_cap,
        assetType: this.normalizeAssetType(data.asset_type),
        ipoDate: data.ipo_date ? new Date(data.ipo_date) : null,
        isin: data.isin,
      }, false);

    return this.toV1Instrument(stock, data);
  }

  update(id: string, data: UpdateStockRequest) {
    return this.repository.updateStock(id, data);
  }

  delete(id: string) {
    return this.repository.deleteStock(id);
  }

  toggleActive(id: string) {
    return this.repository.toggleStockActive(id);
  }

  async syncData(id: string) {
    const stock = await this.repository.findStockById(id);
    if (!stock) {
      throw new Error('Stock not found');
    }

    try {
      const syncSummary = await this.ingestSymbol(stock.symbol, undefined, new Date());
      if (!syncSummary.noNewData) {
        await this.repository.updateStockLoadTimestampById(id);
      }

      return {
        success: true,
        noNewData: syncSummary.noNewData,
        message: syncSummary.noNewData ? 'No new data to ingest. Latest daily candles already checked recently.' : `Data ingestion completed for ${stock.symbol}`,
        syncSummary,
      };
    } catch (error: any) {
      console.error(`Data ingestion failed for ${stock.symbol}:`, error);
      return { success: false, message: error.message };
    }
  }

  async searchAssets(query: string, options: Pick<PaginationOptions, 'region' | 'assetType' | 'instrumentSegment'> = {}): Promise<any[]> {
    const localResults = await this.repository.searchStocks(query, 10, options);

    if (localResults.length > 0) {
      return localResults.map(stock => ({
        symbol: stock.symbol,
        name: stock.name,
        region: stock.region,
        exchange: stock.exchange,
        source: 'database',
      }));
    }

    return [];
  }

  async yahooSearch(query: string): Promise<any[]> {
    void query;
    throw this.providerDisabledError('Yahoo Finance search');
  }

  async searchProvider(query: string): Promise<SearchResult[]> {
    void query;
    throw this.providerDisabledError('external provider search');
  }

  async fetchCoreFundamentals(symbol: string): Promise<CoreFundamentals> {
    void symbol;
    throw this.providerDisabledError('provider fundamentals fetch');
  }

  async fetchCorporateActions(symbol: string): Promise<CorporateAction[]> {
    void symbol;
    throw this.providerDisabledError('provider corporate actions fetch');
  }

  listPrices(symbol: string, limit: number, startDate?: Date, endDate?: Date) {
    return this.repository.listPrices(symbol, limit, startDate, endDate);
  }

  async listForwardPriceWindowsByInstrumentIds(instrumentIds: string[], startDate: Date, options: Pick<PaginationOptions, 'region' | 'assetType'> = {}) {
    return this.repository.listForwardPriceWindowsByInstrumentIds(instrumentIds, startDate, options);
  }

  async listPricesByInstrumentId(instrumentId: string, limit = 250, startDate?: Date, endDate?: Date, options: Pick<PaginationOptions, 'region' | 'assetType'> = {}) {
    const stock = await this.repository.findStockByIdInScope(instrumentId, options);
    if (!stock) {
      return null;
    }

    const prices = await this.repository.listPrices(stock.symbol, limit, startDate, endDate);
    return {
      instrument_id: stock.id,
      symbol: stock.symbol,
      adjustment_strategy: 'adjusted_close is not persisted; close is returned as adjusted_close for MVP display.',
      source: prices[0]?.source || 'database',
      ingestion_timestamp: prices[0]?.ingestionTimestamp instanceof Date ? prices[0].ingestionTimestamp.toISOString() : null,
      last_updated_timestamp: prices[0]?.lastUpdatedTimestamp instanceof Date ? prices[0].lastUpdatedTimestamp.toISOString() : null,
      data_status: prices.length > 0 ? 'COMPLETE' : 'MISSING',
      prices: prices.map((price) => ({
        date: price.timestamp,
        open: Number(price.open),
        high: Number(price.high),
        low: Number(price.low),
        close: Number(price.close),
        adjusted_close: price.adjustedClose !== null ? Number(price.adjustedClose) : Number(price.close),
        volume: price.volume !== null ? Number(price.volume) : null,
        source: 'source' in price && price.source ? price.source : 'database',
        ingestion_timestamp: price.ingestionTimestamp instanceof Date ? price.ingestionTimestamp.toISOString() : new Date().toISOString(),
        last_updated_timestamp: price.lastUpdatedTimestamp instanceof Date ? price.lastUpdatedTimestamp.toISOString() : new Date().toISOString(),
        data_status: price.dataStatus || 'COMPLETE',
      })),
    };
  }

  async latestPriceByInstrumentId(instrumentId: string, options: Pick<PaginationOptions, 'region' | 'assetType'> = {}) {
    const stock = await this.repository.findStockByIdInScope(instrumentId, options);
    if (!stock) {
      return null;
    }

    const price = await this.repository.latestPrice(stock.symbol);
    if (!price) {
      return {
        instrument_id: stock.id,
        symbol: stock.symbol,
        latest: null,
        data_status: 'PARTIAL',
      };
    }

    return {
      instrument_id: stock.id,
      symbol: stock.symbol,
      latest: {
        date: price.timestamp,
        open: price.open !== null ? Number(price.open) : null,
        high: price.high !== null ? Number(price.high) : null,
        low: price.low !== null ? Number(price.low) : null,
        close: Number(price.close),
        adjusted_close: price.adjustedClose !== null ? Number(price.adjustedClose) : Number(price.close),
        volume: price.volume !== null ? Number(price.volume) : null,
        source: price.source || 'database',
        ingestion_timestamp: price.ingestionTimestamp instanceof Date ? price.ingestionTimestamp.toISOString() : new Date().toISOString(),
        last_updated_timestamp: price.lastUpdatedTimestamp instanceof Date ? price.lastUpdatedTimestamp.toISOString() : new Date().toISOString(),
        data_status: price.dataStatus || 'COMPLETE',
      },
      source: price.source || 'database',
      ingestion_timestamp: price.ingestionTimestamp instanceof Date ? price.ingestionTimestamp.toISOString() : new Date().toISOString(),
      last_updated_timestamp: price.lastUpdatedTimestamp instanceof Date ? price.lastUpdatedTimestamp.toISOString() : new Date().toISOString(),
      data_status: price.dataStatus || 'COMPLETE',
    };
  }

  async fundamentalsByInstrumentId(instrumentId: string, options: Pick<PaginationOptions, 'region' | 'assetType'> = {}) {
    const stock = await this.repository.findStockByIdInScope(instrumentId, options);
    if (!stock) {
      return null;
    }

    const records = await this.repository.listFundamentals(stock.id);

    return this.formatFundamentalsResponse(stock, records);
  }

  async storedFundamentalsByInstrumentId(instrumentId: string, options: Pick<PaginationOptions, 'region' | 'assetType'> = {}) {
    const stock = await this.repository.findStockByIdInScope(instrumentId, options);
    if (!stock) {
      return null;
    }

    const records = await this.repository.listFundamentals(stock.id);
    return this.formatFundamentalsResponse(stock, records);
  }

  async corporateActionsByInstrumentId(instrumentId: string, options: Pick<PaginationOptions, 'region' | 'assetType'> = {}) {
    const stock = await this.repository.findStockByIdInScope(instrumentId, options);
    if (!stock) {
      return null;
    }

    await this.repository.dedupeCorporateActions(stock.id);
    const actions = await this.repository.listCorporateActions(stock.id);

    return this.formatCorporateActionsResponse(stock, actions);
  }

  async storedCorporateActionsByInstrumentId(instrumentId: string, options: Pick<PaginationOptions, 'region' | 'assetType'> = {}) {
    const stock = await this.repository.findStockByIdInScope(instrumentId, options);
    if (!stock) {
      return null;
    }

    await this.repository.dedupeCorporateActions(stock.id);
    const actions = await this.repository.listCorporateActions(stock.id);
    return this.formatCorporateActionsResponse(stock, actions);
  }

  private formatCorporateActionsResponse(stock: any, actions: any[]) {
    return {
      instrument_id: stock.id,
      symbol: stock.symbol,
      source: actions[0]?.source || 'database',
      ingestion_timestamp: actions[0]?.ingestionTimestamp?.toISOString?.() ?? null,
      last_updated_timestamp: actions[0]?.lastUpdatedTimestamp?.toISOString?.() ?? null,
      data_status: actions.length > 0 ? 'COMPLETE' : 'MISSING',
      actions: actions.map((action: any) => ({
        action_type: action.actionType,
        effective_date: action.effectiveDate.toISOString(),
        declared_date: action.declaredDate?.toISOString?.() ?? null,
        payment_date: action.paymentDate?.toISOString?.() ?? null,
        value: action.actionType === 'dividend' ? (action.amount !== null ? Number(action.amount) : null) : (action.splitRatio !== null ? Number(action.splitRatio) : null),
        ratio: action.splitRatio !== null ? Number(action.splitRatio) : null,
        amount: action.amount !== null ? Number(action.amount) : null,
        currency: action.currency,
        source: action.source,
        ingestion_timestamp: action.ingestionTimestamp.toISOString(),
        last_updated_timestamp: action.lastUpdatedTimestamp.toISOString(),
        data_status: action.dataStatus,
      })),
    };
  }

  async fetchHistorical(symbol: string, startDate?: Date, endDate?: Date, options: { region?: string; assetType?: string; exchange?: string | null } = {}): Promise<HistoricalPrice[]> {
    void symbol;
    void startDate;
    void endDate;
    void options;
    throw this.providerDisabledError('provider historical candle fetch');
  }

  async storeHistorical(prices: HistoricalPrice[]): Promise<SyncSummary> {
    try {
      return await this.repository.storeHistorical(
        prices,
        this.marketDataProvider.inferRegion.bind(this.marketDataProvider)
      );
    } catch (error) {
      console.error(`  Failed to store price ticks for ${prices[0]?.symbol}:`, error);
      throw error;
    }
  }

  async storeHistoricalBulk(
    prices: HistoricalPrice[],
    regionInfoBySymbol: Map<string, PriceRegionInfo> = new Map(),
    options: HistoricalStoreOptions = {}
  ): Promise<HistoricalBulkStoreResult> {
    const repository = this.repository as any;
    if (typeof repository.storeHistoricalBulk === 'function') {
      return repository.storeHistoricalBulk(
        prices,
        this.marketDataProvider.inferRegion.bind(this.marketDataProvider),
        regionInfoBySymbol,
        options
      );
    }

    const summaryBySymbol = new Map<string, SyncSummary>();
    let aggregate: SyncSummary = {
      rowsReceived: 0,
      rowsInserted: 0,
      rowsUpdated: 0,
      rowsSkipped: 0,
      rowsNoOp: 0,
      warningCount: 0,
      warnings: [],
    };
    const bySymbol = new Map<string, HistoricalPrice[]>();
    for (const price of prices) {
      bySymbol.set(price.symbol, [...(bySymbol.get(price.symbol) || []), price]);
    }
    for (const [symbol, symbolPrices] of bySymbol.entries()) {
      const symbolSummary = await this.storeHistorical(symbolPrices);
      summaryBySymbol.set(symbol, symbolSummary);
      aggregate = {
        rowsReceived: aggregate.rowsReceived + (symbolSummary.rowsReceived || 0),
        rowsInserted: aggregate.rowsInserted + (symbolSummary.rowsInserted || 0),
        rowsUpdated: aggregate.rowsUpdated + (symbolSummary.rowsUpdated || 0),
        rowsSkipped: aggregate.rowsSkipped + (symbolSummary.rowsSkipped || 0),
        rowsNoOp: (aggregate.rowsNoOp || 0) + (symbolSummary.rowsNoOp || 0),
        warningCount: aggregate.warningCount + (symbolSummary.warningCount || 0),
        warnings: [...(aggregate.warnings || []), ...(symbolSummary.warnings || [])].slice(0, 10),
      };
    }
    return { ...aggregate, summaryBySymbol };
  }

  async latestStoredCandleInfo(region: string, assetType = 'STOCK', now = new Date()) {
    const tradingDate = tradingDateForRegion(region, now);
    const [latestTradingDate, syncState] = await Promise.all([
      this.repository.latestStoredTradingDateForRegion(region, assetType),
      tradingDate ? this.repository.getSyncState(region, assetType, tradingDate) : Promise.resolve(null),
    ]);

    return {
      latestTradingDate,
      finalConfirmed: syncState?.status === 'FINAL_CONFIRMED',
      syncState,
      tradingDate,
    };
  }

  async shouldRunScheduledSync(region: string, assetType = 'STOCK', now = new Date(), options: {
    syncDuringMarketHours?: boolean;
    postCloseSyncWindowMinutes?: number;
    finalizationGraceMinutes?: number;
    skipWeekends?: boolean;
  } = {}) {
    const latest = await this.latestStoredCandleInfo(region, assetType, now);
    return shouldRunMarketDataSync(region, now, {
      latestTradingDate: latest.latestTradingDate,
      finalConfirmed: latest.finalConfirmed,
    }, options);
  }

  async importNseCmUdiffDaily(input: {
    tradingDate: Date | string;
    csvText?: string;
    fileName?: string;
    fileUrl?: string | null;
    force?: boolean;
  }): Promise<ExchangeDailyImportSummary> {
    const tradingDate = this.normalizeExchangeTradingDate(input.tradingDate);
    const tradingDateText = tradingDate.toISOString().slice(0, 10);
    const archive = buildNseUdiffCmBhavcopyArchiveUrl(tradingDate);
    const fileName = input.fileName?.trim() || archive.fileName;
    const fileUrl = input.fileUrl === undefined ? archive.url : input.fileUrl;
    const csvText = input.csvText ?? await this.downloadOfficialExchangeText(fileUrl || archive.url);
    const parsed = parseIndianExchangeEodCsv(csvText, {
      source: 'NSE_UDIFF_CM_BHAVCOPY',
      sourceName: 'NSE_UDIFF_CM_BHAVCOPY',
      sourceUrl: fileUrl || null,
      exchange: 'NSE',
      symbolSuffix: '',
      includeSeries: ['EQ', 'BE'],
      tradingDate,
    });
    const fileHash = parsed.sourceIdentity.contentSha256;
    const fileSize = Buffer.byteLength(csvText, 'utf8');
    const repository = this.repository as any;

    const existingImport = typeof repository.findSourceFileImportByKey === 'function'
      ? await repository.findSourceFileImportByKey({
        source: 'NSE',
        segment: 'CM',
        tradingDate,
        fileHash,
      })
      : null;

    if (!input.force && existingImport?.status === 'COMPLETED') {
      return {
        status: 'SKIPPED_DUPLICATE',
        source: 'NSE',
        segment: 'CM',
        tradingDate: tradingDateText,
        sourceName: parsed.sourceName,
        fileName,
        fileUrl: fileUrl || null,
        sourceFileImportId: existingImport.id ?? null,
        sourceFingerprint: parsed.sourceFingerprint,
        rowsRead: parsed.rowsRead,
        rowsParsed: parsed.rowsParsed,
        rowsInserted: 0,
        rowsUpdated: 0,
        rowsNoOp: 0,
        rowsSkipped: parsed.rowsSkipped,
        warningCount: parsed.warnings.length,
        warnings: parsed.warnings.slice(0, 10),
        errors: [],
      };
    }

    const pendingImport = await repository.upsertSourceFileImport({
      source: 'NSE',
      segment: 'CM',
      tradingDate,
      fileName,
      fileUrl: fileUrl || null,
      fileHash,
      fileSize,
      status: 'PENDING',
      rowsRaw: parsed.rowsRead,
      rowsAccepted: 0,
      rowsRejected: parsed.rowsSkipped,
      parserVersion: 'nse-cm-udiff-v1',
      errorMessage: null,
    });

    try {
      const regionInfoBySymbol = new Map<string, PriceRegionInfo>();
      parsed.prices.forEach((price) => {
        regionInfoBySymbol.set(price.symbol, { region: 'IN', exchange: 'NSE' });
      });
      const storeSummary = await this.storeHistoricalBulk(parsed.prices, regionInfoBySymbol, {
        sourceFileImportId: pendingImport?.id ?? null,
      });
      const changedSymbols: string[] = [];
      const downstreamSymbols: string[] = [];
      storeSummary.summaryBySymbol.forEach((summary, symbol) => {
        if ((summary.rowsReceived || 0) > 0 || (summary.rowsInserted || 0) > 0 || (summary.rowsUpdated || 0) > 0 || (summary.rowsNoOp || 0) > 0) {
          downstreamSymbols.push(symbol);
        }
        if ((summary.rowsInserted || 0) > 0 || (summary.rowsUpdated || 0) > 0) {
          changedSymbols.push(symbol);
        }
      });

      const completedImport = await repository.upsertSourceFileImport({
        source: 'NSE',
        segment: 'CM',
        tradingDate,
        fileName,
        fileUrl: fileUrl || null,
        fileHash,
        fileSize,
        status: 'COMPLETED',
        rowsRaw: parsed.rowsRead,
        rowsAccepted: parsed.rowsParsed,
        rowsRejected: parsed.rowsSkipped,
        parserVersion: 'nse-cm-udiff-v1',
        errorMessage: null,
      });

      return {
        status: 'COMPLETED',
        source: 'NSE',
        segment: 'CM',
        tradingDate: tradingDateText,
        sourceName: parsed.sourceName,
        fileName,
        fileUrl: fileUrl || null,
        sourceFileImportId: completedImport?.id ?? pendingImport?.id ?? null,
        sourceFingerprint: parsed.sourceFingerprint,
        rowsRead: parsed.rowsRead,
        rowsParsed: parsed.rowsParsed,
        rowsInserted: storeSummary.rowsInserted || 0,
        rowsUpdated: storeSummary.rowsUpdated || 0,
        rowsNoOp: storeSummary.rowsNoOp || 0,
        rowsSkipped: (storeSummary.rowsSkipped || 0) + parsed.rowsSkipped,
        warningCount: (storeSummary.warningCount || 0) + parsed.warnings.length,
        warnings: [...parsed.warnings, ...(storeSummary.warnings || [])].slice(0, 10),
        errors: [],
        changedSymbols: changedSymbols.sort((a, b) => a.localeCompare(b)),
        downstreamSymbols: downstreamSymbols.sort((a, b) => a.localeCompare(b)),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'NSE CM UDiFF import failed';
      await repository.upsertSourceFileImport({
        source: 'NSE',
        segment: 'CM',
        tradingDate,
        fileName,
        fileUrl: fileUrl || null,
        fileHash,
        fileSize,
        status: 'FAILED',
        rowsRaw: parsed.rowsRead,
        rowsAccepted: 0,
        rowsRejected: parsed.rowsRead,
        parserVersion: 'nse-cm-udiff-v1',
        errorMessage: message,
      }).catch(() => undefined);
      return {
        status: 'FAILED',
        source: 'NSE',
        segment: 'CM',
        tradingDate: tradingDateText,
        sourceName: parsed.sourceName,
        fileName,
        fileUrl: fileUrl || null,
        sourceFileImportId: pendingImport?.id ?? null,
        sourceFingerprint: parsed.sourceFingerprint,
        rowsRead: parsed.rowsRead,
        rowsParsed: parsed.rowsParsed,
        rowsInserted: 0,
        rowsUpdated: 0,
        rowsNoOp: 0,
        rowsSkipped: parsed.rowsRead,
        warningCount: parsed.warnings.length,
        warnings: parsed.warnings.slice(0, 10),
        errors: [message],
      };
    }
  }

  async importBseCmBackupDaily(input: {
    tradingDate: Date | string;
    csvText?: string;
    fileName?: string;
    fileUrl?: string | null;
    force?: boolean;
  }): Promise<ExchangeDailyImportSummary> {
    const tradingDate = this.normalizeExchangeTradingDate(input.tradingDate);
    const tradingDateText = tradingDate.toISOString().slice(0, 10);
    const fileName = input.fileName?.trim() || `BhavCopy_BSE_CM_${tradingDateText.replace(/-/g, '')}.csv`;
    const fileUrl = input.fileUrl ?? null;
    if (!input.csvText && !fileUrl) {
      throw new Error('csvText or fileUrl is required for BSE backup import.');
    }
    const csvText = input.csvText ?? await this.downloadOfficialExchangeText(fileUrl as string);
    const parsed = parseIndianExchangeEodCsv(csvText, {
      source: 'BSE_UDIFF_CM_BHAVCOPY',
      sourceName: 'BSE_UDIFF_CM_BHAVCOPY',
      sourceUrl: fileUrl,
      exchange: 'BSE',
      symbolSuffix: '',
      tradingDate,
    });
    const fileHash = parsed.sourceIdentity.contentSha256;
    const fileSize = Buffer.byteLength(csvText, 'utf8');
    const repository = this.repository as any;

    const existingImport = typeof repository.findSourceFileImportByKey === 'function'
      ? await repository.findSourceFileImportByKey({
        source: 'BSE',
        segment: 'CM',
        tradingDate,
        fileHash,
      })
      : null;
    if (!input.force && existingImport?.status === 'COMPLETED') {
      return {
        status: 'SKIPPED_DUPLICATE',
        source: 'BSE',
        segment: 'CM',
        tradingDate: tradingDateText,
        sourceName: parsed.sourceName,
        fileName,
        fileUrl,
        sourceFileImportId: existingImport.id ?? null,
        sourceFingerprint: parsed.sourceFingerprint,
        rowsRead: parsed.rowsRead,
        rowsParsed: parsed.rowsParsed,
        rowsInserted: 0,
        rowsUpdated: 0,
        rowsNoOp: 0,
        rowsSkipped: parsed.rowsSkipped,
        warningCount: parsed.warnings.length,
        warnings: parsed.warnings.slice(0, 10),
        errors: [],
        changedSymbols: [],
        downstreamSymbols: [],
      };
    }

    const pendingImport = await repository.upsertSourceFileImport({
      source: 'BSE',
      segment: 'CM',
      tradingDate,
      fileName,
      fileUrl,
      fileHash,
      fileSize,
      status: 'PENDING',
      rowsRaw: parsed.rowsRead,
      rowsAccepted: 0,
      rowsRejected: parsed.rowsSkipped,
      parserVersion: 'bse-cm-udiff-fill-v1',
      errorMessage: null,
    });

    try {
      const parsedSymbols = [...new Set(parsed.prices.map((price) => price.symbol))];
      const identities = await repository.findExchangeIdentitiesForExchangeSymbols('BSE', parsedSymbols);
      const identityBySymbol = new Map<string, any>();
      identities.forEach((identity: any) => {
        [identity.exchangeSymbol, identity.securityCode, identity.securityId]
          .filter(Boolean)
          .forEach((value) => identityBySymbol.set(String(value).trim().toUpperCase(), identity));
      });

      const matchedPrices: HistoricalPrice[] = [];
      let unmatchedRows = 0;
      for (const price of parsed.prices) {
        const identity = identityBySymbol.get(price.symbol.trim().toUpperCase());
        const stockSymbol = identity?.stock?.symbol;
        if (!stockSymbol) {
          unmatchedRows += 1;
          continue;
        }
        matchedPrices.push({
          ...price,
          symbol: stockSymbol,
          source: 'BSE_UDIFF_CM_BHAVCOPY',
        });
      }

      const fillPrices: HistoricalPrice[] = typeof repository.filterPricesMissingPrimaryExchangeCandles === 'function'
        ? await repository.filterPricesMissingPrimaryExchangeCandles(matchedPrices, 'NSE')
        : matchedPrices;
      const skippedForPrimary = Math.max(0, matchedPrices.length - fillPrices.length);
      const regionInfoBySymbol = new Map<string, PriceRegionInfo>();
      fillPrices.forEach((price) => {
        regionInfoBySymbol.set(price.symbol, { region: 'IN', exchange: 'BSE' });
      });
      const emptyStoreSummary: HistoricalBulkStoreResult = {
        rowsReceived: 0,
        rowsInserted: 0,
        rowsUpdated: 0,
        rowsSkipped: 0,
        rowsNoOp: 0,
        warningCount: 0,
        warnings: [],
        summaryBySymbol: new Map(),
      };
      const storeSummary = fillPrices.length > 0
        ? await this.storeHistoricalBulk(fillPrices, regionInfoBySymbol, { sourceFileImportId: pendingImport?.id ?? null })
        : emptyStoreSummary;
      const changedSymbols: string[] = [];
      const downstreamSymbols: string[] = [];
      storeSummary.summaryBySymbol.forEach((summary, symbol) => {
        if ((summary.rowsReceived || 0) > 0 || (summary.rowsInserted || 0) > 0 || (summary.rowsUpdated || 0) > 0 || (summary.rowsNoOp || 0) > 0) {
          downstreamSymbols.push(symbol);
        }
        if ((summary.rowsInserted || 0) > 0 || (summary.rowsUpdated || 0) > 0) {
          changedSymbols.push(symbol);
        }
      });

      const rowsSkipped = parsed.rowsSkipped + unmatchedRows + skippedForPrimary + (storeSummary.rowsSkipped || 0);
      const completedImport = await repository.upsertSourceFileImport({
        source: 'BSE',
        segment: 'CM',
        tradingDate,
        fileName,
        fileUrl,
        fileHash,
        fileSize,
        status: 'COMPLETED',
        rowsRaw: parsed.rowsRead,
        rowsAccepted: fillPrices.length,
        rowsRejected: rowsSkipped,
        parserVersion: 'bse-cm-udiff-fill-v1',
        errorMessage: null,
      });

      return {
        status: 'COMPLETED',
        source: 'BSE',
        segment: 'CM',
        tradingDate: tradingDateText,
        sourceName: parsed.sourceName,
        fileName,
        fileUrl,
        sourceFileImportId: completedImport?.id ?? pendingImport?.id ?? null,
        sourceFingerprint: parsed.sourceFingerprint,
        rowsRead: parsed.rowsRead,
        rowsParsed: parsed.rowsParsed,
        rowsInserted: storeSummary.rowsInserted || 0,
        rowsUpdated: storeSummary.rowsUpdated || 0,
        rowsNoOp: storeSummary.rowsNoOp || 0,
        rowsSkipped,
        warningCount: (storeSummary.warningCount || 0) + parsed.warnings.length,
        warnings: [...parsed.warnings, ...(storeSummary.warnings || [])].slice(0, 10),
        errors: [],
        changedSymbols: changedSymbols.sort((a, b) => a.localeCompare(b)),
        downstreamSymbols: downstreamSymbols.sort((a, b) => a.localeCompare(b)),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'BSE CM backup import failed';
      await repository.upsertSourceFileImport({
        source: 'BSE',
        segment: 'CM',
        tradingDate,
        fileName,
        fileUrl,
        fileHash,
        fileSize,
        status: 'FAILED',
        rowsRaw: parsed.rowsRead,
        rowsAccepted: 0,
        rowsRejected: parsed.rowsRead,
        parserVersion: 'bse-cm-udiff-fill-v1',
        errorMessage: message,
      }).catch(() => undefined);
      return {
        status: 'FAILED',
        source: 'BSE',
        segment: 'CM',
        tradingDate: tradingDateText,
        sourceName: parsed.sourceName,
        fileName,
        fileUrl,
        sourceFileImportId: pendingImport?.id ?? null,
        sourceFingerprint: parsed.sourceFingerprint,
        rowsRead: parsed.rowsRead,
        rowsParsed: parsed.rowsParsed,
        rowsInserted: 0,
        rowsUpdated: 0,
        rowsNoOp: 0,
        rowsSkipped: parsed.rowsRead,
        warningCount: parsed.warnings.length,
        warnings: parsed.warnings.slice(0, 10),
        errors: [message],
        changedSymbols: [],
        downstreamSymbols: [],
      };
    }
  }

  async importNseIndexEodDaily(input: {
    tradingDate: Date | string;
    csvText?: string;
    fileName?: string;
    fileUrl?: string | null;
    force?: boolean;
    segment?: 'INDEX' | 'SECTOR_INDEX';
  }): Promise<ExchangeDailyImportSummary> {
    const tradingDate = this.normalizeExchangeTradingDate(input.tradingDate);
    const tradingDateText = tradingDate.toISOString().slice(0, 10);
    const segment = input.segment || 'INDEX';
    const fileName = input.fileName?.trim() || `nse-index-eod-${tradingDateText}.csv`;
    const fileUrl = input.fileUrl ?? null;
    if (!input.csvText && !fileUrl) {
      throw new Error('csvText or fileUrl is required for NSE index EOD import.');
    }
    const csvText = input.csvText ?? await this.downloadOfficialExchangeText(fileUrl as string);
    const fileHash = this.sha256(csvText);
    const fileSize = Buffer.byteLength(csvText, 'utf8');
    const rows = this.parseCsv(csvText);
    const parsedRows: Array<{
      officialName: string;
      date: Date;
      open: number;
      high: number;
      low: number;
      close: number;
    }> = [];
    const warnings: string[] = [];

    rows.forEach((row, index) => {
      const officialName = this.cleanIndexName(this.readObjectString(row, ['INDEX NAME', 'INDEX', 'INDEX_NAME', 'NAME']));
      const date = this.parseCatalogDate(this.readObjectString(row, ['INDEX DATE', 'INDEX_DATE', 'DATE', 'TIMESTAMP'])) || tradingDate;
      const open = this.parseMarketDataNumber(this.readObjectString(row, ['OPEN INDEX VALUE', 'OPEN', 'OPEN_INDEX_VALUE']));
      const high = this.parseMarketDataNumber(this.readObjectString(row, ['HIGH INDEX VALUE', 'HIGH', 'HIGH_INDEX_VALUE']));
      const low = this.parseMarketDataNumber(this.readObjectString(row, ['LOW INDEX VALUE', 'LOW', 'LOW_INDEX_VALUE']));
      const close = this.parseMarketDataNumber(this.readObjectString(row, ['CLOSING INDEX VALUE', 'CLOSE', 'CLOSING_INDEX_VALUE', 'CLOSE INDEX VALUE']));
      if (!officialName || !date || open === null || high === null || low === null || close === null) {
        warnings.push(`Row ${index + 1}: missing or invalid index EOD fields; skipped.`);
        return;
      }
      parsedRows.push({ officialName, date: this.startOfUtcDay(date), open, high, low, close });
    });

    const repository = this.repository as any;
    const existingImport = typeof repository.findSourceFileImportByKey === 'function'
      ? await repository.findSourceFileImportByKey({
        source: 'NSE',
        segment,
        tradingDate,
        fileHash,
      })
      : null;
    if (!input.force && existingImport?.status === 'COMPLETED') {
      return {
        status: 'SKIPPED_DUPLICATE',
        source: 'NSE',
        segment,
        tradingDate: tradingDateText,
        sourceName: segment === 'SECTOR_INDEX' ? 'NIFTY_SECTOR_INDEX' : 'NSE_INDEX_EOD',
        fileName,
        fileUrl,
        sourceFileImportId: existingImport.id ?? null,
        sourceFingerprint: `nse-index-eod:${fileHash}`,
        rowsRead: rows.length,
        rowsParsed: parsedRows.length,
        rowsInserted: 0,
        rowsUpdated: 0,
        rowsNoOp: 0,
        rowsSkipped: rows.length - parsedRows.length,
        warningCount: warnings.length,
        warnings: warnings.slice(0, 10),
        errors: [],
        changedSymbols: [],
        downstreamSymbols: [],
      };
    }

    const pendingImport = await repository.upsertSourceFileImport({
      source: 'NSE',
      segment,
      tradingDate,
      fileName,
      fileUrl,
      fileHash,
      fileSize,
      status: 'PENDING',
      rowsRaw: rows.length,
      rowsAccepted: 0,
      rowsRejected: rows.length - parsedRows.length,
      parserVersion: 'nse-index-eod-v1',
      errorMessage: null,
    });

    try {
      const officialNames = [...new Set(parsedRows.map((row) => row.officialName))];
      const indexStocks = await repository.findIndexStocksBySourceSymbols(officialNames);
      const stockByName = new Map<string, any>();
      indexStocks.forEach((stock: any) => {
        [stock.sourceSymbol, stock.displaySymbol, stock.name]
          .filter(Boolean)
          .forEach((value) => stockByName.set(this.cleanIndexName(String(value)).toUpperCase(), stock));
      });

      const prices: HistoricalPrice[] = [];
      let unmatchedRows = 0;
      parsedRows.forEach((row) => {
        const stock = stockByName.get(row.officialName.toUpperCase());
        if (!stock?.symbol) {
          unmatchedRows += 1;
          return;
        }
        const source = this.isBroadIndianIndexName(row.officialName) ? 'NSE_INDEX_EOD' : 'NIFTY_SECTOR_INDEX';
        prices.push({
          symbol: stock.symbol,
          date: row.date,
          open: row.open,
          high: row.high,
          low: row.low,
          close: row.close,
          adjustedClose: null,
          source,
        });
      });

      const regionInfoBySymbol = new Map<string, PriceRegionInfo>();
      prices.forEach((price) => regionInfoBySymbol.set(price.symbol, { region: 'IN', exchange: 'NSE_INDEX' }));
      const emptyStoreSummary: HistoricalBulkStoreResult = {
        rowsReceived: 0,
        rowsInserted: 0,
        rowsUpdated: 0,
        rowsSkipped: 0,
        rowsNoOp: 0,
        warningCount: 0,
        warnings: [],
        summaryBySymbol: new Map(),
      };
      const storeSummary = prices.length > 0
        ? await this.storeHistoricalBulk(prices, regionInfoBySymbol, { sourceFileImportId: pendingImport?.id ?? null })
        : emptyStoreSummary;
      const changedSymbols: string[] = [];
      const downstreamSymbols: string[] = [];
      storeSummary.summaryBySymbol.forEach((summary, symbol) => {
        if ((summary.rowsReceived || 0) > 0 || (summary.rowsInserted || 0) > 0 || (summary.rowsUpdated || 0) > 0 || (summary.rowsNoOp || 0) > 0) {
          downstreamSymbols.push(symbol);
        }
        if ((summary.rowsInserted || 0) > 0 || (summary.rowsUpdated || 0) > 0) {
          changedSymbols.push(symbol);
        }
      });
      const rowsSkipped = (rows.length - parsedRows.length) + unmatchedRows + (storeSummary.rowsSkipped || 0);
      const completedImport = await repository.upsertSourceFileImport({
        source: 'NSE',
        segment,
        tradingDate,
        fileName,
        fileUrl,
        fileHash,
        fileSize,
        status: 'COMPLETED',
        rowsRaw: rows.length,
        rowsAccepted: prices.length,
        rowsRejected: rowsSkipped,
        parserVersion: 'nse-index-eod-v1',
        errorMessage: null,
      });

      return {
        status: 'COMPLETED',
        source: 'NSE',
        segment,
        tradingDate: tradingDateText,
        sourceName: segment === 'SECTOR_INDEX' ? 'NIFTY_SECTOR_INDEX' : 'NSE_INDEX_EOD',
        fileName,
        fileUrl,
        sourceFileImportId: completedImport?.id ?? pendingImport?.id ?? null,
        sourceFingerprint: `nse-index-eod:${fileHash}`,
        rowsRead: rows.length,
        rowsParsed: parsedRows.length,
        rowsInserted: storeSummary.rowsInserted || 0,
        rowsUpdated: storeSummary.rowsUpdated || 0,
        rowsNoOp: storeSummary.rowsNoOp || 0,
        rowsSkipped,
        warningCount: (storeSummary.warningCount || 0) + warnings.length,
        warnings: [...warnings, ...(storeSummary.warnings || [])].slice(0, 10),
        errors: [],
        changedSymbols: changedSymbols.sort((a, b) => a.localeCompare(b)),
        downstreamSymbols: downstreamSymbols.sort((a, b) => a.localeCompare(b)),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'NSE index EOD import failed';
      await repository.upsertSourceFileImport({
        source: 'NSE',
        segment,
        tradingDate,
        fileName,
        fileUrl,
        fileHash,
        fileSize,
        status: 'FAILED',
        rowsRaw: rows.length,
        rowsAccepted: 0,
        rowsRejected: rows.length,
        parserVersion: 'nse-index-eod-v1',
        errorMessage: message,
      }).catch(() => undefined);
      return {
        status: 'FAILED',
        source: 'NSE',
        segment,
        tradingDate: tradingDateText,
        sourceName: segment === 'SECTOR_INDEX' ? 'NIFTY_SECTOR_INDEX' : 'NSE_INDEX_EOD',
        fileName,
        fileUrl,
        sourceFileImportId: pendingImport?.id ?? null,
        sourceFingerprint: `nse-index-eod:${fileHash}`,
        rowsRead: rows.length,
        rowsParsed: parsedRows.length,
        rowsInserted: 0,
        rowsUpdated: 0,
        rowsNoOp: 0,
        rowsSkipped: rows.length,
        warningCount: warnings.length,
        warnings: warnings.slice(0, 10),
        errors: [message],
        changedSymbols: [],
        downstreamSymbols: [],
      };
    }
  }

  async syncScheduledRegion(region: string, options: {
    assetType?: string;
    batchSize?: number;
    lookbackTradingDays?: number;
    now?: Date;
    syncDuringMarketHours?: boolean;
    postCloseSyncWindowMinutes?: number;
    finalizationGraceMinutes?: number;
    skipWeekends?: boolean;
  } = {}): Promise<ScheduledRegionSyncSummary> {
    const assetType = options.assetType || 'STOCK';
    const now = options.now || new Date();
    const tradingDate = tradingDateForRegion(region, now) || now.toISOString().slice(0, 10);
    const targetTradingDate = latestCompletedTradingDateForRegion(region, now) || tradingDate;
    const gate = await this.evaluateSyncFreshnessGate({
      region,
      assetType,
      scopeType: 'CATALOG',
      scopeKey: region,
      tradingDate,
      now,
      force: false,
      cooldownMinutes: this.manualSyncCooldownMinutes,
      syncDuringMarketHours: options.syncDuringMarketHours,
      postCloseSyncWindowMinutes: options.postCloseSyncWindowMinutes,
      finalizationGraceMinutes: options.finalizationGraceMinutes,
      skipWeekends: options.skipWeekends,
    });
    if (gate.shouldSkip) {
      const staleCount = await this.countStaleCatalogSyncTasks({ region, assetType }, targetTradingDate);
      if (staleCount > 0) {
        console.log(`Catalog sync continuing: ${staleCount} instruments still need latest completed candle ${targetTradingDate}.`);
      } else {
        console.log(`Catalog sync skipped: ${gate.reason}. No provider fetch required. Next eligible sync at ${gate.nextEligibleSyncAt ?? 'unknown'}`);
        const skippedCount = await this.repository.instrumentCount({ region, assetType });
        const summary = this.buildSkippedRegionSummary(region, assetType, tradingDate, skippedCount, gate.reason, gate.message, now, gate.nextEligibleSyncAt);
        await this.repository.upsertSyncState({
          region,
          assetType,
          scopeType: 'CATALOG',
          scopeKey: region,
          tradingDate,
          timeframe: '1D',
          status: gate.reason === 'FINAL_CANDLE_CONFIRMED' ? 'FINAL_CONFIRMED' : 'SYNCED',
          summary,
          lastCheckedAt: now,
        });
        return summary;
      }
    }

    const batchSize = Math.max(1, Math.min(options.batchSize ?? 25, 250));

    if (this.shouldUseExchangeDailyImportPath(region, assetType)) {
      const summary: ScheduledRegionSyncSummary = {
        region,
        assetType,
        tradingDate,
        dataThroughDate: targetTradingDate,
        instrumentsProcessed: 0,
        rowsReceived: 0,
        rowsInserted: 0,
        rowsUpdated: 0,
        rowsSkipped: 0,
        rowsNoOp: 0,
        changedInstrumentIds: [],
        downstreamInstrumentIds: [],
        changedInstrumentCount: 0,
        dqStageEligible: false,
        warningCount: 0,
        warnings: [],
        errors: [],
      };
      await this.repository.upsertSyncState({ region, assetType, tradingDate, status: 'PENDING', summary, lastCheckedAt: now });

      const tasks = await this.repository.listActiveStockSyncTasks({ region, assetType });
      const importSummary = await this.importNseCmUdiffDaily({ tradingDate: targetTradingDate });
      const changedInstrumentIds = this.instrumentIdsForImportedSymbols(tasks, importSummary.changedSymbols || []);
      const downstreamInstrumentIds = this.instrumentIdsForImportedSymbols(tasks, importSummary.downstreamSymbols || importSummary.changedSymbols || []);

      summary.instrumentsProcessed = importSummary.rowsParsed;
      summary.rowsReceived = importSummary.rowsParsed;
      summary.rowsInserted = importSummary.rowsInserted;
      summary.rowsUpdated = importSummary.rowsUpdated;
      summary.rowsSkipped = importSummary.rowsSkipped;
      summary.rowsNoOp = importSummary.rowsNoOp;
      summary.warningCount = importSummary.warningCount;
      summary.warnings = importSummary.warnings.slice(0, 10);
      summary.errors = importSummary.errors.slice(0, 10);
      summary.sourceFingerprint = importSummary.sourceFingerprint || this.scheduledRegionSourceFingerprint({
        region,
        assetType,
        dataThroughDate: targetTradingDate,
        rowsInserted: importSummary.rowsInserted,
        rowsUpdated: importSummary.rowsUpdated,
        changedInstrumentIds,
        downstreamInstrumentIds,
      });
      summary.changedInstrumentIds = changedInstrumentIds;
      summary.downstreamInstrumentIds = downstreamInstrumentIds;
      summary.changedInstrumentCount = changedInstrumentIds.length;
      summary.dqStageEligible = downstreamInstrumentIds.length > 0 && importSummary.status !== 'FAILED';
      summary.officialEodBulk = {
        enabled: true,
        attempted: true,
        sourceName: importSummary.sourceName,
        sourceUrl: importSummary.fileUrl,
        sourceFileName: importSummary.fileName,
        targetTradingDate,
        sourceFingerprint: importSummary.sourceFingerprint,
        rowsRead: importSummary.rowsRead,
        rowsParsed: importSummary.rowsParsed,
        matchedInstruments: downstreamInstrumentIds.length,
        rowsInserted: importSummary.rowsInserted,
        rowsUpdated: importSummary.rowsUpdated,
        rowsNoOp: importSummary.rowsNoOp,
        fallbackReason: importSummary.status === 'SKIPPED_DUPLICATE' ? 'SOURCE_FILE_ALREADY_IMPORTED' : null,
        warnings: importSummary.warnings.slice(0, 10),
      };

      if (downstreamInstrumentIds.length > 0) {
        const downstreamSymbols = this.importedSymbolsForInstrumentIds(tasks, downstreamInstrumentIds);
        await this.updateStockLoadTimestampsForSymbols(downstreamSymbols);
      }

      const status = importSummary.status === 'FAILED' ? 'FAILED' : 'SYNCED';
      await this.repository.upsertSyncState({ region, assetType, tradingDate, status, summary, lastCheckedAt: now, lastProviderFetchAt: null });
      return {
        ...summary,
        warnings: summary.warnings.slice(0, 10),
        errors: summary.errors.slice(0, 10),
      };
    }

    const repositoryAny = this.repository as any;
    const canListStaleTasks = typeof repositoryAny.listStaleActiveStockSyncTasks === 'function';
    const officialBulkEnabled = this.officialNseEodBulkEnabled();
    const staleTasksForOfficial = officialBulkEnabled && canListStaleTasks
      ? await this.listStaleCatalogSyncTasks({ region, assetType }, targetTradingDate, undefined)
      : [];
    const providerTasks = gate.shouldSkip
      ? (staleTasksForOfficial.length > 0
        ? staleTasksForOfficial.slice(0, batchSize)
        : await this.listStaleCatalogSyncTasks({ region, assetType }, targetTradingDate, batchSize))
      : await this.repository.listActiveStockSyncTasks({ region, assetType }, batchSize);
    const officialTasks = staleTasksForOfficial.length > 0 ? staleTasksForOfficial : providerTasks;
    const summary: ScheduledRegionSyncSummary = {
      region,
      assetType,
      tradingDate,
      dataThroughDate: targetTradingDate,
      instrumentsProcessed: 0,
      rowsReceived: 0,
      rowsInserted: 0,
      rowsUpdated: 0,
      rowsSkipped: 0,
      rowsNoOp: 0,
      changedInstrumentIds: [],
      downstreamInstrumentIds: [],
      changedInstrumentCount: 0,
      dqStageEligible: false,
      warningCount: 0,
      warnings: [],
      errors: [],
    };
    const changedInstrumentIds = new Set<string>();
    const downstreamInstrumentIds = new Set<string>();

    await this.repository.upsertSyncState({ region, assetType, tradingDate, status: 'PENDING', summary, lastCheckedAt: now });

    const officialBulk = await this.tryOfficialNseEodBulkLatestCandle({
      region,
      assetType,
      targetTradingDate,
      tasks: officialTasks,
    });
    summary.officialEodBulk = officialBulk.evidence;
    for (const taskId of officialBulk.matchedTaskIds) {
      const taskSummary = officialBulk.summaryByTaskId.get(taskId);
      if (!taskSummary) continue;
      downstreamInstrumentIds.add(taskId);
      if ((taskSummary.rowsInserted || 0) > 0 || (taskSummary.rowsUpdated || 0) > 0) {
        changedInstrumentIds.add(taskId);
      }
      summary.instrumentsProcessed += 1;
      summary.rowsReceived += taskSummary.rowsReceived || 0;
      summary.rowsInserted += taskSummary.rowsInserted || 0;
      summary.rowsUpdated += taskSummary.rowsUpdated || 0;
      summary.rowsSkipped += taskSummary.rowsSkipped || 0;
      summary.rowsNoOp += taskSummary.rowsNoOp || 0;
      summary.warningCount += taskSummary.warningCount || 0;
      summary.warnings.push(...(taskSummary.warnings || []));
    }
    if (officialBulk.evidence.fallbackReason) {
      summary.warningCount += 1;
      summary.warnings.push(`Official NSE EOD bulk fallback: ${officialBulk.evidence.fallbackReason}`);
    }

    for (const task of providerTasks) {
      if (officialBulk.matchedTaskIds.has(task.id)) continue;
      summary.instrumentsProcessed += 1;
      summary.rowsSkipped += 1;
      summary.warningCount += 1;
      summary.warnings.push(`${task.symbol}: no NSE/BSE exchange-file row matched; Yahoo/Angel provider fallback is disabled.`);
    }
    const sortedChangedInstrumentIds = [...changedInstrumentIds].sort((a, b) => a.localeCompare(b));
    const sortedDownstreamInstrumentIds = [...downstreamInstrumentIds].sort((a, b) => a.localeCompare(b));
    summary.changedInstrumentIds = sortedChangedInstrumentIds;
    summary.downstreamInstrumentIds = sortedDownstreamInstrumentIds;
    summary.changedInstrumentCount = sortedChangedInstrumentIds.length;
    summary.dqStageEligible = sortedDownstreamInstrumentIds.length > 0;
    summary.sourceFingerprint = summary.officialEodBulk?.sourceFingerprint
      || this.scheduledRegionSourceFingerprint({
        region,
        assetType,
        dataThroughDate: targetTradingDate,
        rowsInserted: summary.rowsInserted,
        rowsUpdated: summary.rowsUpdated,
        changedInstrumentIds: sortedChangedInstrumentIds,
        downstreamInstrumentIds: sortedDownstreamInstrumentIds,
      });

    const latestTradingDate = await this.repository.latestStoredTradingDateForRegion(region, assetType);
    const remainingStaleCount = await this.countStaleCatalogSyncTasks({ region, assetType }, targetTradingDate).catch(() => 0);
    if (remainingStaleCount > 0) {
      (summary as any).remainingStaleCount = remainingStaleCount;
      summary.warningCount += 1;
      summary.warnings.push(`${remainingStaleCount} instruments still need latest completed candle ${targetTradingDate}.`);
    }
    const decisionAfterRun = shouldRunMarketDataSync(region, now, {
      latestTradingDate,
      finalConfirmed: false,
    }, {
      syncDuringMarketHours: options.syncDuringMarketHours,
      postCloseSyncWindowMinutes: options.postCloseSyncWindowMinutes,
      finalizationGraceMinutes: options.finalizationGraceMinutes,
      skipWeekends: options.skipWeekends,
    });
    const canConfirmFinal = latestTradingDate === tradingDate
      && summary.rowsInserted === 0
      && summary.rowsUpdated === 0
      && summary.rowsNoOp > 0
      && (decisionAfterRun.reasonCode === 'POST_CLOSE_FINALIZATION_WINDOW' || decisionAfterRun.reasonCode === 'MARKET_CLOSED_NO_SYNC');
    const status = summary.errors.length > 0 || remainingStaleCount > 0
      ? 'FAILED'
      : canConfirmFinal
        ? 'FINAL_CONFIRMED'
        : 'SYNCED';

    await this.repository.upsertSyncState({ region, assetType, tradingDate, status, summary, lastCheckedAt: now, lastProviderFetchAt: now });
    return {
      ...summary,
      warnings: summary.warnings.slice(0, 10),
      errors: summary.errors.slice(0, 10),
    };
  }

  private async tryOfficialNseEodBulkLatestCandle(input: {
    region: string;
    assetType: string;
    targetTradingDate: string;
    tasks: StockSyncTask[];
  }): Promise<OfficialNseEodBulkSyncResult> {
    const evidence: OfficialEodBulkSyncEvidence = {
      enabled: this.officialNseEodBulkEnabled(),
      attempted: false,
      sourceName: null,
      sourceUrl: null,
      sourceFileName: null,
      targetTradingDate: input.targetTradingDate || null,
      sourceFingerprint: null,
      rowsRead: 0,
      rowsParsed: 0,
      matchedInstruments: 0,
      rowsInserted: 0,
      rowsUpdated: 0,
      rowsNoOp: 0,
      fallbackReason: null,
      warnings: [],
    };
    const result: OfficialNseEodBulkSyncResult = {
      evidence,
      matchedTaskIds: new Set<string>(),
      summaryByTaskId: new Map<string, SyncSummary>(),
    };

    if (!evidence.enabled) {
      evidence.fallbackReason = 'OFFICIAL_EOD_DISABLED';
      return result;
    }
    if (input.region !== 'IN' || input.assetType !== 'STOCK') {
      evidence.fallbackReason = 'OFFICIAL_EOD_SCOPE_UNSUPPORTED';
      return result;
    }
    if (input.tasks.length === 0) {
      evidence.fallbackReason = 'OFFICIAL_EOD_NO_TASKS';
      return result;
    }

    const tradingDate = new Date(`${input.targetTradingDate}T00:00:00.000Z`);
    if (Number.isNaN(tradingDate.getTime())) {
      evidence.fallbackReason = 'OFFICIAL_EOD_INVALID_TRADING_DATE';
      return result;
    }

    evidence.attempted = true;

    try {
      const officialSource = await this.loadFirstAvailableNseOfficialEodCsv(tradingDate);
      const { archive, parsed } = officialSource;
      evidence.sourceName = archive.sourceName;
      evidence.sourceUrl = archive.url;
      evidence.sourceFileName = archive.fileName;
      evidence.sourceFingerprint = parsed.sourceFingerprint;
      evidence.rowsRead = parsed.rowsRead;
      evidence.rowsParsed = parsed.rowsParsed;
      evidence.warnings = [...officialSource.warnings, ...parsed.warnings].slice(0, 10);

      const priceByAlias = new Map<string, HistoricalPrice>();
      for (const price of parsed.prices) {
        for (const alias of this.symbolAliasCandidates(price.symbol)) {
          if (!priceByAlias.has(alias)) {
            priceByAlias.set(alias, price);
          }
        }
      }

      const matchedRows: Array<{ task: StockSyncTask; price: HistoricalPrice }> = [];
      const regionInfoBySymbol = new Map<string, PriceRegionInfo>();
      for (const task of input.tasks) {
        if (!this.canUseOfficialNseEodForTask(task)) continue;

        let matched: HistoricalPrice | null = null;
        for (const alias of this.taskSymbolAliases(task)) {
          const candidate = priceByAlias.get(alias);
          if (candidate) {
            matched = candidate;
            break;
          }
        }
        if (!matched) continue;

        matchedRows.push({
          task,
          price: {
            ...matched,
            symbol: task.symbol,
            date: this.startOfUtcDay(matched.date),
          },
        });
        regionInfoBySymbol.set(task.symbol, this.taskPriceRegionInfo(input.region, task));
      }

      if (matchedRows.length > 0) {
        try {
          const bulkSummary = await this.storeHistoricalBulk(
            matchedRows.map((row) => row.price),
            regionInfoBySymbol
          );
          const matchedSymbols: string[] = [];
          for (const row of matchedRows) {
            const taskSummary = bulkSummary.summaryBySymbol.get(row.task.symbol);
            if (!taskSummary) {
              evidence.warnings.push(`${row.task.symbol}: official EOD row matched but no storage summary was returned.`);
              continue;
            }
            result.matchedTaskIds.add(row.task.id);
            result.summaryByTaskId.set(row.task.id, taskSummary);
            evidence.matchedInstruments += 1;
            evidence.rowsInserted += taskSummary.rowsInserted || 0;
            evidence.rowsUpdated += taskSummary.rowsUpdated || 0;
            evidence.rowsNoOp += taskSummary.rowsNoOp || 0;
            matchedSymbols.push(row.task.symbol);
          }
          await this.updateStockLoadTimestampsForSymbols(matchedSymbols);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'unknown storage error';
          evidence.warnings.push(`Official EOD bulk store failed for ${matchedRows.length} matched rows (${message}).`);
        }
      }

      if (evidence.matchedInstruments <= 0) {
        evidence.fallbackReason = 'OFFICIAL_EOD_NO_MATCHED_ROWS';
      } else if (evidence.matchedInstruments < input.tasks.length) {
        evidence.fallbackReason = `OFFICIAL_EOD_PARTIAL_MATCH:${input.tasks.length - evidence.matchedInstruments}_UNMATCHED`;
      }
      evidence.warnings = evidence.warnings.slice(0, 10);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'download or parse failed';
      evidence.fallbackReason = 'OFFICIAL_EOD_UNAVAILABLE';
      evidence.warnings = [message];
    }

    return result;
  }

  private async loadFirstAvailableNseOfficialEodCsv(tradingDate: Date): Promise<{
    archive: NseArchiveUrl;
    parsed: ReturnType<typeof parseIndianExchangeEodCsv>;
    warnings: string[];
  }> {
    const warnings: string[] = [];
    for (const archive of buildNseOfficialArchiveUrls(tradingDate)) {
      try {
        const csvText = await this.downloadOfficialExchangeText(archive.url);
        const parsed = parseIndianExchangeEodCsv(csvText, {
          source: archive.sourceName,
          sourceUrl: archive.url,
          exchange: 'NSE',
          includeSeries: ['EQ', 'BE'],
          tradingDate,
        });
        if (parsed.rowsParsed > 0) {
          return { archive, parsed, warnings };
        }
        warnings.push(`${archive.sourceName} ${archive.fileName}: parsed zero usable rows.`);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'download or parse failed';
        warnings.push(`${archive.sourceName} ${archive.fileName}: ${message}`);
      }
    }
    throw new Error(warnings.length > 0 ? warnings.join(' | ') : 'No official NSE EOD source was available.');
  }

  private taskPriceRegionInfo(defaultRegion: string, task: StockSyncTask): PriceRegionInfo {
    const exchange = this.trimmedUpper(task.exchange);
    if (defaultRegion === 'IN' && (this.isNseLikeExchange(exchange || '') || this.hasExplicitExchangeSuffix(task.providerSymbol, '.NS') || this.hasExplicitExchangeSuffix(task.symbol, '.NS'))) {
      return { region: 'IN', exchange: 'NSE' };
    }
    if (defaultRegion === 'IN' && (exchange === 'BSE' || this.hasExplicitExchangeSuffix(task.providerSymbol, '.BO') || this.hasExplicitExchangeSuffix(task.symbol, '.BO'))) {
      return { region: 'IN', exchange: 'BSE' };
    }
    return { region: defaultRegion, exchange: exchange || null };
  }

  private shouldUseExchangeDailyImportPath(region: string, assetType: string): boolean {
    const repository = this.repository as any;
    return region === 'IN'
      && assetType === 'STOCK'
      && typeof repository.upsertSourceFileImport === 'function'
      && typeof repository.storeHistoricalBulk === 'function';
  }

  private instrumentIdsForImportedSymbols(tasks: StockSyncTask[], symbols: string[]): string[] {
    const symbolSet = new Set(symbols.flatMap((symbol) => [...this.symbolAliasCandidates(symbol)]));
    return tasks
      .filter((task) => [...this.taskSymbolAliases(task)].some((alias) => symbolSet.has(alias)))
      .map((task) => task.id)
      .sort((a, b) => a.localeCompare(b));
  }

  private importedSymbolsForInstrumentIds(tasks: StockSyncTask[], instrumentIds: string[]): string[] {
    const ids = new Set(instrumentIds);
    return tasks
      .filter((task) => ids.has(task.id))
      .map((task) => task.symbol)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }

  private async updateStockLoadTimestampsForSymbols(symbols: string[]): Promise<void> {
    const uniqueSymbols = [...new Set(symbols.filter(Boolean))];
    if (uniqueSymbols.length === 0) return;
    const repository = this.repository as any;
    if (typeof repository.updateStockLoadTimestampBySymbols === 'function') {
      try {
        await repository.updateStockLoadTimestampBySymbols(uniqueSymbols);
        return;
      } catch {
        // Fall through to per-symbol compatibility path for older repository doubles.
      }
    }
    if (typeof repository.updateStockLoadTimestampBySymbol !== 'function') return;
    await Promise.all(uniqueSymbols.map((symbol) =>
      this.repository.updateStockLoadTimestampBySymbol(symbol).catch(() => null)
    ));
  }

  private officialNseEodBulkEnabled(): boolean {
    const value = process.env.MARKET_DATA_NSE_OFFICIAL_EOD_BULK_ENABLED;
    if (value !== undefined) return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
    return process.env.NODE_ENV !== 'test';
  }

  private canUseOfficialNseEodForTask(task: StockSyncTask): boolean {
    const exchange = this.trimmedUpper(task.exchange);
    const identifiers = [task.symbol, task.providerSymbol, task.sourceSymbol, task.displaySymbol];
    const hasNsEvidence = identifiers.some((value) => this.hasExplicitExchangeSuffix(value, '.NS'));
    const hasBoEvidence = identifiers.some((value) => this.hasExplicitExchangeSuffix(value, '.BO'));

    if (hasBoEvidence) return false;
    if (exchange) return this.isNseLikeExchange(exchange);
    return hasNsEvidence;
  }

  private isNseLikeExchange(exchange: string): boolean {
    return exchange === 'NSE'
      || exchange === 'NSE_EQ'
      || exchange === 'NSE_EQUITY'
      || exchange.startsWith('NSE');
  }

  private hasExplicitExchangeSuffix(symbol: string | null | undefined, suffix: '.NS' | '.BO'): boolean {
    return this.trimmedUpper(symbol)?.endsWith(suffix) || false;
  }

  private taskSymbolAliases(task: StockSyncTask): string[] {
    const aliases = new Set<string>();
    for (const value of [task.symbol, task.providerSymbol, task.sourceSymbol, task.displaySymbol]) {
      for (const alias of this.symbolAliasCandidates(value)) {
        aliases.add(alias);
      }
    }
    return [...aliases];
  }

  private symbolAliasCandidates(symbol: string | null | undefined): string[] {
    const normalized = String(symbol || '').trim().toUpperCase();
    if (!normalized) return [];
    const base = this.baseSymbolFromProviderSymbol(normalized);
    const aliases = new Set<string>([normalized, base]);
    if (base) aliases.add(`${base}.NS`);
    return [...aliases].filter(Boolean);
  }

  async ingestSymbol(symbol: string, startDate?: Date, endDate?: Date, fullReload = false, options: {
    force?: boolean;
    region?: string;
    assetType?: string;
    skipFreshnessGate?: boolean;
    preserveProviderSupportOnZeroRows?: boolean;
  } = {}): Promise<SyncSummary> {
    console.log(`Ingesting ${symbol}...`);

    const stock = await this.repository.findStockBySymbol(symbol);
    const region = options.region || stock?.region || this.marketDataProvider.inferRegion(symbol).region || 'GLOBAL';
    const assetType = options.assetType || stock?.assetType || 'STOCK';
    const storageSymbol = stock?.symbol || this.internalStorageSymbol(symbol, { region, assetType, exchange: stock?.exchange });
    const providerSymbol = stock?.providerSymbol || this.yahooHistoricalProviderSymbol(symbol, { region, assetType, exchange: stock?.exchange });
    const now = endDate || new Date();
    let providerEndDate = now;
    const tradingDate = tradingDateForRegion(region, now) || now.toISOString().slice(0, 10);

    if (!fullReload && !options.force && !options.skipFreshnessGate) {
      const gate = await this.evaluateSyncFreshnessGate({
        region,
        assetType,
        scopeType: 'INSTRUMENT',
        scopeKey: storageSymbol,
        tradingDate,
        now,
        force: false,
        cooldownMinutes: this.manualSyncCooldownMinutes,
      });
      if (gate.shouldSkip) {
        console.log(`  Skipping ${symbol}: ${gate.reason}, no provider fetch required. Next eligible sync at ${gate.nextEligibleSyncAt ?? 'unknown'}`);
        const summary = this.buildSkippedSyncSummary(1, gate.reason, gate.message, now, gate.nextEligibleSyncAt);
        await this.repository.upsertSyncState({
          region,
          assetType,
          scopeType: 'INSTRUMENT',
          scopeKey: storageSymbol,
          tradingDate,
          timeframe: '1D',
          status: gate.reason === 'FINAL_CANDLE_CONFIRMED' ? 'FINAL_CONFIRMED' : 'SYNCED',
          summary,
          lastCheckedAt: now,
        });
        return summary;
      }
      providerEndDate = gate.providerEndDate ?? now;
    }

    let effectiveStartDate = startDate;

    if (!effectiveStartDate) {
      if (fullReload) {
        effectiveStartDate = this.defaultBackfillStartDate();
        console.log(`  Full reload requested for ${symbol} from ${effectiveStartDate.toISOString().split('T')[0]}`);
      } else if (stock?.lastSuccessfulDataLoadTimestamp) {
        effectiveStartDate = new Date(stock.lastSuccessfulDataLoadTimestamp);
        effectiveStartDate.setDate(effectiveStartDate.getDate() - 3);
        console.log(`  Using incremental start date: ${effectiveStartDate.toISOString().split('T')[0]} (based on lastSuccessfulDataLoadTimestamp with 3-day overlap)`);
      } else {
        effectiveStartDate = this.defaultBackfillStartDate();
        console.log(`  Using default start date: ${effectiveStartDate.toISOString().split('T')[0]} (15-year first-time load)`);
      }
    }

    const effectiveEndDate = providerEndDate;

    if (effectiveStartDate >= effectiveEndDate) {
      console.log(`  Skipping ${symbol}: already up to date (last load: ${stock?.lastSuccessfulDataLoadTimestamp})`);
      return this.buildSkippedSyncSummary(1, 'RECENTLY_SYNCED', 'Latest daily candles already checked recently.', now, this.addMinutes(now, this.manualSyncCooldownMinutes).toISOString());
    }

    console.log(`  Fetching data from ${effectiveStartDate.toISOString().split('T')[0]} to ${effectiveEndDate.toISOString().split('T')[0]}`);

    let prices = await this.fetchHistorical(providerSymbol, effectiveStartDate, effectiveEndDate, {
      region,
      assetType,
      exchange: stock?.exchange,
    });
    const exchangeFallback = await this.fetchIndianExchangeEodFallbackIfNeeded({
      stock,
      symbol: storageSymbol,
      providerSymbol,
      region,
      assetType,
      startDate: effectiveStartDate,
      endDate: effectiveEndDate,
      providerPrices: prices,
      enabled: Boolean(options.preserveProviderSupportOnZeroRows),
    });
    if (exchangeFallback.prices.length > 0) {
      prices = this.mergeHistoricalPriceRows([...prices, ...exchangeFallback.prices]);
    }

    if (prices.length === 0) {
      console.log(`  No new price data available for ${symbol}`);
      const emptySummary = {
        rowsReceived: 0,
        rowsInserted: 0,
        rowsUpdated: 0,
        rowsSkipped: 0,
        rowsNoOp: 0,
        warningCount: 1 + exchangeFallback.warnings.length,
        warnings: ['Provider returned zero usable historical price rows.', ...exchangeFallback.warnings],
      };
      await this.repository.upsertSyncState({
        region,
        assetType,
        scopeType: 'INSTRUMENT',
        scopeKey: storageSymbol,
        tradingDate,
        timeframe: '1D',
        status: 'FAILED',
        summary: emptySummary,
        lastCheckedAt: now,
        lastProviderFetchAt: now,
      });
      if (!options.preserveProviderSupportOnZeroRows && stock && typeof (this.repository as any).updateProviderSupportStatus === 'function') {
        await this.repository.updateProviderSupportStatus(storageSymbol, 'UNSUPPORTED', 'Provider returned zero usable historical price rows.').catch(() => null);
      }
      return emptySummary;
    }

    const pricesForStorage = prices.map((price) => ({ ...price, symbol: storageSymbol }));
    const syncSummary = await this.storeHistorical(pricesForStorage);
    if (exchangeFallback.attempted) {
      syncSummary.warnings = [
        ...(syncSummary.warnings || []),
        ...exchangeFallback.warnings,
      ].slice(0, 10);
      syncSummary.warningCount = (syncSummary.warningCount || 0) + exchangeFallback.warnings.length;
    }
    await this.repository.updateStockLoadTimestampBySymbol(storageSymbol);
    if (typeof (this.repository as any).updateProviderSupportStatus === 'function') {
      await this.repository.updateProviderSupportStatus(storageSymbol, 'SUPPORTED', null).catch(() => null);
    }
    await this.repository.upsertSyncState({
      region,
      assetType,
      scopeType: 'INSTRUMENT',
      scopeKey: storageSymbol,
      tradingDate,
      timeframe: '1D',
      status: 'SYNCED',
      summary: syncSummary,
      lastCheckedAt: now,
      lastProviderFetchAt: now,
    });

    console.log(`  Successfully ingested ${prices.length} price ticks for ${storageSymbol}`);
    return syncSummary;
  }

  private async fetchIndianExchangeEodFallbackIfNeeded(input: {
    stock: any;
    symbol: string;
    providerSymbol: string;
    region: string;
    assetType: string;
    startDate: Date;
    endDate: Date;
    providerPrices: HistoricalPrice[];
    enabled: boolean;
  }): Promise<IndianExchangeFallbackResult> {
    const empty = (warnings: string[] = []): IndianExchangeFallbackResult => ({
      attempted: false,
      prices: [],
      warnings,
      sourceName: null,
      daysAttempted: 0,
      rowsParsed: 0,
    });
    if (!input.enabled || !this.exchangeEodFallbackEnabled()) return empty();
    if (input.region !== 'IN' || input.assetType !== 'STOCK') return empty();
    const exchange = String(input.stock?.exchange || '').trim().toUpperCase();
    const symbolText = `${input.symbol} ${input.providerSymbol}`.toUpperCase();
    if (exchange && exchange !== 'NSE' && exchange !== 'BSE') return empty();
    if (exchange === 'BSE' || symbolText.includes('.BO')) {
      return empty(['BSE official/public EOD fallback parsing is available, but no stable configured free BSE download URL is active for automatic backfill.']);
    }
    if (!this.providerHistoryNeedsExchangeFallback(input.providerPrices, input.startDate)) return empty();

    const dates = this.exchangeEodFallbackDates(input.startDate, input.endDate);
    if (dates.length === 0) return empty();
    const targetSymbols = this.exchangeEodTargetSymbols(input);
    const concurrency = this.exchangeEodFallbackConcurrency();
    const warnings: string[] = [];
    const prices: HistoricalPrice[] = [];
    let rowsParsed = 0;

    await this.eachWithConcurrency(dates, concurrency, async (date) => {
      const archive = buildNseSecurityBhavdataArchiveUrl(date);
      try {
        const csvText = await this.downloadOfficialExchangeText(archive.url);
        const parsed = parseIndianExchangeEodCsv(csvText, {
          source: archive.sourceName,
          sourceUrl: archive.url,
          exchange: 'NSE',
          includeSeries: ['EQ', 'BE'],
          tradingDate: date,
        });
        rowsParsed += parsed.rowsParsed;
        warnings.push(...parsed.warnings.slice(0, 2));
        prices.push(...parsed.prices.filter((price) => targetSymbols.has(price.symbol.toUpperCase())));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'official exchange fallback download failed';
        warnings.push(`${archive.sourceName} ${archive.fileName}: ${message}`);
      }
    });

    const uniquePrices = this.mergeHistoricalPriceRows(prices.map((price) => ({ ...price, symbol: input.symbol })));
    if (uniquePrices.length === 0) {
      warnings.unshift(`${input.symbol}: free official NSE EOD fallback attempted ${dates.length} day(s), but no matching daily OHLCV rows were stored.`);
    } else {
      warnings.unshift(`${input.symbol}: free official NSE EOD fallback stored ${uniquePrices.length} daily OHLCV row(s) from ${dates.length} bounded archive day(s).`);
    }

    return {
      attempted: true,
      prices: uniquePrices,
      warnings: warnings.slice(0, 10),
      sourceName: 'NSE_SECURITY_BHAVDATA',
      daysAttempted: dates.length,
      rowsParsed,
    };
  }

  private exchangeEodFallbackEnabled(): boolean {
    const value = process.env.MARKET_DATA_EXCHANGE_EOD_FALLBACK_ENABLED;
    if (value !== undefined) return !['0', 'false', 'no', 'off'].includes(value.trim().toLowerCase());
    return process.env.NODE_ENV !== 'test';
  }

  private providerHistoryNeedsExchangeFallback(prices: HistoricalPrice[], startDate: Date): boolean {
    if (prices.length === 0) return true;
    const earliest = prices.reduce((earliestDate, price) => price.date < earliestDate ? price.date : earliestDate, prices[0].date);
    const gapDays = Math.floor((this.startOfUtcDay(earliest).getTime() - this.startOfUtcDay(startDate).getTime()) / 86_400_000);
    return gapDays > this.readPositiveNumber(process.env.MARKET_DATA_EXCHANGE_EOD_FALLBACK_EARLIEST_GAP_DAYS, 14);
  }

  private exchangeEodFallbackDates(startDate: Date, endDate: Date): Date[] {
    const maxDays = Math.max(1, Math.min(this.readPositiveNumber(process.env.MARKET_DATA_EXCHANGE_EOD_FALLBACK_MAX_DAYS_PER_SYMBOL, 20), 90));
    const dates: Date[] = [];
    const cursor = this.startOfUtcDay(startDate);
    const stop = this.startOfUtcDay(endDate);
    while (cursor <= stop && dates.length < maxDays) {
      dates.push(new Date(cursor));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return dates;
  }

  private exchangeEodTargetSymbols(input: { stock: any; symbol: string; providerSymbol: string }): Set<string> {
    const candidates = [
      input.symbol,
      input.providerSymbol,
      input.stock?.symbol,
      input.stock?.providerSymbol,
      input.stock?.sourceSymbol,
      input.stock?.displaySymbol,
    ].filter(Boolean).map((value) => String(value).trim().toUpperCase());
    const withNseSuffix = candidates.flatMap((value) => {
      const base = this.baseSymbolFromProviderSymbol(value);
      return [value, base, `${base}.NS`];
    });
    return new Set(withNseSuffix.filter(Boolean));
  }

  private async downloadOfficialExchangeText(url: string): Promise<string> {
    this.validateConfiguredCatalogUrl(url);
    const maxBytes = Math.max(100_000, Math.min(this.readPositiveNumber(process.env.MARKET_DATA_EXCHANGE_EOD_MAX_DOWNLOAD_BYTES, 15_000_000), 50_000_000));
    const timeoutMs = Math.max(1_000, Math.min(this.readPositiveNumber(process.env.MARKET_DATA_EXCHANGE_EOD_TIMEOUT_MS, 20_000), 120_000));
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          accept: 'text/csv, text/plain, application/zip, application/octet-stream, */*',
          'accept-language': 'en-US,en;q=0.9',
          'user-agent': 'investment-scanner-market-data-foundation/1.0',
        },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const contentLength = response.headers.get('content-length');
      if (contentLength && Number(contentLength) > maxBytes) throw new Error('download exceeds configured max size');
      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.length > maxBytes) throw new Error('download exceeds configured max size');
      if (url.toLowerCase().endsWith('.zip') || this.isZipBuffer(buffer)) {
        return this.extractFirstCsvFromZip(buffer, url, maxBytes);
      }
      return buffer.toString('utf8');
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') throw new Error('download timed out');
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private isZipBuffer(buffer: Buffer): boolean {
    return buffer.length >= 4 && buffer.readUInt32LE(0) === 0x04034b50;
  }

  private extractFirstCsvFromZip(buffer: Buffer, sourceUrl: string, maxBytes: number): string {
    const eocdOffset = this.findZipEndOfCentralDirectory(buffer);
    if (eocdOffset < 0) throw new Error('zip end-of-central-directory was not found');
    const totalEntries = buffer.readUInt16LE(eocdOffset + 10);
    let cursor = buffer.readUInt32LE(eocdOffset + 16);

    for (let index = 0; index < totalEntries; index += 1) {
      if (cursor + 46 > buffer.length || buffer.readUInt32LE(cursor) !== 0x02014b50) {
        throw new Error('zip central directory is malformed');
      }
      const compressionMethod = buffer.readUInt16LE(cursor + 10);
      const compressedSize = buffer.readUInt32LE(cursor + 20);
      const uncompressedSize = buffer.readUInt32LE(cursor + 24);
      const fileNameLength = buffer.readUInt16LE(cursor + 28);
      const extraLength = buffer.readUInt16LE(cursor + 30);
      const commentLength = buffer.readUInt16LE(cursor + 32);
      const localHeaderOffset = buffer.readUInt32LE(cursor + 42);
      const fileName = buffer.subarray(cursor + 46, cursor + 46 + fileNameLength).toString('utf8');

      if (fileName.toLowerCase().endsWith('.csv') && !fileName.endsWith('/')) {
        if (uncompressedSize > maxBytes) throw new Error(`${fileName} exceeds configured max size`);
        const csvBuffer = this.extractZipEntry(buffer, {
          fileName,
          compressionMethod,
          compressedSize,
          localHeaderOffset,
          sourceUrl,
        });
        if (csvBuffer.length > maxBytes) throw new Error(`${fileName} exceeds configured max size`);
        return csvBuffer.toString('utf8');
      }

      cursor += 46 + fileNameLength + extraLength + commentLength;
    }

    throw new Error(`no CSV entry found in zip ${sourceUrl}`);
  }

  private extractZipEntry(buffer: Buffer, entry: {
    fileName: string;
    compressionMethod: number;
    compressedSize: number;
    localHeaderOffset: number;
    sourceUrl: string;
  }): Buffer {
    const localOffset = entry.localHeaderOffset;
    if (localOffset + 30 > buffer.length || buffer.readUInt32LE(localOffset) !== 0x04034b50) {
      throw new Error(`zip local header is malformed for ${entry.fileName}`);
    }
    const fileNameLength = buffer.readUInt16LE(localOffset + 26);
    const extraLength = buffer.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + fileNameLength + extraLength;
    const dataEnd = dataStart + entry.compressedSize;
    if (dataEnd > buffer.length) throw new Error(`zip entry exceeds archive bounds for ${entry.fileName}`);
    const compressed = buffer.subarray(dataStart, dataEnd);
    if (entry.compressionMethod === 0) return compressed;
    if (entry.compressionMethod === 8) return inflateRawSync(compressed);
    throw new Error(`unsupported zip compression ${entry.compressionMethod} for ${entry.fileName} from ${entry.sourceUrl}`);
  }

  private findZipEndOfCentralDirectory(buffer: Buffer): number {
    const minOffset = Math.max(0, buffer.length - 65_557);
    for (let offset = buffer.length - 22; offset >= minOffset; offset -= 1) {
      if (buffer.readUInt32LE(offset) === 0x06054b50) return offset;
    }
    return -1;
  }

  private mergeHistoricalPriceRows(prices: HistoricalPrice[]): HistoricalPrice[] {
    const byKey = new Map<string, HistoricalPrice>();
    for (const price of prices) {
      byKey.set(`${price.symbol}|${this.startOfUtcDay(price.date).toISOString()}`, {
        ...price,
        date: this.startOfUtcDay(price.date),
      });
    }
    return [...byKey.values()].sort((left, right) => left.date.getTime() - right.date.getTime());
  }

  private async eachWithConcurrency<T>(items: T[], concurrency: number, worker: (item: T) => Promise<void>) {
    let index = 0;
    const workerCount = Math.max(1, Math.min(concurrency, items.length));
    await Promise.all(Array.from({ length: workerCount }, async () => {
      while (index < items.length) {
        const current = items[index];
        index += 1;
        await worker(current);
      }
    }));
  }

  private exchangeEodFallbackConcurrency(): number {
    return Math.max(1, Math.min(this.readPositiveNumber(process.env.MARKET_DATA_EXCHANGE_EOD_FALLBACK_CONCURRENCY, 4), 8));
  }

  private startOfUtcDay(date: Date): Date {
    const value = new Date(date);
    value.setUTCHours(0, 0, 0, 0);
    return value;
  }

  private normalizeExchangeTradingDate(value: Date | string): Date {
    const date = value instanceof Date
      ? value
      : new Date(`${String(value).slice(0, 10)}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) {
      throw new Error('tradingDate must be a valid exchange trading date.');
    }
    return this.startOfUtcDay(date);
  }

  async syncV1(request: V1IngestionRequest): Promise<V1SyncResult> {
    await this.throttleIngestion();

    const errors: string[] = [];
    let stock = request.instrumentId ? await this.repository.findStockById(request.instrumentId) : null;
    let symbol = stock?.symbol || request.symbol?.trim().toUpperCase();

    if (!symbol) {
      return { success: false, instrument: null, message: 'symbol or instrumentId is required', errors: ['symbol or instrumentId is required'] };
    }

    if (!stock) {
      const existing = await this.repository.findStockBySymbol(symbol);
      if (existing) {
        stock = existing;
      } else {
        const searchResults = await this.marketDataProvider.search(symbol).catch((error) => {
          errors.push(`External search failed: ${error instanceof Error ? error.message : 'unknown error'}`);
          return [] as SearchResult[];
        });
        const match = searchResults.find((result) => result.symbol === symbol) || searchResults[0];
        const regionInfo = this.marketDataProvider.inferRegion(symbol);
        stock = await this.create({
          symbol,
          name: request.company_name || match?.name || symbol,
        region: request.region || regionInfo.region || 'US',
          exchange: request.exchange || match?.exchange || regionInfo.exchange || 'UNKNOWN',
          country: this.defaultCountryForRegion(request.region || regionInfo.region),
          currency: request.currency || this.defaultCurrencyForRegion(request.region || regionInfo.region),
          assetType: this.normalizeAssetType(request.asset_type || match?.type || 'STOCK'),
        }, false);
      }
    }

    let pricesStored = false;
    let syncSummary: SyncSummary | undefined;
    try {
      const masterData = await this.marketDataProvider.fetchCompanyMasterData(stock.providerSymbol || stock.symbol).catch(() => null);
      if (masterData) {
        const normalizedAssetType = this.normalizeAssetType(request.asset_type || masterData.assetType || stock.assetType);
        const exchange = request.exchange || masterData.exchange || stock.exchange || undefined;
        const region = stock.region || request.region || this.marketDataProvider.inferRegion(stock.symbol).region;
        stock = await this.repository.updateCompanyMasterData(stock.id, {
          name: masterData.companyName || stock.name,
          region,
          exchange,
          country: masterData.country || this.defaultCountryForInstrument(stock.symbol, exchange, region),
          sector: masterData.sector,
          industry: masterData.industry,
          currency: request.currency || masterData.currency || this.defaultCurrencyForInstrument(stock.symbol, exchange, region),
          marketCap: masterData.marketCap,
          assetType: normalizedAssetType,
          isDelisted: masterData.isDelisted ?? false,
          ipoDate: masterData.ipoDate,
          isin: request.isin,
        });
      }
    } catch (error) {
      errors.push(`Company master sync failed: ${error instanceof Error ? error.message : 'unknown error'}`);
    }

    try {
      syncSummary = await this.ingestSymbol(stock.symbol, undefined, new Date(), request.fullReload, {
        force: request.force,
        region: stock.region || request.region,
        assetType: stock.assetType || request.asset_type,
      });
      pricesStored = syncSummary.noNewData !== true;
    } catch (error) {
      errors.push(`Price ingestion failed: ${error instanceof Error ? error.message : 'unknown error'}`);
    }

    let fundamentalsAvailable = false;
    let corporateActionsAvailable = false;
    let fundamentalsInserted = 0;
    let fundamentalsUpdated = 0;
    let corporateActionsInserted = 0;
    let corporateActionsUpdated = 0;
    const started = Date.now();

    const [fundamentals, corporateActions] = await Promise.all([
      this.fetchCoreFundamentals(stock.symbol).catch(() => null),
      this.fetchCorporateActions(stock.symbol).catch(() => []),
    ]);
    if (fundamentals) {
      await this.repository.upsertFundamentals(stock.id, fundamentals).then(() => {
        fundamentalsAvailable = true;
        fundamentalsUpdated = 1; // Since upsert is idempotent, we count it as updated for simplicity or check if it was new.
      }).catch((error) => {
        errors.push(`Fundamentals persistence failed: ${error instanceof Error ? error.message : 'unknown error'}`);
      });
    }
    if (corporateActions.length > 0) {
      await this.repository.upsertCorporateActions(stock.id, corporateActions).then((ops) => {
        corporateActionsAvailable = true;
        corporateActionsUpdated = ops.length;
      }).catch((error) => {
        errors.push(`Corporate action persistence failed: ${error instanceof Error ? error.message : 'unknown error'}`);
      });
    }

    return {
      success: errors.length === 0 || pricesStored,
      instrument: this.toV1Instrument(stock, {
        symbol: stock.symbol,
        company_name: stock.name,
        exchange: stock.exchange || request.exchange || 'UNKNOWN',
        currency: request.currency || this.defaultCurrencyForRegion(stock.region),
        asset_type: this.normalizeAssetType(request.asset_type || stock.assetType || 'STOCK'),
        isin: request.isin,
      }),
      message: syncSummary?.noNewData
        ? 'No new data to ingest. Latest daily candles already checked recently.'
        : errors.length > 0 ? 'Sync completed with partial data' : 'Sync completed',
      pricesStored,
      fundamentalsAvailable,
      corporateActionsAvailable,
      syncSummary,
      errors: errors.length > 0 ? errors : undefined,
      
      instrumentsReceived: 1,
      instrumentsInserted: !request.instrumentId && !stock.lastSuccessfulDataLoadTimestamp ? 1 : 0,
      instrumentsUpdated: 1,
      instrumentsSkipped: 0,

      priceRowsReceived: syncSummary?.rowsReceived || 0,
      priceRowsInserted: syncSummary?.rowsInserted || 0,
      priceRowsUpdated: syncSummary?.rowsUpdated || 0,
      priceRowsSkipped: syncSummary?.rowsSkipped || 0,

      fundamentalsReceived: fundamentals ? 1 : 0,
      fundamentalsInserted,
      fundamentalsUpdated,
      fundamentalsSkipped: 0,

      corporateActionsReceived: corporateActions.length,
      corporateActionsInserted,
      corporateActionsUpdated,
      corporateActionsSkipped: 0,

      fxRatesReceived: 0,
      fxRatesInserted: 0,
      fxRatesUpdated: 0,
      fxRatesSkipped: 0,

      warningCount: (syncSummary?.warningCount || 0) + errors.length,
      warnings: [...(syncSummary?.warnings || []), ...errors].slice(0, 10),
      durationMs: Date.now() - started,
      duplicateProviderRowsSkipped: 0,
      malformedRowsSkipped: syncSummary?.rowsSkipped || 0,
      noNewData: syncSummary?.noNewData,
      skippedBeforeFetchCount: syncSummary?.skippedBeforeFetchCount,
      providerFetchSkippedCount: syncSummary?.providerFetchSkippedCount,
      skippedReasonCounts: syncSummary?.skippedReasonCounts,
      skippedReasons: syncSummary?.skippedReasons,
      lastCheckedAt: syncSummary?.lastCheckedAt,
      nextEligibleSyncAt: syncSummary?.nextEligibleSyncAt,
    };
  }

  async ingestSymbols(symbols: string[], startDate?: Date, endDate?: Date): Promise<void> {
    for (const symbol of symbols) {
      try {
        await this.ingestSymbol(symbol, startDate, endDate);
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Ingestion failed for ${symbol}:`, error);
      }
    }
  }

  async startCatalogSyncRun(request: CatalogSyncRunRequest = {}): Promise<CatalogSyncRunStatusResponse> {
    const region = this.normalizeRunRegion(request.region);
    const assetType = this.normalizeAssetType(request.assetType || 'STOCK');
    const activeKey = this.catalogSyncActiveKey(region, assetType);
    const activeRunId = MarketDataFoundationService.activeCatalogSyncRuns.get(activeKey);
    if (activeRunId) {
      const activeRun = MarketDataFoundationService.catalogSyncRuns.get(activeRunId);
      if (activeRun && !activeRun.completedAt) {
        return this.toCatalogSyncRunResponse(activeRun, {
          alreadyRunning: true,
          message: `A catalog sync is already running for ${region}/${assetType}.`,
        });
      }
      MarketDataFoundationService.activeCatalogSyncRuns.delete(activeKey);
    }

    const now = new Date();
    const clamped = this.normalizeCatalogSyncRunRequest(request);
    const tradingDate = tradingDateForRegion(region, now) || now.toISOString().slice(0, 10);
    const targetTradingDate = latestCompletedTradingDateForRegion(region, now) || tradingDate;
    const force = request.force === true || request.fullReload === true;
    const totalCount = await this.countCatalogSyncTasks({ region, assetType }, {
      force,
      targetTradingDate,
    });
    const runId = this.createCatalogSyncRunId(now);
    const warnings = [...clamped.warnings];
    const run: CatalogSyncRunRecord = {
      success: true,
      runId,
      status: 'RUNNING',
      message: 'Catalog sync started.',
      region,
      assetType,
      scopeType: 'CATALOG',
      batchSize: clamped.batchSize,
      workerCount: clamped.workerCount,
      workerConcurrency: clamped.workerConcurrency,
      delayBetweenBatchesMs: clamped.delayBetweenBatchesMs,
      maxBatches: clamped.maxBatches,
      totalCount,
      processedCount: 0,
      currentBatchNumber: 0,
      batchesPlanned: Math.min(clamped.maxBatches, Math.ceil(totalCount / clamped.batchSize)),
      batchesExecuted: 0,
      succeededCount: 0,
      failedCount: 0,
      skippedCount: 0,
      noOpCount: 0,
      rowsReceived: 0,
      rowsInserted: 0,
      rowsUpdated: 0,
      rowsSkipped: 0,
      warningCount: warnings.length,
      warnings,
      recentErrors: [],
      hasMore: totalCount > 0,
      percentComplete: totalCount > 0 ? 0 : 100,
      startedAt: now.toISOString(),
      updatedAt: now.toISOString(),
      completedAt: null,
      statusUrl: `/api/market-data-foundation/stocks/sync-runs/${runId}`,
      activeKey,
      cancelRequested: false,
      force,
      fullReload: request.fullReload === true,
      tradingDate,
      targetTradingDate,
      processedTaskIds: new Set<string>(),
    };

    MarketDataFoundationService.catalogSyncRuns.set(runId, run);
    MarketDataFoundationService.activeCatalogSyncRuns.set(activeKey, runId);
    this.pruneCatalogSyncRuns();

    setTimeout(() => {
      void this.processCatalogSyncRun(runId);
    }, 0);

    return this.toCatalogSyncRunResponse(run);
  }

  getCatalogSyncRun(runId: string): CatalogSyncRunStatusResponse | null {
    const run = MarketDataFoundationService.catalogSyncRuns.get(runId);
    return run ? this.toCatalogSyncRunResponse(run) : null;
  }

  cancelCatalogSyncRun(runId: string): CatalogSyncRunStatusResponse | null {
    const run = MarketDataFoundationService.catalogSyncRuns.get(runId);
    if (!run) return null;
    if (this.isCatalogSyncTerminal(run.status)) {
      return this.toCatalogSyncRunResponse(run);
    }
    run.cancelRequested = true;
    run.status = 'PARTIAL';
    run.message = 'Cancellation requested. The current batch will finish before the run stops.';
    this.touchCatalogSyncRun(run);
    return this.toCatalogSyncRunResponse(run);
  }

  private async processCatalogSyncRun(runId: string): Promise<void> {
    const run = MarketDataFoundationService.catalogSyncRuns.get(runId);
    if (!run) return;

    try {
      const now = new Date();
      if (!run.force) {
        const gate = await this.evaluateSyncFreshnessGate({
          region: run.region,
          assetType: run.assetType,
          scopeType: 'CATALOG',
          scopeKey: run.region,
          tradingDate: run.tradingDate,
          now,
          force: false,
          cooldownMinutes: this.manualSyncCooldownMinutes,
        });
        if (gate.shouldSkip) {
          const staleCatchUpAllowed = await this.enableCatalogStaleCatchUpIfNeeded(run, now);
          if (staleCatchUpAllowed) {
            run.providerEndDate = this.endOfTradingDateUtc(run.targetTradingDate);
          } else {
            run.processedCount = run.totalCount;
            run.skippedCount = run.totalCount;
            run.hasMore = false;
            run.percentComplete = 100;
            run.status = 'COMPLETED';
            run.message = gate.message;
            this.addCatalogSyncWarning(run, gate.message);
            await this.persistCatalogSyncRunState(run, gate.reason === 'FINAL_CANDLE_CONFIRMED' ? 'FINAL_CONFIRMED' : 'SYNCED', now);
            this.completeCatalogSyncRun(run);
            return;
          }
        } else {
          run.providerEndDate = gate.providerEndDate;
        }
      }

      await this.applyOfficialEodBulkForCatalogRun(run);

      while (run.batchesExecuted < run.maxBatches) {
        if (run.cancelRequested) {
          run.status = 'CANCELED';
          run.message = 'Catalog sync canceled after the current batch.';
          run.hasMore = run.processedCount < run.totalCount;
          await this.persistCatalogSyncRunState(run, 'FAILED', new Date());
          this.completeCatalogSyncRun(run);
          return;
        }

        const tasks = await this.listCatalogSyncTasks(run);
        if (tasks.length === 0) {
          run.hasMore = false;
          run.percentComplete = 100;
          run.status = run.failedCount > 0 ? 'PARTIAL' : 'COMPLETED';
          run.message = run.failedCount > 0
            ? 'Catalog sync completed with errors.'
            : 'Catalog sync completed.';
          await this.persistCatalogSyncRunState(run, run.failedCount > 0 ? 'FAILED' : 'SYNCED', new Date());
          this.completeCatalogSyncRun(run);
          return;
        }

        run.currentBatchNumber = run.batchesExecuted + 1;
        run.message = `Processing batch ${run.currentBatchNumber} of ${run.batchesPlanned || run.maxBatches}.`;
        this.touchCatalogSyncRun(run);

        const processedBeforeBatch = run.processedCount;
        const results = await this.processCatalogSyncBatch(run, tasks);
        run.batchesExecuted += 1;
        for (const task of tasks) {
          run.processedTaskIds.add(task.id);
        }
        this.applyCatalogSyncBatchResults(run, results);
        run.hasMore = run.processedCount < run.totalCount;
        run.percentComplete = this.catalogSyncPercent(run);
        this.touchCatalogSyncRun(run);

        if (run.processedCount === processedBeforeBatch && run.hasMore) {
          this.addCatalogSyncWarning(run, 'Catalog sync made no progress while more eligible rows appeared to remain.');
          run.status = 'PARTIAL';
          run.message = 'Catalog sync stopped because the last batch made no progress.';
          await this.persistCatalogSyncRunState(run, 'FAILED', new Date());
          this.completeCatalogSyncRun(run);
          return;
        }

        if (run.cancelRequested) {
          run.status = 'CANCELED';
          run.message = 'Catalog sync canceled after the current batch.';
          run.hasMore = run.processedCount < run.totalCount;
          await this.persistCatalogSyncRunState(run, 'FAILED', new Date());
          this.completeCatalogSyncRun(run);
          return;
        }

        if (!run.hasMore) {
          run.status = run.failedCount > 0 ? 'PARTIAL' : 'COMPLETED';
          run.message = run.failedCount > 0
            ? 'Catalog sync completed with errors.'
            : 'Catalog sync completed.';
          await this.persistCatalogSyncRunState(run, run.failedCount > 0 ? 'FAILED' : 'SYNCED', new Date());
          this.completeCatalogSyncRun(run);
          return;
        }

        if (run.batchesExecuted < run.maxBatches) {
          await new Promise(resolve => setTimeout(resolve, run.delayBetweenBatchesMs));
        }
      }

      run.hasMore = run.processedCount < run.totalCount;
      run.status = run.hasMore || run.failedCount > 0 ? 'PARTIAL' : 'COMPLETED';
      run.message = run.hasMore
        ? 'Catalog sync reached the maximum batch limit. More eligible rows remain.'
        : 'Catalog sync completed within the maximum batch limit.';
      if (run.hasMore) {
        this.addCatalogSyncWarning(run, 'Max batches reached before the catalog sync queue drained.');
      }
      await this.persistCatalogSyncRunState(run, run.failedCount > 0 || run.hasMore ? 'FAILED' : 'SYNCED', new Date());
      this.completeCatalogSyncRun(run);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown catalog sync failure';
      this.addCatalogSyncError(run, undefined, message);
      run.status = run.batchesExecuted === 0 && run.processedCount === 0 ? 'FAILED' : 'PARTIAL';
      run.message = `Catalog sync failed: ${message}`;
      await this.persistCatalogSyncRunState(run, 'FAILED', new Date()).catch(() => null);
      this.completeCatalogSyncRun(run);
    }
  }

  private async applyOfficialEodBulkForCatalogRun(run: CatalogSyncRunRecord): Promise<void> {
    if (run.force || run.fullReload) return;
    if (!this.officialNseEodBulkEnabled()) return;
    const tasks = await this.listStaleCatalogSyncTasks(
      { region: run.region, assetType: run.assetType },
      run.targetTradingDate,
      undefined,
      Array.from(run.processedTaskIds)
    );
    if (tasks.length === 0) return;

    run.currentBatchNumber = run.batchesExecuted + 1;
    run.message = `Processing official NSE EOD bulk file for ${tasks.length} stale instruments.`;
    this.touchCatalogSyncRun(run);

    const officialBulk = await this.tryOfficialNseEodBulkLatestCandle({
      region: run.region,
      assetType: run.assetType,
      targetTradingDate: run.targetTradingDate,
      tasks,
    });
    for (const warning of officialBulk.evidence.warnings || []) {
      this.addCatalogSyncWarning(run, warning);
    }
    if (officialBulk.evidence.fallbackReason && !['OFFICIAL_EOD_DISABLED', 'OFFICIAL_EOD_NO_TASKS'].includes(officialBulk.evidence.fallbackReason)) {
      this.addCatalogSyncWarning(run, `Official NSE EOD bulk fallback: ${officialBulk.evidence.fallbackReason}`);
    }
    if (officialBulk.matchedTaskIds.size === 0) return;

    const byId = new Map(tasks.map((task) => [task.id, task]));
    const results: Array<{ task: StockSyncTask; success: boolean; summary?: SyncSummary; message: string }> = [];
    for (const taskId of officialBulk.matchedTaskIds) {
      const task = byId.get(taskId);
      const summary = officialBulk.summaryByTaskId.get(taskId);
      if (!task || !summary) continue;
      run.processedTaskIds.add(task.id);
      results.push({
        task,
        success: true,
        summary,
        message: `Official NSE EOD bulk sync completed: ${summary.rowsInserted} inserted, ${summary.rowsUpdated} updated, ${summary.rowsNoOp || 0} no-op`,
      });
    }
    if (results.length === 0) return;

    run.batchesExecuted += 1;
    this.applyCatalogSyncBatchResults(run, results);
    run.hasMore = run.processedCount < run.totalCount;
    run.percentComplete = this.catalogSyncPercent(run);
    this.touchCatalogSyncRun(run);
  }

  private async processCatalogSyncBatch(run: CatalogSyncRunRecord, tasks: StockSyncTask[]) {
    const chunks = this.chunkArray(tasks, Math.ceil(tasks.length / run.workerCount));
    const workerResults = await Promise.all(chunks.map((chunk) =>
      this.processCatalogSyncWorkerChunk(run, chunk, run.workerConcurrency)
    ));
    return workerResults.flat();
  }

  private async processCatalogSyncWorkerChunk(run: CatalogSyncRunRecord, tasks: StockSyncTask[], concurrency: number) {
    const results: Array<{ task: StockSyncTask; success: boolean; summary?: SyncSummary; message: string }> = [];
    for (const chunk of this.chunkArray(tasks, concurrency)) {
      const chunkResults = await Promise.all(chunk.map(async (task) => {
        try {
          const startDate = this.catalogSyncTaskStartDate(run, task);
          const summary = await this.ingestSymbol(task.symbol, startDate, run.providerEndDate || new Date(), run.fullReload, {
            force: run.force,
            region: run.region,
            assetType: run.assetType,
            skipFreshnessGate: true,
          });
          return {
            task,
            success: true,
            summary,
            message: summary.noNewData
              ? `No new data to ingest: ${summary.skippedReasons?.join(', ') || 'skipped'}`
              : `Sync completed: ${summary.rowsInserted} inserted, ${summary.rowsUpdated} updated, ${summary.rowsSkipped} skipped`,
          };
        } catch (error) {
          return {
            task,
            success: false,
            message: error instanceof Error ? error.message : 'Unknown provider sync failure',
          };
        }
      }));
      results.push(...chunkResults);
    }
    return results;
  }

  private catalogSyncTaskStartDate(
    run: Pick<CatalogSyncRunRecord, 'force' | 'fullReload' | 'providerEndDate'>,
    task: StockSyncTask
  ): Date | undefined {
    if (run.force || run.fullReload || !run.providerEndDate) return undefined;

    if (!Object.prototype.hasOwnProperty.call(task, 'latestStoredTimestamp')) {
      return undefined;
    }

    if (!task.latestStoredTimestamp) {
      return this.defaultBackfillStartDate();
    }

    const latestStored = task.latestStoredTimestamp instanceof Date
      ? task.latestStoredTimestamp
      : new Date(task.latestStoredTimestamp);
    if (Number.isNaN(latestStored.getTime())) {
      return this.defaultBackfillStartDate();
    }

    const startDate = this.startOfUtcDay(latestStored);
    startDate.setUTCDate(startDate.getUTCDate() - 3);
    return startDate;
  }

  private normalizeCatalogSyncRunRequest(request: CatalogSyncRunRequest) {
    const warnings: string[] = [];
    const batchSize = this.clampCatalogSyncNumber(request.batchSize, 25, 1, 50, 'batchSize', warnings);
    const workerCount = this.clampCatalogSyncNumber(request.workerCount, 1, 1, 2, 'workerCount', warnings);
    const workerConcurrency = this.clampCatalogSyncNumber(request.workerConcurrency, 2, 1, 3, 'workerConcurrency', warnings);
    const delayBetweenBatchesMs = this.clampCatalogSyncNumber(request.delayBetweenBatchesMs, 3000, 1000, 30000, 'delayBetweenBatchesMs', warnings);
    const maxBatches = this.clampCatalogSyncNumber(request.maxBatches, 20, 1, 100, 'maxBatches', warnings);
    return { batchSize, workerCount, workerConcurrency, delayBetweenBatchesMs, maxBatches, warnings };
  }

  private clampCatalogSyncNumber(
    value: number | undefined,
    fallback: number,
    min: number,
    max: number,
    field: string,
    warnings: string[]
  ): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    const integer = Math.floor(parsed);
    const clamped = Math.max(min, Math.min(max, integer));
    if (clamped !== integer) {
      warnings.push(`${field} was capped to ${clamped}.`);
    }
    return clamped;
  }

  private normalizeRunRegion(value?: string | null): string {
    const normalized = value?.trim().toUpperCase();
    if (!normalized || normalized === 'ALL') return 'GLOBAL';
    if (['IN', 'US', 'EU', 'GLOBAL'].includes(normalized)) return normalized;
    return normalized;
  }

  private catalogSyncActiveKey(region: string, assetType: string): string {
    return `${region}:${assetType}:CATALOG`;
  }

  private createCatalogSyncRunId(now: Date): string {
    const stamp = now.toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
    const suffix = Math.random().toString(36).slice(2, 8);
    return `catalog-sync-${stamp}-${suffix}`;
  }

  private isCatalogSyncTerminal(status: CatalogSyncRunStatus): boolean {
    return ['PARTIAL', 'COMPLETED', 'FAILED', 'CANCELED'].includes(status);
  }

  private async countActiveStockSyncTasks(options: Pick<PaginationOptions, 'region' | 'assetType'>): Promise<number> {
    const repository = this.repository as any;
    if (typeof repository.countActiveStockSyncTasks === 'function') {
      return repository.countActiveStockSyncTasks(options);
    }
    if (typeof repository.listActiveStockSyncTasks === 'function') {
      const tasks = await repository.listActiveStockSyncTasks(options);
      return Array.isArray(tasks) ? tasks.length : 0;
    }
    if (typeof repository.instrumentCount === 'function') {
      return repository.instrumentCount(options);
    }
    return 0;
  }

  private async countCatalogSyncTasks(
    options: Pick<PaginationOptions, 'region' | 'assetType'>,
    config: { force: boolean; targetTradingDate: string }
  ): Promise<number> {
    const repository = this.repository as any;
    if (!config.force && typeof repository.countStaleActiveStockSyncTasks === 'function') {
      return repository.countStaleActiveStockSyncTasks(options, config.targetTradingDate);
    }
    return this.countActiveStockSyncTasks(options);
  }

  private async countStaleCatalogSyncTasks(
    options: Pick<PaginationOptions, 'region' | 'assetType'>,
    targetTradingDate: string
  ): Promise<number> {
    const repository = this.repository as any;
    if (typeof repository.countStaleActiveStockSyncTasks !== 'function') return 0;
    return repository.countStaleActiveStockSyncTasks(options, targetTradingDate);
  }

  private async listCatalogSyncTasks(run: CatalogSyncRunRecord): Promise<StockSyncTask[]> {
    const repository = this.repository as any;
    const options = { region: run.region, assetType: run.assetType };
    const excludeIds = Array.from(run.processedTaskIds);
    if (!run.force && !run.fullReload && typeof repository.listStaleActiveStockSyncTasks === 'function') {
      return repository.listStaleActiveStockSyncTasks(options, run.targetTradingDate, run.batchSize, excludeIds);
    }
    return this.repository.listActiveStockSyncTasks(options, run.batchSize, excludeIds);
  }

  private async listStaleCatalogSyncTasks(
    options: Pick<PaginationOptions, 'region' | 'assetType'>,
    targetTradingDate: string,
    batchSize?: number,
    excludeIds: string[] = []
  ): Promise<StockSyncTask[]> {
    const repository = this.repository as any;
    if (typeof repository.listStaleActiveStockSyncTasks === 'function') {
      return repository.listStaleActiveStockSyncTasks(options, targetTradingDate, batchSize, excludeIds);
    }
    return this.repository.listActiveStockSyncTasks(options, batchSize, excludeIds);
  }

  private async enableCatalogStaleCatchUpIfNeeded(run: CatalogSyncRunRecord, now: Date): Promise<boolean> {
    if (run.force || run.fullReload) return false;
    const staleCount = await this.countStaleCatalogSyncTasks({ region: run.region, assetType: run.assetType }, run.targetTradingDate);
    if (staleCount <= 0) return false;

    run.totalCount = staleCount;
    run.hasMore = true;
    run.percentComplete = this.catalogSyncPercent(run);
    run.batchesPlanned = Math.min(run.maxBatches, Math.ceil(staleCount / run.batchSize));
    run.message = `Catalog freshness is current at region level, but ${staleCount} instruments still need latest completed candle ${run.targetTradingDate}.`;
    this.addCatalogSyncWarning(run, run.message);
    run.updatedAt = now.toISOString();
    return true;
  }

  private applyCatalogSyncBatchResults(
    run: CatalogSyncRunRecord,
    results: Array<{ task: StockSyncTask; success: boolean; summary?: SyncSummary; message: string }>
  ): void {
    for (const result of results) {
      run.processedCount += 1;
      if (!result.success) {
        run.failedCount += 1;
        this.addCatalogSyncError(run, result.task.symbol, result.message);
        continue;
      }

      run.succeededCount += 1;
      const summary = result.summary;
      if (!summary) continue;
      run.rowsReceived += summary.rowsReceived || 0;
      run.rowsInserted += summary.rowsInserted || 0;
      run.rowsUpdated += summary.rowsUpdated || 0;
      run.rowsSkipped += summary.rowsSkipped || 0;
      run.noOpCount += summary.rowsNoOp || 0;
      if (summary.noNewData || (summary.providerFetchSkippedCount || 0) > 0) {
        run.skippedCount += 1;
      }
      if ((summary.warningCount || 0) > 0) {
        run.warningCount += summary.warningCount || 0;
        for (const warning of summary.warnings || []) {
          this.addCatalogSyncWarning(run, `${result.task.symbol}: ${warning}`, false);
        }
      }
    }
  }

  private addCatalogSyncWarning(run: CatalogSyncRunRecord, warning: string, incrementCount = true): void {
    if (incrementCount) run.warningCount += 1;
    run.warnings.push(warning);
    if (run.warnings.length > 20) {
      run.warnings.splice(0, run.warnings.length - 20);
    }
  }

  private addCatalogSyncError(run: CatalogSyncRunRecord, symbol: string | undefined, message: string): void {
    run.recentErrors.push({ symbol, message, timestamp: new Date().toISOString() });
    if (run.recentErrors.length > 20) {
      run.recentErrors.splice(0, run.recentErrors.length - 20);
    }
  }

  private catalogSyncPercent(run: CatalogSyncRunRecord): number {
    if (run.totalCount <= 0) return 100;
    return Math.min(100, Number(((run.processedCount / run.totalCount) * 100).toFixed(1)));
  }

  private touchCatalogSyncRun(run: CatalogSyncRunRecord): void {
    run.updatedAt = new Date().toISOString();
  }

  private completeCatalogSyncRun(run: CatalogSyncRunRecord): void {
    const now = new Date().toISOString();
    run.percentComplete = this.catalogSyncPercent(run);
    run.updatedAt = now;
    run.completedAt = now;
    MarketDataFoundationService.activeCatalogSyncRuns.delete(run.activeKey);
    this.pruneCatalogSyncRuns();
  }

  private toCatalogSyncRunResponse(
    run: CatalogSyncRunRecord,
    overrides: Partial<CatalogSyncRunStatusResponse> = {}
  ): CatalogSyncRunStatusResponse {
    return {
      success: true,
      runId: run.runId,
      status: run.status,
      message: run.message,
      region: run.region,
      assetType: run.assetType,
      scopeType: 'CATALOG',
      batchSize: run.batchSize,
      workerCount: run.workerCount,
      workerConcurrency: run.workerConcurrency,
      delayBetweenBatchesMs: run.delayBetweenBatchesMs,
      maxBatches: run.maxBatches,
      totalCount: run.totalCount,
      processedCount: run.processedCount,
      currentBatchNumber: run.currentBatchNumber,
      batchesPlanned: run.batchesPlanned,
      batchesExecuted: run.batchesExecuted,
      succeededCount: run.succeededCount,
      failedCount: run.failedCount,
      skippedCount: run.skippedCount,
      noOpCount: run.noOpCount,
      rowsReceived: run.rowsReceived,
      rowsInserted: run.rowsInserted,
      rowsUpdated: run.rowsUpdated,
      rowsSkipped: run.rowsSkipped,
      warningCount: run.warningCount,
      warnings: [...run.warnings],
      recentErrors: [...run.recentErrors],
      hasMore: run.hasMore,
      percentComplete: run.percentComplete,
      startedAt: run.startedAt,
      updatedAt: run.updatedAt,
      completedAt: run.completedAt,
      statusUrl: run.statusUrl,
      cancelRequested: run.cancelRequested,
      ...overrides,
    };
  }

  private async processPriceBackfillRun(runId: string): Promise<void> {
    const run = MarketDataFoundationService.priceBackfillRuns.get(runId);
    if (!run) return;

    try {
      if (run.totalCount <= 0) {
        run.status = 'COMPLETED';
        run.message = 'Price backfill queue is already empty.';
        run.hasMore = false;
        run.percentComplete = 100;
        this.completePriceBackfillRun(run);
        return;
      }

      while (run.batchesExecuted < run.maxBatches) {
        if (run.cancelRequested) {
          run.status = 'CANCELED';
          run.message = 'Price backfill canceled after the current batch.';
          this.completePriceBackfillRun(run);
          return;
        }

        run.currentBatchNumber = run.batchesExecuted + 1;
        run.message = `Processing price backfill batch ${run.currentBatchNumber} of ${run.batchesPlanned || run.maxBatches}.`;
        this.touchPriceBackfillRun(run);

        const processedBeforeBatch = run.processedCount;
        const summary = await this.backfillPrices({
          region: run.region,
          assetType: run.assetType,
          batchSize: run.batchSize,
          offset: 0,
          workerConcurrency: run.workerConcurrency,
          force: run.force,
          fullReload: run.fullReload,
          policy: run.policy,
          excludeStockIds: Array.from(run.processedStockIds),
        });
        run.batchesExecuted += 1;
        this.applyPriceBackfillBatchSummary(run, summary);
        this.touchPriceBackfillRun(run);

        if (run.cancelRequested) {
          run.status = 'CANCELED';
          run.message = 'Price backfill canceled after the current batch.';
          this.completePriceBackfillRun(run);
          return;
        }

        if (!summary.hasMore) {
          run.hasMore = false;
          run.percentComplete = 100;
          run.status = run.failed > 0 ? 'PARTIAL' : 'COMPLETED';
          run.message = run.failed > 0
            ? 'Price backfill completed with errors.'
            : 'Price backfill completed.';
          this.completePriceBackfillRun(run);
          return;
        }

        if (run.processedCount === processedBeforeBatch) {
          run.status = 'PARTIAL';
          run.hasMore = true;
          run.message = 'Price backfill stopped because the last batch made no progress.';
          this.addPriceBackfillRunWarning(run, 'Last price-backfill batch made no progress while eligible rows remain.');
          this.completePriceBackfillRun(run);
          return;
        }

        await new Promise(resolve => setTimeout(resolve, 500));
      }

      run.status = 'PARTIAL';
      run.hasMore = run.remainingCandidates > 0;
      run.message = run.hasMore
        ? 'Price backfill reached the maximum background batch limit. More eligible rows remain.'
        : 'Price backfill completed within the maximum background batch limit.';
      if (run.hasMore) {
        this.addPriceBackfillRunWarning(run, 'Max batches reached before the price-backfill queue drained.');
      }
      this.completePriceBackfillRun(run);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown price backfill failure';
      this.addPriceBackfillRunError(run, undefined, message);
      run.status = run.batchesExecuted === 0 && run.processedCount === 0 ? 'FAILED' : 'PARTIAL';
      run.message = `Price backfill failed: ${message}`;
      this.completePriceBackfillRun(run);
    }
  }

  private applyPriceBackfillBatchSummary(run: PriceBackfillRunRecord, summary: MarketDataRepairSummary): void {
    run.latestBatch = summary;
    run.processedCount += summary.processedCount || 0;
    run.updated += summary.updated || 0;
    run.skipped += summary.skipped || 0;
    run.failed += summary.failed || 0;
    run.noOp += summary.noOp || 0;
    run.priceRowsReceived += summary.priceRowsReceived || 0;
    run.priceRowsInserted += summary.priceRowsInserted || 0;
    run.priceRowsUpdated += summary.priceRowsUpdated || 0;
    run.priceRowsNoOp += summary.priceRowsNoOp || 0;
    run.zeroRowProviderReturns += summary.zeroRowProviderReturns || 0;
    for (const stockId of summary.processedStockIds || []) {
      run.processedStockIds.add(stockId);
    }
    run.remainingCandidates = summary.remainingCandidates ?? Math.max(0, run.totalCount - run.processedCount);
    run.hasMore = summary.hasMore === true;
    run.percentComplete = this.priceBackfillPercent(run);

    for (const warning of summary.warnings || []) {
      this.addPriceBackfillRunWarning(run, warning);
    }
    if ((summary.failed || 0) > 0) {
      this.addPriceBackfillRunError(run, undefined, `${summary.failed} symbols failed in batch ${run.currentBatchNumber}.`);
    }
  }

  private normalizePriceBackfillRunRequest(request: PriceBackfillRunRequest) {
    const warnings: string[] = [];
    const batchSize = this.clampCatalogSyncNumber(request.batchSize ?? request.limit, 20, 1, 100, 'batchSize', warnings);
    const workerConcurrency = this.clampCatalogSyncNumber(
      request.workerConcurrency,
      this.priceBackfillConcurrency(request),
      1,
      4,
      'workerConcurrency',
      warnings
    );
    const maxBatches = this.clampCatalogSyncNumber(
      request.maxBatches ?? request.maxBatchesPerAction,
      5,
      1,
      500,
      'maxBatches',
      warnings
    );
    return {
      batchSize,
      workerConcurrency,
      maxBatches,
      providerThrottleMs: this.priceBackfillProviderThrottleMs(),
      warnings,
    };
  }

  private priceBackfillActiveKey(region: string, assetType: string): string {
    return `${region}:${assetType}:PRICE_BACKFILL`;
  }

  private createPriceBackfillRunId(now: Date): string {
    const stamp = now.toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
    const suffix = Math.random().toString(36).slice(2, 8);
    return `price-backfill-${stamp}-${suffix}`;
  }

  private priceBackfillPercent(run: PriceBackfillRunRecord): number {
    if (run.totalCount <= 0) return 100;
    const completedByRemaining = Math.max(0, run.totalCount - run.remainingCandidates);
    const completed = Math.max(run.processedCount, completedByRemaining);
    return Math.min(100, Number(((completed / run.totalCount) * 100).toFixed(1)));
  }

  private touchPriceBackfillRun(run: PriceBackfillRunRecord): void {
    run.updatedAt = new Date().toISOString();
    this.enqueuePriceBackfillPipelineSnapshot(run);
  }

  private completePriceBackfillRun(run: PriceBackfillRunRecord): void {
    const now = new Date().toISOString();
    run.percentComplete = this.priceBackfillPercent(run);
    run.updatedAt = now;
    run.completedAt = now;
    MarketDataFoundationService.activePriceBackfillRuns.delete(run.activeKey);
    this.prunePriceBackfillRuns();
    this.enqueuePriceBackfillPipelineSnapshot(run);
  }

  private enqueuePriceBackfillPipelineSnapshot(run: PriceBackfillRunRecord): void {
    const snapshot = this.toPriceBackfillPipelineSnapshot(run);
    const previous = MarketDataFoundationService.priceBackfillPipelineSnapshotChains.get(run.runId) || Promise.resolve();
    const next = previous
      .catch(() => undefined)
      .then(() => this.recordPriceBackfillPipelineSnapshot(snapshot))
      .finally(() => {
        if (MarketDataFoundationService.priceBackfillPipelineSnapshotChains.get(run.runId) === next) {
          MarketDataFoundationService.priceBackfillPipelineSnapshotChains.delete(run.runId);
        }
      });
    MarketDataFoundationService.priceBackfillPipelineSnapshotChains.set(run.runId, next);
  }

  private toPriceBackfillPipelineSnapshot(run: PriceBackfillRunRecord): MarketDataPipelineSnapshotInput {
    return {
      region: run.region,
      assetType: run.assetType,
      timeframe: '1d',
      pipelineKey: 'market-intelligence',
      triggerType: run.triggerType,
      operation: 'PRICE_BACKFILL',
      runId: run.runId,
      status: run.status,
      dataThroughDate: run.latestBatch?.targetEndDate || run.latestBatch?.latestCompletedEodDate || null,
      totalCount: run.totalCount,
      processedCount: run.processedCount,
      succeededCount: Math.max(0, run.updated + run.noOp),
      failedCount: run.failed,
      skippedCount: run.skipped,
      unchangedCount: run.noOp,
      changedInstrumentIds: [...run.processedStockIds],
      batchSize: run.batchSize,
      nextOffset: run.hasMore ? 0 : null,
      hasMore: run.hasMore,
      startedAt: run.startedAt,
      completedAt: run.completedAt,
      warnings: [...run.warnings],
      errors: run.recentErrors.map((entry) => entry.symbol ? `${entry.symbol}: ${entry.message}` : entry.message),
      metadata: {
        sourceRunId: run.runId,
        scopeType: run.scopeType,
        message: run.message,
        currentBatchNumber: run.currentBatchNumber,
        batchesPlanned: run.batchesPlanned,
        batchesExecuted: run.batchesExecuted,
        workerConcurrency: run.workerConcurrency,
        providerThrottleMs: run.providerThrottleMs,
        maxBatches: run.maxBatches,
        percentComplete: run.percentComplete,
        remainingCandidates: run.remainingCandidates,
        priceRowsReceived: run.priceRowsReceived,
        priceRowsInserted: run.priceRowsInserted,
        priceRowsUpdated: run.priceRowsUpdated,
        priceRowsNoOp: run.priceRowsNoOp,
        zeroRowProviderReturns: run.zeroRowProviderReturns,
      },
    };
  }

  private async recordPriceBackfillPipelineSnapshot(snapshot: MarketDataPipelineSnapshotInput): Promise<void> {
    try {
      const recorder = this.pipelineRecorder || await this.createPipelineRecorder();
      await recorder.recordMarketDataStageSnapshot(snapshot);
    } catch (error) {
      console.error('[MarketDataPipelineLedger] failed to record price-backfill snapshot', {
        runId: snapshot.runId,
        region: snapshot.region,
        assetType: snapshot.assetType,
        error: error instanceof Error ? error.message : 'unknown error',
      });
    }
  }

  private async createPipelineRecorder(): Promise<MarketDataPipelineRecorder> {
    const module = await import('../pipeline-orchestration/pipeline-orchestration.service');
    return new module.PipelineOrchestrationService();
  }

  private addPriceBackfillRunWarning(run: PriceBackfillRunRecord, warning: string): void {
    run.warningCount += 1;
    run.warnings.push(warning);
    if (run.warnings.length > 20) {
      run.warnings.splice(0, run.warnings.length - 20);
    }
  }

  private addPriceBackfillRunError(run: PriceBackfillRunRecord, symbol: string | undefined, message: string): void {
    run.recentErrors.push({ symbol, message, timestamp: new Date().toISOString() });
    if (run.recentErrors.length > 20) {
      run.recentErrors.splice(0, run.recentErrors.length - 20);
    }
  }

  private toPriceBackfillRunResponse(
    run: PriceBackfillRunRecord,
    overrides: Partial<PriceBackfillRunStatusResponse> = {}
  ): PriceBackfillRunStatusResponse {
    return {
      success: true,
      runId: run.runId,
      status: run.status,
      message: run.message,
      region: run.region,
      assetType: run.assetType,
      scopeType: 'PRICE_BACKFILL',
      batchSize: run.batchSize,
      workerConcurrency: run.workerConcurrency,
      providerThrottleMs: run.providerThrottleMs,
      maxBatches: run.maxBatches,
      totalCount: run.totalCount,
      processedCount: run.processedCount,
      currentBatchNumber: run.currentBatchNumber,
      batchesPlanned: run.batchesPlanned,
      batchesExecuted: run.batchesExecuted,
      updated: run.updated,
      skipped: run.skipped,
      failed: run.failed,
      noOp: run.noOp,
      priceRowsReceived: run.priceRowsReceived,
      priceRowsInserted: run.priceRowsInserted,
      priceRowsUpdated: run.priceRowsUpdated,
      priceRowsNoOp: run.priceRowsNoOp,
      zeroRowProviderReturns: run.zeroRowProviderReturns,
      warningCount: run.warningCount,
      warnings: [...run.warnings],
      recentErrors: [...run.recentErrors],
      latestBatch: run.latestBatch,
      remainingCandidates: run.remainingCandidates,
      hasMore: run.hasMore,
      percentComplete: run.percentComplete,
      startedAt: run.startedAt,
      updatedAt: run.updatedAt,
      completedAt: run.completedAt,
      statusUrl: run.statusUrl,
      cancelRequested: run.cancelRequested,
      ...overrides,
    };
  }

  private async persistCatalogSyncRunState(
    run: CatalogSyncRunRecord,
    status: 'PENDING' | 'SYNCED' | 'FINAL_CONFIRMED' | 'FAILED',
    now: Date
  ): Promise<void> {
    const repository = this.repository as any;
    if (typeof repository.upsertSyncState !== 'function') return;
    const summary: ScheduledRegionSyncSummary = {
      region: run.region,
      assetType: run.assetType,
      tradingDate: run.tradingDate,
      instrumentsProcessed: run.processedCount,
      rowsReceived: run.rowsReceived,
      rowsInserted: run.rowsInserted,
      rowsUpdated: run.rowsUpdated,
      rowsSkipped: run.rowsSkipped,
      rowsNoOp: run.noOpCount,
      warningCount: run.warningCount,
      warnings: run.warnings.slice(-10),
      errors: run.recentErrors.map((error) => `${error.symbol ? `${error.symbol}: ` : ''}${error.message}`).slice(-10),
    };
    await repository.upsertSyncState({
      region: run.region,
      assetType: run.assetType,
      scopeType: 'CATALOG',
      scopeKey: run.region,
      tradingDate: run.tradingDate,
      timeframe: '1D',
      status,
      summary,
      lastCheckedAt: now,
      lastProviderFetchAt: run.processedCount > 0 ? now : undefined,
    });
  }

  private pruneCatalogSyncRuns(): void {
    const terminalRuns = Array.from(MarketDataFoundationService.catalogSyncRuns.values())
      .filter((run) => run.completedAt)
      .sort((a, b) => Date.parse(b.completedAt || b.updatedAt) - Date.parse(a.completedAt || a.updatedAt));
    const keepIds = new Set(terminalRuns.slice(0, 10).map((run) => run.runId));
    const cutoff = Date.now() - 30 * 60_000;
    for (const run of terminalRuns) {
      if (!keepIds.has(run.runId) && Date.parse(run.completedAt || run.updatedAt) < cutoff) {
        MarketDataFoundationService.catalogSyncRuns.delete(run.runId);
      }
    }
  }

  private prunePriceBackfillRuns(): void {
    const terminalRuns = Array.from(MarketDataFoundationService.priceBackfillRuns.values())
      .filter((run) => run.completedAt)
      .sort((a, b) => Date.parse(b.completedAt || b.updatedAt) - Date.parse(a.completedAt || a.updatedAt));
    const keepIds = new Set(terminalRuns.slice(0, 10).map((run) => run.runId));
    const cutoff = Date.now() - 30 * 60_000;
    for (const run of terminalRuns) {
      if (!keepIds.has(run.runId) && Date.parse(run.completedAt || run.updatedAt) < cutoff) {
        MarketDataFoundationService.priceBackfillRuns.delete(run.runId);
      }
    }
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunkSize = Math.max(1, size);
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  async syncAll(
    workerCount: number = 4,
    workerConcurrency: number = 4,
    delayBetweenBatchesMs: number = 3000,
    options: Pick<PaginationOptions, 'region' | 'assetType'> & { force?: boolean; fullReload?: boolean } = {}
  ) {
    try {
      const region = options.region || 'GLOBAL';
      const assetType = options.assetType || 'STOCK';
      const now = new Date();
      const tradingDate = tradingDateForRegion(region, now) || now.toISOString().slice(0, 10);
      const allStocks = await this.repository.listActiveStockSyncTasks(options);
      const totalStocks = allStocks.length;
      const results: Array<{symbol: string, success: boolean, message: string, timestamp: string, workerId?: number}> = [];
      const errors: Array<{symbol: string, success: boolean, message: string, timestamp: string, workerId?: number}> = [];

      const force = options.force === true || options.fullReload === true;
      if (!force) {
        const gate = await this.evaluateSyncFreshnessGate({
          region,
          assetType,
          scopeType: 'CATALOG',
          scopeKey: region,
          tradingDate,
          now,
          force: false,
          cooldownMinutes: this.manualSyncCooldownMinutes,
        });
        if (gate.shouldSkip) {
          const summary = this.buildSkippedRegionSummary(region, assetType, tradingDate, totalStocks, gate.reason, gate.message, now, gate.nextEligibleSyncAt);
          await this.repository.upsertSyncState({
            region,
            assetType,
            scopeType: 'CATALOG',
            scopeKey: region,
            tradingDate,
            timeframe: '1D',
            status: gate.reason === 'FINAL_CANDLE_CONFIRMED' ? 'FINAL_CONFIRMED' : 'SYNCED',
            summary,
            lastCheckedAt: now,
          });
          console.log(`Catalog sync skipped: ${gate.reason}. No provider fetch required. Next eligible sync at ${gate.nextEligibleSyncAt ?? 'unknown'}`);
          return {
            success: true,
            noNewData: true,
            message: gate.message,
            totalStocks,
            succeeded: 0,
            failed: 0,
            workerCount,
            workerConcurrency,
            skippedBeforeFetchCount: summary.skippedBeforeFetchCount,
            providerFetchSkippedCount: summary.providerFetchSkippedCount,
            skippedReasonCounts: summary.skippedReasonCounts,
            skippedReasons: summary.skippedReasons,
            lastCheckedAt: summary.lastCheckedAt,
            nextEligibleSyncAt: summary.nextEligibleSyncAt,
            timestamp: now.toISOString(),
          };
        }
      }

      console.log(`Starting bulk sync for ${totalStocks} active stocks`, {
        receivedRegion: options.region || 'GLOBAL',
        receivedAssetType: options.assetType || 'ALL',
      });
      console.log(`Configuration: ${workerCount} workers, ${workerConcurrency} concurrency per worker, ${delayBetweenBatchesMs}ms delay between batches`);
      console.log(`Estimated speedup: ${workerCount * workerConcurrency}x faster than sequential processing\n`);

      const workerModule = await import('./market-data-foundation.worker');
      const StockSyncWorker = workerModule.StockSyncWorker;
      const workers: InstanceType<typeof StockSyncWorker>[] = [];

      for (let i = 0; i < workerCount; i++) {
        workers.push(new StockSyncWorker(i + 1, workerConcurrency));
      }

      const tasksPerWorker = Math.ceil(totalStocks / workerCount);
      const workerTasks: Array<Array<any>> = [];

      for (let i = 0; i < workerCount; i++) {
        const startIdx = i * tasksPerWorker;
        const endIdx = Math.min(startIdx + tasksPerWorker, totalStocks);
        workerTasks.push(allStocks.slice(startIdx, endIdx));
      }

      console.log('Task distribution:');
      workerTasks.forEach((tasks, idx) => {
        console.log(`   Worker ${idx + 1}: ${tasks.length} stocks`);
      });
      console.log('');

      const workerPromises = workers.map(async (worker, idx) => {
        const tasks = workerTasks[idx];
        if (tasks.length === 0) return [];

        console.log(`Worker ${idx + 1} starting with ${tasks.length} tasks...`);
        const workerResults = await worker.processTasks(tasks, { force, skipFreshnessGate: true });

        if (idx < workers.length - 1) {
          console.log(`Waiting ${delayBetweenBatchesMs}ms before next worker batch...`);
          await new Promise(resolve => setTimeout(resolve, delayBetweenBatchesMs));
        }

        return workerResults;
      });

      const allWorkerResults = await Promise.all(workerPromises);
      const flattenedResults = allWorkerResults.flat();
      results.push(...flattenedResults);
      flattenedResults.filter(r => !r.success).forEach(r => errors.push(r));

      await Promise.all(workers.map(worker => worker.disconnect()));

      const totalSuccesses = results.filter(r => r.success).length;
      const totalFailures = results.filter(r => !r.success).length;

      console.log('\nBulk sync completed!');
      console.log(`   Successfully processed: ${totalSuccesses} stocks`);
      console.log(`   Failed: ${totalFailures} stocks`);
      console.log(`   Total time saved: ~${Math.round((totalStocks * 6) / 60)} minutes estimated`);

      const catalogSummary: ScheduledRegionSyncSummary = {
        region,
        assetType,
        tradingDate,
        instrumentsProcessed: flattenedResults.length,
        rowsReceived: 0,
        rowsInserted: 0,
        rowsUpdated: 0,
        rowsSkipped: 0,
        rowsNoOp: 0,
        warningCount: 0,
        warnings: [],
        errors: errors.map((error) => `${error.symbol}: ${error.message}`).slice(0, 10),
      };
      await this.repository.upsertSyncState({
        region,
        assetType,
        scopeType: 'CATALOG',
        scopeKey: region,
        tradingDate,
        timeframe: '1D',
        status: totalFailures > 0 ? 'FAILED' : 'SYNCED',
        summary: catalogSummary,
        lastCheckedAt: now,
        lastProviderFetchAt: now,
      });

      return {
        success: true,
        message: `Bulk sync completed using ${workerCount} workers. ${totalSuccesses} succeeded, ${totalFailures} failed.`,
        totalStocks,
        succeeded: totalSuccesses,
        failed: totalFailures,
        workerCount,
        workerConcurrency,
        errors: errors.length > 0 ? errors : undefined,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      console.error('Bulk sync failed:', error);
      return {
        success: false,
        message: `Bulk sync failed: ${error.message}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  async syncFxRates(pairs = ['USD/EUR', 'USD/GBP', 'USD/INR', 'EUR/GBP']) {
    const results = [];
    for (const pair of pairs) {
      await this.throttleIngestion(250);
      const rate = await this.marketDataProvider.fetchFxRate(pair);
      if (rate) {
        results.push(await this.repository.upsertFxRate(rate));
      }
    }
    return results;
  }

  async listFxRates() {
    let rates = await this.repository.listFxRates();
    if (rates.length === 0) {
      await this.syncFxRates();
      rates = await this.repository.listFxRates();
    }
    return {
      source: rates[0]?.source || 'yahoo',
      ingestion_timestamp: rates[0]?.ingestionTimestamp?.toISOString?.() ?? null,
      last_updated_timestamp: rates[0]?.lastUpdatedTimestamp?.toISOString?.() ?? null,
      data_status: rates.length > 0 ? 'COMPLETE' : 'MISSING',
      rates: rates.map((rate: any) => this.toV1FxRate(rate)),
    };
  }

  async getFxRate(pair: string) {
    const normalizedPair = this.normalizePair(pair);
    let rate = await this.repository.findFxRate(normalizedPair);
    if (!rate) {
      const providerRate = await this.marketDataProvider.fetchFxRate(normalizedPair);
      if (providerRate) {
        rate = await this.repository.upsertFxRate(providerRate);
      }
    }
    return rate ? this.toV1FxRate(rate) : null;
  }

  disconnect() {
    return this.repository.prisma.$disconnect();
  }

  private async universeReadinessAndStatsForStocks(
    stocks: any[],
    options: Pick<PaginationOptions, 'region' | 'assetType'> = {}
  ): Promise<{ readinessBySymbol: Map<string, InstrumentUniverseReadiness>; statsBySymbol: Map<string, any> }> {
    if (stocks.length === 0) return { readinessBySymbol: new Map(), statsBySymbol: new Map() };
    const expectedLatestTradingDate = latestCompletedTradingDateForRegion(options.region || 'IN');
    const identitySymbols = [...new Set(stocks.flatMap((stock) => [
      stock.symbol,
      stock.providerSymbol,
      stock.sourceSymbol,
      stock.displaySymbol,
    ]).filter((value): value is string => typeof value === 'string' && value.trim().length > 0))];
    const statsBySymbol = typeof (this.repository as any).priceReadinessStatsForSymbols === 'function'
      ? await this.repository.priceReadinessStatsForSymbols(identitySymbols)
      : new Map<string, never>();
    await this.repairProviderSupportFromStoredPrices(stocks, statsBySymbol as Map<string, any>);
    const readinessBySymbol = new Map(stocks.map((stock) => {
      const priceStats = this.priceStatsForStock(statsBySymbol as Map<string, any>, stock);
      const readiness = classifyInstrumentUniverseReadiness({
        isActive: stock.isActive,
        isDelisted: stock.isDelisted,
        providerSupportStatus: stock.providerSupportStatus,
        providerSymbol: stock.providerSymbol || stock.symbol,
        providerError: stock.providerError,
        sector: stock.sector,
        industry: stock.industry,
        country: stock.country || this.defaultCountryForInstrument(stock.symbol, stock.exchange, stock.region),
        currency: stock.currency || this.defaultCurrencyForInstrument(stock.symbol, stock.exchange, stock.region),
        marketCap: stock.marketCap,
        isin: stock.isin,
        ipoDate: stock.ipoDate,
        region: stock.region || options.region,
        assetType: stock.assetType || options.assetType,
        expectedLatestTradingDate,
        priceStats,
      });
      return [stock.symbol, readiness];
    }));
    return { readinessBySymbol, statsBySymbol };
  }

  private async trustedBaselineByStockId(
    stocks: any[],
    readinessBySymbol: Map<string, InstrumentUniverseReadiness>,
    statsBySymbol: Map<string, any>,
    options: Pick<PaginationOptions, 'region' | 'assetType'> = {}
  ): Promise<Map<string, TrustedBaselineSnapshot>> {
    if (stocks.length === 0) return new Map();
    const scope = {
      region: options.region?.trim().toUpperCase() || 'IN',
      assetType: options.assetType?.trim().toUpperCase() || 'STOCK',
    };
    const validationWindow = this.providerValidationWindow(scope);
    const repositoryAny = this.repository as any;
    const repairStatesByStockId = typeof repositoryAny.listRepairStatesForStocks === 'function'
      ? await repositoryAny.listRepairStatesForStocks(
        stocks.map((stock) => stock.id),
        { ...scope, repairTypes: ['PROVIDER_VALIDATION', 'PRICE_BACKFILL', 'CATALOG_IDENTITY'] }
      )
      : new Map<string, any[]>();
    const baselineByStockId = new Map<string, TrustedBaselineSnapshot>();

    for (const stock of stocks) {
      const readiness = readinessBySymbol.get(stock.symbol);
      if (!readiness) continue;
      const historyDiagnostics = this.requiredHistoryDiagnostics(stock, validationWindow, this.priceStatsForStock(statsBySymbol, stock));
      const repairStates = this.repairStateLookup(repairStatesByStockId.get(stock.id));
      const sourceFallbackReason = this.sourceFallbackReasonForBaseline(repairStates.priceBackfill);
      const requiredHistoryStatus = this.requiredHistoryStatusForBaseline(historyDiagnostics, sourceFallbackReason);
      const listingDateStatus = this.listingDateStatusForBaseline(historyDiagnostics, validationWindow.defaultRequiredHistoryStartDateIso);
      const providerFallbackState = this.providerFallbackStateForBaseline(
        stock,
        repairStates.providerValidation,
        sourceFallbackReason,
        requiredHistoryStatus
      );
      const residualState = this.residualStateForBaseline(
        stock,
        readiness,
        historyDiagnostics,
        listingDateStatus,
        providerFallbackState,
        requiredHistoryStatus,
        sourceFallbackReason
      );
      const fallbackSourcesAttempted = this.fallbackSourcesAttemptedForBaseline(repairStates.priceBackfill, sourceFallbackReason);
      const blockerCodes = this.trustedBaselineBlockerCodes(
        stock,
        readiness,
        residualState,
        requiredHistoryStatus,
        listingDateStatus,
        providerFallbackState,
        sourceFallbackReason
      );
      baselineByStockId.set(stock.id, {
        trustedBaselineResidualState: residualState,
        trustedBaselineBlockerCodes: blockerCodes,
        latestCompletedEodDate: historyDiagnostics.latestCompletedEodDate,
        latestCompletedEodPresent: Boolean(
          historyDiagnostics.latestCompletedEodDate
          && historyDiagnostics.storedHistoryEndDate
          && historyDiagnostics.storedHistoryEndDate >= historyDiagnostics.latestCompletedEodDate
        ),
        storedDataThroughDate: historyDiagnostics.storedHistoryEndDate || readiness.latestPriceDate,
        requiredHistoryStartDate: historyDiagnostics.requiredHistoryStartDate,
        requiredHistoryEndDate: historyDiagnostics.latestCompletedEodDate,
        requiredHistoryStatus,
        listingDate: historyDiagnostics.listingDate,
        listingDateStatus,
        providerFallbackState,
        primarySourceAttempted: 'YAHOO',
        fallbackSourcesAttempted,
        sourceFallbackReason,
      });
    }

    return baselineByStockId;
  }

  private repairStateLookup(states: any[] | undefined): RepairStateLookup {
    const byType = new Map<string, any>();
    for (const state of states || []) {
      const repairType = String(state?.repairType || '').toUpperCase();
      if (!repairType || byType.has(repairType)) continue;
      byType.set(repairType, state);
    }
    return {
      providerValidation: byType.get('PROVIDER_VALIDATION') || null,
      priceBackfill: byType.get('PRICE_BACKFILL') || null,
      catalogIdentity: byType.get('CATALOG_IDENTITY') || null,
    };
  }

  private listingDateStatusForBaseline(
    historyDiagnostics: ReturnType<MarketDataFoundationService['requiredHistoryDiagnostics']>,
    defaultRequiredHistoryStartDateIso: string
  ): TrustedBaselineListingDateStatus {
    if (!historyDiagnostics.listingDate) return 'MISSING_USED_15_YEAR_TARGET';
    if (historyDiagnostics.listingDate > defaultRequiredHistoryStartDateIso) return 'PRESENT_USED_LISTING_DATE';
    return 'PRESENT_OLDER_THAN_15Y_USED_15Y';
  }

  private requiredHistoryStatusForBaseline(
    historyDiagnostics: ReturnType<MarketDataFoundationService['requiredHistoryDiagnostics']>,
    sourceFallbackReason: string | null
  ): TrustedBaselineRequiredHistoryStatus {
    if (sourceFallbackReason) return 'FALLBACK_REQUIRED';
    return historyDiagnostics.requiredHistoryComplete ? 'COMPLETE' : 'INCOMPLETE';
  }

  private providerFallbackStateForBaseline(
    stock: any,
    providerValidationState: any,
    sourceFallbackReason: string | null,
    requiredHistoryStatus: TrustedBaselineRequiredHistoryStatus
  ): TrustedBaselineProviderFallbackState {
    if (stock.isActive === false || stock.isDelisted === true || normalizeProviderStatus(stock.providerSupportStatus) === 'UNSUPPORTED') {
      return 'PROVIDER_UNSUPPORTED_OR_INACTIVE';
    }
    const providerStatus = normalizeProviderStatus(stock.providerSupportStatus);
    if (providerStatus === 'UNKNOWN') return 'PROVIDER_UNKNOWN';
    if (providerStatus === 'VALIDATION_FAILED') {
      const retryBlocked = this.isProviderValidationRetryBlocked(providerValidationState);
      return retryBlocked ? 'RETRY_BLOCKED_PROVIDER_VALIDATION' : 'PROVIDER_VALIDATION_FAILED';
    }
    if (sourceFallbackReason === 'YAHOO_ZERO_ROWS') return 'YAHOO_INSUFFICIENT_FALLBACK_REQUIRED';
    if (sourceFallbackReason || requiredHistoryStatus === 'FALLBACK_REQUIRED') return 'FALLBACK_ATTEMPTED_STILL_INCOMPLETE';
    return 'PROVIDER_SUPPORTED';
  }

  private residualStateForBaseline(
    stock: any,
    readiness: InstrumentUniverseReadiness,
    historyDiagnostics: ReturnType<MarketDataFoundationService['requiredHistoryDiagnostics']>,
    listingDateStatus: TrustedBaselineListingDateStatus,
    providerFallbackState: TrustedBaselineProviderFallbackState,
    requiredHistoryStatus: TrustedBaselineRequiredHistoryStatus,
    sourceFallbackReason: string | null
  ): TrustedBaselineResidualState {
    if (stock.isActive === false || stock.isDelisted === true || normalizeProviderStatus(stock.providerSupportStatus) === 'UNSUPPORTED') {
      return 'UNSUPPORTED_OR_INACTIVE_EXCLUDED';
    }
    if (providerFallbackState === 'RETRY_BLOCKED_PROVIDER_VALIDATION') return 'RETRY_BLOCKED_PROVIDER_VALIDATION';
    if (providerFallbackState === 'PROVIDER_UNKNOWN' || providerFallbackState === 'PROVIDER_VALIDATION_FAILED') return 'PROVIDER_VALIDATION_PENDING';
    if (sourceFallbackReason === 'YAHOO_ZERO_ROWS') return 'FALLBACK_REQUIRED_AFTER_YAHOO_ZERO_ROWS';
    if (providerFallbackState === 'FALLBACK_ATTEMPTED_STILL_INCOMPLETE') return 'FALLBACK_ATTEMPTED_STILL_INCOMPLETE';
    if (listingDateStatus === 'MISSING_USED_15_YEAR_TARGET') return 'LISTING_DATE_MISSING_REQUIRED_15Y';
    if (this.needsCatalogIdentityRepair(stock)) return 'CATALOG_IDENTITY_REPAIR_REQUIRED';
    if (requiredHistoryStatus !== 'COMPLETE') return 'REQUIRED_HISTORY_INCOMPLETE';
    if (readiness.priceReadiness !== 'READY' || !historyDiagnostics.requiredHistoryComplete) return 'REQUIRED_HISTORY_INCOMPLETE';
    return 'REVIEW_READY';
  }

  private trustedBaselineBlockerCodes(
    stock: any,
    readiness: InstrumentUniverseReadiness,
    residualState: TrustedBaselineResidualState,
    requiredHistoryStatus: TrustedBaselineRequiredHistoryStatus,
    listingDateStatus: TrustedBaselineListingDateStatus,
    providerFallbackState: TrustedBaselineProviderFallbackState,
    sourceFallbackReason: string | null
  ): string[] {
    const blockers = new Set<string>(readiness.readinessBlockers);
    if (requiredHistoryStatus !== 'COMPLETE') blockers.add('REQUIRED_HISTORY_INCOMPLETE');
    if (listingDateStatus === 'MISSING_USED_15_YEAR_TARGET') blockers.add('LISTING_DATE_MISSING_REQUIRED_15Y');
    if (sourceFallbackReason === 'YAHOO_ZERO_ROWS') blockers.add('FALLBACK_REQUIRED_AFTER_YAHOO_ZERO_ROWS');
    if (providerFallbackState === 'FALLBACK_ATTEMPTED_STILL_INCOMPLETE') blockers.add('FALLBACK_ATTEMPTED_STILL_INCOMPLETE');
    if (providerFallbackState === 'RETRY_BLOCKED_PROVIDER_VALIDATION') blockers.add('RETRY_BLOCKED_PROVIDER_VALIDATION');
    if (providerFallbackState === 'PROVIDER_UNKNOWN' || providerFallbackState === 'PROVIDER_VALIDATION_FAILED') blockers.add('PROVIDER_VALIDATION_PENDING');
    if (this.needsCatalogIdentityRepair(stock)) blockers.add('CATALOG_IDENTITY_REPAIR_REQUIRED');
    if (residualState !== 'REVIEW_READY') blockers.add(residualState);
    return Array.from(blockers);
  }

  private sourceFallbackReasonForBaseline(priceBackfillState: any): string | null {
    if (!priceBackfillState) return null;
    const fields = this.asJsonObject(priceBackfillState.fieldsFilledJson);
    const fromFields = typeof fields?.sourceFallbackReason === 'string' && fields.sourceFallbackReason.trim().length > 0
      ? fields.sourceFallbackReason.trim().toUpperCase()
      : null;
    if (fromFields) return fromFields;
    const manualReason = String(priceBackfillState.manualRequiredReason || '').trim();
    if (!this.isOfficialFallbackManualReason(manualReason)) return null;
    const yahooZeroRows = /zero usable price rows/i.test(manualReason);
    if (yahooZeroRows) return 'YAHOO_ZERO_ROWS';
    return 'OFFICIAL_FALLBACK_ATTEMPTED_STILL_INCOMPLETE';
  }

  private fallbackSourcesAttemptedForBaseline(priceBackfillState: any, sourceFallbackReason: string | null): string[] {
    const fields = this.asJsonObject(priceBackfillState?.fieldsFilledJson);
    const attempted = new Set<string>();
    if (Array.isArray(fields?.fallbackSourcesAttempted)) {
      for (const item of fields.fallbackSourcesAttempted) {
        if (typeof item === 'string' && item.trim().length > 0) attempted.add(item.trim().toUpperCase());
      }
    }
    if (typeof fields?.fallbackSourceAttempted === 'string' && fields.fallbackSourceAttempted.trim().length > 0) {
      attempted.add(fields.fallbackSourceAttempted.trim().toUpperCase());
    }
    if (attempted.size === 0 && sourceFallbackReason) {
      attempted.add(sourceFallbackReason === 'YAHOO_ZERO_ROWS' ? 'OFFICIAL_PUBLIC_EXCHANGE_PENDING' : 'OFFICIAL_PUBLIC_EXCHANGE_ATTEMPTED');
    }
    return Array.from(attempted);
  }

  private isProviderValidationRetryBlocked(providerValidationState: any): boolean {
    if (!providerValidationState) return false;
    const status = String(providerValidationState.status || '').toUpperCase();
    if (status === 'RETRY_COOLDOWN') return true;
    if (status !== 'FAILED_RETRYABLE') return false;
    if (!providerValidationState.nextRetryAt) return false;
    const retryAt = new Date(providerValidationState.nextRetryAt);
    return Number.isFinite(retryAt.getTime()) && retryAt.getTime() > Date.now();
  }

  private asJsonObject(value: unknown): Record<string, any> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return value as Record<string, any>;
  }

  private isOfficialFallbackManualReason(reason: string): boolean {
    if (!reason) return false;
    return /official\/public exchange fallback/i.test(reason);
  }

  private emptyUniverseCounts(): MarketDataUniverseHealth['counts'] {
    const counts = {
      byUniverseState: Object.fromEntries(UNIVERSE_STATES.map((state) => [state, 0])) as unknown as MarketDataUniverseHealth['counts']['byUniverseState'],
      readiness: {
        priceReady: 0,
        contextReady: 0,
        reviewReady: 0,
      },
      totalCatalogInstruments: 0,
      activeInstruments: 0,
      inactiveOrDelistedInstruments: 0,
      providerSupported: 0,
      providerUnknown: 0,
      providerUnknownValidationNeeded: 0,
      providerRetryValidationNeeded: 0,
      providerRetryBlocked: 0,
      providerManualRepairRequired: 0,
      nextProviderRetryAtMin: null,
      historyCoverageIncomplete: 0,
      historyCoverageListingDateMissing: 0,
      historyCoverageFallbackRequired: 0,
      providerUnsupportedExcluded: 0,
      providerValidationFailed: 0,
      unsupported: 0,
      unsupportedExcluded: 0,
      supportedCatalogIdentityRepairNeeded: 0,
      supportedBusinessMetadataRepairNeeded: 0,
      supportedPriceBackfillNeeded: 0,
      catalogOnly: 0,
      priceReady: 0,
      contextReady: 0,
      reviewReady: 0,
      staleOrIncomplete: 0,
      missingLatestPrice: 0,
      staleLatestPrice: 0,
      missingOrInadequatePriceHistory: 0,
      missingRecentVolume: 0,
      missingSector: 0,
      missingIndustry: 0,
      missingCountry: 0,
      missingCurrency: 0,
      missingMarketCap: 0,
      missingIsin: 0,
      missingListingDate: 0,
    } as MarketDataUniverseHealth['counts'];
    for (const state of UNIVERSE_STATES) {
      counts[state] = 0;
    }
    return counts;
  }

  private emptyTrustedReviewExcludedCounts() {
    return {
      providerUnknown: 0,
      providerRetryFailed: 0,
      providerUnsupported: 0,
      inactiveOrDelisted: 0,
      noLatestPrice: 0,
      staleLatestPrice: 0,
      requiredHistoryIncomplete: 0,
      insufficientBarsUnder120: 0,
      insufficientBarsUnder252: 0,
      missingRecentVolume: 0,
      corporateActionBlocked: 0,
    };
  }

  private emptyTrustedReviewContextGapCounts() {
    return {
      missingSector: 0,
      missingIndustry: 0,
      missingMarketCap: 0,
      missingIsin: 0,
      missingListingDate: 0,
    };
  }

  private trustedReviewDatePolicy(region: string, now: Date) {
    const todayTradingDate = tradingDateForRegion(region, now);
    const requiredDataThroughDate = latestCompletedTradingDateForRegion(region, now);
    if (!todayTradingDate) {
      return {
        targetTradingDate: null,
        requiredDataThroughDate,
      };
    }
    const targetTradingDate = this.isConfiguredTradingDate(region, todayTradingDate) && (!requiredDataThroughDate || requiredDataThroughDate < todayTradingDate)
      ? todayTradingDate
      : this.nextConfiguredTradingDate(region, todayTradingDate) || todayTradingDate;
    return {
      targetTradingDate,
      requiredDataThroughDate,
    };
  }

  private isConfiguredTradingDate(region: string, date: string) {
    const config = getMarketSessionConfig(region);
    if (!config) return false;
    const cursor = this.utcDateAtNoon(date);
    const weekday = cursor.getUTCDay();
    return config.weekdays.includes(weekday) && !config.holidays.includes(date);
  }

  private nextConfiguredTradingDate(region: string, date: string) {
    const config = getMarketSessionConfig(region);
    if (!config) return null;
    const cursor = this.utcDateAtNoon(date);
    for (let i = 0; i < 10; i += 1) {
      cursor.setUTCDate(cursor.getUTCDate() + 1);
      const candidate = cursor.toISOString().slice(0, 10);
      if (config.weekdays.includes(cursor.getUTCDay()) && !config.holidays.includes(candidate)) return candidate;
    }
    return null;
  }

  private utcDateAtNoon(date: string) {
    const [year, month, day] = date.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  }

  private trustedReviewContextGaps(stock: any): string[] {
    const gaps: string[] = [];
    if (!this.hasValidMetadataValue(stock.sector)) gaps.push('sector');
    if (!this.hasValidMetadataValue(stock.industry)) gaps.push('industry');
    if (!this.hasValidMarketCap(stock.marketCap)) gaps.push('marketCap');
    if (this.isBlank(stock.isin)) gaps.push('isin');
    if (!stock.ipoDate) gaps.push('listingDate');
    return gaps;
  }

  private reviewReadinessBlockers(
    scope: { region: string; assetType: string },
    health: MarketDataUniverseHealth,
    reviewUniverse: TrustedReviewUniverseHealth,
    repairPlan: MarketDataRepairPlan
  ): ReviewReadinessBlocker[] {
    const blockers: ReviewReadinessBlocker[] = [];
    const add = (blocker: ReviewReadinessBlocker) => {
      if (blocker.affectedCount > 0) blockers.push(blocker);
    };
    const boundedRequest = { batchSize: 50, region: scope.region, assetType: scope.assetType };
    const providerUnknown = repairPlan.providerUnknownValidationNeeded ?? repairPlan.providerValidationNeeded ?? 0;
    const providerRetry = repairPlan.providerRetryValidationNeeded ?? repairPlan.retryFailedValidations ?? 0;
    const providerActionCode = providerUnknown > 0 ? 'VALIDATE_PROVIDERS' : 'RETRY_FAILED_PROVIDERS';
    add({
      category: 'PROVIDER_VALIDATION',
      severity: 'HARD_BLOCKER',
      affectedCount: providerUnknown + providerRetry,
      explanation: 'Provider support is not proven for part of the scoped catalog, so those instruments are excluded from review.',
      nextActionCode: providerActionCode,
      nextActionLabel: this.repairRunActionLabel(providerActionCode),
      actionRoute: '/market-data?tab=data-health',
      boundedRequest,
    });
    add({
      category: 'CATALOG_IDENTITY',
      severity: 'HARD_BLOCKER',
      affectedCount: repairPlan.supportedCatalogIdentityRepairNeeded ?? repairPlan.catalogIdentityRepairNeeded ?? 0,
      explanation: 'Provider-supported instruments still need deterministic catalog identity fields before strict review signoff.',
      nextActionCode: 'CATALOG_IDENTITY_REPAIR',
      nextActionLabel: this.repairRunActionLabel('CATALOG_IDENTITY_REPAIR'),
      actionRoute: '/market-data?tab=data-health',
      boundedRequest,
    });
    add({
      category: 'PRICE_BACKFILL',
      severity: 'HARD_BLOCKER',
      affectedCount: repairPlan.supportedPriceBackfillNeeded ?? repairPlan.priceBackfillNeeded ?? 0,
      explanation: 'Provider-supported instruments need bounded EOD price backfill before they can join the trusted review universe.',
      nextActionCode: 'BACKFILL_PRICES',
      nextActionLabel: this.repairRunActionLabel('BACKFILL_PRICES'),
      actionRoute: '/market-data?tab=data-health',
      boundedRequest,
    });
    add({
      category: 'STALE_EOD',
      severity: 'HARD_BLOCKER',
      affectedCount: reviewUniverse.excludedCounts.staleLatestPrice,
      explanation: 'Stored EOD data is older than the required data-through date for these instruments.',
      nextActionCode: 'BACKFILL_PRICES',
      nextActionLabel: this.repairRunActionLabel('BACKFILL_PRICES'),
      actionRoute: '/market-data?tab=data-health',
      boundedRequest,
    });
    add({
      category: 'BUSINESS_METADATA',
      severity: 'CONTEXT_GAP',
      affectedCount: repairPlan.businessMetadataAutoRepairable + repairPlan.businessMetadataRetryEligible + repairPlan.manualBusinessMetadataRequired,
      explanation: 'Business metadata gaps reduce context quality; Lite review can proceed for price-ready instruments but strict signoff remains incomplete.',
      nextActionCode: repairPlan.businessMetadataAutoRepairable + repairPlan.businessMetadataRetryEligible > 0 ? 'PROVIDER_BUSINESS_METADATA_REPAIR' : 'MANUAL_METADATA_IMPORT',
      nextActionLabel: repairPlan.businessMetadataAutoRepairable + repairPlan.businessMetadataRetryEligible > 0
        ? this.repairRunActionLabel('PROVIDER_BUSINESS_METADATA_REPAIR')
        : this.repairRunActionLabel('MANUAL_METADATA_IMPORT'),
      actionRoute: '/market-data?tab=data-health',
      boundedRequest,
    });
    const trustedShortfall = Math.max(0, reviewUniverse.minLiteCount - reviewUniverse.trustedCount);
    add({
      category: 'INSUFFICIENT_TRUSTED_UNIVERSE',
      severity: reviewUniverse.mode === 'NO_REVIEW' ? 'HARD_BLOCKER' : 'LIMITED_REVIEW',
      affectedCount: trustedShortfall || (reviewUniverse.mode === 'LIMITED_REVIEW' ? Math.max(0, reviewUniverse.minFullCount - reviewUniverse.trustedCount) : 0),
      explanation: reviewUniverse.mode === 'NO_REVIEW'
        ? 'Trusted review universe is below the minimum Lite threshold, so Today Review cannot publish candidates.'
        : 'Trusted review universe is below the full-review threshold, so Today Review runs in limited mode.',
      nextActionCode: 'REVIEW_REPAIR_PLAN',
      nextActionLabel: 'Review bounded repair plan',
      actionRoute: '/market-data?tab=data-health',
      boundedRequest,
    });
    if (!health.expectedLatestTradingDate || !reviewUniverse.requiredDataThroughDate) {
      add({
        category: 'MARKET_CALENDAR_UNCERTAIN',
        severity: 'HARD_BLOCKER',
        affectedCount: 1,
        explanation: 'The latest required trading date is unavailable, so EOD review freshness cannot be proven.',
        nextActionCode: 'WAIT',
        nextActionLabel: 'Wait for market calendar confirmation',
        actionRoute: '/market-data?tab=data-health',
      });
    }
    return blockers.sort((left, right) => {
      const severityRank = { HARD_BLOCKER: 0, LIMITED_REVIEW: 1, CONTEXT_GAP: 2 };
      return severityRank[left.severity] - severityRank[right.severity] || right.affectedCount - left.affectedCount;
    });
  }

  private reviewReadinessNextAction(blockers: ReviewReadinessBlocker[]): ReviewReadinessNextAction | null {
    const blocker = blockers.find((item) => !['WAIT', 'REVIEW_REPAIR_PLAN'].includes(item.nextActionCode)) || blockers.find((item) => item.nextActionCode !== 'WAIT') || blockers[0];
    if (!blocker) return null;
    return {
      code: blocker.nextActionCode,
      label: blocker.nextActionLabel,
      actionRoute: blocker.actionRoute,
      boundedRequest: blocker.boundedRequest,
    };
  }

  private reviewReadinessUserDecision(
    mode: TrustedReviewUniverseMode,
    trustStatus: UniverseTrustStatus,
    blockers: ReviewReadinessBlocker[],
    nextAction: ReviewReadinessNextAction | null
  ): ReviewReadinessSummary['userDecision'] {
    if (mode === 'FULL_REVIEW' && trustStatus === 'OK' && blockers.every((blocker) => blocker.severity !== 'HARD_BLOCKER')) return 'READY_FOR_REVIEW';
    if (mode === 'NO_REVIEW') return nextAction && nextAction.code !== 'WAIT' ? 'REPAIR_DATA' : 'WAIT';
    if (blockers.some((blocker) => blocker.severity === 'HARD_BLOCKER' && blocker.category !== 'INSUFFICIENT_TRUSTED_UNIVERSE')) return 'REPAIR_DATA';
    return 'PROCEED_LIMITED';
  }

  private stockMissingDataColumnConfigs(scope: { region: string; assetType: string }): StockMissingDataColumnConfig[] {
    const isInStockScope = scope.region === 'IN' && scope.assetType === 'STOCK';
    const expectedNullDerivativeReason = 'Cash STOCK instruments should not carry derivative contract fields.';
    const derivativeExpectedNull = (stock: any) => isInStockScope && !this.isDerivativeLikeInstrument(stock);
    return [
      { column: 'id', label: 'Stock ID', nullable: false, value: (stock) => stock.id },
      { column: 'symbol', label: 'Canonical symbol', nullable: false, value: (stock) => stock.symbol },
      { column: 'name', label: 'Company name', nullable: false, value: (stock) => stock.name },
      {
        column: 'region',
        label: 'Region',
        nullable: false,
        value: (stock) => stock.region,
        expected: () => scope.region,
        invalid: (_stock, value) => String(value || '').trim().toUpperCase() !== scope.region ? `Expected scoped region ${scope.region}.` : null,
      },
      {
        column: 'exchange',
        label: 'Exchange',
        nullable: true,
        value: (stock) => stock.exchange,
        expected: () => scope.region === 'IN' ? 'NSE or BSE' : null,
        invalid: (_stock, value) => scope.region === 'IN' && !['NSE', 'BSE'].includes(String(value || '').trim().toUpperCase()) ? 'Expected NSE or BSE for IN scope.' : null,
      },
      {
        column: 'country',
        label: 'Country',
        nullable: true,
        value: (stock) => stock.country,
        expected: () => scope.region === 'IN' ? 'India' : null,
        invalid: (_stock, value) => scope.region === 'IN' && !['INDIA', 'IN'].includes(String(value || '').trim().toUpperCase()) ? 'Expected India for IN scope.' : null,
      },
      { column: 'sector', label: 'Sector', nullable: true, value: (stock) => stock.sector },
      { column: 'industry', label: 'Industry', nullable: true, value: (stock) => stock.industry },
      {
        column: 'currency',
        label: 'Currency',
        nullable: true,
        value: (stock) => stock.currency,
        expected: () => scope.region === 'IN' ? 'INR' : null,
        invalid: (_stock, value) => scope.region === 'IN' && String(value || '').trim().toUpperCase() !== 'INR' ? 'Expected INR for IN scope.' : null,
      },
      {
        column: 'marketCap',
        label: 'Market cap',
        nullable: true,
        value: (stock) => stock.marketCap,
        invalid: (_stock, value) => !this.hasValidMarketCap(value) ? 'Expected a positive numeric market cap.' : null,
      },
      {
        column: 'assetType',
        label: 'Asset type',
        nullable: true,
        value: (stock) => stock.assetType,
        expected: () => scope.assetType,
        invalid: (_stock, value) => this.normalizeInstrumentAssetType(String(value || ''), '', '').toUpperCase() !== scope.assetType ? `Expected scoped asset type ${scope.assetType}.` : null,
      },
      {
        column: 'instrumentSegment',
        label: 'Instrument segment',
        nullable: true,
        value: (stock) => stock.instrumentSegment,
        expected: () => isInStockScope ? 'CASH' : null,
        invalid: (_stock, value) => isInStockScope && String(value || '').trim().toUpperCase() !== 'CASH' ? 'Expected CASH segment for IN/STOCK scope.' : null,
      },
      { column: 'displaySymbol', label: 'Display symbol', nullable: true, value: (stock) => stock.displaySymbol },
      {
        column: 'providerSymbol',
        label: 'Provider symbol',
        nullable: true,
        value: (stock) => stock.providerSymbol,
        expected: (stock) => this.expectedProviderSuffixForStock(stock) ? `suffix ${this.expectedProviderSuffixForStock(stock)}` : null,
        invalid: (stock, value) => {
          const suffix = this.expectedProviderSuffixForStock(stock);
          return suffix && !String(value || '').trim().toUpperCase().endsWith(suffix) ? `Provider symbol should end with ${suffix}.` : null;
        },
      },
      { column: 'sourceSymbol', label: 'Source symbol', nullable: true, value: (stock) => stock.sourceSymbol },
      { column: 'catalogSource', label: 'Catalog source', nullable: true, value: (stock) => stock.catalogSource },
      {
        column: 'providerSupportStatus',
        label: 'Provider support status',
        nullable: true,
        value: (stock) => stock.providerSupportStatus,
        invalid: (_stock, value) => ['SUPPORTED', 'UNSUPPORTED', 'UNKNOWN', 'VALIDATION_FAILED'].includes(String(value || '').trim().toUpperCase()) ? null : 'Expected SUPPORTED, UNSUPPORTED, UNKNOWN, or VALIDATION_FAILED.',
      },
      {
        column: 'providerError',
        label: 'Provider error',
        nullable: true,
        value: (stock) => stock.providerError,
        expectedNull: (stock) => !['VALIDATION_FAILED', 'UNSUPPORTED'].includes(normalizeProviderStatus(stock.providerSupportStatus)),
        expectedNullReason: 'Provider error is expected to be null unless provider validation failed or classified the symbol as unsupported.',
      },
      { column: 'derivativesEligible', label: 'Derivatives eligible', nullable: false, value: (stock) => stock.derivativesEligible },
      {
        column: 'underlyingSymbol',
        label: 'Underlying symbol',
        nullable: true,
        value: (stock) => stock.underlyingSymbol,
        expectedNull: derivativeExpectedNull,
        expectedNullReason: expectedNullDerivativeReason,
      },
      {
        column: 'expiryDate',
        label: 'Expiry date',
        nullable: true,
        value: (stock) => stock.expiryDate,
        expectedNull: derivativeExpectedNull,
        expectedNullReason: expectedNullDerivativeReason,
      },
      {
        column: 'contractMonth',
        label: 'Contract month',
        nullable: true,
        value: (stock) => stock.contractMonth,
        expectedNull: derivativeExpectedNull,
        expectedNullReason: expectedNullDerivativeReason,
      },
      {
        column: 'lotSize',
        label: 'Lot size',
        nullable: true,
        value: (stock) => stock.lotSize,
        expectedNull: derivativeExpectedNull,
        expectedNullReason: expectedNullDerivativeReason,
        invalid: (stock, value) => this.isDerivativeLikeInstrument(stock) && Number(value) <= 0 ? 'Derivative-like instruments require a positive lot size.' : null,
      },
      {
        column: 'contractStatus',
        label: 'Contract status',
        nullable: true,
        value: (stock) => stock.contractStatus,
        expectedNull: derivativeExpectedNull,
        expectedNullReason: expectedNullDerivativeReason,
      },
      {
        column: 'isDelisted',
        label: 'Delisted flag',
        nullable: false,
        value: (stock) => stock.isDelisted,
        invalid: (_stock, value) => value === true ? 'Active diagnostics exclude delisted stocks; active scoped rows should be false.' : null,
      },
      {
        column: 'ipoDate',
        label: 'Listing date',
        nullable: true,
        value: (stock) => stock.ipoDate,
        invalid: (_stock, value) => value instanceof Date && value.getTime() > Date.now() ? 'Listing date is in the future.' : null,
      },
      {
        column: 'isin',
        label: 'ISIN',
        nullable: true,
        value: (stock) => stock.isin,
        invalid: (_stock, value) => scope.region === 'IN' && !/^IN[A-Z0-9]{10}$/i.test(String(value || '').trim()) ? 'Expected a 12-character Indian ISIN beginning with IN.' : null,
      },
      { column: 'source', label: 'Source', nullable: false, value: (stock) => stock.source },
      {
        column: 'dataStatus',
        label: 'Data status',
        nullable: false,
        value: (stock) => stock.dataStatus,
        invalid: (_stock, value) => ['COMPLETE', 'PARTIAL', 'DELAYED', 'MISSING', 'ERROR'].includes(String(value || '').trim().toUpperCase()) ? null : 'Expected COMPLETE, PARTIAL, DELAYED, MISSING, or ERROR.',
      },
      {
        column: 'lastSuccessfulDataLoadTimestamp',
        label: 'Last successful data load timestamp',
        nullable: true,
        value: (stock) => stock.lastSuccessfulDataLoadTimestamp,
        invalid: (stock, value, priceStatsBySymbol) => {
          const bars = this.priceBarsForSymbol(priceStatsBySymbol, stock.symbol);
          if (value && bars === 0) {
            const providerBars = this.priceBarsForSymbol(priceStatsBySymbol, stock.providerSymbol);
            return providerBars > 0
              ? 'Data load timestamp exists, but price rows are stored under provider symbol instead of Stock.symbol.'
              : 'Data load timestamp exists, but no canonical price rows were found.';
          }
          return bars > 0 && !value ? 'Price rows exist but last successful data load timestamp is missing.' : null;
        },
      },
    ];
  }

  private stockColumnMissingDataDiagnostic(
    config: StockMissingDataColumnConfig,
    stocks: any[],
    priceStatsBySymbol: Map<string, any>,
    sampleLimit: number
  ): StockColumnMissingDataDiagnostic {
    const diagnostic: StockColumnMissingDataDiagnostic = {
      column: config.column,
      label: config.label,
      nullable: config.nullable,
      expectedNull: false,
      expectedNullReason: config.expectedNullReason,
      totalRows: stocks.length,
      nullCount: 0,
      blankCount: 0,
      nullEquivalentCount: 0,
      invalidCount: 0,
      expectedNullCount: 0,
      unexpectedNonNullCount: 0,
      affectedCount: 0,
      samples: [],
    };

    for (const stock of stocks) {
      const value = config.value(stock);
      const expectedNull = Boolean(config.expectedNull?.(stock));
      if (expectedNull) diagnostic.expectedNull = true;
      const expected = expectedNull ? 'null' : config.expected?.(stock) ?? null;
      const addSample = (issue: StockMissingDataIssueKind, reason: string) => {
        if (diagnostic.samples.length >= sampleLimit) return;
        diagnostic.samples.push(this.stockMissingDataSample(stock, {
          column: config.column,
          issue,
          value,
          expected,
          reason,
        }));
      };

      if (value === null || value === undefined) {
        diagnostic.nullCount += 1;
        if (expectedNull) {
          diagnostic.expectedNullCount += 1;
        } else {
          diagnostic.affectedCount += 1;
          addSample('NULL', `${config.label} is null.`);
        }
        continue;
      }

      if (typeof value === 'string' && value.trim().length === 0) {
        diagnostic.blankCount += 1;
        diagnostic.affectedCount += 1;
        if (expectedNull) diagnostic.unexpectedNonNullCount += 1;
        addSample(expectedNull ? 'UNEXPECTED_NON_NULL' : 'BLANK', expectedNull ? `${config.label} should be null, not blank.` : `${config.label} is blank.`);
        continue;
      }

      if (this.isNullEquivalentValue(value)) {
        diagnostic.nullEquivalentCount += 1;
        diagnostic.affectedCount += 1;
        if (expectedNull) diagnostic.unexpectedNonNullCount += 1;
        addSample(expectedNull ? 'UNEXPECTED_NON_NULL' : 'NULL_EQUIVALENT', expectedNull ? `${config.label} should be null, not a null-equivalent value.` : `${config.label} uses a null-equivalent value.`);
        continue;
      }

      if (expectedNull) {
        diagnostic.unexpectedNonNullCount += 1;
        diagnostic.affectedCount += 1;
        addSample('UNEXPECTED_NON_NULL', `${config.label} is expected to be null for this stock.`);
        continue;
      }

      const invalidReason = config.invalid?.(stock, value, priceStatsBySymbol);
      if (invalidReason) {
        diagnostic.invalidCount += 1;
        diagnostic.affectedCount += 1;
        addSample('INVALID', invalidReason);
      }
    }

    return diagnostic;
  }

  private stockIdentityMismatchDiagnostics(
    stocks: any[],
    priceStatsBySymbol: Map<string, any>,
    sampleLimit: number
  ): { diagnostics: StockIdentityMismatchDiagnostic[]; affectedRows: number } {
    const diagnosticsByCode = new Map<string, StockIdentityMismatchDiagnostic>();
    const affectedRows = new Set<string>();
    const add = (code: string, label: string, stock: any, reason: string, extra: Partial<StockMissingDataSample> = {}) => {
      let diagnostic = diagnosticsByCode.get(code);
      if (!diagnostic) {
        diagnostic = { code, label, count: 0, samples: [] };
        diagnosticsByCode.set(code, diagnostic);
      }
      diagnostic.count += 1;
      affectedRows.add(stock.id || stock.symbol);
      if (diagnostic.samples.length < sampleLimit) {
        diagnostic.samples.push(this.stockMissingDataSample(stock, {
          issue: 'IDENTITY_MISMATCH',
          reason,
          ...extra,
        }));
      }
    };

    for (const stock of stocks) {
      const providerSymbol = this.trimmedUpper(stock.providerSymbol);
      const sourceSymbol = this.trimmedUpper(stock.sourceSymbol);
      const displaySymbol = this.trimmedUpper(stock.displaySymbol);
      const canonicalSymbol = this.trimmedUpper(stock.symbol);
      const expectedSuffix = this.expectedProviderSuffixForStock(stock);
      const canonicalBars = this.priceBarsForSymbol(priceStatsBySymbol, stock.symbol);

      if (!providerSymbol) {
        add('PROVIDER_SYMBOL_MISSING', 'Provider symbol is missing', stock, 'Provider validation and price backfill need a provider symbol.');
      } else if (expectedSuffix && !providerSymbol.endsWith(expectedSuffix)) {
        add('PROVIDER_SYMBOL_SUFFIX_MISMATCH', 'Provider symbol suffix does not match exchange', stock, `Expected provider symbol suffix ${expectedSuffix}.`, { expected: `*${expectedSuffix}`, value: providerSymbol });
      }

      if (providerSymbol && sourceSymbol && this.baseSymbolFromProviderSymbol(providerSymbol) !== this.baseSymbolFromProviderSymbol(sourceSymbol)) {
        add('SOURCE_PROVIDER_BASE_MISMATCH', 'Source/provider symbol bases differ', stock, 'Provider symbol base should match the source symbol base.', { expected: sourceSymbol, value: providerSymbol });
      }

      if (displaySymbol && sourceSymbol && this.baseSymbolFromProviderSymbol(displaySymbol) !== this.baseSymbolFromProviderSymbol(sourceSymbol)) {
        add('DISPLAY_SOURCE_BASE_MISMATCH', 'Display/source symbol bases differ', stock, 'Display symbol should match the source symbol base.', { expected: sourceSymbol, value: displaySymbol });
      }

      const alternateSymbols = [stock.providerSymbol, stock.sourceSymbol, stock.displaySymbol]
        .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        .filter((value) => value.trim().toUpperCase() !== canonicalSymbol);
      const alternateWithPrices = alternateSymbols
        .map((symbol) => ({ symbol, bars: this.priceBarsForSymbol(priceStatsBySymbol, symbol) }))
        .find((item) => item.bars > 0);
      if (canonicalBars === 0 && alternateWithPrices) {
        add('PRICE_ROWS_UNDER_ALTERNATE_SYMBOL', 'Price rows exist under alternate identity only', stock, 'Stock has no price rows under its canonical symbol, but an alternate identity has price rows.', {
          priceHistoryBars: canonicalBars,
          alternateSymbol: alternateWithPrices.symbol,
          alternatePriceHistoryBars: alternateWithPrices.bars,
        });
      }

      if (normalizeProviderStatus(stock.providerSupportStatus) === 'SUPPORTED' && canonicalBars === 0) {
        add('SUPPORTED_WITHOUT_CANONICAL_PRICES', 'Provider-supported stock has no canonical price rows', stock, 'Provider-supported stock has no price history under Stock.symbol.', { priceHistoryBars: canonicalBars });
      }
    }

    return {
      diagnostics: [...diagnosticsByCode.values()].sort((left, right) => right.count - left.count || left.code.localeCompare(right.code)),
      affectedRows: affectedRows.size,
    };
  }

  private priceIdentityRepairCandidate(
    stock: any,
    priceStatsBySymbol: Map<string, any>,
    providerOwnerCounts: Map<string, number>,
    baseOwnerCounts: Map<string, Set<string>>
  ): MarketDataPriceIdentityRepairCandidate | null {
    const symbol = typeof stock.symbol === 'string' ? stock.symbol.trim() : '';
    const providerSymbol = typeof stock.providerSymbol === 'string' ? stock.providerSymbol.trim() : '';
    if (!symbol || !providerSymbol || symbol.toUpperCase() === providerSymbol.toUpperCase()) return null;

    const canonicalPriceHistoryBars = this.priceBarsForSymbol(priceStatsBySymbol, symbol);
    const providerPriceHistoryBars = this.priceBarsForSymbol(priceStatsBySymbol, providerSymbol);
    if (canonicalPriceHistoryBars > 0 || providerPriceHistoryBars <= 0) return null;

    const candidate: MarketDataPriceIdentityRepairCandidate = {
      stockId: String(stock.id || ''),
      symbol,
      providerSymbol,
      sourceSymbol: stock.sourceSymbol ?? null,
      exchange: stock.exchange ?? null,
      providerSupportStatus: stock.providerSupportStatus ?? null,
      canonicalPriceHistoryBars,
      providerPriceHistoryBars,
      action: 'DRY_RUN',
      skippedReasonCode: null,
      skippedReason: null,
    };
    const skip = (skippedReasonCode: string, skippedReason: string): MarketDataPriceIdentityRepairCandidate => ({
      ...candidate,
      skippedReasonCode,
      skippedReason,
    });

    const expectedSuffix = this.expectedProviderSuffixForStock(stock);
    if (!expectedSuffix || !providerSymbol.toUpperCase().endsWith(expectedSuffix)) {
      return skip('SUFFIX_EXCHANGE_MISMATCH', expectedSuffix ? `Provider symbol must end with ${expectedSuffix}.` : 'Exchange suffix cannot be determined.');
    }

    const providerBase = this.baseSymbolFromProviderSymbol(providerSymbol);
    const sourceBase = this.baseSymbolFromProviderSymbol(stock.sourceSymbol || symbol);
    const canonicalBase = this.baseSymbolFromProviderSymbol(symbol);
    if (providerBase !== sourceBase || canonicalBase !== providerBase) {
      return skip('BASE_SYMBOL_MISMATCH', 'Provider, source, and canonical symbol bases are not unambiguous.');
    }

    const ownerCount = providerOwnerCounts.get(providerSymbol.toUpperCase()) || 0;
    if (ownerCount !== 1) {
      return skip('PROVIDER_SYMBOL_NOT_UNIQUE', `Provider symbol is owned by ${ownerCount} active scoped stocks.`);
    }

    const baseOwnerCount = baseOwnerCounts.get(providerBase)?.size || 0;
    if (baseOwnerCount !== 1) {
      return skip('AMBIGUOUS_SCOPED_IDENTITY', `Base symbol is owned by ${baseOwnerCount} active scoped stocks.`);
    }

    if (normalizeProviderStatus(stock.providerSupportStatus) !== 'SUPPORTED') {
      return skip('UNSUPPORTED_SCOPE', 'Stock is not provider-supported.');
    }

    return candidate;
  }

  private stockMissingDataCounts(
    stocks: any[],
    columns: StockColumnMissingDataDiagnostic[],
    priceStatsBySymbol: Map<string, any>,
    identityMismatchRows: number
  ): StockMissingDataDiagnosticsCountMap {
    const byColumn = new Map(columns.map((column) => [column.column, column]));
    const affected = (column: string) => byColumn.get(column)?.affectedCount ?? 0;
    let providerUnknown = 0;
    let providerRetryValidationNeeded = 0;
    let supportedCatalogIdentityRepairNeeded = 0;
    let supportedBusinessMetadataRepairNeeded = 0;
    let supportedPriceBackfillNeeded = 0;
    let priceBackfillNeeded = 0;
    let missingOrInadequatePriceHistory = 0;

    for (const stock of stocks) {
      const providerStatus = normalizeProviderStatus(stock.providerSupportStatus);
      const supported = providerStatus === 'SUPPORTED';
      if (providerStatus === 'UNKNOWN') providerUnknown += 1;
      if (providerStatus === 'VALIDATION_FAILED') providerRetryValidationNeeded += 1;

      const identityGap = !stock.providerSymbol || !stock.exchange || !stock.sourceSymbol || !stock.displaySymbol || !stock.catalogSource || !stock.isin || !stock.ipoDate;
      const businessGap = !this.hasValidMetadataValue(stock.sector) || !this.hasValidMetadataValue(stock.industry) || !this.hasValidMarketCap(stock.marketCap);
      const priceBars = this.priceBarsForSymbol(priceStatsBySymbol, stock.symbol);
      const priceGap = priceBars <= 0;
      if (identityGap && supported) supportedCatalogIdentityRepairNeeded += 1;
      if (businessGap && supported) supportedBusinessMetadataRepairNeeded += 1;
      if (priceGap) priceBackfillNeeded += 1;
      if (priceGap && supported) supportedPriceBackfillNeeded += 1;
      if (priceBars > 0 && priceBars < STANDARD_REVIEW_MIN_BARS) missingOrInadequatePriceHistory += 1;
    }

    const catalogIdentityRepairNeeded = stocks.filter((stock) =>
      !stock.providerSymbol || !stock.exchange || !stock.sourceSymbol || !stock.displaySymbol || !stock.catalogSource || !stock.isin || !stock.ipoDate
    ).length;
    const businessMetadataRepairNeeded = stocks.filter((stock) =>
      !this.hasValidMetadataValue(stock.sector) || !this.hasValidMetadataValue(stock.industry) || !this.hasValidMarketCap(stock.marketCap)
    ).length;

    return {
      activeStocks: stocks.length,
      providerUnknown,
      providerRetryValidationNeeded,
      providerValidationNeeded: providerUnknown + providerRetryValidationNeeded,
      missingProviderSymbol: affected('providerSymbol'),
      missingSourceSymbol: affected('sourceSymbol'),
      missingDisplaySymbol: affected('displaySymbol'),
      missingExchange: affected('exchange'),
      missingCurrency: affected('currency'),
      missingIsin: affected('isin'),
      missingListingDate: affected('ipoDate'),
      missingSector: affected('sector'),
      missingIndustry: affected('industry'),
      missingMarketCap: affected('marketCap'),
      missingLatestPrice: priceBackfillNeeded,
      missingOrInadequatePriceHistory,
      catalogIdentityRepairNeeded,
      supportedCatalogIdentityRepairNeeded,
      businessMetadataRepairNeeded,
      businessMetadataAutoRepairable: supportedBusinessMetadataRepairNeeded,
      manualBusinessMetadataRequired: businessMetadataRepairNeeded,
      priceBackfillNeeded,
      supportedPriceBackfillNeeded,
      identityMismatches: identityMismatchRows,
    };
  }

  private stockMissingDataActionCounts(counts: StockMissingDataDiagnosticsCountMap): StockMissingDataDiagnosticsActionCounts {
    return {
      providerValidationNeeded: counts.providerValidationNeeded,
      catalogIdentityRepairNeeded: counts.supportedCatalogIdentityRepairNeeded || counts.catalogIdentityRepairNeeded,
      providerBusinessMetadataRepairNeeded: counts.businessMetadataAutoRepairable,
      manualMetadataImportNeeded: counts.manualBusinessMetadataRequired,
      priceBackfillNeeded: counts.supportedPriceBackfillNeeded || counts.priceBackfillNeeded,
    };
  }

  private stockIdentityMismatchWarnings(
    diagnostics: StockIdentityMismatchDiagnostic[],
    sampleLimit: number
  ): StockIdentityMismatchWarning[] {
    const warnings: StockIdentityMismatchWarning[] = [];
    for (const diagnostic of diagnostics) {
      for (const sample of diagnostic.samples) {
        if (warnings.length >= sampleLimit) return warnings;
        warnings.push({
          symbol: sample.symbol,
          issue: diagnostic.label,
          severity: diagnostic.code === 'PRICE_ROWS_UNDER_ALTERNATE_SYMBOL' || diagnostic.code === 'SUPPORTED_WITHOUT_CANONICAL_PRICES' ? 'critical' : 'warning',
          providerSymbol: sample.providerSymbol ?? null,
          expectedProviderSymbol: diagnostic.code.includes('PROVIDER') ? sample.expected ?? null : null,
          sourceSymbol: sample.sourceSymbol ?? null,
          expectedSourceSymbol: diagnostic.code.includes('SOURCE') ? sample.expected ?? null : null,
          displaySymbol: sample.displaySymbol ?? null,
          expectedDisplaySymbol: diagnostic.code.includes('DISPLAY') ? sample.expected ?? null : null,
          exchange: sample.exchange ?? null,
          expectedExchange: null,
          alternateSymbol: sample.alternateSymbol ?? null,
          alternatePriceHistoryBars: sample.alternatePriceHistoryBars,
          priceHistoryBars: sample.priceHistoryBars,
        });
      }
    }
    return warnings;
  }

  private stockMissingDataSample(
    stock: any,
    details: {
      issue: StockMissingDataIssueKind;
      reason: string;
      column?: string;
      value?: unknown;
      expected?: string | null;
      priceHistoryBars?: number;
      alternateSymbol?: string | null;
      alternatePriceHistoryBars?: number;
    }
  ): StockMissingDataSample {
    return {
      id: String(stock.id || ''),
      symbol: String(stock.symbol || ''),
      name: stock.name ?? null,
      exchange: stock.exchange ?? null,
      providerSymbol: stock.providerSymbol ?? null,
      sourceSymbol: stock.sourceSymbol ?? null,
      displaySymbol: stock.displaySymbol ?? null,
      column: details.column,
      issue: details.issue,
      value: details.value === undefined ? undefined : this.formatDiagnosticValue(details.value),
      expected: details.expected ?? null,
      reason: details.reason,
      priceHistoryBars: details.priceHistoryBars,
      alternateSymbol: details.alternateSymbol,
      alternatePriceHistoryBars: details.alternatePriceHistoryBars,
    };
  }

  private isNullEquivalentValue(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    return ['UNKNOWN', 'N/A', 'NA', 'NONE', 'NULL', '-', '--'].includes(value.trim().toUpperCase());
  }

  private trimmedUpper(value: unknown): string {
    return typeof value === 'string' ? value.trim().toUpperCase() : '';
  }

  private formatDiagnosticValue(value: unknown): string | null {
    if (value === null || value === undefined) return null;
    if (value instanceof Date) return value.toISOString();
    return String(value);
  }

  private priceBarsForSymbol(priceStatsBySymbol: Map<string, any>, symbol: unknown): number {
    if (typeof symbol !== 'string' || !symbol.trim()) return 0;
    return Number(priceStatsBySymbol.get(symbol)?.priceHistoryBars || 0);
  }

  private priceStatsForStock(priceStatsBySymbol: Map<string, any>, stock: any): any | null {
    const candidates = [stock?.symbol, stock?.sourceSymbol, stock?.providerSymbol, stock?.displaySymbol]
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
    for (const value of candidates) {
      const direct = priceStatsBySymbol.get(value);
      if (direct) return direct;
      const base = this.baseSymbolFromProviderSymbol(value);
      const baseStats = priceStatsBySymbol.get(base);
      if (baseStats) return baseStats;
    }
    return null;
  }

  private expectedProviderSuffixForStock(stock: any): '.NS' | '.BO' | null {
    const exchange = String(stock.exchange || '').trim().toUpperCase();
    if (exchange === 'NSE') return '.NS';
    if (exchange === 'BSE') return '.BO';
    return null;
  }

  private isDerivativeLikeInstrument(stock: any): boolean {
    const assetType = String(stock.assetType || '').trim().toUpperCase();
    const segment = String(stock.instrumentSegment || '').trim().toUpperCase();
    return ['FUTURE', 'FUTURES', 'OPTION', 'OPTIONS', 'DERIVATIVE', 'DERIVATIVES'].includes(assetType)
      || ['FUTURE', 'FUTURES', 'OPTION', 'OPTIONS', 'DERIVATIVE', 'DERIVATIVES'].includes(segment);
  }

  private buildRepairLane(input: {
    code: MarketDataRepairLaneCode;
    label: string;
    actionCodes: MarketDataRepairRunAction[];
    actionCode: MarketDataRepairRunAction | 'REVIEW_REPAIR_PLAN';
    endpoint: string;
    affectedCount: number;
    eligibleNowCount: number;
    retryableFailureCount: number;
    manualRequiredCount: number;
    skippedRecentAttemptCount: number;
    boundedBatchSize: number;
    expectedEffect: string;
    latestRun: MarketDataRepairRunRecord | null;
    runActive: boolean;
    disabledReason?: string;
    request: MarketDataRepairLane['nextAction']['request'];
  }): MarketDataRepairLane {
    const lastActionRun = input.latestRun && input.actionCodes.length > 0
      ? (input.latestRun.actions || []).find((action) => input.actionCodes.includes(action.action))
      : null;
    const disabledReason = input.runActive
      ? 'A market data repair run is already active.'
      : input.disabledReason || (input.eligibleNowCount <= 0 ? 'No eligible rows in this lane.' : undefined);
    return {
      code: input.code,
      label: input.label,
      scope: { region: 'IN', assetType: 'STOCK' },
      affectedCount: input.affectedCount,
      eligibleNowCount: input.eligibleNowCount,
      retryableFailureCount: input.retryableFailureCount,
      manualRequiredCount: input.manualRequiredCount,
      skippedRecentAttemptCount: input.skippedRecentAttemptCount,
      boundedBatchSize: input.boundedBatchSize,
      expectedEffect: input.expectedEffect,
      lastRun: input.latestRun && (lastActionRun || input.code === 'INSUFFICIENT_TRUSTED_UNIVERSE')
        ? {
          id: input.latestRun.id,
          status: input.latestRun.status,
          startedAt: input.latestRun.startedAt,
          completedAt: input.latestRun.completedAt,
          successCount: lastActionRun?.totals.updated ?? input.latestRun.summary?.updated ?? 0,
          failureCount: lastActionRun?.totals.failed ?? input.latestRun.summary?.failed ?? 0,
          skippedCount: lastActionRun?.totals.skipped ?? input.latestRun.summary?.skipped ?? 0,
          warningCount: (lastActionRun?.warnings || input.latestRun.warnings || []).length,
        }
        : null,
      nextAction: {
        enabled: !disabledReason,
        actionCode: input.actionCode,
        method: 'POST',
        endpoint: input.endpoint,
        request: input.request,
        disabledReason,
      },
    };
  }

  private recommendedRepairLane(actionCode: string | undefined, lanes: MarketDataRepairLane[]): MarketDataRepairLaneCode | null {
    const mapped = ({
      VALIDATE_PROVIDERS: 'PROVIDER_VALIDATION',
      RETRY_FAILED_PROVIDERS: 'PROVIDER_VALIDATION',
      CATALOG_IDENTITY_REPAIR: 'CATALOG_IDENTITY',
      PROVIDER_BUSINESS_METADATA_REPAIR: 'PROVIDER_BUSINESS_METADATA',
      MANUAL_METADATA_IMPORT: 'MANUAL_METADATA_IMPORT',
      BACKFILL_PRICES: 'PRICE_BACKFILL',
      REVIEW_REPAIR_PLAN: 'INSUFFICIENT_TRUSTED_UNIVERSE',
    } as Record<string, MarketDataRepairLaneCode>)[actionCode || ''];
    if (mapped) return mapped;
    return lanes.find((lane) => lane.nextAction.enabled)?.code || null;
  }

  private numericOrNull(value: unknown): number | null {
    if (value === null || value === undefined) return null;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }

  private providerValidationWindow(scope: { region: string; assetType: string }, now = new Date()) {
    const latestCompletedEodDate = latestCompletedTradingDateForRegion(scope.region, now);
    const endDate = latestCompletedEodDate ? this.endOfTradingDateUtc(latestCompletedEodDate) : new Date();
    const startDate = new Date(endDate);
    startDate.setUTCDate(startDate.getUTCDate() - (scope.region === 'IN' && scope.assetType === 'STOCK' ? 45 : 30));
    startDate.setUTCHours(0, 0, 0, 0);
    const defaultRequiredHistoryStartDate = new Date(endDate);
    defaultRequiredHistoryStartDate.setUTCFullYear(defaultRequiredHistoryStartDate.getUTCFullYear() - 15);
    defaultRequiredHistoryStartDate.setUTCHours(0, 0, 0, 0);
    return {
      latestCompletedEodDate,
      startDate,
      endDate,
      startDateIso: startDate.toISOString().slice(0, 10),
      endDateIso: latestCompletedEodDate,
      defaultRequiredHistoryStartDate,
      defaultRequiredHistoryStartDateIso: defaultRequiredHistoryStartDate.toISOString().slice(0, 10),
    };
  }

  private requiredHistoryDiagnostics(stock: any, validationWindow: ReturnType<MarketDataFoundationService['providerValidationWindow']>, storedStats?: any) {
    const listingDate = stock.ipoDate ? new Date(stock.ipoDate).toISOString().slice(0, 10) : null;
    const requiredHistoryStartDate = listingDate && listingDate > validationWindow.defaultRequiredHistoryStartDateIso
      ? listingDate
      : validationWindow.defaultRequiredHistoryStartDateIso;
    const storedHistoryStartDate = storedStats?.firstPriceDate ?? null;
    const storedHistoryEndDate = storedStats?.latestPriceDate ?? null;
    const storedHistoryBars = Number(storedStats?.priceHistoryBars || 0);
    const requiredHistoryMinimumBars = this.requiredHistoryMinimumBars(requiredHistoryStartDate, validationWindow.latestCompletedEodDate);
    const storedHistoryCoveragePercent = requiredHistoryMinimumBars > 0
      ? Number(Math.min((storedHistoryBars / requiredHistoryMinimumBars) * 100, 100).toFixed(1))
      : 100;
    const requiredHistoryComplete = Boolean(
      storedHistoryStartDate
      && storedHistoryEndDate
      && this.storedHistoryStartCoversRequiredWindow(storedHistoryStartDate, requiredHistoryStartDate)
      && (!validationWindow.latestCompletedEodDate || storedHistoryEndDate >= validationWindow.latestCompletedEodDate)
      && storedHistoryBars >= requiredHistoryMinimumBars
    );
    return {
      requiredHistoryStartDate,
      listingDate,
      listingDateMissing: !listingDate,
      latestCompletedEodDate: validationWindow.latestCompletedEodDate,
      storedHistoryStartDate,
      storedHistoryEndDate,
      storedHistoryBars,
      requiredHistoryMinimumBars,
      storedHistoryCoveragePercent,
      requiredHistoryComplete,
    };
  }

  private requiredHistoryMinimumBars(requiredStartDate: string, latestCompletedEodDate: string | null): number {
    if (!latestCompletedEodDate) return 1;
    const start = new Date(`${requiredStartDate}T00:00:00.000Z`);
    const end = new Date(`${latestCompletedEodDate}T00:00:00.000Z`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return 1;
    const calendarDays = Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;
    const expectedTradingDays = Math.floor((calendarDays / 365.25) * 252);
    return Math.max(1, Math.floor(expectedTradingDays * 0.9));
  }

  private storedHistoryStartCoversRequiredWindow(storedHistoryStartDate: string, requiredHistoryStartDate: string): boolean {
    if (storedHistoryStartDate <= requiredHistoryStartDate) return true;
    const stored = new Date(`${storedHistoryStartDate}T00:00:00.000Z`);
    const required = new Date(`${requiredHistoryStartDate}T00:00:00.000Z`);
    if (Number.isNaN(stored.getTime()) || Number.isNaN(required.getTime())) return false;
    const deltaDays = Math.floor((stored.getTime() - required.getTime()) / 86_400_000);
    return deltaDays <= 7;
  }

  private providerStatusForValidation(
    validation: ProviderValidationResult,
    classification: ProviderValidationClassification
  ): ProviderSupportStatus {
    if (validation.supported || classification === 'SUPPORTED_WITH_CANDLES' || classification === 'SUPPORTED_FROM_STORED_PRICES') return 'SUPPORTED';
    if (classification === 'UNSUPPORTED_NO_PROVIDER_SYMBOL' || classification === 'UNSUPPORTED_NO_CANDLES_WIDE_WINDOW') return 'UNSUPPORTED';
    return 'VALIDATION_FAILED';
  }

  private compatibleProviderValidationClassification(validation: Partial<ProviderValidationResult>): ProviderValidationClassification {
    if (validation.supported) return 'SUPPORTED_WITH_CANDLES';
    if (validation.failed) return 'RETRYABLE_PROVIDER_ERROR';
    return 'UNSUPPORTED_NO_CANDLES_WIDE_WINDOW';
  }

  private providerValidationStateStatus(classification: ProviderValidationClassification): MarketDataRepairStateStatus {
    if (classification === 'SUPPORTED_WITH_CANDLES' || classification === 'SUPPORTED_FROM_STORED_PRICES' || classification === 'UNSUPPORTED_NO_CANDLES_WIDE_WINDOW') return 'RESOLVED';
    if (classification === 'UNSUPPORTED_NO_PROVIDER_SYMBOL' || classification === 'MANUAL_SYMBOL_REPAIR_REQUIRED') return 'MANUAL_REQUIRED';
    if (classification === 'RETRYABLE_RATE_LIMITED') return 'RETRY_COOLDOWN';
    return 'FAILED_RETRYABLE';
  }

  private isRetryableProviderValidation(classification: ProviderValidationClassification): boolean {
    return [
      'FREE_FALLBACK_REQUIRED',
      'RETRYABLE_TIMEOUT',
      'RETRYABLE_PROVIDER_ERROR',
      'RETRYABLE_RATE_LIMITED',
      'VALIDATION_SKIPPED_CALENDAR_UNCERTAIN',
    ].includes(classification);
  }

  private async nextProviderValidationRetryAt(stock: any): Promise<Date | null> {
    const repositoryAny = this.repository as any;
    const previousAttempts = typeof repositoryAny.countRepairAttempts === 'function'
      ? await repositoryAny.countRepairAttempts({ stockId: stock.id, repairType: 'PROVIDER_VALIDATION' })
      : 0;
    const minutes = previousAttempts <= 0 ? 30 : previousAttempts === 1 ? 120 : previousAttempts === 2 ? 720 : 1440;
    return this.addMinutes(new Date(), minutes);
  }

  private addProviderValidationCounts(
    summary: MarketDataRepairSummary,
    status: ProviderSupportStatus,
    classification: ProviderValidationClassification
  ) {
    if (status === 'SUPPORTED') summary.providerSupported = (summary.providerSupported || 0) + 1;
    if (status === 'UNSUPPORTED') summary.providerUnsupported = (summary.providerUnsupported || 0) + 1;
    if (status === 'VALIDATION_FAILED') summary.validationFailed = (summary.validationFailed || 0) + 1;
    if (classification === 'UNSUPPORTED_NO_CANDLES_WIDE_WINDOW') summary.unsupportedNoCandlesWideWindow = (summary.unsupportedNoCandlesWideWindow || 0) + 1;
    if (classification === 'FREE_FALLBACK_REQUIRED') {
      summary.freeFallbackRequired = (summary.freeFallbackRequired || 0) + 1;
      summary.providerRetryableFailures = (summary.providerRetryableFailures || 0) + 1;
    }
    if (classification === 'RETRYABLE_TIMEOUT') {
      summary.retryableTimeout = (summary.retryableTimeout || 0) + 1;
      summary.providerTimeouts = (summary.providerTimeouts || 0) + 1;
      summary.providerRetryableFailures = (summary.providerRetryableFailures || 0) + 1;
    }
    if (classification === 'RETRYABLE_PROVIDER_ERROR' || classification === 'VALIDATION_SKIPPED_CALENDAR_UNCERTAIN') {
      summary.retryableProviderError = (summary.retryableProviderError || 0) + 1;
      summary.providerRetryableFailures = (summary.providerRetryableFailures || 0) + 1;
    }
    if (classification === 'RETRYABLE_RATE_LIMITED') {
      summary.retryableRateLimited = (summary.retryableRateLimited || 0) + 1;
      summary.providerRetryableFailures = (summary.providerRetryableFailures || 0) + 1;
    }
    if (classification === 'MANUAL_SYMBOL_REPAIR_REQUIRED') summary.manualSymbolRepairRequired = (summary.manualSymbolRepairRequired || 0) + 1;
  }

  private async recordProviderValidationAttempt(
    stock: any,
    scope: { region: string; assetType: string },
    input: {
      status: ProviderSupportStatus;
      classification: ProviderValidationClassification;
      stateStatus: MarketDataRepairStateStatus;
      error?: string | null;
      manualRequiredReason?: string | null;
      nextRetryAt?: Date | null;
      evidence?: Record<string, unknown>;
    }
  ) {
    const repositoryAny = this.repository as any;
    if (typeof repositoryAny.recordRepairAttempt !== 'function') return;
    const attempt = await repositoryAny.recordRepairAttempt({
      stockId: stock.id,
      region: scope.region,
      assetType: scope.assetType,
      repairType: 'PROVIDER_VALIDATION',
      status: input.classification,
      provider: 'yahoo',
      fieldsFilledJson: {
        status: input.status,
        classification: input.classification,
        ...(input.evidence || {}),
      },
      error: input.error,
      manualRequiredReason: input.manualRequiredReason,
    });
    if (typeof repositoryAny.upsertRepairState !== 'function') return;
    await repositoryAny.upsertRepairState({
      stockId: stock.id,
      region: scope.region,
      assetType: scope.assetType,
      repairType: 'PROVIDER_VALIDATION',
      status: input.stateStatus,
      provider: 'yahoo',
      lastAttemptId: attempt?.id ?? null,
      fieldsFilledJson: {
        status: input.status,
        classification: input.classification,
        ...(input.evidence || {}),
      },
      error: input.error ?? null,
      manualRequiredReason: input.manualRequiredReason ?? null,
      nextRetryAt: input.nextRetryAt ?? null,
      resolvedAt: input.stateStatus === 'RESOLVED' ? new Date() : null,
    });
  }

  private addProviderValidationSample(
    summary: MarketDataRepairSummary,
    input: {
      stock: any;
      providerSymbol?: string | null;
      status: ProviderSupportStatus;
      classification: ProviderValidationClassification;
      candlesFound?: number;
      providerCallMs?: number;
      nextRetryAt?: Date | null;
      message?: string | null;
      historyDiagnostics: {
        requiredHistoryStartDate: string;
        listingDate: string | null;
        listingDateMissing: boolean;
        storedHistoryStartDate?: string | null;
        storedHistoryEndDate?: string | null;
        storedHistoryBars?: number;
        requiredHistoryComplete?: boolean;
      };
      sourceName?: string | null;
    }
  ) {
    if (!summary.sampleResults) summary.sampleResults = [];
    if (summary.sampleResults.length >= 20) return;
    summary.sampleResults.push({
      symbol: input.stock.symbol,
      providerSymbol: input.providerSymbol ?? null,
      status: input.status,
      classification: input.classification,
      candlesFound: input.candlesFound,
      providerCallMs: input.providerCallMs,
      nextRetryAt: input.nextRetryAt ? input.nextRetryAt.toISOString() : null,
      message: input.message ?? null,
      validationWindowStartDate: summary.validationWindowStartDate ?? null,
      validationWindowEndDate: summary.validationWindowEndDate ?? null,
      requiredHistoryStartDate: input.historyDiagnostics.requiredHistoryStartDate,
      listingDate: input.historyDiagnostics.listingDate,
      listingDateMissing: input.historyDiagnostics.listingDateMissing,
      storedHistoryStartDate: input.historyDiagnostics.storedHistoryStartDate ?? null,
      storedHistoryEndDate: input.historyDiagnostics.storedHistoryEndDate ?? null,
      storedHistoryBars: input.historyDiagnostics.storedHistoryBars ?? 0,
      requiredHistoryComplete: Boolean(input.historyDiagnostics.requiredHistoryComplete),
      sourceName: input.sourceName ?? null,
    });
  }

  private percentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((left, right) => left - right);
    const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * percentile) - 1));
    return sorted[index];
  }

  private async assignProviderValidationRemaining(summary: MarketDataRepairSummary, scope: { region: string; assetType: string }) {
    const repositoryAny = this.repository as any;
    const [unknown, retryEligible, retryBlocked, manualRequired, nextRetryAtMin] = await Promise.all([
      this.repository.listStocksForProviderValidation({ ...scope, batchSize: 1, offset: 0, providerValidationQueue: 'UNKNOWN_FIRST' }).then((result) => result.total).catch(() => 0),
      typeof repositoryAny.countProviderValidationRepairStates === 'function' ? repositoryAny.countProviderValidationRepairStates({ ...scope, status: 'eligible' }) : Promise.resolve(0),
      typeof repositoryAny.countProviderValidationRepairStates === 'function' ? repositoryAny.countProviderValidationRepairStates({ ...scope, status: 'blocked' }) : Promise.resolve(0),
      typeof repositoryAny.countProviderValidationRepairStates === 'function' ? repositoryAny.countProviderValidationRepairStates({ ...scope, status: 'manual' }) : Promise.resolve(0),
      typeof repositoryAny.nextProviderValidationRetryAt === 'function' ? repositoryAny.nextProviderValidationRetryAt(scope) : Promise.resolve(null),
    ]);
    summary.remainingUnknown = unknown;
    summary.remainingRetryEligible = retryEligible;
    summary.remainingRetryBlocked = retryBlocked;
    summary.remainingManualRequired = manualRequired;
    summary.nextRetryAtMin = nextRetryAtMin ? nextRetryAtMin.toISOString() : null;
  }

  private async assignProviderValidationQueueCounts(
    counts: MarketDataUniverseHealth['counts'],
    scope: { region: string; assetType: string },
    snapshot?: UniverseComputationSnapshot | null
  ) {
    if (snapshot?.repairStatesByStockId) {
      const snapshotCounts = this.repairPlanCountsFromSnapshot(snapshot);
      counts.providerRetryValidationNeeded = snapshotCounts.providerRetryValidationNeeded(counts.providerValidationFailed || 0);
      counts.providerRetryBlocked = snapshotCounts.providerRetryBlocked;
      counts.providerManualRepairRequired = snapshotCounts.providerManualRepairRequired;
      counts.nextProviderRetryAtMin = snapshotCounts.nextProviderRetryAtMin;
      return;
    }
    const repositoryAny = this.repository as any;
    if (typeof repositoryAny.countProviderValidationRepairStates !== 'function') return;
    const [retryEligible, retryBlocked, manualRequired, nextRetryAt] = await Promise.all([
      repositoryAny.countProviderValidationRepairStates({ ...scope, status: 'eligible' }),
      repositoryAny.countProviderValidationRepairStates({ ...scope, status: 'blocked' }),
      repositoryAny.countProviderValidationRepairStates({ ...scope, status: 'manual' }),
      typeof repositoryAny.nextProviderValidationRetryAt === 'function'
        ? repositoryAny.nextProviderValidationRetryAt(scope)
        : Promise.resolve(null),
    ]);
    const knownStateTotal = retryEligible + retryBlocked + manualRequired;
    const retryWithoutState = Math.max((counts.providerValidationFailed || 0) - knownStateTotal, 0);
    counts.providerRetryValidationNeeded = retryEligible + retryWithoutState;
    counts.providerRetryBlocked = retryBlocked;
    counts.providerManualRepairRequired = manualRequired;
    counts.nextProviderRetryAtMin = nextRetryAt ? nextRetryAt.toISOString() : null;
  }

  private async repairProviderSupportFromStoredPrices(stocks: any[], statsBySymbol: Map<string, { priceHistoryBars?: number; latestPriceDate?: string | null }>) {
    const symbols = stocks
      .filter((stock) => normalizeProviderStatus(stock.providerSupportStatus) === 'UNKNOWN')
      .filter((stock) => {
        const stats = this.priceStatsForStock(statsBySymbol, stock);
        return Boolean(stats?.latestPriceDate && Number(stats.priceHistoryBars || 0) > 0);
      })
      .map((stock) => stock.symbol);
    if (symbols.length === 0) return;
    if (typeof (this.repository as any).markProviderSupportedFromStoredPrices === 'function') {
      await this.repository.markProviderSupportedFromStoredPrices(symbols);
    }
    const symbolSet = new Set(symbols);
    for (const stock of stocks) {
      if (symbolSet.has(stock.symbol)) {
        stock.providerSupportStatus = 'SUPPORTED';
        stock.providerError = null;
      }
    }
  }

  private latestDateFromReadiness(readinessBySymbol: Map<string, InstrumentUniverseReadiness>): string | null {
    let latest: string | null = null;
    for (const readiness of readinessBySymbol.values()) {
      if (readiness.latestPriceDate && (!latest || readiness.latestPriceDate > latest)) latest = readiness.latestPriceDate;
    }
    return latest;
  }

  private percent(value: number, denominator: number): number {
    if (denominator <= 0) return 0;
    return Number(((value / denominator) * 100).toFixed(1));
  }

  private minReviewReadyRequired(): number {
    return Math.max(this.readPositiveNumber(process.env.MARKET_DATA_SIGNOFF_MIN_REVIEW_READY, 300), 1);
  }

  private universeSignoffFromHealth(health: Omit<MarketDataUniverseHealth, 'universeSignoff'>): MarketDataUniverseSignoff {
    const counts = health.counts;
    const planLike = {
      providerValidationNeeded: counts.providerUnknownValidationNeeded ?? counts.providerUnknown,
      retryFailedValidations: counts.providerRetryValidationNeeded ?? counts.providerValidationFailed ?? 0,
      catalogIdentityRepairNeeded: counts.supportedCatalogIdentityRepairNeeded ?? Math.max(counts.missingIsin, counts.missingListingDate),
      businessMetadataAutoRepairable: counts.supportedBusinessMetadataRepairNeeded ?? Math.max(counts.missingSector, counts.missingIndustry, counts.missingMarketCap),
      businessMetadataRetryEligible: 0,
      manualBusinessMetadataRequired: counts.supportedBusinessMetadataRepairNeeded ?? Math.max(counts.missingSector, counts.missingIndustry, counts.missingMarketCap),
      priceBackfillNeeded: counts.supportedPriceBackfillNeeded ?? counts.staleOrIncomplete,
      historyCoverageFallbackRequired: counts.historyCoverageFallbackRequired ?? 0,
    };
    return this.buildUniverseSignoff({
      providerUnknown: counts.providerUnknown,
      providerRetryValidationNeeded: planLike.retryFailedValidations,
      catalogIdentityRepairNeeded: planLike.catalogIdentityRepairNeeded,
      businessMetadataAutoRepairable: planLike.businessMetadataAutoRepairable,
      businessMetadataRetryEligible: planLike.businessMetadataRetryEligible,
      priceBackfillNeeded: planLike.priceBackfillNeeded,
      historyCoverageFallbackRequired: planLike.historyCoverageFallbackRequired,
      latestStoredEodDate: health.latestStoredEodDate,
      expectedLatestTradingDate: health.expectedLatestTradingDate,
      reviewReadyActual: counts.reviewReady,
      reviewReadyPercentage: health.coverage.reviewReadyPercentage,
      manualBusinessMetadataRequired: planLike.manualBusinessMetadataRequired,
      trustStatus: health.trustStatus,
    });
  }

  private universeSignoffFromRepairPlan(
    plan: Pick<MarketDataRepairPlan,
      'providerValidationNeeded'
      | 'retryFailedValidations'
      | 'catalogIdentityRepairNeeded'
      | 'supportedCatalogIdentityRepairNeeded'
      | 'businessMetadataAutoRepairable'
      | 'businessMetadataRetryEligible'
      | 'manualBusinessMetadataRequired'
      | 'priceBackfillNeeded'
      | 'supportedPriceBackfillNeeded'
      | 'historyCoverageFallbackRequired'
      | 'totalCatalogInstruments'>,
    evidence: {
      activeInstruments: number;
      reviewReadyActual: number;
      latestStoredEodDate: string | null;
      expectedLatestTradingDate: string | null;
      trustStatus?: MarketDataUniverseHealth['trustStatus'];
    }
  ): MarketDataUniverseSignoff {
    const reviewReadyPercentage = this.percent(evidence.reviewReadyActual, evidence.activeInstruments || plan.totalCatalogInstruments || 1);
    const supportedCatalogIdentityRepairNeeded = plan.supportedCatalogIdentityRepairNeeded ?? plan.catalogIdentityRepairNeeded;
    const supportedPriceBackfillNeeded = plan.supportedPriceBackfillNeeded ?? plan.priceBackfillNeeded;
    const impliedTrustStatus: MarketDataUniverseHealth['trustStatus'] = plan.providerValidationNeeded === 0
      && plan.retryFailedValidations === 0
      && supportedCatalogIdentityRepairNeeded === 0
      && plan.businessMetadataAutoRepairable + plan.businessMetadataRetryEligible === 0
      && plan.manualBusinessMetadataRequired === 0
      && supportedPriceBackfillNeeded === 0
      && Boolean(evidence.latestStoredEodDate && evidence.expectedLatestTradingDate && evidence.latestStoredEodDate >= evidence.expectedLatestTradingDate)
      && evidence.reviewReadyActual >= this.minReviewReadyRequired()
      && reviewReadyPercentage >= 10
      ? 'OK'
      : 'NOT_TRUSTWORTHY';
    return this.buildUniverseSignoff({
      providerUnknown: plan.providerValidationNeeded,
      providerRetryValidationNeeded: plan.retryFailedValidations,
      catalogIdentityRepairNeeded: supportedCatalogIdentityRepairNeeded,
      businessMetadataAutoRepairable: plan.businessMetadataAutoRepairable,
      businessMetadataRetryEligible: plan.businessMetadataRetryEligible,
      priceBackfillNeeded: supportedPriceBackfillNeeded,
      historyCoverageFallbackRequired: plan.historyCoverageFallbackRequired ?? 0,
      latestStoredEodDate: evidence.latestStoredEodDate,
      expectedLatestTradingDate: evidence.expectedLatestTradingDate,
      reviewReadyActual: evidence.reviewReadyActual,
      reviewReadyPercentage,
      manualBusinessMetadataRequired: plan.manualBusinessMetadataRequired,
      trustStatus: evidence.trustStatus || impliedTrustStatus,
    });
  }

  private buildUniverseSignoff(input: {
    providerUnknown: number;
    providerRetryValidationNeeded: number;
    catalogIdentityRepairNeeded: number;
    businessMetadataAutoRepairable: number;
    businessMetadataRetryEligible: number;
    priceBackfillNeeded: number;
    historyCoverageFallbackRequired?: number;
    latestStoredEodDate: string | null;
    expectedLatestTradingDate: string | null;
    reviewReadyActual: number;
    reviewReadyPercentage: number;
    manualBusinessMetadataRequired: number;
    trustStatus: MarketDataUniverseHealth['trustStatus'];
  }): MarketDataUniverseSignoff {
    const minReviewReadyRequired = this.minReviewReadyRequired();
    const blockers: MarketDataUniverseSignoff['blockers'] = [];
    const addBlocker = (
      code: string,
      count: number,
      required: number | string,
      nextAction: MarketDataRepairRunAction | 'MANUAL_METADATA_IMPORT' | null,
      severity: 'warning' | 'critical' = 'critical'
    ) => {
      if (count > 0) blockers.push({ code, severity, count, required, nextAction });
    };

    addBlocker('PROVIDER_UNKNOWN_REMAINING', input.providerUnknown, 0, 'VALIDATE_PROVIDERS');
    addBlocker('PROVIDER_VALIDATION_RETRY_FAILED_REMAINING', input.providerRetryValidationNeeded, 0, 'RETRY_FAILED_PROVIDERS');
    addBlocker('CATALOG_IDENTITY_REPAIR_REMAINING', input.catalogIdentityRepairNeeded, 0, 'CATALOG_IDENTITY_REPAIR');
    addBlocker('BUSINESS_METADATA_AUTO_REPAIRABLE_REMAINING', input.businessMetadataAutoRepairable, 0, 'PROVIDER_BUSINESS_METADATA_REPAIR');
    addBlocker('BUSINESS_METADATA_RETRY_ELIGIBLE_REMAINING', input.businessMetadataRetryEligible, 0, 'PROVIDER_BUSINESS_METADATA_REPAIR');
    addBlocker('PRICE_BACKFILL_REMAINING', input.priceBackfillNeeded, 0, 'BACKFILL_PRICES');
    addBlocker('PRICE_BACKFILL_FALLBACK_REQUIRED', input.historyCoverageFallbackRequired ?? 0, 0, null);
    addBlocker('MANUAL_BUSINESS_METADATA_REQUIRED', input.manualBusinessMetadataRequired, 0, 'MANUAL_METADATA_IMPORT');
    if (!input.latestStoredEodDate || !input.expectedLatestTradingDate || input.latestStoredEodDate < input.expectedLatestTradingDate) {
      blockers.push({
        code: 'LATEST_EOD_BEHIND_EXPECTED',
        severity: 'critical',
        count: 1,
        required: input.expectedLatestTradingDate || 'known expected trading date',
        nextAction: input.priceBackfillNeeded > 0 ? 'BACKFILL_PRICES' : null,
      });
    }
    if (input.reviewReadyActual < minReviewReadyRequired) {
      blockers.push({
        code: 'REVIEW_READY_BELOW_MINIMUM',
        severity: 'critical',
        count: input.reviewReadyActual,
        required: minReviewReadyRequired,
        nextAction: this.signoffNextActionFromCounts(input),
      });
    }
    if (input.reviewReadyPercentage < 10) {
      blockers.push({
        code: 'REVIEW_READY_PERCENTAGE_BELOW_MINIMUM',
        severity: 'critical',
        count: input.reviewReadyPercentage,
        required: '>=10%',
        nextAction: this.signoffNextActionFromCounts(input),
      });
    }
    if (input.trustStatus !== 'OK') {
      blockers.push({
        code: 'TRUST_STATUS_NOT_OK',
        severity: 'critical',
        count: 1,
        required: 'OK',
        nextAction: this.signoffNextActionFromCounts(input),
      });
    }

    const nextAction = blockers.find((blocker) => blocker.nextAction)?.nextAction || null;
    const status = blockers.length === 0 ? 'PASS' : 'FAIL';
    return {
      status,
      minReviewReadyRequired,
      reviewReadyActual: input.reviewReadyActual,
      blockers,
      nextAction,
      downstreamAllowed: status === 'PASS',
    };
  }

  private signoffNextActionFromCounts(input: {
    providerUnknown: number;
    providerRetryValidationNeeded: number;
    catalogIdentityRepairNeeded: number;
    businessMetadataAutoRepairable: number;
    businessMetadataRetryEligible: number;
    priceBackfillNeeded: number;
    manualBusinessMetadataRequired: number;
  }): MarketDataRepairRunAction | 'MANUAL_METADATA_IMPORT' | null {
    if (input.providerUnknown > 0) return 'VALIDATE_PROVIDERS';
    if (input.providerRetryValidationNeeded > 0) return 'RETRY_FAILED_PROVIDERS';
    if (input.catalogIdentityRepairNeeded > 0) return 'CATALOG_IDENTITY_REPAIR';
    if (input.businessMetadataAutoRepairable > 0 || input.businessMetadataRetryEligible > 0) return 'PROVIDER_BUSINESS_METADATA_REPAIR';
    if (input.priceBackfillNeeded > 0) return 'BACKFILL_PRICES';
    if (input.manualBusinessMetadataRequired > 0) return 'MANUAL_METADATA_IMPORT';
    return null;
  }

  private topUniverseBlockers(blockerCounts: Map<string, number>): MarketDataUniverseHealth['topBlockers'] {
    const labels: Record<string, string> = {
      PROVIDER_UNKNOWN: 'Provider support not validated',
      PROVIDER_UNSUPPORTED: 'Provider validation failed or unsupported',
      PROVIDER_SYMBOL_MISSING: 'Provider symbol missing',
      MISSING_LATEST_PRICE: 'Latest EOD price missing',
      STALE_LATEST_PRICE: 'Latest EOD price is stale',
      INADEQUATE_PRICE_HISTORY: 'Less than 252 daily bars',
      INADEQUATE_SMA200_HISTORY: 'Less than 200 daily bars',
      INADEQUATE_ROLLING_PRICE_WINDOW: 'Last 252-session window is incomplete',
      PRICE_HISTORY_GAPS: 'Price history has large date gaps',
      MISSING_RECENT_VOLUME: 'Recent volume missing',
      LOW_RECENT_VOLUME_COVERAGE: 'Recent volume coverage is incomplete',
      MISSING_SECTOR: 'Sector metadata missing',
      MISSING_INDUSTRY: 'Industry metadata missing',
      MISSING_COUNTRY: 'Country metadata missing',
      MISSING_CURRENCY: 'Currency metadata missing',
      MISSING_MARKET_CAP: 'Market cap metadata missing',
      MISSING_ISIN: 'ISIN metadata missing',
      MISSING_LISTING_DATE: 'Listing date metadata missing',
      DELISTED_OR_INACTIVE: 'Inactive or delisted instrument',
      CRITICAL_PROVIDER_SYMBOL_MISMATCH: 'Critical provider symbol mismatch',
    };
    return Array.from(blockerCounts.entries())
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .slice(0, 10)
      .map(([code, count]) => ({
        code,
        label: labels[code] || code.replace(/_/g, ' ').toLowerCase(),
        count,
        severity: this.isCriticalUniverseBlocker(code) ? 'critical' : 'warning',
      }));
  }

  private universeTrustStatus(
    counts: MarketDataUniverseHealth['counts'],
    coverage: MarketDataUniverseHealth['coverage']
  ): MarketDataUniverseHealth['trustStatus'] {
    if (counts.totalCatalogInstruments === 0) return 'NOT_TRUSTWORTHY';
    if (counts.activeInstruments > 0 && counts.providerUnknown >= counts.activeInstruments) return 'NOT_TRUSTWORTHY';
    if (counts.reviewReady === 0) return 'NOT_TRUSTWORTHY';
    if (coverage.priceCoveragePercentage < 50 || coverage.metadataCoveragePercentage < 50) return 'NOT_TRUSTWORTHY';
    if (counts.catalogOnly > 0 || counts.staleOrIncomplete > 0 || counts.unsupported > 0) return 'PARTIAL';
    return 'OK';
  }

  private universeTrustReasons(
    counts: MarketDataUniverseHealth['counts'],
    coverage: MarketDataUniverseHealth['coverage']
  ): string[] {
    const reasons: string[] = [];
    if (counts.totalCatalogInstruments === 0) reasons.push('No scoped catalog instruments were found.');
    if (counts.activeInstruments > 0 && counts.providerUnknown >= counts.activeInstruments) {
      reasons.push('Provider support is UNKNOWN for the entire active scoped universe.');
    } else if (counts.providerUnknown > 0) {
      reasons.push(`${counts.providerUnknown} active instruments still need provider validation.`);
    }
    if (counts.reviewReady === 0 && counts.totalCatalogInstruments > 0) reasons.push('Review-ready universe is empty under strict rules.');
    if (coverage.priceCoveragePercentage < 50) reasons.push(`Price coverage is ${coverage.priceCoveragePercentage}%.`);
    if (coverage.metadataCoveragePercentage < 50) reasons.push(`Metadata coverage is ${coverage.metadataCoveragePercentage}%.`);
    if (counts.catalogOnly > 0) reasons.push(`${counts.catalogOnly} instruments are catalog-only and not reviewable.`);
    if (counts.staleOrIncomplete > 0) reasons.push(`${counts.staleOrIncomplete} provider-supported instruments have stale or incomplete prices.`);
    return reasons.length > 0 ? reasons : ['Universe health satisfies strict review-ready checks.'];
  }

  private normalizeRepairRunActions(actions?: MarketDataRepairRunAction[], mode?: MarketDataRepairRunRequest['mode'], csvText?: string): MarketDataRepairRunAction[] {
    const defaultActions: MarketDataRepairRunAction[] = mode === 'DRAIN_UNTIL_BLOCKED'
      ? [
        'VALIDATE_PROVIDERS',
        'RETRY_FAILED_PROVIDERS',
        'CATALOG_IDENTITY_REPAIR',
        'PROVIDER_BUSINESS_METADATA_REPAIR',
        ...(csvText?.trim() ? ['MANUAL_METADATA_IMPORT' as MarketDataRepairRunAction] : []),
        'BACKFILL_PRICES',
      ]
      : [
        'VALIDATE_PROVIDERS',
        'CATALOG_IDENTITY_REPAIR',
        'PROVIDER_BUSINESS_METADATA_REPAIR',
        'BACKFILL_PRICES',
      ];
    const requested = new Set(actions?.length ? actions : defaultActions);
    const order: MarketDataRepairRunAction[] = [
      'VALIDATE_PROVIDERS',
      'RETRY_FAILED_PROVIDERS',
      'CATALOG_IDENTITY_REPAIR',
      'PROVIDER_BUSINESS_METADATA_REPAIR',
      'MANUAL_METADATA_IMPORT',
      'BACKFILL_PRICES',
    ];
    return order.filter((action) => requested.has(action));
  }

  private onlyManualMetadataRemains(plan: MarketDataRepairPlan): boolean {
    return plan.manualBusinessMetadataRequired > 0
      && plan.providerValidationNeeded + plan.retryFailedValidations === 0
      && (plan.supportedCatalogIdentityRepairNeeded ?? plan.catalogIdentityRepairNeeded) === 0
      && plan.businessMetadataAutoRepairable + plan.businessMetadataRetryEligible === 0
      && (plan.supportedPriceBackfillNeeded ?? plan.priceBackfillNeeded) === 0;
  }

  private repairRunActionLabel(action: MarketDataRepairRunAction): string {
    return {
      VALIDATE_PROVIDERS: 'Validate unknown providers',
      RETRY_FAILED_PROVIDERS: 'Retry failed providers',
      CATALOG_IDENTITY_REPAIR: 'Repair catalog identity',
      PROVIDER_BUSINESS_METADATA_REPAIR: 'Enrich provider business metadata',
      MANUAL_METADATA_IMPORT: 'Import manual metadata',
      BACKFILL_PRICES: 'Backfill prices',
    }[action];
  }

  private repairRunActionCount(action: MarketDataRepairRunAction, plan: MarketDataRepairPlan): number {
    if (action === 'VALIDATE_PROVIDERS') return plan.providerUnknownValidationNeeded ?? plan.providerValidationNeeded;
    if (action === 'RETRY_FAILED_PROVIDERS') return plan.providerRetryValidationNeeded ?? plan.retryFailedValidations;
    if (action === 'CATALOG_IDENTITY_REPAIR') return plan.supportedCatalogIdentityRepairNeeded ?? plan.catalogIdentityRepairNeeded;
    if (action === 'PROVIDER_BUSINESS_METADATA_REPAIR') return plan.businessMetadataAutoRepairable + plan.businessMetadataRetryEligible;
    if (action === 'MANUAL_METADATA_IMPORT') return plan.manualBusinessMetadataRequired ?? plan.manualMetadataRequired;
    if (action === 'BACKFILL_PRICES') return plan.supportedPriceBackfillNeeded ?? plan.priceBackfillNeeded;
    return 0;
  }

  private createRepairRunActionResult(
    action: MarketDataRepairRunAction,
    plan: MarketDataRepairPlan,
    batchSize: number,
    maxBatchesPerAction: number,
    dryRun: boolean
  ): MarketDataRepairRunActionResult {
    const estimatedTotal = this.repairRunActionCount(action, plan);
    const estimatedBatchCount = estimatedTotal > 0 ? Math.ceil(estimatedTotal / batchSize) : 0;
    return {
      action,
      label: this.repairRunActionLabel(action),
      estimatedTotal,
      estimatedBatchCount,
      batchesPlanned: Math.min(estimatedBatchCount, maxBatchesPerAction),
      batchesExecuted: 0,
      dryRun,
      hasMore: estimatedTotal > batchSize * maxBatchesPerAction,
      anotherRunNeeded: estimatedTotal > batchSize * maxBatchesPerAction,
      totals: {
        processedCount: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
        noOp: 0,
        manualRequired: 0,
      },
      summaries: [],
      warnings: [],
    };
  }

  private async executeRepairRunAction(
    action: MarketDataRepairRunAction,
    request: MarketDataRepairRunRequest,
    scope: { region: string; assetType: string },
    batchSize: number,
    maxBatchesPerAction: number,
    result: MarketDataRepairRunActionResult,
    startOffset = 0,
    sourceSnapshot?: RepairRunSourceSnapshot
  ) {
    if (sourceSnapshot?.error) {
      throw new Error(sourceSnapshot.error);
    }

    if (result.estimatedTotal <= 0) {
      result.hasMore = false;
      result.anotherRunNeeded = false;
      return;
    }

    if (action === 'MANUAL_METADATA_IMPORT' && !request.csvText?.trim()) {
      result.warnings.push('Manual metadata import was not executed because CSV text was not supplied; manual-required rows remain visible.');
      result.anotherRunNeeded = result.estimatedTotal > 0;
      result.hasMore = result.estimatedTotal > 0;
      return;
    }

    let offset = this.isStableRepairRunSourceAction(action) ? startOffset : 0;
    let lastSummary: MarketDataRepairSummary | null = null;
    for (let index = 0; index < maxBatchesPerAction; index += 1) {
      const summary = await this.executeRepairRunBatch(action, request, scope, batchSize, offset, sourceSnapshot);
      if (result.sourceFingerprint && summary.sourceFingerprint && result.sourceFingerprint !== summary.sourceFingerprint) {
        throw new Error(`${this.repairRunActionLabel(action)} source fingerprint changed during the repair run.`);
      }
      result.batchesExecuted += 1;
      result.summaries.push(summary);
      if (summary.sourceFingerprint) result.sourceFingerprint = summary.sourceFingerprint;
      if (summary.sourceIdentity) result.sourceIdentity = summary.sourceIdentity;
      result.totals.processedCount += summary.processedCount;
      result.totals.updated += summary.updated;
      result.totals.skipped += summary.skipped;
      result.totals.failed += summary.failed;
      result.totals.noOp += summary.noOp || 0;
      result.totals.manualRequired += summary.manualRequired || 0;
      result.warnings.push(...(summary.warnings || []));
      lastSummary = summary;

      if (!summary.hasMore || summary.processedCount === 0) break;
      offset = summary.nextOffset ?? 0;
    }

    result.hasMore = Boolean(lastSummary?.hasMore);
    result.anotherRunNeeded = result.hasMore && result.batchesExecuted >= maxBatchesPerAction;
    if (result.anotherRunNeeded) {
      result.warnings.push(`${result.label} reached the per-run batch limit; another repair run is needed.`);
    }
  }

  private executeRepairRunBatch(
    action: MarketDataRepairRunAction,
    request: MarketDataRepairRunRequest,
    scope: { region: string; assetType: string },
    batchSize: number,
    offset: number,
    sourceSnapshot?: RepairRunSourceSnapshot
  ): Promise<MarketDataRepairSummary> {
    const base: MarketDataRepairRequest = {
      region: scope.region,
      assetType: scope.assetType,
      batchSize,
      offset,
    };
    if (action === 'VALIDATE_PROVIDERS') {
      return this.validateProviders({
        ...base,
        providerValidationQueue: 'UNKNOWN_FIRST',
      });
    }
    if (action === 'RETRY_FAILED_PROVIDERS') {
      return this.validateProviders({
        ...base,
        providerValidationQueue: 'RETRY_FAILED',
      });
    }
    if (action === 'CATALOG_IDENTITY_REPAIR') {
      if (!sourceSnapshot?.catalogSnapshot) {
        throw new Error('Catalog identity repair source was not loaded for this operational run.');
      }
      return this.repairCatalogIdentityFromRows({
        ...base,
        force: request.force,
      }, sourceSnapshot.catalogSnapshot, { actionableOnly: true });
    }
    if (action === 'PROVIDER_BUSINESS_METADATA_REPAIR') {
      return this.repairProviderBusinessMetadata({
        ...base,
        workerConcurrency: request.workerConcurrency,
        force: Boolean(request.force),
      });
    }
    if (action === 'MANUAL_METADATA_IMPORT') {
      return this.importManualMetadata({
        ...base,
        csvText: request.csvText,
        importMode: 'MANUAL_CSV',
      });
    }
    return this.backfillPrices({
      ...base,
      force: request.force === true || request.fullReload === true,
      fullReload: request.fullReload,
      policy: request.policy || (request.fullReload ? 'FORCE_DEEP' : 'INCREMENTAL_LATEST_ONLY'),
    });
  }

  private async repairRunSourceFingerprints(
    request: MarketDataRepairRunRequest,
    scope: { region: string; assetType: string },
    actions: MarketDataRepairRunAction[]
  ): Promise<Partial<Record<MarketDataRepairRunAction, RepairRunSourceSnapshot>>> {
    const fingerprints: Partial<Record<MarketDataRepairRunAction, RepairRunSourceSnapshot>> = {};
    for (const action of actions) {
      if (action === 'CATALOG_IDENTITY_REPAIR') {
        try {
          const catalogSource = this.normalizeCatalogSource(request.catalogSource || this.defaultCatalogIdentitySource(scope));
          const catalog = await this.loadCatalogIdentityRows(catalogSource, request.csvText, request.importMode || 'CONFIGURED_URL');
          const catalogSnapshot: CatalogIdentityRowsSnapshot = {
            catalogSource,
            ...catalog,
          };
          fingerprints[action] = {
            fingerprint: catalog.sourceFingerprint,
            identity: catalog.sourceIdentity,
            catalogSnapshot,
          };
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Catalog source could not be loaded.';
          fingerprints[action] = {
            error: `Catalog identity repair source could not be loaded: ${message}`,
            warnings: [`Catalog identity repair source could not be loaded before processing; no catalog offsets were applied.`],
          };
        }
      }
      if (action === 'MANUAL_METADATA_IMPORT' && request.csvText?.trim()) {
        const rows = this.parseCsv(request.csvText);
        const source = this.repairSourceIdentity({
          action,
          importMode: 'MANUAL_CSV',
          sourceKey: 'MANUAL_CSV',
          rawText: request.csvText,
          rows,
        });
        fingerprints[action] = source;
      }
    }
    return fingerprints;
  }

  private async universeComputationSnapshot(
    scope: { region: string; assetType: string },
    now?: Date
  ): Promise<UniverseComputationSnapshot> {
    const stocks = await this.repository.listStocksForUniverseHealth(scope);
    const [readinessAndStats, repairStatesByStockId] = await Promise.all([
      this.universeReadinessAndStatsForStocks(stocks, scope),
      this.repairStatesByStockId(scope, stocks),
    ]);
    return {
      scope,
      stocks,
      readinessBySymbol: readinessAndStats.readinessBySymbol,
      statsBySymbol: readinessAndStats.statsBySymbol,
      validationWindow: this.providerValidationWindow(scope, now),
      priceBackfillBlockedStockIds: this.blockedPriceBackfillStockIdsFromStates(repairStatesByStockId, now)
        ?? await this.blockedPriceBackfillStockIds(scope),
      repairStatesByStockId,
    };
  }

  private universeSnapshotCacheKey(scope: { region: string; assetType: string }) {
    return `${scope.region.trim().toUpperCase()}|${scope.assetType.trim().toUpperCase()}`;
  }

  private invalidateUniverseComputationSnapshot(scope?: { region: string; assetType: string }) {
    if (!scope) {
      this.universeSnapshotCache.clear();
      return;
    }
    this.universeSnapshotCache.delete(this.universeSnapshotCacheKey(scope));
  }

  private async cachedUniverseComputationSnapshot(
    scope: { region: string; assetType: string },
    now?: Date
  ): Promise<UniverseComputationSnapshot> {
    if (now) return this.universeComputationSnapshot(scope, now);
    const key = this.universeSnapshotCacheKey(scope);
    const currentTime = Date.now();
    const cached = this.universeSnapshotCache.get(key);
    if (cached?.snapshot && cached.expiresAt > currentTime) return cached.snapshot;
    if (cached?.promise && cached.expiresAt > currentTime) return cached.promise;

    const promise = this.universeComputationSnapshot(scope)
      .then((snapshot) => {
        this.universeSnapshotCache.set(key, {
          snapshot,
          expiresAt: Date.now() + this.universeSnapshotCacheTtlMs,
        });
        return snapshot;
      })
      .catch((error) => {
        const active = this.universeSnapshotCache.get(key);
        if (active?.promise === promise) this.universeSnapshotCache.delete(key);
        throw error;
      });
    this.universeSnapshotCache.set(key, {
      promise,
      expiresAt: currentTime + Math.max(this.universeSnapshotCacheTtlMs, 30000),
    });
    return promise;
  }

  private async tryUniverseComputationSnapshot(
    scope: { region: string; assetType: string },
    now?: Date
  ): Promise<UniverseComputationSnapshot | null> {
    const repositoryAny = this.repository as any;
    if (
      typeof repositoryAny.listStocksForUniverseHealth !== 'function'
      || typeof repositoryAny.priceReadinessStatsForSymbols !== 'function'
    ) {
      return null;
    }
    return this.cachedUniverseComputationSnapshot(scope, now);
  }

  private repairRunSourceFingerprintMetadata(
    sourceFingerprints: Partial<Record<MarketDataRepairRunAction, RepairRunSourceSnapshot>>
  ) {
    return Object.fromEntries(Object.entries(sourceFingerprints).map(([action, source]) => [
      action,
      {
        fingerprint: source?.fingerprint,
        identity: source?.identity,
        error: source?.error,
        warnings: source?.warnings,
      },
    ]));
  }

  private async repairRunStartOffsets(
    scope: { region: string; assetType: string },
    actions: MarketDataRepairRunAction[],
    sourceFingerprints: Partial<Record<MarketDataRepairRunAction, RepairRunSourceSnapshot>>
  ): Promise<{
    offsets: Partial<Record<MarketDataRepairRunAction, number>>;
    warningsByAction: Partial<Record<MarketDataRepairRunAction, string[]>>;
  }> {
    const offsets: Partial<Record<MarketDataRepairRunAction, number>> = {};
    const warningsByAction: Partial<Record<MarketDataRepairRunAction, string[]>> = {};
    const repositoryAny = this.repository as any;
    if (typeof repositoryAny.latestRepairRun !== 'function') return { offsets, warningsByAction };
    const latest = await repositoryAny.latestRepairRun(scope);
    const previousActions = latest?.summaryJson?.actions;
    if (!Array.isArray(previousActions)) return { offsets, warningsByAction };
    for (const action of actions) {
      if (!this.isStableRepairRunSourceAction(action)) continue;
      const previous = previousActions.find((item: any) => item?.action === action);
      const lastSummary = Array.isArray(previous?.summaries) ? previous.summaries[previous.summaries.length - 1] : null;
      const currentSource = sourceFingerprints[action];
      if (currentSource?.error) {
        warningsByAction[action] = [`Source could not be loaded; no persisted offset was reused for ${this.repairRunActionLabel(action)}.`];
        offsets[action] = 0;
        continue;
      }
      const currentFingerprint = currentSource?.fingerprint;
      const previousFingerprint = previous?.sourceFingerprint || lastSummary?.sourceFingerprint;
      if (lastSummary?.hasMore && currentFingerprint && previousFingerprint && currentFingerprint !== previousFingerprint) {
        warningsByAction[action] = [`Source changed; restart from offset 0 for ${this.repairRunActionLabel(action)}.`];
        offsets[action] = 0;
        continue;
      }
      if (!previous?.error && lastSummary?.hasMore && Number.isFinite(Number(lastSummary.nextOffset))) {
        offsets[action] = Math.max(Number(lastSummary.nextOffset), 0);
      }
    }
    return { offsets, warningsByAction };
  }

  private isStableRepairRunSourceAction(action: MarketDataRepairRunAction): boolean {
    return action === 'CATALOG_IDENTITY_REPAIR' || action === 'MANUAL_METADATA_IMPORT';
  }

  private repairRunTotals(
    actions: MarketDataRepairRunActionResult[],
    actionsRequested: MarketDataRepairRunAction[]
  ): MarketDataRepairRunResponse['summary'] {
    return {
      actionsRequested,
      batchesExecuted: actions.reduce((sum, action) => sum + action.batchesExecuted, 0),
      updated: actions.reduce((sum, action) => sum + action.totals.updated, 0),
      skipped: actions.reduce((sum, action) => sum + action.totals.skipped, 0),
      failed: actions.reduce((sum, action) => sum + action.totals.failed, 0),
      noOp: actions.reduce((sum, action) => sum + action.totals.noOp, 0),
      manualRequired: actions.reduce((sum, action) => sum + action.totals.manualRequired, 0),
    };
  }

  private repairRunWarnings(
    health: MarketDataUniverseHealth,
    plan: MarketDataRepairPlan,
    actions: MarketDataRepairRunActionResult[],
    dryRun: boolean
  ): string[] {
    const warnings: string[] = [];
    if (dryRun) warnings.push('Dry run only: no provider, catalog, metadata, or price rows were mutated.');
    if (health.trustStatus !== 'OK') warnings.push(`Today Plan remains blocked because universe trust is ${health.trustStatus}.`);
    if (health.counts.reviewReady === 0) warnings.push('Today Plan remains blocked because review-ready universe is 0.');
    if (plan.providerValidationNeeded > 0) warnings.push(`${plan.providerValidationNeeded} unknown provider validations remain.`);
    if (plan.retryFailedValidations > 0) warnings.push(`${plan.retryFailedValidations} retry-failed provider validations remain.`);
    if ((plan.supportedCatalogIdentityRepairNeeded ?? plan.catalogIdentityRepairNeeded) > 0) warnings.push(`${plan.supportedCatalogIdentityRepairNeeded ?? plan.catalogIdentityRepairNeeded} provider-supported catalog identity repairs remain.`);
    if (plan.businessMetadataAutoRepairable > 0 || plan.businessMetadataRetryEligible > 0) {
      warnings.push(`${plan.businessMetadataAutoRepairable + plan.businessMetadataRetryEligible} provider business metadata rows remain auto-repairable or retry-eligible.`);
    }
    if (plan.manualBusinessMetadataRequired > 0) warnings.push(`${plan.manualBusinessMetadataRequired} rows still need manual business metadata if providers cannot fill them.`);
    if ((plan.supportedPriceBackfillNeeded ?? plan.priceBackfillNeeded) > 0) warnings.push(`${plan.supportedPriceBackfillNeeded ?? plan.priceBackfillNeeded} provider-supported rows still need price backfill.`);
    for (const action of actions) {
      if (action.error) warnings.push(`${action.label}: ${action.error}`);
      if (action.anotherRunNeeded) warnings.push(`${action.label}: another bounded run is needed.`);
    }
    return [...new Set(warnings)].slice(0, 50);
  }

  private expectedNextRepairRunAction(
    plan: MarketDataRepairPlan,
    actions: MarketDataRepairRunAction[]
  ): MarketDataRepairRunAction | null {
    return actions.find((action) => this.repairRunActionCount(action, plan) > 0) || null;
  }

  private hardBlockersFromHealth(health: MarketDataUniverseHealth): MarketDataUniverseHealth['topBlockers'] {
    return (health.topBlockers || []).filter((blocker) => blocker.severity === 'critical');
  }

  private jsonSnapshot<T>(value: T): T {
    return JSON.parse(JSON.stringify(value));
  }

  private isCriticalUniverseBlocker(code: string): boolean {
    return [
      'PROVIDER_UNKNOWN',
      'PROVIDER_UNSUPPORTED',
      'MISSING_LATEST_PRICE',
      'STALE_LATEST_PRICE',
      'INADEQUATE_PRICE_HISTORY',
      'INADEQUATE_ROLLING_PRICE_WINDOW',
      'PRICE_HISTORY_GAPS',
      'MISSING_RECENT_VOLUME',
      'LOW_RECENT_VOLUME_COVERAGE',
      'MISSING_SECTOR',
      'MISSING_INDUSTRY',
      'MISSING_MARKET_CAP',
      'MISSING_ISIN',
      'MISSING_LISTING_DATE',
      'CRITICAL_PROVIDER_SYMBOL_MISMATCH',
    ].includes(code);
  }

  private repairScope(request: Pick<MarketDataRepairRequest, 'region' | 'assetType'>) {
    return {
      region: request.region?.trim().toUpperCase() || 'IN',
      assetType: request.assetType?.trim().toUpperCase() || 'STOCK',
    };
  }

  private mutatingRepairBatch(request: Pick<MarketDataRepairRequest, 'batchSize' | 'limit'>) {
    return {
      batchSize: Math.min(Math.max(Number(request.batchSize ?? request.limit) || 50, 1), 100),
      offset: 0,
    };
  }

  private providerBusinessMetadataRepairConcurrency(request: Pick<MarketDataRepairRequest, 'workerConcurrency'>) {
    return Math.max(1, Math.min(Number(request.workerConcurrency) || this.readPositiveNumber(process.env.MARKET_DATA_PROVIDER_METADATA_REPAIR_CONCURRENCY, 4), 6));
  }

  private priceBackfillConcurrency(request: Pick<MarketDataRepairRequest, 'workerConcurrency'>) {
    return Math.max(1, Math.min(Number(request.workerConcurrency) || this.readPositiveNumber(process.env.MARKET_DATA_PRICE_BACKFILL_CONCURRENCY, 2), 4));
  }

  private priceBackfillProviderThrottleMs() {
    const fallback = process.env.NODE_ENV === 'test' ? 0 : 1250;
    return Math.max(0, Math.min(this.readPositiveNumber(process.env.MARKET_DATA_PRICE_BACKFILL_PROVIDER_THROTTLE_MS, fallback), 10_000));
  }

  private isYahooRateLimitError(message: string): boolean {
    return /too many requests|rate.?limit|\\b429\\b/i.test(message);
  }

  private isAngelOneTokenNotFoundError(message: string): boolean {
    return /angel one .*scrip master .*token .*not found|angel one scrip master did not contain/i.test(message);
  }

  private catalogBackfillConcurrency(request: Pick<CatalogBackfillRequest, 'workerConcurrency' | 'validateProvider'>) {
    const fallback = request.validateProvider
      ? this.readPositiveNumber(process.env.MARKET_DATA_CATALOG_BACKFILL_PROVIDER_CONCURRENCY, 4)
      : this.readPositiveNumber(process.env.MARKET_DATA_CATALOG_BACKFILL_CONCURRENCY, 16);
    const max = request.validateProvider ? 8 : 24;
    return Math.max(1, Math.min(Number(request.workerConcurrency) || fallback, max));
  }

  private stableSourceRepairBatch(request: Pick<MarketDataRepairRequest, 'batchSize' | 'limit' | 'offset'>) {
    return {
      batchSize: Math.min(Math.max(Number(request.batchSize ?? request.limit) || 100, 1), 250),
      offset: Math.max(Number(request.offset) || 0, 0),
    };
  }

  private defaultCatalogIdentitySource(scope: { region: string; assetType: string }): CatalogSource {
    if (scope.region === 'IN' && scope.assetType === 'STOCK') return 'NSE_EQUITY_SECURITIES';
    return 'NSE_EQUITY_SECURITIES';
  }

  private repairSourceIdentity(input: {
    action: MarketDataRepairRunAction;
    catalogSource?: string;
    importMode?: string;
    sourceKey?: string;
    sourceUrl?: string | null;
    urlSource?: string | null;
    rawText: string;
    rows?: unknown[];
  }): { fingerprint: string; identity: MarketDataRepairSourceIdentity } {
    const contentSha256 = this.sha256(input.rawText);
    const rowsSha256 = this.sha256(JSON.stringify(input.rows || []));
    const identity: MarketDataRepairSourceIdentity = {
      action: input.action,
      catalogSource: input.catalogSource,
      importMode: input.importMode,
      sourceKey: input.sourceKey,
      sourceUrl: input.sourceUrl ?? null,
      urlSource: input.urlSource ?? null,
      rowCount: input.rows?.length ?? 0,
      contentSha256,
      rowsSha256,
    };
    return {
      identity,
      fingerprint: this.sha256(JSON.stringify(identity)),
    };
  }

  private sha256(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private async loadCatalogIdentityRows(catalogSource: CatalogSource, csvText?: string, importMode?: MarketDataRepairRequest['importMode']): Promise<{
    rows: CreateStockRequest[];
    warnings: string[];
    downloaded: boolean;
    sourceFingerprint: string;
    sourceIdentity: MarketDataRepairSourceIdentity;
  }> {
    const warnings: string[] = [];
    let resolvedCsvText = csvText || '';
    let downloadInfo: Awaited<ReturnType<MarketDataFoundationService['downloadConfiguredCatalogCsv']>> | null = null;
    let resolvedImportMode: MarketDataRepairRequest['importMode'] = importMode;
    try {
      if (importMode === 'MANUAL_CSV' && !resolvedCsvText.trim()) {
        throw new Error('Manual CSV catalog identity repair requires csvText.');
      }
      if (importMode === 'CONFIGURED_URL' || !resolvedCsvText.trim()) {
        resolvedImportMode = 'CONFIGURED_URL';
        const sourceConfig = getCatalogSourceConfig(catalogSource);
        if (!sourceConfig?.supportsConfiguredUrl) {
          throw new Error(`Catalog identity repair requires CSV text or a configured URL for ${catalogSource}.`);
        }
        downloadInfo = await this.downloadConfiguredCatalogCsv(catalogSource);
        resolvedCsvText = downloadInfo.csvText;
      } else {
        resolvedImportMode = 'MANUAL_CSV';
      }
      this.validateCsvColumns(catalogSource, resolvedCsvText);
      const rows = this.catalogRowsForSource(catalogSource, resolvedCsvText, warnings);
      const sourceConfig = getCatalogSourceConfig(catalogSource);
      const sourceIdentity = this.repairSourceIdentity({
        action: 'CATALOG_IDENTITY_REPAIR',
        catalogSource,
        importMode: resolvedImportMode || 'MANUAL_CSV',
        sourceKey: resolvedImportMode === 'CONFIGURED_URL'
          ? `${sourceConfig?.urlSource || 'NONE'}:${sourceConfig?.url || ''}`
          : 'MANUAL_CSV',
        sourceUrl: resolvedImportMode === 'CONFIGURED_URL' ? sourceConfig?.url || null : null,
        urlSource: sourceConfig?.urlSource || null,
        rawText: resolvedCsvText,
        rows,
      });
      return {
        rows,
        warnings,
        downloaded: Boolean(downloadInfo),
        sourceFingerprint: sourceIdentity.fingerprint,
        sourceIdentity: sourceIdentity.identity,
      };
    } finally {
      if (downloadInfo) {
        await this.cleanupCatalogTempFile(downloadInfo).catch((error) => {
          warnings.push(`${catalogSource}: temporary catalog file cleanup failed: ${error instanceof Error ? error.message : 'unknown error'}`);
        });
      }
    }
  }

  private stocksByIdentityKey(stocks: any[]) {
    const byKey = new Map<string, any[]>();
    for (const stock of stocks) {
      for (const key of this.identityKeysForStock(stock)) {
        byKey.set(key, [...(byKey.get(key) || []), stock]);
      }
    }
    return byKey;
  }

  private actionableCatalogIdentityWorkItems(
    rows: CreateStockRequest[],
    stocksByKey: Map<string, any[]>
  ): CatalogIdentityWorkItem[] {
    const workItems: CatalogIdentityWorkItem[] = [];
    for (const row of rows) {
      for (const stock of this.findStocksForCatalogIdentityRow(row, stocksByKey)) {
        const filledFields = this.repairedCatalogIdentityFields(stock, row);
        if (filledFields.length === 0) continue;
        workItems.push({ stock, row, filledFields });
      }
    }
    return workItems;
  }

  private findStockForCatalogIdentityRow(row: CreateStockRequest, stocksByKey: Map<string, any[]>) {
    for (const key of this.identityKeysForCatalogRow(row)) {
      const stocks = this.uniqueStocks(stocksByKey.get(key) || []);
      if (stocks.length === 1) return stocks[0];
      if (stocks.length > 1) return null;
    }
    return null;
  }

  private findStocksForCatalogIdentityRow(row: CreateStockRequest, stocksByKey: Map<string, any[]>): any[] {
    for (const key of this.identityKeysForCatalogRow(row)) {
      const stocks = this.uniqueStocks(stocksByKey.get(key) || []);
      if (stocks.length === 0) continue;
      if (stocks.length === 1) return stocks;
      const safeMatches = this.safeDuplicateCatalogIdentityMatches(row, stocks);
      if (safeMatches.length > 0) return safeMatches;
      return [];
    }
    return [];
  }

  private safeDuplicateCatalogIdentityMatches(row: CreateStockRequest, stocks: any[]): any[] {
    const rowExchange = this.identityText(row.exchange);
    const rowProviderSymbol = this.identityText(row.providerSymbol);
    const rowSourceSymbol = this.identityText(row.sourceSymbol || row.symbol || row.displaySymbol);
    return stocks.filter((stock) => {
      const stockExchange = this.identityText(stock.exchange);
      if (rowExchange && stockExchange && rowExchange !== stockExchange) return false;
      const stockProviderSymbol = this.identityText(stock.providerSymbol);
      if (rowProviderSymbol && stockProviderSymbol === rowProviderSymbol) return true;
      const stockSourceSymbol = this.identityText(stock.sourceSymbol || stock.symbol || stock.displaySymbol);
      return Boolean(rowSourceSymbol && stockSourceSymbol && this.baseSymbolFromProviderSymbol(stockSourceSymbol) === this.baseSymbolFromProviderSymbol(rowSourceSymbol));
    });
  }

  private identityKeysForCatalogRow(row: Partial<CreateStockRequest>): string[] {
    const keys: string[] = [];
    const exchange = this.identityText(row.exchange);
    const region = this.identityText(row.region);
    const assetType = this.identityAssetType(row.assetType);
    const providerSymbol = this.identityText(row.providerSymbol);
    const sourceSymbol = this.identityText(row.sourceSymbol);
    const symbol = this.identityText(row.symbol || row.displaySymbol);
    const name = this.identityText(row.name);
    if (providerSymbol && exchange) keys.push(`provider:${exchange}:${providerSymbol}`);
    if (sourceSymbol && exchange) keys.push(`source:${exchange}:${this.baseSymbolFromProviderSymbol(sourceSymbol)}`);
    if (symbol && region && assetType) keys.push(`symbol:${region}:${assetType}:${this.baseSymbolFromProviderSymbol(symbol)}`);
    if (name && exchange) keys.push(`name:${exchange}:${name}`);
    return keys;
  }

  private identityKeysForStock(stock: any): string[] {
    const keys: string[] = [];
    const exchange = this.identityText(stock.exchange);
    const region = this.identityText(stock.region);
    const assetType = this.identityAssetType(stock.assetType);
    const providerSymbol = this.identityText(stock.providerSymbol);
    const sourceSymbol = this.identityText(stock.sourceSymbol);
    const symbol = this.identityText(stock.symbol || stock.displaySymbol);
    const name = this.identityText(stock.name);
    if (providerSymbol && exchange) keys.push(`provider:${exchange}:${providerSymbol}`);
    if (sourceSymbol && exchange) keys.push(`source:${exchange}:${this.baseSymbolFromProviderSymbol(sourceSymbol)}`);
    if (symbol && region && assetType) keys.push(`symbol:${region}:${assetType}:${this.baseSymbolFromProviderSymbol(symbol)}`);
    if (name && exchange) keys.push(`name:${exchange}:${name}`);
    return keys;
  }

  private uniqueStocks(stocks: any[]) {
    const byId = new Map<string, any>();
    for (const stock of stocks) {
      byId.set(stock.id || stock.symbol, stock);
    }
    return [...byId.values()];
  }

  private identityText(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim().toUpperCase();
    return trimmed.length > 0 ? trimmed : null;
  }

  private identityAssetType(value: unknown): string {
    const normalized = typeof value === 'string' ? value.trim().toUpperCase() : '';
    if (!normalized || normalized === 'EQUITY') return 'STOCK';
    return normalized;
  }

  private needsCatalogIdentityRepair(stock: any): boolean {
    return this.isBlank(stock.exchange)
      || this.isBlank(stock.providerSymbol)
      || this.isBlank(stock.sourceSymbol)
      || this.isBlank(stock.displaySymbol)
      || this.isBlank(stock.catalogSource)
      || this.isBlank(stock.isin)
      || !stock.ipoDate;
  }

  private repairedCatalogIdentityFields(stock: any, row: CreateStockRequest): string[] {
    const repaired: string[] = [];
    if (this.isBlank(stock.exchange) && !this.isBlank(row.exchange)) repaired.push('exchange');
    if (this.isBlank(stock.providerSymbol) && !this.isBlank(row.providerSymbol)) repaired.push('providerSymbol');
    if (this.isBlank(stock.sourceSymbol) && !this.isBlank(row.sourceSymbol)) repaired.push('sourceSymbol');
    if (this.isBlank(stock.displaySymbol) && !this.isBlank(row.displaySymbol)) repaired.push('displaySymbol');
    if (this.isBlank(stock.catalogSource) && !this.isBlank(row.catalogSource)) repaired.push('catalogSource');
    if (this.isBlank(stock.isin) && !this.isBlank(row.isin)) repaired.push('isin');
    if (!stock.ipoDate && row.ipoDate) repaired.push('ipoDate');
    return repaired;
  }

  private emptyRepairSummary(
    scope: { region: string; assetType: string },
    batch: { batchSize: number; offset: number },
    totalCount: number,
    stableMutatingQueue = false
  ): MarketDataRepairSummary {
    const nextOffset = batch.offset + batch.batchSize;
    const hasMore = stableMutatingQueue ? totalCount > batch.batchSize : nextOffset < totalCount;
    return {
      scope,
      processedCount: 0,
      totalCount,
      batchSize: batch.batchSize,
      offset: batch.offset,
      nextOffset: hasMore ? (stableMutatingQueue ? 0 : nextOffset) : null,
      hasMore,
      updated: 0,
      skipped: 0,
      failed: 0,
      warnings: [],
      durationMs: 0,
    };
  }

  private providerDisabledRepairSummary(request: MarketDataRepairRequest, message: string): MarketDataRepairSummary {
    const started = Date.now();
    const scope = this.repairScope(request);
    const batch = this.mutatingRepairBatch(request);
    const summary = this.emptyRepairSummary(scope, batch, 0, true);
    (summary as any).warningCount = 1;
    summary.warnings.push(`${NSE_BSE_ONLY_PROVIDER_DISABLED_CODE}: ${message}`);
    this.finishRepairSummary(summary, started);
    return summary;
  }

  private providerDisabledError(operation: string) {
    const error = new Error(`${operation} disabled: ${NSE_BSE_ONLY_PROVIDER_DISABLED_MESSAGE}`);
    (error as any).code = NSE_BSE_ONLY_PROVIDER_DISABLED_CODE;
    return error;
  }

  private finishRepairSummary(summary: MarketDataRepairSummary, started: number) {
    summary.durationMs = Date.now() - started;
    summary.warnings = summary.warnings.slice(0, 25);
  }

  private needsMetadataEnrichment(stock: any): boolean {
    return !this.hasValidMetadataValue(stock.sector)
      || !this.hasValidMetadataValue(stock.industry)
      || !this.hasValidMarketCap(stock.marketCap)
      || !stock.isin
      || !stock.ipoDate;
  }

  private needsBusinessMetadataRepair(stock: any): boolean {
    return !this.hasValidMetadataValue(stock.sector)
      || !this.hasValidMetadataValue(stock.industry)
      || !this.hasValidMarketCap(stock.marketCap);
  }

  private missingBusinessMetadataFields(stock: any): string[] {
    const missing: string[] = [];
    if (!this.hasValidMetadataValue(stock.sector)) missing.push('sector');
    if (!this.hasValidMetadataValue(stock.industry)) missing.push('industry');
    if (!this.hasValidMarketCap(stock.marketCap)) missing.push('marketCap');
    return missing;
  }

  private businessMetadataBlockerDiagnostics(stocks: any[]): NonNullable<MarketDataRepairPlan['businessMetadataBlockerDiagnostics']> {
    const byMissingFieldSet = new Map<string, number>();
    let unresolvedTotal = 0;
    let missingSector = 0;
    let missingIndustry = 0;
    let missingMarketCap = 0;

    for (const stock of stocks) {
      if (stock.isActive === false || stock.isDelisted === true) continue;
      if (normalizeProviderStatus(stock.providerSupportStatus) !== 'SUPPORTED') continue;
      const missing = this.missingBusinessMetadataFields(stock);
      if (missing.length === 0) continue;
      unresolvedTotal += 1;
      if (missing.includes('sector')) missingSector += 1;
      if (missing.includes('industry')) missingIndustry += 1;
      if (missing.includes('marketCap')) missingMarketCap += 1;
      const key = missing.join('+');
      byMissingFieldSet.set(key, (byMissingFieldSet.get(key) || 0) + 1);
    }

    return {
      requiredFields: ['sector', 'industry', 'marketCap'],
      unresolvedTotal,
      missingSector,
      missingIndustry,
      missingMarketCap,
      byMissingFieldSet: Object.fromEntries(
        [...byMissingFieldSet.entries()].sort(([a], [b]) => a.localeCompare(b))
      ),
    };
  }

  private providerBusinessMetadataHasUsefulFields(providerData: any): boolean {
    if (!providerData || providerData.dataStatus === 'MISSING') return false;
    return this.hasValidMetadataValue(providerData.sector)
      || this.hasValidMetadataValue(providerData.industry)
      || this.hasValidMarketCap(providerData.marketCap);
  }

  private providerBusinessMetadataUpdate(stock: any, providerData: any): Partial<CreateStockRequest> {
    const update: Partial<CreateStockRequest> = {
      source: stock.source || 'database',
    };
    if (!this.hasValidMetadataValue(stock.sector) && this.hasValidMetadataValue(providerData.sector)) {
      update.sector = String(providerData.sector).trim();
      update.source = 'yahoo';
    }
    if (!this.hasValidMetadataValue(stock.industry) && this.hasValidMetadataValue(providerData.industry)) {
      update.industry = String(providerData.industry).trim();
      update.source = 'yahoo';
    }
    if (!this.hasValidMarketCap(stock.marketCap) && this.hasValidMarketCap(providerData.marketCap)) {
      update.marketCap = Number(providerData.marketCap);
      update.source = 'yahoo';
    }
    return update;
  }

  private providerBusinessStateAfterRepair(
    stockAfterRepair: any,
    fieldsFilled: string[]
  ): {
    stateStatus: MarketDataRepairStateStatus;
    attemptStatus: MarketDataProviderBusinessRepairStatus;
    remainingFields: string[];
    manualRequiredReason?: string;
  } {
    const remainingFields = this.missingBusinessMetadataFields(stockAfterRepair);
    if (remainingFields.length === 0) {
      return {
        stateStatus: 'RESOLVED',
        attemptStatus: 'SUCCESS',
        remainingFields,
      };
    }
    const manualRequiredReason = `Missing business metadata after repair: ${remainingFields.join(', ')}`;
    return {
      stateStatus: 'MANUAL_REQUIRED',
      attemptStatus: fieldsFilled.length > 0 ? 'PARTIAL_SUCCESS' : 'NO_FIELDS_FILLED',
      remainingFields,
      manualRequiredReason,
    };
  }

  private async recordProviderBusinessRepairAttempt(
    stock: any,
    scope: { region: string; assetType: string },
    status: MarketDataProviderBusinessRepairStatus,
    fieldsFilled: Record<string, number>,
    error?: string,
    manualRequiredReason?: string,
    stateStatusOverride?: MarketDataRepairStateStatus
  ) {
    const repositoryAny = this.repository as any;
    if (typeof repositoryAny.recordRepairAttempt !== 'function') return;
    const attempt = await repositoryAny.recordRepairAttempt({
      stockId: stock.id,
      region: scope.region,
      assetType: scope.assetType,
      repairType: 'PROVIDER_BUSINESS_METADATA',
      status,
      provider: 'yahoo',
      fieldsFilledJson: fieldsFilled,
      error,
      manualRequiredReason,
    });
    if (typeof repositoryAny.upsertRepairState !== 'function') return;
    const stateStatus = stateStatusOverride ?? this.providerBusinessCurrentStateForAttempt(status);
    await repositoryAny.upsertRepairState({
      stockId: stock.id,
      region: scope.region,
      assetType: scope.assetType,
      repairType: 'PROVIDER_BUSINESS_METADATA',
      status: stateStatus,
      provider: 'yahoo',
      lastAttemptId: attempt?.id ?? null,
      fieldsFilledJson: fieldsFilled,
      error,
      manualRequiredReason,
      nextRetryAt: stateStatus === 'FAILED_RETRYABLE' ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null,
      resolvedAt: stateStatus === 'RESOLVED' ? new Date() : null,
    });
  }

  private providerBusinessCurrentStateForAttempt(status: MarketDataProviderBusinessRepairStatus): MarketDataRepairStateStatus {
    if (status === 'SUCCESS') return 'RESOLVED';
    if (status === 'FAILED') return 'FAILED_RETRYABLE';
    if (status === 'SKIPPED_RECENT_ATTEMPT') return 'RETRY_COOLDOWN';
    return 'MANUAL_REQUIRED';
  }

  private async recordPriceBackfillRepairAttempt(
    stock: any,
    scope: { region: string; assetType: string },
    status: string,
    fieldsFilled: Record<string, number>,
    error?: string | null,
    manualRequiredReason?: string | null,
    stateStatus: MarketDataRepairStateStatus = 'FAILED_RETRYABLE'
  ) {
    const repositoryAny = this.repository as any;
    if (typeof repositoryAny.recordRepairAttempt !== 'function') return;
    const attempt = await repositoryAny.recordRepairAttempt({
      stockId: stock.id,
      region: scope.region,
      assetType: scope.assetType,
      repairType: 'PRICE_BACKFILL',
      status,
      provider: 'yahoo',
      fieldsFilledJson: fieldsFilled,
      error,
      manualRequiredReason,
    });
    if (typeof repositoryAny.upsertRepairState !== 'function') return;
    await repositoryAny.upsertRepairState({
      stockId: stock.id,
      region: scope.region,
      assetType: scope.assetType,
      repairType: 'PRICE_BACKFILL',
      status: stateStatus,
      provider: 'yahoo',
      lastAttemptId: attempt?.id ?? null,
      fieldsFilledJson: fieldsFilled,
      error,
      manualRequiredReason,
      nextRetryAt: stateStatus === 'FAILED_RETRYABLE' ? new Date(Date.now() + 12 * 60 * 60 * 1000) : null,
      resolvedAt: stateStatus === 'RESOLVED' ? new Date() : null,
    });
  }

  private async recordManualMetadataRepairSuccess(stock: any, scope: { region: string; assetType: string }, filledFields: string[]) {
    const repositoryAny = this.repository as any;
    if (typeof repositoryAny.recordRepairAttempt !== 'function') return;
    const fieldsFilled = Object.fromEntries(filledFields.map((field) => [field, 1]));
    const businessState = this.providerBusinessStateAfterRepair(
      stock,
      filledFields.filter((field) => ['sector', 'industry', 'marketCap'].includes(field))
    );
    const attempt = await repositoryAny.recordRepairAttempt({
      stockId: stock.id,
      region: scope.region,
      assetType: scope.assetType,
      repairType: 'MANUAL_METADATA_IMPORT',
      status: businessState.attemptStatus,
      provider: 'manual_csv',
      fieldsFilledJson: fieldsFilled,
      manualRequiredReason: businessState.manualRequiredReason,
    });
    if (typeof repositoryAny.upsertRepairState !== 'function') return;
    await repositoryAny.upsertRepairState({
      stockId: stock.id,
      region: scope.region,
      assetType: scope.assetType,
      repairType: 'PROVIDER_BUSINESS_METADATA',
      status: businessState.stateStatus,
      provider: 'manual_csv',
      lastAttemptId: attempt?.id ?? null,
      fieldsFilledJson: fieldsFilled,
      error: null,
      manualRequiredReason: businessState.manualRequiredReason ?? null,
      nextRetryAt: null,
      resolvedAt: businessState.stateStatus === 'RESOLVED' ? new Date() : null,
    });
  }

  private missingRepairFields(stock: any): string[] {
    const missing: string[] = [];
    if (!this.hasValidMetadataValue(stock.sector)) missing.push('sector');
    if (!this.hasValidMetadataValue(stock.industry)) missing.push('industry');
    if (!this.hasValidMarketCap(stock.marketCap)) missing.push('marketCap');
    if (!stock.isin) missing.push('isin');
    if (!stock.ipoDate) missing.push('ipoDate');
    return missing;
  }

  private providerMetadataHasUsefulFields(providerData: any): boolean {
    if (!providerData) return false;
    if (providerData.dataStatus === 'MISSING') return false;
    return ['companyName', 'exchange', 'sector', 'industry', 'marketCap']
      .some((field) => providerData[field] !== null && providerData[field] !== undefined && providerData[field] !== '');
  }

  private repairedMetadataFields(stock: any, update: Partial<CreateStockRequest>, missingBefore: string[]): string[] {
    return missingBefore.filter((field) => {
      const before = stock[field];
      const after = (update as any)[field];
      if (after === null || after === undefined || after === '') return false;
      if (field === 'marketCap') return !this.hasValidMarketCap(before) && this.hasValidMarketCap(after);
      return !before;
    });
  }

  private metadataOverridesFromCsv(csvText: string, catalogSource: string): Map<string, { isin?: string | null; ipoDate?: Date | null }> {
    const overrides = new Map<string, { isin?: string | null; ipoDate?: Date | null }>();
    if (!csvText.trim()) return overrides;
    const warnings: string[] = [];
    for (const row of this.catalogRowsForSource(String(catalogSource || 'NSE_EQUITY_SECURITIES').toUpperCase(), csvText, warnings)) {
      const keys = [row.sourceSymbol, row.symbol, row.providerSymbol, row.displaySymbol]
        .filter((value): value is string => Boolean(value))
        .map((value) => this.baseSymbolFromProviderSymbol(value));
      for (const key of keys) {
        overrides.set(key, { isin: row.isin || null, ipoDate: row.ipoDate || null });
      }
    }
    return overrides;
  }

  private async priceBackfillCandidates(
    scope: { region: string; assetType: string },
    excludeStockIds: Set<string> = new Set(),
    options: { includeRetryableBlocked?: boolean } = {}
  ): Promise<PriceBackfillCandidate[]> {
    const stocks = await this.repository.listStocksForUniverseHealth(scope);
    const { readinessBySymbol, statsBySymbol } = await this.universeReadinessAndStatsForStocks(stocks, scope);
    const validationWindow = this.providerValidationWindow(scope);
    const blockedStockIds = await this.blockedPriceBackfillStockIds(scope, options.includeRetryableBlocked === true);
    return stocks
      .flatMap((stock): PriceBackfillCandidate[] => {
        if (stock.isActive === false || stock.isDelisted === true) return [];
        if (stock.id && excludeStockIds.has(stock.id)) return [];
        if (normalizeProviderStatus(stock.providerSupportStatus) !== 'SUPPORTED') return [];
        if (blockedStockIds.has(stock.id)) return [];
        const readiness = readinessBySymbol.get(stock.symbol);
        if (!readiness) return [];
        const historyDiagnostics = this.requiredHistoryDiagnostics(stock, validationWindow, this.priceStatsForStock(statsBySymbol, stock));
        if (readiness.priceReadiness === 'READY' && historyDiagnostics.requiredHistoryComplete) return [];
        return [{ stock, readiness, historyDiagnostics }];
      })
      .sort((left, right) => {
        const leftPriority = this.priceBackfillCandidatePriority(left.readiness);
        const rightPriority = this.priceBackfillCandidatePriority(right.readiness);
        if (leftPriority !== rightPriority) return leftPriority - rightPriority;
        return String(left.stock.symbol).localeCompare(String(right.stock.symbol));
      });
  }

  private async countPriceBackfillRunCandidates(
    scope: { region: string; assetType: string },
    request: PriceBackfillRunRequest
  ): Promise<number> {
    if (request.policy === 'INCREMENTAL_LATEST_ONLY') {
      const latestCompletedDate = latestCompletedTradingDateForRegion(scope.region);
      const candidates = await this.priceBackfillCandidates(scope);
      return this.filterPriceBackfillCandidatesForPolicy(candidates, request.policy, latestCompletedDate).length;
    }

    const repairPlan = await this.repairPlan(scope);
    return repairPlan.supportedPriceBackfillNeeded ?? repairPlan.priceBackfillNeeded ?? 0;
  }

  private async applyOfficialEodBulkForIncrementalPriceBackfill(input: {
    policy: MarketDataRepairRequest['policy'];
    scope: { region: string; assetType: string };
    targetTradingDate: string;
    candidates: PriceBackfillCandidate[];
    page: PriceBackfillCandidate[];
    summary: MarketDataRepairSummary;
  }): Promise<PriceBackfillCandidate[]> {
    if (input.policy !== 'INCREMENTAL_LATEST_ONLY' || input.page.length === 0) return input.page;

    const officialCandidates = input.candidates.length > 0 ? input.candidates : input.page;
    const tasks = officialCandidates.map((candidate) => this.priceBackfillCandidateTask(candidate));
    const officialBulk = await this.tryOfficialNseEodBulkLatestCandle({
      region: input.scope.region,
      assetType: input.scope.assetType,
      targetTradingDate: input.targetTradingDate,
      tasks,
    });
    input.summary.officialEodBulk = officialBulk.evidence;
    if (officialBulk.evidence.sourceFingerprint) {
      input.summary.sourceFingerprint = officialBulk.evidence.sourceFingerprint;
    }
    for (const warning of officialBulk.evidence.warnings || []) {
      input.summary.warnings.push(warning);
    }
    if (officialBulk.evidence.fallbackReason && !['OFFICIAL_EOD_DISABLED', 'OFFICIAL_EOD_NO_TASKS'].includes(officialBulk.evidence.fallbackReason)) {
      input.summary.warnings.push(`Official NSE EOD bulk fallback: ${officialBulk.evidence.fallbackReason}`);
    }

    if (officialBulk.matchedTaskIds.size === 0) return input.page;

    const byId = new Map(officialCandidates.map((candidate) => [String(candidate.stock.id), candidate]));
    for (const taskId of officialBulk.matchedTaskIds) {
      const candidate = byId.get(taskId);
      const taskSummary = officialBulk.summaryByTaskId.get(taskId);
      if (!candidate || !taskSummary) continue;

      input.summary.processedCount += 1;
      input.summary.processedStockIds!.push(taskId);
      input.summary.priceRowsReceived = (input.summary.priceRowsReceived || 0) + (taskSummary.rowsReceived || 0);
      input.summary.priceRowsInserted = (input.summary.priceRowsInserted || 0) + (taskSummary.rowsInserted || 0);
      input.summary.priceRowsUpdated = (input.summary.priceRowsUpdated || 0) + (taskSummary.rowsUpdated || 0);
      input.summary.priceRowsNoOp = (input.summary.priceRowsNoOp || 0) + (taskSummary.rowsNoOp || 0);
      if ((taskSummary.rowsInserted || 0) > 0 || (taskSummary.rowsUpdated || 0) > 0) {
        input.summary.updated += 1;
      } else if ((taskSummary.rowsNoOp || 0) > 0) {
        input.summary.noOp = (input.summary.noOp || 0) + 1;
      } else {
        input.summary.skipped += 1;
      }
      if ((taskSummary.warningCount || 0) > 0) {
        input.summary.warnings.push(...(taskSummary.warnings || []));
      }
      this.addPriceBackfillCoverageSample(input.summary, candidate, null);
    }

    return input.page.filter((candidate) => !officialBulk.matchedTaskIds.has(String(candidate.stock.id)));
  }

  private priceBackfillCandidateTask(candidate: PriceBackfillCandidate): StockSyncTask {
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

  private filterPriceBackfillCandidatesForPolicy(
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

  private async repairStatesByStockId(
    scope: { region: string; assetType: string },
    stocks: any[]
  ): Promise<Map<string, any[]> | undefined> {
    const repositoryAny = this.repository as any;
    if (typeof repositoryAny.listRepairStatesForStocks !== 'function') return undefined;
    return repositoryAny.listRepairStatesForStocks(
      stocks.map((stock) => stock.id),
      {
        ...scope,
        repairTypes: ['PROVIDER_VALIDATION', 'PROVIDER_BUSINESS_METADATA', 'PRICE_BACKFILL'],
      }
    );
  }

  private blockedPriceBackfillStockIdsFromStates(
    repairStatesByStockId: Map<string, any[]> | undefined,
    now = new Date()
  ): Set<string> | null {
    if (!repairStatesByStockId) return null;
    const blocked = new Set<string>();
    for (const [stockId, states] of repairStatesByStockId.entries()) {
      const priceState = states.find((state) => state.repairType === 'PRICE_BACKFILL');
      if (!priceState) continue;
      if (
        priceState.status === 'MANUAL_REQUIRED'
        || priceState.status === 'RETRY_COOLDOWN'
        || (priceState.status === 'FAILED_RETRYABLE' && priceState.nextRetryAt instanceof Date && priceState.nextRetryAt > now)
      ) {
        blocked.add(stockId);
      }
    }
    return blocked;
  }

  private repairStateForStock(
    repairStatesByStockId: Map<string, any[]> | undefined,
    stockId: string,
    repairType: string
  ) {
    return repairStatesByStockId?.get(stockId)?.find((state) => state.repairType === repairType) || null;
  }

  private priceBackfillBlockReason(
    repairStatesByStockId: Map<string, any[]> | undefined,
    stockId: string,
    blockedWithoutState: boolean
  ): 'manual' | 'retry' | null {
    const state = this.repairStateForStock(repairStatesByStockId, stockId, 'PRICE_BACKFILL');
    if (!state) return blockedWithoutState ? 'manual' : null;
    if (state.status === 'MANUAL_REQUIRED') return 'manual';
    if (state.status === 'RETRY_COOLDOWN') return 'retry';
    if (state.status === 'FAILED_RETRYABLE') {
      if (!state.nextRetryAt) return 'retry';
      const nextRetryAt = state.nextRetryAt instanceof Date ? state.nextRetryAt : new Date(state.nextRetryAt);
      return Number.isNaN(nextRetryAt.getTime()) || nextRetryAt > new Date() ? 'retry' : null;
    }
    return null;
  }

  private retryStateBucket(state: any, now = new Date()): 'manual' | 'blocked' | 'eligible' | 'cooldown' | null {
    if (!state) return null;
    if (state.status === 'MANUAL_REQUIRED') return 'manual';
    if (state.status === 'RETRY_COOLDOWN') return 'cooldown';
    if (state.status === 'FAILED_RETRYABLE') {
      return state.nextRetryAt instanceof Date && state.nextRetryAt > now ? 'blocked' : 'eligible';
    }
    return null;
  }

  private repairPlanCountsFromSnapshot(snapshot: UniverseComputationSnapshot) {
    const now = new Date();
    let businessMetadataQueueRepairable = 0;
    let businessMetadataManualRequired = 0;
    let businessMetadataRetryBlocked = 0;
    let businessMetadataRetryEligible = 0;
    let businessMetadataRetryCooldown = 0;
    let providerRetryEligible = 0;
    let providerRetryBlocked = 0;
    let providerManualRepairRequired = 0;
    let nextProviderRetryAt: Date | null = null;

    for (const stock of snapshot.stocks) {
      if (stock.isActive === false || stock.isDelisted === true) continue;
      const providerStatus = normalizeProviderStatus(stock.providerSupportStatus);
      const providerState = this.repairStateForStock(snapshot.repairStatesByStockId, stock.id, 'PROVIDER_VALIDATION');
      const providerBucket = this.retryStateBucket(providerState, now);
      if (providerBucket === 'manual') providerManualRepairRequired += 1;
      if (providerStatus === 'VALIDATION_FAILED') {
        if (providerBucket === 'blocked' || providerBucket === 'cooldown') providerRetryBlocked += 1;
        if (providerBucket === 'eligible') providerRetryEligible += 1;
        if (providerState?.nextRetryAt instanceof Date && providerState.nextRetryAt > now) {
          nextProviderRetryAt = !nextProviderRetryAt || providerState.nextRetryAt < nextProviderRetryAt
            ? providerState.nextRetryAt
            : nextProviderRetryAt;
        }
      }

      if (providerStatus !== 'SUPPORTED' || !this.needsBusinessMetadataRepair(stock)) continue;
      const businessState = this.repairStateForStock(snapshot.repairStatesByStockId, stock.id, 'PROVIDER_BUSINESS_METADATA');
      const businessBucket = this.retryStateBucket(businessState, now);
      if (businessBucket === 'manual') {
        businessMetadataManualRequired += 1;
        continue;
      }
      if (businessBucket === 'blocked') {
        businessMetadataRetryBlocked += 1;
        continue;
      }
      if (businessBucket === 'cooldown') {
        businessMetadataRetryCooldown += 1;
        continue;
      }
      businessMetadataQueueRepairable += 1;
      if (businessBucket === 'eligible') businessMetadataRetryEligible += 1;
    }

    const businessMetadataAutoRepairable = Math.max(businessMetadataQueueRepairable - businessMetadataRetryEligible, 0);
    return {
      businessMetadataQueueRepairable,
      businessMetadataAutoRepairable,
      businessMetadataManualRequired,
      businessMetadataRetryBlocked,
      businessMetadataRetryEligible,
      businessMetadataRecentlyAttempted: businessMetadataManualRequired + businessMetadataRetryBlocked + businessMetadataRetryCooldown,
      providerRetryBlocked,
      providerManualRepairRequired,
      nextProviderRetryAtMin: nextProviderRetryAt ? nextProviderRetryAt.toISOString() : null,
      providerRetryValidationNeeded: (providerValidationFailed: number) => {
        const knownStateTotal = providerRetryEligible + providerRetryBlocked + providerManualRepairRequired;
        return providerRetryEligible + Math.max(providerValidationFailed - knownStateTotal, 0);
      },
    };
  }

  private async blockedPriceBackfillStockIds(
    scope: { region: string; assetType: string },
    includeRetryableBlocked = false
  ): Promise<Set<string>> {
    const repositoryAny = this.repository as any;
    if (typeof repositoryAny.listBlockedPriceBackfillStockIds !== 'function') return new Set();
    const ids = await repositoryAny.listBlockedPriceBackfillStockIds({
      ...scope,
      includeRetryable: includeRetryableBlocked,
    });
    return new Set(ids);
  }

  private priceBackfillCandidatePriority(readiness: InstrumentUniverseReadiness): number {
    if (!readiness.latestPriceDate) return 0;
    if (readiness.priceHistoryBars < 120) return 1;
    if (readiness.priceHistoryBars < 200) return 2;
    if (readiness.priceHistoryBars < 252) return 3;
    if (readiness.readinessBlockers.includes('STALE_LATEST_PRICE')) return 4;
    return 5;
  }

  private priceBackfillFetchPlan(
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
        startDate: this.historyStartDate(candidate.historyDiagnostics.requiredHistoryStartDate, latestCompletedDate),
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

  private assignPriceBackfillDepthDiagnostics(summary: MarketDataRepairSummary, candidates: PriceBackfillCandidate[]) {
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

  private addPriceBackfillCoverageSample(
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

  private historyStartDate(requiredHistoryStartDate: string, latestCompletedDate: string): Date {
    const start = new Date(`${requiredHistoryStartDate}T00:00:00.000Z`);
    if (Number.isNaN(start.getTime())) return this.defaultBackfillStartDate(latestCompletedDate);
    start.setUTCHours(0, 0, 0, 0);
    return start;
  }

  private endOfTradingDateUtc(tradingDate: string | null): Date {
    const safeDate = tradingDate || new Date().toISOString().slice(0, 10);
    return new Date(`${safeDate}T23:59:59.999Z`);
  }

  private isBlank(value: unknown): boolean {
    return value === null || value === undefined || (typeof value === 'string' && value.trim().length === 0);
  }

  private hasValidMetadataValue(value: unknown): value is string {
    if (typeof value !== 'string') return false;
    const normalized = value.trim().toUpperCase();
    return Boolean(normalized) && !['UNKNOWN', 'N/A', 'NA', 'NONE', 'NULL', '-', '--'].includes(normalized);
  }

  private hasValidMarketCap(value: unknown): boolean {
    if (value === null || value === undefined || value === '') return false;
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric > 0;
  }

  private toV1Instrument(stock: any, overrides?: Partial<V1CreateInstrumentRequest>): V1Instrument {
    const assetType = this.normalizeInstrumentAssetType(overrides?.asset_type || stock.assetType || 'STOCK', stock.symbol, stock.name);
    const segment = this.deriveInstrumentSegment(assetType, stock.symbol);
    const currency = overrides?.currency || stock.currency || this.defaultCurrencyForInstrument(stock.symbol, stock.exchange, stock.region);
    const country = stock.country || this.defaultCountryForInstrument(stock.symbol, stock.exchange, stock.region);
    const symbolParts = this.normalizeCatalogSymbol({
      symbol: stock.symbol,
      sourceSymbol: stock.sourceSymbol,
      providerSymbol: stock.providerSymbol,
      displaySymbol: stock.displaySymbol,
      exchange: stock.exchange,
    });
    const derivativesEligible = Boolean(stock.derivativesEligible) || (assetType === 'STOCK' && this.isKnownNseDerivativesEligibleStock(symbolParts.sourceSymbol));
    const readiness = stock.universeReadiness as InstrumentUniverseReadiness | undefined;
    const trustedBaseline = stock.trustedBaseline as TrustedBaselineSnapshot | undefined;
    const missingFields = this.missingMetadataFields({
      companyName: overrides?.company_name || stock.name,
      exchange: overrides?.exchange || stock.exchange,
      country,
      currency,
      sector: stock.sector,
      industry: stock.industry,
      marketCap: stock.marketCap,
      assetType,
      instrumentSegment: segment,
      isin: stock.isin,
      listingDate: stock.ipoDate,
    });
    return {
      id: stock.id,
      symbol: stock.symbol,
      display_symbol: symbolParts.displaySymbol || stock.symbol,
      provider_symbol: symbolParts.providerSymbol || stock.symbol,
      source_symbol: symbolParts.sourceSymbol || null,
      company_name: overrides?.company_name || stock.name,
      exchange: overrides?.exchange || stock.exchange || null,
      country,
      region: stock.region || null,
      sector: stock.sector || null,
      industry: stock.industry || null,
      currency,
      market_cap: stock.marketCap !== null && stock.marketCap !== undefined ? Number(stock.marketCap) : null,
      asset_type: assetType,
      instrument_segment: stock.instrumentSegment || segment,
      derivatives_eligible: derivativesEligible,
      provider_support_status: stock.providerSupportStatus || 'UNKNOWN',
      catalog_source: stock.catalogSource || stock.source || 'UNKNOWN',
      provider_error: stock.providerError || null,
      underlying_symbol: stock.underlyingSymbol || null,
      expiry_date: stock.expiryDate instanceof Date ? stock.expiryDate.toISOString() : stock.expiryDate ? new Date(stock.expiryDate).toISOString() : null,
      contract_month: stock.contractMonth || null,
      lot_size: stock.lotSize ?? null,
      contract_status: stock.contractStatus || null,
      metadata_completeness_score: this.metadataCompletenessScore(missingFields),
      missing_metadata_fields: missingFields,
      universe_state: readiness?.universeState,
      price_history_bars: readiness?.priceHistoryBars,
      latest_price_date: readiness?.latestPriceDate ?? undefined,
      expected_latest_trading_date: readiness?.expectedLatestTradingDate ?? undefined,
      has_recent_volume: readiness?.hasRecentVolume,
      rolling_window_bars: readiness?.rollingWindowBars,
      rolling_window_coverage_percent: readiness?.rollingWindowCoveragePercent,
      max_price_gap_days: readiness?.maxPriceGapDays ?? null,
      recent_volume_coverage_percent: readiness?.recentVolumeCoveragePercent,
      adjusted_close_coverage_percent: readiness?.adjustedCloseCoveragePercent,
      uses_adjusted_close_fallback: readiness?.usesAdjustedCloseFallback,
      readiness_blockers: readiness?.readinessBlockers,
      readiness_warnings: readiness?.readinessWarnings,
      provider_readiness: readiness?.providerReadiness,
      price_readiness: readiness?.priceReadiness,
      metadata_readiness: readiness?.metadataReadiness,
      review_readiness: readiness?.reviewReadiness,
      trusted_baseline_residual_state: trustedBaseline?.trustedBaselineResidualState,
      trusted_baseline_blocker_codes: trustedBaseline?.trustedBaselineBlockerCodes,
      latest_completed_eod_date: trustedBaseline?.latestCompletedEodDate ?? null,
      latest_completed_eod_present: trustedBaseline?.latestCompletedEodPresent,
      stored_data_through_date: trustedBaseline?.storedDataThroughDate ?? readiness?.latestPriceDate ?? null,
      required_history_start_date: trustedBaseline?.requiredHistoryStartDate ?? null,
      required_history_end_date: trustedBaseline?.requiredHistoryEndDate ?? null,
      required_history_status: trustedBaseline?.requiredHistoryStatus,
      listing_date_status: trustedBaseline?.listingDateStatus,
      provider_fallback_state: trustedBaseline?.providerFallbackState,
      primary_source_attempted: trustedBaseline?.primarySourceAttempted,
      fallback_sources_attempted: trustedBaseline?.fallbackSourcesAttempted,
      source_fallback_reason: trustedBaseline?.sourceFallbackReason ?? null,
      is_active: stock.isActive ?? true,
      is_delisted: stock.isDelisted ?? false,
      ipo_date: stock.ipoDate instanceof Date ? stock.ipoDate.toISOString() : stock.ipoDate ? new Date(stock.ipoDate).toISOString() : null,
      isin: overrides?.isin || stock.isin || null,
      source: stock.source || 'database',
      ingestion_timestamp: stock.createdAt instanceof Date ? stock.createdAt.toISOString() : new Date(stock.createdAt).toISOString(),
      last_updated_timestamp: stock.updatedAt instanceof Date ? stock.updatedAt.toISOString() : new Date(stock.updatedAt).toISOString(),
      data_status: (stock.dataStatus || (stock.lastSuccessfulDataLoadTimestamp ? 'COMPLETE' : 'PARTIAL')) as MarketDataStatus,
    };
  }

  private defaultCurrencyForRegion(region?: string | null): string {
    if (region === 'IN') return 'INR';
    if (region === 'UK') return 'GBP';
    if (region === 'EU') return 'EUR';
    if (region === 'CA') return 'CAD';
    return 'USD';
  }

  private defaultCountryForRegion(region?: string | null): string | null {
    if (region === 'IN') return 'India';
    if (region === 'US') return 'United States';
    if (region === 'UK') return 'United Kingdom';
    return null;
  }

  private defaultCountryForInstrument(symbol?: string | null, exchange?: string | null, region?: string | null): string | null {
    const normalizedExchange = exchange?.trim().toUpperCase();
    if (symbol?.endsWith('.NS') || symbol?.endsWith('.BO') || normalizedExchange === 'NSE' || normalizedExchange === 'BSE') return 'India';
    return this.defaultCountryForRegion(region);
  }

  private defaultCurrencyForInstrument(symbol?: string | null, exchange?: string | null, region?: string | null): string {
    const normalizedExchange = exchange?.trim().toUpperCase();
    if (symbol?.endsWith('.NS') || symbol?.endsWith('.BO') || normalizedExchange === 'NSE' || normalizedExchange === 'BSE') return 'INR';
    return this.defaultCurrencyForRegion(region);
  }

  private normalizeAssetType(value?: string | null): string {
    const normalized = value?.trim().toUpperCase();
    if (!normalized || normalized === 'EQUITY') return 'STOCK';
    if (normalized === 'FX' || normalized === 'CURRENCY') return 'FOREX';
    if (['STOCK', 'ETF', 'INDEX', 'FUTURE', 'FOREX', 'COMMODITY', 'CRYPTO', 'FUND', 'OTHER', 'UNKNOWN'].includes(normalized)) return normalized;
    return 'UNKNOWN';
  }

  private normalizeInstrumentAssetType(value?: string | null, symbol?: string | null, _name?: string | null): string {
    const normalizedSymbol = symbol?.trim().toUpperCase() || '';
    if (normalizedSymbol.startsWith('^')) return 'INDEX';
    return this.normalizeAssetType(value);
  }

  private deriveInstrumentSegment(assetType: string, symbol?: string | null): string {
    const normalized = this.normalizeAssetType(assetType);
    if (normalized === 'STOCK') return 'CASH';
    if (normalized === 'FUTURE') return 'FUTURES';
    if (normalized === 'FOREX') return 'CURRENCY';
    if (['INDEX', 'ETF', 'COMMODITY', 'CRYPTO', 'FUND', 'OTHER', 'UNKNOWN'].includes(normalized)) return normalized;
    if (symbol?.startsWith('^')) return 'INDEX';
    return 'UNKNOWN';
  }

  private missingMetadataFields(input: Record<string, unknown>): string[] {
    return Object.entries(input)
      .filter(([, value]) => value === null || value === undefined || value === '')
      .map(([key]) => key);
  }

  private metadataCompletenessScore(missingFields: string[]): number {
    const total = 11;
    return Math.max(0, Math.round(((total - missingFields.length) / total) * 100));
  }

  private async downloadConfiguredCatalogCsv(catalogSource: string) {
    const source = getCatalogSourceConfig(catalogSource);
    if (!source) {
      throw new Error(`Unknown catalog source: ${catalogSource}`);
    }
    if (!source.enabled) {
      throw new Error(`Catalog source ${catalogSource} is disabled.`);
    }
    if (!source.url) {
      throw new Error(`No configured URL for catalog source ${catalogSource}. ${source.setupHint || 'Use Manual CSV or configure an environment URL.'}`);
    }
    this.validateConfiguredCatalogUrl(source.url);
    const downloadConfig = getCatalogDownloadConfig();
    await fs.mkdir(downloadConfig.tempDir, { recursive: true });
    const extension = source.fileType === 'JSON' ? 'json' : source.fileType === 'HTML' ? 'html' : 'csv';
    const tempFilePath = path.join(downloadConfig.tempDir, `${catalogSource.toLowerCase().replace(/[^a-z0-9_-]/g, '-')}-${Date.now()}.${extension}`);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), source.timeoutMs);
    let fileSizeBytes = 0;

    try {
      const response = await fetch(source.url, {
        signal: controller.signal,
        headers: {
          accept: 'text/csv, application/json, text/html, */*',
          'accept-language': 'en-US,en;q=0.9',
          'user-agent': 'investment-scanner-market-data-foundation/1.0',
        },
      });
      if (!response.ok) {
        throw new Error(`Download failed for ${catalogSource}: HTTP ${response.status}`);
      }
      const contentLength = response.headers.get('content-length');
      if (contentLength && Number(contentLength) > source.maxDownloadBytes) {
        throw new Error(`Downloaded catalog file exceeds max size for ${catalogSource}.`);
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      fileSizeBytes = buffer.length;
      if (fileSizeBytes > source.maxDownloadBytes) {
        throw new Error(`Downloaded catalog file exceeds max size for ${catalogSource}.`);
      }
      await fs.writeFile(tempFilePath, buffer);
      const csvText = buffer.toString('utf8');
      return {
        sourceName: source.displayName,
        tempFilePath,
        keepTempFiles: downloadConfig.keepTempFiles,
        csvText,
        fileSizeBytes,
        tempFileDeleted: false,
        tempFileDeleteError: undefined as string | undefined,
      };
    } catch (error) {
      await fs.unlink(tempFilePath).catch(() => undefined);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Download timed out for catalog source ${catalogSource}.`);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async cleanupCatalogTempFile(downloadInfo: { tempFilePath: string; keepTempFiles: boolean; tempFileDeleted: boolean; tempFileDeleteError?: string }) {
    if (downloadInfo.keepTempFiles) {
      downloadInfo.tempFileDeleted = false;
      return;
    }
    try {
      await fs.unlink(downloadInfo.tempFilePath);
      downloadInfo.tempFileDeleted = true;
      downloadInfo.tempFileDeleteError = undefined;
    } catch (error) {
      downloadInfo.tempFileDeleted = false;
      downloadInfo.tempFileDeleteError = error instanceof Error ? error.message : 'Temp file cleanup failed';
      console.error('[MarketDataFoundation] catalog temp cleanup failed', {
        tempFilePath: downloadInfo.tempFilePath,
        error: downloadInfo.tempFileDeleteError,
      });
    }
  }

  private validateConfiguredCatalogUrl(value: string) {
    const url = new URL(value);
    if (url.protocol !== 'https:') {
      throw new Error('Configured catalog URL must use https.');
    }
    const hostname = url.hostname.toLowerCase();
    if (this.isBlockedCatalogHostname(hostname)) {
      throw new Error('Configured catalog URL host is not allowed.');
    }
  }

  private isBlockedCatalogHostname(hostname: string): boolean {
    if (hostname === 'localhost' || hostname.endsWith('.localhost')) return true;
    const ipVersion = net.isIP(hostname);
    if (ipVersion === 4) {
      const parts = hostname.split('.').map((part) => Number(part));
      return parts[0] === 10
        || parts[0] === 127
        || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31)
        || (parts[0] === 192 && parts[1] === 168)
        || (parts[0] === 169 && parts[1] === 254)
        || parts[0] === 0;
    }
    if (ipVersion === 6) {
      return hostname === '::1' || hostname.startsWith('fc') || hostname.startsWith('fd') || hostname.startsWith('fe80');
    }
    return false;
  }

  private validateCsvColumns(source: string, csvText: string) {
    if (source === 'NSE_INDEX_SEED') return;
    const config = getCatalogSourceConfig(source);
    if (config?.fileType && config.fileType !== 'CSV') return;
    const firstLine = csvText.replace(/^\uFEFF/, '').split(/\r?\n/).find((line) => line.trim().length > 0);
    if (!firstLine) {
      throw new Error(`CSV format did not match expected ${source} columns: file is empty.`);
    }
    const headers = new Set(this.splitCsvLine(firstLine).map((header) => header.trim().toUpperCase()));
    const expectedColumnGroups = config?.expectedColumnGroups;
    if (!expectedColumnGroups?.length) return;
    const missingGroups = expectedColumnGroups.filter((group) => !group.some((column) => headers.has(column)));
    if (missingGroups.length > 0) {
      throw new Error(`CSV format did not match expected ${source} columns. Missing one of: ${missingGroups.map((group) => group.join(' / ')).join('; ')}.`);
    }
  }

  private catalogRowsForSource(source: string, csvText: string, warnings: string[]): CreateStockRequest[] {
    if (source === 'NSE_INDEX_SEED') return this.indianIndexSeedRows();
    if (source === 'NSE_INDEX_SECURITIES') return this.parseNseIndicesJson(csvText, warnings);
    if (source === 'BSE_INDEX_SECURITIES') return this.parseBseIndicesHtml(csvText, warnings);
    const rows = this.parseCsv(csvText);
    if (rows.length === 0) {
      warnings.push(`${source}: no CSV rows supplied.`);
      return [];
    }
    if (source === 'NSE_EQUITY_DERIVATIVES_UNDERLYINGS') return rows.map((row) => this.mapNseUnderlyingRow(row)).filter(Boolean) as CreateStockRequest[];
    return rows.map((row) => this.mapNseSecurityRow(row, source)).filter(Boolean) as CreateStockRequest[];
  }

  private catalogBackfillRow(stock: any): CreateStockRequest | null {
    const symbol = String(stock.symbol || '').trim().toUpperCase();
    if (!symbol) return null;
    const inferredExchange = stock.exchange?.trim().toUpperCase()
      || (symbol.endsWith('.NS') ? 'NSE' : symbol.endsWith('.BO') ? 'BSE' : null);
    const inferredRegion = stock.region || (inferredExchange === 'NSE' || inferredExchange === 'BSE' ? 'IN' : null);
    if (inferredRegion !== 'IN' && inferredExchange !== 'NSE' && inferredExchange !== 'BSE') return null;

    const normalized = this.normalizeCatalogSymbol({
      symbol,
      sourceSymbol: stock.sourceSymbol,
      providerSymbol: stock.providerSymbol,
      displaySymbol: stock.displaySymbol,
      exchange: inferredExchange,
    }, inferredExchange === 'BSE' ? 'BSE_EQUITY_SECURITIES' : 'NSE_EQUITY_SECURITIES');
    const assetType = this.normalizeInstrumentAssetType(stock.assetType || 'STOCK', symbol, stock.name);
    const segment = stock.instrumentSegment || this.deriveInstrumentSegment(assetType, symbol);
    const isEquityCash = segment === 'CASH' || assetType === 'STOCK';

    return {
      symbol: normalized.sourceSymbol,
      name: stock.name || normalized.displaySymbol,
      region: 'IN',
      exchange: inferredExchange || (symbol.endsWith('.BO') ? 'BSE' : 'NSE'),
      country: 'India',
      currency: 'INR',
      assetType: isEquityCash ? 'STOCK' : assetType,
      instrumentSegment: isEquityCash ? 'CASH' : segment,
      displaySymbol: normalized.displaySymbol,
      providerSymbol: normalized.providerSymbol,
      sourceSymbol: normalized.sourceSymbol,
      catalogSource: stock.catalogSource || this.legacyCatalogSourceForStock(stock),
      providerSupportStatus: stock.providerSupportStatus || 'UNKNOWN',
      derivativesEligible: Boolean(stock.derivativesEligible) || this.isKnownNseDerivativesEligibleStock(normalized.sourceSymbol),
      source: stock.source || 'database',
      dataStatus: stock.dataStatus || 'PARTIAL',
      isActive: stock.isActive ?? true,
    };
  }

  private legacyCatalogSourceForStock(stock: any): CatalogSource {
    const source = String(stock.source || '').toUpperCase();
    if (source.includes('NIFTY')) return 'LEGACY_NIFTY500';
    if (source === 'DATABASE' || !source) return 'LEGACY_DATABASE';
    return 'MANUAL';
  }

  private mapNseSecurityRow(row: Record<string, string>, source: string): CreateStockRequest | null {
    const sourceSymbol = this.readCsv(row, ['SYMBOL', 'SM_SYMBOL', 'TRADING SYMBOL', 'TRADINGSYMBOL']);
    const name = this.readCsv(row, [
      'NAME OF COMPANY',
      'NAME_OF_COMPANY',
      'NAME',
      'COMPANY NAME',
      'SECURITY NAME',
      'SECURITYNAME',
      'SM_NAME',
      'NAME OF ETF',
      'NAME OF THE ETF',
      'ETF NAME',
      'SCHEME NAME',
    ]);
    const isin = this.readCsv(row, ['ISIN', 'ISIN NUMBER', 'ISIN_NUMBER', 'ISINNUMBER']);
    const listingDate = this.readCsv(row, ['DATE OF LISTING', 'DATE_OF_LISTING', 'DATEOFLISTING']);
    const series = this.readCsv(row, ['SERIES', 'SM_SERIES', 'INSTRUMENT TYPE', 'INSTRUMENT']).toUpperCase();
    if (!sourceSymbol || !name) return null;
    const sourceSymbolUpper = this.baseSymbolFromProviderSymbol(sourceSymbol);
    const normalized = this.normalizeCatalogSymbol({ sourceSymbol: sourceSymbolUpper, exchange: 'NSE' }, source);
    const isEtf = source === 'NSE_ETF_SECURITIES' || series.includes('ETF') || /\bETF\b|BEES|NIFTY.*ETF/i.test(name);
    const isCashEquity = isEtf || !series || ['EQ', 'BE', 'BZ', 'SM', 'ST'].includes(series);
    if (!isCashEquity) return null;
    return {
      symbol: normalized.sourceSymbol,
      sourceSymbol: normalized.sourceSymbol,
      providerSymbol: normalized.providerSymbol,
      displaySymbol: normalized.displaySymbol,
      name: name.trim(),
      region: 'IN',
      exchange: 'NSE',
      country: 'India',
      currency: 'INR',
      assetType: isEtf ? 'ETF' : 'STOCK',
      instrumentSegment: isEtf ? 'ETF' : 'CASH',
      derivativesEligible: this.isKnownNseDerivativesEligibleStock(normalized.sourceSymbol),
      catalogSource: isEtf ? 'NSE_ETF_SECURITIES' : source,
      providerSupportStatus: 'UNKNOWN',
      isActive: true,
      isin: isin || null,
      ipoDate: this.parseCatalogDate(listingDate),
      source: source,
      dataStatus: 'PARTIAL',
    };
  }

  private mapNseUnderlyingRow(row: Record<string, string>): CreateStockRequest | null {
    const raw = this.readCsv(row, ['SYMBOL', 'UNDERLYING', 'UNDERLYING SYMBOL', 'NAME', 'UNDERLYING_NAME']);
    if (!raw) return null;
    const sourceSymbol = this.baseSymbolFromProviderSymbol(raw).replace(/\s+/g, ' ');
    const isIndex = /NIFTY|SENSEX|BANKNIFTY|FINNIFTY|MIDCPNIFTY/.test(sourceSymbol);
    const indexSeed = this.indianIndexSeedRows().find((item) => item.sourceSymbol === sourceSymbol || item.displaySymbol === sourceSymbol);
    if (isIndex) {
      const symbol = indexSeed?.symbol || sourceSymbol.replace(/\s+/g, '');
      return {
        symbol,
        sourceSymbol,
        providerSymbol: indexSeed?.providerSymbol || symbol,
        displaySymbol: sourceSymbol,
        name: indexSeed?.name || sourceSymbol,
        region: 'IN',
        exchange: sourceSymbol.includes('SENSEX') ? 'BSE_INDEX' : 'NSE_INDEX',
        country: 'India',
        currency: 'INR',
        assetType: 'INDEX',
        instrumentSegment: 'INDEX',
        derivativesEligible: true,
        catalogSource: 'NSE_EQUITY_DERIVATIVES_UNDERLYINGS',
        providerSupportStatus: 'UNKNOWN',
        isActive: true,
        dataStatus: 'PARTIAL',
      };
    }
    return {
      symbol: sourceSymbol,
      sourceSymbol,
      providerSymbol: this.providerSymbolForExchange(sourceSymbol, 'NSE'),
      displaySymbol: sourceSymbol,
      name: sourceSymbol,
      region: 'IN',
      exchange: 'NSE',
      country: 'India',
      currency: 'INR',
      assetType: 'STOCK',
      instrumentSegment: 'CASH',
      derivativesEligible: true,
      catalogSource: 'NSE_EQUITY_DERIVATIVES_UNDERLYINGS',
      providerSupportStatus: 'UNKNOWN',
      isActive: true,
      dataStatus: 'PARTIAL',
    };
  }

  private indianIndexSeedRows(): CreateStockRequest[] {
    return [
      { symbol: '^NSEI', sourceSymbol: 'NIFTY 50', providerSymbol: '^NSEI', displaySymbol: 'NIFTY 50', name: 'NIFTY 50', exchange: 'NSE_INDEX' },
      { symbol: '^NSEBANK', sourceSymbol: 'NIFTY BANK', providerSymbol: '^NSEBANK', displaySymbol: 'NIFTY BANK', name: 'NIFTY BANK', exchange: 'NSE_INDEX' },
      { symbol: '^BSESN', sourceSymbol: 'SENSEX', providerSymbol: '^BSESN', displaySymbol: 'SENSEX', name: 'SENSEX', exchange: 'BSE_INDEX' },
    ].map((item) => ({
      ...item,
      region: 'IN',
      country: 'India',
      currency: 'INR',
      assetType: 'INDEX',
      instrumentSegment: 'INDEX',
      derivativesEligible: item.symbol !== '^BSESN',
      catalogSource: 'NSE_INDEX_SEED',
      providerSupportStatus: 'UNKNOWN',
      isActive: true,
      dataStatus: 'PARTIAL',
    }));
  }

  private parseNseIndicesJson(jsonText: string, warnings: string[]): CreateStockRequest[] {
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch (error) {
      throw new Error(`JSON format did not match expected NSE_INDEX_SECURITIES payload: ${error instanceof Error ? error.message : 'invalid JSON'}.`);
    }

    const arrays = this.collectObjectArrays(parsed);
    const records = arrays
      .filter((items) => items.some((item) => this.readObjectString(item, ['index', 'indexName', 'index_name', 'name', 'Index Name'])))
      .sort((a, b) => b.length - a.length)[0] || [];

    if (records.length === 0) {
      warnings.push('NSE_INDEX_SECURITIES: no index records found in JSON payload.');
      return [];
    }

    return this.uniqueIndexRows(records.map((record) => {
      const name = this.cleanIndexName(this.readObjectString(record, ['index', 'indexName', 'index_name', 'name', 'Index Name']));
      if (!name) return null;
      return this.mapIndexCatalogRow(name, 'NSE_INDEX_SECURITIES', 'NSE_INDEX');
    }));
  }

  private parseBseIndicesHtml(htmlText: string, warnings: string[]): CreateStockRequest[] {
    const text = this.decodeHtmlEntities(htmlText)
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, '\n');
    const candidates = text
      .split(/\r?\n/)
      .map((line) => this.cleanIndexName(line))
      .filter((line) => this.isLikelyBseIndexName(line));

    const rows = this.uniqueIndexRows(candidates.map((name) => this.mapIndexCatalogRow(name, 'BSE_INDEX_SECURITIES', 'BSE_INDEX')));
    if (rows.length === 0) warnings.push('BSE_INDEX_SECURITIES: no index names found in HTML payload.');
    return rows;
  }

  private collectObjectArrays(value: unknown): Array<Array<Record<string, unknown>>> {
    if (Array.isArray(value)) {
      const objectItems = value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && !Array.isArray(item));
      const childArrays = value.flatMap((item) => this.collectObjectArrays(item));
      return objectItems.length > 0 ? [objectItems, ...childArrays] : childArrays;
    }
    if (value && typeof value === 'object') {
      return Object.values(value as Record<string, unknown>).flatMap((item) => this.collectObjectArrays(item));
    }
    return [];
  }

  private readObjectString(record: Record<string, unknown>, keys: string[]): string {
    const normalized = new Map(Object.entries(record).map(([key, value]) => [key.trim().toUpperCase(), value]));
    for (const key of keys) {
      const value = normalized.get(key.trim().toUpperCase());
      if (typeof value === 'string' && value.trim()) return value.trim();
      if (typeof value === 'number' && Number.isFinite(value)) return String(value);
    }
    return '';
  }

  private mapIndexCatalogRow(name: string, catalogSource: CatalogSource, exchange: 'NSE_INDEX' | 'BSE_INDEX'): CreateStockRequest | null {
    const displayName = this.cleanIndexName(name);
    if (!displayName) return null;
    const upperName = displayName.toUpperCase();
    const providerSymbol = this.providerSymbolForKnownIndianIndex(upperName);
    const fallbackSymbol = `${exchange}_${this.slugForCatalogSymbol(upperName)}`;
    const symbol = providerSymbol || fallbackSymbol;
    return {
      symbol,
      sourceSymbol: upperName,
      providerSymbol: providerSymbol || null,
      displaySymbol: displayName,
      name: displayName,
      region: 'IN',
      exchange,
      country: 'India',
      currency: 'INR',
      assetType: 'INDEX',
      instrumentSegment: 'INDEX',
      derivativesEligible: this.isDerivativesEligibleIndexName(upperName),
      catalogSource,
      providerSupportStatus: 'UNKNOWN',
      isActive: true,
      source: catalogSource,
      dataStatus: 'PARTIAL',
    };
  }

  private uniqueIndexRows(rows: Array<CreateStockRequest | null>): CreateStockRequest[] {
    const seen = new Set<string>();
    const unique: CreateStockRequest[] = [];
    for (const row of rows) {
      if (!row) continue;
      const key = `${row.exchange}:${row.sourceSymbol || row.name}`.toUpperCase();
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(row);
    }
    return unique;
  }

  private cleanIndexName(value: string): string {
    return value
      .replace(/\s+/g, ' ')
      .replace(/\s+-\s+$/, '')
      .trim();
  }

  private isLikelyBseIndexName(value: string): boolean {
    const upper = value.toUpperCase();
    if (!upper || upper.length < 5) return false;
    if (/^(INDEX|CURRENT|CHANGE|% CHANGE|CATEGORY|BROAD|SECTORAL|INVESTMENT STRATEGY|AS ON|COPYRIGHT|DESKTOP SITE)$/.test(upper)) return false;
    if (/^[+-]?\d[\d,.]*%?$/.test(upper)) return false;
    if (upper.includes('BSE LTD')) return false;
    return upper === 'SENSEX' || upper.startsWith('BSE ') || upper.startsWith('S&P BSE ');
  }

  private providerSymbolForKnownIndianIndex(upperName: string): string | null {
    const aliases: Record<string, string> = {
      'NIFTY 50': '^NSEI',
      'NIFTY BANK': '^NSEBANK',
      'NIFTY IT': '^CNXIT',
      'NIFTY AUTO': '^CNXAUTO',
      'NIFTY FMCG': '^CNXFMCG',
      'NIFTY PHARMA': '^CNXPHARMA',
      'NIFTY METAL': '^CNXMETAL',
      'NIFTY REALTY': '^CNXREALTY',
      'NIFTY ENERGY': '^CNXENERGY',
      'NIFTY MEDIA': '^CNXMEDIA',
      'NIFTY PSU BANK': '^CNXPSUBANK',
      'NIFTY INFRA': '^CNXINFRA',
      'NIFTY MIDCAP 50': '^NSEMDCP50',
      'SENSEX': '^BSESN',
      'BSE SENSEX': '^BSESN',
      'S&P BSE SENSEX': '^BSESN',
    };
    return aliases[upperName] || null;
  }

  private isDerivativesEligibleIndexName(upperName: string): boolean {
    return ['NIFTY 50', 'NIFTY BANK', 'NIFTY FINANCIAL SERVICES', 'NIFTY MIDCAP SELECT', 'NIFTY NEXT 50', 'SENSEX', 'BSE SENSEX', 'S&P BSE SENSEX'].includes(upperName);
  }

  private isBroadIndianIndexName(name: string): boolean {
    return this.isDerivativesEligibleIndexName(this.cleanIndexName(name).toUpperCase());
  }

  private parseMarketDataNumber(value: string): number | null {
    const normalized = value.replace(/,/g, '').trim();
    if (!normalized || normalized === '-' || /^NA$/i.test(normalized)) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private isKnownNseDerivativesEligibleStock(symbol?: string | null): boolean {
    const normalized = this.baseSymbolFromProviderSymbol(String(symbol || '').replace(/\s+/g, '').toUpperCase());
    return isKnownNseFnoStockUnderlying(symbol) || KNOWN_NSE_FNO_STOCK_UNDERLYINGS.has(normalized);
  }

  private slugForCatalogSymbol(value: string): string {
    return value.toUpperCase().replace(/&/g, ' AND ').replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 80) || 'UNKNOWN';
  }

  private decodeHtmlEntities(value: string): string {
    return value
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'");
  }

  private parseCsv(csvText: string): Record<string, string>[] {
    const lines = csvText.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim().length > 0);
    if (lines.length < 2) return [];
    const headers = this.splitCsvLine(lines[0]).map((header) => header.trim().toUpperCase());
    return lines.slice(1).map((line) => {
      const values = this.splitCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index]?.trim() || '']));
    });
  }

  private parseCatalogDate(value: string): Date | null {
    const trimmed = value?.trim();
    if (!trimmed) return null;
    const isoDate = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
    if (isoDate) {
      const [, year, month, day] = isoDate;
      return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    }
    const dmyDate = /^(\d{1,2})[-/ ]([A-Za-z]{3,})[-/ ](\d{2,4})$/.exec(trimmed);
    if (dmyDate) {
      const [, day, monthText, yearText] = dmyDate;
      const monthIndex = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'].indexOf(monthText.slice(0, 3).toUpperCase());
      if (monthIndex >= 0) {
        const shortYear = Number(yearText);
        const year = yearText.length === 2 ? (shortYear >= 70 ? 1900 + shortYear : 2000 + shortYear) : shortYear;
        return new Date(Date.UTC(year, monthIndex, Number(day)));
      }
    }
    const numericDmyDate = /^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/.exec(trimmed);
    if (numericDmyDate) {
      const [, dayText, monthText, yearText] = numericDmyDate;
      const shortYear = Number(yearText);
      const year = yearText.length === 2 ? (shortYear >= 70 ? 1900 + shortYear : 2000 + shortYear) : shortYear;
      return new Date(Date.UTC(year, Number(monthText) - 1, Number(dayText)));
    }
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) return null;
    return new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()));
  }

  private splitCsvLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let quoted = false;
    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else if (char === '"') {
        quoted = !quoted;
      } else if (char === ',' && !quoted) {
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current);
    return values;
  }

  private csvEscape(value: unknown): string {
    const text = value === null || value === undefined ? '' : String(value);
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  private readCsv(row: Record<string, string>, keys: string[]): string {
    for (const key of keys) {
      const value = row[key.toUpperCase()];
      if (value?.trim()) return value.trim();
    }
    return '';
  }

  private normalizeCatalogSource(value: string): CatalogSource {
    const normalized = value?.trim().toUpperCase();
    const allowed = new Set([
      'MANUAL',
      'LEGACY_NIFTY500',
      'LEGACY_DATABASE',
      'NSE_EQUITY_SECURITIES',
      'NSE_SME_EQUITY_SECURITIES',
      'NSE_EQUITY_DERIVATIVES_UNDERLYINGS',
      'NSE_INDEX_SECURITIES',
      'BSE_INDEX_SECURITIES',
      'NSE_INDEX_SEED',
      'NSE_ETF_SECURITIES',
      'BSE_EQUITY_SECURITIES',
      'BROKER_SCRIP_MASTER',
      'UNKNOWN',
    ]);
    return (allowed.has(normalized) ? normalized : 'UNKNOWN') as CatalogSource;
  }

  private inferRegionFromInstrument(data: V1CreateInstrumentRequest): string {
    const exchange = data.exchange.toUpperCase();
    if (exchange === 'NSE' || exchange === 'BSE' || data.currency.toUpperCase() === 'INR') return 'IN';
    if (exchange === 'LSE' || data.currency.toUpperCase() === 'GBP') return 'UK';
    if (data.currency.toUpperCase() === 'EUR') return 'EU';
    if (data.currency.toUpperCase() === 'CAD') return 'CA';
    return 'US';
  }

  private defaultBackfillStartDate(anchorDate?: string | Date): Date {
    const date = anchorDate instanceof Date
      ? new Date(anchorDate)
      : anchorDate
        ? new Date(`${anchorDate}T00:00:00.000Z`)
        : new Date();
    date.setUTCFullYear(date.getUTCFullYear() - 15);
    date.setUTCHours(0, 0, 0, 0);
    return date;
  }

  private async throttleIngestion(minDelayMs = 1000) {
    const throttle = async () => {
      const delayMs = Math.max(0, minDelayMs);
      const now = Date.now();
      const elapsed = now - MarketDataFoundationService.lastIngestionAt;
      if (elapsed < delayMs) {
        await new Promise(resolve => setTimeout(resolve, delayMs - elapsed));
      }
      MarketDataFoundationService.lastIngestionAt = Date.now();
    };
    const next = MarketDataFoundationService.ingestionThrottleChain.then(throttle, throttle);
    MarketDataFoundationService.ingestionThrottleChain = next.catch(() => undefined);
    await next;
  }

  private async evaluateSyncFreshnessGate(input: {
    region: string;
    assetType: string;
    scopeType: 'CATALOG' | 'INSTRUMENT';
    scopeKey: string;
    tradingDate: string;
    now: Date;
    force: boolean;
    cooldownMinutes: number;
    syncDuringMarketHours?: boolean;
    postCloseSyncWindowMinutes?: number;
    finalizationGraceMinutes?: number;
    skipWeekends?: boolean;
  }): Promise<{
    shouldSkip: boolean;
    reason: MarketDataSyncSkipReason;
    message: string;
    nextEligibleSyncAt?: string;
    providerEndDate?: Date;
  }> {
    if (input.force) {
      return { shouldSkip: false, reason: 'RECENTLY_SYNCED', message: 'Force sync requested.' };
    }

    const [latestTradingDate, syncState] = await Promise.all([
      this.repository.latestStoredTradingDateForRegion(input.region, input.assetType),
      this.repository.getSyncState(input.region, input.assetType, input.tradingDate, {
        scopeType: input.scopeType,
        scopeKey: input.scopeKey,
        timeframe: '1D',
      }),
    ]);
    const latestCompletedTradingDate = latestCompletedTradingDateForRegion(input.region, input.now);
    const latestCompletedCandleMissing = this.isLatestCompletedCandleMissing(latestTradingDate, latestCompletedTradingDate);
    const completedCatchUpEndDate = latestCompletedCandleMissing
      ? this.endOfTradingDateUtc(latestCompletedTradingDate)
      : undefined;

    if (syncState?.status === 'FINAL_CONFIRMED' && !latestCompletedCandleMissing) {
      return {
        shouldSkip: true,
        reason: 'FINAL_CANDLE_CONFIRMED',
        message: this.skipMessage(input.scopeType, 'FINAL_CANDLE_CONFIRMED'),
      };
    }

    if (syncState?.status === 'PENDING') {
      return {
        shouldSkip: false,
        reason: 'RECENTLY_SYNCED',
        message: 'Previous market-data sync did not complete; retrying from Market Data.',
        providerEndDate: completedCatchUpEndDate,
      };
    }

    if (syncState?.lastCheckedAt && syncState.status !== 'FAILED' && !latestCompletedCandleMissing) {
      const lastCheckedAt = new Date(syncState.lastCheckedAt);
      const nextEligibleAt = this.addMinutes(lastCheckedAt, input.cooldownMinutes);
      if (input.now < nextEligibleAt) {
        return {
          shouldSkip: true,
          reason: 'RECENTLY_SYNCED',
          message: this.skipMessage(input.scopeType, 'RECENTLY_SYNCED'),
          nextEligibleSyncAt: nextEligibleAt.toISOString(),
        };
      }
    }

    const decision = shouldRunMarketDataSync(input.region, input.now, {
      latestTradingDate,
      finalConfirmed: false,
    }, {
      syncDuringMarketHours: input.syncDuringMarketHours,
      postCloseSyncWindowMinutes: input.postCloseSyncWindowMinutes,
      finalizationGraceMinutes: input.finalizationGraceMinutes,
      skipWeekends: input.skipWeekends,
    });

    const marketReason = this.marketDecisionToSkipReason(decision.reasonCode);
    if (marketReason && !decision.shouldRun) {
      if (latestCompletedCandleMissing) {
        return {
          shouldSkip: false,
          reason: 'RECENTLY_SYNCED',
          message: `Latest completed daily candle ${latestCompletedTradingDate} is missing; completed EOD catch-up is eligible.`,
          providerEndDate: completedCatchUpEndDate,
        };
      }
      return {
        shouldSkip: true,
        reason: marketReason,
        message: this.skipMessage(input.scopeType, marketReason),
        nextEligibleSyncAt: decision.nextSuggestedRunAt ?? undefined,
      };
    }

    return {
      shouldSkip: false,
      reason: 'RECENTLY_SYNCED',
      message: 'Sync is eligible.',
      providerEndDate: completedCatchUpEndDate,
    };
  }

  private isLatestCompletedCandleMissing(latestTradingDate: string | null | undefined, latestCompletedTradingDate: string | null): boolean {
    if (!latestCompletedTradingDate) return false;
    if (!latestTradingDate) return true;
    return latestTradingDate < latestCompletedTradingDate;
  }

  private marketDecisionToSkipReason(reasonCode: string): MarketDataSyncSkipReason | null {
    if (reasonCode === 'BEFORE_MARKET_OPEN') return 'BEFORE_MARKET_OPEN';
    if (reasonCode === 'WEEKEND_OR_HOLIDAY') return 'WEEKEND_OR_HOLIDAY';
    if (reasonCode === 'FINAL_CANDLE_CONFIRMED') return 'FINAL_CANDLE_CONFIRMED';
    if (reasonCode === 'MARKET_CLOSED_NO_SYNC' || reasonCode === 'MARKET_OPEN') return 'MARKET_CLOSED_NO_NEW_DAILY_DATA';
    return null;
  }

  private buildSkippedSyncSummary(
    skippedCount: number,
    reason: MarketDataSyncSkipReason,
    message: string,
    checkedAt: Date,
    nextEligibleSyncAt?: string
  ): SyncSummary {
    return {
      rowsReceived: 0,
      rowsInserted: 0,
      rowsUpdated: 0,
      rowsSkipped: 0,
      rowsNoOp: 0,
      noNewData: true,
      skippedBeforeFetchCount: skippedCount,
      providerFetchSkippedCount: skippedCount,
      skippedReasonCounts: { [reason]: skippedCount },
      skippedReasons: [reason],
      lastCheckedAt: checkedAt.toISOString(),
      nextEligibleSyncAt,
      warningCount: 0,
      warnings: [message],
    };
  }

  private buildSkippedRegionSummary(
    region: string,
    assetType: string,
    tradingDate: string,
    skippedCount: number,
    reason: MarketDataSyncSkipReason,
    message: string,
    checkedAt: Date,
    nextEligibleSyncAt?: string
  ): ScheduledRegionSyncSummary {
    return {
      region,
      assetType,
      tradingDate,
      dataThroughDate: tradingDate,
      sourceFingerprint: this.scheduledRegionSourceFingerprint({
        region,
        assetType,
        dataThroughDate: tradingDate,
        rowsInserted: 0,
        rowsUpdated: 0,
        changedInstrumentIds: [],
        downstreamInstrumentIds: [],
      }),
      changedInstrumentIds: [],
      downstreamInstrumentIds: [],
      changedInstrumentCount: 0,
      dqStageEligible: false,
      instrumentsProcessed: 0,
      rowsReceived: 0,
      rowsInserted: 0,
      rowsUpdated: 0,
      rowsSkipped: 0,
      rowsNoOp: 0,
      noNewData: true,
      skippedBeforeFetchCount: skippedCount,
      providerFetchSkippedCount: skippedCount,
      skippedReasonCounts: { [reason]: skippedCount },
      skippedReasons: [reason],
      lastCheckedAt: checkedAt.toISOString(),
      nextEligibleSyncAt,
      warningCount: 0,
      warnings: [message],
      errors: [],
    };
  }

  private scheduledRegionSourceFingerprint(input: {
    region: string;
    assetType: string;
    dataThroughDate: string;
    rowsInserted: number;
    rowsUpdated: number;
    changedInstrumentIds: string[];
    downstreamInstrumentIds?: string[];
  }): string {
    const payload = [
      input.region,
      input.assetType,
      input.dataThroughDate,
      String(input.rowsInserted),
      String(input.rowsUpdated),
      input.changedInstrumentIds.join(','),
      (input.downstreamInstrumentIds || []).join(','),
    ].join('|');
    return `scheduled-region:${createHash('sha256').update(payload).digest('hex').slice(0, 16)}`;
  }

  private skipMessage(scopeType: 'CATALOG' | 'INSTRUMENT', reason: MarketDataSyncSkipReason): string {
    const scope = scopeType === 'CATALOG' ? 'Catalog' : 'Instrument';
    if (reason === 'RECENTLY_SYNCED') return `No new data to ingest. ${scope} was synced recently.`;
    if (reason === 'BEFORE_MARKET_OPEN') return 'No new data to ingest. Daily candle is not useful before market open.';
    if (reason === 'WEEKEND_OR_HOLIDAY') return 'No new data to ingest. Market is closed for weekend or holiday.';
    if (reason === 'FINAL_CANDLE_CONFIRMED') return 'No new data to ingest. Final daily candle is already confirmed.';
    return 'No new data to ingest. Market session has no useful new daily data.';
  }

  private addMinutes(date: Date, minutes: number): Date {
    return new Date(date.getTime() + minutes * 60_000);
  }

  private readPositiveNumber(value: string | undefined, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  private formatFundamentalsResponse(stock: any, records: any[]) {
    return {
      instrument_id: stock.id,
      symbol: stock.symbol,
      source: records[0]?.source || 'database',
      ingestion_timestamp: records[0]?.ingestionTimestamp?.toISOString?.() ?? null,
      last_updated_timestamp: records[0]?.lastUpdatedTimestamp?.toISOString?.() ?? null,
      data_status: records.length > 0 ? records[0].dataStatus : 'MISSING',
      records: records.map((record: any) => ({
        revenue: record.revenue !== null ? Number(record.revenue) : null,
        eps: record.eps !== null ? Number(record.eps) : null,
        net_income: record.netIncome !== null ? Number(record.netIncome) : null,
        pe_ratio: record.peRatio !== null ? Number(record.peRatio) : null,
        dividend_yield: record.dividendYield !== null ? Number(record.dividendYield) : null,
        shares_outstanding: record.sharesOutstanding !== null ? Number(record.sharesOutstanding) : null,
        market_cap: record.marketCap !== null ? Number(record.marketCap) : null,
        currency: record.currency,
        period_type: record.periodType,
        period_end_date: record.periodEndDate.toISOString(),
        source: record.source,
        ingestion_timestamp: record.ingestionTimestamp.toISOString(),
        last_updated_timestamp: record.lastUpdatedTimestamp.toISOString(),
        data_status: record.dataStatus,
      })),
    };
  }

  private normalizePair(pair: string): string {
    const stripped = pair.replace('/', '').toUpperCase();
    return `${stripped.slice(0, 3)}/${stripped.slice(3, 6)}`;
  }

  private toV1FxRate(rate: any) {
    return {
      pair: rate.pair,
      base_currency: rate.baseCurrency,
      quote_currency: rate.quoteCurrency,
      rate: Number(rate.rate),
      rate_timestamp: rate.rateTimestamp.toISOString(),
      source: rate.source,
      ingestion_timestamp: rate.ingestionTimestamp.toISOString(),
      last_updated_timestamp: rate.lastUpdatedTimestamp.toISOString(),
      data_status: rate.dataStatus,
    };
  }
}

export class StockService extends MarketDataFoundationService {}
