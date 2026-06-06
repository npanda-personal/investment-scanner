import type { Request, Response } from 'express';
import { MarketDataFoundationService } from './market-data-foundation.service';
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

  private errorMessage(error: unknown, fallback: string): string {
    return error instanceof Error ? error.message : fallback;
  }

  private isTransientDatabaseError(error: unknown): boolean {
    const typed = error as { code?: string; message?: string } | null | undefined;
    const code = typeof typed?.code === 'string' ? typed.code : '';
    const message = error instanceof Error ? error.message : String(typed?.message || '');
    return ['P1001', 'P1002', 'P1017', 'P2024'].includes(code)
      || /server has closed the connection|database system is in recovery mode|not yet accepting connections|connection terminated|connection reset|can't reach database|connection pool timeout|timed out/i.test(message);
  }

  private databaseUnavailableResponse(res: Response, error: unknown) {
    return res.status(503).json({
      code: 'DATABASE_UNAVAILABLE',
      error: 'Database is temporarily unavailable. Retry the request after the database finishes recovery.',
      details: this.errorMessage(error, 'Database is temporarily unavailable'),
    });
  }

  private providerDisabledResponse(res: Response, operation: string) {
    return res.status(410).json({
      code: 'EXTERNAL_PROVIDER_DISABLED_NSE_BSE_ONLY',
      error: `${operation} is disabled`,
      message: 'Yahoo/yfinance, Angel One, broker API, provider fallback, provider validation, and provider backfill workflows are disabled. Use NSE/BSE exchange-file imports, historical exchange backfill, or manual verified evidence only.',
      allowedWorkflows: [
        'POST /api/v1/market-data/exchange-files/nse-cm-udiff/import',
        'POST /api/v1/market-data/exchange-files/historical-backfill',
        'POST /api/v1/market-data/fundamentals/manual-verified-import',
        'GET /api/v1/market-data/provider-cleanup/report',
        'POST /api/v1/market-data/provider-cleanup/execute',
      ],
    });
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

  listSourceFileImports = async (req: Request, res: Response) => {
    try {
      return res.json(await this.service.listSourceFileImports({
        source: typeof req.query.source === 'string' ? req.query.source : undefined,
        segment: typeof req.query.segment === 'string' ? req.query.segment : undefined,
        status: typeof req.query.status === 'string' ? req.query.status : undefined,
        startDate: typeof req.query.startDate === 'string' ? req.query.startDate : undefined,
        endDate: typeof req.query.endDate === 'string' ? req.query.endDate : undefined,
        limit: this.numberParam(req, 'limit'),
        sortBy: typeof req.query.sortBy === 'string' ? req.query.sortBy : undefined,
        sortDirection: typeof req.query.sortDirection === 'string' ? req.query.sortDirection : undefined,
      }));
    } catch (error) {
      if (this.isTransientDatabaseError(error)) return this.databaseUnavailableResponse(res, error);
      console.error('Error listing source file imports:', error);
      return res.status(500).json({ error: 'Failed to list source file imports' });
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
      const csvText = typeof req.body?.csvText === 'string' ? req.body.csvText : undefined;
      const fileUrl = typeof req.body?.fileUrl === 'string' ? req.body.fileUrl : undefined;
      if (!csvText && !fileUrl) {
        const result = await this.service.importNseIndexOfficialDaily({
          tradingDate: String(tradingDate),
          force: req.body?.force === true,
        });
        return res.status(result.status === 'FAILED' ? 500 : 200).json(result);
      }
      const result = await this.service.importNseIndexEodDaily({
        tradingDate: String(tradingDate),
        csvText,
        fileName: typeof req.body?.fileName === 'string' ? req.body.fileName : undefined,
        fileUrl,
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

  importNseDeliveryDaily = async (req: Request, res: Response) => {
    try {
      const tradingDate = req.body?.tradingDate || req.query.tradingDate;
      if (!tradingDate) {
        return res.status(400).json({ error: 'tradingDate is required' });
      }
      const result = await this.service.importNseDeliveryDaily({
        tradingDate: String(tradingDate),
        csvText: typeof req.body?.csvText === 'string' ? req.body.csvText : undefined,
        fileName: typeof req.body?.fileName === 'string' ? req.body.fileName : undefined,
        fileUrl: typeof req.body?.fileUrl === 'string' ? req.body.fileUrl : undefined,
        force: req.body?.force === true,
      });
      return res.status(result.status === 'FAILED' ? 500 : 200).json(result);
    } catch (error) {
      console.error('Error importing NSE delivery file:', error);
      return res.status(500).json({ error: this.errorMessage(error, 'NSE delivery import failed') });
    }
  };

  refreshNseDeliveryDaily = async (req: Request, res: Response) => {
    try {
      const tradingDate = req.body?.tradingDate || req.query.tradingDate;
      const result = await this.service.refreshNseDeliveryDaily({
        tradingDate: tradingDate ? String(tradingDate) : undefined,
        force: req.body?.force === true || req.query.force === 'true',
      });
      return res.status(result.status === 'FAILED' ? 500 : 200).json(result);
    } catch (error) {
      console.error('Error refreshing NSE delivery file:', error);
      return res.status(500).json({ error: this.errorMessage(error, 'NSE delivery refresh failed') });
    }
  };

  runNseDeliveryHistoricalBackfill = async (req: Request, res: Response) => {
    try {
      const result = await this.service.runNseDeliveryHistoricalBackfill({
        region: typeof req.body?.region === 'string' ? req.body.region : typeof req.query.region === 'string' ? req.query.region : undefined,
        assetType: typeof req.body?.assetType === 'string' ? req.body.assetType : typeof req.query.assetType === 'string' ? req.query.assetType : undefined,
        startDate: req.body?.startDate || req.query.startDate,
        endDate: req.body?.endDate || req.query.endDate,
        sessions: req.body?.sessions === undefined ? (req.query.sessions === undefined ? undefined : Number(req.query.sessions)) : Number(req.body.sessions),
        batchSize: req.body?.batchSize === undefined ? (req.query.batchSize === undefined ? undefined : Number(req.query.batchSize)) : Number(req.body.batchSize),
        offset: req.body?.offset === undefined ? (req.query.offset === undefined ? undefined : Number(req.query.offset)) : Number(req.body.offset),
        force: req.body?.force === true || req.query.force === 'true',
        downloadDelayMs: req.body?.downloadDelayMs === undefined ? (req.query.downloadDelayMs === undefined ? undefined : Number(req.query.downloadDelayMs)) : Number(req.body.downloadDelayMs),
        jitterMs: req.body?.jitterMs === undefined ? (req.query.jitterMs === undefined ? undefined : Number(req.query.jitterMs)) : Number(req.body.jitterMs),
      });
      return res.status(result.status === 'FAILED' ? 500 : 200).json(result);
    } catch (error) {
      console.error('Error running NSE delivery historical backfill:', error);
      return res.status(500).json({ error: this.errorMessage(error, 'NSE delivery historical backfill failed') });
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
      const workerCountValue = req.body?.workerCount ?? req.query.workerCount;
      const maxRetriesValue = req.body?.maxRetries ?? req.query.maxRetries;
      const result = await this.service.startExchangeHistoricalBackfillRun({
        region: typeof req.body?.region === 'string' ? req.body.region : typeof req.query.region === 'string' ? req.query.region : undefined,
        assetType: typeof req.body?.assetType === 'string' ? req.body.assetType : typeof req.query.assetType === 'string' ? req.query.assetType : undefined,
        startDate: String(startDate),
        endDate: String(endDate),
        maxDates: maxDatesValue === undefined ? undefined : Number(maxDatesValue),
        workerCount: workerCountValue === undefined ? undefined : Number(workerCountValue),
        maxRetries: maxRetriesValue === undefined ? undefined : Number(maxRetriesValue),
        includeBseFill: req.body?.includeBseFill === true || req.query.includeBseFill === 'true',
      });
      return res.status(202).json(result);
    } catch (error) {
      console.error('Error running exchange historical backfill:', error);
      return res.status(500).json({ error: this.errorMessage(error, 'Exchange historical backfill failed') });
    }
  };

  startExchangeHistoricalBackfillRun = async (req: Request, res: Response) => {
    try {
      const startDate = req.body?.startDate || req.query.startDate;
      const endDate = req.body?.endDate || req.query.endDate;
      if (!startDate || !endDate) {
        return res.status(400).json({ error: 'startDate and endDate are required' });
      }
      const result = await this.service.startExchangeHistoricalBackfillRun({
        region: typeof req.body?.region === 'string' ? req.body.region : typeof req.query.region === 'string' ? req.query.region : undefined,
        assetType: typeof req.body?.assetType === 'string' ? req.body.assetType : typeof req.query.assetType === 'string' ? req.query.assetType : undefined,
        startDate: String(startDate),
        endDate: String(endDate),
        maxDates: req.body?.maxDates === undefined ? undefined : Number(req.body.maxDates),
        workerCount: req.body?.workerCount === undefined ? undefined : Number(req.body.workerCount),
        maxRetries: req.body?.maxRetries === undefined ? undefined : Number(req.body.maxRetries),
        includeBseFill: req.body?.includeBseFill === true,
      });
      return res.status(202).json(result);
    } catch (error) {
      console.error('Error starting exchange historical backfill:', error);
      return res.status(500).json({ error: this.errorMessage(error, 'Exchange historical backfill start failed') });
    }
  };

  getExchangeHistoricalBackfillRun = async (req: Request, res: Response) => {
    try {
      return res.json(await this.service.getExchangeHistoricalBackfillRun(this.getParam(req.params.runId)));
    } catch (error) {
      if (this.isTransientDatabaseError(error)) return this.databaseUnavailableResponse(res, error);
      console.error('Error reading exchange historical backfill:', error);
      return res.status(404).json({ error: this.errorMessage(error, 'Exchange historical backfill run not found') });
    }
  };

  resumeExchangeHistoricalBackfillRun = async (req: Request, res: Response) => {
    try {
      return res.status(202).json(await this.service.resumeExchangeHistoricalBackfillRun(this.getParam(req.params.runId)));
    } catch (error) {
      console.error('Error resuming exchange historical backfill:', error);
      return res.status(404).json({ error: this.errorMessage(error, 'Exchange historical backfill resume failed') });
    }
  };

  retryFailedExchangeHistoricalBackfillRun = async (req: Request, res: Response) => {
    try {
      return res.status(202).json(await this.service.retryFailedExchangeHistoricalBackfillRun(this.getParam(req.params.runId), {
        maxRetries: req.body?.maxRetries === undefined ? undefined : Number(req.body.maxRetries),
      }));
    } catch (error) {
      console.error('Error retrying exchange historical backfill:', error);
      return res.status(404).json({ error: this.errorMessage(error, 'Exchange historical backfill retry failed') });
    }
  };

  cancelExchangeHistoricalBackfillRun = async (req: Request, res: Response) => {
    try {
      return res.json(await this.service.cancelExchangeHistoricalBackfillRun(this.getParam(req.params.runId)));
    } catch (error) {
      console.error('Error canceling exchange historical backfill:', error);
      return res.status(404).json({ error: this.errorMessage(error, 'Exchange historical backfill cancel failed') });
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

  importBulkManualVerifiedFundamentals = async (req: Request, res: Response) => {
    try {
      const result = await this.service.importBulkManualVerifiedFundamentals({
        fileName: String(req.body?.fileName || req.body?.sourceFileName || 'manual-verified-fundamentals.csv'),
        csvText: String(req.body?.csvText || req.body?.fileContent || ''),
        region: typeof req.body?.region === 'string' ? req.body.region : undefined,
        assetType: typeof req.body?.assetType === 'string' ? req.body.assetType : undefined,
        sourceUrl: typeof req.body?.sourceUrl === 'string' ? req.body.sourceUrl : undefined,
        evidenceDate: req.body?.evidenceDate,
      });
      return res.status(201).json(result);
    } catch (error) {
      console.error('Bulk manual verified fundamentals import error:', error);
      return res.status(400).json({ error: this.errorMessage(error, 'Bulk manual verified fundamentals import failed') });
    }
  };

  nseXbrlBulkIngest = async (req: Request, res: Response) => {
    try {
      const result = await this.service.importNseXbrlFundamentalsForUniverse({
        region: typeof req.body?.region === 'string' ? req.body.region : undefined,
        assetType: typeof req.body?.assetType === 'string' ? req.body.assetType : undefined,
        symbolBatchSize: req.body?.symbolBatchSize !== undefined ? Number(req.body.symbolBatchSize) : undefined,
        maxSymbols: req.body?.maxSymbols !== undefined ? Number(req.body.maxSymbols) : undefined,
        maxQuarterlyPeriods: req.body?.maxQuarterlyPeriods !== undefined ? Number(req.body.maxQuarterlyPeriods) : undefined,
        maxAnnualPeriods: req.body?.maxAnnualPeriods !== undefined ? Number(req.body.maxAnnualPeriods) : undefined,
        delayBetweenBatchesMs: req.body?.delayBetweenBatchesMs !== undefined ? Number(req.body.delayBetweenBatchesMs) : undefined,
      });
      return res.status(200).json(result);
    } catch (error) {
      console.error('NSE XBRL bulk ingest error:', error);
      return res.status(500).json({ error: this.errorMessage(error, 'NSE XBRL bulk ingest failed') });
    }
  };

  yahooSearch = async (req: Request, res: Response) => {
    void req;
    return this.providerDisabledResponse(res, 'Yahoo Finance search');
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
      const stock = await this.service.create({ symbol, name, region, exchange }, false);
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
    void req;
    return this.providerDisabledResponse(res, 'Instrument provider sync');

  };

  syncAllStocks = async (req: Request, res: Response) => {
    void req;
    return this.providerDisabledResponse(res, 'Bulk provider stock sync');

  };

  startStockCatalogSyncRun = async (req: Request, res: Response) => {
    void req;
    return this.providerDisabledResponse(res, 'Legacy provider catalog sync run');
  };

  getStockCatalogSyncRun = async (req: Request, res: Response) => {
    void req;
    return this.providerDisabledResponse(res, 'Legacy provider catalog sync run status');
  };

  cancelStockCatalogSyncRun = async (req: Request, res: Response) => {
    void req;
    return this.providerDisabledResponse(res, 'Legacy provider catalog sync run cancel');
  };

  searchMarketData = async (req: Request, res: Response) => {
    void req;
    return this.providerDisabledResponse(res, 'External provider search');
  };

  ingestSymbol = async (req: Request, res: Response) => {
    void req;
    return this.providerDisabledResponse(res, 'Legacy provider ingestion');
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
    void req;
    return this.providerDisabledResponse(res, 'Legacy provider fundamentals fetch');
  };

  getCorporateActions = async (req: Request, res: Response) => {
    void req;
    return this.providerDisabledResponse(res, 'Legacy provider corporate-actions fetch');
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

  // ---------------------------------------------------------------------------
  // Market Scans
  // ---------------------------------------------------------------------------

  marketScan52wHigh = async (req: Request, res: Response) => {
    try {
      const { region, assetType } = this.getMarketFilter(req);
      return res.json(await this.service.marketScan52w({
        region,
        assetType,
        scanType: '52w-high',
        proximityPct: this.numberParam(req, 'proximityPct'),
        limit: this.numberParam(req, 'limit'),
      }));
    } catch (error) {
      console.error('Market scan 52w-high error:', error);
      return res.status(500).json({ error: 'Market scan 52w-high failed' });
    }
  };

  marketScan52wLow = async (req: Request, res: Response) => {
    try {
      const { region, assetType } = this.getMarketFilter(req);
      return res.json(await this.service.marketScan52w({
        region,
        assetType,
        scanType: '52w-low',
        proximityPct: this.numberParam(req, 'proximityPct'),
        limit: this.numberParam(req, 'limit'),
      }));
    } catch (error) {
      console.error('Market scan 52w-low error:', error);
      return res.status(500).json({ error: 'Market scan 52w-low failed' });
    }
  };

  marketScanDeliverySpike = async (req: Request, res: Response) => {
    try {
      const { region, assetType } = this.getMarketFilter(req);
      return res.json(await this.service.marketScanDeliverySpike({
        region,
        assetType,
        lookbackBars: this.numberParam(req, 'lookbackBars'),
        minSpikeRatio: this.numberParam(req, 'minSpikeRatio'),
        limit: this.numberParam(req, 'limit'),
      }));
    } catch (error) {
      console.error('Market scan delivery-spike error:', error);
      return res.status(500).json({ error: 'Market scan delivery-spike failed' });
    }
  };

  marketScanVolumeSpike = async (req: Request, res: Response) => {
    try {
      const { region, assetType } = this.getMarketFilter(req);
      return res.json(await this.service.marketScanVolumeSpike({
        region,
        assetType,
        lookbackBars: this.numberParam(req, 'lookbackBars'),
        minSpikeRatio: this.numberParam(req, 'minSpikeRatio'),
        limit: this.numberParam(req, 'limit'),
      }));
    } catch (error) {
      console.error('Market scan volume-spike error:', error);
      return res.status(500).json({ error: 'Market scan volume-spike failed' });
    }
  };

  // ---------------------------------------------------------------------------
  // Multi-Factor Screener
  // ---------------------------------------------------------------------------

  screener = async (req: Request, res: Response) => {
    try {
      const signalDirection = typeof req.query.signalDirection === 'string' ? req.query.signalDirection.toUpperCase() : undefined;
      const validDirections = ['BULLISH', 'BEARISH', 'NEUTRAL'];
      if (signalDirection && !validDirections.includes(signalDirection)) {
        return res.status(400).json({ error: `signalDirection must be one of: ${validDirections.join(', ')}` });
      }
      const capBand = typeof req.query.capBand === 'string' ? req.query.capBand.toUpperCase() : undefined;
      const validCapBands = ['LARGE', 'MID', 'SMALL'];
      if (capBand && !validCapBands.includes(capBand)) {
        return res.status(400).json({ error: `capBand must be one of: ${validCapBands.join(', ')}` });
      }
      return res.json(await this.service.screener({
        signalDirection,
        minScore: this.numberParam(req, 'minScore'),
        minRsPercentile: this.numberParam(req, 'minRsPercentile'),
        sector: typeof req.query.sector === 'string' ? req.query.sector : undefined,
        capBand: capBand as 'LARGE' | 'MID' | 'SMALL' | undefined,
        minDeliveryPct: this.numberParam(req, 'minDeliveryPct'),
        min52wPositionPct: this.numberParam(req, 'min52wPositionPct'),
        excludeFnoBan: this.parseOptionalBoolean(req.query.excludeFnoBan),
        limit: this.numberParam(req, 'limit'),
      }));
    } catch (error) {
      console.error('Screener error:', error);
      return res.status(500).json({ error: 'Screener query failed' });
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
    void req;
    return this.providerDisabledResponse(res, 'Provider validation');

  };

  enrichMetadata = async (req: Request, res: Response) => {
    void req;
    return this.providerDisabledResponse(res, 'Provider metadata enrichment');

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
    void req;
    return this.providerDisabledResponse(res, 'Provider business metadata repair');

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
    void req;
    return this.providerDisabledResponse(res, 'Provider price backfill');

  };

  startPriceBackfillRun = async (req: Request, res: Response) => {
    void req;
    return this.providerDisabledResponse(res, 'Provider price backfill run');

  };

  getPriceBackfillRun = async (req: Request, res: Response) => {
    void req;
    return this.providerDisabledResponse(res, 'Provider price backfill run status');

  };

  activePriceBackfillRun = async (req: Request, res: Response) => {
    void req;
    return this.providerDisabledResponse(res, 'Provider price backfill active run');

  };

  cancelPriceBackfillRun = async (req: Request, res: Response) => {
    void req;
    return this.providerDisabledResponse(res, 'Provider price backfill cancellation');

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
    void req;
    return this.providerDisabledResponse(res, 'Legacy provider ingestion sync');

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
    return this.providerDisabledResponse(res, 'Provider FX-rate sync');
  };

  // ---------------------------------------------------------------------------
  // NSE Corporate-Actions import
  // ---------------------------------------------------------------------------

  importNseCorporateActions = async (req: Request, res: Response) => {
    try {
      const result = await this.service.importNseCorporateActionsFile({
        csvOrJsonText: typeof req.body?.csvOrJsonText === 'string' ? req.body.csvOrJsonText : undefined,
        rows: Array.isArray(req.body?.rows) ? req.body.rows : undefined,
        region: typeof req.body?.region === 'string' ? req.body.region : typeof req.query.region === 'string' ? req.query.region : undefined,
        assetType: typeof req.body?.assetType === 'string' ? req.body.assetType : typeof req.query.assetType === 'string' ? req.query.assetType : undefined,
        source: typeof req.body?.source === 'string' ? req.body.source : undefined,
        force: req.body?.force === true || req.query.force === 'true',
      });
      return res.status(result.status === 'FAILED' ? 500 : 200).json(result);
    } catch (error) {
      console.error('Error importing NSE corporate actions:', error);
      return res.status(500).json({ error: this.errorMessage(error, 'NSE corporate-actions import failed') });
    }
  };

  // ---------------------------------------------------------------------------
  // Adjusted-close recompute
  // ---------------------------------------------------------------------------

  recomputeAdjustedClose = async (req: Request, res: Response) => {
    try {
      const instrumentId = req.body?.instrumentId || req.query.instrumentId;
      const batchMode = req.body?.batch === true || req.query.batch === 'true' || (!instrumentId);

      if (!batchMode && instrumentId) {
        const result = await this.service.recomputeAdjustedClosesForInstrument(String(instrumentId));
        return res.json(result);
      }

      // Batch mode.
      const result = await this.service.recomputeAdjustedClosesBatch({
        region: typeof req.body?.region === 'string' ? req.body.region : typeof req.query.region === 'string' ? req.query.region : undefined,
        assetType: typeof req.body?.assetType === 'string' ? req.body.assetType : typeof req.query.assetType === 'string' ? req.query.assetType : undefined,
        batchSize: req.body?.batchSize !== undefined ? Number(req.body.batchSize) : req.query.batchSize !== undefined ? Number(req.query.batchSize) : undefined,
        offset: req.body?.offset !== undefined ? Number(req.body.offset) : req.query.offset !== undefined ? Number(req.query.offset) : undefined,
      });
      return res.json(result);
    } catch (error) {
      console.error('Error recomputing adjusted closes:', error);
      return res.status(500).json({ error: this.errorMessage(error, 'Adjusted-close recompute failed') });
    }
  };
}
