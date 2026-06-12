/**
 * Crypto ENRICHMENT provider (FREE, commercial-OK sources only).
 *
 *  - Metadata + supply + ATH: CoinPaprika
 *      /tickers?quotes=USD          (one call: supply, market cap, ATH per coin)
 *      /coins/{id}                  (per coin: description, logo, tags, website, genesis)
 *  - Fundamentals (TVL / fees / revenue / yields): DefiLlama (keyless)
 *      /protocols                   (TVL + category + chains per protocol)
 *      /overview/fees?dataType=...  (24h/7d fees & revenue per protocol)
 *
 * Pure HTTP — NO database access (mirrors crypto-provider.ts). All keyless & free.
 */

import { getCryptoEndpoints } from './market-data-foundation.endpoints';

const enrichmentEndpoints = getCryptoEndpoints();
const COINPAPRIKA_BASE = enrichmentEndpoints.coinpaprikaBase.url;
const DEFILLAMA_BASE = enrichmentEndpoints.defillamaBase.url;
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

// ── DefiLlama: protocols (TVL) ──────────────────────────────────────────────
export interface DefiLlamaProtocol {
  slug: string;
  name: string;
  symbol: string | null; // base ticker (uppercased) e.g. AAVE
  category: string | null;
  chains: string[];
  tvlUsd: number | null;
  tvlChange1dPct: number | null;
  tvlChange7dPct: number | null;
}

interface DefiLlamaProtocolRow {
  slug?: string;
  name?: string;
  symbol?: string | null;
  category?: string | null;
  chains?: string[];
  tvl?: number | null;
  change_1d?: number | null;
  change_7d?: number | null;
}

/** All DeFi protocols with TVL. Returns a list; callers index by symbol. */
export async function fetchDefiLlamaProtocols(): Promise<DefiLlamaProtocol[]> {
  const rows = (await fetchJson(`${DEFILLAMA_BASE}/protocols`)) as DefiLlamaProtocolRow[];
  if (!Array.isArray(rows)) return [];
  return rows.map((r) => ({
    slug: String(r.slug || '').trim(),
    name: String(r.name || '').trim(),
    symbol: r.symbol && r.symbol !== '-' ? String(r.symbol).trim().toUpperCase() : null,
    category: r.category ?? null,
    chains: Array.isArray(r.chains) ? r.chains : [],
    tvlUsd: typeof r.tvl === 'number' ? r.tvl : null,
    tvlChange1dPct: typeof r.change_1d === 'number' ? r.change_1d : null,
    tvlChange7dPct: typeof r.change_7d === 'number' ? r.change_7d : null,
  }));
}

// ── DefiLlama: fees & revenue overview (keyed by protocol SLUG) ──────────────
// The /overview/fees rows have NO `symbol` field — they expose `slug` (matching
// /protocols) plus total24h/7d/30d and annualized1y. Revenue is a separate call
// via dataType=dailyRevenue. So we key everything by slug and join via /protocols.
export interface DefiLlamaTotals {
  total24h: number | null;
  total7d: number | null;
  total30d: number | null;
  annualized1y: number | null;
}

interface DefiLlamaOverviewRow {
  slug?: string;
  total24h?: number | null;
  total7d?: number | null;
  total30d?: number | null;
  annualized1y?: number | null;
}

/** /overview/fees keyed by slug. dataType='dailyRevenue' returns revenue instead of fees. */
export async function fetchDefiLlamaOverviewBySlug(dataType?: 'dailyRevenue'): Promise<Map<string, DefiLlamaTotals>> {
  const map = new Map<string, DefiLlamaTotals>();
  const dt = dataType ? `&dataType=${dataType}` : '';
  const body = (await fetchJson(
    `${DEFILLAMA_BASE}/overview/fees?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true${dt}`,
  )) as { protocols?: DefiLlamaOverviewRow[] };
  for (const p of body.protocols ?? []) {
    const slug = String(p.slug || '').trim();
    if (!slug) continue;
    map.set(slug, {
      total24h: p.total24h ?? null,
      total7d: p.total7d ?? null,
      total30d: p.total30d ?? null,
      annualized1y: p.annualized1y ?? null,
    });
  }
  return map;
}

export { COINPAPRIKA_DETAIL_THROTTLE_MS };
