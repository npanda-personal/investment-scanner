/**
 * SG-4 batch peer-parity tests: the LIGHTWEIGHT batch path must derive peer valuation +
 * relative strength from the in-memory batch context (same-sector peers, cohort-isolated).
 */
import { peerAggregates } from '../../../src/modules/signal-generation-engine/signal-peer-aggregates';

function ctxOf(instruments: any[], funds: Record<string, any>, windows: Record<string, any[]>) {
  return {
    instrumentsById: new Map(instruments.map((i) => [i.id, i])),
    fundamentalsByInstrumentId: new Map(Object.entries(funds)),
    priceWindowsByInstrumentId: new Map(Object.entries(windows)),
  };
}
const win = (latest: number, prior: number) => [
  { adjusted_close: latest },
  ...Array.from({ length: 62 }, () => ({ adjusted_close: (latest + prior) / 2 })),
  { adjusted_close: prior },
];

describe('peerAggregates (SG-4)', () => {
  const instruments = [
    { id: 'self', sector: 'Tech' },
    { id: 'p1', sector: 'Tech' },
    { id: 'p2', sector: 'Tech' },
    { id: 'other', sector: 'Energy' }, // different sector — must be ignored
  ];
  const funds = {
    p1: { records: [{ pe_ratio: 20, dividend_yield: 0.02 }] },
    p2: { records: [{ pe_ratio: 30, dividend_yield: 0.04 }] },
    other: { records: [{ pe_ratio: 5, dividend_yield: 0.1 }] }, // must NOT pollute Tech peers
  };
  const windows = {
    self: win(120, 100), // +20%
    p1: win(105, 100),   // +5%
    p2: win(110, 100),   // +10% → peer avg return = 7.5%
    other: win(200, 100),
  };

  it('averages same-sector peer PE/yield and computes relative strength vs sector peers', () => {
    const out = peerAggregates(ctxOf(instruments, funds, windows), instruments[0]);
    expect(out.peerAveragePe).toBeCloseTo(25, 5);        // (20+30)/2, Energy ignored
    expect(out.peerAverageYield).toBeCloseTo(0.03, 5);   // (0.02+0.04)/2
    expect(out.relativeToPeers).toBeCloseTo(0.20 - 0.075, 5); // self 20% − peer avg 7.5%
  });

  it('returns nulls when sector is missing or no batch context', () => {
    expect(peerAggregates(undefined, instruments[0])).toEqual({ peerAveragePe: null, peerAverageYield: null, relativeToPeers: null });
    expect(peerAggregates(ctxOf(instruments, funds, windows), { id: 'x' }).peerAveragePe).toBeNull();
  });

  it('excludes the instrument itself from its own peer set', () => {
    const single = peerAggregates(ctxOf([{ id: 'self', sector: 'Tech' }], {}, { self: win(120, 100) }), { id: 'self', sector: 'Tech' });
    expect(single.peerAveragePe).toBeNull(); // no peers
    expect(single.relativeToPeers).toBeNull();
  });
});
