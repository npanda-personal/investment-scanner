import type { Request, Response } from 'express';
import { MarketDataFoundationService } from './market-data-foundation.service';
import { validateRequiredString } from './market-data-foundation.validation';
import { normalizeMarketRegion } from '../../shared/utils/market-scope';
import { getMarketDataFoundationScheduler } from './market-data-foundation.scheduler';

export class MarketDataFoundationController {
  constructor(private readonly service = new MarketDataFoundationService()) {}

  private getParam(value: string | string[] | undefined): string {
    return Array.isArray(value) ? value[0] : value || '';
  }

  private getMarketFilter(req: Request) {
    const rawRegion = (req.query.region || req.query.market || req.body?.region || req.body?.market) as string | undefined;
    const region = normalizeMarketRegion(rawRegion);
    const assetType = ((req.query.assetType || req.body?.assetType || req.body?.asset_type) as string | undefined)?.trim().toUpperCase() || undefined;
    console.log('[MarketDataFoundation] received market filter', {
      rawRegion: rawRegion || 'GLOBAL',
      normalizedRegion: region || 'GLOBAL',
      assetType: assetType || 'ALL',
      path: req.originalUrl,
    });
    return { region, assetType };
  }

  private isProviderDisabled(error: unknown): boolean {
    return Boolean(error && typeof error === 'object' && (error as any).code === 'EXTERNAL_PROVIDER_DISABLED_NSE_BSE_ONLY');
  }

  private errorMessage(error: unknown, fallback: string): string {
    return error instanceof Error ? error.message : fallback;
  }

  listStocks = async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;
      const sortBy = req.query.sortBy as any;
      const sortOrder = req.query.sortOrder as 'asc' | 'desc' | undefined;
      const { region, assetType: scopedAssetType } = this.getMarketFilter(req);
      const search = req.query.search as string | undefined;
      const country = req.query.country as string | undefined;
      const exchange = req.query.exchange as string | undefined;
      const assetType = (req.query.assetType as string | undefined) || scopedAssetType;
      const instrumentSegment = req.query.instrumentSegment as string | undefined;
      const currency = req.query.currency as string | undefined;
      const sector = req.query.sector as string | undefined;
      const industry = req.query.industry as string | undefined;
      const dataStatus = (req.query.dataStatus || req.query.status) as string | undefined;
      const catalogSource = req.query.catalogSource as string | undefined;
      const providerSupportStatus = req.query.providerSupportStatus as string | undefined;
      const derivativesEligible = this.parseOptionalBoolean(req.query.derivativesEligible);

      if (page < 1) {
        return res.status(400).json({ error: 'Page must be at least 1' });
      }
      if (pageSize < 1 || pageSize > 100) {
        return res.status(400).json({ error: 'PageSize must be between 1 and 100' });
      }

      const result = await this.service.list({ page, pageSize, sortBy, sortOrder, region, country, exchange, assetType, instrumentSegment, currency, sector, industry, dataStatus, catalogSource, providerSupportStatus, derivativesEligible, search });
      return res.json(result);
    } catch (error) {
      console.error('Error listing stocks:', error);
      return res.status(500).json({ error: 'Failed to list stocks' });
    }
  };

  searchAssets = async (req: Request, res: Response) => {
    try {
      const query = req.query.q as string;
      if (!query || query.trim().length === 0) {
        return res.status(400).json({ error: 'Missing search query' });
      }
      const { region, assetType } = this.getMarketFilter(req);
      const results = await this.service.searchAssets(query, { region, assetType });
      return res.json(results);
    } catch (error) {
      console.error('Error searching assets:', error);
      return res.status(500).json({ error: 'Failed to search assets' });
    }
  };

  providerCleanupReport = async (_req: Request, res: Response) => {
    try {
      return res.json(await this.service.providerDataCleanupReport());
    } catch (error) {
      console.error('Error building provider cleanup report:', error);
      return res.status(500).json({ error: 'Failed to build provider cleanup report' });
    }
  };

  executeProviderCleanup = async (_req: Request, res: Response) => {
    try {
      return res.json(await this.service.executeProviderDataCleanup());
    } catch (error) {
      console.error('Error executing provider cleanup:', error);
      return res.status(500).json({ error: 'Failed to execute provider cleanup' });
    }
  };

  importNseCmUdiffDaily = async (req: Request, res: Response) => {
    try {
      const tradingDate = req.body?.tradingDate || req.query.tradingDate;
      if (!tradingDate) {
        return res.status(400).json({ error: 'tradingDate is required' });
      }
      const result = await this.service.importNseCmUdiffDaily({
        tradingDate: String(tradingDate),
        csvText: typeof req.body?.csvText === 'string' ? req.body.csvText : undefined,
        fileName: typeof req.body?.fileName === 'string' ? req.body.fileName : undefined,
        fileUrl: typeof req.body?.fileUrl === 'string' ? req.body.fileUrl : undefined,
        force: req.body?.force === true,
      });
      return res.status(result.status === 'FAILED' ? 500 : 200).json(result);
    } catch (error) {
      console.error('Error importing NSE CM UDiFF daily file:', error);
      return res.status(500).json({ error: this.errorMessage(error, 'NSE CM UDiFF daily import failed') });
    }
  };

  importBseCmBackupDaily = async (req: Request, res: Response) => {
    try {
      const tradingDate = req.body?.tradingDate || req.query.tradingDate;
      if (!tradingDate) {
        return res.status(400).json({ error: 'tradingDate is required' });
      }
      const result = await this.service.importBseCmBackupDaily({
        tradingDate: String(tradingDate),
        csvText: typeof req.body?.csvText === 'string' ? req.body.csvText : undefined,
        fileName: typeof req.body?.fileName === 'string' ? req.body.fileName : undefined,
        fileUrl: typeof req.body?.fileUrl === 'string' ? req.body.fileUrl : undefined,
        force: req.body?.force === true,
      });
      return res.status(result.status === 'FAILED' ? 500 : 200).json(result);
    } catch (error) {
      console.error('Error importing BSE CM backup file:', error);
      return res.status(500).json({ error: this.errorMessage(error, 'BSE CM backup import failed') });
    }
  };

  importNseIndexEodDaily = async (req: Request, res: Response) => {
    try {
      const tradingDate = req.body?.tradingDate || req.query.tradingDate;
      if (!tradingDate) {
        return res.status(400).json({ error: 'tradingDate is required' });
      }
      const result = await this.service.importNseIndexEodDaily({
        tradingDate: String(tradingDate),
        csvText: typeof req.body?.csvText === 'string' ? req.body.csvText : undefined,
        fileName: typeof req.body?.fileName === 'string' ? req.body.fileName : undefined,
        fileUrl: typeof req.body?.fileUrl === 'string' ? req.body.fileUrl : undefined,
        force: req.body?.force === true,
        segment: req.body?.segment === 'SECTOR_INDEX' ? 'SECTOR_INDEX' : 'INDEX',
      });
      return res.status(result.status === 'FAILED' ? 500 : 200).json(result);
    } catch (error) {
      console.error('Error importing NSE index EOD file:', error);
      return res.status(500).json({ error: this.errorMessage(error, 'NSE index EOD import failed') });
    }
  };

  importNseFoUdiffDaily = async (req: Request, res: Response) => {
    try {
      const tradingDate = req.body?.tradingDate || req.query.tradingDate;
      if (!tradingDate) {
        return res.status(400).json({ error: 'tradingDate is required' });
      }
      const result = await this.service.importNseFoUdiffDaily({
        tradingDate: String(tradingDate),
        csvText: typeof req.body?.csvText === 'string' ? req.body.csvText : undefined,
        fileName: typeof req.body?.fileName === 'string' ? req.body.fileName : undefined,
        fileUrl: typeof req.body?.fileUrl === 'string' ? req.body.fileUrl : undefined,
        force: req.body?.force === true,
      });
      return res.status(result.status === 'FAILED' ? 500 : 200).json(result);
    } catch (error) {
      console.error('Error importing NSE F&O UDiFF file:', error);
      return res.status(500).json({ error: this.errorMessage(error, 'NSE F&O UDiFF import failed') });
    }
  };

  runExchangeHistoricalBackfill = async (req: Request, res: Response) => {
    try {
      const startDate = req.body?.startDate || req.query.startDate;
      const endDate = req.body?.endDate || req.query.endDate;
      if (!startDate || !endDate) {
        return res.status(400).json({ error: 'startDate and endDate are required' });
      }
      const maxDatesValue = req.body?.maxDates ?? req.query.maxDates;
      const result = await this.service.runExchangeHistoricalBackfill({
        region: typeof req.body?.region === 'string' ? req.body.region : typeof req.query.region === 'string' ? req.query.region : undefined,
        assetType: typeof req.body?.assetType === 'string' ? req.body.assetType : typeof req.query.assetType === 'string' ? req.query.assetType : undefined,
        startDate: String(startDate),
        endDate: String(endDate),
        maxDates: maxDatesValue === undefined ? undefined : Number(maxDatesValue),
        includeBseFill: req.body?.includeBseFill === true || req.query.includeBseFill === 'true',
      });
      return res.status(result.status === 'FAILED' ? 500 : 200).json(result);
    } catch (error) {
      console.error('Error running exchange historical backfill:', error);
      return res.status(500).json({ error: this.errorMessage(error, 'Exchange historical backfill failed') });
    }
  };

  importManualVerifiedFundamental = async (req: Request, res: Response) => {
    try {
      const result = await this.service.importManualVerifiedFundamental({
        stockId: String(req.body?.stockId || req.body?.instrumentId || ''),
        region: typeof req.body?.region === 'string' ? req.body.region : undefined,
        assetType: typeof req.body?.assetType === 'string' ? req.body.assetType : undefined,
        periodType: String(req.body?.periodType || ''),
        periodEndDate: req.body?.periodEndDate,
        revenue: req.body?.revenue ?? null,
        eps: req.body?.eps ?? null,
        netIncome: req.body?.netIncome ?? null,
        peRatio: req.body?.peRatio ?? null,
        marketCap: req.body?.marketCap ?? null,
        sourceNote: req.body?.sourceNote ?? null,
        sourceUrl: req.body?.sourceUrl ?? null,
        validatedBy: req.body?.validatedBy ?? null,
        validatedAt: req.body?.validatedAt ?? null,
        currency: req.body?.currency ?? null,
      });
      return res.status(201).json(result);
    } catch (error) {
      console.error('Manual verified fundamental import error:', error);
      return res.status(400).json({ error: this.errorMessage(error, 'Manual verified fundamental import failed') });
    }
  };

  yahooSearch = async (req: Request, res: Response) => {
    try {
      const query = req.query.q as string;
      if (!query || query.trim().length === 0) {
        return res.status(400).json({ error: 'Missing search query' });
      }
      const results = await this.service.yahooSearch(query);
      return res.json(results);
    } catch (error) {
      console.error('Error in Yahoo search:', error);
      return res.status(this.isProviderDisabled(error) ? 410 : 500).json({ error: this.errorMessage(error, 'Failed to search Yahoo Finance') });
    }
  };

  getStock = async (req: Request, res: Response) => {
    try {
      const stock = await this.service.get(this.getParam(req.params.id));
      if (!stock) {
        return res.status(404).json({ error: 'Stock not found' });
      }
      return res.json(stock);
    } catch (error) {
      console.error('Error fetching stock:', error);
      return res.status(500).json({ error: 'Failed to fetch stock' });
    }
  };

  createStock = async (req: Request, res: Response) => {
    try {
      const { symbol, name, region, exchange } = req.body;
      if (!symbol || !name || !region) {
        return res.status(400).json({ error: 'Missing required fields: symbol, name, region' });
      }
      const stock = await this.service.create({ symbol, name, region, exchange });
      return res.status(201).json(stock);
    } catch (error: any) {
      console.error('Error creating stock:', error);
      if (error.message.includes('already exists')) {
        return res.status(409).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Failed to create stock' });
    }
  };

  updateStock = async (req: Request, res: Response) => {
    try {
      const stock = await this.service.update(this.getParam(req.params.id), req.body);
      return res.json(stock);
    } catch (error: any) {
      console.error('Error updating stock:', error);
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Failed to update stock' });
    }
  };

  deleteStock = async (req: Request, res: Response) => {
    try {
      await this.service.delete(this.getParam(req.params.id));
      return res.status(204).send();
    } catch (error: any) {
      console.error('Error deleting stock:', error);
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Failed to delete stock' });
    }
  };

  toggleStockActive = async (req: Request, res: Response) => {
    try {
      const stock = await this.service.toggleActive(this.getParam(req.params.id));
      return res.json(stock);
    } catch (error: any) {
      console.error('Error toggling active status:', error);
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Failed to toggle active status' });
    }
  };

  syncStock = async (req: Request, res: Response) => {
    try {
      const result = await this.service.syncData(this.getParam(req.params.id));
      if (result.success) {
        return res.json(result);
      }
      return res.status(500).json(result);
    } catch (error: any) {
      console.error('Error syncing stock data:', error);
      return res.status(500).json({ error: 'Failed to sync stock data' });
    }
  };

  syncAllStocks = async (req: Request, res: Response) => {
    try {
      const workerCount = parseInt(req.query.workerCount as string) || 4;
      const workerConcurrency = parseInt(req.query.workerConcurrency as string) || 4;
      const delayBetweenBatchesMs = parseInt(req.query.delayBetweenBatchesMs as string) || 3000;
      const force = this.parseBoolean(req.query.force as string | undefined) || this.parseBoolean(req.body?.force);
      const fullReload = this.parseBoolean(req.query.fullReload as string | undefined) || this.parseBoolean(req.body?.fullReload);
      const { region, assetType } = this.getMarketFilter(req);

      if (workerCount < 1 || workerCount > 10) {
        return res.status(400).json({ success: false, message: 'workerCount must be between 1 and 10' });
      }
      if (workerConcurrency < 1 || workerConcurrency > 10) {
        return res.status(400).json({ success: false, message: 'workerConcurrency must be between 1 and 10' });
      }

      console.log(`Starting bulk sync with ${workerCount} workers, ${workerConcurrency} concurrency each`);
      const result = await this.service.syncAll(workerCount, workerConcurrency, delayBetweenBatchesMs, { region, assetType, force, fullReload });

      if (result.success) {
        return res.json(result);
      }
      return res.status(500).json(result);
    } catch (error: any) {
      console.error('Error in bulk sync:', error);
      return res.status(500).json({
        success: false,
        message: `Bulk sync failed: ${error.message}`
      });
    }
  };

  startStockCatalogSyncRun = async (req: Request, res: Response) => {
    try {
      const { region, assetType } = this.getMarketFilter(req);
      const result = await this.service.startCatalogSyncRun({
        region: region || req.body?.region,
        assetType: assetType || req.body?.assetType || req.body?.asset_type,
        batchSize: this.numberParam(req, 'batchSize'),
        workerCount: this.numberParam(req, 'workerCount'),
        workerConcurrency: this.numberParam(req, 'workerConcurrency'),
        delayBetweenBatchesMs: this.numberParam(req, 'delayBetweenBatchesMs'),
        maxBatches: this.numberParam(req, 'maxBatches'),
        force: this.parseOptionalBoolean(req.query.force ?? req.body?.force),
        fullReload: this.parseOptionalBoolean(req.query.fullReload ?? req.body?.fullReload),
      });
      return res.status(202).json(result);
    } catch (error: any) {
      console.error('Error starting catalog sync run:', error);
      return res.status(500).json({
        success: false,
        message: `Catalog sync run failed to start: ${error.message}`,
      });
    }
  };

  getStockCatalogSyncRun = async (req: Request, res: Response) => {
    try {
      const runId = this.getParam(req.params.runId);
      const result = this.service.getCatalogSyncRun(runId);
      if (!result) {
        return res.status(404).json({
          success: false,
          code: 'RUN_NOT_FOUND',
          message: 'Catalog sync run was not found. It may have expired or the server restarted.',
        });
      }
      return res.json(result);
    } catch (error: any) {
      console.error('Error reading catalog sync run:', error);
      return res.status(500).json({
        success: false,
        message: `Catalog sync run lookup failed: ${error.message}`,
      });
    }
  };

  cancelStockCatalogSyncRun = async (req: Request, res: Response) => {
    try {
      const runId = this.getParam(req.params.runId);
      const result = this.service.cancelCatalogSyncRun(runId);
      if (!result) {
        return res.status(404).json({
          success: false,
          code: 'RUN_NOT_FOUND',
          message: 'Catalog sync run was not found. It may have expired or the server restarted.',
        });
      }
      return res.json(result);
    } catch (error: any) {
      console.error('Error canceling catalog sync run:', error);
      return res.status(500).json({
        success: false,
        message: `Catalog sync run cancellation failed: ${error.message}`,
      });
    }
  };

  searchMarketData = async (req: Request, res: Response) => {
    const { q } = req.query;
    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid query parameter "q"' });
    }

    try {
      const results = await this.service.searchProvider(q);
      return res.json(results);
    } catch (error) {
      console.error('Search error:', error);
      return res.status(500).json({ error: 'Failed to perform external search' });
    }
  };

  ingestSymbol = async (req: Request, res: Response) => {
    const { symbol } = req.body;
    this.getMarketFilter(req);
    if (!symbol || typeof symbol !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid symbol' });
    }

    try {
      await this.service.ingestSymbol(symbol);
      return res.json({ success: true, message: `Ingestion completed for ${symbol}` });
    } catch (error) {
      console.error('Ingestion error:', error);
      return res.status(500).json({ error: 'Failed to ingest data', details: (error as Error).message });
    }
  };

  listPrices = async (req: Request, res: Response) => {
    const symbol = this.getParam(req.params.symbol);
    const { limit = '100' } = req.query;
    const limitNum = parseInt(limit as string, 10);
    if (isNaN(limitNum) || limitNum < 1) {
      return res.status(400).json({ error: 'Invalid limit parameter' });
    }

    try {
      const prices = await this.service.listPrices(symbol, limitNum);
      return res.json({ symbol, prices });
    } catch (error) {
      console.error('Error fetching prices:', error);
      return res.status(500).json({ error: 'Database query failed' });
    }
  };

  getFundamentals = async (req: Request, res: Response) => {
    const symbol = this.getParam(req.params.symbol);
    const validationError = validateRequiredString(symbol, 'symbol');
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    try {
      const fundamentals = await this.service.fetchCoreFundamentals(symbol);
      return res.json(fundamentals);
    } catch (error) {
      console.error('Error fetching fundamentals:', error);
      return res.status(500).json({ error: 'Failed to fetch fundamentals' });
    }
  };

  getCorporateActions = async (req: Request, res: Response) => {
    const symbol = this.getParam(req.params.symbol);
    const validationError = validateRequiredString(symbol, 'symbol');
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    try {
      const actions = await this.service.fetchCorporateActions(symbol);
      return res.json({ symbol, actions });
    } catch (error) {
      console.error('Error fetching corporate actions:', error);
      return res.status(500).json({ error: 'Failed to fetch corporate actions' });
    }
  };

  health = async (req: Request, res: Response) => {
    try {
      const { region, assetType } = this.getMarketFilter(req);
      return res.json(await this.service.health({ region, assetType }));
    } catch (error) {
      console.error('Market data health error:', error);
      return res.status(500).json({ error: 'Market data health check failed' });
    }
  };

  universeHealth = async (req: Request, res: Response) => {
    try {
      const { region, assetType } = this.getMarketFilter(req);
      return res.json(await this.service.universeHealth({ region, assetType }));
    } catch (error) {
      console.error('Market data universe health error:', error);
      return res.status(500).json({ error: 'Market data universe health check failed' });
    }
  };

  stockMissingDataDiagnostics = async (req: Request, res: Response) => {
    try {
      const { region, assetType } = this.getMarketFilter(req);
      return res.json(await this.service.stockMissingDataDiagnostics({
        region,
        assetType,
        sampleLimit: this.numberParam(req, 'sampleLimit') ?? this.numberParam(req, 'limit'),
      }));
    } catch (error) {
      console.error('Stock missing-data diagnostics error:', error);
      return res.status(500).json({ error: 'Stock missing-data diagnostics failed' });
    }
  };

  trustedReviewUniverseHealth = async (req: Request, res: Response) => {
    try {
      const { region, assetType } = this.getMarketFilter(req);
      return res.json(await this.service.trustedReviewUniverseHealth({ region, assetType }));
    } catch (error) {
      console.error('Trusted review universe health error:', error);
      return res.status(500).json({ error: 'Trusted review universe health check failed' });
    }
  };

  reviewReadinessSummary = async (req: Request, res: Response) => {
    try {
      const { region, assetType } = this.getMarketFilter(req);
      return res.json(await this.service.reviewReadinessSummary({ region, assetType }));
    } catch (error) {
      console.error('Review readiness summary error:', error);
      return res.status(500).json({ error: 'Review readiness summary failed' });
    }
  };

  marketMovers = async (req: Request, res: Response) => {
    try {
      const { region, assetType } = this.getMarketFilter(req);
      return res.json(await this.service.marketMovers({
        region,
        assetType,
        limit: this.numberParam(req, 'limit'),
        range: typeof req.query.range === 'string' ? req.query.range : undefined,
      }));
    } catch (error) {
      console.error('Market movers error:', error);
      return res.status(500).json({ error: 'Market movers summary failed' });
    }
  };

  marketMap = async (req: Request, res: Response) => {
    try {
      const { region, assetType } = this.getMarketFilter(req);
      return res.json(await this.service.marketMap({
        region,
        assetType,
        limit: this.numberParam(req, 'limit'),
        range: typeof req.query.range === 'string' ? req.query.range : undefined,
      }));
    } catch (error) {
      console.error('Market map read error:', error);
      return res.status(500).json({ error: 'Market map read failed' });
    }
  };

  trustedReviewUniverseInstruments = async (req: Request, res: Response) => {
    try {
      const { region, assetType } = this.getMarketFilter(req);
      return res.json({
        instruments: await this.service.listTrustedReviewUniverseInstruments({
          region,
          assetType,
          limit: this.numberParam(req, 'limit'),
          offset: this.numberParam(req, 'offset'),
        }),
      });
    } catch (error) {
      console.error('Trusted review universe instrument list error:', error);
      return res.status(500).json({ error: 'Trusted review universe instrument list failed' });
    }
  };

  repairPlan = async (req: Request, res: Response) => {
    try {
      const { region, assetType } = this.getMarketFilter(req);
      return res.json(await this.service.repairPlan({ region, assetType }));
    } catch (error) {
      console.error('Market data repair plan error:', error);
      return res.status(500).json({ error: 'Market data repair plan failed' });
    }
  };

  repairWorkbench = async (req: Request, res: Response) => {
    try {
      const { region, assetType } = this.getMarketFilter(req);
      return res.json(await this.service.trustedUniverseRepairWorkbench({ region, assetType }));
    } catch (error) {
      console.error('Market data repair workbench error:', error);
      return res.status(500).json({ error: 'Market data repair workbench failed' });
    }
  };

  manualMetadataTemplate = async (req: Request, res: Response) => {
    try {
      const { region, assetType } = this.getMarketFilter(req);
      return res.json(await this.service.manualMetadataTemplate({ region, assetType }));
    } catch (error) {
      console.error('Market data manual metadata template error:', error);
      return res.status(500).json({ error: 'Market data manual metadata template failed' });
    }
  };

  repairRun = async (req: Request, res: Response) => {
    try {
      const { region, assetType } = this.getMarketFilter(req);
      return res.json(await this.service.repairRun({
        region,
        assetType,
        batchSize: this.numberParam(req, 'batchSize') ?? this.numberParam(req, 'limit'),
        maxBatchesPerAction: this.numberParam(req, 'maxBatchesPerAction'),
        workerConcurrency: this.numberParam(req, 'workerConcurrency'),
        actions: this.parseRepairRunActions(req.body?.actions),
        dryRun: this.parseOptionalBoolean(req.query.dryRun ?? req.body?.dryRun),
        mode: req.body?.mode === 'DRAIN_UNTIL_BLOCKED' || req.query.mode === 'DRAIN_UNTIL_BLOCKED' ? 'DRAIN_UNTIL_BLOCKED' : undefined,
        includeRetryFailed: this.parseOptionalBoolean(req.query.includeRetryFailed ?? req.body?.includeRetryFailed),
        providerValidationQueue: req.body?.providerValidationQueue === 'RETRY_FAILED' || req.query.providerValidationQueue === 'RETRY_FAILED'
          ? 'RETRY_FAILED'
          : req.body?.providerValidationQueue === 'UNKNOWN_FIRST' || req.query.providerValidationQueue === 'UNKNOWN_FIRST'
            ? 'UNKNOWN_FIRST'
            : undefined,
        force: this.parseOptionalBoolean(req.query.force ?? req.body?.force),
        fullReload: this.parseOptionalBoolean(req.query.fullReload ?? req.body?.fullReload),
        csvText: typeof req.body?.csvText === 'string' ? req.body.csvText : undefined,
        catalogSource: typeof req.body?.catalogSource === 'string' ? req.body.catalogSource : undefined,
        importMode: req.body?.importMode === 'MANUAL_CSV' || req.body?.importMode === 'CONFIGURED_URL' ? req.body.importMode : undefined,
      }));
    } catch (error: any) {
      console.error('Market data repair run error:', error);
      return res.status(500).json({ error: error.message || 'Market data repair run failed' });
    }
  };

  latestRepairRun = async (req: Request, res: Response) => {
    try {
      const { region, assetType } = this.getMarketFilter(req);
      return res.json(await this.service.latestRepairRun({ region, assetType }));
    } catch (error) {
      console.error('Latest market data repair run error:', error);
      return res.status(500).json({ error: 'Latest market data repair run failed' });
    }
  };

  validateProviders = async (req: Request, res: Response) => {
    try {
      const { region, assetType } = this.getMarketFilter(req);
      return res.json(await this.service.validateProviders({
        region,
        assetType,
        batchSize: this.numberParam(req, 'batchSize') ?? this.numberParam(req, 'limit'),
        offset: this.numberParam(req, 'offset'),
        includeRetryFailed: this.parseOptionalBoolean(req.query.includeRetryFailed ?? req.body?.includeRetryFailed),
        providerValidationQueue: req.body?.providerValidationQueue === 'RETRY_FAILED' || req.query.providerValidationQueue === 'RETRY_FAILED'
          ? 'RETRY_FAILED'
          : req.body?.providerValidationQueue === 'UNKNOWN_FIRST' || req.query.providerValidationQueue === 'UNKNOWN_FIRST'
            ? 'UNKNOWN_FIRST'
            : undefined,
      }));
    } catch (error) {
      console.error('Provider validation repair error:', error);
      return res.status(500).json({ error: 'Provider validation repair failed' });
    }
  };

  enrichMetadata = async (req: Request, res: Response) => {
    try {
      const { region, assetType } = this.getMarketFilter(req);
      return res.json(await this.service.enrichMetadata({
        region,
        assetType,
        batchSize: this.numberParam(req, 'batchSize') ?? this.numberParam(req, 'limit'),
        offset: this.numberParam(req, 'offset'),
        csvText: typeof req.body?.csvText === 'string' ? req.body.csvText : undefined,
        catalogSource: typeof req.body?.catalogSource === 'string' ? req.body.catalogSource : undefined,
      }));
    } catch (error) {
      console.error('Metadata enrichment repair error:', error);
      return res.status(500).json({ error: 'Metadata enrichment repair failed' });
    }
  };

  repairCatalogIdentity = async (req: Request, res: Response) => {
    try {
      const { region, assetType } = this.getMarketFilter(req);
      return res.json(await this.service.repairCatalogIdentity({
        region,
        assetType,
        batchSize: this.numberParam(req, 'batchSize') ?? this.numberParam(req, 'limit'),
        offset: this.numberParam(req, 'offset'),
        csvText: typeof req.body?.csvText === 'string' ? req.body.csvText : undefined,
        catalogSource: typeof req.body?.catalogSource === 'string' ? req.body.catalogSource : undefined,
        importMode: req.body?.importMode === 'MANUAL_CSV' || req.body?.importMode === 'CONFIGURED_URL' ? req.body.importMode : undefined,
      }));
    } catch (error) {
      console.error('Catalog identity repair error:', error);
      return res.status(500).json({ error: 'Catalog identity repair failed' });
    }
  };

  repairProviderBusinessMetadata = async (req: Request, res: Response) => {
    try {
      const { region, assetType } = this.getMarketFilter(req);
      return res.json(await this.service.repairProviderBusinessMetadata({
        region,
        assetType,
        batchSize: this.numberParam(req, 'batchSize') ?? this.numberParam(req, 'limit'),
        offset: this.numberParam(req, 'offset'),
        workerConcurrency: this.numberParam(req, 'workerConcurrency'),
        force: this.parseOptionalBoolean(req.query.force ?? req.body?.force),
      }));
    } catch (error) {
      console.error('Provider business metadata repair error:', error);
      return res.status(500).json({ error: 'Provider business metadata repair failed' });
    }
  };

  repairPriceIdentity = async (req: Request, res: Response) => {
    try {
      const { region, assetType } = this.getMarketFilter(req);
      return res.json(await this.service.repairPriceIdentity({
        region,
        assetType,
        batchSize: this.numberParam(req, 'batchSize') ?? this.numberParam(req, 'limit'),
        offset: this.numberParam(req, 'offset'),
        dryRun: this.parseOptionalBoolean(req.query.dryRun ?? req.body?.dryRun),
      }));
    } catch (error: any) {
      console.error('Price identity repair error:', error);
      return res.status(500).json({ error: error.message || 'Price identity repair failed' });
    }
  };

  importManualMetadata = async (req: Request, res: Response) => {
    try {
      const { region, assetType } = this.getMarketFilter(req);
      return res.json(await this.service.importManualMetadata({
        region,
        assetType,
        batchSize: this.numberParam(req, 'batchSize') ?? this.numberParam(req, 'limit'),
        offset: this.numberParam(req, 'offset'),
        csvText: typeof req.body?.csvText === 'string' ? req.body.csvText : undefined,
      }));
    } catch (error: any) {
      console.error('Manual metadata import error:', error);
      return res.status(500).json({ error: error.message || 'Manual metadata import failed' });
    }
  };

  backfillPrices = async (req: Request, res: Response) => {
    try {
      const { region, assetType } = this.getMarketFilter(req);
      return res.json(await this.service.backfillPrices({
        region,
        assetType,
        batchSize: this.numberParam(req, 'batchSize') ?? this.numberParam(req, 'limit'),
        offset: this.numberParam(req, 'offset'),
        workerConcurrency: this.numberParam(req, 'workerConcurrency'),
        policy: this.parsePriceBackfillPolicy(req.query.policy ?? req.body?.policy),
        force: this.parseOptionalBoolean(req.query.force ?? req.body?.force),
        fullReload: this.parseOptionalBoolean(req.query.fullReload ?? req.body?.fullReload),
      }));
    } catch (error) {
      console.error('Price backfill repair error:', error);
      return res.status(500).json({ error: 'Price backfill repair failed' });
    }
  };

  startPriceBackfillRun = async (req: Request, res: Response) => {
    try {
      const { region, assetType } = this.getMarketFilter(req);
      return res.status(202).json(await this.service.startPriceBackfillRun({
        region,
        assetType,
        batchSize: this.numberParam(req, 'batchSize') ?? this.numberParam(req, 'limit'),
        workerConcurrency: this.numberParam(req, 'workerConcurrency'),
        maxBatches: this.numberParam(req, 'maxBatches'),
        triggerType: 'manual',
        policy: this.parsePriceBackfillPolicy(req.query.policy ?? req.body?.policy),
        force: this.parseOptionalBoolean(req.query.force ?? req.body?.force),
        fullReload: this.parseOptionalBoolean(req.query.fullReload ?? req.body?.fullReload),
      }));
    } catch (error: any) {
      console.error('Price backfill run start error:', error);
      return res.status(500).json({ error: error.message || 'Price backfill run start failed' });
    }
  };

  getPriceBackfillRun = async (req: Request, res: Response) => {
    try {
      const run = this.service.getPriceBackfillRun(this.getParam(req.params.runId));
      if (!run) return res.status(404).json({ error: 'Price backfill run not found' });
      return res.json(run);
    } catch (error: any) {
      console.error('Price backfill run status error:', error);
      return res.status(500).json({ error: error.message || 'Price backfill run status failed' });
    }
  };

  activePriceBackfillRun = async (req: Request, res: Response) => {
    try {
      const { region, assetType } = this.getMarketFilter(req);
      return res.json(this.service.activePriceBackfillRun({ region, assetType }));
    } catch (error: any) {
      console.error('Active price backfill run status error:', error);
      return res.status(500).json({ error: error.message || 'Active price backfill run status failed' });
    }
  };

  cancelPriceBackfillRun = async (req: Request, res: Response) => {
    try {
      const run = this.service.cancelPriceBackfillRun(this.getParam(req.params.runId));
      if (!run) return res.status(404).json({ error: 'Price backfill run not found' });
      return res.json(run);
    } catch (error: any) {
      console.error('Price backfill run cancel error:', error);
      return res.status(500).json({ error: error.message || 'Price backfill run cancel failed' });
    }
  };

  schedulerStatus = async (_req: Request, res: Response) => {
    try {
      return res.json(await getMarketDataFoundationScheduler().status());
    } catch (error) {
      console.error('Market data scheduler status error:', error);
      return res.status(500).json({ error: 'Market data scheduler status check failed' });
    }
  };

  listCatalogSources = async (_req: Request, res: Response) => {
    try {
      return res.json(this.service.listCatalogSources());
    } catch (error) {
      console.error('Catalog source list error:', error);
      return res.status(500).json({ error: 'Failed to list catalog sources' });
    }
  };

  listInstruments = async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 50;
      const search = req.query.search as string | undefined;
      const sortBy = req.query.sortBy as any;
      const sortOrder = req.query.sortOrder as 'asc' | 'desc' | undefined;
      const { region, assetType: scopedAssetType } = this.getMarketFilter(req);
      const country = req.query.country as string | undefined;
      const exchange = req.query.exchange as string | undefined;
      const assetType = (req.query.assetType as string | undefined) || scopedAssetType;
      const instrumentSegment = req.query.instrumentSegment as string | undefined;
      const currency = req.query.currency as string | undefined;
      const sector = req.query.sector as string | undefined;
      const industry = req.query.industry as string | undefined;
      const dataStatus = (req.query.dataStatus || req.query.status) as string | undefined;
      const catalogSource = req.query.catalogSource as string | undefined;
      const providerSupportStatus = req.query.providerSupportStatus as string | undefined;
      const derivativesEligible = this.parseOptionalBoolean(req.query.derivativesEligible);
      const result = await this.service.listInstruments({ page, pageSize, sortBy, sortOrder, region, country, exchange, assetType, instrumentSegment, currency, sector, industry, dataStatus, catalogSource, providerSupportStatus, derivativesEligible, search });
      return res.json(result);
    } catch (error) {
      console.error('Error listing instruments:', error);
      return res.status(500).json({ error: 'Failed to list instruments' });
    }
  };

  createInstrument = async (req: Request, res: Response) => {
    try {
      const instrument = await this.service.createInstrument(req.body);
      return res.status(201).json(instrument);
    } catch (error: any) {
      console.error('Error creating instrument:', error);
      if (error.message.includes('required')) {
        return res.status(400).json({ error: error.message });
      }
      if (error.message.includes('already exists')) {
        return res.status(409).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Failed to create instrument' });
    }
  };

  getInstrument = async (req: Request, res: Response) => {
    try {
      const { region, assetType } = this.getMarketFilter(req);
      const instrument = await this.service.getInstrument(this.getParam(req.params.id), { region, assetType });
      if (!instrument) {
        return res.status(404).json({ error: 'Instrument not found' });
      }
      return res.json(instrument);
    } catch (error) {
      console.error('Error fetching instrument:', error);
      return res.status(500).json({ error: 'Failed to fetch instrument' });
    }
  };

  listInstrumentPrices = async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 250;
      const startDate = typeof req.query.startDate === 'string' ? new Date(req.query.startDate) : undefined;
      const endDate = typeof req.query.endDate === 'string' ? new Date(req.query.endDate) : undefined;
      const { region, assetType } = this.getMarketFilter(req);
      const result = await this.service.listPricesByInstrumentId(this.getParam(req.params.instrumentId), limit, startDate, endDate, { region, assetType });
      if (!result) {
        return res.status(404).json({ error: 'Instrument not found' });
      }
      return res.json(result);
    } catch (error) {
      console.error('Error fetching instrument prices:', error);
      return res.status(500).json({ error: 'Failed to fetch instrument prices' });
    }
  };

  getInstrumentLatestPrice = async (req: Request, res: Response) => {
    try {
      const { region, assetType } = this.getMarketFilter(req);
      const result = await this.service.latestPriceByInstrumentId(this.getParam(req.params.instrumentId), { region, assetType });
      if (!result) {
        return res.status(404).json({ error: 'Instrument not found' });
      }
      return res.json(result);
    } catch (error) {
      console.error('Error fetching latest instrument price:', error);
      return res.status(500).json({ error: 'Failed to fetch latest price' });
    }
  };

  getInstrumentFundamentals = async (req: Request, res: Response) => {
    try {
      const { region, assetType } = this.getMarketFilter(req);
      const result = await this.service.fundamentalsByInstrumentId(this.getParam(req.params.instrumentId), { region, assetType });
      if (!result) {
        return res.status(404).json({ error: 'Instrument not found' });
      }
      return res.json(result);
    } catch (error) {
      console.error('Error fetching instrument fundamentals:', error);
      return res.status(500).json({ error: 'Failed to fetch fundamentals' });
    }
  };

  getInstrumentCorporateActions = async (req: Request, res: Response) => {
    try {
      const { region, assetType } = this.getMarketFilter(req);
      const result = await this.service.corporateActionsByInstrumentId(this.getParam(req.params.instrumentId), { region, assetType });
      if (!result) {
        return res.status(404).json({ error: 'Instrument not found' });
      }
      return res.json(result);
    } catch (error) {
      console.error('Error fetching instrument corporate actions:', error);
      return res.status(500).json({ error: 'Failed to fetch corporate actions' });
    }
  };

  syncV1 = async (req: Request, res: Response) => {
    try {
      const result = await this.service.syncV1(req.body);
      return res.status(result.success ? 200 : 400).json(result);
    } catch (error: any) {
      console.error('Market data sync error:', error);
      return res.status(500).json({
        success: false,
        message: 'Market data sync failed',
        errors: [error.message],
      });
    }
  };

  importCatalog = async (req: Request, res: Response) => {
    try {
      const result = await this.service.importCatalog(req.body);
      return res.json({ success: true, ...result });
    } catch (error: any) {
      console.error('Catalog import error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Catalog import failed',
      });
    }
  };

  backfillCatalogMetadata = async (req: Request, res: Response) => {
    try {
      const result = await this.service.backfillCatalogMetadata(req.body || {});
      return res.json({ success: true, ...result });
    } catch (error: any) {
      console.error('Catalog metadata backfill error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Catalog metadata backfill failed',
      });
    }
  };

  private numberParam(req: Request, key: string): number | undefined {
    const value = req.query[key] ?? req.body?.[key];
    if (value === undefined || value === null || value === '') return undefined;
    const parsed = Number(Array.isArray(value) ? value[0] : value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private parseBoolean(value: unknown): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value !== 'string') return false;
    return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
  }

  private parseOptionalBoolean(value: unknown): boolean | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    return this.parseBoolean(value);
  }

  private parseRepairRunActions(value: unknown): any[] | undefined {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return value.split(',').map((item) => item.trim()).filter(Boolean);
    return undefined;
  }

  private parsePriceBackfillPolicy(value: unknown): 'INCREMENTAL_LATEST_ONLY' | 'AUTO_DEEP_FOR_SHALLOW' | 'FORCE_DEEP' | undefined {
    const policy = Array.isArray(value) ? value[0] : value;
    if (typeof policy !== 'string') return undefined;
    const normalized = policy.trim().toUpperCase();
    if (normalized === 'INCREMENTAL_LATEST_ONLY' || normalized === 'AUTO_DEEP_FOR_SHALLOW' || normalized === 'FORCE_DEEP') {
      return normalized;
    }
    return undefined;
  }

  listFxRates = async (_req: Request, res: Response) => {
    try {
      return res.json(await this.service.listFxRates());
    } catch (error) {
      console.error('Error fetching FX rates:', error);
      return res.status(500).json({ error: 'Failed to fetch FX rates' });
    }
  };

  getFxRate = async (req: Request, res: Response) => {
    try {
      const result = await this.service.getFxRate(this.getParam(req.params.pair));
      if (!result) {
        return res.status(404).json({ error: 'FX rate not found' });
      }
      return res.json(result);
    } catch (error) {
      console.error('Error fetching FX rate:', error);
      return res.status(500).json({ error: 'Failed to fetch FX rate' });
    }
  };

  syncFxRates = async (_req: Request, res: Response) => {
    try {
      const rates = await this.service.syncFxRates();
      return res.json({ success: true, ratesSynced: rates.length });
    } catch (error: any) {
      console.error('Error syncing FX rates:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  };
}
