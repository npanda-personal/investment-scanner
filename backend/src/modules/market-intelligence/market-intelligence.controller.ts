import type { Request, Response } from 'express';
import { StockInterestSnapshotService } from './stock-interest-snapshot.service';
import { SectorConstituentsService } from './sector-constituents.service';
import { parseStockInterestScope } from './stock-interest-snapshot.validation';
import { assembleInstrumentContext } from './instrument-context.service';
import { MarketContextIntelligenceService } from '../market-context-intelligence/market-context-intelligence.service';
import type { SectorSnapshotDto } from '../market-context-intelligence/market-context-intelligence.types';
import { getEventFeed } from './event-feed.service';
import { IndexConstituentsService } from './index-constituents.service';
import { cacheService, type CacheService } from '../../cache/cache.service';
import { stockInterestKey, sectorRotationKey } from '../../cache/cache-keys';

export type RotationQuadrant = 'LEADING' | 'IMPROVING' | 'WEAKENING' | 'LAGGING';

export interface SectorRotationRow extends SectorSnapshotDto {
  /** Rotation quadrant derived from sectorScore (RS proxy) + return1M (momentum). */
  rotationQuadrant: RotationQuadrant;
}

export interface SectorRotationEnvelope {
  availability: 'READY' | 'EMPTY' | 'ERROR';
  scope: { region: string; assetType: string };
  snapshotDate: string | null;
  dataThroughDate: string | null;
  generatedAt: string;
  sectors: SectorRotationRow[];
  quadrantCounts: Record<RotationQuadrant, number>;
  message: string;
  warnings: string[];
}

/**
 * Derive the rotation quadrant for a sector from its sectorScore (relative strength
 * proxy) and return1M (short-term momentum).
 *
 * Quadrant logic (Relative Rotation Graph conventions):
 *   LEADING   — strong RS (score >= 60) + positive momentum (1M >= 0)
 *               Money is already here and continuing to flow in.
 *   IMPROVING — weak RS  (score <  60) + positive momentum (1M >= 0)
 *               Money is rotating INTO this sector from below.
 *   WEAKENING — strong RS (score >= 60) + negative momentum (1M <  0)
 *               Sector was strong but momentum is fading — rotating OUT.
 *   LAGGING   — weak RS  (score <  60) + negative momentum (1M <  0)
 *               Weak and falling; money is leaving.
 *
 * When return1M is null (insufficient history), sectorScore alone governs:
 *   score >= 60 → LEADING, otherwise LAGGING.
 */
function deriveRotationQuadrant(row: SectorSnapshotDto): RotationQuadrant {
  const strongRS = row.sectorScore >= 60;
  const positiveMomentum = row.return1M !== null ? row.return1M >= 0 : null;

  if (positiveMomentum === null) {
    return strongRS ? 'LEADING' : 'LAGGING';
  }
  if (strongRS && positiveMomentum) return 'LEADING';
  if (!strongRS && positiveMomentum) return 'IMPROVING';
  if (strongRS && !positiveMomentum) return 'WEAKENING';
  return 'LAGGING';
}

export class MarketIntelligenceController {
  constructor(
    private readonly stockInterestService = new StockInterestSnapshotService(),
    private readonly sectorConstituentsService = new SectorConstituentsService(),
    private readonly marketContextService = new MarketContextIntelligenceService(),
    private readonly indexConstituentsService = new IndexConstituentsService(),
    private readonly cache: CacheService = cacheService,
  ) {}

  stockInterest = async (req: Request, res: Response) => {
    try {
      res.setHeader('Cache-Control', 'no-store');
      const scope = parseStockInterestScope(req.query as Record<string, unknown>);
      const { data, cacheHit } = await this.cache.cacheReadThrough(
        stockInterestKey(scope),
        () => this.stockInterestService.latestSnapshot(scope),
        undefined,
        (v: any) => v?.availability !== 'EMPTY',
      );
      res.setHeader('X-Cache', cacheHit ? 'HIT' : 'MISS');
      return res.json(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load Stock Interest snapshot';
      return res.status(500).json({
        availability: 'ERROR',
        scope: parseStockInterestScope({}),
        snapshot: null,
        message,
        warnings: [message],
      });
    }
  };

  sectorConstituents = async (req: Request, res: Response) => {
    try {
      res.setHeader('Cache-Control', 'no-store');
      const result = await this.sectorConstituentsService.constituentsForSector({
        sector: typeof req.query.sector === 'string' ? req.query.sector : null,
        region: typeof req.query.region === 'string' ? req.query.region : 'IN',
        assetType: typeof req.query.assetType === 'string' ? req.query.assetType : 'STOCK',
      });
      return res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load sector constituents';
      return res.status(500).json({
        availability: 'ERROR',
        sector: req.query.sector ?? '',
        region: req.query.region ?? 'IN',
        assetType: req.query.assetType ?? 'STOCK',
        constituents: [],
        count: 0,
        message,
        warnings: [message],
      });
    }
  };

  sectorRotation = async (req: Request, res: Response) => {
    try {
      res.setHeader('Cache-Control', 'no-store');
      // Uppercase so the cache key matches the warm/invalidation paths (region keys are canonical).
      const region = (typeof req.query.region === 'string' ? req.query.region.trim() || 'IN' : 'IN').toUpperCase();
      const assetType = (typeof req.query.assetType === 'string' ? req.query.assetType.trim() || 'STOCK' : 'STOCK').toUpperCase();

      const { data: envelope, cacheHit } = await this.cache.cacheReadThrough(
        sectorRotationKey({ region, assetType }),
        () => this.marketContextService.latestSectorIntelligenceSnapshot({ region, assetType }),
        undefined,
        (v: any) => v?.status !== 'missing' && (v?.sectors?.length ?? 0) > 0,
      );
      res.setHeader('X-Cache', cacheHit ? 'HIT' : 'MISS');

      if (envelope.sectors.length === 0) {
        const result: SectorRotationEnvelope = {
          availability: 'EMPTY',
          scope: { region, assetType },
          snapshotDate: null,
          dataThroughDate: null,
          generatedAt: new Date().toISOString(),
          sectors: [],
          quadrantCounts: { LEADING: 0, IMPROVING: 0, WEAKENING: 0, LAGGING: 0 },
          message: 'No persisted sector snapshots available. Run the Sector Intelligence refresh pipeline first.',
          warnings: envelope.warnings,
        };
        return res.json(result);
      }

      const sectors: SectorRotationRow[] = envelope.sectors.map((row) => ({
        ...row,
        rotationQuadrant: deriveRotationQuadrant(row),
      }));

      const quadrantCounts: Record<RotationQuadrant, number> = {
        LEADING: sectors.filter((s) => s.rotationQuadrant === 'LEADING').length,
        IMPROVING: sectors.filter((s) => s.rotationQuadrant === 'IMPROVING').length,
        WEAKENING: sectors.filter((s) => s.rotationQuadrant === 'WEAKENING').length,
        LAGGING: sectors.filter((s) => s.rotationQuadrant === 'LAGGING').length,
      };

      const result: SectorRotationEnvelope = {
        availability: 'READY',
        scope: { region, assetType },
        snapshotDate: envelope.snapshotDate,
        dataThroughDate: envelope.dataThroughDate,
        generatedAt: new Date().toISOString(),
        sectors,
        quadrantCounts,
        message: `Sector rotation map for ${sectors.length} sectors as of ${envelope.dataThroughDate ?? 'unknown date'}.`,
        warnings: envelope.warnings,
      };
      return res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load sector rotation data';
      return res.status(500).json({
        availability: 'ERROR',
        scope: { region: 'IN', assetType: 'STOCK' },
        snapshotDate: null,
        dataThroughDate: null,
        generatedAt: new Date().toISOString(),
        sectors: [],
        quadrantCounts: { LEADING: 0, IMPROVING: 0, WEAKENING: 0, LAGGING: 0 },
        message,
        warnings: [message],
      });
    }
  };

  eventFeed = async (req: Request, res: Response) => {
    try {
      res.setHeader('Cache-Control', 'no-store');
      const rawDays = req.query.days;
      const days = typeof rawDays === 'string' && /^\d+$/.test(rawDays) ? parseInt(rawDays, 10) : 5;
      const region = typeof req.query.region === 'string' ? req.query.region.trim() || 'IN' : 'IN';
      const result = await getEventFeed(days, region);
      return res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load market event feed';
      return res.status(500).json({
        availability: 'ERROR',
        generatedAt: new Date().toISOString(),
        asOf: null,
        days: 5,
        events: [],
        eventCount: 0,
        message,
        warnings: [message],
      });
    }
  };

  instrumentContext = async (req: Request, res: Response) => {
    try {
      res.setHeader('Cache-Control', 'no-store');
      const instrumentId = typeof req.params.instrumentId === 'string' ? req.params.instrumentId.trim() : '';
      if (!instrumentId) {
        return res.status(400).json({ status: 'error', message: 'instrumentId is required', context: null });
      }
      const context = await assembleInstrumentContext(instrumentId);
      if (!context) {
        return res.status(404).json({ status: 'not_found', message: `Instrument ${instrumentId} not found`, context: null });
      }
      return res.json({ status: 'ready', context });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to assemble instrument context';
      return res.status(500).json({ status: 'error', message, context: null });
    }
  };

  indexConstituents = async (req: Request, res: Response) => {
    try {
      res.setHeader('Cache-Control', 'no-store');
      const index = typeof req.query.index === 'string' ? req.query.index : null;
      const result = await this.indexConstituentsService.constituentsForIndex(index);
      return res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load index constituents';
      return res.status(500).json({
        availability: 'ERROR',
        index: req.query.index ?? '',
        indexLabel: '',
        membershipSource: 'CURATED_STATIC',
        membershipAsOf: '',
        constituents: [],
        count: 0,
        breadth: { total: 0, bullishCount: 0, bearishCount: 0, neutralCount: 0, noSignalCount: 0, headline: '0 of 0 members bullish' },
        message,
        warnings: [message],
      });
    }
  };
}
