// Fundamentals + corporate-actions serving-reads (Phase 5a).
//
// FundamentalsReadsService owns the persisted-read fundamentals / corporate-actions serving
// methods plus their pure response formatters (formatFundamentalsResponse /
// formatCorporateActionsResponse moved cleanly — read-only, no external callers).
// MarketDataFoundationService constructs it once, passing itself as the MarketDataServingHost,
// and keeps a thin byte-identical delegator for each public method. The crypto-scope predicate
// (isCryptoScope) is a pure sibling-module function imported directly; the crypto branch is
// served via the host crypto repository. Behaviour is byte-identical to the pre-extraction
// inline implementation.

import type { MarketDataServingHost } from './market-data-foundation.serving-host';
import type { PaginationOptions } from '../market-data-foundation.types';
import { isCryptoScope } from '../../../shared/data-access/market-repository-router';

/** Period types that represent a *live* trailing snapshot — the only rows that carry
 *  the current peRatio / marketCap, as opposed to a closed fiscal period. */
const LIVE_SNAPSHOT_PERIOD_TYPES = new Set(['TTM']);

/**
 * Order persisted fundamentals for serving so that, among records sharing a
 * `periodEndDate`, the live trailing snapshot (TTM) leads. US SEC ingestion writes a
 * standalone QUARTERLY (10-Q) row whose period-end equals the TTM snapshot's derived
 * period-end (and after a 10-K the newest ANNUAL row ties TTM the same way). Without a
 * deterministic tiebreak the DB's `periodEndDate DESC` order leaves `records[0]`
 * non-deterministic, which would silently drop the signal engine's PE self-history
 * votes — those read `records[0]` expecting the TTM row's live peRatio (signal-scoring
 * `fundamentalPeHistoryVotes`). Primary order (periodEndDate DESC) is unchanged for
 * distinct dates; only equal-date ties are made deterministic (TTM first). Stable for
 * true ties (preserves incoming query order).
 */
export function orderFundamentalsForServing<T extends { periodEndDate?: unknown; periodType?: unknown }>(records: T[]): T[] {
  const liveRank = (t: unknown) => (typeof t === 'string' && LIVE_SNAPSHOT_PERIOD_TYPES.has(t.toUpperCase()) ? 0 : 1);
  const ms = (d: unknown) => {
    const t = d instanceof Date ? d.getTime() : typeof d === 'string' || typeof d === 'number' ? new Date(d).getTime() : NaN;
    return Number.isNaN(t) ? -Infinity : t;
  };
  return records
    .map((record, index) => ({ record, index }))
    .sort((a, b) => {
      const byDate = ms(b.record.periodEndDate) - ms(a.record.periodEndDate);
      if (byDate !== 0) return byDate;
      const byLive = liveRank(a.record.periodType) - liveRank(b.record.periodType);
      if (byLive !== 0) return byLive;
      return a.index - b.index; // stable: preserve incoming (query) order for true ties
    })
    .map(({ record }) => record);
}

export class FundamentalsReadsService {
  constructor(private readonly host: MarketDataServingHost) {}

  async fundamentalsByInstrumentId(instrumentId: string, options: Pick<PaginationOptions, 'region' | 'assetType'> = {}) {
    // Crypto has no fundamentals — return an honest empty, not-applicable payload
    // (the UI hides the fundamentals tab for crypto via capability flags).
    if (isCryptoScope(options)) {
      const asset = await this.host.cryptoRepository.getAssetById(instrumentId);
      if (!asset) return null;
      return {
        instrument_id: asset.id,
        symbol: asset.symbol,
        records: [],
        not_applicable: true,
        not_applicable_reason: 'Fundamentals are not applicable to crypto assets.',
      };
    }
    const stock = await this.host.repository.findStockByIdInScope(instrumentId, options);
    if (!stock) {
      return null;
    }

    const records = await this.host.repository.listFundamentals(stock.id);

    return this.formatFundamentalsResponse(stock, records);
  }

  async storedFundamentalsByInstrumentId(instrumentId: string, options: Pick<PaginationOptions, 'region' | 'assetType'> = {}) {
    const stock = await this.host.repository.findStockByIdInScope(instrumentId, options);
    if (!stock) {
      return null;
    }

    const records = await this.host.repository.listFundamentals(stock.id);
    return this.formatFundamentalsResponse(stock, records);
  }

  async storedFundamentalsByInstrumentIds(instrumentIds: string[], _options: Pick<PaginationOptions, 'region' | 'assetType'> = {}, asOf?: Date) {
    const uniqueIds = [...new Set(instrumentIds.filter(Boolean))];
    if (uniqueIds.length === 0) return new Map<string, any>();
    const stocks = await this.host.repository.prisma.stock.findMany({
      where: { id: { in: uniqueIds } },
    });
    const records = await this.host.repository.prisma.fundamental.findMany({
      // asOf: point-in-time guard so a batch backfill never sees fundamentals filed after the as-of date.
      where: { stockId: { in: stocks.map((stock: any) => stock.id) }, ...(asOf ? { periodEndDate: { lte: asOf } } : {}) },
      orderBy: [{ stockId: 'asc' }, { periodEndDate: 'desc' }],
    });
    const recordsByStockId = new Map<string, any[]>();
    for (const record of records) {
      const bucket = recordsByStockId.get(record.stockId) || [];
      bucket.push(record);
      recordsByStockId.set(record.stockId, bucket);
    }
    return new Map<string, any>(stocks.map((stock: any) => [stock.id, this.formatFundamentalsResponse(stock, recordsByStockId.get(stock.id) || [])]));
  }

  async corporateActionsByInstrumentId(instrumentId: string, options: Pick<PaginationOptions, 'region' | 'assetType'> = {}) {
    // Crypto has no dividends/splits — honest empty, not-applicable payload.
    if (isCryptoScope(options)) {
      const asset = await this.host.cryptoRepository.getAssetById(instrumentId);
      if (!asset) return null;
      return {
        instrument_id: asset.id,
        symbol: asset.symbol,
        actions: [],
        not_applicable: true,
        not_applicable_reason: 'Dividends and splits are not applicable to crypto assets.',
      };
    }
    const stock = await this.host.repository.findStockByIdInScope(instrumentId, options);
    if (!stock) {
      return null;
    }

    await this.host.repository.dedupeCorporateActions(stock.id);
    const actions = await this.host.repository.listCorporateActions(stock.id);

    return this.formatCorporateActionsResponse(stock, actions);
  }

  async storedCorporateActionsByInstrumentId(instrumentId: string, options: Pick<PaginationOptions, 'region' | 'assetType'> = {}) {
    const stock = await this.host.repository.findStockByIdInScope(instrumentId, options);
    if (!stock) {
      return null;
    }

    await this.host.repository.dedupeCorporateActions(stock.id);
    const actions = await this.host.repository.listCorporateActions(stock.id);
    return this.formatCorporateActionsResponse(stock, actions);
  }

  formatCorporateActionsResponse(stock: any, actions: any[]) {
    return {
      instrument_id: stock.id,
      symbol: stock.symbol,
      source: actions[0]?.source || 'database',
      ingestion_timestamp: actions[0]?.ingestionTimestamp?.toISOString?.() ?? null,
      last_updated_timestamp: actions[0]?.lastUpdatedTimestamp?.toISOString?.() ?? null,
      data_status: actions.length > 0 ? 'COMPLETE' : 'MISSING',
      actions: actions.map((action: any) => ({
        action_type: action.actionType,
        effective_date: action.effectiveDate.toISOString(),
        declared_date: action.declaredDate?.toISOString?.() ?? null,
        payment_date: action.paymentDate?.toISOString?.() ?? null,
        value: action.actionType === 'dividend' ? (action.amount !== null ? Number(action.amount) : null) : (action.splitRatio !== null ? Number(action.splitRatio) : null),
        ratio: action.splitRatio !== null ? Number(action.splitRatio) : null,
        amount: action.amount !== null ? Number(action.amount) : null,
        currency: action.currency,
        source: action.source,
        ingestion_timestamp: action.ingestionTimestamp.toISOString(),
        last_updated_timestamp: action.lastUpdatedTimestamp.toISOString(),
        data_status: action.dataStatus,
      })),
    };
  }

  formatFundamentalsResponse(stock: any, records: any[]) {
    // Deterministic order: live TTM snapshot leads on an equal periodEndDate so the
    // signal engine's records[0]-based PE self-history keeps reading the live peRatio
    // even after fiscal (QUARTERLY/ANNUAL) rows share that period-end.
    const ordered = orderFundamentalsForServing(records);
    return {
      instrument_id: stock.id,
      symbol: stock.symbol,
      source: ordered[0]?.source || 'database',
      ingestion_timestamp: ordered[0]?.ingestionTimestamp?.toISOString?.() ?? null,
      last_updated_timestamp: ordered[0]?.lastUpdatedTimestamp?.toISOString?.() ?? null,
      data_status: ordered.length > 0 ? ordered[0].dataStatus : 'MISSING',
      records: ordered.map((record: any) => ({
        revenue: record.revenue !== null ? Number(record.revenue) : null,
        eps: record.eps !== null ? Number(record.eps) : null,
        net_income: record.netIncome !== null ? Number(record.netIncome) : null,
        pe_ratio: record.peRatio !== null ? Number(record.peRatio) : null,
        dividend_yield: record.dividendYield !== null ? Number(record.dividendYield) : null,
        shares_outstanding: record.sharesOutstanding !== null ? Number(record.sharesOutstanding) : null,
        market_cap: record.marketCap !== null ? Number(record.marketCap) : null,
        currency: record.currency,
        period_type: record.periodType,
        period_end_date: record.periodEndDate.toISOString(),
        official_result_date: record.officialResultDate?.toISOString?.() ?? null,
        source: record.source,
        source_note: record.sourceNote ?? null,
        source_url: record.sourceUrl ?? null,
        validated_by: record.validatedBy ?? null,
        validated_at: record.validatedAt?.toISOString?.() ?? null,
        ingestion_timestamp: record.ingestionTimestamp.toISOString(),
        last_updated_timestamp: record.lastUpdatedTimestamp.toISOString(),
        data_status: record.dataStatus,
      })),
    };
  }
}
