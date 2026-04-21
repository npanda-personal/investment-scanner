import express from 'express';
import { StockService } from './service';

const router = express.Router();
const stockService = new StockService();

/**
 * GET /api/stocks
 * Query parameters:
 * - page (default 1)
 * - pageSize (default 20)
 * - sortBy (symbol, name, lastSuccessfulDataLoadTimestamp, createdAt)
 * - sortOrder (asc, desc)
 * - region (filter by region)
 * - search (search in symbol or name)
 */
router.get('/', async (req, res) => {
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

    const result = await stockService.list({
      page,
      pageSize,
      sortBy,
      sortOrder,
      region,
      search,
    });
    return res.json(result);
  } catch (error) {
    console.error('Error listing stocks:', error);
    return res.status(500).json({ error: 'Failed to list stocks' });
  }
});

/**
 * GET /api/stocks/search
 * Query parameter: q (search query)
 * Searches for assets with database-first fallback to external API.
 * If an asset is not found locally, searches via Yahoo Finance,
 * persists new assets to the database, and returns results.
 */
router.get('/search', async (req, res) => {
  try {
    const query = req.query.q as string;
    if (!query || query.trim().length === 0) {
      return res.status(400).json({ error: 'Missing search query' });
    }
    const results = await stockService.searchAssets(query);
    return res.json(results);
  } catch (error) {
    console.error('Error searching assets:', error);
    return res.status(500).json({ error: 'Failed to search assets' });
  }
});

/**
 * GET /api/stocks/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const stock = await stockService.get(req.params.id);
    if (!stock) {
      return res.status(404).json({ error: 'Stock not found' });
    }
    return res.json(stock);
  } catch (error) {
    console.error('Error fetching stock:', error);
    return res.status(500).json({ error: 'Failed to fetch stock' });
  }
});

/**
 * POST /api/stocks
 * Body: { symbol, name, region, exchange? }
 */
router.post('/', async (req, res) => {
  try {
    const { symbol, name, region, exchange } = req.body;
    if (!symbol || !name || !region) {
      return res.status(400).json({ error: 'Missing required fields: symbol, name, region' });
    }
    const stock = await stockService.create({ symbol, name, region, exchange });
    return res.status(201).json(stock);
  } catch (error: any) {
    console.error('Error creating stock:', error);
    if (error.message.includes('already exists')) {
      return res.status(409).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Failed to create stock' });
  }
});

/**
 * PATCH /api/stocks/:id
 * Body: { name?, region?, exchange?, isActive? }
 */
router.patch('/:id', async (req, res) => {
  try {
    const stock = await stockService.update(req.params.id, req.body);
    return res.json(stock);
  } catch (error: any) {
    console.error('Error updating stock:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Failed to update stock' });
  }
});

/**
 * DELETE /api/stocks/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    await stockService.delete(req.params.id);
    return res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting stock:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Failed to delete stock' });
  }
});

/**
 * POST /api/stocks/:id/toggle-active
 * Toggle isActive status.
 */
router.post('/:id/toggle-active', async (req, res) => {
  try {
    const stock = await stockService.toggleActive(req.params.id);
    return res.json(stock);
  } catch (error: any) {
    console.error('Error toggling active status:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Failed to toggle active status' });
  }
});

/**
 * POST /api/stocks/:id/sync
 * Trigger data ingestion for the stock.
 */
router.post('/:id/sync', async (req, res) => {
  try {
    const result = await stockService.syncData(req.params.id);
    if (result.success) {
      return res.json(result);
    } else {
      return res.status(500).json(result);
    }
  } catch (error: any) {
    console.error('Error syncing stock data:', error);
    return res.status(500).json({ error: 'Failed to sync stock data' });
  }
});

/**
 * POST /api/stocks/sync-all
 * Trigger data ingestion for all active stocks using horizontal worker system.
 * Optional query parameters:
 * - workerCount (default: 4) - Number of parallel workers (3-5 recommended)
 * - workerConcurrency (default: 4) - Concurrent requests per worker (3-5 recommended)
 * - delayBetweenBatchesMs (default: 3000) - Delay between worker batches in milliseconds
 */
router.post('/sync-all', async (req, res) => {
  try {
    const workerCount = parseInt(req.query.workerCount as string) || 4;
    const workerConcurrency = parseInt(req.query.workerConcurrency as string) || 4;
    const delayBetweenBatchesMs = parseInt(req.query.delayBetweenBatchesMs as string) || 3000;
    
    // Validate parameters
    if (workerCount < 1 || workerCount > 10) {
      return res.status(400).json({
        success: false,
        message: 'workerCount must be between 1 and 10'
      });
    }
    
    if (workerConcurrency < 1 || workerConcurrency > 10) {
      return res.status(400).json({
        success: false,
        message: 'workerConcurrency must be between 1 and 10'
      });
    }
    
    console.log(`Starting bulk sync with ${workerCount} workers, ${workerConcurrency} concurrency each`);
    const result = await stockService.syncAll(workerCount, workerConcurrency, delayBetweenBatchesMs);
    
    if (result.success) {
      return res.json(result);
    } else {
      return res.status(500).json(result);
    }
  } catch (error: any) {
    console.error('Error in bulk sync:', error);
    return res.status(500).json({
      success: false,
      message: `Bulk sync failed: ${error.message}`
    });
  }
});

export default router;