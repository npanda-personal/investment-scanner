import type { Request, Response } from 'express';
import { SignalGenerationEngineService } from './signal-generation-engine.service';
import { attachCohortMetrics } from './signal-cohort-overlay';
import { parseRunRequest, parseSignalQuery, validateInstrumentId } from './signal-generation-engine.validation';
import { isCryptoScope } from '../../shared/data-access/market-repository-router';
import {
  CryptoSignalGenerationRepository,
  cryptoSignalGenerationRepository,
} from './signal-generation-engine.crypto-repository';

type CryptoSignalRow = Awaited<ReturnType<CryptoSignalGenerationRepository['latestForInstrument']>>;

/** Extract a single string value from an Express query param (handles arrays). */
function first(value: unknown): string | undefined {
  if (Array.isArray(value)) return value[0] != null ? String(value[0]) : undefined;
  return value != null ? String(value) : undefined;
}

interface CryptoPriceEntry {
  currentPrice: number | null;
  previousClose: number | null;
  priceTimestamp: string | null;
}

/** Map a crypto_signal_results row to the SignalResultDto shape the API/UI consume. */
function mapCryptoSignalRow(row: NonNullable<CryptoSignalRow>, price?: CryptoPriceEntry) {
  const currentPrice = price?.currentPrice ?? null;
  const previousClose = price?.previousClose ?? null;
  const dailyChange = currentPrice != null && previousClose != null ? currentPrice - previousClose : null;
  const dailyChangePercent = dailyChange != null && previousClose ? (dailyChange / previousClose) * 100 : null;
  return {
    instrument_id: row.instrumentId,
    symbol: row.symbol,
    company_name: row.companyName ?? null,
    sector: null,
    country: null,
    currentPrice,
    previousClose,
    dailyChange,
    dailyChangePercent,
    currency: 'USD',
    priceTimestamp: price?.priceTimestamp ?? null,
    score: row.score,
    direction: row.direction,
    confidence: row.confidence,
    triggered_signals: row.triggeredSignals ?? [],
    negative_signals: row.negativeSignals ?? [],
    explanation: row.explanation,
    generated_at: row.generatedAt.toISOString(),
    generated_date: row.generatedDate ? row.generatedDate.toISOString() : null,
    model_version: row.modelVersion,
    reliabilityTier: row.reliabilityTier ?? null,
    assetType: 'CRYPTO',
  };
}

export class SignalGenerationEngineController {
  constructor(
    private readonly service = new SignalGenerationEngineService(),
    private readonly cryptoRepo: CryptoSignalGenerationRepository = cryptoSignalGenerationRepository,
  ) {}

  /**
   * Attach historical cohort hit-rate to an equity list response (persisted-read overlay).
   * Lives in the controller because the service is at the hard 500-line cap (shrink-only);
   * the actual logic is the module-owned `attachCohortMetrics`. Graceful: returns the
   * response unchanged on empty/missing data. Crypto responses are not annotated (no equity
   * outcome cohort applies to the isolated crypto plane).
   */
  private async withCohortMetrics<T extends { signals?: any[]; items?: any[] }>(response: T, region?: string): Promise<T> {
    const items = response?.items ?? response?.signals ?? [];
    if (!Array.isArray(items) || items.length === 0) return response;
    const enriched = await attachCohortMetrics(items, { region });
    return { ...response, signals: enriched, items: enriched };
  }

  /** Build the crypto top/screener response (persisted-read from the crypto_* plane). */
  private async cryptoTopResponse(query: ReturnType<typeof parseSignalQuery>) {
    const result = await this.cryptoRepo.topSignals({
      direction: query.direction,
      minScore: query.minScore,
      limit: query.limit,
      offset: query.offset,
    });
    const priceBySymbol = await this.cryptoRepo.pricesForSymbols(result.items.map((r) => r.symbol));
    const signals = result.items.map((r) => mapCryptoSignalRow(r, priceBySymbol.get(r.symbol)));
    return {
      signals,
      items: signals,
      total: result.total,
      totalCount: result.total,
      limit: query.limit,
      offset: query.offset || 0,
      hasMore: (query.offset || 0) + signals.length < result.total,
      filtersApplied: { direction: query.direction ?? null, minScore: query.minScore ?? null },
      scope: { region: 'GLOBAL', assetType: 'CRYPTO' },
      directionCounts: result.directionCounts,
    };
  }

  top = async (req: Request, res: Response) => {
    try {
      const query = parseSignalQuery(req.query);
      // Route crypto scope to the isolated crypto_* signal plane (persisted-read).
      if (isCryptoScope({ region: query.region, assetType: query.assetType })) {
        return res.json(await this.cryptoTopResponse(query));
      }
      return res.json(await this.withCohortMetrics(await this.service.topSignals(query), query.region));
    } catch (error) {
      console.error('Signal top endpoint error:', error);
      return res.status(500).json({ error: 'Failed to load top signals' });
    }
  };

  /**
   * GET /signals/exit-candidates
   * Returns persisted signals whose lifecycleState is EXIT — instruments where
   * a previously-active signal has now weakened.  Useful for reviewing long
   * positions that may need attention.
   *
   * Supports all standard SignalQuery filters (region, sector, etc.).
   * lifecycleState is locked to EXIT; passing it as a query param has no effect.
   */
  exitCandidates = async (req: Request, res: Response) => {
    try {
      const query = parseSignalQuery(req.query);
      // Crypto signals don't carry a lifecycle state → not applicable on the crypto plane.
      if (isCryptoScope({ region: query.region, assetType: query.assetType })) {
        return res.json({ scope: { region: 'GLOBAL', assetType: 'CRYPTO' }, signals: [], items: [], notApplicable: true });
      }
      return res.json(await this.withCohortMetrics(await this.service.exitCandidates(query), query.region));
    } catch (error) {
      console.error('Signal exit-candidates endpoint error:', error);
      return res.status(500).json({ error: 'Failed to load exit candidates' });
    }
  };

  /**
   * GET /signals/lifecycle
   * Generic lifecycle-state–filtered signal list.  Pass ?lifecycleState=EXIT|ENTRY|ACTIVE|EXPIRED.
   */
  lifecycle = async (req: Request, res: Response) => {
    try {
      const query = parseSignalQuery(req.query);
      // Crypto signals don't carry a lifecycle state → not applicable on the crypto plane.
      if (isCryptoScope({ region: query.region, assetType: query.assetType })) {
        return res.json({ scope: { region: 'GLOBAL', assetType: 'CRYPTO' }, signals: [], items: [], notApplicable: true });
      }
      return res.json(await this.withCohortMetrics(await this.service.lifecycleSignals(query), query.region));
    } catch (error) {
      console.error('Signal lifecycle endpoint error:', error);
      return res.status(500).json({ error: 'Failed to load lifecycle signals' });
    }
  };

  latestForInstrument = async (req: Request, res: Response) => {
    const instrumentId = Array.isArray(req.params.instrumentId) ? req.params.instrumentId[0] : req.params.instrumentId;
    const validationError = validateInstrumentId(instrumentId);
    if (validationError) return res.status(400).json({ error: validationError });

    try {
      // Persisted-read only: never trigger live generation on a GET.
      // Route crypto scope to the isolated crypto_* signal plane.
      if (isCryptoScope({ region: first(req.query?.region), assetType: first(req.query?.assetType) })) {
        const row = await this.cryptoRepo.latestForInstrument(instrumentId);
        if (!row) return res.status(404).json({ error: 'No persisted crypto signal found for this instrument. Run crypto signal generation to populate.' });
        const priceBySymbol = await this.cryptoRepo.pricesForSymbols([row.symbol]);
        return res.json(mapCryptoSignalRow(row, priceBySymbol.get(row.symbol)));
      }
      // Persisted-read only (never calls run()). Use the ENRICHED single-instrument read so the
      // research-tab widget receives the calibration overlay (calibratedScore/calibrationStatus)
      // and live price/dailyChange — the bulk latestPersistedForInstruments() path skips
      // enrichSignals(), which is why the widget showed "calibration pending" + null price for
      // every stock even when a calibration row existed. Returns null when nothing trusted is persisted.
      const result = await this.service.latestForInstrument(instrumentId);
      if (!result) return res.status(404).json({ error: 'No persisted signal found for this instrument. Run signal generation via POST /signals/run to populate.' });
      // Cohort overlay is attached on the LIST endpoints (table/drawer) only; the single-instrument
      // read stays a verbatim persisted-read. SignalWidget/SignalCard cohort display is a follow-up.
      return res.json(result);
    } catch (error) {
      console.error('Signal instrument endpoint error:', error);
      return res.status(500).json({ error: 'Failed to load signal' });
    }
  };

  run = async (req: Request, res: Response) => {
    try {
      const request = parseRunRequest(req.body);
      // Crypto generation is scheduler/script-driven (lean path), not this equity endpoint.
      if (isCryptoScope({ region: request.region, assetType: request.assetType })) {
        return res.status(409).json({
          error: 'Crypto signal generation runs via the scheduler/crypto lane, not POST /signals/run.',
          code: 'CRYPTO_RUN_NOT_SUPPORTED_HERE',
        });
      }
      return res.json(await this.service.run(request));
    } catch (error) {
      console.error('Signal run endpoint error:', error);
      return res.status(500).json({ error: 'Failed to run signal generation' });
    }
  };

  latestRun = async (req: Request, res: Response) => {
    try {
      const query = parseSignalQuery(req.query);
      if (isCryptoScope({ region: query.region, assetType: query.assetType })) {
        // Crypto runs are scheduler/script-driven; return an honest not-applicable audit.
        return res.json({ scope: { region: 'GLOBAL', assetType: 'CRYPTO' }, latestRun: null, notApplicable: true });
      }
      return res.json(await this.service.latestRunAudit(query));
    } catch (error) {
      console.error('Signal latest run endpoint error:', error);
      return res.status(500).json({ error: 'Failed to load latest signal run audit' });
    }
  };

  screener = async (req: Request, res: Response) => {
    try {
      const query = parseSignalQuery(req.query);
      if (isCryptoScope({ region: query.region, assetType: query.assetType })) {
        return res.json(await this.cryptoTopResponse(query));
      }
      return res.json(await this.withCohortMetrics(await this.service.screener(query), query.region));
    } catch (error) {
      console.error('Signal screener endpoint error:', error);
      return res.status(500).json({ error: 'Failed to load signal screener' });
    }
  };

  health = async (req: Request, res: Response) => {
    try {
      // Crypto scope → health of the isolated crypto_* signal plane.
      if (isCryptoScope({ region: first(req.query?.region), assetType: first(req.query?.assetType) })) {
        const h = await this.cryptoRepo.health();
        return res.json({
          status: 'ok',
          module: 'signal-generation-engine',
          scope: { region: 'GLOBAL', assetType: 'CRYPTO' },
          signalCount: h.count,
          latest_generated_at: h.latestGeneratedAt?.toISOString() ?? null,
          data_status: h.dataStatus,
        });
      }
      return res.json(await this.service.health());
    } catch (error) {
      console.error('Signal health endpoint error:', error);
      return res.status(500).json({ error: 'Failed to load signal health' });
    }
  };
}
