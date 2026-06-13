// Auto-extracted repair sibling (Phase 5c). Bodies are byte-identical to the pre-extraction inline
// implementation in market-data-foundation.service.ts, except that stays-on-service / cross-engine
// collaborators are reached through the host (this.X -> this.host.X) and pure util/mapper helpers
// are imported directly. The service constructs this once and keeps byte-identical public delegators
// for the controller-facing repair surface.

import type { MarketDataRepairHost } from './market-data-foundation.repair-host';
import type {
  MarketDataPriceIdentityRepairCandidate,
  MarketDataPriceIdentityRepairSummary,
  MarketDataRepairRequest,
} from '../market-data-foundation.types';
import {
  trimmedUpper as trimmedUpperUtil,
} from '../util/market-data-foundation.util.misc';
import {
  baseSymbolFromProviderSymbol as baseSymbolFromProviderSymbolMapper,
} from '../analytics/market-data-foundation.instrument-mapper';
import { normalizeProviderStatus } from '../ingestion/market-data-foundation.universe';

export class RepairPriceIdentityService {
  constructor(private readonly host: MarketDataRepairHost) {}

  public async repairPriceIdentity(options: MarketDataRepairRequest & { dryRun?: boolean } = {}): Promise<MarketDataPriceIdentityRepairSummary> {
    const scope = {
      region: options.region?.trim().toUpperCase() || 'IN',
      assetType: options.assetType?.trim().toUpperCase() || 'STOCK',
    };
    const batchSize = Math.max(1, Math.min(options.batchSize ?? options.limit ?? 25, 100));
    const offset = Math.max(0, options.offset ?? 0);
    const dryRun = options.dryRun !== false;
    const stocks = (await this.host.repository.listStocksForUniverseHealth(scope))
      .filter((stock) => stock.isActive !== false && stock.isDelisted !== true);
    const symbols = [...new Set(stocks.flatMap((stock) => [stock.symbol, stock.providerSymbol]).filter((value): value is string => typeof value === 'string' && value.trim().length > 0))];
    const priceStatsBySymbol = await this.host.repository.priceReadinessStatsForSymbols(symbols);
    const providerOwnerCounts = new Map<string, number>();
    const baseOwnerCounts = new Map<string, Set<string>>();
    for (const stock of stocks) {
      const providerSymbol = trimmedUpperUtil(stock.providerSymbol);
      if (providerSymbol) providerOwnerCounts.set(providerSymbol, (providerOwnerCounts.get(providerSymbol) || 0) + 1);
      for (const value of [stock.symbol, stock.providerSymbol, stock.sourceSymbol, stock.displaySymbol]) {
        const base = baseSymbolFromProviderSymbolMapper(String(value || ''));
        if (!base) continue;
        const owners = baseOwnerCounts.get(base) || new Set<string>();
        owners.add(String(stock.id || stock.symbol || base));
        baseOwnerCounts.set(base, owners);
      }
    }

    const candidates = stocks
      .map((stock) => this.priceIdentityRepairCandidate(stock, priceStatsBySymbol, providerOwnerCounts, baseOwnerCounts))
      .filter((candidate): candidate is MarketDataPriceIdentityRepairCandidate => Boolean(candidate));
    const batch = candidates.slice(offset, offset + batchSize);
    const samples: MarketDataPriceIdentityRepairCandidate[] = [];
    const warnings: string[] = [];
    let repaired = 0;
    let skipped = 0;
    let priceRowsMoved = 0;
    let latestPricesMoved = 0;
    const skipReasonCounts: Record<string, number> = {};
    const recordSkip = (candidate: MarketDataPriceIdentityRepairCandidate, code = candidate.skippedReasonCode || 'UNKNOWN_SKIP') => {
      skipped += 1;
      skipReasonCounts[code] = (skipReasonCounts[code] || 0) + 1;
    };

    for (const candidate of batch) {
      if (candidate.skippedReason) {
        recordSkip(candidate);
        samples.push({ ...candidate, action: 'SKIPPED' });
        continue;
      }
      if (dryRun) {
        samples.push({ ...candidate, action: 'DRY_RUN' });
        continue;
      }
      try {
        if (await this.host.repository.latestPriceExists(candidate.symbol)) {
          const skippedCandidate = { ...candidate, action: 'SKIPPED' as const, skippedReasonCode: 'TARGET_LATEST_PRICE_COLLISION', skippedReason: 'Target latest price already exists.' };
          recordSkip(skippedCandidate);
          samples.push(skippedCandidate);
          continue;
        }
        const result = await this.host.repository.reassignPriceRowsToCanonicalSymbol({
          stockId: candidate.stockId,
          fromSymbol: candidate.providerSymbol as string,
          toSymbol: candidate.symbol,
        });
        repaired += 1;
        priceRowsMoved += result.priceRowsMoved;
        latestPricesMoved += result.latestPricesMoved;
        samples.push({
          ...candidate,
          action: 'REPAIRED',
          priceRowsMoved: result.priceRowsMoved,
          latestPricesMoved: result.latestPricesMoved,
        });
      } catch (error: any) {
        const message = error?.message || 'Price identity reassignment failed.';
        const code = typeof message === 'string' && message.includes(':') ? message.split(':')[0] : 'REASSIGN_FAILED';
        const skippedCandidate = { ...candidate, action: 'SKIPPED' as const, skippedReasonCode: code, skippedReason: message };
        recordSkip(skippedCandidate, code);
        samples.push(skippedCandidate);
      }
    }

    if (candidates.length > offset + batchSize) warnings.push(`${candidates.length - offset - batchSize} price identity candidates remain after this bounded batch.`);
    if (dryRun) warnings.push('Dry run only; no price rows were reassigned.');

    return {
      scope,
      generatedAt: new Date().toISOString(),
      dryRun,
      totalCandidates: candidates.length,
      repaired,
      skipped,
      priceRowsMoved,
      latestPricesMoved,
      skipReasonCounts,
      samples,
      warnings,
    };
  }


  private priceIdentityRepairCandidate(
    stock: any,
    priceStatsBySymbol: Map<string, any>,
    providerOwnerCounts: Map<string, number>,
    baseOwnerCounts: Map<string, Set<string>>
  ): MarketDataPriceIdentityRepairCandidate | null {
    const symbol = typeof stock.symbol === 'string' ? stock.symbol.trim() : '';
    const providerSymbol = typeof stock.providerSymbol === 'string' ? stock.providerSymbol.trim() : '';
    if (!symbol || !providerSymbol || symbol.toUpperCase() === providerSymbol.toUpperCase()) return null;

    const canonicalPriceHistoryBars = this.host.priceBarsForSymbol(priceStatsBySymbol, symbol);
    const providerPriceHistoryBars = this.host.priceBarsForSymbol(priceStatsBySymbol, providerSymbol);
    if (canonicalPriceHistoryBars > 0 || providerPriceHistoryBars <= 0) return null;

    const candidate: MarketDataPriceIdentityRepairCandidate = {
      stockId: String(stock.id || ''),
      symbol,
      providerSymbol,
      sourceSymbol: stock.sourceSymbol ?? null,
      exchange: stock.exchange ?? null,
      providerSupportStatus: stock.providerSupportStatus ?? null,
      canonicalPriceHistoryBars,
      providerPriceHistoryBars,
      action: 'DRY_RUN',
      skippedReasonCode: null,
      skippedReason: null,
    };
    const skip = (skippedReasonCode: string, skippedReason: string): MarketDataPriceIdentityRepairCandidate => ({
      ...candidate,
      skippedReasonCode,
      skippedReason,
    });

    const expectedSuffix = this.host.expectedProviderSuffixForStock(stock);
    if (!expectedSuffix || !providerSymbol.toUpperCase().endsWith(expectedSuffix)) {
      return skip('SUFFIX_EXCHANGE_MISMATCH', expectedSuffix ? `Provider symbol must end with ${expectedSuffix}.` : 'Exchange suffix cannot be determined.');
    }

    const providerBase = baseSymbolFromProviderSymbolMapper(providerSymbol);
    const sourceBase = baseSymbolFromProviderSymbolMapper(stock.sourceSymbol || symbol);
    const canonicalBase = baseSymbolFromProviderSymbolMapper(symbol);
    if (providerBase !== sourceBase || canonicalBase !== providerBase) {
      return skip('BASE_SYMBOL_MISMATCH', 'Provider, source, and canonical symbol bases are not unambiguous.');
    }

    const ownerCount = providerOwnerCounts.get(providerSymbol.toUpperCase()) || 0;
    if (ownerCount !== 1) {
      return skip('PROVIDER_SYMBOL_NOT_UNIQUE', `Provider symbol is owned by ${ownerCount} active scoped stocks.`);
    }

    const baseOwnerCount = baseOwnerCounts.get(providerBase)?.size || 0;
    if (baseOwnerCount !== 1) {
      return skip('AMBIGUOUS_SCOPED_IDENTITY', `Base symbol is owned by ${baseOwnerCount} active scoped stocks.`);
    }

    if (normalizeProviderStatus(stock.providerSupportStatus) !== 'SUPPORTED') {
      return skip('UNSUPPORTED_SCOPE', 'Stock is not provider-supported.');
    }

    return candidate;
  }


}
