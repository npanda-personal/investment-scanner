/**
 * SG-1 service-level region-isolation tests.
 *
 * The signal-scope.test.ts suite proves the resolver contract; this suite proves the
 * two flips that actually SHIP at the service layer:
 *
 *  1. An unscoped generation NO LONGER assumes India — it resolves the GLOBAL profile,
 *     so NSE-only delivery% is NOT attached (the old `canonicalRegion || 'IN'` default
 *     would have attached it).  Selecting nothing must not surface IN-flavoured data.
 *  2. An explicit region:'IN' run DOES attach delivery% (the IN capability is real).
 *
 * This is the regression guard for the "US/EU must never surface IN data" requirement
 * at the layer where the leak actually lived.
 */
import { SignalGenerationEngineService } from '../../../src/modules/signal-generation-engine';

const price = (index: number, adjustedClose: number, volume = 100) => ({
  date: new Date(2026, 3, 28 - index).toISOString(),
  open: adjustedClose,
  high: adjustedClose + 1,
  low: adjustedClose - 1,
  close: adjustedClose,
  adjusted_close: adjustedClose,
  volume,
});

function makeService(deliveryPercent: number) {
  const prices = Array.from({ length: 260 }, (_, i) => price(i, 200 - i * 0.2, i === 0 ? 1000 : 100));
  const repository = {
    createSignalResult: jest.fn(async (result: any) => ({ ...result, id: 'sig-iso-1' })),
  };
  const marketDataService = {
    getInstrument: jest.fn().mockResolvedValue({
      id: 'stock-iso', symbol: 'RELIANCE', company_name: 'Reliance', sector: 'Energy',
      country: 'IN', currency: 'INR',
    }),
    listPricesByInstrumentId: jest.fn().mockResolvedValue({ prices, delivery_percent: deliveryPercent }),
    storedFundamentalsByInstrumentId: jest.fn().mockResolvedValue({ records: [] }),
  };
  const researchService = { workbench: jest.fn().mockResolvedValue(null) };
  return new SignalGenerationEngineService(repository as any, marketDataService as any, researchService as any);
}

describe('SG-1 region isolation — service layer', () => {
  it('does NOT attach NSE delivery% for an UNSCOPED run (no India assumption)', async () => {
    const service = makeService(62);
    const result = await service.generateForInstrument('stock-iso', { researchContextMode: 'LIGHTWEIGHT' });
    // GLOBAL profile has no delivery capability → delivery must be absent even though
    // the price row carries delivery_percent and the instrument's country is IN.
    expect(result?.deliveryPercent ?? null).toBeNull();
    expect(result?.deliveryEvidence ?? null).toBeNull();
    expect(result?.explanation).not.toContain('Delivery');
  });

  it('DOES attach NSE delivery% when explicitly scoped to region:IN', async () => {
    const service = makeService(62);
    const result = await service.generateForInstrument('stock-iso', { researchContextMode: 'LIGHTWEIGHT', region: 'IN' });
    expect(result?.deliveryPercent).toBe(62);
    expect(result?.deliveryEvidence).toBe('Delivery 62% (high conviction).');
  });

  it('does NOT attach NSE delivery% when scoped to region:US (cross-market isolation)', async () => {
    const service = makeService(62);
    const result = await service.generateForInstrument('stock-iso', { researchContextMode: 'LIGHTWEIGHT', region: 'US' });
    expect(result?.deliveryPercent ?? null).toBeNull();
    expect(result?.deliveryEvidence ?? null).toBeNull();
  });
});
