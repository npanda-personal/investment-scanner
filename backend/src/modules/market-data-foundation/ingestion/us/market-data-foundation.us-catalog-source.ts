/**
 * US equity universe catalog (FREE — NASDAQ Trader symbol directory).
 *
 *  - nasdaqlisted.txt : all NASDAQ-listed securities
 *  - otherlisted.txt  : NYSE / NYSE American (AMEX) / ARCA / BATS / IEX
 *
 * Both are pipe-delimited public files, no key required:
 *   https://www.nasdaqtrader.com/dynamic/SymDir/nasdaqlisted.txt
 *   https://www.nasdaqtrader.com/dynamic/SymDir/otherlisted.txt
 *
 * Pure fetch+parse — returns catalog candidates; persistence is the ingestion
 * service's job (shared equity tables, region='US').  No paid source.
 */

import { nasdaqListedUrl, nasdaqOtherUrl } from '../market-data-foundation.endpoints';
import { marketDataFetchText } from '../market-data-foundation.http';

const HTTP_TIMEOUT_MS = Number(process.env.MARKET_DATA_CATALOG_DOWNLOAD_TIMEOUT_MS || 15000);

export interface UsUniverseCandidate {
  /** Canonical ticker, e.g. AAPL. */
  symbol: string;
  name: string;
  exchange: 'NASDAQ' | 'NYSE' | 'AMEX' | 'ARCA' | 'BATS' | 'IEX';
  assetType: 'STOCK' | 'ETF';
  catalogSource: 'NASDAQ_TRADER_LISTED' | 'NASDAQ_TRADER_OTHER';
}

export interface UsUniverseResult {
  candidates: UsUniverseCandidate[];
  warnings: string[];
}

/** NYSE "otherlisted" single-letter exchange codes → our exchange labels. */
const OTHER_EXCHANGE_MAP: Record<string, UsUniverseCandidate['exchange']> = {
  A: 'AMEX', // NYSE American
  N: 'NYSE',
  P: 'ARCA', // NYSE Arca
  Z: 'BATS',
  V: 'IEX',
};

// Keep plain tickers only (A–Z, 0–9).  Drops warrants/units/preferreds
// (e.g. ABC.WS, ABCW, BRK.B) whose Stooq coverage is unreliable for v1.
const PLAIN_TICKER_RE = /^[A-Z0-9]{1,6}$/;

async function fetchText(url: string): Promise<string> {
  return marketDataFetchText(url, {
    accept: 'text/plain',
    userAgent: 'investment-scanner/us-catalog',
    timeoutMs: HTTP_TIMEOUT_MS,
  });
}

/** Split a pipe-delimited file into header + data rows, dropping the footer. */
function parsePipeFile(text: string): { header: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return { header: [], rows: [] };
  const header = lines[0].split('|');
  const rows: string[][] = [];
  for (const line of lines.slice(1)) {
    // Footer is "File Creation Time: ...".
    if (line.startsWith('File Creation Time')) continue;
    rows.push(line.split('|'));
  }
  return { header, rows };
}

function parseNasdaqListed(text: string, warnings: string[]): UsUniverseCandidate[] {
  // Symbol|Security Name|Market Category|Test Issue|Financial Status|Round Lot Size|ETF|NextShares
  const { rows } = parsePipeFile(text);
  const out: UsUniverseCandidate[] = [];
  for (const cols of rows) {
    const symbol = (cols[0] || '').trim().toUpperCase();
    const name = (cols[1] || '').trim();
    const testIssue = (cols[3] || '').trim().toUpperCase();
    const etf = (cols[6] || '').trim().toUpperCase();
    if (!symbol || testIssue === 'Y' || !PLAIN_TICKER_RE.test(symbol)) continue;
    out.push({
      symbol,
      name: name || symbol,
      exchange: 'NASDAQ',
      assetType: etf === 'Y' ? 'ETF' : 'STOCK',
      catalogSource: 'NASDAQ_TRADER_LISTED',
    });
  }
  if (out.length === 0) warnings.push('nasdaqlisted.txt yielded 0 candidates.');
  return out;
}

function parseOtherListed(text: string, warnings: string[]): UsUniverseCandidate[] {
  // ACT Symbol|Security Name|Exchange|CQS Symbol|ETF|Round Lot Size|Test Issue|NASDAQ Symbol
  const { rows } = parsePipeFile(text);
  const out: UsUniverseCandidate[] = [];
  for (const cols of rows) {
    const symbol = (cols[0] || '').trim().toUpperCase();
    const name = (cols[1] || '').trim();
    const exchangeCode = (cols[2] || '').trim().toUpperCase();
    const etf = (cols[4] || '').trim().toUpperCase();
    const testIssue = (cols[6] || '').trim().toUpperCase();
    const exchange = OTHER_EXCHANGE_MAP[exchangeCode];
    if (!symbol || testIssue === 'Y' || !exchange || !PLAIN_TICKER_RE.test(symbol)) continue;
    out.push({
      symbol,
      name: name || symbol,
      exchange,
      assetType: etf === 'Y' ? 'ETF' : 'STOCK',
      catalogSource: 'NASDAQ_TRADER_OTHER',
    });
  }
  if (out.length === 0) warnings.push('otherlisted.txt yielded 0 candidates.');
  return out;
}

/**
 * Fetch the full US listed universe from NASDAQ Trader.  De-duplicates by ticker
 * (NASDAQ listing wins over otherlisted).  No market-cap is available here; the
 * caller ranks/limits, and a later companyfacts pass backfills Stock.marketCap.
 */
export async function fetchNasdaqTraderUniverse(): Promise<UsUniverseResult> {
  const warnings: string[] = [];
  const [listedText, otherText] = await Promise.all([
    fetchText(nasdaqListedUrl()),
    fetchText(nasdaqOtherUrl()),
  ]);

  const seen = new Set<string>();
  const candidates: UsUniverseCandidate[] = [];
  for (const candidate of [...parseNasdaqListed(listedText, warnings), ...parseOtherListed(otherText, warnings)]) {
    if (seen.has(candidate.symbol)) continue;
    seen.add(candidate.symbol);
    candidates.push(candidate);
  }

  // Deterministic order (alphabetical) so --limit is stable until market-cap ranks.
  candidates.sort((a, b) => a.symbol.localeCompare(b.symbol));
  return { candidates, warnings };
}
