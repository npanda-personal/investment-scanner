import type { Request, Response } from 'express';
import { SmartMoneyIntelligenceService } from './smart-money-intelligence.service';
import { getParam, parseLimit, parseOffset, parseOptionalText, parseRange } from './smart-money-intelligence.validation';
import { getLatestFnoBanList, ingestFnoBanList } from './fno-ban.service';
import { SMART_MONEY_DEFAULT_ASSET_TYPE, SMART_MONEY_DEFAULT_REGION } from './smart-money-intelligence.constants';
import { resolveMarketProfile } from '../../shared/utils/market-profile';
import { notApplicablePayload } from '../../shared/utils/not-applicable';
import { cacheService } from '../../cache/cache.service';
import { smartMoneySectorsKey } from '../../cache/cache-keys';

export class SmartMoneyIntelligenceController {
  constructor(private readonly service = new SmartMoneyIntelligenceService()) {}

  stock = async (req: Request, res: Response) => this.respondMaybeFound(res, () =>
    this.service.stock(getParam(req.params.instrumentId), parseRange(req.query.range))
  );

  // Read-through cached: low-cardinality (range × region × assetType), persisted-read snapshot.
  // The daily pipeline's CACHE_WARM stage prefix-invalidates these keys, so a stale sector view
  // can't outlive a refresh (36h TTL is only the backstop). Resolve defaults here to mirror the
  // service's withDefaultScope so the cached key matches what gets invalidated.
  sectors = async (req: Request, res: Response) => this.respond(res, () => {
    const range = parseRange(req.query.range);
    const region = parseOptionalText(req.query.region) || SMART_MONEY_DEFAULT_REGION;
    const assetType = parseOptionalText(req.query.assetType) || SMART_MONEY_DEFAULT_ASSET_TYPE;
    return cacheService.cacheReadThrough(
      smartMoneySectorsKey({ range, region, assetType }),
      () => this.service.sectors(range, { region, assetType }),
      undefined,
      (value) => Array.isArray(value) && value.length > 0, // never pin an empty (no-data) result
    );
  });

  run = async (req: Request, res: Response) => this.respond(res, () =>
    this.service.run(parseLimit(req.body.batchSize, 100), {
      region: parseOptionalText(req.body.region),
      assetType: parseOptionalText(req.body.assetType),
      offset: parseOffset(req.body.offset ?? req.body.cursor),
    })
  );

  top = async (req: Request, res: Response) => this.respond(res, () =>
    this.service.top({
      limit: parseLimit(req.query.limit),
      offset: parseOffset(req.query.offset),
      sector: parseOptionalText(req.query.sector),
      region: parseOptionalText(req.query.region),
      assetType: parseOptionalText(req.query.assetType),
      range: parseRange(req.query.range),
    })
  );

  distribution = async (req: Request, res: Response) => this.respond(res, () =>
    this.service.distribution({
      limit: parseLimit(req.query.limit),
      offset: parseOffset(req.query.offset),
      sector: parseOptionalText(req.query.sector),
      region: parseOptionalText(req.query.region),
      assetType: parseOptionalText(req.query.assetType),
      range: parseRange(req.query.range),
    })
  );

  health = async (_req: Request, res: Response) => this.respond(res, () => this.service.health());

  fnoBanList = async (req: Request, res: Response) => {
    const region = parseOptionalText(req.query.region) || 'IN';
    const profile = resolveMarketProfile({ region, assetType: parseOptionalText(req.query.assetType) });
    if (!profile.capabilities.hasInstitutionalFlow) {
      return this.respond(res, () => notApplicablePayload(
        `F&O ban list is not applicable to ${region} equities (NSE-sourced, India only).`,
        { symbols: [], count: 0 },
      ));
    }
    return this.respond(res, () => getLatestFnoBanList());
  };

  fnoBanIngest = async (_req: Request, res: Response) => this.respond(res, () => ingestFnoBanList());

  private async respond(res: Response, fn: () => Promise<unknown> | unknown) {
    try {
      return res.json(await fn());
    } catch (error: any) {
      const message = error.message || 'Smart money request failed';
      const status = message.toLowerCase().includes('required') ? 400 : 500;
      return res.status(status).json({ error: message });
    }
  }

  private async respondMaybeFound(res: Response, fn: () => Promise<unknown | null> | unknown | null) {
    try {
      const result = await fn();
      if (!result) return res.status(404).json({ error: 'Not found' });
      return res.json(result);
    } catch (error: any) {
      const message = error.message || 'Smart money request failed';
      const status = message.toLowerCase().includes('required') ? 400 : 500;
      return res.status(status).json({ error: message });
    }
  }
}
