// India NSE corporate-actions import + adjusted-close recompute (Phase 4c extraction).
//
// IndiaCorporateActionsService owns the NSE corporate-actions file importer and the
// back-adjustment recompute (per-instrument + batch) that previously lived inline on
// MarketDataFoundationService. The service constructs this class once (passing itself as
// the IndiaCorporateActionsHost) and keeps a thin delegator for each of the three public
// methods (controller surface): importNseCorporateActionsFile,
// recomputeAdjustedClosesForInstrument, recomputeAdjustedClosesBatch.
//
// Seam note: recomputeAdjustedClosesForInstrument reaches the SHARED signal-outcome
// invalidation hook through `this.host.invalidateSignalOutcomes` — that helper (and its
// constructor wiring: signalOutcomeInvalidator / lazy SignalQualityLabRepository) STAYS
// on the service and is not moved. The service delegator stays the
// `service.recomputeAdjustedClosesForInstrument(...)` call surface that
// signal-outcome-staleness.test.ts exercises directly.
//
// Pure sibling-module functions (parseNseCorporateActions from corporate-actions-source,
// computeAdjustedCloses from corporate-adjustment) are imported directly. Behaviour is
// byte-identical to the pre-extraction inline implementation (bodies moved verbatim,
// rewriting `this.<sharedHelper>` to `this.host.<sharedHelper>` for collaborators that
// remain on the service).

import {
  parseNseCorporateActions,
  type NseCorporateActionRow,
  type ParseNseCorporateActionsOptions,
} from './market-data-foundation.corporate-actions-source';
import {
  computeAdjustedCloses,
  type AdjustmentAction,
  type AdjustmentActionType,
} from './market-data-foundation.corporate-adjustment';
import type { CorporateAction } from '../../market-data-foundation.types';
import type { IndiaCorporateActionsHost } from './market-data-foundation.india-ingestion-host';

export class IndiaCorporateActionsService {
  constructor(private readonly host: IndiaCorporateActionsHost) {}

  async importNseCorporateActionsFile(input: {
    csvOrJsonText?: string;
    rows?: NseCorporateActionRow[];
    region?: string;
    assetType?: string;
    source?: string;
    force?: boolean;
  }): Promise<{
    status: 'COMPLETED' | 'SKIPPED_DUPLICATE' | 'FAILED';
    sourceFileImportId: string | null;
    received: number;
    inserted: number;
    updated: number;
    skipped: number;
    rejected: number;
    warnings: string[];
    errors: string[];
    affectedSymbols: string[];
  }> {
    const region = input.region?.trim().toUpperCase() || 'IN';
    const assetType = input.assetType?.trim().toUpperCase() || 'STOCK';
    const parseSource = input.source?.trim() || 'NSE_CORPORATE_ACTIONS';
    const repository = this.host.repository as any;
    const now = new Date();

    // Materialise raw rows from text or from pre-parsed array.
    let rawRows: NseCorporateActionRow[] = [];
    let inputText = '';
    if (input.rows && input.rows.length > 0) {
      rawRows = input.rows;
      inputText = JSON.stringify(input.rows);
    } else if (input.csvOrJsonText) {
      inputText = input.csvOrJsonText;
      try {
        const parsed = JSON.parse(inputText);
        rawRows = Array.isArray(parsed) ? parsed : [];
      } catch {
        // Not JSON — treat as CSV-with-headers (matches delivery pattern)
        const csvRows = this.host.parseCsv(inputText);
        rawRows = csvRows.map((row: any) => ({
          symbol: this.host.readObjectString(row, ['symbol', 'SYMBOL', 'Symbol']) || '',
          series: this.host.readObjectString(row, ['series', 'SERIES', 'Series']) || '',
          subject: this.host.readObjectString(row, ['subject', 'SUBJECT', 'Subject', 'PURPOSE', 'purpose']) || '',
          exDate: this.host.readObjectString(row, ['exDate', 'EX_DATE', 'EX-DATE', 'ex_date', 'ExDate']) || '',
          ...row,
        }));
      }
    }

    const fileHash = this.host.sha256(inputText || '[]');
    const fileSize = Buffer.byteLength(inputText, 'utf8');
    const tradingDate = this.host.normalizeExchangeTradingDate(now.toISOString().slice(0, 10));
    const fileName = `nse-corporate-actions-${tradingDate.toISOString().slice(0, 10)}.json`;

    // Idempotency check (same as delivery importer).
    const existingImport = typeof repository.findSourceFileImportByKey === 'function'
      ? await repository.findSourceFileImportByKey({
        source: 'NSE',
        segment: 'CORPORATE_ACTIONS',
        tradingDate,
        fileHash,
      })
      : null;

    if (!input.force && existingImport?.status === 'COMPLETED') {
      return {
        status: 'SKIPPED_DUPLICATE',
        sourceFileImportId: existingImport.id ?? null,
        received: rawRows.length,
        inserted: 0,
        updated: 0,
        skipped: 0,
        rejected: 0,
        warnings: [],
        errors: [],
        affectedSymbols: [],
      };
    }

    // Record PENDING import.
    const pendingImport = typeof repository.upsertSourceFileImport === 'function'
      ? await repository.upsertSourceFileImport({
        source: 'NSE',
        segment: 'CORPORATE_ACTIONS',
        tradingDate,
        fileName,
        fileUrl: null,
        fileHash,
        fileSize,
        status: 'PENDING',
        rowsRaw: rawRows.length,
        rowsAccepted: 0,
        rowsRejected: 0,
        parserVersion: 'nse-corporate-actions-v1',
        errorMessage: null,
      }).catch(() => null)
      : null;

    try {
      // ── Parse ──────────────────────────────────────────────────────────────
      const parseOptions: ParseNseCorporateActionsOptions = { source: parseSource };
      const { parsed, skipped: parseSkipped, warnings: parseWarnings } = parseNseCorporateActions(rawRows, parseOptions);

      // ── Resolve symbol → stockId (scoped) ─────────────────────────────────
      const symbols = [...new Set(parsed.map((a) => a.symbol))];
      const stocks = symbols.length > 0 && typeof repository.findStocksBySymbolsInScope === 'function'
        ? await repository.findStocksBySymbolsInScope(symbols, { region, assetType })
        : [];
      const stockBySymbol = new Map<string, any>();
      for (const stock of stocks) {
        if (stock?.isActive === false || stock?.isDelisted === true) continue;
        for (const sym of [stock.symbol, stock.sourceSymbol, stock.displaySymbol].filter(Boolean)) {
          stockBySymbol.set(this.host.baseSymbolFromProviderSymbol(String(sym)), stock);
        }
      }

      // ── Group by stock and upsert ──────────────────────────────────────────
      const byStockId = new Map<string, Array<{ action: typeof parsed[number]; stock: any }>>();
      const unmatchedWarnings: string[] = [];
      let unmatchedCount = 0;

      for (const action of parsed) {
        const stock = stockBySymbol.get(action.symbol) || stockBySymbol.get(this.host.baseSymbolFromProviderSymbol(action.symbol));
        if (!stock?.id) {
          unmatchedCount += 1;
          unmatchedWarnings.push(`Symbol "${action.symbol}" not found in catalog (region=${region}, assetType=${assetType}); skipped.`);
          continue;
        }
        const group = byStockId.get(stock.id) ?? [];
        group.push({ action, stock });
        byStockId.set(stock.id, group);
      }

      // Per-stock upsert — per-row isolation, never throw on one bad stock.
      let insertedCount = 0;
      let rejectedCount = 0;
      const upsertWarnings: string[] = [];
      const affectedSymbolSet = new Set<string>();

      for (const [stockId, items] of byStockId.entries()) {
        try {
          const caInputs: CorporateAction[] = items.map(({ action }) => ({
            symbol: action.symbol,
            type: action.actionType as CorporateAction['type'],
            date: action.effectiveDate.toISOString().slice(0, 10),
            value: action.amount ?? action.splitRatio ?? 0,
            amount: action.amount ?? null,
            splitRatio: action.splitRatio ?? null,
            currency: action.actionType === 'dividend' ? 'INR' : null,
            source: parseSource,
          }));
          const ops = await repository.upsertCorporateActions(stockId, caInputs);
          insertedCount += Array.isArray(ops) ? ops.length : 0;
          items.forEach(({ stock }) => affectedSymbolSet.add(stock.symbol));
        } catch (err) {
          rejectedCount += items.length;
          upsertWarnings.push(
            `Upsert failed for stockId "${stockId}": ${err instanceof Error ? err.message : String(err)}`
          );
        }
      }

      const rowsRejected = parseSkipped + unmatchedCount + rejectedCount;
      const allWarnings = [...parseWarnings, ...unmatchedWarnings, ...upsertWarnings];

      // Record COMPLETED import.
      const completedImport = typeof repository.upsertSourceFileImport === 'function'
        ? await repository.upsertSourceFileImport({
          source: 'NSE',
          segment: 'CORPORATE_ACTIONS',
          tradingDate,
          fileName,
          fileUrl: null,
          fileHash,
          fileSize,
          status: 'COMPLETED',
          rowsRaw: rawRows.length,
          rowsAccepted: insertedCount,
          rowsRejected: rowsRejected,
          parserVersion: 'nse-corporate-actions-v1',
          errorMessage: null,
        }).catch(() => null)
        : null;

      // ── Trigger recompute for affected stocks (best-effort) ────────────────
      // (The daily NSE CM price import — importNseCmUdiffDaily — also recomputes
      //  adjustedClose for changed stocks that have corporate actions.)
      const affectedSymbols = [...affectedSymbolSet].sort();
      if (affectedSymbols.length > 0) {
        const affectedStocks = stocks.filter((s: any) => affectedSymbolSet.has(s.symbol));
        for (const stock of affectedStocks) {
          try {
            await this.recomputeAdjustedClosesForInstrument(stock.id);
          } catch (err) {
            // Best-effort: log but do not surface as fatal.
            allWarnings.push(
              `Adjusted-close recompute failed for "${stock.symbol}": ${err instanceof Error ? err.message : String(err)}`
            );
          }
        }
      }

      return {
        status: 'COMPLETED',
        sourceFileImportId: completedImport?.id ?? pendingImport?.id ?? null,
        received: rawRows.length,
        inserted: insertedCount,
        updated: 0,
        skipped: parseSkipped + unmatchedCount,
        rejected: rejectedCount,
        warnings: allWarnings,
        errors: [],
        affectedSymbols,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'NSE corporate-actions import failed';
      if (typeof repository.upsertSourceFileImport === 'function') {
        await repository.upsertSourceFileImport({
          source: 'NSE',
          segment: 'CORPORATE_ACTIONS',
          tradingDate,
          fileName,
          fileUrl: null,
          fileHash,
          fileSize,
          status: 'FAILED',
          rowsRaw: rawRows.length,
          rowsAccepted: 0,
          rowsRejected: rawRows.length,
          parserVersion: 'nse-corporate-actions-v1',
          errorMessage: message,
        }).catch(() => undefined);
      }
      return {
        status: 'FAILED',
        sourceFileImportId: pendingImport?.id ?? null,
        received: rawRows.length,
        inserted: 0,
        updated: 0,
        skipped: 0,
        rejected: rawRows.length,
        warnings: [],
        errors: [message],
        affectedSymbols: [],
      };
    }
  }

  // ---------------------------------------------------------------------------
  // Back-adjustment recompute
  // ---------------------------------------------------------------------------

  /**
   * Recompute adjustedClose for every price bar of one instrument.
   *
   * Loads persisted CorporateActions, runs the back-adjustment engine, and
   * writes adjustedClose back to PriceTick rows (only rows that changed).
   */
  async recomputeAdjustedClosesForInstrument(instrumentId: string): Promise<{
    instrumentId: string;
    symbol: string | null;
    bars: number;
    updated: number;
    warnings: string[];
  }> {
    const stock = await this.host.repository.findStockById(instrumentId);
    if (!stock) {
      throw new Error(`Instrument not found: ${instrumentId}`);
    }
    const symbol = stock.symbol;
    const repository = this.host.repository as any;

    // Load raw price bars and corporate actions.
    const [rawBars, corporateActions] = await Promise.all([
      this.host.repository.listRawPriceBarsForStock(symbol),
      typeof repository.listCorporateActions === 'function'
        ? repository.listCorporateActions(instrumentId)
        : Promise.resolve([]),
    ]);

    if (rawBars.length === 0) {
      return { instrumentId, symbol, bars: 0, updated: 0, warnings: [] };
    }

    // Map persisted CorporateAction rows → AdjustmentAction shape.
    const adjustmentActions: AdjustmentAction[] = [];
    for (const ca of corporateActions) {
      const type = (ca.actionType || ca.type || '') as string;
      const effectiveDate = ca.effectiveDate ? new Date(ca.effectiveDate) : ca.date ? new Date(ca.date) : null;
      if (!effectiveDate || Number.isNaN(effectiveDate.getTime())) continue;

      const validTypes: AdjustmentActionType[] = ['split', 'bonus', 'reverse_split', 'dividend'];
      if (!validTypes.includes(type as AdjustmentActionType)) continue;

      const action: AdjustmentAction = {
        type: type as AdjustmentActionType,
        exDate: effectiveDate,
      };
      if (type === 'dividend') {
        const amt = ca.amount != null ? Number(ca.amount) : null;
        if (amt !== null && amt > 0) action.amount = amt;
      } else {
        const ratio = ca.splitRatio != null ? Number(ca.splitRatio) : null;
        if (ratio !== null && ratio > 0) action.ratio = ratio;
      }
      adjustmentActions.push(action);
    }

    // Run the back-adjustment engine.
    const { bars: adjustedBars, warnings } = computeAdjustedCloses(rawBars, adjustmentActions);

    // Write only changed values.
    const updates = adjustedBars.map((bar) => ({ date: bar.date, adjustedClose: bar.adjustedClose }));
    const updated = await this.host.repository.updateAdjustedCloses(symbol, updates);

    // adjustedClose drives forwardReturnPercent/futurePrice in persisted
    // signal_outcomes — invalidate them so the maturity sweep / next recalculate
    // re-evaluates with fresh prices. Best-effort; only when prices changed.
    //
    // Pass the earliest date in the re-adjusted range so only outcomes whose
    // forward-return window [signalDate, signalDate+60d] overlaps that range
    // are marked stale (window-intersection, avoids over-invalidation).
    if (updated > 0) {
      const allDates = updates.map((u) => u.date.getTime()).filter(Number.isFinite);
      const earliestAdjustedDate = allDates.length > 0 ? new Date(Math.min(...allDates)) : undefined;
      await this.host.invalidateSignalOutcomes([instrumentId], earliestAdjustedDate);
    }

    return { instrumentId, symbol, bars: adjustedBars.length, updated, warnings };
  }

  /**
   * Batch recompute adjustedClose for all instruments in scope.
   * Bounded by batchSize (1–100, default 50) and offset for pagination.
   */
  async recomputeAdjustedClosesBatch(input: {
    region?: string;
    assetType?: string;
    batchSize?: number;
    offset?: number;
  }): Promise<{
    processed: number;
    total: number;
    nextOffset: number;
    hasMore: boolean;
    updated: number;
    warnings: string[];
    errors: string[];
  }> {
    const region = input.region?.trim().toUpperCase() || undefined;
    const assetType = input.assetType?.trim().toUpperCase() || undefined;
    const batchSize = Math.max(1, Math.min(Math.floor(input.batchSize ?? 50), 100));
    const offset = Math.max(0, Math.floor(input.offset ?? 0));

    const { stocks, total } = await this.host.repository.listStocksForAdjustedCloseRecompute({
      region,
      assetType,
      batchSize,
      offset,
    });

    let updated = 0;
    const warnings: string[] = [];
    const errors: string[] = [];

    for (const stock of stocks) {
      try {
        const result = await this.recomputeAdjustedClosesForInstrument(stock.id);
        updated += result.updated;
        if (result.warnings.length > 0) warnings.push(...result.warnings.map((w) => `[${stock.symbol}] ${w}`));
      } catch (err) {
        errors.push(`[${stock.symbol}] ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    const nextOffset = offset + stocks.length;
    return {
      processed: stocks.length,
      total,
      nextOffset,
      hasMore: nextOffset < total,
      updated,
      warnings,
      errors,
    };
  }
}
