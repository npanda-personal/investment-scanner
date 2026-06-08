import { IndexConstituentsRepository } from './index-constituents.repository';
import {
  INDEX_DISPLAY_LABELS,
  INDEX_SYMBOL_LISTS,
  MEMBERSHIP_AS_OF,
} from './index-constituents.symbols';
import type {
  IndexBreadthSummary,
  IndexConstituentsEnvelope,
  SupportedIndex,
} from './index-constituents.types';

export const SUPPORTED_INDICES: SupportedIndex[] = ['NIFTY_50', 'NIFTY_BANK', 'SP500', 'NDX100'];

/** US indices keyed by SupportedIndex value. */
const US_INDICES: ReadonlySet<SupportedIndex> = new Set(['SP500', 'NDX100'] as const);

/**
 * Return the default SupportedIndex for a given region string.
 * US → SP500, everything else → NIFTY_50.
 */
export function defaultIndexForRegion(region: string | null | undefined): SupportedIndex {
  const normalized = String(region || '').trim().toUpperCase();
  if (normalized === 'US') return 'SP500';
  return 'NIFTY_50';
}

/**
 * Return the region that owns a given index.
 * SP500/NDX100 → 'US'; NIFTY_* → 'IN'.
 */
export function regionForIndex(index: SupportedIndex | string): string {
  if (US_INDICES.has(index as SupportedIndex)) return 'US';
  return 'IN';
}

export class IndexConstituentsService {
  constructor(private readonly repository = new IndexConstituentsRepository()) {}

  async constituentsForIndex(rawIndex: string | null | undefined, options?: { region?: string | null }): Promise<IndexConstituentsEnvelope> {
    // If no index supplied but a region is provided, default to that region's headline index.
    let index = typeof rawIndex === 'string' ? rawIndex.trim().toUpperCase() : '';

    if (!index && options?.region) {
      index = defaultIndexForRegion(options.region);
    }

    if (!index) {
      return this.invalidParams('', `index query parameter is required. Supported values: ${SUPPORTED_INDICES.join(', ')}.`);
    }

    const symbolList = INDEX_SYMBOL_LISTS[index];
    if (!symbolList) {
      return this.invalidParams(
        index,
        `Unknown index "${index}". Supported values: ${SUPPORTED_INDICES.join(', ')}.`,
      );
    }

    const displayLabel = INDEX_DISPLAY_LABELS[index] ?? index;

    let constituents;
    try {
      constituents = await this.repository.loadConstituents(symbolList, regionForIndex(index));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load index constituents from database.';
      return {
        availability: 'ERROR',
        index,
        indexLabel: displayLabel,
        membershipSource: 'CURATED_STATIC',
        membershipAsOf: MEMBERSHIP_AS_OF,
        constituents: [],
        count: 0,
        breadth: this.emptyBreadth(symbolList.length),
        message: msg,
        warnings: [msg],
      };
    }

    const foundInCatalog = constituents.filter((c) => c.instrumentId !== null).length;
    const missingFromCatalog = symbolList.length - foundInCatalog;
    const missingPrice = constituents.filter((c) => c.latestPrice === null).length;

    const breadth = this.computeBreadth(constituents, symbolList.length);

    const warnings: string[] = [];
    if (missingFromCatalog > 0) {
      warnings.push(
        `${missingFromCatalog} of ${symbolList.length} member symbols not found in catalog (may be listed under a different symbol or not yet ingested).`,
      );
    }
    if (missingPrice > 0) {
      warnings.push(`${missingPrice} of ${symbolList.length} members have no latest price in catalog.`);
    }

    const availability = constituents.length === 0
      ? 'EMPTY'
      : missingFromCatalog > 0 || missingPrice > foundInCatalog / 2
        ? 'PARTIAL'
        : 'READY';

    return {
      availability,
      index,
      indexLabel: displayLabel,
      membershipSource: 'CURATED_STATIC',
      membershipAsOf: MEMBERSHIP_AS_OF,
      constituents,
      count: constituents.length,
      breadth,
      message: `Loaded ${constituents.length} members of ${displayLabel}. ${breadth.headline}.`,
      warnings,
    };
  }

  // ─── helpers ────────────────────────────────────────────────────────────────

  private computeBreadth(
    constituents: Array<{ signalDirection: string | null; instrumentId: string | null }>,
    total: number,
  ): IndexBreadthSummary {
    let bullishCount = 0;
    let bearishCount = 0;
    let neutralCount = 0;
    let noSignalCount = 0;

    for (const c of constituents) {
      if (c.instrumentId === null) {
        noSignalCount++;
        continue;
      }
      const dir = c.signalDirection?.toUpperCase();
      if (dir === 'BULLISH') bullishCount++;
      else if (dir === 'BEARISH') bearishCount++;
      else if (dir === 'NEUTRAL') neutralCount++;
      else noSignalCount++;
    }

    return {
      total,
      bullishCount,
      bearishCount,
      neutralCount,
      noSignalCount,
      headline: `${bullishCount} of ${total} members bullish`,
    };
  }

  private emptyBreadth(total: number): IndexBreadthSummary {
    return {
      total,
      bullishCount: 0,
      bearishCount: 0,
      neutralCount: 0,
      noSignalCount: total,
      headline: `0 of ${total} members bullish`,
    };
  }

  private invalidParams(index: string, message: string): IndexConstituentsEnvelope {
    return {
      availability: 'INVALID_PARAMS',
      index,
      indexLabel: INDEX_DISPLAY_LABELS[index] ?? index,
      membershipSource: 'CURATED_STATIC',
      membershipAsOf: MEMBERSHIP_AS_OF,
      constituents: [],
      count: 0,
      breadth: this.emptyBreadth(0),
      message,
      warnings: [message],
    };
  }
}
