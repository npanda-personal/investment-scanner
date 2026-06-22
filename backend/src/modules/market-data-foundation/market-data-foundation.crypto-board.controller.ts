import type { Request, Response } from 'express';
import { MarketDataFoundationService } from './market-data-foundation.service';

/**
 * Crypto board/detail HTTP controller (persisted-reads only).
 *
 * Split out of the market-data-foundation god-controller (shrink-only) per the
 * one-responsibility-per-file rule. Serves the two trader-facing crypto reads:
 *   - GET /market-data/crypto/board               → latest daily-metric board
 *   - GET /market-data/crypto/assets/:id/detail   → joined single-asset detail
 *
 * Both are PURE persisted-reads: every value is computed by the CRYPTO_DAILY_METRICS
 * pipeline stage and stored; this controller only parses query params and shapes the
 * response. No computation, no live fetch. It reads through MarketDataFoundationService
 * (.cryptoReads) so module boundaries hold.
 */
export class MarketDataFoundationCryptoBoardController {
  constructor(private readonly service = new MarketDataFoundationService()) {}

  private parseBoolean(value: unknown): boolean {
    const v = Array.isArray(value) ? value[0] : value;
    return v === '1' || v === 'true' || v === true;
  }

  private parseNumber(value: unknown): number | undefined {
    const v = Array.isArray(value) ? value[0] : value;
    if (v === undefined || v === null || v === '') return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }

  private parseString(value: unknown): string | undefined {
    const v = Array.isArray(value) ? value[0] : value;
    return typeof v === 'string' && v.trim() ? v.trim() : undefined;
  }

  /** GET /market-data/crypto/board — latest persisted daily-metric board. */
  board = async (req: Request, res: Response) => {
    try {
      const goldenCrossOnly = this.parseBoolean(req.query.goldenCrossOnly);
      const deathCrossOnly = this.parseBoolean(req.query.deathCrossOnly);
      if (goldenCrossOnly && deathCrossOnly) {
        return res.status(400).json({ error: 'goldenCrossOnly and deathCrossOnly are mutually exclusive' });
      }
      const sortOrderRaw = this.parseString(req.query.sortOrder)?.toLowerCase();
      const result = await this.service.cryptoReads.getCryptoDailyMetricBoard({
        sortBy: this.parseString(req.query.sortBy),
        sortOrder: sortOrderRaw === 'asc' || sortOrderRaw === 'desc' ? sortOrderRaw : undefined,
        direction: this.parseString(req.query.direction),
        minScore: this.parseNumber(req.query.minScore),
        minConfidence: this.parseString(req.query.minConfidence),
        volumeSpikeOnly: this.parseBoolean(req.query.volumeSpikeOnly),
        near52wHigh: this.parseBoolean(req.query.near52wHigh),
        near52wLow: this.parseBoolean(req.query.near52wLow),
        goldenCrossOnly,
        deathCrossOnly,
        limit: this.parseNumber(req.query.limit),
      });
      return res.json({
        snapshot_date: result.snapshotDate ? result.snapshotDate.toISOString().slice(0, 10) : null,
        count: result.rows.length,
        rows: result.rows,
      });
    } catch (error) {
      console.error('Crypto board read error:', error);
      return res.status(500).json({ error: 'Crypto board read failed' });
    }
  };

  /** GET /market-data/crypto/assets/:id/detail — joined single-asset detail (404 when absent). */
  assetDetail = async (req: Request, res: Response) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id) return res.status(400).json({ error: 'Asset id is required' });
      const detail = await this.service.cryptoReads.getCryptoAssetDetail(id);
      if (!detail) return res.status(404).json({ error: 'Crypto asset not found' });
      return res.json(detail);
    } catch (error) {
      console.error('Crypto asset detail read error:', error);
      return res.status(500).json({ error: 'Crypto asset detail read failed' });
    }
  };
}
