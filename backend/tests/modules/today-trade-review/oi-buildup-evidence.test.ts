/// <reference types="@types/jest" />
import { TodayTradeReviewService } from '../../../src/modules/today-trade-review/today-trade-review.service';
import type { OiBuildupRow } from '../../../src/modules/derivatives-intelligence/derivatives-intelligence.oi-buildup.service';

// oiBuildupEvidence is a pure private method (uses only its args, not `this`),
// so we can exercise it via the prototype without constructing the service.
const evidence = (symbol: string, map: Map<string, OiBuildupRow>): string | null =>
  (TodayTradeReviewService.prototype as any).oiBuildupEvidence.call({}, symbol, map);

function row(label: OiBuildupRow['buildupLabel'], oiChangePct: number | null): OiBuildupRow {
  return {
    underlying: 'WIPRO', instrumentType: 'FUTSTK', totalOi: 100, oiChange: 10,
    oiChangePct, price: 200, priceChangePct: -2, buildupLabel: label, derivativesEligible: true,
  };
}

describe('TodayTradeReviewService.oiBuildupEvidence (short-pipeline OI corroboration)', () => {
  it('confirms a short setup when futures show SHORT_BUILDUP', () => {
    const map = new Map([['WIPRO', row('SHORT_BUILDUP', 3.4)]]);
    const msg = evidence('WIPRO', map);
    expect(msg).toMatch(/SHORT BUILDUP/);
    expect(msg).toMatch(/consistent with the bearish setup/);
    expect(msg).toMatch(/OI \+3\.4%/);
  });

  it('flags a contradiction when futures show SHORT_COVERING', () => {
    const map = new Map([['WIPRO', row('SHORT_COVERING', -1.2)]]);
    const msg = evidence('WIPRO', map);
    expect(msg).toMatch(/SHORT COVERING/);
    expect(msg).toMatch(/contradicts the bearish setup/);
  });

  it('flags a contradiction when futures show LONG_BUILDUP', () => {
    const map = new Map([['WIPRO', row('LONG_BUILDUP', 2.0)]]);
    expect(evidence('WIPRO', map)).toMatch(/contradicts the bearish setup/);
  });

  it('is case-insensitive on the symbol lookup', () => {
    const map = new Map([['WIPRO', row('SHORT_BUILDUP', 1)]]);
    expect(evidence('wipro', map)).toMatch(/SHORT BUILDUP/);
  });

  it('returns null when no OI buildup exists for the symbol', () => {
    expect(evidence('TCS', new Map())).toBeNull();
  });

  it('returns null for a NEUTRAL buildup (no corroboration to surface)', () => {
    const map = new Map([['WIPRO', row('NEUTRAL', 0)]]);
    expect(evidence('WIPRO', map)).toBeNull();
  });
});
