import { promises as fs } from 'fs';
import path from 'path';
import { getNseEndpoints, nseGetQuotesEquityUrl } from './market-data-foundation.endpoints';

export type NseFinancialResultsApiPeriod = 'Quarterly' | 'Annual';
export type ManualVerifiedFundamentalsCsvPeriodType = 'QUARTERLY' | 'ANNUAL';
export type NseXbrlFundamentalField = 'revenue' | 'netIncome' | 'eps';
type NseLegacyFinancialResultsIndex = 'equities' | 'insurance';

export interface NseFinancialResultMetadata {
  [key: string]: unknown;
}

export interface NormalizedNseFinancialResultMetadata {
  symbol: string;
  periodType: ManualVerifiedFundamentalsCsvPeriodType;
  periodEndDate: string;
  xbrlUrl: string;
  isConsolidated: boolean;
  isAudited: boolean;
  isCumulative: boolean;
  /**
   * Set to true when this record was selected as a QUARTERLY period result but
   * only a cumulative (H1 / 9-month) filing was available.  Downstream code
   * should treat the stored figures with caution; re-ingestion once a standalone
   * filing becomes available is recommended.
   */
  isCumulativeFallback?: boolean;
  filingTimestamp: string | null;
  raw: NseFinancialResultMetadata;
}

export interface NseXbrlParsedFact {
  field: NseXbrlFundamentalField;
  factName: string;
  value: string | null;
  contextRef: string | null;
  /**
   * True when the filing metadata indicated this was a QUARTERLY period but only
   * a cumulative (H1 / 9-month) result was available. The value has been stored
   * as-is from the filing; callers should treat it with caution because it may
   * represent more than one standalone quarter.
   */
  isCumulativeFallback?: boolean;
}

export interface NseXbrlParsedFacts {
  revenue: NseXbrlParsedFact;
  netIncome: NseXbrlParsedFact;
  eps: NseXbrlParsedFact;
}

export interface NseXbrlFactParseOptions {
  periodType?: ManualVerifiedFundamentalsCsvPeriodType;
}

export interface ManualVerifiedFundamentalsCsvRow {
  symbol: string;
  periodType: ManualVerifiedFundamentalsCsvPeriodType;
  periodEndDate: string;
  revenue: string | null;
  netIncome: string | null;
  eps: string | null;
  source: 'MANUAL_VERIFIED';
  sourceUrl: string;
  validatedBy: string;
  validatedAt: string;
}

export interface NseXbrlFundamentalsExportOptions {
  symbols: string[];
  outputDir: string;
  maxSymbols?: number;
  maxQuarterlyPeriods?: number;
  maxAnnualPeriods?: number;
  validatedBy?: string;
  validatedAt?: Date;
}

export interface NseXbrlFundamentalsExportReport {
  source: 'NSE_CORPORATE_FILINGS_FINANCIAL_RESULTS';
  outputFilePath: string;
  reportFilePath: string;
  symbolCount: number;
  requestedSymbols: string[];
  rowsExported: number;
  rowsSkipped: number;
  metadataRowsRead: number;
  metadataRowsEligible: number;
  filingsSelected: number;
  missingFieldCounts: Record<NseXbrlFundamentalField, number>;
  warnings: string[];
  startedAt: string;
  completedAt: string;
}

export interface NseXbrlFundamentalsExportResult {
  outputFilePath: string;
  reportFilePath: string;
  csvText: string;
  rows: ManualVerifiedFundamentalsCsvRow[];
  report: NseXbrlFundamentalsExportReport;
}

export interface NseFinancialResultsClient {
  fetchFinancialResultsMetadata(symbol: string, period: NseFinancialResultsApiPeriod): Promise<NseFinancialResultMetadata[]>;
  fetchXbrl(url: string): Promise<string>;
}

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

// External NSE hosts come from the central endpoint registry (overridable via
// MARKET_DATA_NSE_WWW_BASE / MARKET_DATA_NSE_ARCHIVES_BASE).
const NSE_WWW_BASE = getNseEndpoints().wwwBase.url;
const NSE_ARCHIVES_BASE = getNseEndpoints().archivesBase.url;
const NSE_FINANCIAL_RESULTS_PAGE_URL = `${NSE_WWW_BASE}/companies-listing/corporate-filings-financial-results`;
const NSE_FINANCIAL_RESULTS_API_URL = `${NSE_WWW_BASE}/api/corporates-financial-results`;
const NSE_INTEGRATED_FILING_FINANCIALS_PAGE_URL = `${NSE_WWW_BASE}/companies-listing/corporate-integrated-filing?integratedType=integratedfilingfinancials&tabIndex=equity`;
const NSE_INTEGRATED_FILING_RESULTS_API_URL = `${NSE_WWW_BASE}/api/integrated-filing-results`;
const NSE_INTEGRATED_FILING_FINANCIALS_TYPE = 'Integrated Filing- Financials';
const NSE_INTEGRATED_FILING_PAGE_SIZE = 100;
const NSE_INTEGRATED_FILING_MAX_PAGES = 5;
const NSE_LEGACY_FINANCIAL_RESULTS_INDICES: readonly NseLegacyFinancialResultsIndex[] = ['equities', 'insurance'];
const NSE_XBRL_ARCHIVE_PREFIX = `${NSE_ARCHIVES_BASE}/corporate/xbrl/`;
const DEFAULT_MAX_SYMBOLS = 50;
const DEFAULT_QUARTERLY_PERIODS = 8;
const DEFAULT_ANNUAL_PERIODS = 3;
const DEFAULT_VALIDATED_BY = 'NSE_XBRL_EXPORT_REVIEW';

export const NSE_XBRL_FACT_NAMES: Record<NseXbrlFundamentalField, string> = {
  revenue: 'RevenueFromOperations',
  netIncome: 'ProfitLossForPeriod',
  eps: 'BasicEarningsLossPerShareFromContinuingAndDiscontinuedOperations',
};

export const NSE_XBRL_FACT_NAME_ALIASES: Record<NseXbrlFundamentalField, readonly string[]> = {
  revenue: [
    NSE_XBRL_FACT_NAMES.revenue,
    'TotalRevenueFromOperations',
    'Income',
    'TotalIncome',
    'TurnoverOrTotalIncome',
    'InterestEarned',
    'NetPremiumIncome',
    'PremiumEarnedNet',
    'FeesAndCommissionIncome',
  ],
  netIncome: [
    NSE_XBRL_FACT_NAMES.netIncome,
    'TotalProfitLossForPeriod',
    'ProfitLossForThePeriod',
    'ProfitLossFromOrdinaryActivitiesAfterTax',
    'ProfitAfterTax',
    'NetProfitAfterTax',
  ],
  eps: [
    NSE_XBRL_FACT_NAMES.eps,
    'BasicEPS',
    'BasicEPSContinuingOperations',
    'BasicEPSAfterExtraordinaryItems',
    'BasicEPSBeforeExtraordinaryItems',
    'BasicEarningsPerShareAfterExtraordinaryItems',
    'BasicEarningsPerShareBeforeExtraordinaryItems',
    'EarningPerShare',
  ],
};

export const MANUAL_VERIFIED_FUNDAMENTALS_EXPORT_HEADERS = [
  'symbol',
  'periodType',
  'periodEndDate',
  'revenue',
  'netIncome',
  'eps',
  'source',
  'sourceUrl',
  'validatedBy',
  'validatedAt',
] as const;

export class NseOfficialFinancialResultsClient implements NseFinancialResultsClient {
  private cookie = '';
  private warmed = false;

  constructor(
    private readonly fetchImpl: FetchLike = fetch,
    private readonly delayMs = 500
  ) {}

  async fetchFinancialResultsMetadata(symbol: string, period: NseFinancialResultsApiPeriod): Promise<NseFinancialResultMetadata[]> {
    if (!this.warmed) await this.warmSession(symbol);
    const rows: NseFinancialResultMetadata[] = [];
    const failures: string[] = [];

    try {
      rows.push(...await this.fetchIntegratedFilingFinancialsMetadata(symbol, period));
    } catch (error) {
      failures.push(`integrated-filing-results: ${errorMessage(error)}`);
    }

    for (const index of NSE_LEGACY_FINANCIAL_RESULTS_INDICES) {
      try {
        rows.push(...await this.fetchLegacyFinancialResultsMetadata(symbol, period, index));
      } catch (error) {
        failures.push(`corporates-financial-results ${index}: ${errorMessage(error)}`);
      }
    }

    if (rows.length === 0 && failures.length > 0) {
      throw new Error(failures.join(' | '));
    }

    return rows;
  }

  private async fetchLegacyFinancialResultsMetadata(
    symbol: string,
    period: NseFinancialResultsApiPeriod,
    index: NseLegacyFinancialResultsIndex
  ): Promise<NseFinancialResultMetadata[]> {
    await sleep(this.delayMs);
    const query = new URLSearchParams({
      index,
      period,
      symbol: symbol.trim().toUpperCase(),
    });
    const text = await this.requestText(`${NSE_FINANCIAL_RESULTS_API_URL}?${query.toString()}`, symbol);
    return extractNseFinancialResultsMetadataRows(JSON.parse(text)).map((record) => ({
      ...record,
      __nseDiscoverySource: `corporates-financial-results:${index}`,
    }));
  }

  private async fetchIntegratedFilingFinancialsMetadata(
    symbol: string,
    period: NseFinancialResultsApiPeriod
  ): Promise<NseFinancialResultMetadata[]> {
    const rows: NseFinancialResultMetadata[] = [];
    const normalizedSymbol = symbol.trim().toUpperCase();

    for (let page = 1; page <= NSE_INTEGRATED_FILING_MAX_PAGES; page += 1) {
      await sleep(this.delayMs);
      const query = new URLSearchParams({
        symbol: normalizedSymbol,
        type: NSE_INTEGRATED_FILING_FINANCIALS_TYPE,
        page: String(page),
        size: String(NSE_INTEGRATED_FILING_PAGE_SIZE),
      });
      const payload = JSON.parse(await this.requestText(
        `${NSE_INTEGRATED_FILING_RESULTS_API_URL}?${query.toString()}`,
        normalizedSymbol,
        integratedFilingFinancialsReferer(normalizedSymbol)
      ));
      const pageRows = extractNseFinancialResultsMetadataRows(payload);
      rows.push(...pageRows
        .filter((record) => isIntegratedFilingFinancialsRow(record))
        .filter((record) => integratedFilingRowMatchesRequestedPeriod(record, period))
        .map((record) => adaptIntegratedFilingFinancialsRow(record, period)));

      const totalCount = isRecord(payload) ? readPayloadNumber(payload, 'totalCount') : null;
      if (pageRows.length < NSE_INTEGRATED_FILING_PAGE_SIZE) break;
      if (totalCount !== null && page * NSE_INTEGRATED_FILING_PAGE_SIZE >= totalCount) break;
    }

    return rows;
  }

  async fetchXbrl(url: string): Promise<string> {
    await sleep(this.delayMs);
    return this.requestText(url);
  }

  private async warmSession(symbol?: string): Promise<void> {
    const url = symbol
      ? nseGetQuotesEquityUrl(symbol)
      : NSE_FINANCIAL_RESULTS_PAGE_URL;
    const response = await this.fetchImpl(url, { headers: this.headers(symbol) });
    this.captureCookie(response);
    this.warmed = response.ok;
  }

  private async requestText(url: string, symbol?: string, referer?: string): Promise<string> {
    let response = await this.fetchImpl(url, { headers: this.headers(symbol, referer) });
    this.captureCookie(response);

    if ((response.status === 401 || response.status === 403) && this.warmed) {
      this.warmed = false;
      await this.warmSession(symbol);
      await sleep(this.delayMs);
      response = await this.fetchImpl(url, { headers: this.headers(symbol, referer) });
      this.captureCookie(response);
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`NSE request failed ${response.status} for ${url}: ${text.slice(0, 180)}`);
    }
    return response.text();
  }

  private headers(symbol?: string, referer?: string): Record<string, string> {
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0 Safari/537.36',
      Accept: 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      Referer: referer || (symbol
        ? nseGetQuotesEquityUrl(symbol)
        : NSE_FINANCIAL_RESULTS_PAGE_URL),
    };
    if (this.cookie) headers.Cookie = this.cookie;
    return headers;
  }

  private captureCookie(response: Response): void {
    const headers = response.headers as Headers & { getSetCookie?: () => string[] };
    const cookieValues = typeof headers.getSetCookie === 'function'
      ? headers.getSetCookie()
      : String(headers.get('set-cookie') || '').split(/,(?=[^;]+?=)/);
    const cookieParts = cookieValues
      .map((cookie) => String(cookie || '').split(';')[0].trim())
      .filter(Boolean);
    if (cookieParts.length > 0) this.cookie = cookieParts.join('; ');
  }
}

export class NseXbrlFundamentalsCsvExporter {
  constructor(private readonly client: NseFinancialResultsClient = new NseOfficialFinancialResultsClient()) {}

  async exportSymbols(input: NseXbrlFundamentalsExportOptions): Promise<NseXbrlFundamentalsExportResult> {
    const startedAt = new Date();
    const requestedSymbols = normalizeSymbols(input.symbols).slice(0, input.maxSymbols ?? DEFAULT_MAX_SYMBOLS);
    if (requestedSymbols.length === 0) throw new Error('At least one NSE symbol is required for XBRL fundamentals export.');

    const validatedAt = (input.validatedAt || new Date()).toISOString();
    const validatedBy = input.validatedBy?.trim() || DEFAULT_VALIDATED_BY;
    const rows: ManualVerifiedFundamentalsCsvRow[] = [];
    const warnings: string[] = [];
    const missingFieldCounts: Record<NseXbrlFundamentalField, number> = {
      revenue: 0,
      netIncome: 0,
      eps: 0,
    };
    let rowsSkipped = 0;
    let metadataRowsRead = 0;
    let metadataRowsEligible = 0;
    let filingsSelected = 0;

    for (const symbol of requestedSymbols) {
      for (const periodConfig of periodConfigs(input)) {
        try {
          const metadataRows = await this.client.fetchFinancialResultsMetadata(symbol, periodConfig.apiPeriod);
          metadataRowsRead += metadataRows.length;
          const normalized = normalizeNseFinancialResultMetadataRows(metadataRows, {
            requestedSymbol: symbol,
            fallbackPeriodType: periodConfig.periodType,
          });
          if (normalized.skippedCount > 0) {
            warnings.push(`${symbol} ${periodConfig.periodType}: skipped ${normalized.skippedCount} NSE metadata rows without complete XBRL metadata.`);
          }
          const eligible = normalized.records.filter((record) => record.symbol === symbol);
          metadataRowsEligible += eligible.length;
          const selected = selectPreferredNseFinancialResults(eligible, periodConfig.maxPeriods);
          filingsSelected += selected.length;

          if (selected.length === 0) {
            rowsSkipped += 1;
            warnings.push(`${symbol} ${periodConfig.periodType}: no eligible NSE XBRL filing metadata found.`);
            continue;
          }

          for (const filing of selected) {
            try {
              if (filing.isCumulativeFallback) {
                warnings.push(
                  `${symbol} QUARTERLY ${filing.periodEndDate}: only a cumulative filing was available (${filing.xbrlUrl}). ` +
                  `Figures may represent more than one quarter — re-ingest when a standalone filing is published.`
                );
              }
              const xml = await this.client.fetchXbrl(filing.xbrlUrl);
              const facts = parseNseXbrlFundamentalFacts(xml, { periodType: filing.periodType });
              const row: ManualVerifiedFundamentalsCsvRow = {
                symbol,
                periodType: filing.periodType,
                periodEndDate: filing.periodEndDate,
                revenue: facts.revenue.value,
                netIncome: facts.netIncome.value,
                eps: facts.eps.value,
                source: 'MANUAL_VERIFIED',
                sourceUrl: filing.xbrlUrl,
                validatedBy,
                validatedAt,
              };

              (Object.keys(missingFieldCounts) as NseXbrlFundamentalField[]).forEach((field) => {
                if (!row[field]) {
                  missingFieldCounts[field] += 1;
                  warnings.push(`${symbol} ${filing.periodType} ${filing.periodEndDate}: missing ${field} in ${filing.xbrlUrl}.`);
                }
              });

              rows.push(row);
            } catch (error) {
              rowsSkipped += 1;
              warnings.push(`${symbol} ${filing.periodType} ${filing.periodEndDate}: failed to download or parse XBRL ${filing.xbrlUrl}: ${errorMessage(error)}.`);
            }
          }
        } catch (error) {
          rowsSkipped += 1;
          warnings.push(`${symbol} ${periodConfig.periodType}: failed to fetch NSE financial-result metadata: ${errorMessage(error)}.`);
        }
      }
    }

    const csvText = toManualVerifiedFundamentalsCsv(rows);
    const timestamp = startedAt.toISOString().replace(/[:.]/g, '-');
    const outputFilePath = path.resolve(input.outputDir, `nse-xbrl-fundamentals-${timestamp}.csv`);
    const reportFilePath = path.resolve(input.outputDir, `nse-xbrl-fundamentals-${timestamp}.report.json`);
    await fs.mkdir(input.outputDir, { recursive: true });

    const report: NseXbrlFundamentalsExportReport = {
      source: 'NSE_CORPORATE_FILINGS_FINANCIAL_RESULTS',
      outputFilePath,
      reportFilePath,
      symbolCount: requestedSymbols.length,
      requestedSymbols,
      rowsExported: rows.length,
      rowsSkipped,
      metadataRowsRead,
      metadataRowsEligible,
      filingsSelected,
      missingFieldCounts,
      warnings,
      startedAt: startedAt.toISOString(),
      completedAt: new Date().toISOString(),
    };

    await fs.writeFile(outputFilePath, csvText, 'utf8');
    await fs.writeFile(reportFilePath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

    return {
      outputFilePath,
      reportFilePath,
      csvText,
      rows,
      report,
    };
  }
}

export const extractNseFinancialResultsMetadataRows = (payload: unknown): NseFinancialResultMetadata[] => {
  if (Array.isArray(payload)) return payload.filter(isRecord);
  if (!isRecord(payload)) return [];
  const candidateKeys = ['data', 'results', 'financialResults', 'financial_results'];
  for (const key of candidateKeys) {
    const value = readPayloadValue(payload, key);
    if (Array.isArray(value)) return value.filter(isRecord);
  }
  return [];
};

const adaptIntegratedFilingFinancialsRow = (
  record: NseFinancialResultMetadata,
  period: NseFinancialResultsApiPeriod
): NseFinancialResultMetadata => {
  const periodEnd = readRecordString(record, ['qe_Date', 'periodEndDate', 'periodEnd']);
  const filingTimestamp = readRecordString(record, ['broadcast_Date', 'revised_Date', 'creation_Date']);
  return {
    ...record,
    period,
    periodType: period,
    toDate: periodEnd,
    periodEndDate: periodEnd,
    broadCastDate: filingTimestamp,
    __nseDiscoverySource: 'integrated-filing-results',
  };
};

const isIntegratedFilingFinancialsRow = (record: NseFinancialResultMetadata): boolean => {
  const type = readRecordString(record, ['type', 'integratedType']);
  if (!type) return true;
  return normalizeObjectKey(type) === normalizeObjectKey(NSE_INTEGRATED_FILING_FINANCIALS_TYPE);
};

const integratedFilingRowMatchesRequestedPeriod = (
  record: NseFinancialResultMetadata,
  period: NseFinancialResultsApiPeriod
): boolean => {
  if (period === 'Quarterly') return true;
  const periodEndDate = parseNseDate(readRecordString(record, ['qe_Date', 'periodEndDate', 'periodEnd']));
  return Boolean(periodEndDate && periodEndDate.endsWith('-03-31'));
};

const integratedFilingFinancialsReferer = (symbol: string): string => (
  `${NSE_INTEGRATED_FILING_FINANCIALS_PAGE_URL}&symbol=${encodeURIComponent(symbol.trim().toUpperCase())}`
);

export const normalizeNseFinancialResultMetadataRows = (
  records: NseFinancialResultMetadata[],
  options: { requestedSymbol?: string; fallbackPeriodType?: ManualVerifiedFundamentalsCsvPeriodType } = {}
): { records: NormalizedNseFinancialResultMetadata[]; warnings: string[]; skippedCount: number } => {
  const warnings: string[] = [];
  const normalized: NormalizedNseFinancialResultMetadata[] = [];
  let skippedCount = 0;

  records.forEach((record, index) => {
    const row = normalizeNseFinancialResultMetadataRow(record, options);
    if (row) {
      normalized.push(row);
      return;
    }
    skippedCount += 1;
    warnings.push(`NSE financial-result metadata row ${index + 1}: skipped because symbol, period, period end date, or NSE XBRL URL is missing.`);
  });

  return { records: normalized, warnings, skippedCount };
};

export const normalizeNseFinancialResultMetadataRow = (
  record: NseFinancialResultMetadata,
  options: { requestedSymbol?: string; fallbackPeriodType?: ManualVerifiedFundamentalsCsvPeriodType } = {}
): NormalizedNseFinancialResultMetadata | null => {
  const requestedSymbol = options.requestedSymbol?.trim().toUpperCase();
  const symbol = (readRecordString(record, ['symbol', 'companySymbol', 'tradingSymbol']) || requestedSymbol || '').trim().toUpperCase();
  const periodRaw = readRecordString(record, ['period', 'periodType']) || options.fallbackPeriodType || '';
  const periodType = normalizeFinancialResultsPeriodType(periodRaw);
  const periodEndDate = parseNseDate(readRecordString(record, ['toDate', 'periodEndDate', 'period_end_date', 'periodEnd', 'qe_Date']));
  const xbrlUrl = normalizeNseXbrlUrl(readRecordString(record, ['xbrl', 'xbrlUrl', 'xbrl_url', 'fileUrl', 'url']));
  if (!symbol || !periodType || !periodEndDate || !xbrlUrl) return null;

  return {
    symbol,
    periodType,
    periodEndDate,
    xbrlUrl,
    isConsolidated: isConsolidatedValue(readRecordString(record, ['consolidated', 'consolidatedOrStandalone'])),
    isAudited: isAuditedValue(readRecordString(record, ['audited', 'auditStatus'])),
    isCumulative: isCumulativeValue(readRecordString(record, ['cumulative', 'cumulativeOrNonCumulative'])),
    filingTimestamp: parseNseDateTime(readRecordString(record, ['broadcastDate', 'broadCastDate', 'broadcast_Date', 'filingDate', 'dateOfFiling', 'creation_Date', 'revised_Date', 'exchdisstime'])),
    raw: record,
  };
};

export const selectPreferredNseFinancialResults = (
  records: NormalizedNseFinancialResultMetadata[],
  maxPeriods?: number
): NormalizedNseFinancialResultMetadata[] => {
  const grouped = new Map<string, NormalizedNseFinancialResultMetadata[]>();
  records.forEach((record) => {
    const key = `${record.symbol}|${record.periodType}|${record.periodEndDate}`;
    const group = grouped.get(key) || [];
    group.push(record);
    grouped.set(key, group);
  });

  const selected = [...grouped.values()].map((group) => {
    const periodType = group[0].periodType;
    const sorted = [...group].sort((a, b) => comparePreferredNseFinancialResult(a, b, periodType));
    const best = sorted[0];

    // BUG D4 fix: for QUARTERLY periods, if the winning record is cumulative
    // (meaning no standalone quarter was available), flag it so downstream code
    // can treat it with caution.  For ANNUAL periods, cumulative = full-year
    // and is the correct and expected form — no flag needed.
    if (periodType === 'QUARTERLY' && best.isCumulative) {
      return { ...best, isCumulativeFallback: true };
    }
    return best;
  });
  selected.sort((a, b) => b.periodEndDate.localeCompare(a.periodEndDate));
  return typeof maxPeriods === 'number' && maxPeriods >= 0 ? selected.slice(0, maxPeriods) : selected;
};

export const parseNseXbrlFundamentalFacts = (
  xmlText: string,
  options: NseXbrlFactParseOptions = {}
): NseXbrlParsedFacts => ({
  revenue: parseNseXbrlFundamentalFact(xmlText, 'revenue', NSE_XBRL_FACT_NAME_ALIASES.revenue, options),
  netIncome: parseNseXbrlFundamentalFact(xmlText, 'netIncome', NSE_XBRL_FACT_NAME_ALIASES.netIncome, options),
  eps: parseNseXbrlFundamentalFact(xmlText, 'eps', NSE_XBRL_FACT_NAME_ALIASES.eps, options),
});

export const toManualVerifiedFundamentalsCsv = (rows: ManualVerifiedFundamentalsCsvRow[]): string => {
  const lines = [
    MANUAL_VERIFIED_FUNDAMENTALS_EXPORT_HEADERS.join(','),
    ...rows.map((row) => MANUAL_VERIFIED_FUNDAMENTALS_EXPORT_HEADERS
      .map((header) => csvEscape(row[header]))
      .join(',')),
  ];
  return `${lines.join('\n')}\n`;
};

export const normalizeSymbols = (symbols: string[]): string[] => {
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const symbol of symbols) {
    const value = symbol.trim().toUpperCase();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    normalized.push(value);
  }
  return normalized;
};

const parseNseXbrlFundamentalFact = (
  xmlText: string,
  field: NseXbrlFundamentalField,
  factNames: string | readonly string[],
  options: NseXbrlFactParseOptions
): NseXbrlParsedFact => {
  const candidates = Array.isArray(factNames) ? factNames : [factNames];
  // EPS is a per-share amount reported in base-unit rupees; iXBRL scale attributes
  // do not apply (scale is always effectively 0 for EPS facts in NSE filings).
  const isMonetary = field !== 'eps';
  const facts = candidates
    .flatMap((factName, factNameIndex) => extractXbrlFactsByLocalName(xmlText, factName)
      .map((fact) => ({
        ...fact,
        factName,
        factNameIndex,
        value: normalizeXbrlNumericValue(
          fact.text,
          isMonetary ? fact.scale : null,
          isMonetary ? fact.sign : null
        ),
      })))
    .filter((fact) => fact.value !== null)
    .sort((a, b) => (
      contextRefPriority(a.contextRef, options.periodType) - contextRefPriority(b.contextRef, options.periodType)
      || a.factNameIndex - b.factNameIndex
      || a.order - b.order
    ));
  const selected = facts[0] || null;
  return {
    field,
    factName: selected?.factName ?? candidates[0],
    value: selected?.value ?? null,
    contextRef: selected?.contextRef ?? null,
  };
};

const extractXbrlFactsByLocalName = (
  xmlText: string,
  localName: string
): Array<{ text: string; contextRef: string | null; scale: string | null; sign: string | null; order: number }> => {
  const escapedName = escapeRegExp(localName);
  const pattern = new RegExp(`<(?:[A-Za-z_][\\w.-]*:)?${escapedName}\\b([^>]*)>([\\s\\S]*?)<\\/(?:[A-Za-z_][\\w.-]*:)?${escapedName}>`, 'gi');
  const facts: Array<{ text: string; contextRef: string | null; scale: string | null; sign: string | null; order: number }> = [];
  let match: RegExpExecArray | null;
  let order = 0;
  while ((match = pattern.exec(xmlText)) !== null) {
    const attributes = parseXmlAttributes(match[1] || '');
    const isNil = ['true', '1'].includes((attributes.nil || '').trim().toLowerCase());
    if (!isNil) {
      facts.push({
        text: decodeXmlEntities(stripXmlTags(match[2] || '').trim()),
        contextRef: attributes.contextRef || attributes.contextref || null,
        // iXBRL ix:nonFraction attributes; absent on plain XBRL facts (scale=0 default)
        scale: attributes.scale || null,
        sign: attributes.sign || null,
        order,
      });
    }
    order += 1;
  }
  return facts;
};

const parseXmlAttributes = (text: string): Record<string, string> => {
  const attributes: Record<string, string> = {};
  const pattern = /([A-Za-z_][\w:.-]*)\s*=\s*("([^"]*)"|'([^']*)')/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    const name = xmlLocalName(match[1]);
    attributes[name] = decodeXmlEntities(match[3] ?? match[4] ?? '');
  }
  return attributes;
};

/**
 * Applies an iXBRL scale and sign attribute to a numeric value, normalizing the
 * result to an absolute base unit (absolute INR for monetary facts, per-share INR
 * for EPS).
 *
 * NSE iXBRL (ix:nonFraction) facts carry:
 *   scale — integer exponent; the reported number must be multiplied by 10^scale
 *             to arrive at the base-unit value.  Absent → 0 (value already in
 *             base unit, i.e. absolute rupees).
 *   sign  — "-" means the value should be negated after scale is applied.
 *             Any other value (including absent) leaves the sign unchanged.
 *
 * Examples:
 *   value=12826  scale=7  sign absent  → 12826 × 10^7  = 128,260,000,000 (₹128.26 bn)
 *   value=8721   scale=7  sign="-"     → -(8721 × 10^7) = -87,210,000,000
 *   value=6.44   scale=0  sign absent  → 6.44 (EPS already per-share rupees)
 *
 * This is a pure function; it does NOT parse the raw text — call
 * normalizeXbrlNumericValue for that.
 */
export const applyXbrlScale = (
  numericString: string,
  scaleAttr: string | null,
  signAttr: string | null
): string | null => {
  const trimmed = numericString.trim();
  if (!trimmed) return null;
  const base = Number(trimmed);
  if (!Number.isFinite(base)) return null;

  const scale = scaleAttr !== null ? parseInt(scaleAttr, 10) : 0;
  if (!Number.isInteger(scale)) return null;

  const multiplier = Math.pow(10, scale);
  let result = base * multiplier;

  if ((signAttr || '').trim() === '-') result = -result;

  // Preserve reasonable decimal precision: use up to 2 decimal places for
  // scaled results, matching the decimals="2" convention in NSE filings.
  return result.toFixed(2);
};

const normalizeXbrlNumericValue = (
  value: string,
  scaleAttr: string | null = null,
  signAttr: string | null = null
): string | null => {
  const trimmed = value.trim();
  if (!trimmed || ['-', 'NA', 'N/A', 'NULL'].includes(trimmed.toUpperCase())) return null;
  const parenthesized = /^\((.*)\)$/.exec(trimmed);
  // Parenthesized values "(123)" are accounting notation for negative numbers.
  const numericText = (parenthesized ? `-${parenthesized[1]}` : trimmed).replace(/[,\s]/g, '');
  if (!Number.isFinite(Number(numericText))) return null;

  return applyXbrlScale(numericText, scaleAttr, signAttr);
};

const contextRefPriority = (contextRef: string | null, periodType: ManualVerifiedFundamentalsCsvPeriodType = 'QUARTERLY'): number => {
  const normalized = (contextRef || '').toUpperCase();
  if (!normalized) return 30;
  if (periodType === 'ANNUAL') {
    if (normalized === 'FOURD' || normalized.includes('FOURD')) return 0;
    if (normalized.includes('ANNUAL') || normalized.includes('YEAR')) return 5;
    if (normalized.includes('CURRENT') && normalized.includes('DURATION')) return 10;
    if (normalized === 'ONED' || normalized.includes('ONED')) return 20;
    return 25;
  }
  if (normalized === 'ONED' || normalized.includes('ONED')) return 0;
  if (normalized.includes('CURRENT') && normalized.includes('DURATION')) return 5;
  if (normalized.includes('DURATION') && !normalized.includes('PRIOR') && !normalized.includes('PREVIOUS')) return 10;
  return 20;
};

const periodConfigs = (input: NseXbrlFundamentalsExportOptions): Array<{
  apiPeriod: NseFinancialResultsApiPeriod;
  periodType: ManualVerifiedFundamentalsCsvPeriodType;
  maxPeriods: number;
}> => [
  {
    apiPeriod: 'Quarterly',
    periodType: 'QUARTERLY',
    maxPeriods: input.maxQuarterlyPeriods ?? DEFAULT_QUARTERLY_PERIODS,
  },
  {
    apiPeriod: 'Annual',
    periodType: 'ANNUAL',
    maxPeriods: input.maxAnnualPeriods ?? DEFAULT_ANNUAL_PERIODS,
  },
];

const normalizeFinancialResultsPeriodType = (value: string): ManualVerifiedFundamentalsCsvPeriodType | null => {
  const normalized = value.trim().toUpperCase();
  if (['QUARTERLY', 'QUARTER', 'QTR', 'Q'].includes(normalized)) return 'QUARTERLY';
  if (['ANNUAL', 'YEARLY', 'YEAR', 'FY'].includes(normalized)) return 'ANNUAL';
  return null;
};

const normalizeNseXbrlUrl = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed || trimmed === '-' || /^NA$/i.test(trimmed)) return null;
  if (/^https:\/\/nsearchives\.nseindia\.com\/corporate\/xbrl\/.+\.xml$/i.test(trimmed)) return trimmed;
  if (/^\/corporate\/xbrl\/.+\.xml$/i.test(trimmed)) return `${NSE_ARCHIVES_BASE}${trimmed}`;
  const fileName = path.basename(trimmed);
  if (/^[A-Za-z0-9_.-]+\.xml$/i.test(fileName)) return `${NSE_XBRL_ARCHIVE_PREFIX}${fileName}`;
  return null;
};

const parseNseDate = (value: string): string | null => {
  const date = parseDateParts(value);
  return date ? date.toISOString().slice(0, 10) : null;
};

const parseNseDateTime = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  const date = parseDateParts(trimmed);
  return date ? date.toISOString() : null;
};

const parseDateParts = (value: string): Date | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const isoDate = /^(\d{4})-(\d{2})-(\d{2})(?:\s+.*)?$/.exec(trimmed);
  if (isoDate) return makeUtcDate(Number(isoDate[1]), Number(isoDate[2]), Number(isoDate[3]));

  const alphaDmy = /^(\d{1,2})[-/ ]([A-Za-z]{3,})[-/ ](\d{2,4})(?:\s+.*)?$/.exec(trimmed);
  if (alphaDmy) {
    const month = monthIndex(alphaDmy[2]);
    if (month !== null) return makeUtcDate(expandYear(alphaDmy[3]), month + 1, Number(alphaDmy[1]));
  }

  const numericDmy = /^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})(?:\s+.*)?$/.exec(trimmed);
  if (numericDmy) return makeUtcDate(expandYear(numericDmy[3]), Number(numericDmy[2]), Number(numericDmy[1]));

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return makeUtcDate(parsed.getUTCFullYear(), parsed.getUTCMonth() + 1, parsed.getUTCDate());
};

const makeUtcDate = (year: number, month: number, day: number): Date | null => {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date;
};

const monthIndex = (monthText: string): number | null => {
  const index = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'].indexOf(monthText.slice(0, 3).toUpperCase());
  return index >= 0 ? index : null;
};

const expandYear = (yearText: string): number => {
  const year = Number(yearText);
  if (yearText.length !== 2) return year;
  return year >= 70 ? 1900 + year : 2000 + year;
};

/**
 * Compares two NSE financial result records for sort-preference (ascending — the
 * "best" record sorts first, i.e. to index 0).
 *
 * Cumulative-vs-standalone rule (BUG D4 fix):
 *   QUARTERLY — prefer standalone (non-cumulative) results.  A "cumulative"
 *               filing for an interim quarter (H1, 9-month) represents MORE than
 *               one quarter; storing it as a single-quarter figure inflates the
 *               metric.  Fall back to cumulative only when no standalone exists
 *               (selectPreferredNseFinancialResults marks that case with
 *               isCumulativeFallback=true so it is not silently trusted).
 *   ANNUAL    — cumulative = full-year, which is correct and expected; prefer it.
 */
const comparePreferredNseFinancialResult = (
  a: NormalizedNseFinancialResultMetadata,
  b: NormalizedNseFinancialResultMetadata,
  periodType: ManualVerifiedFundamentalsCsvPeriodType = 'QUARTERLY'
): number => {
  // For QUARTERLY: non-cumulative (standalone quarter) is preferred → sort
  // cumulative=true LAST (higher number = lower priority).
  // For ANNUAL: cumulative (full-year) is preferred → sort cumulative=true FIRST.
  const cumulativeScore = periodType === 'QUARTERLY'
    ? Number(a.isCumulative) - Number(b.isCumulative)   // non-cumulative (0) < cumulative (1)
    : Number(b.isCumulative) - Number(a.isCumulative);  // cumulative (1) sorts first

  const priorities = [
    Number(b.isConsolidated) - Number(a.isConsolidated),
    Number(b.isAudited) - Number(a.isAudited),
    cumulativeScore,
    (b.filingTimestamp || '').localeCompare(a.filingTimestamp || ''),
  ];
  return priorities.find((priority) => priority !== 0) || 0;
};

const isConsolidatedValue = (value: string): boolean => value.trim().toUpperCase().includes('CONSOLIDATED');

const isAuditedValue = (value: string): boolean => {
  const normalized = value.replace(/[-_\s]/g, '').toUpperCase();
  return normalized.includes('AUDITED') && !normalized.includes('UNAUDITED');
};

const isCumulativeValue = (value: string): boolean => {
  const normalized = value.replace(/[-_\s]/g, '').toUpperCase();
  return normalized.includes('CUMULATIVE') && !normalized.includes('NONCUMULATIVE');
};

const readPayloadValue = (payload: Record<string, unknown>, key: string): unknown => {
  const normalizedKey = normalizeObjectKey(key);
  const entry = Object.entries(payload).find(([candidate]) => normalizeObjectKey(candidate) === normalizedKey);
  return entry?.[1];
};

const readRecordString = (record: Record<string, unknown>, keys: string[]): string => {
  for (const key of keys) {
    const value = readPayloadValue(record, key);
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return '';
};

const readPayloadNumber = (payload: Record<string, unknown>, key: string): number | null => {
  const value = readPayloadValue(payload, key);
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const normalizeObjectKey = (key: string): string => key.replace(/[\s_-]/g, '').toUpperCase();

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const csvEscape = (value: unknown): string => {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const stripXmlTags = (value: string): string => value.replace(/<[^>]+>/g, '');

const xmlLocalName = (name: string): string => name.includes(':') ? name.split(':').pop() || name : name;

const decodeXmlEntities = (value: string): string => value
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"')
  .replace(/&apos;/g, "'")
  .replace(/&amp;/g, '&');

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));

const errorMessage = (error: unknown): string => error instanceof Error ? error.message : String(error);
