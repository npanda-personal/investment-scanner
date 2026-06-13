// Catalog CRUD + import ingestion cluster (ingestion-extraction phase).
//
// Owns instrument create/update/delete/toggle, catalog import + metadata backfill, and the catalog
// download/validate/row-mapping helpers. Bodies are byte-identical to the pre-extraction inline
// implementation in market-data-foundation.service.ts (this.X -> this.host.X for the
// stays-on-service collaborators; pure util/mapper/parser free functions imported directly). The
// service keeps thin byte-identical delegators that forward into this cluster, and PUBLIC delegators
// for the catalog helpers the repair host reaches (catalogRowsForSource / validateCsvColumns /
// downloadConfiguredCatalogCsv / cleanupCatalogTempFile).

import fs from 'fs/promises';
import path from 'path';
import type { MarketDataIngestionHost } from './market-data-foundation.ingestion-host';
import type {
  CreateStockRequest,
  CatalogSource,
  CatalogBackfillRequest,
  CatalogBackfillSummary,
  CatalogImportRequest,
  CatalogImportSummary,
  UpdateStockRequest,
  V1CreateInstrumentRequest,
} from '../market-data-foundation.types';
import type { MarketDataFoundationService } from '../market-data-foundation.service';
import { enqueueIngestionJob } from './market-data-foundation.queue';
import { getCatalogDownloadConfig, getCatalogSourceConfig } from './market-data-foundation.catalog-sources';
import { validateInstrumentInput } from './market-data-foundation.validation';
import {
  mapNseSecurityRow,
  mapNseUnderlyingRow,
  indianIndexSeedRows,
  parseNseIndicesJson,
  parseBseIndicesHtml,
} from './india/market-data-foundation.india-catalog-rows';
import { parseCsv, splitCsvLine } from '../util/market-data-foundation.util.csv';
import { validateConfiguredCatalogUrl as validateConfiguredCatalogUrlUtil, readPositiveNumber } from '../util/market-data-foundation.util.download';
import { eachWithConcurrency } from '../util/market-data-foundation.util.concurrency';
import {
  normalizeAssetType,
  inferRegionFromInstrument,
  normalizeCatalogSource as normalizeCatalogSourceUtil,
  normalizeInstrumentAssetType,
  deriveInstrumentSegment,
  isKnownNseDerivativesEligibleStock,
} from '../util/market-data-foundation.util.instrument-metadata';
import { normalizeCatalogSymbol } from '../analytics/market-data-foundation.instrument-mapper';

export class CatalogIngestionService {
  constructor(private readonly host: MarketDataIngestionHost) {}

  async create(data: CreateStockRequest, triggerIngestion = false) {
    const existing = await this.host.repository.findStockBySymbol(data.symbol);
    if (existing) {
      throw new Error(`Stock with symbol ${data.symbol} already exists`);
    }

    const stock = await this.host.repository.createStock(data);

    if (triggerIngestion) {
      enqueueIngestionJob(stock.symbol).catch((err) =>
        console.error(`Failed to enqueue ingestion job for ${stock.symbol}:`, err)
      );
    }

    return stock;
  }

  async importCatalog(request: CatalogImportRequest): Promise<CatalogImportSummary> {
    const started = Date.now();
    const catalogSource = this.normalizeCatalogSource(request.catalogSource);
    const sourceConfig = getCatalogSourceConfig(catalogSource);
    const importMode = request.importMode || (sourceConfig?.supportsInternalSeed ? 'INTERNAL_SEED' : request.csvText ? 'MANUAL_CSV' : 'MANUAL_CSV');
    const batchSize = Math.min(Math.max(Number(request.batchSize) || 100, 1), 250);
    const offset = Math.max(Number(request.offset) || 0, 0);
    const warnings: string[] = [];
    let csvText = request.csvText || '';
    let downloadInfo: Awaited<ReturnType<MarketDataFoundationService['downloadConfiguredCatalogCsv']>> | null = null;
    try {
      if (importMode === 'CONFIGURED_URL') {
        downloadInfo = await this.downloadConfiguredCatalogCsv(catalogSource);
        csvText = downloadInfo.csvText;
      } else if (importMode === 'INTERNAL_SEED') {
        if (!sourceConfig?.supportsInternalSeed) {
          throw new Error(`Catalog source ${catalogSource} does not support internal seed import.`);
        }
        csvText = '';
      }
      this.validateCsvColumns(catalogSource, csvText);
      let rows = this.catalogRowsForSource(catalogSource, csvText, warnings);
      const sourceRows = rows.length;
      rows = rows.slice(offset, offset + batchSize);
      if (request.validateProvider) {
        warnings.push('Provider validation is disabled for NSE/BSE-only market data; catalog rows were imported without provider fallback checks.');
      }

      const summary: CatalogImportSummary = {
        catalogSource,
        importMode,
        downloaded: importMode === 'CONFIGURED_URL',
        downloadUrlName: downloadInfo?.sourceName,
        fileSizeBytes: downloadInfo?.fileSizeBytes,
        tempFileDeleted: downloadInfo?.tempFileDeleted,
        tempFileDeleteError: downloadInfo?.tempFileDeleteError,
        sourceRows,
        processedCount: rows.length,
        totalCount: sourceRows,
        batchSize,
        offset,
        nextOffset: offset + batchSize < sourceRows ? offset + batchSize : null,
        hasMore: offset + batchSize < sourceRows,
        inserted: 0,
        updated: 0,
        noOp: 0,
        skipped: 0,
        invalid: 0,
        providerValidated: 0,
        providerUnsupported: 0,
        underlyingsRead: catalogSource === 'NSE_EQUITY_DERIVATIVES_UNDERLYINGS' ? sourceRows : undefined,
        stockUnderlyingsMatched: catalogSource === 'NSE_EQUITY_DERIVATIVES_UNDERLYINGS' ? 0 : undefined,
        indexUnderlyingsMatched: catalogSource === 'NSE_EQUITY_DERIVATIVES_UNDERLYINGS' ? 0 : undefined,
        newInstrumentsCreated: catalogSource === 'NSE_EQUITY_DERIVATIVES_UNDERLYINGS' ? 0 : undefined,
        unmatchedUnderlyings: catalogSource === 'NSE_EQUITY_DERIVATIVES_UNDERLYINGS' ? 0 : undefined,
        warnings,
        durationMs: 0,
      };

      for (const row of rows) {
        if (!row.symbol || !row.name) {
          summary.invalid += 1;
          continue;
        }

        const result = await this.host.repository.upsertCatalogInstrument(row);
        if (result.action === 'inserted') summary.inserted += 1;
        if (result.action === 'updated') summary.updated += 1;
        if (result.action === 'noOp') summary.noOp += 1;

        if (catalogSource === 'NSE_EQUITY_DERIVATIVES_UNDERLYINGS') {
          if (row.assetType === 'INDEX') summary.indexUnderlyingsMatched! += result.action === 'inserted' ? 0 : 1;
          if (row.assetType === 'STOCK') summary.stockUnderlyingsMatched! += result.action === 'inserted' ? 0 : 1;
          if (result.action === 'inserted') summary.newInstrumentsCreated! += 1;
        }

      }

      if (downloadInfo) {
        await this.cleanupCatalogTempFile(downloadInfo);
        summary.tempFileDeleted = downloadInfo.tempFileDeleted;
        summary.tempFileDeleteError = downloadInfo.tempFileDeleteError;
      }
      summary.insertedCount = summary.inserted;
      summary.updatedCount = summary.updated;
      summary.noOpCount = summary.noOp;
      summary.invalidCount = summary.invalid;
      summary.providerValidatedCount = summary.providerValidated;
      summary.providerUnsupportedCount = summary.providerUnsupported;
      summary.durationMs = Date.now() - started;
      console.log('[MarketDataFoundation] catalog import summary', {
        catalogSource,
        importMode,
        fileSizeBytes: summary.fileSizeBytes,
        sourceRows: summary.sourceRows,
        processedCount: summary.processedCount,
        inserted: summary.inserted,
        updated: summary.updated,
        noOp: summary.noOp,
        invalid: summary.invalid,
        providerValidated: summary.providerValidated,
        providerUnsupported: summary.providerUnsupported,
        tempFileDeleted: summary.tempFileDeleted,
      });
      return summary;
    } catch (error) {
      if (downloadInfo && downloadInfo.tempFileDeleted === false) {
        await this.cleanupCatalogTempFile(downloadInfo).catch(() => undefined);
      }
      throw error;
    }
  }

  async backfillCatalogMetadata(request: CatalogBackfillRequest = {}): Promise<CatalogBackfillSummary> {
    const started = Date.now();
    const batchSize = Math.min(Math.max(Number(request.batchSize ?? request.limit) || 100, 1), 250);
    const offset = Math.max(Number(request.offset) || 0, 0);
    const catalogSource = request.catalogSource ? this.normalizeCatalogSource(String(request.catalogSource)) : undefined;
    const workerConcurrency = this.catalogBackfillConcurrency(request);
    const { stocks, total } = await this.host.repository.listStocksForCatalogBackfill({
      region: request.region || 'IN',
      assetType: request.assetType,
      catalogSource,
      offset,
      batchSize,
    });
    const summary: CatalogBackfillSummary = {
      catalogSource,
      processedCount: 0,
      totalCount: total,
      batchSize,
      workerConcurrency,
      offset,
      nextOffset: null,
      hasMore: false,
      updated: 0,
      noOp: 0,
      skipped: 0,
      validated: 0,
      providerUnsupported: 0,
      warnings: [],
      durationMs: 0,
    };
    if (request.validateProvider) {
      summary.warnings.push('Provider validation is disabled for NSE/BSE-only market data; catalog rows were imported without provider fallback checks.');
    }

    const itemResults: Array<Pick<CatalogBackfillSummary, 'processedCount' | 'updated' | 'noOp' | 'skipped' | 'validated' | 'providerUnsupported'> & { warnings: string[] }> = [];
    await eachWithConcurrency(stocks, workerConcurrency, async (stock: any) => {
      const item = {
        processedCount: 0,
        updated: 0,
        noOp: 0,
        skipped: 0,
        validated: 0,
        providerUnsupported: 0,
        warnings: [] as string[],
      };
      const normalized = this.catalogBackfillRow(stock);
      if (!normalized) {
        item.skipped += 1;
        itemResults.push(item);
        return;
      }
      const result = await this.host.repository.upsertCatalogInstrument(normalized);
      item.processedCount += 1;
      if (result.action === 'updated') item.updated += 1;
      if (result.action === 'noOp') item.noOp += 1;

      itemResults.push(item);
    });

    for (const item of itemResults) {
      summary.processedCount += item.processedCount;
      summary.updated += item.updated;
      summary.noOp += item.noOp;
      summary.skipped += item.skipped;
      summary.validated += item.validated;
      summary.providerUnsupported += item.providerUnsupported;
      summary.warnings.push(...item.warnings);
    }

    const nextOffset = offset + batchSize;
    summary.hasMore = nextOffset < total;
    summary.nextOffset = summary.hasMore ? nextOffset : null;
    summary.durationMs = Date.now() - started;
    return summary;
  }

  async createInstrument(data: V1CreateInstrumentRequest) {
    const errors = validateInstrumentInput(data);
    if (errors.length > 0) {
      throw new Error(errors.join('; '));
    }

    const existing = await this.host.repository.findStockBySymbolAndExchange(data.symbol, data.exchange);
    if (existing) {
      throw new Error(`Instrument with symbol ${data.symbol} and exchange ${data.exchange} already exists`);
    }

    const stock = await this.create({
      symbol: data.symbol.trim().toUpperCase(),
        name: data.company_name.trim(),
        region: inferRegionFromInstrument(data),
        exchange: data.exchange.trim().toUpperCase(),
        country: data.country,
        sector: data.sector,
        industry: data.industry,
        currency: data.currency.trim().toUpperCase(),
        marketCap: data.market_cap,
        assetType: normalizeAssetType(data.asset_type),
        ipoDate: data.ipo_date ? new Date(data.ipo_date) : null,
        isin: data.isin,
      }, false);

    return this.host.toV1Instrument(stock, data);
  }

  update(id: string, data: UpdateStockRequest) {
    return this.host.repository.updateStock(id, data);
  }

  delete(id: string) {
    return this.host.repository.deleteStock(id);
  }

  toggleActive(id: string) {
    return this.host.repository.toggleStockActive(id);
  }

  async downloadConfiguredCatalogCsv(catalogSource: string) {
    const source = getCatalogSourceConfig(catalogSource);
    if (!source) {
      throw new Error(`Unknown catalog source: ${catalogSource}`);
    }
    if (!source.enabled) {
      throw new Error(`Catalog source ${catalogSource} is disabled.`);
    }
    if (!source.url) {
      throw new Error(`No configured URL for catalog source ${catalogSource}. ${source.setupHint || 'Use Manual CSV or configure an environment URL.'}`);
    }
    this.validateConfiguredCatalogUrl(source.url);
    const downloadConfig = getCatalogDownloadConfig();
    await fs.mkdir(downloadConfig.tempDir, { recursive: true });
    const extension = source.fileType === 'JSON' ? 'json' : source.fileType === 'HTML' ? 'html' : 'csv';
    const tempFilePath = path.join(downloadConfig.tempDir, `${catalogSource.toLowerCase().replace(/[^a-z0-9_-]/g, '-')}-${Date.now()}.${extension}`);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), source.timeoutMs);
    let fileSizeBytes = 0;

    try {
      const response = await fetch(source.url, {
        signal: controller.signal,
        headers: {
          accept: 'text/csv, application/json, text/html, */*',
          'accept-language': 'en-US,en;q=0.9',
          'user-agent': 'investment-scanner-market-data-foundation/1.0',
        },
      });
      if (!response.ok) {
        throw new Error(`Download failed for ${catalogSource}: HTTP ${response.status}`);
      }
      const contentLength = response.headers.get('content-length');
      if (contentLength && Number(contentLength) > source.maxDownloadBytes) {
        throw new Error(`Downloaded catalog file exceeds max size for ${catalogSource}.`);
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      fileSizeBytes = buffer.length;
      if (fileSizeBytes > source.maxDownloadBytes) {
        throw new Error(`Downloaded catalog file exceeds max size for ${catalogSource}.`);
      }
      await fs.writeFile(tempFilePath, buffer);
      const csvText = buffer.toString('utf8');
      return {
        sourceName: source.displayName,
        tempFilePath,
        keepTempFiles: downloadConfig.keepTempFiles,
        csvText,
        fileSizeBytes,
        tempFileDeleted: false,
        tempFileDeleteError: undefined as string | undefined,
      };
    } catch (error) {
      await fs.unlink(tempFilePath).catch(() => undefined);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Download timed out for catalog source ${catalogSource}.`);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  async cleanupCatalogTempFile(downloadInfo: { tempFilePath: string; keepTempFiles: boolean; tempFileDeleted: boolean; tempFileDeleteError?: string }) {
    if (downloadInfo.keepTempFiles) {
      downloadInfo.tempFileDeleted = false;
      return;
    }
    try {
      await fs.unlink(downloadInfo.tempFilePath);
      downloadInfo.tempFileDeleted = true;
      downloadInfo.tempFileDeleteError = undefined;
    } catch (error) {
      downloadInfo.tempFileDeleted = false;
      downloadInfo.tempFileDeleteError = error instanceof Error ? error.message : 'Temp file cleanup failed';
      console.error('[MarketDataFoundation] catalog temp cleanup failed', {
        tempFilePath: downloadInfo.tempFilePath,
        error: downloadInfo.tempFileDeleteError,
      });
    }
  }

  validateConfiguredCatalogUrl(value: string) {
    return validateConfiguredCatalogUrlUtil(value);
  }

  validateCsvColumns(source: string, csvText: string) {
    if (source === 'NSE_INDEX_SEED') return;
    const config = getCatalogSourceConfig(source);
    if (config?.fileType && config.fileType !== 'CSV') return;
    const firstLine = csvText.replace(/^﻿/, '').split(/\r?\n/).find((line) => line.trim().length > 0);
    if (!firstLine) {
      throw new Error(`CSV format did not match expected ${source} columns: file is empty.`);
    }
    const headers = new Set(splitCsvLine(firstLine).map((header) => header.trim().toUpperCase()));
    const expectedColumnGroups = config?.expectedColumnGroups;
    if (!expectedColumnGroups?.length) return;
    const missingGroups = expectedColumnGroups.filter((group) => !group.some((column) => headers.has(column)));
    if (missingGroups.length > 0) {
      throw new Error(`CSV format did not match expected ${source} columns. Missing one of: ${missingGroups.map((group) => group.join(' / ')).join('; ')}.`);
    }
  }

  catalogRowsForSource(source: string, csvText: string, warnings: string[]): CreateStockRequest[] {
    if (source === 'NSE_INDEX_SEED') return indianIndexSeedRows();
    if (source === 'NSE_INDEX_SECURITIES') return parseNseIndicesJson(csvText, warnings);
    if (source === 'BSE_INDEX_SECURITIES') return parseBseIndicesHtml(csvText, warnings);
    const rows = parseCsv(csvText);
    if (rows.length === 0) {
      warnings.push(`${source}: no CSV rows supplied.`);
      return [];
    }
    if (source === 'NSE_EQUITY_DERIVATIVES_UNDERLYINGS') return rows.map((row) => mapNseUnderlyingRow(row)).filter(Boolean) as CreateStockRequest[];
    return rows.map((row) => mapNseSecurityRow(row, source)).filter(Boolean) as CreateStockRequest[];
  }

  private catalogBackfillRow(stock: any): CreateStockRequest | null {
    const symbol = String(stock.symbol || '').trim().toUpperCase();
    if (!symbol) return null;
    const inferredExchange = stock.exchange?.trim().toUpperCase()
      || (symbol.endsWith('.NS') ? 'NSE' : symbol.endsWith('.BO') ? 'BSE' : null);
    const inferredRegion = stock.region || (inferredExchange === 'NSE' || inferredExchange === 'BSE' ? 'IN' : null);
    if (inferredRegion !== 'IN' && inferredExchange !== 'NSE' && inferredExchange !== 'BSE') return null;

    const normalized = normalizeCatalogSymbol({
      symbol,
      sourceSymbol: stock.sourceSymbol,
      providerSymbol: stock.providerSymbol,
      displaySymbol: stock.displaySymbol,
      exchange: inferredExchange,
    }, inferredExchange === 'BSE' ? 'BSE_EQUITY_SECURITIES' : 'NSE_EQUITY_SECURITIES');
    const assetType = normalizeInstrumentAssetType(stock.assetType || 'STOCK', symbol, stock.name);
    const segment = stock.instrumentSegment || deriveInstrumentSegment(assetType, symbol);
    const isEquityCash = segment === 'CASH' || assetType === 'STOCK';

    return {
      symbol: normalized.sourceSymbol,
      name: stock.name || normalized.displaySymbol,
      region: 'IN',
      exchange: inferredExchange || (symbol.endsWith('.BO') ? 'BSE' : 'NSE'),
      country: 'India',
      currency: 'INR',
      assetType: isEquityCash ? 'STOCK' : assetType,
      instrumentSegment: isEquityCash ? 'CASH' : segment,
      displaySymbol: normalized.displaySymbol,
      providerSymbol: normalized.providerSymbol,
      sourceSymbol: normalized.sourceSymbol,
      catalogSource: stock.catalogSource || this.legacyCatalogSourceForStock(stock),
      providerSupportStatus: stock.providerSupportStatus || 'UNKNOWN',
      derivativesEligible: Boolean(stock.derivativesEligible) || isKnownNseDerivativesEligibleStock(normalized.sourceSymbol),
      source: stock.source || 'database',
      dataStatus: stock.dataStatus || 'PARTIAL',
      isActive: stock.isActive ?? true,
    };
  }

  private legacyCatalogSourceForStock(stock: any): CatalogSource {
    const source = String(stock.source || '').toUpperCase();
    if (source.includes('NIFTY')) return 'LEGACY_NIFTY500';
    if (source === 'DATABASE' || !source) return 'LEGACY_DATABASE';
    return 'MANUAL';
  }

  private catalogBackfillConcurrency(request: Pick<CatalogBackfillRequest, 'workerConcurrency' | 'validateProvider'>) {
    const fallback = request.validateProvider
      ? readPositiveNumber(process.env.MARKET_DATA_CATALOG_BACKFILL_PROVIDER_CONCURRENCY, 4)
      : readPositiveNumber(process.env.MARKET_DATA_CATALOG_BACKFILL_CONCURRENCY, 16);
    const max = request.validateProvider ? 8 : 24;
    return Math.max(1, Math.min(Number(request.workerConcurrency) || fallback, max));
  }

  private normalizeCatalogSource(value: string): CatalogSource {
    return normalizeCatalogSourceUtil(value);
  }
}
