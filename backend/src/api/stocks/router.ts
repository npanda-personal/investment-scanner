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

export default router;