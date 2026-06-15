import {
  fetchPortfolios,
  fetchPortfolioSummary,
  type PortfolioSummary,
} from '@/features/portfolio-management';
import {
  fetchWatchlistDetail,
  fetchWatchlists,
  type WatchlistDetail,
} from '@/features/watchlist-management';
import type {
  DailyReviewShortlistResult,
  OverlayMaps,
} from './dailyReviewShortlistService';

/**
 * Personal Portfolio / Watchlist membership overlay for the Daily Review Shortlist.
 *
 * This is deliberately split out of the main shortlist load: it is an N+1 fan-out
 * (one `/portfolios/:id/summary` per portfolio + one `/watchlists/:id` per watchlist,
 * each enriching items from the DB) and is the slowest branch of the page. It is
 * loaded AFTER the shortlist table has painted from the fast persisted snapshots, then
 * merged into the already-rendered rows — so it only adds the membership badges, never
 * blocks first paint. All reads remain persisted (no live provider fetch).
 */
export async function fetchDailyReviewOverlays(): Promise<OverlayMaps> {
  const [portfoliosSettled, watchlistsSettled] = await Promise.allSettled([
    loadPortfolioOverlays(),
    loadWatchlistOverlays(),
  ]);

  return {
    portfolioNamesBySymbol: portfoliosSettled.status === 'fulfilled' ? portfoliosSettled.value : new Map(),
    watchlistNamesBySymbol: watchlistsSettled.status === 'fulfilled' ? watchlistsSettled.value : new Map(),
  };
}

/**
 * Pure merge of the loaded overlay into an existing shortlist result. Returns a new
 * result with each row's portfolio/watchlist names + source-contribution chips updated
 * and the source-contribution panel's overlay counts recomputed. Rows with no overlay
 * membership are returned unchanged (referentially) so React only re-renders the rows
 * that actually gained a badge.
 */
export function applyOverlaysToShortlist(
  result: DailyReviewShortlistResult,
  overlays: OverlayMaps,
): DailyReviewShortlistResult {
  const rows = result.rows.map((row) => {
    const key = normalizeSymbol(row.symbol);
    const portfolioNames = overlays.portfolioNamesBySymbol.get(key) ?? [];
    const watchlistNames = overlays.watchlistNamesBySymbol.get(key) ?? [];
    if (portfolioNames.length === 0 && watchlistNames.length === 0) return row;
    const label = portfolioNames.length > 0 && watchlistNames.length > 0
      ? 'Portfolio / Watchlist'
      : portfolioNames.length > 0 ? 'Portfolio' : 'Watchlist';
    const overlaySentence = overlaySentenceFor(portfolioNames, watchlistNames);
    return {
      ...row,
      portfolioNames,
      watchlistNames,
      sourceContributions: [...new Set([...row.sourceContributions, label])],
      // Mirror the explainability "Personal overlay: …" line the synchronous build used to add,
      // so the expanded-row reasoning list stays identical once the overlay merges in.
      explainability: overlaySentence ? [...row.explainability, overlaySentence] : row.explainability,
    };
  });

  const sourceContributions = result.sourceContributions.map((entry) => {
    if (entry.source === 'Portfolio overlay') {
      return {
        ...entry,
        selectedCount: rows.filter((row) => row.portfolioNames.length > 0).length,
        availableCount: overlays.portfolioNamesBySymbol.size,
      };
    }
    if (entry.source === 'Watchlist overlay') {
      return {
        ...entry,
        selectedCount: rows.filter((row) => row.watchlistNames.length > 0).length,
        availableCount: overlays.watchlistNamesBySymbol.size,
      };
    }
    return entry;
  });

  return { ...result, rows, sourceContributions };
}

async function loadPortfolioOverlays(): Promise<Map<string, string[]>> {
  const portfolios = await fetchPortfolios();
  const summaries = await Promise.allSettled(portfolios.map((portfolio) => fetchPortfolioSummary(portfolio.id)));
  const map = new Map<string, string[]>();

  summaries.forEach((summary) => {
    if (summary.status !== 'fulfilled') return;
    addPortfolioSummaryToMap(map, summary.value);
  });

  return map;
}

function addPortfolioSummaryToMap(map: Map<string, string[]>, summary: PortfolioSummary) {
  summary.holdings.forEach((holding) => {
    const symbol = normalizeSymbol(holding.symbol);
    if (!symbol) return;
    const names = map.get(symbol) ?? [];
    if (!names.includes(summary.portfolio.name)) names.push(summary.portfolio.name);
    map.set(symbol, names);
  });
}

async function loadWatchlistOverlays(): Promise<Map<string, string[]>> {
  const watchlists = await fetchWatchlists();
  const details = await Promise.allSettled(watchlists.map((watchlist) => fetchWatchlistDetail(watchlist.id)));
  const map = new Map<string, string[]>();

  details.forEach((detail) => {
    if (detail.status !== 'fulfilled') return;
    addWatchlistDetailToMap(map, detail.value);
  });

  return map;
}

function addWatchlistDetailToMap(map: Map<string, string[]>, detail: WatchlistDetail) {
  detail.items.forEach((item) => {
    const symbol = normalizeSymbol(item.symbol);
    if (!symbol) return;
    const names = map.get(symbol) ?? [];
    if (!names.includes(detail.watchlist.name)) names.push(detail.watchlist.name);
    map.set(symbol, names);
  });
}

function overlaySentenceFor(portfolios: string[], watchlists: string[]): string | null {
  const parts = [];
  if (portfolios.length > 0) parts.push(`Portfolio: ${portfolios.join(', ')}`);
  if (watchlists.length > 0) parts.push(`Watchlist: ${watchlists.join(', ')}`);
  return parts.length > 0 ? `Personal overlay: ${parts.join('; ')}.` : null;
}

function normalizeSymbol(value: string | null | undefined): string {
  return String(value || '').trim().toUpperCase();
}
