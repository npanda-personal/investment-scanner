import express from 'express';
import { Prisma } from '@prisma/client';
import { BacktestService } from '../../backtest/service';
import { BacktestEngine } from '../../backtest/engine';
import { ScanRunService } from '../../scanners/scan-run.service';

const router = express.Router();
const backtestService = new BacktestService();
const scanRunService = new ScanRunService();

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

// POST /api/backtest/from-scan — create and run a backtest from a scan run
router.post('/from-scan', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { scanRunId, startDate, endDate } = req.body;

    if (!scanRunId) {
      return res.status(400).json({ error: 'Missing scanRunId' });
    }

    // Fetch scan results
    const scanRun = await scanRunService.getScanRun(scanRunId);
    if (!scanRun || scanRun.results.length === 0) {
      return res.status(400).json({ error: 'No scan results found for this scan run' });
    }

    // Extract unique symbols from all scan results
    const symbols = [...new Set(scanRun.results.flatMap((r) => r.stocks))];
    if (symbols.length === 0) {
      return res.status(400).json({ error: 'No symbols found in scan results' });
    }

    // Create a backtest config for record-keeping
    const config = await backtestService.create(userId, {
      name: `Backtest from Scan ${scanRunId.slice(0, 8)}`,
      description: `Auto-generated backtest from scan run ${scanRunId}`,
      watchlistIds: [],
      startDate: startDate ? new Date(startDate) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      endDate: endDate ? new Date(endDate) : new Date(),
      strategyConfig: {
        type: 'smart-money-scan',
        scanRunId,
        maxHoldingDays: 10,
        positionSizeFraction: undefined,
      },
    });

    // Run the backtest engine directly with the scanned symbols
    // (BacktestService.runBacktest resolves symbols from watchlists, but we
    //  already have the symbols from the scan results)
    const engine = new BacktestEngine();
    const engineResult = await engine.run({
      startDate: config.startDate,
      endDate: config.endDate,
      initialCapital: 10_000,
      stopLoss: config.stopLoss ? Number(config.stopLoss) : undefined,
      takeProfit: config.takeProfit ? Number(config.takeProfit) : undefined,
      maxHoldingDays: (config.strategyConfig as any)?.maxHoldingDays ?? 10,
      positionSizeFraction: (config.strategyConfig as any)?.positionSizeFraction ?? undefined,
      symbols,
    });

    // Compute monthly returns from equity curve
    const monthlyReturns = computeMonthlyReturns(engineResult.equityCurve);

    // Build summary
    const summary = {
      sharpeRatio: engineResult.metrics.sharpeRatio,
      maxDrawdown: engineResult.metrics.maxDrawdown,
      winRate: engineResult.metrics.winRate,
      profitFactor: engineResult.metrics.profitFactor,
      totalReturn: engineResult.metrics.totalReturn,
      totalTrades: engineResult.metrics.totalTrades,
      equityCurve: engineResult.equityCurve,
      tradeLedger: engineResult.tradeLedger,
      monthlyReturns,
    };

    // Store the result in the database
    const prisma = (backtestService as any).prisma;
    await prisma.backtestResult.create({
      data: {
        configId: config.id,
        startedAt: new Date(),
        completedAt: new Date(),
        status: 'completed',
        sharpeRatio: summary.sharpeRatio,
        maxDrawdown: summary.maxDrawdown,
        winRate: summary.winRate,
        profitFactor: summary.profitFactor,
        totalReturn: summary.totalReturn,
        totalTrades: summary.totalTrades,
        equityCurve: summary.equityCurve as unknown as Prisma.InputJsonValue,
        tradeLedger: summary.tradeLedger as unknown as Prisma.InputJsonValue,
        monthlyReturns: summary.monthlyReturns as unknown as Prisma.InputJsonValue,
      },
    });

    return res.status(201).json({
      configId: config.id,
      scanRunId,
      symbols,
      result: summary,
    });
  } catch (error) {
    console.error('Error running backtest from scan:', error);
    if (error instanceof Error && error.message === 'ScanRun not found') {
      return res.status(404).json({ error: 'Scan run not found' });
    }
    return res.status(500).json({ error: 'Failed to run backtest from scan' });
  }
});

/**
 * Compute monthly returns from an equity curve.
 */
function computeMonthlyReturns(equityCurve: Array<{ timestamp: Date; equity: number }>): Array<{ month: string; return: number }> {
  if (equityCurve.length < 2) return [];

  const monthlyMap = new Map<string, number[]>();
  for (const pt of equityCurve) {
    const key = `${pt.timestamp.getFullYear()}-${String(pt.timestamp.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyMap.has(key)) monthlyMap.set(key, []);
    monthlyMap.get(key)!.push(pt.equity);
  }

  const months = Array.from(monthlyMap.entries()).sort(([a], [b]) => a.localeCompare(b));
  const result: Array<{ month: string; return: number }> = [];

  for (let i = 1; i < months.length; i++) {
    const [, prevEquities] = months[i - 1];
    const [, currEquities] = months[i];
    const prevEnd = prevEquities[prevEquities.length - 1];
    const currEnd = currEquities[currEquities.length - 1];
    if (prevEnd !== 0) {
      result.push({
        month: months[i][0],
        return: (currEnd - prevEnd) / prevEnd,
      });
    }
  }

  return result;
}

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

    // Check if this is a scan-based config (no watchlists, symbols from scan results)
    const strategyConfig = config.strategyConfig as any;
    if (strategyConfig?.type === 'smart-money-scan' && strategyConfig?.scanRunId) {
      // Use BacktestEngine directly with symbols from the scan results
      const scanRun = await scanRunService.getScanRun(strategyConfig.scanRunId);
      if (!scanRun || scanRun.results.length === 0) {
        return res.status(400).json({ error: 'No scan results found for the associated scan run' });
      }

      const symbols = [...new Set(scanRun.results.flatMap((r) => r.stocks))];
      if (symbols.length === 0) {
        return res.status(400).json({ error: 'No symbols found in scan results' });
      }

      const engine = new BacktestEngine();
      const engineResult = await engine.run({
        startDate: config.startDate,
        endDate: config.endDate,
        initialCapital: 10_000,
        stopLoss: config.stopLoss ? Number(config.stopLoss) : undefined,
        takeProfit: config.takeProfit ? Number(config.takeProfit) : undefined,
        maxHoldingDays: strategyConfig?.maxHoldingDays ?? 10,
        positionSizeFraction: strategyConfig?.positionSizeFraction ?? undefined,
        symbols,
      });

      const monthlyReturns = computeMonthlyReturns(engineResult.equityCurve);
      const summary = {
        sharpeRatio: engineResult.metrics.sharpeRatio,
        maxDrawdown: engineResult.metrics.maxDrawdown,
        winRate: engineResult.metrics.winRate,
        profitFactor: engineResult.metrics.profitFactor,
        totalReturn: engineResult.metrics.totalReturn,
        totalTrades: engineResult.metrics.totalTrades,
        equityCurve: engineResult.equityCurve,
        tradeLedger: engineResult.tradeLedger,
        monthlyReturns,
      };

      const prisma = (backtestService as any).prisma;
      await prisma.backtestResult.create({
        data: {
          configId: id,
          startedAt: new Date(),
          completedAt: new Date(),
          status: 'completed',
          sharpeRatio: summary.sharpeRatio,
          maxDrawdown: summary.maxDrawdown,
          winRate: summary.winRate,
          profitFactor: summary.profitFactor,
          totalReturn: summary.totalReturn,
          totalTrades: summary.totalTrades,
          equityCurve: summary.equityCurve as unknown as Prisma.InputJsonValue,
          tradeLedger: summary.tradeLedger as unknown as Prisma.InputJsonValue,
          monthlyReturns: summary.monthlyReturns as unknown as Prisma.InputJsonValue,
        },
      });

      return res.json(summary);
    }

    // Standard path: use BacktestService which resolves symbols from watchlists
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