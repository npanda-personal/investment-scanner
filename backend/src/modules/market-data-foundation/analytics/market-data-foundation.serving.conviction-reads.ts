// High-conviction confluence serving-read.
//
// Owns the persisted-read for the Screener "Conviction" tab: the narrow set of stocks
// where the signal engine AND smart-money accumulation agree strongly across every
// tracked horizon (see analytics/conviction-score.ts for the fixed bar).
//
// Standalone by necessity: the market-data-foundation service/repository facades are
// shrink-only god-files, so this serving owns its repository (built from the shared
// prisma client) rather than being registered on the over-cap service — the same
// new-cohesive-file response to the god-files that fno-ban.service.ts uses. Layering
// still holds: controller → this serving → ConvictionRepository.

import type { PrismaClient } from '@prisma/client';
import defaultPrisma from '../../../db/prisma';
import { isCryptoScope } from '../../../shared/data-access/market-repository-router';
import { ConvictionRepository } from '../persistence/market-data-foundation.repository.conviction';
import { passesConvictionBar, CONVICTION_RESULT_LIMIT } from './conviction-score';

export interface ConvictionRow {
  instrumentId: string;
  symbol: string;
  companyName: string;
  signalDirection: string | null;
  signalScore: number | null;
  sm1m: number | null;
  sm3m: number | null;
  sm6m: number | null;
}

export interface ConvictionResult {
  generatedAt: string;
  count: number;
  results: ConvictionRow[];
  warnings: string[];
}

const EMPTY_WARNING =
  'No candidates currently meet the conviction bar (signal score ≥ 70 and smart-money score > 70 across the 1M, 3M and 6M horizons). These thresholds are fixed by design.';

export class ConvictionReadsService {
  private readonly repo: ConvictionRepository;

  constructor(prisma: PrismaClient = defaultPrisma) {
    this.repo = new ConvictionRepository(prisma);
  }

  async conviction(options: {
    region?: string;
    assetType?: string;
    onlyFnoEligible?: boolean;
  } = {}): Promise<ConvictionResult> {
    // Smart-money + F&O are equity concepts; the conviction screen is equity-only.
    if (isCryptoScope(options)) {
      return {
        generatedAt: new Date().toISOString(),
        count: 0,
        results: [],
        warnings: ['The high-conviction screen is equity-only and does not apply to crypto.'],
      };
    }

    // Region scope matches the sibling screener: an explicit region scopes the universe;
    // a GLOBAL/unset scope (region undefined) applies no region filter. Smart-money snapshots
    // currently exist only for IN, so GLOBAL naturally yields IN candidates without a silent
    // hard-coded India default that would diverge from the Screener tab.
    const region = options.region?.trim().toUpperCase() || undefined;
    const rows = await this.repo.conviction({ region, onlyFnoEligible: options.onlyFnoEligible });

    // Defensive: the SQL already gates on the bar, but re-apply the canonical predicate
    // (and the top-N cap) so any future query drift cannot leak a below-bar candidate.
    const results = rows.filter(passesConvictionBar).slice(0, CONVICTION_RESULT_LIMIT);

    return {
      generatedAt: new Date().toISOString(),
      count: results.length,
      results,
      warnings: results.length === 0 ? [EMPTY_WARNING] : [],
    };
  }
}
