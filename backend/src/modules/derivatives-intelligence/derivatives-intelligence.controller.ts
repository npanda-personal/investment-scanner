import type { Request, Response } from 'express';
import {
  ingestFoBhavcopy,
  getLatestFoBhavcopyMeta,
} from './derivatives-intelligence.fo-bhavcopy.service';
import {
  computeOiBuildup,
  getLatestOiBuildup,
} from './derivatives-intelligence.oi-buildup.service';
import {
  computeOptionMetrics,
  getLatestOptionMetrics,
} from './derivatives-intelligence.option-metrics.service';
import {
  ingestParticipantOi,
  getLatestParticipantOi,
} from './derivatives-intelligence.participant-oi.service';
import { resolveMarketProfile } from '../../shared/utils/market-profile';
import { notApplicablePayload } from '../../shared/utils/not-applicable';

export class DerivativesIntelligenceController {
  /**
   * GET /derivatives/oi-buildup?eligibleOnly=true&limit=50
   * Persisted-read only — never ingests or computes.
   */
  oiBuildup = async (req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store');
    const region = this.region(req);
    const profile = resolveMarketProfile({ region, assetType: typeof req.query.assetType === 'string' ? req.query.assetType : undefined });
    if (!profile.capabilities.hasInstitutionalFlow) {
      return res.json(notApplicablePayload(
        `OI buildup is not applicable to ${region ?? 'GLOBAL'} equities (NSE F&O sourced, India only).`,
        { rows: [] },
      ));
    }
    const limit = typeof req.query.limit === 'string'
      ? Math.max(1, Math.min(500, Number(req.query.limit) || 50))
      : 50;
    const eligibleOnly = req.query.eligibleOnly === 'true' || req.query.eligibleOnly === '1';
    return this.respond(res, () => getLatestOiBuildup({ limit, eligibleOnly }));
  };

  /**
   * GET /derivatives/option-metrics?underlying=NIFTY&limit=200
   * Persisted-read: PCR, max-pain, support/resistance per underlying+expiry.
   */
  optionMetrics = async (req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store');
    const region = this.region(req);
    const profile = resolveMarketProfile({ region, assetType: typeof req.query.assetType === 'string' ? req.query.assetType : undefined });
    if (!profile.capabilities.hasInstitutionalFlow) {
      return res.json(notApplicablePayload(
        `Option metrics are not applicable to ${region ?? 'GLOBAL'} equities (NSE F&O sourced, India only).`,
        { rows: [], marketPcr: null },
      ));
    }
    const underlying = typeof req.query.underlying === 'string' && req.query.underlying.trim()
      ? req.query.underlying.trim()
      : undefined;
    const limit = typeof req.query.limit === 'string'
      ? Math.max(1, Math.min(2000, Number(req.query.limit) || 200))
      : 200;
    return this.respond(res, () => getLatestOptionMetrics({ underlying, limit }));
  };

  /**
   * GET /derivatives/pcr
   * Persisted-read: market-wide put-call ratio (index options) + per-underlying rows.
   */
  pcr = async (req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store');
    const region = this.region(req);
    const profile = resolveMarketProfile({ region, assetType: typeof req.query.assetType === 'string' ? req.query.assetType : undefined });
    if (!profile.capabilities.hasInstitutionalFlow) {
      return res.json(notApplicablePayload(
        `Put-call ratio is not applicable to ${region ?? 'GLOBAL'} equities (NSE F&O sourced, India only).`,
        { rows: [], marketPcr: null },
      ));
    }
    return this.respond(res, () => getLatestOptionMetrics({ limit: 500 }));
  };

  /**
   * GET /derivatives/participant-oi
   * Persisted-read: participant-wise OI (FII/DII/Pro/Client net positioning).
   */
  participantOi = async (req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store');
    const region = this.region(req);
    const profile = resolveMarketProfile({ region, assetType: typeof req.query.assetType === 'string' ? req.query.assetType : undefined });
    if (!profile.capabilities.hasInstitutionalFlow) {
      return res.json(notApplicablePayload(
        `Participant OI is not applicable to ${region ?? 'GLOBAL'} equities (NSE F&O sourced, India only).`,
        { rows: [] },
      ));
    }
    return this.respond(res, () => getLatestParticipantOi());
  };

  /**
   * POST /derivatives/participant-oi/ingest?date=YYYY-MM-DD
   * Fetches the NSE participant-wise OI CSV and persists it.
   */
  participantOiIngest = async (req: Request, res: Response) => {
    const dateOverride = typeof req.query.date === 'string' && req.query.date.trim()
      ? req.query.date.trim()
      : undefined;
    return this.respond(res, () => ingestParticipantOi(dateOverride));
  };

  /**
   * GET /derivatives/fo-bhavcopy/meta
   * Latest persisted trading date + row count (staleness badge).
   */
  foBhavcopyMeta = async (_req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store');
    return this.respond(res, () => getLatestFoBhavcopyMeta());
  };

  /**
   * POST /derivatives/fo-bhavcopy/ingest?date=YYYY-MM-DD
   * Fetches the NSE F&O bhavcopy, persists per-contract rows, then computes the
   * OI-buildup derived rows. Side-effectful (not a GET).
   */
  foBhavcopyIngest = async (req: Request, res: Response) => {
    const dateOverride = typeof req.query.date === 'string' && req.query.date.trim()
      ? req.query.date.trim()
      : undefined;
    return this.respond(res, async () => {
      const ingest = await ingestFoBhavcopy(dateOverride);
      let buildup = null;
      let optionMetrics = null;
      if (ingest.status === 'success' && ingest.tradingDate) {
        buildup = await computeOiBuildup(ingest.tradingDate);
        optionMetrics = await computeOptionMetrics(ingest.tradingDate);
      }
      return { ingest, buildup, optionMetrics };
    });
  };

  /**
   * Extract the region query param, defaulting to 'IN' when absent.
   * The whole app defaults to IN scope, and these NSE-F&O endpoints historically
   * served IN data for region-less calls — so only an explicit non-IN region gates.
   */
  private region(req: Request): string {
    return typeof req.query.region === 'string' ? req.query.region.trim() || 'IN' : 'IN';
  }

  private async respond(res: Response, fn: () => Promise<unknown> | unknown) {
    try {
      return res.json(await fn());
    } catch (error) {
      console.error('Derivatives intelligence endpoint error:', error);
      return res.status(500).json({ error: 'Failed to load derivatives intelligence' });
    }
  }
}
