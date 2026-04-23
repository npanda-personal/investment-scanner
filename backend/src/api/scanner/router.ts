import express from 'express';
import { ScanRunService } from '../../scanners/scan-run.service';

const router = express.Router();
const scanRunService = new ScanRunService();

// Helper to extract user ID (temporary: from header x-user-id)
const getUserId = (req: express.Request): string => {
  const userId = req.headers['x-user-id'] as string;
  if (!userId) {
    return 'test-user-id';
  }
  return userId;
};

// POST /api/scanner/run — run a scan and persist results
router.post('/run', async (req, res) => {
  try {
    const userId = getUserId(req);
    const result = await scanRunService.runScan(userId);
    return res.status(201).json(result);
  } catch (error) {
    console.error('Error running scan:', error);
    return res.status(500).json({ error: 'Failed to run scan' });
  }
});

// GET /api/scanner/:id — fetch stored scan results
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await scanRunService.getScanRun(id);
    return res.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'ScanRun not found') {
      return res.status(404).json({ error: 'Scan run not found' });
    }
    console.error('Error fetching scan run:', error);
    return res.status(500).json({ error: 'Failed to fetch scan run' });
  }
});

// GET /api/scanner/latest — fetch the latest scan run for the current user
router.get('/latest', async (req, res) => {
  try {
    const userId = getUserId(req);
    const result = await scanRunService.getLatestScanRun(userId);
    if (!result) {
      return res.status(404).json({ error: 'No scan runs found for this user' });
    }
    return res.json(result);
  } catch (error) {
    console.error('Error fetching latest scan run:', error);
    return res.status(500).json({ error: 'Failed to fetch latest scan run' });
  }
});

export default router;
