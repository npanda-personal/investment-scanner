/// <reference types="@types/jest" />
import { readFileSync } from 'fs';
import path from 'path';
import { MarketDataFoundationService } from '../../../src/modules/market-data-foundation/market-data-foundation.service';
import {
  ManualVerifiedFundamentalsCsvRow,
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
});
