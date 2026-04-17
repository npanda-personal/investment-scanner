import express from 'express';
import { WatchlistService } from './service';

const router = express.Router();
const watchlistService = new WatchlistService();

// Helper to extract user ID (temporary: from header x-user-id)
const getUserId = (req: express.Request): string => {
  const userId = req.headers['x-user-id'] as string;
  // TODO: replace with JWT authentication
  if (!userId) {
    // For development, default to a test user
    // Ensure a user exists in the database with this ID
    return 'test-user-id';
  }
  return userId;
};

// List all watchlists for the current user
router.get('/', async (req, res) => {
  try {
    const userId = getUserId(req);
    const watchlists = await watchlistService.list(userId);
    return res.json(watchlists);
  } catch (error) {
    console.error('Error listing watchlists:', error);
    return res.status(500).json({ error: 'Failed to list watchlists' });
  }
});

// Create a new watchlist
router.post('/', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { name, description, symbols } = req.body;
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid name' });
    }
    const watchlist = await watchlistService.create(userId, {
      name,
      description,
      symbols,
    });
    return res.status(201).json(watchlist);
  } catch (error) {
    console.error('Error creating watchlist:', error);
    return res.status(500).json({ error: 'Failed to create watchlist' });
  }
});

// Get a specific watchlist
router.get('/:id', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    const watchlist = await watchlistService.get(userId, id);
    if (!watchlist) {
      return res.status(404).json({ error: 'Watchlist not found' });
    }
    return res.json(watchlist);
  } catch (error) {
    console.error('Error fetching watchlist:', error);
    return res.status(500).json({ error: 'Failed to fetch watchlist' });
  }
});

// Update a watchlist (full or partial)
router.put('/:id', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    const { name, description, symbols } = req.body;
    const watchlist = await watchlistService.update(userId, id, {
      name,
      description,
      symbols,
    });
    return res.json(watchlist);
  } catch (error) {
    console.error('Error updating watchlist:', error);
    // Prisma might throw if watchlist not found or not owned
    if (error instanceof Error && error.message.includes('RecordNotFound')) {
      return res.status(404).json({ error: 'Watchlist not found' });
    }
    return res.status(500).json({ error: 'Failed to update watchlist' });
  }
});

// Delete a watchlist
router.delete('/:id', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    await watchlistService.delete(userId, id);
    return res.status(204).send();
  } catch (error) {
    console.error('Error deleting watchlist:', error);
    if (error instanceof Error && error.message.includes('RecordNotFound')) {
      return res.status(404).json({ error: 'Watchlist not found' });
    }
    return res.status(500).json({ error: 'Failed to delete watchlist' });
  }
});

// Add a symbol to a watchlist
router.post('/:id/symbols', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    const { symbol } = req.body;
    if (!symbol || typeof symbol !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid symbol' });
    }
    const watchlist = await watchlistService.addSymbol(userId, id, symbol);
    return res.json(watchlist);
  } catch (error) {
    console.error('Error adding symbol:', error);
    return res.status(500).json({ error: 'Failed to add symbol' });
  }
});

// Remove a symbol from a watchlist
router.delete('/:id/symbols/:symbol', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id, symbol } = req.params;
    const watchlist = await watchlistService.removeSymbol(userId, id, symbol);
    return res.json(watchlist);
  } catch (error) {
    console.error('Error removing symbol:', error);
    return res.status(500).json({ error: 'Failed to remove symbol' });
  }
});

export default router;