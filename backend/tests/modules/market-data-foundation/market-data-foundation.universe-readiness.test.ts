/// <reference types="@types/jest" />
import { UniverseReadinessService } from '../../../src/modules/market-data-foundation/quality/market-data-foundation.universe-readiness';

function makeHost() {
  return {
    readPositiveNumber: (_val: string | undefined, fallback: number) => fallback,
    endOfTradingDateUtc: (dateStr: string | null) =>
      dateStr ? new Date(`${dateStr}T23:59:59Z`) : new Date(),
  } as any;
}

describe('UniverseReadinessService.providerValidationWindow – region-aware history floor', () => {
  const now = new Date('2026-06-18T12:00:00Z'); // Wednesday — stable reference date

  it('US region uses a 5-year minimum history floor', () => {
    const svc = new UniverseReadinessService(makeHost());
    const result = svc.providerValidationWindow({ region: 'US', assetType: 'STOCK' }, now);
    const years =
      (new Date(result.endDate).getTime() - new Date(result.defaultRequiredHistoryStartDateIso).getTime()) /
      (365.25 * 86_400_000);
    expect(Math.round(years)).toBe(5);
  });

  it('IN region uses a 15-year minimum history floor', () => {
    const svc = new UniverseReadinessService(makeHost());
    const result = svc.providerValidationWindow({ region: 'IN', assetType: 'STOCK' }, now);
    const years =
      (new Date(result.endDate).getTime() - new Date(result.defaultRequiredHistoryStartDateIso).getTime()) /
      (365.25 * 86_400_000);
    expect(Math.round(years)).toBe(15);
  });

  it('EU region uses the 15-year floor (same as IN)', () => {
    const svc = new UniverseReadinessService(makeHost());
    const result = svc.providerValidationWindow({ region: 'EU', assetType: 'STOCK' }, now);
    const years =
      (new Date(result.endDate).getTime() - new Date(result.defaultRequiredHistoryStartDateIso).getTime()) /
      (365.25 * 86_400_000);
    expect(Math.round(years)).toBe(15);
  });
});
