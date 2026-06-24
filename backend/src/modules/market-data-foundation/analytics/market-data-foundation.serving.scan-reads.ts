// Market-scan + screener serving-reads (Phase 5a).
//
// ScanReadsService owns the persisted-read market-scan serving methods (movers, map, 52w,
// delivery/volume spike, screener) plus their private read helpers (readLatestScanSnapshot,
// marketMoverRange, marketMapGroups and its leaf numeric helpers). MarketDataFoundationService
// constructs it once, passing itself as the MarketDataServingHost, and keeps a thin
// byte-identical delegator for each public method.
//
// Seam note: readLatestScanSnapshot is ALSO called by refreshMarketScanSnapshots — a
// WRITE/materializer that STAYS on the service in this phase. The service keeps a
// readLatestScanSnapshot delegator that forwards to this.scanReads.readLatestScanSnapshot so
// the writer still resolves it (readLatestScanSnapshot is therefore a public method here).
//
// MARKET_MOVER_LOOKBACK_DAYS is re-declared locally (identical literal) because the service
// still uses its own copy inside refreshMarketScanSnapshots (a kept method); duplicating the
// small literal avoids a service↔serving import cycle. isCryptoScope and resolveMarketProfile
// are pure sibling-module functions imported directly. Behaviour is byte-identical to the
// pre-extraction inline implementation.

import type { MarketDataServingHost } from './market-data-foundation.serving-host';
import type {
  MarketDataStatus,
  MarketMapGroup,
  MarketMapSummary,
  MarketMapTile,
  MarketMoverRange,
  MarketMoverRangeSummary,
  MarketMoverRow,
  MarketMoversSummary,
  MarketScanRow52w,
  MarketScanRowDeliverySpike,
  MarketScanRowVolumeSpike,
  MarketScanSummary52w,
  MarketScanSummaryDeliverySpike,
  MarketScanSummaryVolumeSpike,
  PaginationOptions,
} from '../market-data-foundation.types';
import { isCryptoScope } from '../../../shared/data-access/market-repository-router';
import { resolveMarketProfile } from '../../../shared/utils/market-profile';
import type { FnoReadinessComponents } from './fno-readiness-score';
import { rankScreenerRowsByReadiness } from './market-data-foundation.serving.fno-readiness-reads';
import { MARKET_MOVERS_SNAPSHOT_COUNT } from '../persistence/market-data-foundation.repository.constants';

const MARKET_MOVER_LOOKBACK_DAYS: Record<MarketMoverRange, number> = {
  '1D': 1,
  '1W': 7,
  '1M': 30,
  '3M': 90,
  '6M': 180,
  '1Y': 365,
};

export class ScanReadsService {
  constructor(private readonly host: MarketDataServingHost) {}

  async readLatestScanSnapshot(
    scanType: string,
    scanRange: string | null,
    region: string,
    assetType: string,
  ): Promise<{ tradingDate: Date; rows: object[] } | null> {
    const db = this.host.repository.prisma;
    // Find the latest tradingDate for this type/scope
    const latest = await (db as any).marketScanSnapshot.findFirst({
      where: { scanType, scanRange: scanRange ?? null, region, assetType },
      orderBy: { tradingDate: 'desc' },
      select: { tradingDate: true },
    });
    if (!latest) return null;
    const rows = await (db as any).marketScanSnapshot.findMany({
      where: { scanType, scanRange: scanRange ?? null, region, assetType, tradingDate: latest.tradingDate },
      orderBy: { rank: 'asc' },
      select: { payloadJson: true },
    });
    return { tradingDate: latest.tradingDate as Date, rows: rows.map((r: any) => r.payloadJson as object) };
  }

  async marketMovers(options: Pick<PaginationOptions, 'region' | 'assetType'> & { limit?: number; range?: string } = {}): Promise<MarketMoversSummary> {
    const scope = {
      region: options.region?.trim().toUpperCase() || 'IN',
      assetType: options.assetType?.trim().toUpperCase() || 'STOCK',
    };
    const limit = Math.max(1, Math.min(options.limit ?? MARKET_MOVERS_SNAPSHOT_COUNT, 20));
    const requestedRange = this.marketMoverRange(options.range);
    const requestedRanges = requestedRange
      ? [requestedRange]
      : (Object.keys(MARKET_MOVER_LOOKBACK_DAYS) as MarketMoverRange[]);

    // Crypto scope → isolated crypto_market_scan_snapshots (movers persisted by the crypto lane).
    if (isCryptoScope(options)) {
      const cryptoRanges: MarketMoverRangeSummary[] = [];
      for (const range of requestedRanges) {
        const [g, l] = await Promise.all([
          this.host.cryptoRepository.readLatestScan('MOVERS_GAINERS', range),
          this.host.cryptoRepository.readLatestScan('MOVERS_LOSERS', range),
        ]);
        if (!g && !l) {
          cryptoRanges.push({ range, gainers: [], losers: [], warnings: [`No crypto movers snapshot for ${range} yet. Awaiting the next crypto scan refresh.`] });
          continue;
        }
        const gainers = (g?.rows ?? []).slice(0, limit) as unknown as MarketMoverRow[];
        const losers = (l?.rows ?? []).slice(0, limit) as unknown as MarketMoverRow[];
        cryptoRanges.push({ range, gainers, losers, warnings: ['Crypto price movers served from persisted Binance OHLCV snapshot.'] });
      }
      return { scope: { region: 'GLOBAL', assetType: 'CRYPTO' }, generatedAt: new Date().toISOString(), ranges: cryptoRanges };
    }

    const ranges: MarketMoverRangeSummary[] = [];
    for (const range of requestedRanges) {
      const [gainersSnap, losersSnap] = await Promise.all([
        this.readLatestScanSnapshot('MOVERS_GAINERS', range, scope.region, scope.assetType),
        this.readLatestScanSnapshot('MOVERS_LOSERS', range, scope.region, scope.assetType),
      ]);
      if (!gainersSnap && !losersSnap) {
        ranges.push({ range, gainers: [], losers: [], warnings: [`No market-scan snapshot found for movers ${range} in ${scope.region}/${scope.assetType}. Run MARKET_SCAN_REFRESH to populate.`] });
        continue;
      }
      const scopeCurrency = resolveMarketProfile(scope).currency;
      const gainers = ((gainersSnap?.rows ?? []).slice(0, limit) as unknown as MarketMoverRow[])
        .map((r) => ({ ...r, currency: (r as any).currency || scopeCurrency, region: (r as any).region || scope.region }));
      const losers = ((losersSnap?.rows ?? []).slice(0, limit) as unknown as MarketMoverRow[])
        .map((r) => ({ ...r, currency: (r as any).currency || scopeCurrency, region: (r as any).region || scope.region }));
      const warnings = ['Price movers served from stored daily snapshot. Excludes unsupported instruments, stale candles, insufficient liquidity/history, mixed sources, and mixed adjusted/close basis.'];
      ranges.push({ range, gainers, losers, warnings });
    }

    return {
      scope,
      generatedAt: new Date().toISOString(),
      ranges,
    };
  }

  async marketMap(options: Pick<PaginationOptions, 'region' | 'assetType'> & { limit?: number; range?: string } = {}): Promise<MarketMapSummary> {
    const scope = {
      region: options.region?.trim().toUpperCase() || 'IN',
      assetType: options.assetType?.trim().toUpperCase() || 'STOCK',
    };
    const range = this.marketMoverRange(options.range) ?? '1D';
    const limit = Math.max(1, Math.min(Number(options.limit) || 60, 100));

    const snap = isCryptoScope(options)
      ? await this.host.cryptoRepository.readLatestScan('MARKET_MAP', range)
      : await this.readLatestScanSnapshot('MARKET_MAP', range, scope.region, scope.assetType);
    if (!snap) {
      return {
        status: 'missing',
        scope,
        asOf: null,
        range,
        materialized: false,
        sourceLabels: { catalog: 'Market Data Foundation stock catalog', prices: 'Stored daily price history' },
        warnings: ['No market-map snapshot found. Run MARKET_SCAN_REFRESH to populate.'],
        gaps: ['Market map needs catalog rows and stored price movement evidence for the selected scope.'],
        groups: [],
        tiles: [],
      };
    }
    const rawRows = snap.rows.slice(0, limit) as unknown as MarketMoverRow[];
    const mapScopeCurrency = resolveMarketProfile(scope).currency;
    const tiles: MarketMapTile[] = rawRows.map((row) => ({
      instrumentId: row.instrumentId,
      symbol: row.symbol,
      displaySymbol: row.symbol,
      companyName: row.companyName,
      sector: row.sector,
      derivativesEligible: null,
      dataStatus: 'COMPLETE' as MarketDataStatus,
      returnPercent: row.returnPercent,
      latestDate: row.latestDate,
      priceBasis: row.priceBasis,
      currency: (row as any).currency || mapScopeCurrency,
      region: (row as any).region || scope.region,
    }));
    const groups = this.marketMapGroups(tiles);
    const hasMissingSector = tiles.some((tile) => !tile.sector?.trim());
    const gaps = [
      'Additional stock overlays require later saved evidence before they can appear here.',
      'Additional grouping modes require later saved evidence before they can appear here.',
      ...(hasMissingSector ? ['Some map rows are missing sector metadata and are not included in sector groups.'] : []),
    ];
    return {
      status: tiles.length > 0 ? 'ready' : 'missing',
      scope,
      asOf: snap.tradingDate.toISOString(),
      range,
      materialized: false,
      sourceLabels: { catalog: 'Market Data Foundation stock catalog', prices: 'Stored daily price history' },
      warnings: ['Map returns served from stored daily snapshot. Excludes unsupported, stale, insufficient-history, low-liquidity, or mixed-source rows.'],
      gaps,
      groups,
      tiles,
    };
  }

  private marketMoverRange(value: unknown): MarketMoverRange | null {
    if (typeof value !== 'string') return null;
    const normalized = value.trim().toUpperCase();
    return Object.prototype.hasOwnProperty.call(MARKET_MOVER_LOOKBACK_DAYS, normalized)
      ? normalized as MarketMoverRange
      : null;
  }

  private marketMapGroups(tiles: MarketMapSummary['tiles']): MarketMapGroup[] {
    const groups = new Map<string, MarketMapSummary['tiles']>();
    for (const tile of tiles) {
      const key = tile.sector?.trim();
      if (!key) continue;
      groups.set(key, [...(groups.get(key) || []), tile]);
    }
    return [...groups.entries()]
      .map(([key, rows]) => ({
        key,
        label: key,
        tileCount: rows.length,
        avgReturnPercent: this.roundNullable(this.averageNumber(rows.map((row) => row.returnPercent).filter(this.isFiniteNumber))),
      }))
      .sort((left, right) => {
        const leftAbs = Math.abs(left.avgReturnPercent ?? 0);
        const rightAbs = Math.abs(right.avgReturnPercent ?? 0);
        return rightAbs - leftAbs || left.label.localeCompare(right.label);
      });
  }

  private averageNumber(values: number[]): number | null {
    if (values.length === 0) return null;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  private isFiniteNumber(value: number | null): value is number {
    return typeof value === 'number' && Number.isFinite(value);
  }

  private roundNullable(value: number | null): number | null {
    return value === null ? null : Number(value.toFixed(6));
  }

  async marketScan52w(
    options: Pick<PaginationOptions, 'region' | 'assetType'> & {
      scanType: '52w-high' | '52w-low';
      proximityPct?: number;
      limit?: number;
    } = { scanType: '52w-high' },
  ): Promise<MarketScanSummary52w> {
    const scope = {
      region: options.region?.trim().toUpperCase() || 'IN',
      assetType: options.assetType?.trim().toUpperCase() || 'STOCK',
    };
    const scanType = options.scanType ?? '52w-high';
    const proximityPct = Math.max(0.5, Math.min(options.proximityPct ?? 5, 50));
    const limit = Math.max(1, Math.min(options.limit ?? 30, 100));
    const snapKey = scanType === '52w-high' ? '52W_HIGH' : '52W_LOW';

    const snap = isCryptoScope(options)
      ? await this.host.cryptoRepository.readLatestScan(snapKey)
      : await this.readLatestScanSnapshot(snapKey, null, scope.region, scope.assetType);
    if (!snap) {
      return {
        scanType,
        scope,
        generatedAt: new Date().toISOString(),
        proximityPct,
        results: [],
        warnings: [`No 52w-${scanType === '52w-high' ? 'high' : 'low'} snapshot found for ${scope.region}/${scope.assetType}. Run MARKET_SCAN_REFRESH to populate.`],
      };
    }
    const scan52wCurrency = resolveMarketProfile(scope).currency;
    // SPAC/shell filter: for non-IN regions, exclude obvious non-common-stock shells that
    // get stuck near $10 par (SPAC units, acquisition shells, warrants, rights).
    // Conservative name-based heuristic — does not affect IN.
    // Patterns: "Acquisition Corp", "- Unit(s)", "Warrants", "Rights", "Class A Ordinary Shares"
    const SPAC_NAME_RE = /Acquisition\s+Corp|\bUnit(s)?\b|Warrant(s)?\b|Right(s)?\b|Class\s+[AB]\s+Ordinary\s+Shares/i;
    const rawRows52w = snap.rows as unknown as MarketScanRow52w[];
    const filteredRows = scope.region !== 'IN'
      ? rawRows52w.filter((r) => !SPAC_NAME_RE.test(r.companyName ?? ''))
      : rawRows52w;
    const results = filteredRows.slice(0, limit).map((r) => ({
      ...r,
      currency: (r as any).currency || scan52wCurrency,
      region: (r as any).region || scope.region,
    }));
    return {
      scanType,
      scope,
      generatedAt: new Date().toISOString(),
      proximityPct,
      results,
      warnings: ['Prices use adjusted close where available. Proximity is to the 52-week adjusted-close high/low over ~365 calendar days of price history. Served from stored daily snapshot.'],
    };
  }

  async marketScanDeliverySpike(
    options: Pick<PaginationOptions, 'region' | 'assetType'> & {
      lookbackBars?: number;
      minSpikeRatio?: number;
      limit?: number;
    } = {},
  ): Promise<MarketScanSummaryDeliverySpike> {
    const scope = {
      region: options.region?.trim().toUpperCase() || 'IN',
      assetType: options.assetType?.trim().toUpperCase() || 'STOCK',
    };
    const minSpikeRatio = Math.max(1.1, Math.min(options.minSpikeRatio ?? 1.5, 10));
    const limit = Math.max(1, Math.min(options.limit ?? 30, 100));

    // Delivery data is NSE-only — not applicable to crypto.
    if (isCryptoScope(options)) {
      return {
        scanType: 'delivery-spike',
        scope,
        generatedAt: new Date().toISOString(),
        minSpikeRatio,
        results: [],
        warnings: ['Delivery% is not applicable to crypto assets.'],
      };
    }
    const snap = await this.readLatestScanSnapshot('DELIVERY_SPIKE', null, scope.region, scope.assetType);
    if (!snap) {
      return {
        scanType: 'delivery-spike',
        scope,
        generatedAt: new Date().toISOString(),
        minSpikeRatio,
        results: [],
        warnings: [`No delivery-spike snapshot found for ${scope.region}/${scope.assetType}. Run MARKET_SCAN_REFRESH to populate.`],
      };
    }
    const deliveryScopeCurrency = resolveMarketProfile(scope).currency;
    const results = (snap.rows.slice(0, limit) as unknown as MarketScanRowDeliverySpike[])
      .map((r) => ({
        ...r,
        currency: (r as any).currency || deliveryScopeCurrency,
        region: (r as any).region || scope.region,
      }));
    return {
      scanType: 'delivery-spike',
      scope,
      generatedAt: new Date().toISOString(),
      minSpikeRatio,
      results,
      warnings: ['Delivery% spikes served from stored daily snapshot. NSE delivery data only — BSE-only stocks will not appear.'],
    };
  }

  async marketScanVolumeSpike(
    options: Pick<PaginationOptions, 'region' | 'assetType'> & {
      lookbackBars?: number;
      minSpikeRatio?: number;
      limit?: number;
    } = {},
  ): Promise<MarketScanSummaryVolumeSpike> {
    const scope = {
      region: options.region?.trim().toUpperCase() || 'IN',
      assetType: options.assetType?.trim().toUpperCase() || 'STOCK',
    };
    const minSpikeRatio = Math.max(1.1, Math.min(options.minSpikeRatio ?? 2.0, 20));
    const limit = Math.max(1, Math.min(options.limit ?? 30, 100));

    const snap = isCryptoScope(options)
      ? await this.host.cryptoRepository.readLatestScan('VOLUME_SPIKE')
      : await this.readLatestScanSnapshot('VOLUME_SPIKE', null, scope.region, scope.assetType);
    if (!snap) {
      return {
        scanType: 'volume-spike',
        scope,
        generatedAt: new Date().toISOString(),
        minSpikeRatio,
        results: [],
        warnings: [`No volume-spike snapshot found for ${scope.region}/${scope.assetType}. Run MARKET_SCAN_REFRESH to populate.`],
      };
    }
    const volumeScopeCurrency = resolveMarketProfile(scope).currency;
    const results = (snap.rows.slice(0, limit) as unknown as MarketScanRowVolumeSpike[])
      .map((r) => ({
        ...r,
        currency: (r as any).currency || volumeScopeCurrency,
        region: (r as any).region || scope.region,
      }));
    return {
      scanType: 'volume-spike',
      scope,
      generatedAt: new Date().toISOString(),
      minSpikeRatio,
      results,
      warnings: ['Volume spike served from stored daily snapshot. Instruments lacking consistent volume data in NSE/BSE exchange files are excluded.'],
    };
  }

  async screener(options: {
    region?: string;
    assetType?: string;
    signalDirection?: string;
    setup?: string;
    minScore?: number;
    minRsPercentile?: number;
    sector?: string;
    capBand?: 'LARGE' | 'MID' | 'SMALL';
    minDeliveryPct?: number;
    min52wPositionPct?: number;
    excludeFnoBan?: boolean;
    onlyDerivativesEligible?: boolean;
    limit?: number;
  } = {}): Promise<{
    generatedAt: string;
    count: number;
    results: Array<{
      instrumentId: string;
      symbol: string;
      companyName: string;
      price: number | null;
      signalDirection: string | null;
      signalScore: number | null;
      rsPercentile: number | null;
      sector: string | null;
      capBand: string | null;
      deliveryPct: number | null;
      range52wPositionPct: number | null;
      inFnoBan: boolean;
      buildupLabel: string | null;
      oiChangePct: number | null;
      pcrOi: number | null;
      fnoReadinessScore: number | null;
      fnoGrade: string | null;
      fnoComponents: FnoReadinessComponents | null;
      scoreDeltaPrev: number | null;
      isNewEntry: boolean;
      factorFamilies: Record<string, number> | null;
      setups: string[];
      smartMoneyStatus: string | null;
      sectorLeadershipStatus: string | null;
      sparkline: number[] | null;
      currency: string;
      region?: string;
    }>;
    warnings: string[];
  }> {
    // The equity screener (delivery%, cap band, F&O ban) is not applicable to crypto.
    // Crypto discovery lives on the Signals screener; return empty rather than leak equity rows.
    if (isCryptoScope(options)) {
      return {
        generatedAt: new Date().toISOString(),
        count: 0,
        results: [],
        warnings: ['Screener is equity-only. Use the Signals screener for crypto.'],
      };
    }
    const screenerScope = {
      region: options.region?.trim().toUpperCase() || 'IN',
      assetType: options.assetType?.trim().toUpperCase() || 'STOCK',
    };
    const screenerCurrency = resolveMarketProfile(screenerScope).currency;

    // For the "Top F&O" view we rank by the readiness composite (which blends in
    // OI/PCR), so the repo must hand back the FULL F&O-eligible candidate pool — not
    // a signal-score-ordered LIMIT slice — before we re-sort. (~218 eligible < 500 cap.)
    const repoOptions = options.onlyDerivativesEligible ? { ...options, limit: 500 } : options;
    const rows = await this.host.repository.screener(repoOptions);

    // RS-percentile + F&O readiness composite + Top-F&O ranking — pure read-time
    // derivation, extracted to its own file to keep this serving module under the cap.
    const results = rankScreenerRowsByReadiness(rows, options, {
      currency: screenerCurrency,
      region: screenerScope.region,
    });

    // Attach a short price sparkline (recent closes, chronological) for each result row.
    // One batched persisted read for the ≤limit rows — no per-row or live fetch.
    const SPARKLINE_BARS = 30;
    const priceWindows = results.length > 0
      ? await this.host.listRecentPriceWindowsByInstrumentIds(
          results.map((r: any) => r.instrumentId),
          SPARKLINE_BARS,
          { region: screenerScope.region, assetType: screenerScope.assetType },
        )
      : new Map<string, any[]>();
    const resultsWithSparkline = results.map((r: any) => {
      const bars = priceWindows.get(r.instrumentId) ?? [];
      const closes = bars
        .slice()
        .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map((b: any) => (b.adjusted_close != null ? Number(b.adjusted_close) : Number(b.close)))
        .filter((v: number) => Number.isFinite(v));
      return { ...r, sparkline: closes.length >= 2 ? closes : null };
    });

    const warnings: string[] = [];
    if (resultsWithSparkline.length === 0) {
      warnings.push('No stocks match the current filter combination. Try relaxing one or more criteria.');
    }

    return {
      generatedAt: new Date().toISOString(),
      count: resultsWithSparkline.length,
      results: resultsWithSparkline,
      warnings,
    };
  }
}
