import express from 'express';
import { YahooFinanceIngestionService } from '../../data/ingestion/yahoo.service';

const router = express.Router();
const ingestionService = new YahooFinanceIngestionService();

router.post('/ingest', async (req, res) => {
  const { symbol } = req.body;
  if (!symbol || typeof symbol !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid symbol' });
  }

  try {
    // Ingest data for the symbol (default last 30 days)
    await ingestionService.ingestSymbol(symbol);
    return res.json({ success: true, message: `Ingestion completed for ${symbol}` });
  } catch (error) {
    console.error('Ingestion error:', error);
    return res.status(500).json({ error: 'Failed to ingest data', details: (error as Error).message });
  }
});

router.get('/prices/:symbol', async (req, res) => {
  const { symbol } = req.params;
  const { limit = '100' } = req.query;
  const limitNum = parseInt(limit as string, 10);
  if (isNaN(limitNum) || limitNum < 1) {
    return res.status(400).json({ error: 'Invalid limit parameter' });
  }

  try {
    const prices = await ingestionService.prisma.priceTick.findMany({
      where: { symbol },
      orderBy: { timestamp: 'desc' },
      take: limitNum,
      select: {
        timestamp: true,
        open: true,
        high: true,
        low: true,
        close: true,
        volume: true,
        region: true,
        exchange: true,
      },
    });

    // Transform Prisma Decimal and BigInt to JSON‑serializable values
    const transformedPrices = prices.map((price) => ({
      ...price,
      open: price.open.toString(),
      high: price.high.toString(),
      low: price.low.toString(),
      close: price.close.toString(),
      volume: price.volume !== null ? price.volume.toString() : null,
    }));

    return res.json({ symbol, prices: transformedPrices });
  } catch (error) {
    console.error('Error fetching prices:', error);
    return res.status(500).json({ error: 'Database query failed' });
  }
});

export default router;