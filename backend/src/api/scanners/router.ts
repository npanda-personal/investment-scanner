import express from 'express';
import { ScannerService } from '../../scanners/service';

const router = express.Router();
const scannerService = new ScannerService();

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

// List all scanner rules for the current user
router.get('/', async (req, res) => {
  try {
    const userId = getUserId(req);
    const rules = await scannerService.list(userId);
    return res.json(rules);
  } catch (error) {
    console.error('Error listing scanner rules:', error);
    return res.status(500).json({ error: 'Failed to list scanner rules' });
  }
});

// Create a new scanner rule
router.post('/', async (req, res) => {
  try {
    const userId = getUserId(req);
    const {
      name,
      description,
      condition,
      sourceWatchlistId,
      sourceSymbols,
      targetWatchlistId,
      isActive = true,
      schedule,
      nextScanAt,
    } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid name' });
    }
    if (!condition) {
      return res.status(400).json({ error: 'Missing condition' });
    }

    const rule = await scannerService.create(userId, {
      name,
      description,
      condition,
      sourceWatchlistId,
      sourceSymbols,
      targetWatchlistId, // Optional now
      isActive,
      schedule,
      nextScanAt: nextScanAt ? new Date(nextScanAt) : undefined,
    });
    return res.status(201).json(rule);
  } catch (error) {
    console.error('Error creating scanner rule:', error);
    return res.status(500).json({ error: 'Failed to create scanner rule' });
  }
});

// Get a specific scanner rule
router.get('/:id', async (req, res) => {
  try {
    const _userId = getUserId(req);
    const { id } = req.params;
    const rule = await scannerService.get(_userId, id);
    if (!rule) {
      return res.status(404).json({ error: 'Scanner rule not found' });
    }
    return res.json(rule);
  } catch (error) {
    console.error('Error fetching scanner rule:', error);
    return res.status(500).json({ error: 'Failed to fetch scanner rule' });
  }
});

// Update a scanner rule
router.put('/:id', async (req, res) => {
  try {
    const _userId = getUserId(req);
    const { id } = req.params;
    const {
      name,
      description,
      condition,
      sourceWatchlistId,
      sourceSymbols,
      targetWatchlistId,
      isActive,
      schedule,
      nextScanAt,
    } = req.body;

    const rule = await scannerService.update(_userId, id, {
      name,
      description,
      condition,
      sourceWatchlistId,
      sourceSymbols,
      targetWatchlistId,
      isActive,
      schedule,
      nextScanAt: nextScanAt ? new Date(nextScanAt) : undefined,
    });
    return res.json(rule);
  } catch (error) {
    console.error('Error updating scanner rule:', error);
    // Prisma might throw if rule not found or not owned
    if (error instanceof Error && error.message.includes('RecordNotFound')) {
      return res.status(404).json({ error: 'Scanner rule not found' });
    }
    return res.status(500).json({ error: 'Failed to update scanner rule' });
  }
});

// Delete a scanner rule
router.delete('/:id', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    await scannerService.delete(userId, id);
    return res.status(204).send();
  } catch (error) {
    console.error('Error deleting scanner rule:', error);
    if (error instanceof Error && error.message.includes('RecordNotFound')) {
      return res.status(404).json({ error: 'Scanner rule not found' });
    }
    return res.status(500).json({ error: 'Failed to delete scanner rule' });
  }
});

// Trigger a manual scan for a specific rule
router.post('/:id/scan', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    // Ensure the rule belongs to the user
    const rule = await scannerService.get(userId, id);
    if (!rule) {
      return res.status(404).json({ error: 'Scanner rule not found' });
    }
    // Evaluate the rule (placeholder)
    const result = await scannerService.evaluateRule(id);
    if (result.triggered && result.symbol) {
      // Already logged and added via evaluateRule? Actually evaluateRule currently does not add.
      // We'll call scanActiveRules which handles adding.
      // For simplicity, we'll just return the result.
    }
    return res.json(result);
  } catch (error) {
    console.error('Error scanning rule:', error);
    // Provide more informative error messages
    if (error instanceof Error) {
      if (error.message.includes('No historical price data available')) {
        return res.status(400).json({
          error: 'Cannot evaluate indicator: No historical price data available. Please ensure stock data is loaded.',
          details: error.message
        });
      }
      if (error.message.includes('Scanner rule')) {
        return res.status(404).json({ error: error.message });
      }
    }
    return res.status(500).json({ error: 'Failed to scan rule', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Get scan logs for a rule
router.get('/:id/logs', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    // Verify ownership
    const rule = await scannerService.get(userId, id);
    if (!rule) {
      return res.status(404).json({ error: 'Scanner rule not found' });
    }
    const { limit = '50' } = req.query;
    const limitNum = parseInt(limit as string, 10);
    const logs = await scannerService.getLogs(id, limitNum);
    return res.json(logs);
  } catch (error) {
    console.error('Error fetching scan logs:', error);
    return res.status(500).json({ error: 'Failed to fetch scan logs' });
  }
});

// Trigger scanning for all active rules (admin / manual)
router.post('/scan/all', async (req, res) => {
  try {
    const _userId = getUserId(req);
    void _userId; // suppress unused variable warning
    // Optionally restrict to admin users
    const results = await scannerService.scanActiveRules();
    return res.json({ message: 'Scan completed', results });
  } catch (error) {
    console.error('Error scanning all rules:', error);
    return res.status(500).json({ error: 'Failed to scan all rules' });
  }
});

export default router;