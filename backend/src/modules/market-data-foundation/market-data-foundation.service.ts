import { MarketDataFoundationRepository } from './market-data-foundation.repository';
import { YahooFinanceIngestionService } from './market-data-foundation.provider';
import { enqueueIngestionJob } from './market-data-foundation.queue';
import type {
  CreateStockRequest,
  HistoricalPrice,
  MarketDataStatus,
  PaginationOptions,
  SearchResult,
  SyncSummary,
  UpdateStockRequest,
  V1CreateInstrumentRequest,
  V1IngestionRequest,
  V1Instrument,
  V1SyncResult,
} from './market-data-foundation.types';
import { validateInstrumentInput } from './market-data-foundation.validation';

export class MarketDataFoundationService {
  private static lastIngestionAt = 0;

  constructor(
    private readonly repository = new MarketDataFoundationRepository(),
    private readonly marketDataProvider = new YahooFinanceIngestionService()
  ) {}

  list(options: PaginationOptions) {
    return this.repository.listStocks(options);
  }

  async health() {
    const [instrumentCount, latestDataTimestamp] = await Promise.all([
      this.repository.instrumentCount(),
      this.repository.latestDataTimestamp(),
    ]);

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
    };
  }

  get(id: string) {
    return this.repository.findStockById(id);
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
      currency: options.currency,
      sector: options.sector,
      search: options.search,
    });

    return {
      instruments: result.stocks.map((stock) => this.toV1Instrument(stock)),
      pagination: result.pagination,
    };
  }

  async getInstrument(id: string) {
    const stock = await this.get(id);
    return stock ? this.toV1Instrument(stock) : null;
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
        assetType: data.asset_type.trim().toUpperCase(),
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
      await this.repository.updateStockLoadTimestampById(id);

      return { success: true, message: `Data ingestion completed for ${stock.symbol}`, syncSummary };
    } catch (error: any) {
      console.error(`Data ingestion failed for ${stock.symbol}:`, error);
      return { success: false, message: error.message };
    }
  }

  async searchAssets(query: string): Promise<any[]> {
    const localResults = await this.repository.searchStocks(query);

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

  async listPricesByInstrumentId(instrumentId: string, limit = 250, startDate?: Date, endDate?: Date) {
    const stock = await this.repository.findStockById(instrumentId);
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

  async latestPriceByInstrumentId(instrumentId: string) {
    const stock = await this.repository.findStockById(instrumentId);
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

  async fundamentalsByInstrumentId(instrumentId: string) {
    const stock = await this.repository.findStockById(instrumentId);
    if (!stock) {
      return null;
    }

    let records = await this.repository.listFundamentals(stock.id);
    if (records.length === 0) {
      const fundamentals = await this.fetchCoreFundamentals(stock.symbol);
      await this.repository.upsertFundamentals(stock.id, fundamentals);
      records = await this.repository.listFundamentals(stock.id);
    }

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

  async corporateActionsByInstrumentId(instrumentId: string) {
    const stock = await this.repository.findStockById(instrumentId);
    if (!stock) {
      return null;
    }

    let actions = await this.repository.listCorporateActions(stock.id);
    if (actions.length === 0) {
      const providerActions = await this.fetchCorporateActions(stock.symbol);
      await this.repository.upsertCorporateActions(stock.id, providerActions);
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

  async ingestSymbol(symbol: string, startDate?: Date, endDate?: Date): Promise<SyncSummary> {
    console.log(`Ingesting ${symbol}...`);

    const stock = await this.repository.findStockBySymbol(symbol);
    let effectiveStartDate = startDate;

    if (!effectiveStartDate) {
      const backfillStartDate = this.defaultBackfillStartDate();
      const coverage = await this.repository.priceCoverage(symbol);
      const hasEnoughHistory = coverage.oldestTimestamp && coverage.oldestTimestamp <= this.backfillCoverageCutoffDate(backfillStartDate);

      if (!hasEnoughHistory) {
        effectiveStartDate = backfillStartDate;
        console.log(`  Backfilling ${symbol} from ${effectiveStartDate.toISOString().split('T')[0]} (stored rows: ${coverage.count})`);
      } else if (stock?.lastSuccessfulDataLoadTimestamp) {
        effectiveStartDate = new Date(stock.lastSuccessfulDataLoadTimestamp);
        effectiveStartDate.setDate(effectiveStartDate.getDate() + 1);
        console.log(`  Using incremental start date: ${effectiveStartDate.toISOString().split('T')[0]} (based on lastSuccessfulDataLoadTimestamp)`);
      } else {
        effectiveStartDate = coverage.latestTimestamp ? new Date(coverage.latestTimestamp) : backfillStartDate;
        if (coverage.latestTimestamp) {
          effectiveStartDate.setDate(effectiveStartDate.getDate() + 1);
        }
        console.log(`  Using default start date: ${effectiveStartDate.toISOString().split('T')[0]} (15-year first-time load)`);
      }
    }

    const effectiveEndDate = endDate || new Date();

    if (effectiveStartDate >= effectiveEndDate) {
      console.log(`  Skipping ${symbol}: already up to date (last load: ${stock?.lastSuccessfulDataLoadTimestamp})`);
      return { rowsReceived: 0, rowsInserted: 0, rowsUpdated: 0, rowsSkipped: 0, warningCount: 0, warnings: [] };
    }

    console.log(`  Fetching data from ${effectiveStartDate.toISOString().split('T')[0]} to ${effectiveEndDate.toISOString().split('T')[0]}`);

    const prices = await this.fetchHistorical(symbol, effectiveStartDate, effectiveEndDate);

    if (prices.length === 0) {
      console.log(`  No new price data available for ${symbol}`);
      await this.repository.updateStockLoadTimestampBySymbol(symbol);
      return { rowsReceived: 0, rowsInserted: 0, rowsUpdated: 0, rowsSkipped: 0, warningCount: 0, warnings: [] };
    }

    const syncSummary = await this.storeHistorical(prices);
    await this.repository.updateStockLoadTimestampBySymbol(symbol);

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
          region: regionInfo.region || 'US',
          exchange: request.exchange || match?.exchange || regionInfo.exchange || 'UNKNOWN',
        }, false);
      }
    }

    let pricesStored = false;
    let syncSummary: SyncSummary | undefined;
    try {
      const masterData = await this.marketDataProvider.fetchCompanyMasterData(stock.symbol).catch(() => null);
      if (masterData) {
        stock = await this.repository.updateCompanyMasterData(stock.id, {
          name: masterData.companyName || stock.name,
          exchange: request.exchange || masterData.exchange || stock.exchange || undefined,
          country: masterData.country,
          sector: masterData.sector,
          industry: masterData.industry,
          currency: request.currency || masterData.currency,
          marketCap: masterData.marketCap,
          assetType: request.asset_type || masterData.assetType,
          isDelisted: masterData.isDelisted ?? false,
          ipoDate: masterData.ipoDate,
          isin: request.isin,
        });
      }
    } catch (error) {
      errors.push(`Company master sync failed: ${error instanceof Error ? error.message : 'unknown error'}`);
    }

    try {
      syncSummary = await this.ingestSymbol(stock.symbol);
      pricesStored = true;
    } catch (error) {
      errors.push(`Price ingestion failed: ${error instanceof Error ? error.message : 'unknown error'}`);
    }

    const [fundamentals, corporateActions] = await Promise.all([
      this.fetchCoreFundamentals(stock.symbol).catch(() => null),
      this.fetchCorporateActions(stock.symbol).catch(() => []),
    ]);
    if (fundamentals) {
      await this.repository.upsertFundamentals(stock.id, fundamentals).catch((error) => {
        errors.push(`Fundamentals persistence failed: ${error instanceof Error ? error.message : 'unknown error'}`);
      });
    }
    if (corporateActions.length > 0) {
      await this.repository.upsertCorporateActions(stock.id, corporateActions).catch((error) => {
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
        asset_type: request.asset_type || 'EQUITY',
        isin: request.isin,
      }),
      message: errors.length > 0 ? 'Sync completed with partial data' : 'Sync completed',
      pricesStored,
      fundamentalsAvailable: Boolean(fundamentals && (fundamentals.revenue || fundamentals.earnings || fundamentals.ratios.trailingPe)),
      corporateActionsAvailable: corporateActions.length > 0,
      syncSummary,
      errors: errors.length > 0 ? errors : undefined,
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
    delayBetweenBatchesMs: number = 3000
  ) {
    try {
      const allStocks = await this.repository.listActiveStockSyncTasks();
      const totalStocks = allStocks.length;
      const results: Array<{symbol: string, success: boolean, message: string, timestamp: string, workerId?: number}> = [];
      const errors: Array<{symbol: string, success: boolean, message: string, timestamp: string, workerId?: number}> = [];

      console.log(`Starting bulk sync for ${totalStocks} active stocks`);
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
        const workerResults = await worker.processTasks(tasks);

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
    return {
      id: stock.id,
      symbol: stock.symbol,
      company_name: overrides?.company_name || stock.name,
      exchange: overrides?.exchange || stock.exchange || null,
      country: stock.country || null,
      sector: stock.sector || null,
      industry: stock.industry || null,
      currency: overrides?.currency || stock.currency || this.defaultCurrencyForRegion(stock.region),
      market_cap: stock.marketCap !== null && stock.marketCap !== undefined ? Number(stock.marketCap) : null,
      asset_type: overrides?.asset_type || stock.assetType || 'EQUITY',
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

  private backfillCoverageCutoffDate(backfillStartDate: Date): Date {
    const cutoff = new Date(backfillStartDate);
    cutoff.setDate(cutoff.getDate() + 14);
    return cutoff;
  }

  private async throttleIngestion(minDelayMs = 1000) {
    const now = Date.now();
    const elapsed = now - MarketDataFoundationService.lastIngestionAt;
    if (elapsed < minDelayMs) {
      await new Promise(resolve => setTimeout(resolve, minDelayMs - elapsed));
    }
    MarketDataFoundationService.lastIngestionAt = Date.now();
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
