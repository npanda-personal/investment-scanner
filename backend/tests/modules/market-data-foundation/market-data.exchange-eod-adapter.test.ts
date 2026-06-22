/// <reference types="@types/jest" />
import {
  buildNseOfficialArchiveUrls,
  buildNseSecurityBhavdataArchiveUrl,
  buildNseUdiffCmBhavcopyArchiveUrl,
  computeIndianExchangeEodSourceFingerprint,
  mapIndianExchangeEodRows,
  parseIndianExchangeEodCsv,
} from '../../../src/modules/market-data-foundation/ingestion/india/market-data-foundation.exchange-eod-adapter';

describe('Indian exchange EOD adapter', () => {
  it('parses NSE security bhavdata rows into no-suffix canonical HistoricalPrice rows with source names', () => {
    const csv = [
      'SYMBOL,SERIES,DATE1,OPEN_PRICE,HIGH_PRICE,LOW_PRICE,CLOSE_PRICE,TTL_TRD_QNTY',
      'RELIANCE,EQ,13-May-2026,1430.00,1450.50,1420.25,1444.10,1234567',
      'TCS,EQ,13-May-2026,3400.00,3440.00,3375.00,3410.25,221100',
    ].join('\n');

    const result = parseIndianExchangeEodCsv(csv, { source: 'NSE_SECURITY_BHAVDATA' });

    expect(result.sourceName).toBe('NSE_SECURITY_BHAVDATA');
    expect(result.rowsRead).toBe(2);
    expect(result.rowsParsed).toBe(2);
    expect(result.rowsSkipped).toBe(0);
    expect(result.sourceFingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(result.sourceIdentity).toMatchObject({
      sourceName: 'NSE_SECURITY_BHAVDATA',
      exchange: 'NSE',
      rowCount: 2,
    });
    expect(result.prices[0]).toMatchObject({
      symbol: 'RELIANCE',
      open: 1430,
      high: 1450.5,
      low: 1420.25,
      close: 1444.1,
      adjustedClose: null,
      volume: 1234567,
      source: 'NSE_SECURITY_BHAVDATA',
    });
    expect(result.prices[0].date.toISOString()).toBe('2026-05-13T00:00:00.000Z');
  });

  it('supports NSE UDiFF-style column aliases and filters non-requested series', () => {
    const csv = [
      'TradDt,Sgmt,Src,FinInstrmTp,TckrSymb,SctySrs,OpnPric,HghPric,LwPric,ClsPric,TtlTradgVol',
      '2026-05-13,CM,NSE,STK,INFY,EQ,1500,1512.5,1494.2,1508.8,1100',
      '2026-05-13,CM,NSE,STK,BEONLY,BE,100,101,99,100.5,10',
    ].join('\n');

    const result = parseIndianExchangeEodCsv(csv, {
      source: 'NSE_UDIFF_CM_BHAVCOPY',
      includeSeries: ['EQ'],
    });

    expect(result.rowsRead).toBe(2);
    expect(result.rowsParsed).toBe(1);
    expect(result.rowsSkipped).toBe(1);
    expect(result.prices).toEqual([
      expect.objectContaining({
        symbol: 'INFY',
        open: 1500,
        high: 1512.5,
        low: 1494.2,
        close: 1508.8,
        volume: 1100,
        source: 'NSE_UDIFF_CM_BHAVCOPY',
      }),
    ]);
  });

  it('supports BSE UDiFF-style aliases without storing .BO provider suffixes', () => {
    const rows = [
      {
        TradDt: '2026-05-13',
        Sgmt: 'CM',
        Src: 'BSE',
        FinInstrmTp: 'STK',
        TckrSymb: 500325,
        SctySrs: 'A',
        OpnPric: '1400',
        HghPric: '1425',
        LwPric: '1390',
        ClsPric: '1410',
        TtlTradgVol: '900000',
      },
    ];

    const result = mapIndianExchangeEodRows(rows);

    expect(result.sourceName).toBe('BSE_UDIFF_CM_BHAVCOPY');
    expect(result.sourceIdentity.exchange).toBe('BSE');
    expect(result.prices).toHaveLength(1);
    expect(result.prices[0]).toMatchObject({
      symbol: '500325',
      open: 1400,
      high: 1425,
      low: 1390,
      close: 1410,
      volume: 900000,
      source: 'BSE_UDIFF_CM_BHAVCOPY',
    });
  });

  it('normalizes dates from common archive formats', () => {
    const csv = [
      'SYMBOL,SERIES,TIMESTAMP,OPEN,HIGH,LOW,CLOSE,TOTTRDQTY',
      'SBIN,EQ,13052026,800,810,790,805,1000',
      'AXISBANK,EQ,13/05/2026,1100,1110,1090,1105,2000',
    ].join('\n');

    const result = parseIndianExchangeEodCsv(csv, { source: 'NSE_LEGACY_CM_BHAVCOPY' });

    expect(result.rowsParsed).toBe(2);
    expect(result.prices.map((price) => price.date.toISOString())).toEqual([
      '2026-05-13T00:00:00.000Z',
      '2026-05-13T00:00:00.000Z',
    ]);
  });

  it('drops rows that fail HistoricalPrice OHLC validation', () => {
    const csv = [
      'SYMBOL,SERIES,DATE1,OPEN_PRICE,HIGH_PRICE,LOW_PRICE,CLOSE_PRICE,TTL_TRD_QNTY',
      'BAD,EQ,13-May-2026,100,110,90,120,1000',
    ].join('\n');

    const result = parseIndianExchangeEodCsv(csv, { source: 'NSE_SECURITY_BHAVDATA' });

    expect(result.rowsParsed).toBe(0);
    expect(result.rowsSkipped).toBe(1);
    expect(result.prices).toEqual([]);
    expect(result.warnings).toContain('1 parsed NSE_SECURITY_BHAVDATA price rows failed HistoricalPrice validation.');
  });

  it('computes deterministic source fingerprints from local content', () => {
    const csv = [
      'SYMBOL,SERIES,DATE1,OPEN_PRICE,HIGH_PRICE,LOW_PRICE,CLOSE_PRICE,TTL_TRD_QNTY',
      'RELIANCE,EQ,13-May-2026,1430,1450,1420,1444,1234567',
    ].join('\n');

    const first = parseIndianExchangeEodCsv(csv, {
      source: 'NSE_SECURITY_BHAVDATA',
      sourceUrl: 'https://archives.nseindia.com/products/content/sec_bhavdata_full_13052026.csv',
    });
    const second = parseIndianExchangeEodCsv(csv, {
      source: 'NSE_SECURITY_BHAVDATA',
      sourceUrl: 'https://archives.nseindia.com/products/content/sec_bhavdata_full_13052026.csv',
    });
    const changedSource = parseIndianExchangeEodCsv(csv, {
      source: 'NSE_SECURITY_BHAVDATA',
      sourceUrl: 'local-fixture.csv',
    });

    expect(second.sourceFingerprint).toBe(first.sourceFingerprint);
    expect(changedSource.sourceFingerprint).not.toBe(first.sourceFingerprint);
    expect(first.sourceIdentity.contentSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(first.sourceIdentity.rowsSha256).toMatch(/^[a-f0-9]{64}$/);

    const helper = computeIndianExchangeEodSourceFingerprint(
      [{ SYMBOL: 'RELIANCE', SERIES: 'EQ', DATE1: '13-May-2026', OPEN_PRICE: '1430' }],
      { source: 'NSE_SECURITY_BHAVDATA', rawText: csv }
    );
    expect(helper.sourceIdentity.sourceName).toBe('NSE_SECURITY_BHAVDATA');
    expect(helper.sourceFingerprint).toMatch(/^[a-f0-9]{64}$/);
  });

  it('builds official-source NSE archive URLs without fetching them', () => {
    const udiff = buildNseUdiffCmBhavcopyArchiveUrl('2026-05-13');
    const security = buildNseSecurityBhavdataArchiveUrl('13-May-2026');
    const all = buildNseOfficialArchiveUrls(new Date(Date.UTC(2026, 4, 13)));

    expect(udiff).toMatchObject({
      pattern: 'NSE_UDIFF_CM_BHAVCOPY_ZIP',
      sourceName: 'NSE_UDIFF_CM_BHAVCOPY',
      fileName: 'BhavCopy_NSE_CM_0_0_0_20260513_F_0000.csv.zip',
      url: 'https://nsearchives.nseindia.com/content/cm/BhavCopy_NSE_CM_0_0_0_20260513_F_0000.csv.zip',
      activeFrom: '2024-07-08',
    });
    expect(security).toMatchObject({
      pattern: 'NSE_SECURITY_BHAVDATA_CSV',
      sourceName: 'NSE_SECURITY_BHAVDATA',
      fileName: 'sec_bhavdata_full_13052026.csv',
      url: 'https://archives.nseindia.com/products/content/sec_bhavdata_full_13052026.csv',
    });
    expect(all.map((entry) => entry.pattern)).toEqual([
      'NSE_UDIFF_CM_BHAVCOPY_ZIP',
      'NSE_SECURITY_BHAVDATA_CSV',
      'NSE_LEGACY_CM_BHAVCOPY_ZIP',
    ]);
  });
});
