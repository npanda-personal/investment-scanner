import type { Request, Response } from 'express';
import defaultPrisma from '../../db/prisma';

/**
 * Crypto Events — persisted-read of crypto_events (CryptoEvent model).
 * The table is populated by an ingestion pipeline that requires a
 * CoinMarketCal API key. When the key is absent the endpoint returns
 * an empty array with api_key_required=true so the frontend can render
 * an informative empty state rather than a generic "no data" message.
 *
 * GET /api/v1/market-data/crypto/events
 *   ?symbol=BTC       — filter by base ticker (case-insensitive)
 *   ?category=UNLOCK  — filter by event category (exact, uppercased)
 *   ?upcoming=true    — only events with eventDate >= now (default true)
 *   ?limit=50         — max rows (default 50, capped at 200)
 */
export class MarketDataFoundationCryptoEventsController {
  board = async (req: Request, res: Response) => {
    try {
      const symbol =
        typeof req.query.symbol === 'string' && req.query.symbol.trim()
          ? req.query.symbol.trim().toUpperCase()
          : undefined;
      const category =
        typeof req.query.category === 'string' && req.query.category.trim()
          ? req.query.category.trim().toUpperCase()
          : undefined;
      const upcomingOnly = req.query.upcoming !== 'false';
      const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));

      const where: Record<string, unknown> = {};
      if (symbol) where.symbol = symbol;
      if (category) where.category = category;
      if (upcomingOnly) where.eventDate = { gte: new Date() };

      const rows = await defaultPrisma.cryptoEvent.findMany({
        where,
        orderBy: { eventDate: 'asc' },
        take: limit,
        select: {
          id: true,
          symbol: true,
          source: true,
          title: true,
          description: true,
          category: true,
          eventDate: true,
          dateConfidence: true,
          isHot: true,
          percentageChange: true,
          votes: true,
          proofUrl: true,
          sourceUrl: true,
        },
      });

      return res.json({
        count: rows.length,
        upcoming_only: upcomingOnly,
        api_key_required: !process.env.CRYPTO_COINMARKETCAL_API_KEY,
        rows,
      });
    } catch (error) {
      console.error('Crypto events read error:', error);
      return res.status(500).json({ error: 'Crypto events read failed' });
    }
  };
}
