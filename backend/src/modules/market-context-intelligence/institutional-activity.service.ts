/**
 * Institutional Activity Aggregate Service
 *
 * Composes four persisted data sources into a single DTO:
 *   1. FII/DII net flows       — fii-dii.service.ts
 *   2. Bulk & Block deals      — bulk-block-deals.service.ts
 *   3. F&O ban list            — smart-money-intelligence / fno-ban.service.ts
 *   4. Smart-money sectors     — smart-money-intelligence.repository.ts (persisted read)
 *
 * Persisted-read only: no ingestion or generation on GET.
 * Cross-module boundary: reads smart-money data via its own public service
 * functions (getLatestFnoBanList imported directly, sectors read via
 * SmartMoneyIntelligenceService which already persisted-reads).
 */

import { getLatestFiiDiiActivity, type FiiDiiRow } from './fii-dii.service';
import { getLatestBulkBlockDeals, type BulkBlockDealRow } from './bulk-block-deals.service';
import { getLatestFnoBanList } from '../smart-money-intelligence/fno-ban.service';
import { SmartMoneyIntelligenceService } from '../smart-money-intelligence/smart-money-intelligence.service';
import type { SectorSmartMoneySummary } from '../smart-money-intelligence/smart-money-intelligence.types';

// ---------------------------------------------------------------------------
// DTO types
// ---------------------------------------------------------------------------

export interface InstitutionalActivityFiiDiiSection {
  status: 'ready' | 'missing' | 'error';
  asOf: string | null;
  fiiNetCr: number | null;
  diiNetCr: number | null;
  /** True when FIIs were net buyers on the latest date */
  fiiNetPositive: boolean | null;
  /** True when DIIs were net buyers on the latest date */
  diiNetPositive: boolean | null;
  narrative: string;
}

export interface InstitutionalActivityDealHighlight {
  symbol: string;
  clientName: string;
  buySell: 'BUY' | 'SELL';
  dealType: 'BULK' | 'BLOCK';
  notionalCr: number;
}

export interface InstitutionalActivityDealsSection {
  status: 'ready' | 'missing' | 'error';
  asOf: string | null;
  totalDeals: number;
  buyCount: number;
  sellCount: number;
  highlights: InstitutionalActivityDealHighlight[];  // top 5 by notional value
}

export interface InstitutionalActivityFnoBanSection {
  status: 'ready' | 'missing' | 'error';
  banDate: string | null;
  count: number;
  symbols: string[];
}

export interface InstitutionalActivitySectorsSection {
  status: 'ready' | 'missing' | 'error';
  asOf: string | null;
  topAccumulating: Array<{ sector: string; sectorStatus: string }>;
  topDistributing: Array<{ sector: string; sectorStatus: string }>;
}

export interface InstitutionalActivityDto {
  assembledAt: string;
  /**
   * One-line plain-English summary of the combined picture.
   * E.g. "Institutions net-negative on cash equities today; Metals being accumulated; 4 stocks in F&O ban."
   */
  narrative: string;
  fiiDii: InstitutionalActivityFiiDiiSection;
  deals: InstitutionalActivityDealsSection;
  fnoBan: InstitutionalActivityFnoBanSection;
  sectors: InstitutionalActivitySectorsSection;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const smartMoneyService = new SmartMoneyIntelligenceService();

function fiiDiiNarrative(fiiNet: number | null, diiNet: number | null): string {
  if (fiiNet === null && diiNet === null) return 'FII/DII data unavailable.';
  const parts: string[] = [];
  if (fiiNet !== null) {
    const dir = fiiNet >= 0 ? 'net BOUGHT' : 'net SOLD';
    const absVal = Math.abs(fiiNet);
    parts.push(`FIIs ${dir} ₹${absVal.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} Cr`);
  }
  if (diiNet !== null) {
    const dir = diiNet >= 0 ? 'net BOUGHT' : 'net SOLD';
    const absVal = Math.abs(diiNet);
    parts.push(`DIIs ${dir} ₹${absVal.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} Cr`);
  }
  return parts.join('; ');
}

function buildTopLevelNarrative(
  fiiSection: InstitutionalActivityFiiDiiSection,
  dealsSection: InstitutionalActivityDealsSection,
  fnoBanSection: InstitutionalActivityFnoBanSection,
  sectorsSection: InstitutionalActivitySectorsSection
): string {
  const parts: string[] = [];

  // Cash equity flow direction
  if (fiiSection.status === 'ready' && fiiSection.fiiNetCr !== null && fiiSection.diiNetCr !== null) {
    const netFlow = (fiiSection.fiiNetCr ?? 0) + (fiiSection.diiNetCr ?? 0);
    const direction = netFlow >= 0 ? 'net positive on cash equities' : 'net negative on cash equities';
    parts.push(`Institutions ${direction} today`);
  } else {
    parts.push('Cash flow data unavailable');
  }

  // Bulk/block deals summary
  if (dealsSection.status === 'ready' && dealsSection.totalDeals > 0) {
    parts.push(`${dealsSection.totalDeals} bulk/block deal${dealsSection.totalDeals > 1 ? 's' : ''} (${dealsSection.buyCount} buy, ${dealsSection.sellCount} sell)`);
  }

  // Top accumulating sector
  if (sectorsSection.status === 'ready' && sectorsSection.topAccumulating.length > 0) {
    const topSector = sectorsSection.topAccumulating[0].sector
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
    parts.push(`${topSector} being accumulated`);
  }

  // F&O ban
  if (fnoBanSection.status === 'ready') {
    if (fnoBanSection.count === 0) {
      parts.push('no stocks in F&O ban');
    } else {
      parts.push(`${fnoBanSection.count} stock${fnoBanSection.count > 1 ? 's' : ''} in F&O ban`);
    }
  }

  return parts.join('; ') + '.';
}

// ---------------------------------------------------------------------------
// Public service function
// ---------------------------------------------------------------------------

export async function getInstitutionalActivity(): Promise<InstitutionalActivityDto> {
  const assembledAt = new Date().toISOString();

  // Run all 4 persisted reads in parallel
  const [fiiDiiResp, dealsResp, fnoBanResp, sectorsRaw] = await Promise.allSettled([
    getLatestFiiDiiActivity(1),
    getLatestBulkBlockDeals(1),
    getLatestFnoBanList(),
    smartMoneyService.sectors('3M', { region: 'IN', assetType: 'STOCK' }),
  ]);

  // --- FII/DII section ---
  let fiiDiiSection: InstitutionalActivityFiiDiiSection;
  if (fiiDiiResp.status === 'fulfilled') {
    const resp = fiiDiiResp.value;
    if (resp.status === 'ready' && resp.rows.length > 0) {
      // Get latest date rows only
      const latestDate = resp.rows[0].tradingDate;
      const latestRows = resp.rows.filter((r: FiiDiiRow) => r.tradingDate === latestDate);
      const fiiRow = latestRows.find((r: FiiDiiRow) => r.category === 'FII') ?? null;
      const diiRow = latestRows.find((r: FiiDiiRow) => r.category === 'DII') ?? null;
      const fiiNet = fiiRow?.netValueCr ?? null;
      const diiNet = diiRow?.netValueCr ?? null;
      fiiDiiSection = {
        status: 'ready',
        asOf: latestDate,
        fiiNetCr: fiiNet,
        diiNetCr: diiNet,
        fiiNetPositive: fiiNet !== null ? fiiNet >= 0 : null,
        diiNetPositive: diiNet !== null ? diiNet >= 0 : null,
        narrative: fiiDiiNarrative(fiiNet, diiNet),
      };
    } else {
      fiiDiiSection = {
        status: resp.status as 'missing' | 'error',
        asOf: null,
        fiiNetCr: null,
        diiNetCr: null,
        fiiNetPositive: null,
        diiNetPositive: null,
        narrative: resp.message ?? 'FII/DII data unavailable.',
      };
    }
  } else {
    fiiDiiSection = {
      status: 'error',
      asOf: null,
      fiiNetCr: null,
      diiNetCr: null,
      fiiNetPositive: null,
      diiNetPositive: null,
      narrative: 'FII/DII data unavailable.',
    };
  }

  // --- Bulk/Block deals section ---
  let dealsSection: InstitutionalActivityDealsSection;
  if (dealsResp.status === 'fulfilled') {
    const resp = dealsResp.value;
    if (resp.status === 'ready' && resp.rows.length > 0) {
      const buyCount = resp.rows.filter((r: BulkBlockDealRow) => r.buySell === 'BUY').length;
      const sellCount = resp.rows.filter((r: BulkBlockDealRow) => r.buySell === 'SELL').length;
      // Compute notional and pick top 5 by notional value
      const withNotional = resp.rows.map((r: BulkBlockDealRow) => ({
        ...r,
        notionalCr: (r.qty * r.avgPrice) / 1e7,
      }));
      withNotional.sort((a, b) => b.notionalCr - a.notionalCr);
      const highlights: InstitutionalActivityDealHighlight[] = withNotional.slice(0, 5).map((r) => ({
        symbol: r.symbol,
        clientName: r.clientName,
        buySell: r.buySell,
        dealType: r.dealType,
        notionalCr: r.notionalCr,
      }));
      dealsSection = {
        status: 'ready',
        asOf: resp.asOf,
        totalDeals: resp.rows.length,
        buyCount,
        sellCount,
        highlights,
      };
    } else {
      dealsSection = {
        status: resp.status as 'missing' | 'error',
        asOf: null,
        totalDeals: 0,
        buyCount: 0,
        sellCount: 0,
        highlights: [],
      };
    }
  } else {
    dealsSection = {
      status: 'error',
      asOf: null,
      totalDeals: 0,
      buyCount: 0,
      sellCount: 0,
      highlights: [],
    };
  }

  // --- F&O ban section ---
  let fnoBanSection: InstitutionalActivityFnoBanSection;
  if (fnoBanResp.status === 'fulfilled') {
    const resp = fnoBanResp.value;
    fnoBanSection = {
      status: resp.status as 'ready' | 'missing' | 'error',
      banDate: resp.banDate,
      count: resp.count,
      symbols: resp.symbols,
    };
  } else {
    fnoBanSection = {
      status: 'error',
      banDate: null,
      count: 0,
      symbols: [],
    };
  }

  // --- Sectors section ---
  let sectorsSection: InstitutionalActivitySectorsSection;
  if (sectorsRaw.status === 'fulfilled') {
    const sectors: SectorSmartMoneySummary[] = sectorsRaw.value;
    if (sectors.length > 0) {
      const accumulating = sectors
        .filter((s) => s.sectorStatus === 'STRONG_ACCUMULATION' || s.sectorStatus === 'ACCUMULATING')
        .slice(0, 3)
        .map((s) => ({ sector: s.sector, sectorStatus: s.sectorStatus }));
      const distributing = sectors
        .filter((s) => s.sectorStatus === 'STRONG_DISTRIBUTION' || s.sectorStatus === 'DISTRIBUTING')
        .slice(0, 3)
        .map((s) => ({ sector: s.sector, sectorStatus: s.sectorStatus }));
      const latestUpdatedAt = sectors.map((s) => s.updatedAt).sort().at(-1) ?? null;
      sectorsSection = {
        status: 'ready',
        asOf: latestUpdatedAt,
        topAccumulating: accumulating,
        topDistributing: distributing,
      };
    } else {
      sectorsSection = {
        status: 'missing',
        asOf: null,
        topAccumulating: [],
        topDistributing: [],
      };
    }
  } else {
    sectorsSection = {
      status: 'error',
      asOf: null,
      topAccumulating: [],
      topDistributing: [],
    };
  }

  const narrative = buildTopLevelNarrative(fiiDiiSection, dealsSection, fnoBanSection, sectorsSection);

  return {
    assembledAt,
    narrative,
    fiiDii: fiiDiiSection,
    deals: dealsSection,
    fnoBan: fnoBanSection,
    sectors: sectorsSection,
  };
}
