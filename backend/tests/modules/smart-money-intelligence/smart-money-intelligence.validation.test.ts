/// <reference types="@types/jest" />
import { parseLimit, parseOffset, parseRange } from '../../../src/modules/smart-money-intelligence';

describe('smart money validation', () => {
  it('clamps limit query params', () => {
    expect(parseLimit('0')).toBe(1);
    expect(parseLimit('500')).toBe(100);
    expect(parseLimit('15')).toBe(15);
  });

  it('parses supported ranges with fallback', () => {
    expect(parseRange('1M')).toBe('1M');
    expect(parseRange('6M')).toBe('6M');
    expect(parseRange('bad')).toBe('3M');
  });

  it('parses non-negative offsets', () => {
    expect(parseOffset('25')).toBe(25);
    expect(parseOffset('-10')).toBe(0);
    expect(parseOffset('bad')).toBe(0);
  });
});
