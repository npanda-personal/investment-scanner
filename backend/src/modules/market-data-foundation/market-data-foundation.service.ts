import fs from 'fs/promises';
import net from 'net';
import path from 'path';
import { MarketDataFoundationRepository } from './market-data-foundation.repository';
import { YahooFinanceIngestionService } from './market-data-foundation.provider';
import { enqueueIngestionJob } from './market-data-foundation.queue';
import { getCatalogDownloadConfig, getCatalogSourceConfig, getCatalogSourceConfigs } from './market-data-foundation.catalog-sources';
import type {
  CreateStockRequest,
  HistoricalPrice,
  MarketDataStatus,
  MarketDataSyncSkipReason,
  ScheduledRegionSyncSummary,
  PaginationOptions,
  CatalogBackfillRequest,
  CatalogBackfillSummary,
  CatalogImportRequest,
  CatalogImportSummary,
  CatalogSource,
  SearchResult,
  SyncSummary,
  UpdateStockRequest,
  V1CreateInstrumentRequest,
  V1IngestionRequest,
  V1Instrument,
  V1SyncResult,
} from './market-data-foundation.types';
import { validateInstrumentInput } from './market-data-foundation.validation';
import { shouldRunMarketDataSync, tradingDateForRegion } from './market-data-foundation.market-session';
import { isKnownNseFnoStockUnderlying } from './market-data-foundation.fno-underlyings';

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

export class MarketDataFoundationService {
  private static lastIngestionAt = 0;
  private readonly manualSyncCooldownMinutes = this.readPositiveNumber(
    process.env.MARKET_DATA_MANUAL_SYNC_COOLDOWN_MINUTES,
    15
  );

  constructor(
    private readonly repository = new MarketDataFoundationRepository(),
    private readonly marketDataProvider = new YahooFinanceIngestionService()
  ) {}

  list(options: PaginationOptions) {
    return this.repository.listStocks(options);
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
    const result = await this.list({
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
    });

    return {
      instruments: result.stocks.map((stock) => this.toV1Instrument(stock)),
      pagination: result.pagination,
    };
  }

  async getInstrument(id: string, options: Pick<PaginationOptions, 'region' | 'assetType'> = {}) {
    const stock = await this.repository.findStockByIdInScope(id, options);
    return stock ? this.toV1Instrument(stock) : null;
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
          const validation = await this.marketDataProvider.validateProviderSymbol(row.providerSymbol);
          summary.providerValidated += 1;
          if (!validation.supported) summary.providerUnsupported += 1;
          await this.repository.updateProviderSupportStatus(
            row.symbol,
            validation.supported ? 'SUPPORTED' : 'UNSUPPORTED',
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
    const { stocks, total } = await this.repository.listStocksForCatalogBackfill({
      region: request.region || 'IN',
      assetType: request.assetType,
      offset,
      batchSize,
    });
    const summary: CatalogBackfillSummary = {
      processedCount: 0,
      totalCount: total,
      batchSize,
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

    for (const stock of stocks) {
      const normalized = this.catalogBackfillRow(stock);
      if (!normalized) {
        summary.skipped += 1;
        continue;
      }
      const result = await this.repository.upsertCatalogInstrument(normalized);
      summary.processedCount += 1;
      if (result.action === 'updated') summary.updated += 1;
      if (result.action === 'noOp') summary.noOp += 1;

      if (request.validateProvider && normalized.providerSymbol) {
        const validation = await this.marketDataProvider.validateProviderSymbol(normalized.providerSymbol);
        summary.validated += 1;
        if (!validation.supported) summary.providerUnsupported += 1;
        await this.repository.updateProviderSupportStatus(
          normalized.symbol,
          validation.supported ? 'SUPPORTED' : 'UNSUPPORTED',
          validation.message
        );
      }
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

    const externalResults: SearchResult[] = await this.marketDataProvider.search(query);
    const createdStocks = [];

    for (const ext of externalResults) {
      const existing = await this.repository.findStockBySymbol(ext.symbol);
      if (existing) {
        createdStocks.push(existing);
        continue;
      }

      const regionInfo = this.marketDataProvider.inferRegion(ext.symbol);
      const stock = await this.create({
        symbol: ext.symbol,
        name: ext.name,
        region: regionInfo.region || 'US',
        exchange: regionInfo.exchange,
      }, true);
      createdStocks.push(stock);
    }

    return createdStocks.map(stock => ({
      symbol: stock.symbol,
      name: stock.name,
      region: stock.region,
      exchange: stock.exchange,
      source: 'external',
    }));
  }

  async yahooSearch(query: string): Promise<any[]> {
    const externalResults: SearchResult[] = await this.marketDataProvider.search(query);
    return externalResults.map(result => ({
      symbol: result.symbol,
      name: result.name,
      type: result.type,
      exchange: result.exchange,
      region: result.region,
      source: 'yahoo',
    }));
  }

  searchProvider(query: string) {
    return this.marketDataProvider.search(query);
  }

  fetchCoreFundamentals(symbol: string) {
    return this.marketDataProvider.fetchCoreFundamentals(symbol);
  }

  fetchCorporateActions(symbol: string) {
    return this.marketDataProvider.fetchCorporateActions(symbol);
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

    let records = await this.repository.listFundamentals(stock.id);
    if (records.length === 0) {
      const fundamentals = await this.fetchCoreFundamentals(stock.symbol);
      await this.repository.upsertFundamentals(stock.id, fundamentals);
      records = await this.repository.listFundamentals(stock.id);
    }

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
    let actions = await this.repository.listCorporateActions(stock.id);
    if (actions.length === 0) {
      const providerActions = await this.fetchCorporateActions(stock.symbol);
      await this.repository.upsertCorporateActions(stock.id, providerActions);
      await this.repository.dedupeCorporateActions(stock.id);
      actions = await this.repository.listCorporateActions(stock.id);
    }

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

  fetchHistorical(symbol: string, startDate?: Date, endDate?: Date) {
    return this.marketDataProvider.fetchHistorical(symbol, startDate, endDate);
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

    const batchSize = Math.max(1, Math.min(options.batchSize ?? 25, 250));
    const lookbackTradingDays = Math.max(1, Math.min(options.lookbackTradingDays ?? 3, 10));
    const startDate = new Date(now);
    startDate.setUTCDate(startDate.getUTCDate() - Math.max(lookbackTradingDays * 2 + 1, 7));
    startDate.setUTCHours(0, 0, 0, 0);

    const tasks = await this.repository.listActiveStockSyncTasks({ region, assetType }, batchSize);
    const summary: ScheduledRegionSyncSummary = {
      region,
      assetType,
      tradingDate,
      instrumentsProcessed: 0,
      rowsReceived: 0,
      rowsInserted: 0,
      rowsUpdated: 0,
      rowsSkipped: 0,
      rowsNoOp: 0,
      warningCount: 0,
      warnings: [],
      errors: [],
    };

    await this.repository.upsertSyncState({ region, assetType, tradingDate, status: 'PENDING', summary, lastCheckedAt: now });

    for (const task of tasks) {
      try {
        await this.throttleIngestion(250);
        const result = await this.ingestSymbol(task.symbol, startDate, now, false, {
          region,
          assetType,
          skipFreshnessGate: true,
        });
        summary.instrumentsProcessed += 1;
        summary.rowsReceived += result.rowsReceived;
        summary.rowsInserted += result.rowsInserted;
        summary.rowsUpdated += result.rowsUpdated;
        summary.rowsSkipped += result.rowsSkipped;
        summary.rowsNoOp += result.rowsNoOp ?? 0;
        summary.warningCount += result.warningCount;
        summary.warnings.push(...(result.warnings || []));
      } catch (error) {
        summary.errors.push(`${task.symbol}: ${error instanceof Error ? error.message : 'unknown error'}`);
      }
    }

    const latestTradingDate = await this.repository.latestStoredTradingDateForRegion(region, assetType);
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
    const status = summary.errors.length > 0
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

  async ingestSymbol(symbol: string, startDate?: Date, endDate?: Date, fullReload = false, options: {
    force?: boolean;
    region?: string;
    assetType?: string;
    skipFreshnessGate?: boolean;
  } = {}): Promise<SyncSummary> {
    console.log(`Ingesting ${symbol}...`);

    const stock = await this.repository.findStockBySymbol(symbol);
    const region = options.region || stock?.region || this.marketDataProvider.inferRegion(symbol).region || 'GLOBAL';
    const assetType = options.assetType || stock?.assetType || 'STOCK';
    const providerSymbol = stock?.providerSymbol || symbol;
    const now = endDate || new Date();
    const tradingDate = tradingDateForRegion(region, now) || now.toISOString().slice(0, 10);

    if (!fullReload && !options.force && !options.skipFreshnessGate) {
      const gate = await this.evaluateSyncFreshnessGate({
        region,
        assetType,
        scopeType: 'INSTRUMENT',
        scopeKey: symbol,
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
          scopeKey: symbol,
          tradingDate,
          timeframe: '1D',
          status: gate.reason === 'FINAL_CANDLE_CONFIRMED' ? 'FINAL_CONFIRMED' : 'SYNCED',
          summary,
          lastCheckedAt: now,
        });
        return summary;
      }
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

    const effectiveEndDate = now;

    if (effectiveStartDate >= effectiveEndDate) {
      console.log(`  Skipping ${symbol}: already up to date (last load: ${stock?.lastSuccessfulDataLoadTimestamp})`);
      return this.buildSkippedSyncSummary(1, 'RECENTLY_SYNCED', 'Latest daily candles already checked recently.', now, this.addMinutes(now, this.manualSyncCooldownMinutes).toISOString());
    }

    console.log(`  Fetching data from ${effectiveStartDate.toISOString().split('T')[0]} to ${effectiveEndDate.toISOString().split('T')[0]}`);

    const prices = await this.fetchHistorical(providerSymbol, effectiveStartDate, effectiveEndDate);

    if (prices.length === 0) {
      console.log(`  No new price data available for ${symbol}`);
      await this.repository.updateStockLoadTimestampBySymbol(symbol);
      const emptySummary = { rowsReceived: 0, rowsInserted: 0, rowsUpdated: 0, rowsSkipped: 0, rowsNoOp: 0, warningCount: 0, warnings: [] };
      await this.repository.upsertSyncState({
        region,
        assetType,
        scopeType: 'INSTRUMENT',
        scopeKey: symbol,
        tradingDate,
        timeframe: '1D',
        status: 'SYNCED',
        summary: emptySummary,
        lastCheckedAt: now,
        lastProviderFetchAt: now,
      });
      return emptySummary;
    }

    const pricesForStorage = prices.map((price) => ({ ...price, symbol }));
    const syncSummary = await this.storeHistorical(pricesForStorage);
    await this.repository.updateStockLoadTimestampBySymbol(symbol);
    await this.repository.upsertSyncState({
      region,
      assetType,
      scopeType: 'INSTRUMENT',
      scopeKey: symbol,
      tradingDate,
      timeframe: '1D',
      status: 'SYNCED',
      summary: syncSummary,
      lastCheckedAt: now,
      lastProviderFetchAt: now,
    });

    console.log(`  Successfully ingested ${prices.length} price ticks for ${symbol}`);
    return syncSummary;
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

  private normalizeInstrumentAssetType(value?: string | null, symbol?: string | null, name?: string | null): string {
    const normalizedSymbol = symbol?.trim().toUpperCase() || '';
    const normalizedName = name?.trim().toUpperCase() || '';
    if (normalizedSymbol.includes('FUT') || normalizedName.includes('FUTURE')) return 'FUTURE';
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
    const total = 9;
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
      symbol,
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
    const isin = this.readCsv(row, ['ISIN', 'ISIN NUMBER', 'ISINNUMBER']);
    const listingDate = this.readCsv(row, ['DATE OF LISTING', 'DATEOFLISTING']);
    const series = this.readCsv(row, ['SERIES', 'SM_SERIES', 'INSTRUMENT TYPE', 'INSTRUMENT']).toUpperCase();
    if (!sourceSymbol || !name) return null;
    const sourceSymbolUpper = this.baseSymbolFromProviderSymbol(sourceSymbol);
    const normalized = this.normalizeCatalogSymbol({ sourceSymbol: sourceSymbolUpper, exchange: 'NSE' }, source);
    const isEtf = source === 'NSE_ETF_SECURITIES' || series.includes('ETF') || /\bETF\b|BEES|NIFTY.*ETF/i.test(name);
    const isCashEquity = isEtf || !series || ['EQ', 'BE', 'BZ', 'SM', 'ST'].includes(series);
    if (!isCashEquity) return null;
    return {
      symbol: normalized.providerSymbol,
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
      symbol: this.providerSymbolForExchange(sourceSymbol, 'NSE'),
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
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
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

  private defaultBackfillStartDate(): Date {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 15);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  private async throttleIngestion(minDelayMs = 1000) {
    const now = Date.now();
    const elapsed = now - MarketDataFoundationService.lastIngestionAt;
    if (elapsed < minDelayMs) {
      await new Promise(resolve => setTimeout(resolve, minDelayMs - elapsed));
    }
    MarketDataFoundationService.lastIngestionAt = Date.now();
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

    if (syncState?.status === 'FINAL_CONFIRMED') {
      return {
        shouldSkip: true,
        reason: 'FINAL_CANDLE_CONFIRMED',
        message: this.skipMessage(input.scopeType, 'FINAL_CANDLE_CONFIRMED'),
      };
    }

    if (syncState?.lastCheckedAt && syncState.status !== 'FAILED') {
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
      return {
        shouldSkip: true,
        reason: marketReason,
        message: this.skipMessage(input.scopeType, marketReason),
        nextEligibleSyncAt: decision.nextSuggestedRunAt ?? undefined,
      };
    }

    return { shouldSkip: false, reason: 'RECENTLY_SYNCED', message: 'Sync is eligible.' };
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
