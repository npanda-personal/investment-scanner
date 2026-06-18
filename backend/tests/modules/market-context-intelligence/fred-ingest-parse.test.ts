/// <reference types="@types/jest" />

// prisma is mocked so importing the ingest service (which imports prisma) does
// not open a DB connection. We only exercise the pure parseFredValue helper.
jest.mock('../../../src/db/prisma', () => ({
  __esModule: true,
  default: {
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn().mockResolvedValue(0),
  },
}));

import { parseFredValue, getFredApiKey } from '../../../src/modules/market-context-intelligence/market-context-intelligence.fred-ingest.service';

describe('parseFredValue', () => {
  it('treats FRED missing-value "." as null', () => {
    expect(parseFredValue('.')).toBeNull();
  });

  it('parses numeric strings', () => {
    expect(parseFredValue('3.6')).toBe(3.6);
    expect(parseFredValue('  78.25 ')).toBe(78.25);
    expect(parseFredValue('0')).toBe(0);
  });

  it('returns null for empty / non-numeric / nullish values', () => {
    expect(parseFredValue('')).toBeNull();
    expect(parseFredValue('   ')).toBeNull();
    expect(parseFredValue('n/a')).toBeNull();
    expect(parseFredValue(null)).toBeNull();
    expect(parseFredValue(undefined)).toBeNull();
  });
});

describe('getFredApiKey', () => {
  const original = process.env.FRED_API_KEY;
  afterEach(() => {
    if (original === undefined) delete process.env.FRED_API_KEY;
    else process.env.FRED_API_KEY = original;
  });

  it('returns null when the key is unset or blank', () => {
    delete process.env.FRED_API_KEY;
    expect(getFredApiKey()).toBeNull();
    process.env.FRED_API_KEY = '   ';
    expect(getFredApiKey()).toBeNull();
  });

  it('returns the trimmed key when set', () => {
    process.env.FRED_API_KEY = ' abc123 ';
    expect(getFredApiKey()).toBe('abc123');
  });
});
