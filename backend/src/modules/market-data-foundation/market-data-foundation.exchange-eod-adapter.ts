import { createHash } from 'crypto';
import type { HistoricalPrice } from './market-data-foundation.types';
import { partitionHistoricalPrices } from './market-data-foundation.validation';
import {
  nseUdiffCmBhavcopyArchiveUrl,
  nseSecurityBhavdataArchiveUrl,
  nseLegacyCmBhavcopyArchiveUrl,
} from './market-data-foundation.endpoints';

export type IndianExchangeCode = 'NSE' | 'BSE';

export type IndianExchangeEodSource =
  | 'NSE_SECURITY_BHAVDATA'
  | 'NSE_UDIFF_CM_BHAVCOPY'
  | 'NSE_LEGACY_CM_BHAVCOPY'
  | 'BSE_UDIFF_CM_BHAVCOPY';

export interface IndianExchangeEodCsvRow {
  [key: string]: string | number | null | undefined;
}

export interface IndianExchangeEodParseOptions {
  source?: IndianExchangeEodSource;
  sourceName?: string;
  sourceUrl?: string | null;
  exchange?: IndianExchangeCode;
  symbolSuffix?: '.NS' | '.BO' | '';
  tradingDate?: Date | string;
  includeSeries?: string[];
}

export interface IndianExchangeEodSourceIdentity {
  sourceName: string;
  exchange: IndianExchangeCode;
  sourceUrl: string | null;
  rowCount: number;
  contentSha256: string;
  rowsSha256: string;
}

export interface IndianExchangeEodParseResult {
  sourceName: string;
  sourceFingerprint: string;
  sourceIdentity: IndianExchangeEodSourceIdentity;
  rowsRead: number;
  rowsParsed: number;
  rowsSkipped: number;
  warnings: string[];
  prices: HistoricalPrice[];
}

export interface IndianExchangeEodFingerprintResult {
  sourceFingerprint: string;
  sourceIdentity: IndianExchangeEodSourceIdentity;
}

export interface NseArchiveUrl {
  pattern:
    | 'NSE_UDIFF_CM_BHAVCOPY_ZIP'
    | 'NSE_SECURITY_BHAVDATA_CSV'
    | 'NSE_LEGACY_CM_BHAVCOPY_ZIP';
  sourceName: IndianExchangeEodSource;
  fileName: string;
  url: string;
  activeFrom?: string;
  discontinuedFrom?: string;
}

type NormalizedCsvRow = Record<string, string>;

const NSE_UDIFF_ACTIVE_FROM = '2024-07-08';

const SYMBOL_ALIASES = [
  'SYMBOL',
  'TckrSymb',
  'TICKER_SYMBOL',
  'TICKER SYMBOL',
  'TRADING SYMBOL',
  'TRADINGSYMBOL',
  'SCRIP_CD',
  'SC_CODE',
  'SECURITY CODE',
];

const SERIES_ALIASES = ['SERIES', 'SctySrs', 'SECURITY SERIES', 'SECURITY_SERIES'];
const SEGMENT_ALIASES = ['Sgmt', 'SEGMENT', 'SEGMENT INDICATOR', 'SEGMENT_INDICATOR'];
const SOURCE_EXCHANGE_ALIASES = ['Src', 'SOURCE', 'EXCHANGE', 'TRADED EXCHANGE', 'TRADED_EXCHANGE'];
const INSTRUMENT_TYPE_ALIASES = ['FinInstrmTp', 'INSTRUMENT TYPE', 'INSTRUMENT_TYPE', 'INSTRUMENT', 'SECURITY TYPE'];
const DATE_ALIASES = ['TradDt', 'BizDt', 'DATE1', 'TIMESTAMP', 'DATE', 'TRADE DATE', 'TRADE_DATE', 'TRADING DATE'];
const OPEN_ALIASES = ['OpnPric', 'OPEN_PRICE', 'OPEN PRICE', 'OPEN'];
const HIGH_ALIASES = ['HghPric', 'HIGH_PRICE', 'HIGH PRICE', 'HIGH'];
const LOW_ALIASES = ['LwPric', 'LOW_PRICE', 'LOW PRICE', 'LOW'];
const CLOSE_ALIASES = ['ClsPric', 'CLOSE_PRICE', 'CLOSE PRICE', 'CLOSE'];
const VOLUME_ALIASES = ['TtlTradgVol', 'TTL_TRD_QNTY', 'TOTTRDQTY', 'TOTAL TRADED QUANTITY', 'NO_OF_SHRS', 'NO OF SHARES', 'VOLUME'];

const DISALLOWED_INSTRUMENT_PREFIXES = ['FUT', 'OPT', 'IDX', 'INDEX', 'ETF', 'MF', 'DEBT', 'BOND'];
const NON_STOCK_SERIES = new Set(['GB', 'GS', 'MF']);
const MONTH_CODES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export const parseIndianExchangeEodCsv = (
  csvText: string,
  options: IndianExchangeEodParseOptions = {}
): IndianExchangeEodParseResult => {
  const rows = parseCsv(csvText);
  return mapIndianExchangeEodRows(rows, { ...options, rawText: csvText });
};

export const mapIndianExchangeEodRows = (
  rows: IndianExchangeEodCsvRow[],
  options: IndianExchangeEodParseOptions & { rawText?: string } = {}
): IndianExchangeEodParseResult => {
  const normalizedRows = rows.map(normalizeInputRow);
  const resolvedSource = options.source || detectSource(normalizedRows, options);
  const sourceName = options.sourceName?.trim() || resolvedSource;
  const exchange = resolveExchange(normalizedRows, resolvedSource, options);
  const symbolSuffix = options.symbolSuffix ?? '';
  const warnings: string[] = [];
  const prices: HistoricalPrice[] = [];
  let malformedRows = 0;

  normalizedRows.forEach((row, index) => {
    if (!isCashStockRow(row, options)) {
      malformedRows += 1;
      return;
    }

    const symbol = normalizeProviderSymbol(readFirst(row, SYMBOL_ALIASES), symbolSuffix);
    const date = readDate(row, DATE_ALIASES, options.tradingDate);
    const open = readNumber(row, OPEN_ALIASES);
    const high = readNumber(row, HIGH_ALIASES);
    const low = readNumber(row, LOW_ALIASES);
    const close = readNumber(row, CLOSE_ALIASES);
    const volume = readNumber(row, VOLUME_ALIASES);
    const missing = [
      symbol ? null : 'symbol',
      date ? null : 'date',
      open === null ? 'open' : null,
      high === null ? 'high' : null,
      low === null ? 'low' : null,
      close === null ? 'close' : null,
    ].filter((field): field is string => Boolean(field));

    if (missing.length > 0 || !date || open === null || high === null || low === null || close === null) {
      malformedRows += 1;
      warnings.push(`Row ${index + 1}: missing or invalid ${missing.join(', ')}; skipped.`);
      return;
    }

    prices.push({
      symbol,
      date,
      open,
      high,
      low,
      close,
      adjustedClose: null,
      ...(volume === null ? {} : { volume }),
      source: sourceName,
    });
  });

  const validation = partitionHistoricalPrices(prices);
  if (validation.invalid.length > 0) {
    warnings.push(`${validation.invalid.length} parsed ${sourceName} price rows failed HistoricalPrice validation.`);
  }

  const fingerprint = fingerprintNormalizedRows(normalizedRows, {
    sourceName,
    exchange,
    sourceUrl: options.sourceUrl || null,
    rawText: options.rawText,
  });

  return {
    sourceName,
    sourceFingerprint: fingerprint.sourceFingerprint,
    sourceIdentity: fingerprint.sourceIdentity,
    rowsRead: normalizedRows.length,
    rowsParsed: validation.valid.length,
    rowsSkipped: malformedRows + validation.invalid.length,
    warnings,
    prices: validation.valid,
  };
};

export const computeIndianExchangeEodSourceFingerprint = (
  rows: IndianExchangeEodCsvRow[],
  options: IndianExchangeEodParseOptions & { rawText?: string } = {}
): IndianExchangeEodFingerprintResult => {
  const normalizedRows = rows.map(normalizeInputRow);
  const resolvedSource = options.source || detectSource(normalizedRows, options);
  const sourceName = options.sourceName?.trim() || resolvedSource;
  const exchange = resolveExchange(normalizedRows, resolvedSource, options);
  return fingerprintNormalizedRows(normalizedRows, {
    sourceName,
    exchange,
    sourceUrl: options.sourceUrl || null,
    rawText: options.rawText,
  });
};

export const buildNseUdiffCmBhavcopyArchiveUrl = (tradingDate: Date | string): NseArchiveUrl => {
  const parts = toDateParts(tradingDate);
  const fileName = `BhavCopy_NSE_CM_0_0_0_${parts.yyyymmdd}_F_0000.csv.zip`;
  return {
    pattern: 'NSE_UDIFF_CM_BHAVCOPY_ZIP',
    sourceName: 'NSE_UDIFF_CM_BHAVCOPY',
    fileName,
    url: nseUdiffCmBhavcopyArchiveUrl(fileName),
    activeFrom: NSE_UDIFF_ACTIVE_FROM,
  };
};

export const buildNseSecurityBhavdataArchiveUrl = (tradingDate: Date | string): NseArchiveUrl => {
  const parts = toDateParts(tradingDate);
  const fileName = `sec_bhavdata_full_${parts.ddmmyyyy}.csv`;
  return {
    pattern: 'NSE_SECURITY_BHAVDATA_CSV',
    sourceName: 'NSE_SECURITY_BHAVDATA',
    fileName,
    url: nseSecurityBhavdataArchiveUrl(fileName),
  };
};

export const buildNseLegacyCmBhavcopyArchiveUrl = (tradingDate: Date | string): NseArchiveUrl => {
  const parts = toDateParts(tradingDate);
  const fileName = `cm${parts.dd}${parts.mmm}${parts.yyyy}bhav.csv.zip`;
  return {
    pattern: 'NSE_LEGACY_CM_BHAVCOPY_ZIP',
    sourceName: 'NSE_LEGACY_CM_BHAVCOPY',
    fileName,
    url: nseLegacyCmBhavcopyArchiveUrl(parts.yyyy, parts.mmm, fileName),
    discontinuedFrom: NSE_UDIFF_ACTIVE_FROM,
  };
};

export const buildNseOfficialArchiveUrls = (tradingDate: Date | string): NseArchiveUrl[] => [
  buildNseUdiffCmBhavcopyArchiveUrl(tradingDate),
  buildNseSecurityBhavdataArchiveUrl(tradingDate),
  buildNseLegacyCmBhavcopyArchiveUrl(tradingDate),
];

const parseCsv = (csvText: string): IndianExchangeEodCsvRow[] => {
  const lines = csvText.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]).map(normalizeHeader);
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    const row: IndianExchangeEodCsvRow = {};
    headers.forEach((header, index) => {
      if (!header) return;
      row[header] = values[index]?.trim() || '';
    });
    return row;
  });
};

const splitCsvLine = (line: string): string[] => {
  const values: string[] = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"' && line[i + 1] === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current);
  return values;
};

const normalizeInputRow = (row: IndianExchangeEodCsvRow): NormalizedCsvRow => {
  const normalized: NormalizedCsvRow = {};
  Object.entries(row).forEach(([key, value]) => {
    const normalizedKey = normalizeHeader(key);
    if (!normalizedKey) return;
    const normalizedValue = value === null || value === undefined ? '' : String(value).trim();
    if (normalized[normalizedKey] === undefined || normalizedValue) {
      normalized[normalizedKey] = normalizedValue;
    }
  });
  return normalized;
};

const normalizeHeader = (value: string): string =>
  value.replace(/^\uFEFF/, '').trim().replace(/[\s._/-]+/g, '').toUpperCase();

const readFirst = (row: NormalizedCsvRow, aliases: string[]): string => {
  for (const alias of aliases) {
    const value = row[normalizeHeader(alias)];
    if (value?.trim()) return value.trim();
  }
  return '';
};

const readNumber = (row: NormalizedCsvRow, aliases: string[]): number | null => {
  const raw = readFirst(row, aliases);
  if (!raw) return null;
  const normalized = raw.replace(/,/g, '').trim();
  if (!normalized || normalized === '-' || /^NA$/i.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const readDate = (row: NormalizedCsvRow, aliases: string[], fallback?: Date | string): Date | null =>
  parseExchangeDate(readFirst(row, aliases)) || parseExchangeDate(fallback);

const parseExchangeDate = (value: Date | string | undefined): Date | null => {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  }
  const text = value?.trim();
  if (!text) return null;

  let match = text.match(/^(\d{8})$/);
  if (match) {
    const yyyymmddYear = Number(text.slice(0, 4));
    if (yyyymmddYear >= 1900 && yyyymmddYear <= 2200) {
      return utcDate(yyyymmddYear, Number(text.slice(4, 6)) - 1, Number(text.slice(6, 8)));
    }
    return utcDate(Number(text.slice(4, 8)), Number(text.slice(2, 4)) - 1, Number(text.slice(0, 2)));
  }

  match = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (match) return utcDate(Number(match[1]), Number(match[2]) - 1, Number(match[3]));

  match = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
  if (match) return utcDate(normalizeYear(Number(match[3])), Number(match[2]) - 1, Number(match[1]));

  match = text.match(/^(\d{1,2})[- ]([A-Za-z]{3})[- ](\d{2,4})$/);
  if (match) {
    const monthIndex = MONTH_CODES.indexOf(match[2].toUpperCase());
    if (monthIndex >= 0) return utcDate(normalizeYear(Number(match[3])), monthIndex, Number(match[1]));
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
};

const utcDate = (year: number, monthIndex: number, day: number): Date | null => {
  const candidate = new Date(Date.UTC(year, monthIndex, day));
  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== monthIndex ||
    candidate.getUTCDate() !== day
  ) {
    return null;
  }
  return candidate;
};

const normalizeYear = (year: number): number => {
  if (year >= 100) return year;
  return year >= 70 ? 1900 + year : 2000 + year;
};

const normalizeProviderSymbol = (rawSymbol: string, suffix: '.NS' | '.BO' | ''): string => {
  const symbol = rawSymbol.trim().toUpperCase();
  if (!symbol) return '';
  if (!suffix || symbol.endsWith('.NS') || symbol.endsWith('.BO') || symbol.startsWith('^')) return symbol;
  return `${symbol}${suffix}`;
};

const isCashStockRow = (row: NormalizedCsvRow, options: IndianExchangeEodParseOptions): boolean => {
  const segment = readFirst(row, SEGMENT_ALIASES).toUpperCase();
  if (segment && !['CM', 'EQ', 'EQUITY', 'CASH'].includes(segment)) return false;

  const instrumentType = readFirst(row, INSTRUMENT_TYPE_ALIASES).toUpperCase();
  if (instrumentType && DISALLOWED_INSTRUMENT_PREFIXES.some((prefix) => instrumentType.startsWith(prefix))) {
    return false;
  }

  const series = readFirst(row, SERIES_ALIASES).toUpperCase();
  if (options.includeSeries?.length) {
    const allowed = new Set(options.includeSeries.map((item) => item.trim().toUpperCase()).filter(Boolean));
    return !series || allowed.has(series);
  }
  return !series || !NON_STOCK_SERIES.has(series);
};

const detectSource = (rows: NormalizedCsvRow[], options: IndianExchangeEodParseOptions): IndianExchangeEodSource => {
  if (options.exchange === 'BSE') return 'BSE_UDIFF_CM_BHAVCOPY';
  if (hasAnyValue(rows, SOURCE_EXCHANGE_ALIASES, 'BSE')) return 'BSE_UDIFF_CM_BHAVCOPY';
  if (hasAnyHeader(rows, ['TckrSymb', 'OpnPric', 'TtlTradgVol'])) return 'NSE_UDIFF_CM_BHAVCOPY';
  if (hasAnyHeader(rows, ['TIMESTAMP', 'TOTTRDQTY'])) return 'NSE_LEGACY_CM_BHAVCOPY';
  return 'NSE_SECURITY_BHAVDATA';
};

const resolveExchange = (
  rows: NormalizedCsvRow[],
  source: IndianExchangeEodSource,
  options: IndianExchangeEodParseOptions
): IndianExchangeCode => {
  if (options.exchange) return options.exchange;
  if (source.startsWith('BSE')) return 'BSE';
  if (hasAnyValue(rows, SOURCE_EXCHANGE_ALIASES, 'BSE')) return 'BSE';
  return 'NSE';
};

const hasAnyHeader = (rows: NormalizedCsvRow[], aliases: string[]): boolean => {
  const headers = new Set(rows.flatMap((row) => Object.keys(row)));
  return aliases.some((alias) => headers.has(normalizeHeader(alias)));
};

const hasAnyValue = (rows: NormalizedCsvRow[], aliases: string[], value: string): boolean => {
  const expected = value.trim().toUpperCase();
  return rows.some((row) => readFirst(row, aliases).toUpperCase() === expected);
};

const buildSourceIdentity = (
  rows: NormalizedCsvRow[],
  input: {
    sourceName: string;
    exchange: IndianExchangeCode;
    sourceUrl: string | null;
    rawText?: string;
  }
): IndianExchangeEodSourceIdentity => {
  const stableRows = rows.map(stableRecord);
  const rowsJson = JSON.stringify(stableRows);
  return {
    sourceName: input.sourceName,
    exchange: input.exchange,
    sourceUrl: input.sourceUrl,
    rowCount: rows.length,
    contentSha256: sha256(input.rawText ?? rowsJson),
    rowsSha256: sha256(rowsJson),
  };
};

const fingerprintNormalizedRows = (
  rows: NormalizedCsvRow[],
  input: {
    sourceName: string;
    exchange: IndianExchangeCode;
    sourceUrl: string | null;
    rawText?: string;
  }
): IndianExchangeEodFingerprintResult => {
  const sourceIdentity = buildSourceIdentity(rows, input);
  return {
    sourceFingerprint: hashStable(sourceIdentity),
    sourceIdentity,
  };
};

const stableRecord = (row: NormalizedCsvRow): NormalizedCsvRow =>
  Object.keys(row).sort().reduce<NormalizedCsvRow>((result, key) => {
    result[key] = row[key];
    return result;
  }, {});

const hashStable = (value: unknown): string => sha256(JSON.stringify(value));

const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');

const toDateParts = (tradingDate: Date | string): {
  yyyy: string;
  yyyymmdd: string;
  ddmmyyyy: string;
  dd: string;
  mmm: string;
} => {
  const date = parseExchangeDate(tradingDate);
  if (!date) throw new Error('tradingDate must be a valid exchange date.');
  const yyyy = String(date.getUTCFullYear());
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return {
    yyyy,
    yyyymmdd: `${yyyy}${mm}${dd}`,
    ddmmyyyy: `${dd}${mm}${yyyy}`,
    dd,
    mmm: MONTH_CODES[month - 1],
  };
};
