/// <reference types="@types/jest" />
/**
 * In-memory unit tests for the SEC Form 13F structured-data-set parser &
 * aggregation. No network, no DB — pure TSV parse + per-CUSIP aggregation.
 */
import {
  parseInfotableTsv,
  parseCoverpageTsv,
  aggregateByCusip,
  normalizeIssuerName,
} from '../../../src/modules/market-data-foundation/ingestion/us/market-data-foundation.sec-13f.service';
import { streamAggregateInfotable } from '../../../src/modules/market-data-foundation/ingestion/us/market-data-foundation.sec-13f.infotable-stream';

const COVERPAGE_TSV = [
  'ACCESSION_NUMBER\tFILINGMANAGER_NAME\tOTHER',
  '0001-26-000001\tBLACKROCK INC\tx',
  '0001-26-000002\tVANGUARD GROUP INC\tx',
  '0001-26-000003\tSTATE STREET CORP\tx',
].join('\n');

const INFOTABLE_TSV = [
  'ACCESSION_NUMBER\tCUSIP\tNAMEOFISSUER\tVALUE\tSSHPRNAMT',
  '0001-26-000001\t037833100\tAPPLE INC\t1000000\t5000',
  '0001-26-000002\t037833100\tAPPLE INC\t3000000\t15000',
  '0001-26-000003\t037833100\tAPPLE INC\t500000\t2500',
  '0001-26-000001\t594918104\tMICROSOFT CORP\t2000000\t4000',
].join('\n');

describe('parseCoverpageTsv', () => {
  it('maps accession number to filing manager name', () => {
    const map = parseCoverpageTsv(COVERPAGE_TSV);
    expect(map.get('0001-26-000001')).toBe('BLACKROCK INC');
    expect(map.get('0001-26-000002')).toBe('VANGUARD GROUP INC');
    expect(map.size).toBe(3);
  });

  it('returns an empty map when headers are missing', () => {
    expect(parseCoverpageTsv('foo\tbar\n1\t2').size).toBe(0);
  });
});

describe('parseInfotableTsv', () => {
  it('parses CUSIP, issuer, value and shares from each row', () => {
    const rows = parseInfotableTsv(INFOTABLE_TSV);
    expect(rows).toHaveLength(4);
    expect(rows[0]).toEqual({
      accessionNumber: '0001-26-000001',
      cusip: '037833100',
      nameOfIssuer: 'APPLE INC',
      value: 1000000,
      shares: 5000,
    });
  });

  it('handles thousands separators in numeric columns', () => {
    const tsv = 'CUSIP\tNAMEOFISSUER\tVALUE\tSSHPRNAMT\n037833100\tAPPLE INC\t1,234,567\t8,900';
    const rows = parseInfotableTsv(tsv);
    expect(rows[0].value).toBe(1234567);
    expect(rows[0].shares).toBe(8900);
  });
});

describe('aggregateByCusip', () => {
  it('aggregates value/shares, counts distinct holders, and ranks top holders', () => {
    const rows = parseInfotableTsv(INFOTABLE_TSV);
    const managers = parseCoverpageTsv(COVERPAGE_TSV);
    const aggs = aggregateByCusip(rows, managers);

    const apple = aggs.find((a) => a.cusip === '037833100')!;
    expect(apple.nameOfIssuer).toBe('APPLE INC');
    expect(apple.totalValue).toBe(4500000); // 1M + 3M + 0.5M
    expect(apple.totalShares).toBe(22500); // 5000 + 15000 + 2500
    expect(apple.holderCount).toBe(3); // three distinct filing managers
    // Vanguard (3M) ranks above BlackRock (1M) above State Street (0.5M)
    expect(apple.topHolders.map((h) => h.manager)).toEqual([
      'VANGUARD GROUP INC',
      'BLACKROCK INC',
      'STATE STREET CORP',
    ]);
    expect(apple.topHolders[0].value).toBe(3000000);

    const msft = aggs.find((a) => a.cusip === '594918104')!;
    expect(msft.holderCount).toBe(1);
    expect(msft.totalValue).toBe(2000000);
  });

  it('falls back to accession number as the distinct holder key when manager is unknown', () => {
    const rows = parseInfotableTsv(
      'ACCESSION_NUMBER\tCUSIP\tNAMEOFISSUER\tVALUE\tSSHPRNAMT\nUNK-1\t111\tFOO CO\t10\t1\nUNK-2\t111\tFOO CO\t20\t2',
    );
    const aggs = aggregateByCusip(rows, new Map());
    expect(aggs[0].holderCount).toBe(2);
    expect(aggs[0].totalValue).toBe(30);
  });
});

describe('normalizeIssuerName (best-effort CUSIP→stock fallback)', () => {
  it('strips corporate suffixes and punctuation for matching', () => {
    expect(normalizeIssuerName('Apple Inc.')).toBe('APPLE');
    expect(normalizeIssuerName('MICROSOFT CORP')).toBe('MICROSOFT');
    expect(normalizeIssuerName('Alphabet Inc. Class A')).toBe('ALPHABET A');
    expect(normalizeIssuerName('JPMorgan Chase & Co.')).toBe('JPMORGAN CHASE AND');
  });

  it('collapses the Nasdaq " - Common Stock" separator so it matches the 13F issuer form', () => {
    // Our US Stock.name is Nasdaq-style; without dash handling this left "APPLE -".
    expect(normalizeIssuerName('Apple Inc. - Common Stock')).toBe('APPLE');
    expect(normalizeIssuerName('NVIDIA Corporation - Common Stock')).toBe('NVIDIA');
    // ...but a hyphenated name still matches its spaced 13F form (not fused).
    expect(normalizeIssuerName('Coca-Cola Co')).toBe(normalizeIssuerName('COCA COLA CO'));
  });
});

describe('streamAggregateInfotable (production streaming path)', () => {
  it('matches aggregateByCusip exactly for the same fixture (semantics locked together)', () => {
    const managers = parseCoverpageTsv(COVERPAGE_TSV);
    const fromRows = aggregateByCusip(parseInfotableTsv(INFOTABLE_TSV), managers);
    const fromStream = streamAggregateInfotable(Buffer.from(INFOTABLE_TSV, 'utf8'), managers);

    const sortByCusip = <T extends { cusip: string }>(arr: T[]) =>
      [...arr].sort((a, b) => a.cusip.localeCompare(b.cusip));
    expect(sortByCusip(fromStream)).toEqual(sortByCusip(fromRows));
  });

  it('handles CRLF line endings and a trailing newline', () => {
    const crlf = INFOTABLE_TSV.replace(/\n/g, '\r\n') + '\r\n';
    const managers = parseCoverpageTsv(COVERPAGE_TSV);
    const aggs = streamAggregateInfotable(Buffer.from(crlf, 'utf8'), managers);
    const apple = aggs.find((a) => a.cusip === '037833100')!;
    expect(apple.totalValue).toBe(4500000);
    expect(apple.holderCount).toBe(3);
  });
});

