/// <reference types="@types/jest" />
import { readFileSync } from 'fs';
import path from 'path';
import { MarketDataFoundationService } from '../../../src/modules/market-data-foundation/market-data-foundation.service';
import {
  ManualVerifiedFundamentalsCsvRow,
  NseFinancialResultsApiPeriod,
  NseFinancialResultsClient,
  NseOfficialFinancialResultsClient,
  NseXbrlFundamentalsCsvExporter,
  applyXbrlScale,
  normalizeNseFinancialResultMetadataRows,
  parseNseXbrlFundamentalFacts,
  selectPreferredNseFinancialResults,
  toManualVerifiedFundamentalsCsv,
} from '../../../src/modules/market-data-foundation/market-data-foundation.nse-xbrl-fundamentals-exporter';

describe('NSE XBRL fundamentals CSV exporter', () => {
  it('extracts revenue, net income, and EPS from an NSE-style XBRL fixture', () => {
    const xml = readFileSync(path.resolve(__dirname, 'fixtures', 'nse-xbrl-financial-result.xml'), 'utf8');

    const facts = parseNseXbrlFundamentalFacts(xml);

    expect(facts.revenue).toMatchObject({
      factName: 'RevenueFromOperations',
      value: '1282600000000.00',
      contextRef: 'OneD',
    });
    expect(facts.netIncome).toMatchObject({
      factName: 'ProfitLossForPeriod',
      value: '87210000000.00',
      contextRef: 'OneD',
    });
    expect(facts.eps).toMatchObject({
      factName: 'BasicEarningsLossPerShareFromContinuingAndDiscontinuedOperations',
      value: '6.44',
      contextRef: 'OneD',
    });

    const annualFacts = parseNseXbrlFundamentalFacts(xml, { periodType: 'ANNUAL' });
    expect(annualFacts.revenue).toMatchObject({
      value: '9820000000000.00',
      contextRef: 'FourD',
    });
    expect(annualFacts.netIncome).toMatchObject({
      value: '695000000000.00',
      contextRef: 'FourD',
    });
    expect(annualFacts.eps).toMatchObject({
      value: '51.30',
      contextRef: 'FourD',
    });
  });

  it('extracts approved banking revenue, net income, and EPS fact aliases', () => {
    const aliasCases = [
      {
        revenueFact: 'Income',
        netIncomeFact: 'ProfitLossForThePeriod',
        epsFact: 'BasicEarningsPerShareAfterExtraordinaryItems',
      },
      {
        revenueFact: 'TurnoverOrTotalIncome',
        netIncomeFact: 'ProfitLossFromOrdinaryActivitiesAfterTax',
        epsFact: 'BasicEarningsPerShareBeforeExtraordinaryItems',
      },
      {
        revenueFact: 'InterestEarned',
        netIncomeFact: 'NetProfitAfterTax',
        epsFact: 'EarningPerShare',
      },
    ];

    for (const aliasCase of aliasCases) {
      const xml = bankingXbrlFixture(aliasCase);
      const facts = parseNseXbrlFundamentalFacts(xml);

      expect(facts.revenue).toMatchObject({
        factName: aliasCase.revenueFact,
        value: '5010.25',
        contextRef: 'OneD',
      });
      expect(facts.netIncome).toMatchObject({
        factName: aliasCase.netIncomeFact,
        value: '1200.50',
        contextRef: 'OneD',
      });
      expect(facts.eps).toMatchObject({
        factName: aliasCase.epsFact,
        value: '18.75',
        contextRef: 'OneD',
      });
    }
  });

  it('extracts approved insurance and AMC/NBFC revenue, net income, and EPS fact aliases', () => {
    const aliasCases = [
      {
        taxonomy: 'life insurance total income',
        revenueFact: 'TotalIncome',
        netIncomeFact: 'ProfitAfterTax',
        epsFact: 'BasicEPSAfterExtraordinaryItems',
      },
      {
        taxonomy: 'life insurance net premium income',
        revenueFact: 'NetPremiumIncome',
        netIncomeFact: 'ProfitAfterTax',
        epsFact: 'BasicEPSBeforeExtraordinaryItems',
      },
      {
        taxonomy: 'general insurance premium earned net',
        revenueFact: 'PremiumEarnedNet',
        netIncomeFact: 'ProfitAfterTax',
        epsFact: 'BasicEPSAfterExtraordinaryItems',
      },
      {
        taxonomy: 'AMC total revenue from operations',
        revenueFact: 'TotalRevenueFromOperations',
        netIncomeFact: 'TotalProfitLossForPeriod',
        epsFact: 'BasicEPS',
      },
      {
        taxonomy: 'AMC revenue from operations',
        revenueFact: 'RevenueFromOperations',
        netIncomeFact: 'NetProfitAfterTax',
        epsFact: 'BasicEPSContinuingOperations',
      },
      {
        taxonomy: 'AMC fees and commission income',
        revenueFact: 'FeesAndCommissionIncome',
        netIncomeFact: 'NetProfitAfterTax',
        epsFact: 'BasicEPS',
      },
    ];

    for (const aliasCase of aliasCases) {
      const xml = sectorXbrlFixture(aliasCase);
      const facts = parseNseXbrlFundamentalFacts(xml);

      expect(facts.revenue).toMatchObject({
        factName: aliasCase.revenueFact,
        value: '7010.25',
        contextRef: 'OneD',
      });
      expect(facts.netIncome).toMatchObject({
        factName: aliasCase.netIncomeFact,
        value: '2200.50',
        contextRef: 'OneD',
      });
      expect(facts.eps).toMatchObject({
        factName: aliasCase.epsFact,
        value: '28.75',
        contextRef: 'OneD',
      });
    }
  });

  it('exports and imports approved insurance and AMC/NBFC fundamentals for the recovery symbol set', async () => {
    const symbols = ['LICI', 'SBILIFE', 'HDFCLIFE', 'ICICIPRULI', 'ICICIGI', 'GICRE', 'NIACL', 'ICICIAMC'];
    const client = new RecoverySymbolFixtureClient();
    const exporter = new NseXbrlFundamentalsCsvExporter(client);
    const exportResult = await exporter.exportSymbols({
      symbols,
      outputDir: path.resolve(process.cwd(), 'tmp', 'test-nse-xbrl-insurance-amc-export'),
      maxQuarterlyPeriods: 1,
      maxAnnualPeriods: 1,
      validatedBy: 'XBRL_MAPPING_TEST',
      validatedAt: new Date('2026-06-02T00:00:00.000Z'),
    });
    const stocks = symbols.map((symbol, index) => ({
      id: `stock-${index + 1}`,
      symbol,
      sourceSymbol: symbol,
      displaySymbol: symbol,
      currency: 'INR',
    }));
    const upsertSourceFileImport = jest.fn()
      .mockResolvedValueOnce({ id: 'source-import-recovery', status: 'PENDING' })
      .mockResolvedValueOnce({
        id: 'source-import-recovery',
        source: 'MANUAL_VERIFIED',
        segment: 'FUNDAMENTALS',
        status: 'COMPLETED',
      });
    const repository = {
      findStocksBySymbolsInScope: jest.fn().mockResolvedValue(stocks),
      upsertManualVerifiedFundamental: jest.fn(async (_stockId: string, row: any) => ({ id: `fundamental-${row.periodType}-${row.periodEndDate.toISOString()}` })),
      upsertSourceFileImport,
    };
    const service = new MarketDataFoundationService(repository as any, { fetchCoreFundamentals: jest.fn() } as any);

    const importResult = await (service as any).importBulkManualVerifiedFundamentals({
      fileName: path.basename(exportResult.outputFilePath),
      csvText: exportResult.csvText,
      region: 'IN',
      assetType: 'STOCK',
    });

    expect(exportResult.report).toMatchObject({
      symbolCount: 8,
      rowsExported: 16,
      rowsSkipped: 0,
      missingFieldCounts: { revenue: 0, netIncome: 0, eps: 0 },
    });
    expect(exportResult.rows).toHaveLength(16);
    expect(new Set(exportResult.rows.map((row) => row.symbol))).toEqual(new Set(symbols));
    expect(importResult).toMatchObject({
      status: 'COMPLETED',
      rowsRead: 16,
      rowsImported: 16,
      rowsRejected: 0,
      symbolsCovered: 8,
    });
    expect(importResult.quarterlyCoverage).toMatchObject({ rowsImported: 8, symbolsCovered: 8 });
    expect(importResult.annualCoverage).toMatchObject({ rowsImported: 8, symbolsCovered: 8 });
    expect(repository.upsertManualVerifiedFundamental).toHaveBeenCalledTimes(16);
  });

  it('normalizes NSE financial-result metadata into manual import period fields', () => {
    const result = normalizeNseFinancialResultMetadataRows([
      {
        symbol: 'RELIANCE',
        period: 'Quarterly',
        toDate: '31-Dec-2024',
        xbrl: 'https://nsearchives.nseindia.com/corporate/xbrl/INDAS_117298_1348254_16012025082021.xml',
        consolidated: 'Consolidated',
        audited: 'Unaudited',
        cumulative: 'Non Cumulative',
        broadCastDate: '16-Jan-2025 08:20:21',
      },
    ]);

    expect(result.skippedCount).toBe(0);
    expect(result.records).toHaveLength(1);
    expect(result.records[0]).toMatchObject({
      symbol: 'RELIANCE',
      periodType: 'QUARTERLY',
      periodEndDate: '2024-12-31',
      isConsolidated: true,
      isAudited: false,
      isCumulative: false,
      xbrlUrl: 'https://nsearchives.nseindia.com/corporate/xbrl/INDAS_117298_1348254_16012025082021.xml',
    });
  });

  it('normalizes integrated filing and old insurance metadata into eligible XBRL rows', () => {
    const result = normalizeNseFinancialResultMetadataRows([
      {
        symbol: 'LICI',
        period: 'Quarterly',
        qe_Date: '31-MAR-2026',
        type: 'Integrated Filing- Financials',
        type_Sub: 'Original',
        xbrl: 'https://nsearchives.nseindia.com/corporate/xbrl/INTEGRATED_FILING_LI_1670942_21052026082347_WEB.xml',
        ixbrl: 'https://nsearchives.nseindia.com/corporate/ixbrl/INTEGRATED_FILING_LI_1670942_21052026082347_iXBRL_WEB.html',
        consolidated: 'Consolidated',
        audited: 'Audited',
        broadcast_Date: '21-May-2026 08:23:47',
      },
      {
        symbol: 'LICI',
        period: 'Quarterly',
        periodEnd: '31-Dec-2024',
        xbrl: 'https://nsearchives.nseindia.com/corporate/xbrl/LICI_INSURANCE_OLD.xml',
        consolidated: 'Standalone',
        audited: 'Unaudited',
        broadCastDate: '30-Jan-2025 16:00:00',
      },
    ]);

    expect(result.skippedCount).toBe(0);
    expect(result.records).toHaveLength(2);
    expect(result.records[0]).toMatchObject({
      symbol: 'LICI',
      periodType: 'QUARTERLY',
      periodEndDate: '2026-03-31',
      isConsolidated: true,
      isAudited: true,
      xbrlUrl: 'https://nsearchives.nseindia.com/corporate/xbrl/INTEGRATED_FILING_LI_1670942_21052026082347_WEB.xml',
    });
    expect(result.records[1]).toMatchObject({
      symbol: 'LICI',
      periodType: 'QUARTERLY',
      periodEndDate: '2024-12-31',
      isConsolidated: false,
      isAudited: false,
      xbrlUrl: 'https://nsearchives.nseindia.com/corporate/xbrl/LICI_INSURANCE_OLD.xml',
    });
  });

  it('discovers integrated filing metadata coverage for the insurance and AMC recovery symbols', async () => {
    const symbols = ['LICI', 'SBILIFE', 'HDFCLIFE', 'ICICIPRULI', 'ICICIGI', 'GICRE', 'NIACL', 'ICICIAMC'];
    const requestedUrls: string[] = [];
    const fetchImpl = jest.fn(async (url: string) => {
      requestedUrls.push(url);
      if (url.includes('/api/integrated-filing-results')) {
        const symbol = new URL(url).searchParams.get('symbol') || 'UNKNOWN';
        return responseJson({
          data: [integratedFilingMetadataFixture(symbol, '31-MAR-2026')],
          totalCount: 1,
          page: 1,
          size: 100,
        });
      }
      if (url.includes('/api/corporates-financial-results')) return responseJson([]);
      return responseText('<html>NSE session</html>');
    });
    const client = new NseOfficialFinancialResultsClient(fetchImpl as any, 0);

    const coverageBefore = Object.fromEntries(symbols.map((symbol) => [symbol, 0]));
    const coverageAfter: Record<string, number> = {};
    for (const symbol of symbols) {
      const metadataRows = await client.fetchFinancialResultsMetadata(symbol, 'Quarterly');
      const normalized = normalizeNseFinancialResultMetadataRows(metadataRows, {
        requestedSymbol: symbol,
        fallbackPeriodType: 'QUARTERLY',
      });
      coverageAfter[symbol] = normalized.records.filter((record) => record.symbol === symbol).length;
    }

    expect(coverageBefore).toEqual(Object.fromEntries(symbols.map((symbol) => [symbol, 0])));
    expect(coverageAfter).toEqual(Object.fromEntries(symbols.map((symbol) => [symbol, 1])));
    expect(requestedUrls.some((url) => url.includes('/api/integrated-filing-results'))).toBe(true);
    expect(requestedUrls.some((url) => url.includes('/api/corporates-financial-results') && url.includes('index=equities'))).toBe(true);
    expect(requestedUrls.some((url) => url.includes('/api/corporates-financial-results') && url.includes('index=insurance'))).toBe(true);
  });

  it('limits integrated annual metadata discovery to fiscal year-end filings', async () => {
    const fetchImpl = jest.fn(async (url: string) => {
      if (url.includes('/api/integrated-filing-results')) {
        return responseJson({
          data: [
            integratedFilingMetadataFixture('LICI', '31-DEC-2025'),
            integratedFilingMetadataFixture('LICI', '31-MAR-2026'),
          ],
          totalCount: 2,
          page: 1,
          size: 100,
        });
      }
      if (url.includes('/api/corporates-financial-results')) return responseJson([]);
      return responseText('<html>NSE session</html>');
    });
    const client = new NseOfficialFinancialResultsClient(fetchImpl as any, 0);

    const metadataRows = await client.fetchFinancialResultsMetadata('LICI', 'Annual');
    const normalized = normalizeNseFinancialResultMetadataRows(metadataRows, {
      requestedSymbol: 'LICI',
      fallbackPeriodType: 'ANNUAL',
    });

    expect(normalized.records).toHaveLength(1);
    expect(normalized.records[0]).toMatchObject({
      symbol: 'LICI',
      periodType: 'ANNUAL',
      periodEndDate: '2026-03-31',
    });
  });

  it('prefers consolidated filings over standalone filings for the same symbol and period', () => {
    const normalized = normalizeNseFinancialResultMetadataRows([
      {
        symbol: 'TCS',
        period: 'Quarterly',
        toDate: '31-Dec-2024',
        xbrl: 'https://nsearchives.nseindia.com/corporate/xbrl/TCS_STANDALONE.xml',
        consolidated: 'Standalone',
        audited: 'Audited',
      },
      {
        symbol: 'TCS',
        period: 'Quarterly',
        toDate: '31-Dec-2024',
        xbrl: 'https://nsearchives.nseindia.com/corporate/xbrl/TCS_CONSOLIDATED.xml',
        consolidated: 'Consolidated',
        audited: 'Unaudited',
      },
    ]);

    const selected = selectPreferredNseFinancialResults(normalized.records);

    expect(selected).toHaveLength(1);
    expect(selected[0].xbrlUrl).toBe('https://nsearchives.nseindia.com/corporate/xbrl/TCS_CONSOLIDATED.xml');
    expect(selected[0].isConsolidated).toBe(true);
  });

  it('writes CSV columns accepted by the existing MANUAL_VERIFIED bulk import path', async () => {
    const rows: ManualVerifiedFundamentalsCsvRow[] = [{
      symbol: 'INFY',
      periodType: 'ANNUAL',
      periodEndDate: '2026-03-31',
      revenue: '1000',
      netIncome: '120',
      eps: '12.5',
      source: 'MANUAL_VERIFIED',
      sourceUrl: 'https://nsearchives.nseindia.com/corporate/xbrl/INFY.xml',
      validatedBy: 'NSE_XBRL_EXPORT_REVIEW',
      validatedAt: '2026-06-02T00:00:00.000Z',
    }];
    const csvText = toManualVerifiedFundamentalsCsv(rows);
    const upsertSourceFileImport = jest.fn()
      .mockResolvedValueOnce({ id: 'source-import-1', status: 'PENDING' })
      .mockResolvedValueOnce({
        id: 'source-import-1',
        source: 'MANUAL_VERIFIED',
        segment: 'FUNDAMENTALS',
        status: 'COMPLETED',
      });
    const repository = {
      findStocksBySymbolsInScope: jest.fn().mockResolvedValue([
        { id: 'stock-1', symbol: 'INFY', sourceSymbol: 'INFY', displaySymbol: 'INFY', currency: 'INR' },
      ]),
      upsertManualVerifiedFundamental: jest.fn().mockResolvedValue({ id: 'fundamental-1' }),
      upsertSourceFileImport,
    };
    const service = new MarketDataFoundationService(repository as any, { fetchCoreFundamentals: jest.fn() } as any);

    const result = await (service as any).importBulkManualVerifiedFundamentals({
      fileName: 'nse-xbrl-fundamentals.csv',
      csvText,
      region: 'IN',
      assetType: 'STOCK',
    });

    expect(csvText.split('\n')[0]).toBe('symbol,periodType,periodEndDate,revenue,netIncome,eps,source,sourceUrl,validatedBy,validatedAt');
    expect(repository.upsertManualVerifiedFundamental).toHaveBeenCalledWith('stock-1', expect.objectContaining({
      periodType: 'ANNUAL',
      periodEndDate: new Date('2026-03-31T00:00:00.000Z'),
      revenue: 1000,
      netIncome: 120,
      eps: 12.5,
      sourceUrl: 'https://nsearchives.nseindia.com/corporate/xbrl/INFY.xml',
      validatedBy: 'NSE_XBRL_EXPORT_REVIEW',
    }));
    expect(result).toMatchObject({
      status: 'COMPLETED',
      rowsImported: 1,
      rowsRejected: 0,
      symbolsCovered: 1,
    });
  });

  // -------------------------------------------------------------------------
  // BUG D3 — iXBRL scale / sign normalization
  // -------------------------------------------------------------------------
  describe('applyXbrlScale — scale normalization pure function', () => {
    it('scale=null (absent) leaves the value unchanged (absolute INR already)', () => {
      expect(applyXbrlScale('1282600000000', null, null)).toBe('1282600000000.00');
    });

    it('scale=0 leaves the value unchanged', () => {
      expect(applyXbrlScale('6.44', '0', null)).toBe('6.44');
      expect(applyXbrlScale('100', '0', null)).toBe('100.00');
    });

    it('scale=3 (lakhs) multiplies by 1 000 — reported in thousands, normalised to INR', () => {
      // 8721000 (thousands) * 10^3 = 8,721,000,000 absolute INR
      expect(applyXbrlScale('8721000', '3', null)).toBe('8721000000.00');
    });

    it('scale=5 (ten-lakhs / lakhs₁₀₀k) multiplies by 100 000', () => {
      expect(applyXbrlScale('12826', '5', null)).toBe('1282600000.00');
    });

    it('scale=7 (crores reported as 10-crore units) multiplies correctly', () => {
      // 12826 * 10^7 = 128,260,000,000 (₹128.26 bn — crore scale in iXBRL)
      expect(applyXbrlScale('12826', '7', null)).toBe('128260000000.00');
    });

    it('scale=7 with sign="-" negates the result (net loss)', () => {
      expect(applyXbrlScale('8721', '7', '-')).toBe('-87210000000.00');
    });

    it('positive sign attribute (not "-") does not negate', () => {
      expect(applyXbrlScale('100', '0', '+')).toBe('100.00');
      expect(applyXbrlScale('100', '0', '')).toBe('100.00');
    });

    it('returns null for non-numeric input', () => {
      expect(applyXbrlScale('abc', null, null)).toBeNull();
      expect(applyXbrlScale('', null, null)).toBeNull();
    });

    it('returns null for a non-numeric scale attribute', () => {
      // parseInt('abc', 10) = NaN which is not an integer → null
      expect(applyXbrlScale('100', 'abc', null)).toBeNull();
    });
  });

  describe('parseNseXbrlFundamentalFacts — iXBRL scale attribute applied to monetary facts', () => {
    it('applies scale=7 to revenue and netIncome from namespaced XBRL elements with scale attribute', () => {
      // Simulate a filing that reports figures in crore-units (scale=7).
      // Revenue: 12826 × 10^7 = 128,260,000,000 absolute INR
      // NetIncome: 8721 × 10^7 = 87,210,000,000 absolute INR
      // EPS: scale attribute on EPS is intentionally ignored; raw value is used.
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<xbrli:xbrl xmlns:xbrli="http://www.xbrl.org/2003/instance" xmlns:in-gaap="http://www.mca.gov.in/ind-as">
  <in-gaap:RevenueFromOperations contextRef="OneD" scale="7" decimals="2" unitRef="INR">12826</in-gaap:RevenueFromOperations>
  <in-gaap:ProfitLossForPeriod contextRef="OneD" scale="7" decimals="2" unitRef="INR">8721</in-gaap:ProfitLossForPeriod>
  <in-gaap:BasicEarningsLossPerShareFromContinuingAndDiscontinuedOperations contextRef="OneD" scale="7" decimals="2" unitRef="INR">6.44</in-gaap:BasicEarningsLossPerShareFromContinuingAndDiscontinuedOperations>
</xbrli:xbrl>`;

      const facts = parseNseXbrlFundamentalFacts(xml);

      expect(facts.revenue.value).toBe('128260000000.00');
      expect(facts.netIncome.value).toBe('87210000000.00');
      // EPS: scale attribute is intentionally ignored for per-share values
      expect(facts.eps.value).toBe('6.44');
    });

    it('applies scale=5 (lakh-unit reporting) to monetary facts', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<xbrli:xbrl xmlns:xbrli="http://www.xbrl.org/2003/instance" xmlns:in-gaap="http://www.mca.gov.in/ind-as">
  <in-gaap:RevenueFromOperations contextRef="OneD" scale="5" decimals="2" unitRef="INR">128260</in-gaap:RevenueFromOperations>
  <in-gaap:ProfitLossForPeriod contextRef="OneD" scale="5" decimals="2" unitRef="INR">87210</in-gaap:ProfitLossForPeriod>
  <in-gaap:BasicEarningsLossPerShareFromContinuingAndDiscontinuedOperations contextRef="OneD" decimals="2" unitRef="INR">6.44</in-gaap:BasicEarningsLossPerShareFromContinuingAndDiscontinuedOperations>
</xbrli:xbrl>`;

      const facts = parseNseXbrlFundamentalFacts(xml);

      expect(facts.revenue.value).toBe('12826000000.00');  // 128260 * 10^5
      expect(facts.netIncome.value).toBe('8721000000.00'); // 87210 * 10^5
      expect(facts.eps.value).toBe('6.44');
    });

    it('applies sign="-" to produce a negative net income (reported loss)', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<xbrli:xbrl xmlns:xbrli="http://www.xbrl.org/2003/instance" xmlns:in-gaap="http://www.mca.gov.in/ind-as">
  <in-gaap:RevenueFromOperations contextRef="OneD" scale="7" decimals="2" unitRef="INR">12826</in-gaap:RevenueFromOperations>
  <in-gaap:ProfitLossForPeriod contextRef="OneD" scale="7" sign="-" decimals="2" unitRef="INR">500</in-gaap:ProfitLossForPeriod>
  <in-gaap:BasicEarningsLossPerShareFromContinuingAndDiscontinuedOperations contextRef="OneD" sign="-" decimals="2" unitRef="INR">3.20</in-gaap:BasicEarningsLossPerShareFromContinuingAndDiscontinuedOperations>
</xbrli:xbrl>`;

      const facts = parseNseXbrlFundamentalFacts(xml);

      expect(facts.revenue.value).toBe('128260000000.00');
      expect(facts.netIncome.value).toBe('-5000000000.00'); // 500 * 10^7 negated
      // EPS: sign attribute is ignored for EPS; raw value is used as-is
      expect(facts.eps.value).toBe('3.20');
    });

    it('falls back to scale=0 when scale attribute is absent (plain XBRL, no iXBRL scaling)', () => {
      // The primary XML fixture has no scale attributes → values are absolute INR already.
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<xbrli:xbrl xmlns:xbrli="http://www.xbrl.org/2003/instance" xmlns:in-gaap="http://www.mca.gov.in/ind-as">
  <in-gaap:RevenueFromOperations contextRef="OneD" decimals="2" unitRef="INR">1282600000000.00</in-gaap:RevenueFromOperations>
  <in-gaap:ProfitLossForPeriod contextRef="OneD" decimals="2" unitRef="INR">87210000000.00</in-gaap:ProfitLossForPeriod>
  <in-gaap:BasicEarningsLossPerShareFromContinuingAndDiscontinuedOperations contextRef="OneD" decimals="2" unitRef="INR">6.44</in-gaap:BasicEarningsLossPerShareFromContinuingAndDiscontinuedOperations>
</xbrli:xbrl>`;

      const facts = parseNseXbrlFundamentalFacts(xml);

      expect(facts.revenue.value).toBe('1282600000000.00');
      expect(facts.netIncome.value).toBe('87210000000.00');
      expect(facts.eps.value).toBe('6.44');
    });
  });

  // -------------------------------------------------------------------------
  // BUG D4 — cumulative figures stored as quarterly
  // -------------------------------------------------------------------------
  describe('selectPreferredNseFinancialResults — cumulative vs standalone selection', () => {
    const makeRecord = (overrides: Partial<{
      symbol: string;
      periodType: 'QUARTERLY' | 'ANNUAL';
      periodEndDate: string;
      xbrlUrl: string;
      isConsolidated: boolean;
      isAudited: boolean;
      isCumulative: boolean;
      filingTimestamp: string | null;
    }>) => ({
      symbol: 'TCS',
      periodType: 'QUARTERLY' as const,
      periodEndDate: '2024-09-30',
      xbrlUrl: 'https://nsearchives.nseindia.com/corporate/xbrl/TCS_TEST.xml',
      isConsolidated: true,
      isAudited: true,
      isCumulative: false,
      filingTimestamp: '2024-10-15T00:00:00.000Z',
      raw: {},
      ...overrides,
    });

    it('prefers standalone (non-cumulative) over cumulative for QUARTERLY periods', () => {
      const records = [
        makeRecord({ isCumulative: true, xbrlUrl: 'https://nsearchives.nseindia.com/corporate/xbrl/TCS_CUMULATIVE.xml', filingTimestamp: '2024-10-20T00:00:00.000Z' }),
        makeRecord({ isCumulative: false, xbrlUrl: 'https://nsearchives.nseindia.com/corporate/xbrl/TCS_STANDALONE.xml', filingTimestamp: '2024-10-15T00:00:00.000Z' }),
      ];

      const selected = selectPreferredNseFinancialResults(records);

      expect(selected).toHaveLength(1);
      expect(selected[0].xbrlUrl).toContain('TCS_STANDALONE');
      expect(selected[0].isCumulativeFallback).toBeUndefined();
    });

    it('falls back to cumulative for QUARTERLY when no standalone exists, and sets isCumulativeFallback=true', () => {
      const records = [
        makeRecord({ isCumulative: true, xbrlUrl: 'https://nsearchives.nseindia.com/corporate/xbrl/TCS_CUMULATIVE.xml' }),
      ];

      const selected = selectPreferredNseFinancialResults(records);

      expect(selected).toHaveLength(1);
      expect(selected[0].xbrlUrl).toContain('TCS_CUMULATIVE');
      expect(selected[0].isCumulativeFallback).toBe(true);
    });

    it('does NOT set isCumulativeFallback for ANNUAL cumulative filings (full-year is correct)', () => {
      const records = [
        makeRecord({ periodType: 'ANNUAL', periodEndDate: '2024-03-31', isCumulative: true, xbrlUrl: 'https://nsearchives.nseindia.com/corporate/xbrl/TCS_ANNUAL.xml' }),
      ];

      const selected = selectPreferredNseFinancialResults(records);

      expect(selected).toHaveLength(1);
      expect(selected[0].isCumulativeFallback).toBeUndefined();
    });

    it('prefers cumulative over standalone for ANNUAL periods (full-year consolidation)', () => {
      const records = [
        makeRecord({ periodType: 'ANNUAL', periodEndDate: '2024-03-31', isCumulative: false, xbrlUrl: 'https://nsearchives.nseindia.com/corporate/xbrl/TCS_ANNUAL_STANDALONE.xml', filingTimestamp: '2024-04-30T00:00:00.000Z' }),
        makeRecord({ periodType: 'ANNUAL', periodEndDate: '2024-03-31', isCumulative: true, xbrlUrl: 'https://nsearchives.nseindia.com/corporate/xbrl/TCS_ANNUAL_CUMULATIVE.xml', filingTimestamp: '2024-04-30T00:00:00.000Z' }),
      ];

      const selected = selectPreferredNseFinancialResults(records);

      expect(selected).toHaveLength(1);
      expect(selected[0].xbrlUrl).toContain('TCS_ANNUAL_CUMULATIVE');
      expect(selected[0].isCumulativeFallback).toBeUndefined();
    });

    it('does not flag standalone QUARTERLY results even when selected from a mixed group', () => {
      const records = [
        makeRecord({ isCumulative: false, xbrlUrl: 'https://nsearchives.nseindia.com/corporate/xbrl/TCS_Q_STANDALONE.xml' }),
        makeRecord({ isCumulative: true, xbrlUrl: 'https://nsearchives.nseindia.com/corporate/xbrl/TCS_Q_CUMULATIVE.xml' }),
      ];

      const selected = selectPreferredNseFinancialResults(records);

      expect(selected[0].isCumulativeFallback).toBeUndefined();
      expect(selected[0].xbrlUrl).toContain('TCS_Q_STANDALONE');
    });

    it('consolidation preference still applies even when cumulative selection is involved', () => {
      // Consolidated non-cumulative should beat standalone cumulative
      const records = [
        makeRecord({ isConsolidated: false, isCumulative: true, xbrlUrl: 'https://nsearchives.nseindia.com/corporate/xbrl/TCS_STDLN_CUM.xml' }),
        makeRecord({ isConsolidated: true, isCumulative: false, xbrlUrl: 'https://nsearchives.nseindia.com/corporate/xbrl/TCS_CONSOL_STDLN.xml' }),
      ];

      const selected = selectPreferredNseFinancialResults(records);

      expect(selected[0].xbrlUrl).toContain('TCS_CONSOL_STDLN');
      expect(selected[0].isCumulativeFallback).toBeUndefined();
    });

    it('isCumulativeFallback warning appears in the export report', async () => {
      // A filing that only has a cumulative quarterly result should trigger the warning
      const client: NseFinancialResultsClient = {
        async fetchFinancialResultsMetadata(symbol: string) {
          return [{
            symbol,
            period: 'Quarterly',
            toDate: '30-Sep-2024',
            xbrl: 'https://nsearchives.nseindia.com/corporate/xbrl/TCS_H1_CUMULATIVE.xml',
            consolidated: 'Consolidated',
            audited: 'Audited',
            cumulative: 'Cumulative',  // H1 — 6-month cumulative, no standalone available
            broadCastDate: '15-Oct-2024 10:00:00',
          }];
        },
        async fetchXbrl() {
          return `<?xml version="1.0" encoding="UTF-8"?>
<xbrli:xbrl xmlns:xbrli="http://www.xbrl.org/2003/instance" xmlns:in-gaap="http://www.mca.gov.in/ind-as">
  <in-gaap:RevenueFromOperations contextRef="OneD" decimals="2" unitRef="INR">500000000.00</in-gaap:RevenueFromOperations>
  <in-gaap:ProfitLossForPeriod contextRef="OneD" decimals="2" unitRef="INR">50000000.00</in-gaap:ProfitLossForPeriod>
  <in-gaap:BasicEarningsLossPerShareFromContinuingAndDiscontinuedOperations contextRef="OneD" decimals="2" unitRef="INR">5.00</in-gaap:BasicEarningsLossPerShareFromContinuingAndDiscontinuedOperations>
</xbrli:xbrl>`;
        },
      };
      const exporter = new NseXbrlFundamentalsCsvExporter(client);

      const result = await exporter.exportSymbols({
        symbols: ['TCS'],
        outputDir: require('path').resolve(process.cwd(), 'tmp', 'test-cumulative-fallback'),
        maxQuarterlyPeriods: 1,
        maxAnnualPeriods: 0,
        validatedBy: 'XBRL_D4_TEST',
        validatedAt: new Date('2026-06-04T00:00:00.000Z'),
      });

      expect(result.report.warnings.some((w) => w.includes('cumulative') && w.includes('TCS'))).toBe(true);
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].revenue).toBe('500000000.00');
    });
  });
});

const bankingXbrlFixture = (facts: {
  revenueFact: string;
  netIncomeFact: string;
  epsFact: string;
}): string => `<?xml version="1.0" encoding="UTF-8"?>
<xbrli:xbrl
  xmlns:xbrli="http://www.xbrl.org/2003/instance"
  xmlns:in-bnk="http://www.mca.gov.in/ind-as">
  <xbrli:context id="OneD">
    <xbrli:period>
      <xbrli:startDate>2025-01-01</xbrli:startDate>
      <xbrli:endDate>2025-03-31</xbrli:endDate>
    </xbrli:period>
  </xbrli:context>
  <in-bnk:${facts.revenueFact} contextRef="OneD">5010.25</in-bnk:${facts.revenueFact}>
  <in-bnk:${facts.netIncomeFact} contextRef="OneD">1200.50</in-bnk:${facts.netIncomeFact}>
  <in-bnk:${facts.epsFact} contextRef="OneD">18.75</in-bnk:${facts.epsFact}>
</xbrli:xbrl>`;

const sectorXbrlFixture = (facts: {
  taxonomy: string;
  revenueFact: string;
  netIncomeFact: string;
  epsFact: string;
}): string => `<?xml version="1.0" encoding="UTF-8"?>
<xbrli:xbrl
  xmlns:xbrli="http://www.xbrl.org/2003/instance"
  xmlns:in-sec="http://www.mca.gov.in/ind-as">
  <!-- ${facts.taxonomy} -->
  <xbrli:context id="OneD">
    <xbrli:period>
      <xbrli:startDate>2025-01-01</xbrli:startDate>
      <xbrli:endDate>2025-03-31</xbrli:endDate>
    </xbrli:period>
  </xbrli:context>
  <in-sec:${facts.revenueFact} contextRef="OneD">7010.25</in-sec:${facts.revenueFact}>
  <in-sec:${facts.netIncomeFact} contextRef="OneD">2200.50</in-sec:${facts.netIncomeFact}>
  <in-sec:${facts.epsFact} contextRef="OneD">28.75</in-sec:${facts.epsFact}>
</xbrli:xbrl>`;

const integratedFilingMetadataFixture = (symbol: string, quarterEndDate: string): Record<string, unknown> => ({
  symbol,
  cmName: `${symbol} LIMITED`,
  qe_Date: quarterEndDate,
  type: 'Integrated Filing- Financials',
  type_Sub: 'Original',
  audited: 'Audited',
  consolidated: 'Consolidated',
  xbrl: `https://nsearchives.nseindia.com/corporate/xbrl/INTEGRATED_FILING_${symbol}_${quarterEndDate.replace(/-/g, '_')}_WEB.xml`,
  ixbrl: `https://nsearchives.nseindia.com/corporate/ixbrl/INTEGRATED_FILING_${symbol}_${quarterEndDate.replace(/-/g, '_')}_iXBRL_WEB.html`,
  broadcast_Date: '21-May-2026 08:23:47',
  seq_Id: 1670942,
});

const responseJson = (payload: unknown): Response => responseText(JSON.stringify(payload));

const responseText = (text: string): Response => ({
  ok: true,
  status: 200,
  headers: {
    get: () => '',
    getSetCookie: () => [],
  },
  text: async () => text,
} as unknown as Response);

class RecoverySymbolFixtureClient implements NseFinancialResultsClient {
  async fetchFinancialResultsMetadata(symbol: string, period: NseFinancialResultsApiPeriod) {
    return [{
      symbol,
      period,
      toDate: period === 'Annual' ? '31-Mar-2025' : '31-Dec-2025',
      xbrl: `https://nsearchives.nseindia.com/corporate/xbrl/${symbol}_${period}.xml`,
      consolidated: 'Standalone',
      audited: 'Audited',
      cumulative: period === 'Annual' ? 'Cumulative' : 'Non Cumulative',
      broadCastDate: period === 'Annual' ? '30-Apr-2025 16:00:00' : '20-Jan-2026 16:00:00',
    }];
  }

  async fetchXbrl(url: string): Promise<string> {
    const fileName = path.basename(url, '.xml');
    const [symbol, period] = fileName.split('_');
    const facts = recoveryFactsBySymbol[symbol] || recoveryFactsBySymbol.LICI;
    const contextRef = period === 'Annual' ? 'FourD' : 'OneD';
    return `<?xml version="1.0" encoding="UTF-8"?>
<xbrli:xbrl
  xmlns:xbrli="http://www.xbrl.org/2003/instance"
  xmlns:in-sec="http://www.mca.gov.in/ind-as">
  <xbrli:context id="${contextRef}">
    <xbrli:period>
      <xbrli:startDate>${period === 'Annual' ? '2024-04-01' : '2025-10-01'}</xbrli:startDate>
      <xbrli:endDate>${period === 'Annual' ? '2025-03-31' : '2025-12-31'}</xbrli:endDate>
    </xbrli:period>
  </xbrli:context>
  <in-sec:${facts.revenueFact} contextRef="${contextRef}">${facts.revenue}</in-sec:${facts.revenueFact}>
  <in-sec:${facts.netIncomeFact} contextRef="${contextRef}">${facts.netIncome}</in-sec:${facts.netIncomeFact}>
  <in-sec:${facts.epsFact} contextRef="${contextRef}">${facts.eps}</in-sec:${facts.epsFact}>
</xbrli:xbrl>`;
  }
}

const recoveryFactsBySymbol: Record<string, {
  revenueFact: string;
  netIncomeFact: string;
  epsFact: string;
  revenue: string;
  netIncome: string;
  eps: string;
}> = {
  LICI: {
    revenueFact: 'NetPremiumIncome',
    netIncomeFact: 'ProfitAfterTax',
    epsFact: 'BasicEPSAfterExtraordinaryItems',
    revenue: '1000000.00',
    netIncome: '100000.00',
    eps: '10.00',
  },
  SBILIFE: {
    revenueFact: 'TotalIncome',
    netIncomeFact: 'ProfitAfterTax',
    epsFact: 'BasicEPSBeforeExtraordinaryItems',
    revenue: '2000000.00',
    netIncome: '200000.00',
    eps: '20.00',
  },
  HDFCLIFE: {
    revenueFact: 'NetPremiumIncome',
    netIncomeFact: 'ProfitAfterTax',
    epsFact: 'BasicEPSAfterExtraordinaryItems',
    revenue: '3000000.00',
    netIncome: '300000.00',
    eps: '30.00',
  },
  ICICIPRULI: {
    revenueFact: 'TotalIncome',
    netIncomeFact: 'ProfitAfterTax',
    epsFact: 'BasicEPSBeforeExtraordinaryItems',
    revenue: '4000000.00',
    netIncome: '400000.00',
    eps: '40.00',
  },
  ICICIGI: {
    revenueFact: 'PremiumEarnedNet',
    netIncomeFact: 'ProfitAfterTax',
    epsFact: 'BasicEPSAfterExtraordinaryItems',
    revenue: '5000000.00',
    netIncome: '500000.00',
    eps: '50.00',
  },
  GICRE: {
    revenueFact: 'TotalIncome',
    netIncomeFact: 'ProfitAfterTax',
    epsFact: 'BasicEPSBeforeExtraordinaryItems',
    revenue: '6000000.00',
    netIncome: '600000.00',
    eps: '60.00',
  },
  NIACL: {
    revenueFact: 'PremiumEarnedNet',
    netIncomeFact: 'ProfitAfterTax',
    epsFact: 'BasicEPSAfterExtraordinaryItems',
    revenue: '7000000.00',
    netIncome: '700000.00',
    eps: '70.00',
  },
  ICICIAMC: {
    revenueFact: 'FeesAndCommissionIncome',
    netIncomeFact: 'NetProfitAfterTax',
    epsFact: 'BasicEPSContinuingOperations',
    revenue: '8000000.00',
    netIncome: '800000.00',
    eps: '80.00',
  },
};
