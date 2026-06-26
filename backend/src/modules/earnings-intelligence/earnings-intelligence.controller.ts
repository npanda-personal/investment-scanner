import type { Request, Response } from 'express';
import { EarningsIntelligenceService } from './earnings-intelligence.service';
import { parseEarningsIntelligenceQuery } from './earnings-intelligence.validation';
import {
  resolveEarningsDateSource,
  supportedEarningsDateSourceRegions,
} from './earnings-intelligence.date-source';
import {
  DEFAULT_EARNINGS_REGION,
  getEarningsRegionConfig,
  normalizeRegionCode,
} from './earnings-intelligence.region-config';
import { cacheService } from '../../cache/cache.service';
import { earningsKey } from '../../cache/cache-keys';

export class EarningsIntelligenceController {
  constructor(private readonly service = new EarningsIntelligenceService()) {}

  latest = async (req: Request, res: Response) => {
    try {
      // no-store is a BROWSER directive (always re-fetch from us); the server-side Redis
      // page-cache below is what offloads Postgres under concurrent loads. Low-cardinality
      // key (region × assetType × limit × category); CACHE_WARM prefix-invalidates on refresh.
      res.setHeader('Cache-Control', 'no-store');
      const query = parseEarningsIntelligenceQuery(req.query as Record<string, unknown>);
      const result = await cacheService.cacheReadThrough(
        earningsKey({ region: query.region, assetType: query.assetType, limit: query.limit, category: query.category }),
        () => this.service.latest(query),
        undefined,
        (value) => value != null && value.freshness !== 'NO_SNAPSHOT', // don't pin the pre-pipeline empty envelope
      );
      return res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load earnings intelligence snapshot';
      return res.status(400).json({ error: message });
    }
  };

  /**
   * POST /api/v1/market-intelligence/earnings/ingest-board-meetings
   *
   * Populates Fundamental.officialResultDate from the region's earnings-date
   * provider, then call /refresh to re-materialise the snapshot with the new
   * OFFICIAL_CALENDAR dates.  The provider is resolved from the region-pluggable
   * registry (defaults to IN / NSE board-meetings), so the same endpoint serves
   * any market that has a registered source.
   *
   * Body (all optional):
   *   region   – defaults to "IN"
   *   fromDate – provider-native window start
   *   toDate   – provider-native window end
   *   dryRun   – boolean; parse + match but do NOT write
   *   symbol   – single symbol to scope the ingest
   *
   * NOTE: NSE is bot-protected; this must run from a host with direct NSE access.
   * If blocked it returns status='BLOCKED' with an error field rather than a 500.
   */
  ingestBoardMeetings = async (req: Request, res: Response) => {
    try {
      res.setHeader('Cache-Control', 'no-store');
      const body = req.body as Record<string, unknown>;
      const region = normalizeRegionCode(body.region ? String(body.region) : DEFAULT_EARNINGS_REGION);
      const source = resolveEarningsDateSource(region);
      if (!source) {
        return res.status(400).json({
          error: `No earnings-date source registered for region "${region}". Supported: ${supportedEarningsDateSourceRegions().join(', ')}.`,
        });
      }
      const summary = await source.ingest({
        fromDate: body.fromDate ? String(body.fromDate) : undefined,
        toDate: body.toDate ? String(body.toDate) : undefined,
        dryRun: body.dryRun === true || body.dryRun === 'true' || body.dryRun === '1',
        symbols: body.symbol ? [String(body.symbol)] : undefined,
      });
      const httpStatus = summary.status === 'FAILED' ? 500 : 200;
      // Preserve the provider's native result shape for existing consumers.
      return res.status(httpStatus).json(summary.raw ?? summary);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to ingest earnings result dates';
      return res.status(500).json({ error: message });
    }
  };

  /**
   * POST /api/v1/market-intelligence/earnings/refresh
   *
   * Materialises (or re-materialises) the Earnings Intelligence snapshot for all
   * active instruments in scope that have persisted fundamentals.
   *
   * Body (all optional):
   *   region        – defaults to "IN"
   *   assetType     – defaults to the region's configured default ("STOCK")
   *   snapshotDate  – ISO date string; defaults to today
   *   batchSize     – 1–100; defaults to 25
   *   offset        – for resumable batching; defaults to 0
   *   instrumentIds – restrict the refresh to specific instrument ids
   */
  refresh = async (req: Request, res: Response) => {
    try {
      res.setHeader('Cache-Control', 'no-store');
      const body = (req.body ?? {}) as Record<string, unknown>;
      const snapshotDateRaw = body.snapshotDate;
      const snapshotDate = snapshotDateRaw ? new Date(String(snapshotDateRaw)) : new Date();
      if (Number.isNaN(snapshotDate.getTime())) {
        return res.status(400).json({ error: 'snapshotDate must be a valid ISO date string' });
      }
      const region = normalizeRegionCode(body.region ? String(body.region) : DEFAULT_EARNINGS_REGION);
      const assetType = body.assetType ? String(body.assetType) : getEarningsRegionConfig(region).defaultAssetType;
      const result = await this.service.refreshSnapshots({
        region,
        assetType,
        snapshotDate,
        batchSize: body.batchSize ? Number(body.batchSize) : 25,
        offset: body.offset ? Number(body.offset) : 0,
        ...(Array.isArray(body.instrumentIds) ? { instrumentIds: body.instrumentIds.map((id) => String(id)) } : {}),
      });
      return res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to refresh earnings intelligence snapshot';
      return res.status(500).json({ error: message });
    }
  };
}
