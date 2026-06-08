/**
 * F&O Catalog Enrichment — Derivatives Intelligence (Phase 5)
 *
 * Back-fills the previously-empty derivative-metadata columns on the Stock
 * catalog (`lotSize`, `expiryDate`, `contractMonth`) from the persisted F&O
 * bhavcopy futures rows. These are existing Prisma columns — this writes ROW
 * DATA only (no `schema.prisma` change).
 *
 * Single set-based SQL UPDATE (pool-friendly; no per-row round-trips), matching
 * the bhavcopy underlying to the cash-equity Stock symbol. Idempotent — safe to
 * re-run daily. Persisted-read consumers see fresh lot sizes / nearest expiry.
 */

import { Prisma } from '@prisma/client';
import prisma from '../../db/prisma';

export interface CatalogEnrichmentResult {
  status: 'success' | 'no_data' | 'error';
  tradingDate: string | null;
  rowsUpdated: number;
  message?: string;
}

/**
 * Enrich Stock derivative metadata from the latest (or given) bhavcopy date.
 * Updates lotSize, nearest non-expired expiryDate, and contractMonth for
 * F&O-eligible cash stocks whose symbol matches a futures underlying.
 */
export async function enrichDerivativeCatalogMetadata(tradingDate?: string): Promise<CatalogEnrichmentResult> {
  try {
    let targetDate = tradingDate ?? null;
    if (!targetDate) {
      const latest = await prisma.$queryRaw<Array<{ d: Date }>>(Prisma.sql`
        SELECT MAX(trading_date) AS d FROM fo_bhavcopy_contracts
      `);
      if (!latest[0]?.d) {
        return { status: 'no_data', tradingDate: null, rowsUpdated: 0, message: 'No bhavcopy rows to enrich from.' };
      }
      targetDate = latest[0].d.toISOString().slice(0, 10);
    }
    const td = new Date(`${targetDate}T00:00:00.000Z`);

    // Set-based update: derive lot size + nearest (non-expired) expiry per
    // underlying from stock futures, then match to the cash-equity Stock row.
    const updated = await prisma.$executeRaw(Prisma.sql`
      UPDATE "stocks" s
      SET "lotSize"       = d.lot_size,
          "expiryDate"    = d.nearest_expiry,
          "contractMonth" = to_char(d.nearest_expiry, 'MON-YYYY')
      FROM (
        SELECT underlying,
               MAX(lot_size) AS lot_size,
               MIN(expiry_date) FILTER (WHERE expiry_date >= ${td}) AS nearest_expiry
        FROM fo_bhavcopy_contracts
        WHERE trading_date = ${td}
          AND instrument_type = 'FUTSTK'
          AND lot_size IS NOT NULL
        GROUP BY underlying
      ) d
      WHERE upper(s."symbol") = d.underlying
        AND s."derivativesEligible" = TRUE
        AND d.nearest_expiry IS NOT NULL
    `);

    return { status: 'success', tradingDate: targetDate, rowsUpdated: Number(updated) };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { status: 'error', tradingDate: tradingDate ?? null, rowsUpdated: 0, message: msg };
  }
}
