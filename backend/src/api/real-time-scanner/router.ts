/**
 * Real-Time Scanner API Router
 * 
 * Provides endpoints for:
 * - Starting scan sessions
 * - Checking scan progress
 * - Retrieving scan results
 * - Managing scan presets and configurations
 * - Dashboard data
 */

import express from 'express';
import { RealTimeScannerService } from '../../scanners/real-time-scanner.service';

const router = express.Router();
const scannerService = new RealTimeScannerService();

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

// Start a new scan session
router.post('/scan/start', async (req, res) => {
  try {
    const userId = getUserId(req);
    const {
      scope,
      signals,
      rankingConfig,
    } = req.body;

    if (!scope) {
      return res.status(400).json({ error: 'Missing scan scope' });
    }

    const result = await scannerService.startScanSession(userId, {
      scope,
      signals,
      rankingConfig,
    });

    return res.status(202).json({
      message: 'Scan session started',
      sessionId: result.sessionId,
      totalSymbols: result.totalSymbols,
      pollUrl: `/api/real-time-scanner/scan/${result.sessionId}/progress`,
      resultsUrl: `/api/real-time-scanner/scan/${result.sessionId}/results`,
    });
  } catch (error) {
    console.error('Error starting scan session:', error);
    return res.status(500).json({ 
      error: 'Failed to start scan session',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get scan progress
router.get('/scan/:sessionId/progress', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { sessionId } = req.params;

    // Verify session belongs to user
    const session = await scannerService.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Scan session not found' });
    }

    if (session.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const progress = await scannerService.getScanProgress(sessionId);
    if (!progress) {
      return res.status(404).json({ error: 'Progress data not available' });
    }

    return res.json(progress);
  } catch (error) {
    console.error('Error fetching scan progress:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch scan progress',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get scan results
router.get('/scan/:sessionId/results', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { sessionId } = req.params;

    // Verify session belongs to user
    const session = await scannerService.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Scan session not found' });
    }

    if (session.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const results = await scannerService.getScanResults(sessionId);
    if (!results) {
      return res.status(404).json({ error: 'Results not available yet' });
    }

    return res.json({
      sessionId,
      status: session.status,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
      metadata: session.metadata,
      results,
    });
  } catch (error) {
    console.error('Error fetching scan results:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch scan results',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get session details
router.get('/scan/:sessionId', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { sessionId } = req.params;

    const session = await scannerService.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Scan session not found' });
    }

    if (session.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    return res.json(session);
  } catch (error) {
    console.error('Error fetching session:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch session',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get user's recent scan sessions
router.get('/sessions', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { limit = '10' } = req.query;
    const limitNum = parseInt(limit as string, 10);

    const sessions = await scannerService.getUserSessions(userId, limitNum);
    return res.json(sessions);
  } catch (error) {
    console.error('Error fetching user sessions:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch user sessions',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get scanner dashboard data
router.get('/dashboard', async (req, res) => {
  try {
    const userId = getUserId(req);

    const dashboardData = await scannerService.getDashboardData(userId);
    return res.json(dashboardData);
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch dashboard data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get signal definitions
router.get('/signals', async (_req, res) => {
  try {
    const signalDefinitions = await scannerService.getSignalDefinitions();
    return res.json(signalDefinitions);
  } catch (error) {
    console.error('Error fetching signal definitions:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch signal definitions',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get scan presets
router.get('/presets', async (_req, res) => {
  try {
    const scanPresets = await scannerService.getScanPresets();
    return res.json(scanPresets);
  } catch (error) {
    console.error('Error fetching scan presets:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch scan presets',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get scanner configuration
router.get('/config', async (_req, res) => {
  try {
    const scannerConfig = await scannerService.getScannerConfig();
    return res.json(scannerConfig);
  } catch (error) {
    console.error('Error fetching scanner config:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch scanner config',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Cancel a scan session
router.post('/scan/:sessionId/cancel', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { sessionId } = req.params;

    const session = await scannerService.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Scan session not found' });
    }

    if (session.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (session.status === 'COMPLETED' || session.status === 'FAILED' || session.status === 'CANCELLED') {
      return res.status(400).json({ error: `Cannot cancel session with status: ${session.status}` });
    }

    // Update session status to CANCELLED
    // Note: In a real implementation, we would need to stop the background process
    // For now, we'll just update the session status
    const success = await (scannerService as any).sessionStorage.updateSession(sessionId, {
      status: 'CANCELLED',
      completedAt: new Date(),
    });

    if (success) {
      return res.json({ message: 'Scan session cancelled', sessionId });
    } else {
      return res.status(500).json({ error: 'Failed to cancel scan session' });
    }
  } catch (error) {
    console.error('Error cancelling scan session:', error);
    return res.status(500).json({ 
      error: 'Failed to cancel scan session',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;