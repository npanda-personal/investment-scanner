// Prisma access for the calendar module. Reads four persisted sources:
//   - ipo_calendar_snapshots        (this module's own materialized IPO snapshot)
//   - corporate_actions + stocks    (dividends / splits / bonuses, scoped by stock.region)
//   - earnings_intelligence_snapshots (upcoming results — shared read, latest snapshot)
//   - economic_calendar_events       (this module's FRED-ingested release schedule)
// Plus the boundary reads the IPO refresh needs (recently-listed stocks + first/last close).
// No business logic here — shaping into CalendarEvent happens in the service.

import { randomUUID } from 'crypto';
import prisma from '../../db/prisma';
import type { UpcomingIpoRecord } from './calendar.types';

export interface CorporateActionRow {
  id: string;
  stockId: string;
  actionType: string;
  effectiveDate: Date;
  paymentDate: Date | null;
  amount: unknown;
  splitRatio: unknown;
  currency: string | null;
  stock: { symbol: string; name: string; region: string; currency: string | null } | null;
}

export interface EarningsUpcomingRow {
  symbol: string;
  stockId: string;
  // Non-null: listUpcomingEarnings filters resultDate to a [gte, lte] window, excluding nulls.
  resultDate: Date;
  resultDateSource: string;
  daysToResult: number | null;
  stock: { name: string } | null;
}

export interface RecentlyListedStock {
  id: string;
  symbol: string;
  name: string;
  region: string;
  exchange: string | null;
  sector: string | null;
  currency: string | null;
  ipoDate: Date | null;
}

export interface IpoSnapshotUpsert {
  snapshotDate: Date;
  dataThroughDate: Date | null;
  stockId: string;
  symbol: string;
  companyName: string | null;
  scopeRegion: string;
  scopeAssetType: string;
  listingDate: Date;
  daysListed: number;
  exchange: string | null;
  sector: string | null;
  currency: string | null;
  firstClose: number | null;
  firstCloseDate: Date | null;
  latestClose: number | null;
  latestCloseDate: Date | null;
  returnSinceListing: number | null;
  warnings: string[];
  freshness: string;
}

export interface EconomicEventUpsert {
  source: string;
  releaseId: string;
  releaseName: string;
  seriesId: string | null;
  region: string;
  eventDate: Date;
  actualValue: number | null;
  previousValue: number | null;
  unit: string | null;
  sourceUrl: string | null;
}

export class CalendarRepository {
  // `db as any`: the freshly generated client exposes the new models; the loose handle
  // matches the house style used across snapshot repositories and keeps reads terse.
  constructor(private readonly db: any = prisma) {}

  // ---- Reads (assembled into the unified API) -----------------------------

  /** Latest IPO snapshot rows for a scope, filtered to a listing-date window. */
  async latestIpoSnapshots(
    region: string,
    assetType: string,
    from: Date,
    to: Date,
    limit: number,
  ): Promise<any[]> {
    const newest = await this.db.ipoCalendarSnapshot.findFirst({
      where: { scopeRegion: region, scopeAssetType: assetType },
      orderBy: { snapshotDate: 'desc' },
      select: { snapshotDate: true },
    });
    if (!newest) return [];

    return this.db.ipoCalendarSnapshot.findMany({
      where: {
        scopeRegion: region,
        scopeAssetType: assetType,
        snapshotDate: newest.snapshotDate,
        listingDate: { gte: from, lte: to },
      },
      orderBy: { listingDate: 'desc' },
      take: limit,
    });
  }

  /**
   * Corporate actions scoped by stock region + assetType + effective-date window.
   * `actionTypes` is an optional exact-match filter; when empty, all action types are
   * returned and the service classifies them (dividend vs split/bonus) — robust to
   * source casing. assetType is scoped for consistency with the IPO/earnings reads
   * (corporate actions are equities-only today, but the scope keeps the read honest).
   */
  async listCorporateActions(
    region: string,
    assetType: string,
    actionTypes: string[],
    from: Date,
    to: Date,
    limit: number,
  ): Promise<CorporateActionRow[]> {
    return this.db.corporateAction.findMany({
      where: {
        ...(actionTypes.length ? { actionType: { in: actionTypes } } : {}),
        effectiveDate: { gte: from, lte: to },
        stock: { region, assetType },
      },
      orderBy: { effectiveDate: 'desc' },
      take: limit,
      include: { stock: { select: { symbol: true, name: true, region: true, currency: true } } },
    });
  }

  /** Upcoming earnings results from the latest earnings-intelligence snapshot for the scope. */
  async listUpcomingEarnings(
    region: string,
    assetType: string,
    from: Date,
    to: Date,
    limit: number,
  ): Promise<EarningsUpcomingRow[]> {
    const newest = await this.db.earningsIntelligenceSnapshot.findFirst({
      where: { scopeRegion: region, scopeAssetType: assetType },
      orderBy: { snapshotDate: 'desc' },
      select: { snapshotDate: true },
    });
    if (!newest) return [];

    return this.db.earningsIntelligenceSnapshot.findMany({
      where: {
        scopeRegion: region,
        scopeAssetType: assetType,
        snapshotDate: newest.snapshotDate,
        resultDate: { gte: from, lte: to },
      },
      orderBy: { resultDate: 'asc' },
      take: limit,
      select: {
        symbol: true,
        stockId: true,
        resultDate: true,
        resultDateSource: true,
        daysToResult: true,
        stock: { select: { name: true } },
      },
    });
  }

  /**
   * Forthcoming / ongoing IPOs from the newest upcoming snapshot for the region. Raw SQL because
   * upcoming_ipo_snapshots is a drift-safe raw table with no Prisma model (InstrumentCoverage
   * precedent). ONGOING first, then by soonest close/listing/open date.
   */
  async listUpcomingIpos(region: string, limit: number): Promise<any[]> {
    const newest = (await this.db.$queryRawUnsafe(
      'SELECT "snapshotDate" FROM "upcoming_ipo_snapshots" WHERE "scopeRegion" = $1 ORDER BY "snapshotDate" DESC LIMIT 1',
      region,
    )) as { snapshotDate: Date }[];
    if (!newest?.length) return [];
    return (await this.db.$queryRawUnsafe(
      `SELECT * FROM "upcoming_ipo_snapshots"
         WHERE "scopeRegion" = $1 AND "snapshotDate" = $2 AND "status" IN ('UPCOMING','ONGOING')
         ORDER BY CASE "status" WHEN 'ONGOING' THEN 0 ELSE 1 END,
                  COALESCE("closeDate", "expectedListingDate", "openDate") ASC NULLS LAST
         LIMIT $3`,
      region,
      newest[0].snapshotDate,
      limit,
    )) as any[];
  }

  /** Upsert one forthcoming-IPO row into the newest snapshot for (snapshotDate, region, source, company). */
  async upsertUpcomingIpo(
    snapshotDate: Date,
    region: string,
    assetType: string,
    rec: UpcomingIpoRecord,
  ): Promise<void> {
    await this.db.$executeRawUnsafe(
      `INSERT INTO "upcoming_ipo_snapshots"
         ("id","snapshotDate","source","scopeRegion","scopeAssetType","exchange","ipoType","symbol",
          "companyName","status","openDate","closeDate","priceBandMin","priceBandMax","issueSizeCr",
          "lotSize","expectedListingDate","sourceUrl","raw","freshness","updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19::jsonb,$20,CURRENT_TIMESTAMP)
       ON CONFLICT ("snapshotDate","scopeRegion","source","companyName") DO UPDATE SET
         "exchange"=EXCLUDED."exchange","ipoType"=EXCLUDED."ipoType","symbol"=EXCLUDED."symbol",
         "status"=EXCLUDED."status","openDate"=EXCLUDED."openDate","closeDate"=EXCLUDED."closeDate",
         "priceBandMin"=EXCLUDED."priceBandMin","priceBandMax"=EXCLUDED."priceBandMax",
         "issueSizeCr"=EXCLUDED."issueSizeCr","lotSize"=EXCLUDED."lotSize",
         "expectedListingDate"=EXCLUDED."expectedListingDate","sourceUrl"=EXCLUDED."sourceUrl",
         "raw"=EXCLUDED."raw","freshness"=EXCLUDED."freshness","updatedAt"=CURRENT_TIMESTAMP`,
      randomUUID(),
      snapshotDate,
      rec.source,
      region,
      assetType,
      rec.exchange,
      rec.ipoType,
      rec.symbol,
      rec.companyName,
      rec.status,
      rec.openDate,
      rec.closeDate,
      rec.priceBandMin,
      rec.priceBandMax,
      rec.issueSizeCr,
      rec.lotSize,
      rec.expectedListingDate,
      rec.sourceUrl,
      JSON.stringify(rec.raw ?? null),
      'FRESH',
    );
  }

  /**
   * Recent persisted closes (ascending) per symbol within [since, now], for read-time trend.
   * Persisted-read: PriceTick is local DB data, no external fetch. Bounded — caller passes a
   * small symbol set (the Closed-tab window) and a ~30-day `since`.
   */
  async recentClosesForSymbols(
    symbols: string[],
    since: Date,
  ): Promise<Map<string, { close: number; timestamp: Date }[]>> {
    const map = new Map<string, { close: number; timestamp: Date }[]>();
    if (!symbols.length) return map;
    const rows = await this.db.priceTick.findMany({
      where: { symbol: { in: symbols }, timestamp: { gte: since } },
      orderBy: { timestamp: 'asc' },
      select: { symbol: true, close: true, adjustedClose: true, timestamp: true },
    });
    for (const r of rows) {
      const arr = map.get(r.symbol) ?? [];
      // Prefer the corporate-action-adjusted close (mirrors firstCloseOnOrAfter) so a split or
      // large dividend inside the trend window doesn't flip the direction; fall back to raw close.
      arr.push({ close: Number(r.adjustedClose ?? r.close), timestamp: r.timestamp });
      map.set(r.symbol, arr);
    }
    return map;
  }

  /** FRED economic release events in a date window, scoped by stored region (FRED is US/global). */
  async listEconomicEvents(region: string, from: Date, to: Date, limit: number): Promise<any[]> {
    return this.db.economicCalendarEvent.findMany({
      where: { region, eventDate: { gte: from, lte: to } },
      orderBy: { eventDate: 'desc' },
      take: limit,
    });
  }

  // ---- IPO refresh boundary reads -----------------------------------------

  /** Active, non-delisted stocks whose ipoDate falls within the recently-listed window. */
  async listRecentlyListed(
    region: string,
    assetType: string,
    cutoff: Date,
    until: Date,
  ): Promise<RecentlyListedStock[]> {
    return this.db.stock.findMany({
      where: {
        region,
        assetType,
        isActive: true,
        isDelisted: false,
        ipoDate: { gte: cutoff, lte: until },
      },
      select: {
        id: true,
        symbol: true,
        name: true,
        region: true,
        exchange: true,
        sector: true,
        currency: true,
        ipoDate: true,
      },
    });
  }

  /**
   * Earliest traded close on/after the listing date (the first OBSERVABLE close — NOT an
   * offer price). Also returns the split/dividend-adjusted close when present: it is
   * back-adjusted to the latest-price basis, so the service prefers it for the
   * return-since-listing ratio while still surfacing the raw close for display.
   */
  async firstCloseOnOrAfter(
    symbol: string,
    listingDate: Date,
  ): Promise<{ close: number; adjustedClose: number | null; timestamp: Date } | null> {
    const tick = await this.db.priceTick.findFirst({
      where: { symbol, timestamp: { gte: listingDate } },
      orderBy: { timestamp: 'asc' },
      select: { close: true, adjustedClose: true, timestamp: true },
    });
    if (!tick) return null;
    return {
      close: Number(tick.close),
      adjustedClose: tick.adjustedClose != null ? Number(tick.adjustedClose) : null,
      timestamp: tick.timestamp,
    };
  }

  /** Latest known close per symbol (from latest_prices), keyed by symbol. */
  async latestPrices(symbols: string[]): Promise<Map<string, { price: number; timestamp: Date }>> {
    if (!symbols.length) return new Map();
    const rows = await this.db.latestPrice.findMany({
      where: { symbol: { in: symbols } },
      select: { symbol: true, price: true, timestamp: true },
    });
    const map = new Map<string, { price: number; timestamp: Date }>();
    for (const r of rows) map.set(r.symbol, { price: Number(r.price), timestamp: r.timestamp });
    return map;
  }

  async upsertIpoSnapshot(row: IpoSnapshotUpsert): Promise<void> {
    const { snapshotDate, scopeRegion, scopeAssetType, symbol, ...rest } = row;
    await this.db.ipoCalendarSnapshot.upsert({
      where: {
        snapshotDate_scopeRegion_scopeAssetType_symbol: {
          snapshotDate,
          scopeRegion,
          scopeAssetType,
          symbol,
        },
      },
      create: { snapshotDate, scopeRegion, scopeAssetType, symbol, ...rest, warnings: rest.warnings },
      update: { ...rest, warnings: rest.warnings },
    });
  }

  async upsertEconomicEvent(row: EconomicEventUpsert): Promise<void> {
    const { source, releaseId, eventDate, ...rest } = row;
    await this.db.economicCalendarEvent.upsert({
      where: {
        source_releaseId_eventDate: { source, releaseId, eventDate },
      },
      create: { source, releaseId, eventDate, ...rest, fetchedAt: new Date() },
      update: { ...rest, fetchedAt: new Date() },
    });
  }
}
