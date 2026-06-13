// Manual-verified-fundamentals CSV parsing/validation helpers (Phase 5c). Pure functions extracted
// from RepairFundamentalsImportService so the fundamentals-import file stays under the 500-line
// source cap. Bodies are byte-identical to the pre-extraction inline implementation.

import {
  readCsv as readCsvUtil,
  splitCsvLine as splitCsvLineUtil,
} from '../util/market-data-foundation.util.csv';
import {
  normalizeExchangeTradingDate as normalizeExchangeTradingDateUtil,
  startOfUtcDay as startOfUtcDayUtil,
} from '../util/market-data-foundation.util.dates';
import {
  MANUAL_VERIFIED_FUNDAMENTALS_SOURCE,
} from './market-data-foundation.repair.types';
import type {
  ManualVerifiedFundamentalsPeriodType,
  ParsedManualVerifiedFundamentalRow,
  RejectedManualVerifiedFundamentalRow,
} from './market-data-foundation.repair.types';

export function assertManualVerifiedFundamentalsHeaders(csvText: string) {
  const firstLine = csvText.replace(/^﻿/, '').split(/\r?\n/).find((line) => line.trim().length > 0);
  if (!firstLine) throw new Error('Bulk manual verified fundamentals CSV is empty.');
  const headers = new Set(splitCsvLineUtil(firstLine).map((header) => header.trim().toUpperCase()));
  const required = [
    { label: 'symbol', aliases: ['SYMBOL'] },
    { label: 'period type', aliases: ['PERIOD_TYPE', 'PERIODTYPE', 'PERIOD TYPE'] },
    { label: 'period end date', aliases: ['PERIOD_END_DATE', 'PERIODENDDATE', 'PERIOD END DATE'] },
    { label: 'revenue', aliases: ['REVENUE'] },
    { label: 'net income', aliases: ['NET_INCOME', 'NETINCOME', 'NET INCOME'] },
    { label: 'EPS', aliases: ['EPS'] },
    { label: 'source', aliases: ['SOURCE'] },
    { label: 'validatedBy', aliases: ['VALIDATED_BY', 'VALIDATEDBY', 'VALIDATED BY'] },
    { label: 'validatedAt', aliases: ['VALIDATED_AT', 'VALIDATEDAT', 'VALIDATED AT'] },
  ];
  const missing = required
    .filter((field) => !field.aliases.some((alias) => headers.has(alias)))
    .map((field) => field.label);
  if (missing.length > 0) {
    throw new Error(`Bulk manual verified fundamentals CSV is missing required columns: ${missing.join(', ')}.`);
  }
}

export function parseManualVerifiedFundamentalsRow(
  row: Record<string, string>,
  rowNumber: number,
  fallbackSourceUrl: string | null
): { valid: true; row: ParsedManualVerifiedFundamentalRow } | { valid: false; rejection: RejectedManualVerifiedFundamentalRow } {
  const errors: string[] = [];
  const symbol = readCsvUtil(row, ['SYMBOL']).trim().toUpperCase();
  if (!symbol) errors.push('symbol is required.');

  const periodTypeRaw = readCsvUtil(row, ['PERIOD_TYPE', 'PERIODTYPE', 'PERIOD TYPE']);
  const periodType = normalizeManualVerifiedFundamentalsPeriodType(periodTypeRaw);
  if (!periodType) errors.push('period type must be ANNUAL or QUARTERLY.');

  const periodEndDateRaw = readCsvUtil(row, ['PERIOD_END_DATE', 'PERIODENDDATE', 'PERIOD END DATE']);
  let periodEndDate: Date | null = null;
  try {
    periodEndDate = periodEndDateRaw ? normalizeExchangeTradingDateUtil(periodEndDateRaw) : null;
  } catch {
    periodEndDate = null;
  }
  if (!periodEndDate) errors.push('period end date is required and must be a valid date.');

  const revenue = parseManualVerifiedFundamentalsNumber(readCsvUtil(row, ['REVENUE']), 'revenue', true, errors);
  const netIncome = parseManualVerifiedFundamentalsNumber(readCsvUtil(row, ['NET_INCOME', 'NETINCOME', 'NET INCOME']), 'net income', true, errors);
  const eps = parseManualVerifiedFundamentalsNumber(readCsvUtil(row, ['EPS']), 'EPS', true, errors);
  const peRatio = parseManualVerifiedFundamentalsNumber(readCsvUtil(row, ['PE_RATIO', 'PERATIO', 'PE RATIO']), 'PE ratio', false, errors);
  const marketCap = parseManualVerifiedFundamentalsNumber(readCsvUtil(row, ['MARKET_CAP', 'MARKETCAP', 'MARKET CAP']), 'market cap', false, errors);

  const source = readCsvUtil(row, ['SOURCE']).trim().toUpperCase();
  if (!source) {
    errors.push('source is required.');
  } else if (source !== MANUAL_VERIFIED_FUNDAMENTALS_SOURCE) {
    errors.push('source must be MANUAL_VERIFIED.');
  }

  const validatedBy = readCsvUtil(row, ['VALIDATED_BY', 'VALIDATEDBY', 'VALIDATED BY']);
  if (!validatedBy) errors.push('validatedBy is required.');
  const validatedAtRaw = readCsvUtil(row, ['VALIDATED_AT', 'VALIDATEDAT', 'VALIDATED AT']);
  const validatedAt = validatedAtRaw ? new Date(validatedAtRaw) : null;
  if (!validatedAt || Number.isNaN(validatedAt.getTime())) {
    errors.push('validatedAt is required and must be a valid date/time.');
  }

  if (errors.length > 0 || !periodType || !periodEndDate || revenue === null || netIncome === null || eps === null || !validatedAt) {
    return {
      valid: false,
      rejection: {
        rowNumber,
        symbol: symbol || null,
        reason: 'Manual verified fundamentals row failed validation.',
        errors,
      },
    };
  }

  const currency = readCsvUtil(row, ['CURRENCY']).trim().toUpperCase() || null;
  const sourceNote = readCsvUtil(row, ['SOURCE_NOTE', 'SOURCENOTE', 'SOURCE NOTE']) || null;
  const sourceUrl = readCsvUtil(row, ['SOURCE_URL', 'SOURCEURL', 'SOURCE URL']) || fallbackSourceUrl || null;

  return {
    valid: true,
    row: {
      rowNumber,
      symbol,
      periodType,
      periodEndDate,
      revenue,
      netIncome,
      eps,
      peRatio,
      marketCap,
      currency,
      sourceNote,
      sourceUrl,
      validatedBy,
      validatedAt,
    },
  };
}

export function normalizeManualVerifiedFundamentalsPeriodType(value: string): ManualVerifiedFundamentalsPeriodType | null {
  const normalized = value.trim().toUpperCase();
  if (['ANNUAL', 'YEARLY', 'YEAR', 'FY'].includes(normalized)) return 'ANNUAL';
  if (['QUARTERLY', 'QUARTER', 'QTR', 'Q'].includes(normalized)) return 'QUARTERLY';
  return null;
}

export function parseManualVerifiedFundamentalsNumber(value: string, fieldName: string, required: boolean, errors: string[]): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    if (required) errors.push(`${fieldName} is required.`);
    return null;
  }
  const nullEquivalent = ['NA', 'N/A', 'NULL', 'NONE', '-'].includes(trimmed.toUpperCase());
  if (nullEquivalent) {
    if (required) errors.push(`${fieldName} is required.`);
    return null;
  }
  const parenthesized = /^\((.*)\)$/.exec(trimmed);
  const numericText = (parenthesized ? `-${parenthesized[1]}` : trimmed)
    .replace(/[,\s]/g, '')
    .replace(/^(INR|RS\.?|₹|\$)/i, '');
  const parsed = Number(numericText);
  if (!Number.isFinite(parsed)) {
    errors.push(`${fieldName} must be numeric.`);
    return null;
  }
  return parsed;
}

export function manualVerifiedFundamentalsEvidenceDate(rows: ParsedManualVerifiedFundamentalRow[]): Date {
  const latestValidatedAt = rows
    .map((row) => row.validatedAt)
    .sort((a, b) => b.getTime() - a.getTime())[0];
  return startOfUtcDayUtil(latestValidatedAt || new Date());
}

export function manualFundamentalsStocksBySymbol(stocks: any[]): Map<string, any[]> {
  const map = new Map<string, any[]>();
  const add = (key: unknown, stock: any) => {
    const normalized = String(key || '').trim().toUpperCase();
    if (!normalized) return;
    const rows = map.get(normalized) || [];
    rows.push(stock);
    map.set(normalized, rows);
  };
  for (const stock of stocks || []) {
    add(stock.symbol, stock);
    add(stock.sourceSymbol, stock);
    add(stock.displaySymbol, stock);
  }
  return map;
}
