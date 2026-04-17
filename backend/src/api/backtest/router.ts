import express from 'express';
import { BacktestService } from '../../backtest/service';

const router = express.Router();
const backtestService = new BacktestService();

// Helper to extract user ID (temporary: from header x-user-id)
const getUserId = (req: express.Request): string => {
  const userId = req.headers['x-user-id'] as string;
  // TODO: replace with JWT authentication
  if (!userId) {
    // For development, default to a test user
    return 'test-user-id';
  }
  return userId;
};

// List all backtest configurations for the current user
router.get('/', async (req, res) => {
  try {
    const userId = getUserId(req);
    const configs = await backtestService.list(userId);
    return res.json(configs);
  } catch (error) {
    console.error('Error listing backtest configurations:', error);
    return res.status(500).json({ error: 'Failed to list backtest configurations' });
  }
});

// Create a new backtest configuration
router.post('/', async (req, res) => {
  try {
    const userId = getUserId(req);
    const {
      name,
      description,
      watchlistIds,
      startDate,
      endDate,
      strategyConfig,
      positionSizing,
      stopLoss,
      takeProfit,
    } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid name' });
    }
    if (!watchlistIds || !Array.isArray(watchlistIds)) {
      return res.status(400).json({ error: 'Missing or invalid watchlistIds' });
    }
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Missing startDate or endDate' });
    }
    if (!strategyConfig) {
      return res.status(400).json({ error: 'Missing strategyConfig' });
    }

    const config = await backtestService.create(userId, {
      name,
      description,
      watchlistIds,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      strategyConfig,
      positionSizing,
      stopLoss,
      takeProfit,
    });
    return res.status(201).json(config);
  } catch (error) {
    console.error('Error creating backtest configuration:', error);
    return res.status(500).json({ error: 'Failed to create backtest configuration' });
  }
});

// Get a specific backtest configuration
router.get('/:id', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    const config = await backtestService.get(userId, id);
    if (!config) {
      return res.status(404).json({ error: 'Backtest configuration not found' });
    }
    return res.json(config);
  } catch (error) {
    console.error('Error fetching backtest configuration:', error);
    return res.status(500).json({ error: 'Failed to fetch backtest configuration' });
  }
});

// Update a backtest configuration
router.put('/:id', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    const {
      name,
      description,
      watchlistIds,
      startDate,
      endDate,
      strategyConfig,
      positionSizing,
      stopLoss,
      takeProfit,
    } = req.body;

    const config = await backtestService.update(userId, id, {
      name,
      description,
      watchlistIds,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      strategyConfig,
      positionSizing,
      stopLoss,
      takeProfit,
    });
    return res.json(config);
  } catch (error) {
    console.error('Error updating backtest configuration:', error);
    if (error instanceof Error && error.message.includes('RecordNotFound')) {
      return res.status(404).json({ error: 'Backtest configuration not found' });
    }
    return res.status(500).json({ error: 'Failed to update backtest configuration' });
  }
});

// Delete a backtest configuration
router.delete('/:id', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    await backtestService.delete(userId, id);
    return res.status(204).send();
  } catch (error) {
    console.error('Error deleting backtest configuration:', error);
    if (error instanceof Error && error.message.includes('RecordNotFound')) {
      return res.status(404).json({ error: 'Backtest configuration not found' });
    }
    return res.status(500).json({ error: 'Failed to delete backtest configuration' });
  }
});

// Run a backtest for a configuration
router.post('/:id/run', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    // Ensure the config belongs to the user
    const config = await backtestService.get(userId, id);
    if (!config) {
      return res.status(404).json({ error: 'Backtest configuration not found' });
    }
    const result = await backtestService.runBacktest(userId, id);
    return res.json(result);
  } catch (error) {
    console.error('Error running backtest:', error);
    return res.status(500).json({ error: 'Failed to run backtest' });
  }
});

// Get backtest results for a configuration
router.get('/:id/results', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    const config = await backtestService.get(userId, id);
    if (!config) {
      return res.status(404).json({ error: 'Backtest configuration not found' });
    }
    const { limit = '10' } = req.query;
    const limitNum = parseInt(limit as string, 10);
    const results = await backtestService.getResults(id, limitNum);
    return res.json(results);
  } catch (error) {
    console.error('Error fetching backtest results:', error);
    return res.status(500).json({ error: 'Failed to fetch backtest results' });
  }
});

// Get a specific backtest result by its ID
router.get('/results/:resultId', async (req, res) => {
  try {
    const { resultId } = req.params;
    const result = await backtestService.getResult(resultId);
    if (!result) {
      return res.status(404).json({ error: 'Backtest result not found' });
    }
    // Optionally verify that the result belongs to a config owned by the user (skipped for simplicity)
    return res.json(result);
  } catch (error) {
    console.error('Error fetching backtest result:', error);
    return res.status(500).json({ error: 'Failed to fetch backtest result' });
  }
});

export default router;