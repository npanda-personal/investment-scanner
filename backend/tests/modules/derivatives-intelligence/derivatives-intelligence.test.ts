/// <reference types="@types/jest" />
import type { Request, Response } from 'express';
import { deflateRawSync } from 'zlib';
import { parseFoBhavcopy, extractFirstCsvFromZip } from '../../../src/modules/derivatives-intelligence/derivatives-intelligence.fo-bhavcopy.service';

// ---------------------------------------------------------------------------
// parseFoBhavcopy — header-mapped UDiFF parsing
// ---------------------------------------------------------------------------

describe('parseFoBhavcopy', () => {
  const HEADER = [
    'TradDt', 'BizDt', 'Sgmt', 'Src', 'FinInstrmTp', 'FinInstrmId', 'ISIN',
    'TckrSymb', 'SctySrs', 'XpryDt', 'FininstrmActlXpryDt', 'StrkPric', 'OptnTp',
    'FinInstrmNm', 'OpnPric', 'HghPric', 'LwPric', 'ClsPric', 'LastPric',
    'PrvsClsgPric', 'UndrlygPric', 'SttlmPric', 'OpnIntrst', 'ChngInOpnIntrst',
    'TtlTradgVol', 'TtlTrfVal', 'TtlNbOfTxsExctd', 'SsnId', 'NewBrdLotQty',
  ].join(',');

  function row(overrides: Record<string, string>): string {
    const base: Record<string, string> = {
      TradDt: '2026-06-05', BizDt: '2026-06-05', Sgmt: 'FO', Src: 'NSE',
      FinInstrmTp: 'STF', FinInstrmId: '1', ISIN: 'X', TckrSymb: 'RELIANCE',
      SctySrs: '', XpryDt: '2026-06-25', FininstrmActlXpryDt: '2026-06-25',
      StrkPric: '0', OptnTp: '', FinInstrmNm: 'RELIANCE', OpnPric: '100',
      HghPric: '110', LwPric: '99', ClsPric: '105', LastPric: '105',
      PrvsClsgPric: '100', UndrlygPric: '1450.50', SttlmPric: '1452.00',
      OpnIntrst: '120000', ChngInOpnIntrst: '5000', TtlTradgVol: '8000',
      TtlTrfVal: '116000000', TtlNbOfTxsExctd: '50', SsnId: 'R', NewBrdLotQty: '250',
    };
    const merged = { ...base, ...overrides };
    return HEADER.split(',').map((h) => merged[h] ?? '').join(',');
  }

  it('parses a stock futures row with sentinels and lot size', () => {
    const csv = [HEADER, row({})].join('\n');
    const { tradingDate, rows } = parseFoBhavcopy(csv);
    expect(tradingDate).toBe('2026-06-05');
    expect(rows).toHaveLength(1);
    const r = rows[0];
    expect(r.instrumentType).toBe('FUTSTK');
    expect(r.underlying).toBe('RELIANCE');
    expect(r.expiryDate).toBe('2026-06-25');
    expect(r.strikePrice).toBe(0);       // futures sentinel
    expect(r.optionType).toBe('XX');     // futures sentinel
    expect(r.openInterest).toBe(120000);
    expect(r.changeInOi).toBe(5000);
    expect(r.underlyingPrice).toBeCloseTo(1450.5);
    expect(r.lotSize).toBe(250);
    expect(r.tradingDate).toBe('2026-06-05');
  });

  it('normalizes all four UDiFF instrument-type codes', () => {
    const csv = [
      HEADER,
      row({ FinInstrmTp: 'IDF', TckrSymb: 'NIFTY' }),
      row({ FinInstrmTp: 'STF', TckrSymb: 'TCS' }),
      row({ FinInstrmTp: 'IDO', TckrSymb: 'NIFTY', StrkPric: '25000', OptnTp: 'CE' }),
      row({ FinInstrmTp: 'STO', TckrSymb: 'TCS', StrkPric: '4000', OptnTp: 'PE' }),
    ].join('\n');
    const { rows } = parseFoBhavcopy(csv);
    expect(rows.map((r) => r.instrumentType)).toEqual(['FUTIDX', 'FUTSTK', 'OPTIDX', 'OPTSTK']);
    // Option rows keep strike + CE/PE; futures get sentinels
    expect(rows[2].strikePrice).toBe(25000);
    expect(rows[2].optionType).toBe('CE');
    expect(rows[3].optionType).toBe('PE');
    expect(rows[0].strikePrice).toBe(0);
    expect(rows[0].optionType).toBe('XX');
  });

  it('skips rows with unknown instrument type', () => {
    const csv = [HEADER, row({ FinInstrmTp: 'WAT' }), row({})].join('\n');
    const { rows } = parseFoBhavcopy(csv);
    expect(rows).toHaveLength(1);
  });

  it('returns empty for a header-only / malformed file', () => {
    expect(parseFoBhavcopy('').rows).toHaveLength(0);
    expect(parseFoBhavcopy(HEADER).rows).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// extractFirstCsvFromZip — EOCD scan + inflateRawSync round-trip
// ---------------------------------------------------------------------------

/** Build a minimal single-entry ZIP (deflate, method 8) around the given content. */
function buildZip(fileName: string, content: string): Buffer {
  const nameBuf = Buffer.from(fileName, 'utf8');
  const raw = Buffer.from(content, 'utf8');
  const compressed = deflateRawSync(raw);

  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4);        // version needed
  local.writeUInt16LE(0, 6);         // flags
  local.writeUInt16LE(8, 8);         // method = deflate
  local.writeUInt16LE(0, 10);        // mod time
  local.writeUInt16LE(0, 12);        // mod date
  local.writeUInt32LE(0, 14);        // crc32 (not verified by extractor)
  local.writeUInt32LE(compressed.length, 18);
  local.writeUInt32LE(raw.length, 22);
  local.writeUInt16LE(nameBuf.length, 26);
  local.writeUInt16LE(0, 28);        // extra length
  const localBlock = Buffer.concat([local, nameBuf, compressed]);

  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4);      // version made by
  central.writeUInt16LE(20, 6);      // version needed
  central.writeUInt16LE(0, 8);       // flags
  central.writeUInt16LE(8, 10);      // method
  central.writeUInt16LE(0, 12);      // mod time
  central.writeUInt16LE(0, 14);      // mod date
  central.writeUInt32LE(0, 16);      // crc32
  central.writeUInt32LE(compressed.length, 20);
  central.writeUInt32LE(raw.length, 24);
  central.writeUInt16LE(nameBuf.length, 28);
  central.writeUInt16LE(0, 30);      // extra length
  central.writeUInt16LE(0, 32);      // comment length
  central.writeUInt16LE(0, 34);      // disk number start
  central.writeUInt16LE(0, 36);      // internal attrs
  central.writeUInt32LE(0, 38);      // external attrs
  central.writeUInt32LE(0, 42);      // local header offset
  const centralBlock = Buffer.concat([central, nameBuf]);

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);          // disk number
  eocd.writeUInt16LE(0, 6);          // disk with cd
  eocd.writeUInt16LE(1, 8);          // entries on disk
  eocd.writeUInt16LE(1, 10);         // total entries
  eocd.writeUInt32LE(centralBlock.length, 12); // cd size
  eocd.writeUInt32LE(localBlock.length, 16);   // cd offset
  eocd.writeUInt16LE(0, 20);         // comment length

  return Buffer.concat([localBlock, centralBlock, eocd]);
}

describe('extractFirstCsvFromZip', () => {
  it('inflates a deflate-compressed CSV entry (round-trip)', () => {
    const content = 'TradDt,FinInstrmTp,TckrSymb\n2026-06-05,STF,RELIANCE\n';
    const zip = buildZip('BhavCopy_NSE_FO_0_0_0_20260605_F_0000.csv', content);
    expect(extractFirstCsvFromZip(zip)).toBe(content);
  });

  it('throws when no CSV entry is present', () => {
    const zip = buildZip('readme.txt', 'not a csv');
    expect(() => extractFirstCsvFromZip(zip)).toThrow(/no CSV entry/i);
  });
});

// ---------------------------------------------------------------------------
// Controller — GET is persisted-read only (never ingests / computes)
// ---------------------------------------------------------------------------

jest.mock('../../../src/modules/derivatives-intelligence/derivatives-intelligence.fo-bhavcopy.service', () => {
  const actual = jest.requireActual('../../../src/modules/derivatives-intelligence/derivatives-intelligence.fo-bhavcopy.service');
  return {
    ...actual,
    ingestFoBhavcopy: jest.fn(),
    getLatestFoBhavcopyMeta: jest.fn(),
  };
});
jest.mock('../../../src/modules/derivatives-intelligence/derivatives-intelligence.oi-buildup.service', () => ({
  computeOiBuildup: jest.fn(),
  getLatestOiBuildup: jest.fn(),
}));

import { DerivativesIntelligenceController } from '../../../src/modules/derivatives-intelligence/derivatives-intelligence.controller';
import * as bhavcopySvc from '../../../src/modules/derivatives-intelligence/derivatives-intelligence.fo-bhavcopy.service';
import * as buildupSvc from '../../../src/modules/derivatives-intelligence/derivatives-intelligence.oi-buildup.service';

function responseMock() {
  const res = {
    setHeader: jest.fn().mockReturnThis(),
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res as unknown as Response & { setHeader: jest.Mock; status: jest.Mock; json: jest.Mock };
}

describe('DerivativesIntelligenceController.oiBuildup (persisted-read)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('serves persisted OI-buildup and never ingests or computes', async () => {
    const fixture = {
      status: 'ready',
      tradingDate: '2026-06-05',
      fetchedAt: '2026-06-07T00:00:00.000Z',
      rows: [{ underlying: 'WIPRO', instrumentType: 'FUTSTK', totalOi: 100, oiChange: 10, oiChangePct: 1, price: 200, priceChangePct: -2, buildupLabel: 'SHORT_BUILDUP', derivativesEligible: true }],
    };
    (buildupSvc.getLatestOiBuildup as jest.Mock).mockResolvedValue(fixture);

    const controller = new DerivativesIntelligenceController();
    const req = { query: { eligibleOnly: 'true', limit: '50' } } as unknown as Request;
    const res = responseMock();

    await controller.oiBuildup(req, res);

    expect(buildupSvc.getLatestOiBuildup).toHaveBeenCalledWith({ limit: 50, eligibleOnly: true });
    expect(bhavcopySvc.ingestFoBhavcopy).not.toHaveBeenCalled();
    expect(buildupSvc.computeOiBuildup).not.toHaveBeenCalled();
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
    expect(res.json).toHaveBeenCalledWith(fixture);
  });

  it('foBhavcopyIngest (POST) ingests then computes buildup', async () => {
    (bhavcopySvc.ingestFoBhavcopy as jest.Mock).mockResolvedValue({ status: 'success', tradingDate: '2026-06-05', rowsUpserted: 100 });
    (buildupSvc.computeOiBuildup as jest.Mock).mockResolvedValue({ status: 'success', tradingDate: '2026-06-05', underlyingsComputed: 5 });

    const controller = new DerivativesIntelligenceController();
    const req = { query: {} } as unknown as Request;
    const res = responseMock();

    await controller.foBhavcopyIngest(req, res);

    expect(bhavcopySvc.ingestFoBhavcopy).toHaveBeenCalled();
    expect(buildupSvc.computeOiBuildup).toHaveBeenCalledWith('2026-06-05');
    expect(res.json).toHaveBeenCalled();
  });
});
