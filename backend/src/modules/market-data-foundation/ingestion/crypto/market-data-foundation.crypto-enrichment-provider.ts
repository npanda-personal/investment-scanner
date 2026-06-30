/**
 * Crypto ENRICHMENT provider — CoinPaprika (FREE, keyless).
 *
 *  - Metadata + supply + ATH: /tickers?quotes=USD
 *  - Per-coin detail: /coins/{id}
 *
 * Pure HTTP — NO database access. DefiLlama fundamentals live in crypto-feeds-provider.ts.
 */

import { getCryptoEndpoints } from '../market-data-foundation.endpoints';

const enrichmentEndpoints = getCryptoEndpoints();
const COINPAPRIKA_BASE = enrichmentEndpoints.coinpaprikaBase.url;
const HTTP_TIMEOUT_MS = Number(process.env.CRYPTO_HTTP_TIMEOUT_MS || 20000);
const COINPAPRIKA_DETAIL_THROTTLE_MS = Number(process.env.CRYPTO_COINPAPRIKA_DETAIL_THROTTLE_MS || 150);

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json', 'User-Agent': 'investment-scanner/crypto-enrich' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// ── CoinPaprika: bulk supply + ATH map ──────────────────────────────────────
export interface CoinPaprikaMarketMeta {
  circulatingSupply: number | null;
  totalSupply: number | null;
  maxSupply: number | null;
  price: number | null;
  marketCap: number | null;
  athPrice: number | null;
  athDate: string | null;
}

interface CoinPaprikaTickerRow {
  id?: string;
  circulating_supply?: number | null;
  total_supply?: number | null;
  max_supply?: number | null;
  quotes?: { USD?: { price?: number | null; market_cap?: number | null; ath_price?: number | null; ath_date?: string | null } };
}

/** One call → Map<coinpaprikaId, supply/ATH/marketCap>. */
export async function fetchCoinPaprikaMarketMetaMap(): Promise<Map<string, CoinPaprikaMarketMeta>> {
  const rows = (await fetchJson(`${COINPAPRIKA_BASE}/tickers?quotes=USD`)) as CoinPaprikaTickerRow[];
  const map = new Map<string, CoinPaprikaMarketMeta>();
  if (!Array.isArray(rows)) return map;
  for (const r of rows) {
    const id = String(r.id || '').trim();
    if (!id) continue;
    map.set(id, {
      circulatingSupply: r.circulating_supply ?? null,
      totalSupply: r.total_supply ?? null,
      maxSupply: r.max_supply ?? null,
      price: r.quotes?.USD?.price ?? null,
      marketCap: r.quotes?.USD?.market_cap ?? null,
      athPrice: r.quotes?.USD?.ath_price ?? null,
      athDate: r.quotes?.USD?.ath_date ?? null,
    });
  }
  return map;
}

// ── CoinPaprika: per-coin descriptive detail ────────────────────────────────
export interface CoinPaprikaCoinDetail {
  description: string | null;
  logoUrl: string | null;
  websiteUrl: string | null;
  categoryTags: string[];
  genesisDate: string | null;
  contractAddresses: Record<string, string> | null;
}

interface CoinPaprikaCoinRow {
  logo?: string;
  description?: string | null;
  started_at?: string | null;
  tags?: Array<{ name?: string }>;
  links?: { website?: string[] };
  contract?: string | null;
  platform?: string | null;
  parent?: { id?: string } | null;
}

export async function fetchCoinPaprikaCoinDetail(coinpaprikaId: string): Promise<CoinPaprikaCoinDetail> {
  const c = (await fetchJson(`${COINPAPRIKA_BASE}/coins/${encodeURIComponent(coinpaprikaId)}`)) as CoinPaprikaCoinRow;
  const tags = Array.isArray(c.tags) ? c.tags.map((t) => String(t?.name || '').trim()).filter(Boolean) : [];
  const website = c.links?.website?.find((w) => !!w) ?? null;
  const contractAddresses = c.contract ? { [c.platform || c.parent?.id || 'chain']: c.contract } : null;
  return {
    description: c.description?.trim() || null,
    logoUrl: c.logo?.trim() || null,
    websiteUrl: website,
    categoryTags: tags,
    genesisDate: c.started_at || null,
    contractAddresses,
  };
}

export { COINPAPRIKA_DETAIL_THROTTLE_MS };
