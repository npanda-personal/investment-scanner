import type { Request, Response } from 'express';
import { MarketDataFoundationService } from './market-data-foundation.service';
import { validateRequiredString } from './market-data-foundation.validation';

export class MarketDataFoundationController {
  constructor(private readonly service = new MarketDataFoundationService()) {}

  private getParam(value: string | string[] | undefined): string {
    return Array.isArray(value) ? value[0] : value || '';
  }

  listStocks = async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;
      const sortBy = req.query.sortBy as any;
      const sortOrder = req.query.sortOrder as 'asc' | 'desc' | undefined;
      const region = req.query.region as string | undefined;
      const search = req.query.search as string | undefined;

      if (page < 1) {
        return res.status(400).json({ error: 'Page must be at least 1' });
      }
      if (pageSize < 1 || pageSize > 100) {
        return res.status(400).json({ error: 'PageSize must be between 1 and 100' });
      }

      const result = await this.service.list({ page, pageSize, sortBy, sortOrder, region, search });
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
      const results = await this.service.searchAssets(query);
      return res.json(results);
    } catch (error) {
      console.error('Error searching assets:', error);
      return res.status(500).json({ error: 'Failed to search assets' });
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
      return res.status(500).json({ error: 'Failed to search Yahoo Finance' });
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

      if (workerCount < 1 || workerCount > 10) {
        return res.status(400).json({ success: false, message: 'workerCount must be between 1 and 10' });
      }
      if (workerConcurrency < 1 || workerConcurrency > 10) {
        return res.status(400).json({ success: false, message: 'workerConcurrency must be between 1 and 10' });
      }

      console.log(`Starting bulk sync with ${workerCount} workers, ${workerConcurrency} concurrency each`);
      const result = await this.service.syncAll(workerCount, workerConcurrency, delayBetweenBatchesMs);

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
}
