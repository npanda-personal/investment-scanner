import { MarketDataFoundationService } from '../market-data-foundation';
import { SignalGenerationEngineService } from './signal-generation-engine.service';
import type { SignalPricePoint } from './signal-generation-engine.types';
import { resolveSignalScoringConfig } from './signal-scoring.config';
import {
  CryptoSignalGenerationRepository,
  cryptoSignalGenerationRepository,
} from './signal-generation-engine.crypto-repository';

/**
 * Crypto signal generation (lean path).
 *
 * Reuses the equity engine's PURE compute (evaluateTechnical / evaluateMomentum /
 * compositeScore / directionForScore / explain) — the same battle-tested scoring
 * math — but sources prices from the isolated crypto_* plane and persists to
 * crypto_signal_results.  Fundamentals are excluded (crypto has none) by passing
 * a neutral fundamentals contribution, exactly as an equity with no fundamentals
 * data behaves.  No delivery%, no regime gate, no peer relative-strength.
 */

const CRYPTO_SIGNAL_MODEL_VERSION = 'crypto-signal-v1';
const CRYPTO_SIGNAL_RULESET_VERSION = 'crypto-ruleset-v1';
const CRYPTO_PRICE_WINDOW = 520;
const MIN_BARS_FOR_SIGNAL = 15; // enough for RSI(14); fewer → skip (insufficient history)
const NEUTRAL_FUNDAMENTAL_SCORE = 0.5; // crypto has no fundamentals → neutral contribution

// Conviction gate for the crypto confidence tier (parity with the v4 SG-6 fix on the equity
// lane).  Crypto runs the v3 composite, whose confidence was data-sufficiency-only — so a
// coin-flip score (~50) with enough bars/signals could still read HIGH.  |score - 50| measures
// how far the composite leans from neutral; HIGH requires a genuinely directional lean
// (>=60 / <=40, the direction cut-points), MEDIUM a half-step.  A NEUTRAL-band score caps at LOW.
const CRYPTO_CONVICTION_HIGH = 10;
const CRYPTO_CONVICTION_MEDIUM = 5;

/**
 * Confidence tier for a crypto (v3) signal — both data sufficiency AND conviction must clear
 * the bar.  Pure/exported so the conviction gate is unit-testable.  `score` is the 0-100
 * composite; `|score - 50|` is the conviction proxy (v3 has no v4 displacement component).
 */
export function cryptoConfidenceFor(barCount: number, totalSignals: number, score: number): 'HIGH' | 'MEDIUM' | 'LOW' {
  const conviction = Math.abs(score - 50);
  if (barCount >= 200 && totalSignals >= 3 && conviction >= CRYPTO_CONVICTION_HIGH) return 'HIGH';
  if (barCount >= 60 && totalSignals >= 1 && conviction >= CRYPTO_CONVICTION_MEDIUM) return 'MEDIUM';
  return 'LOW';
}

// Crypto scoring config: capability-driven (no fundamentals/delivery), with the
// unused fundamental weight redistributed across technical/momentum so crypto
// scores can use the full conviction range (see signal-scoring.config.ts).
const CRYPTO_SCORING_CONFIG = resolveSignalScoringConfig({ assetType: 'CRYPTO' });

export interface CryptoSignalGenerationSummary {
  runId: string;
  modelVersion: string;
  processed: number;
  generated: number;
  updated: number;
  skipped: number;
  failed: number;
  warnings: string[];
}

export class CryptoSignalGenerationService {
  constructor(
    private readonly marketDataService: MarketDataFoundationService = new MarketDataFoundationService(),
    private readonly repo: CryptoSignalGenerationRepository = cryptoSignalGenerationRepository,
    /** Equity engine instance — used ONLY for its pure compute methods. */
    private readonly compute: SignalGenerationEngineService = new SignalGenerationEngineService(),
  ) {}

  private normalizeUtcDay(date: Date): Date {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  }

  /** Build SignalPricePoint[] newest-first (the engine treats prices[0] as latest). */
  private toPricePointsDesc(ticks: Array<{
    timestamp: Date;
    open: unknown; high: unknown; low: unknown; close: unknown; adjustedClose: unknown; volume: unknown;
  }>): SignalPricePoint[] {
    const num = (v: unknown): number => (v === null || v === undefined ? NaN : Number(v));
    const points = ticks.map((t) => {
      const close = num(t.close);
      const adj = t.adjustedClose === null || t.adjustedClose === undefined ? close : num(t.adjustedClose);
      const volume = t.volume === null || t.volume === undefined ? null : Number(t.volume);
      return {
        date: t.timestamp.toISOString(),
        open: Number.isFinite(num(t.open)) ? num(t.open) : null,
        high: Number.isFinite(num(t.high)) ? num(t.high) : null,
        low: Number.isFinite(num(t.low)) ? num(t.low) : null,
        close,
        adjusted_close: Number.isFinite(adj) ? adj : close,
        volume,
      } as SignalPricePoint;
    });
    // crypto repo returns ascending (oldest first) → reverse to newest-first.
    return points.reverse();
  }

  /** Generate (or refresh) signals for all active crypto assets into crypto_signal_results. */
  async generateAll(options: { limit?: number; asOf?: Date } = {}): Promise<CryptoSignalGenerationSummary> {
    const startedAt = Date.now();
    const generatedAt = options.asOf ?? new Date();
    const generatedDate = this.normalizeUtcDay(generatedAt);
    const assets = await this.marketDataService.listCryptoAssets({ activeOnly: true, limit: options.limit });

    const run = await this.repo.createRun({
      modelVersion: CRYPTO_SIGNAL_MODEL_VERSION,
      rulesetVersion: CRYPTO_SIGNAL_RULESET_VERSION,
      generatedDate,
      batchSize: assets.length,
      totalCount: assets.length,
    });

    const summary: CryptoSignalGenerationSummary = {
      runId: run.id,
      modelVersion: CRYPTO_SIGNAL_MODEL_VERSION,
      processed: 0,
      generated: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      warnings: [],
    };

    for (const asset of assets) {
      summary.processed += 1;
      try {
        const ticks = await this.marketDataService.listCryptoPriceHistory(asset.symbol, CRYPTO_PRICE_WINDOW);
        const prices = this.toPricePointsDesc(ticks);
        if (prices.length < MIN_BARS_FOR_SIGNAL) {
          summary.skipped += 1;
          continue;
        }

        const technical = this.compute.evaluateTechnical(prices, CRYPTO_SCORING_CONFIG);
        const momentum = this.compute.evaluateMomentum(prices, null, CRYPTO_SCORING_CONFIG);
        const score = this.compute.compositeScore(
          technical.score,
          momentum.score,
          NEUTRAL_FUNDAMENTAL_SCORE,
          technical.signals.length,
          technical.negativeSignals.length,
          momentum.signals.length,
          momentum.negativeSignals.length,
          0,
          0,
          CRYPTO_SCORING_CONFIG,
        );
        const direction = this.compute.directionForScore(score);
        const triggeredSignals = [...technical.signals, ...momentum.signals];
        const negativeSignals = [...technical.negativeSignals, ...momentum.negativeSignals];
        const explanation = this.compute.explain(direction, triggeredSignals, negativeSignals);
        const confidence = cryptoConfidenceFor(prices.length, triggeredSignals.length + negativeSignals.length, score);
        const latestPriceDate = prices[0]?.date ? new Date(prices[0].date) : null;

        const { created } = await this.repo.upsertSignal({
          instrumentId: asset.id,
          symbol: asset.symbol,
          companyName: asset.name,
          generationRunId: run.id,
          score,
          direction,
          confidence,
          triggeredSignals,
          negativeSignals,
          explanation,
          generatedAt,
          generatedDate,
          modelVersion: CRYPTO_SIGNAL_MODEL_VERSION,
          rulesetVersion: CRYPTO_SIGNAL_RULESET_VERSION,
          sourceDataDate: latestPriceDate,
          sourcePriceDate: latestPriceDate,
          dataStatus: prices.length >= 50 ? 'COMPLETE' : 'PARTIAL',
        });
        if (created) summary.generated += 1;
        else summary.updated += 1;
      } catch (error) {
        summary.failed += 1;
        summary.warnings.push(`Signal generation failed for ${asset.symbol}: ${(error as Error).message}`);
      }
    }

    await this.repo.finalizeRun(run.id, {
      processedCount: summary.processed,
      generatedCount: summary.generated,
      updatedCount: summary.updated,
      skippedCount: summary.skipped,
      failedCount: summary.failed,
      durationMs: Date.now() - startedAt,
      warnings: summary.warnings.slice(0, 50),
    });

    return summary;
  }
}

export const cryptoSignalGenerationService = new CryptoSignalGenerationService();
