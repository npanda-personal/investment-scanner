/// <reference types="@types/jest" />
/**
 * Fixture-based unit tests for the SEC Form 4 (insider trades) parser.
 * No network, no DB — the pure parse functions are exercised directly, and the
 * submissions/recent-filings parser is tested against an in-memory JSON sample.
 */
import {
  parseForm4Xml,
  insiderTradeNaturalKey,
  rawForm4DocPath,
} from '../../../src/modules/market-data-foundation/ingestion/us/market-data-foundation.sec-form4.service';
import {
  parseRecentFilings,
  accessionNoDashes,
  archiveDocumentUrl,
} from '../../../src/modules/market-data-foundation/ingestion/us/market-data-foundation.sec-edgar-client';

const SAMPLE_FORM4_XML = `<?xml version="1.0"?>
<ownershipDocument>
  <reportingOwner>
    <reportingOwnerId>
      <rptOwnerCik>0001214156</rptOwnerCik>
      <rptOwnerName>COOK TIMOTHY D</rptOwnerName>
    </reportingOwnerId>
    <reportingOwnerRelationship>
      <isDirector>0</isDirector>
      <isOfficer>1</isOfficer>
      <isTenPercentOwner>0</isTenPercentOwner>
      <officerTitle>Chief Executive Officer</officerTitle>
    </reportingOwnerRelationship>
  </reportingOwner>
  <nonDerivativeTable>
    <nonDerivativeTransaction>
      <securityTitle><value>Common Stock</value></securityTitle>
      <transactionDate><value>2026-05-15</value></transactionDate>
      <transactionCoding>
        <transactionCode>P</transactionCode>
      </transactionCoding>
      <transactionAmounts>
        <transactionShares><value>1000</value></transactionShares>
        <transactionPricePerShare><value>189.50</value></transactionPricePerShare>
      </transactionAmounts>
    </nonDerivativeTransaction>
    <nonDerivativeTransaction>
      <securityTitle><value>Common Stock</value></securityTitle>
      <transactionDate><value>2026-05-16</value></transactionDate>
      <transactionCoding>
        <transactionCode>S</transactionCode>
      </transactionCoding>
      <transactionAmounts>
        <transactionShares><value>2500</value></transactionShares>
        <transactionPricePerShare><value>190.25</value></transactionPricePerShare>
      </transactionAmounts>
    </nonDerivativeTransaction>
  </nonDerivativeTable>
</ownershipDocument>`;

describe('parseForm4Xml', () => {
  it('extracts the reporting owner identity and officer title', () => {
    const parsed = parseForm4Xml(SAMPLE_FORM4_XML);
    expect(parsed.insiderName).toBe('COOK TIMOTHY D');
    expect(parsed.insiderTitle).toBe('Chief Executive Officer');
  });

  it('parses both non-derivative transactions with correct code/shares/price', () => {
    const parsed = parseForm4Xml(SAMPLE_FORM4_XML);
    expect(parsed.transactions).toHaveLength(2);

    const buy = parsed.transactions[0];
    expect(buy.transactionCode).toBe('P');
    expect(buy.transactionDate).toBe('2026-05-15');
    expect(buy.shares).toBe(1000);
    expect(buy.pricePerShare).toBe(189.5);

    const sell = parsed.transactions[1];
    expect(sell.transactionCode).toBe('S');
    expect(sell.transactionDate).toBe('2026-05-16');
    expect(sell.shares).toBe(2500);
    expect(sell.pricePerShare).toBe(190.25);
  });

  it('builds a director-only title when there is no officer title', () => {
    const xml = `<ownershipDocument><reportingOwner>
      <reportingOwnerId><rptOwnerName>DOE JANE</rptOwnerName></reportingOwnerId>
      <reportingOwnerRelationship>
        <isDirector>1</isDirector><isOfficer>0</isOfficer><isTenPercentOwner>1</isTenPercentOwner>
      </reportingOwnerRelationship>
    </reportingOwner></ownershipDocument>`;
    const parsed = parseForm4Xml(xml);
    expect(parsed.insiderName).toBe('DOE JANE');
    expect(parsed.insiderTitle).toBe('Director, 10% Owner');
    expect(parsed.transactions).toHaveLength(0);
  });

  it('decodes XML entities in the owner name', () => {
    const xml = `<reportingOwner><reportingOwnerId>
      <rptOwnerName>SMITH &amp; SONS TRUST</rptOwnerName>
    </reportingOwnerId></reportingOwner>`;
    expect(parseForm4Xml(xml).insiderName).toBe('SMITH & SONS TRUST');
  });
});

describe('insiderTradeNaturalKey', () => {
  it('produces a stable, collision-safe composite key', () => {
    const key = insiderTradeNaturalKey({
      cik: '0000320193',
      accession: '0000320193-26-000050',
      insiderName: 'COOK TIMOTHY D',
      transactionDate: '2026-05-15',
      transactionCode: 'P',
      shares: 1000,
    });
    expect(key).toBe('0000320193|0000320193-26-000050|COOK TIMOTHY D|2026-05-15|P|1000');
  });

  it('treats null shares as 0 in the key', () => {
    const key = insiderTradeNaturalKey({
      cik: 'c',
      accession: 'a',
      insiderName: 'n',
      transactionDate: 'd',
      transactionCode: 'P',
      shares: null,
    });
    expect(key.endsWith('|0')).toBe(true);
  });
});

describe('parseRecentFilings + URL helpers', () => {
  const SUBMISSIONS = {
    filings: {
      recent: {
        form: ['4', '10-Q', '4', '8-K'],
        filingDate: ['2026-05-16', '2026-04-30', '2026-05-02', '2026-04-15'],
        accessionNumber: [
          '0000320193-26-000050',
          '0000320193-26-000040',
          '0000320193-26-000045',
          '0000320193-26-000030',
        ],
        primaryDocument: ['xslF345X05/doc4.xml', 'aapl-10q.htm', 'xslF345X05/doc4b.xml', 'aapl-8k.htm'],
      },
    },
  };

  it('flattens the columnar recent-filings arrays into rows', () => {
    const rows = parseRecentFilings(SUBMISSIONS);
    expect(rows).toHaveLength(4);
    expect(rows[0]).toEqual({
      form: '4',
      filingDate: '2026-05-16',
      accessionNumber: '0000320193-26-000050',
      primaryDocument: 'xslF345X05/doc4.xml',
    });
  });

  it('lets callers filter to Form 4 filings', () => {
    const form4s = parseRecentFilings(SUBMISSIONS).filter((f) => f.form === '4');
    expect(form4s.map((f) => f.accessionNumber)).toEqual([
      '0000320193-26-000050',
      '0000320193-26-000045',
    ]);
  });

  it('returns [] for malformed submissions input', () => {
    expect(parseRecentFilings({})).toEqual([]);
    expect(parseRecentFilings(null)).toEqual([]);
  });

  it('builds the Archives document URL with dash-stripped accession and unpadded CIK', () => {
    expect(accessionNoDashes('0000320193-26-000050')).toBe('000032019326000050');
    const url = archiveDocumentUrl('0000320193', '0000320193-26-000050', 'xslF345X05/doc4.xml');
    expect(url).toBe(
      'https://www.sec.gov/Archives/edgar/data/320193/000032019326000050/xslF345X05/doc4.xml',
    );
  });
});

describe('rawForm4DocPath', () => {
  it('strips the SEC XSL-rendered HTML view prefix to reach the raw ownership XML', () => {
    // The submissions feed lists the styled HTML view path; the raw XML is at the root.
    expect(rawForm4DocPath('xslF345X06/form4.xml')).toBe('form4.xml');
    expect(rawForm4DocPath('xslF345X05/doc4.xml')).toBe('doc4.xml');
  });

  it('leaves an already-raw document path untouched', () => {
    expect(rawForm4DocPath('form4.xml')).toBe('form4.xml');
    expect(rawForm4DocPath('ownership.xml')).toBe('ownership.xml');
  });
});
