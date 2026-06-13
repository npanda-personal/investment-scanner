// Index-name normalization / classification leaf utilities extracted from
// MarketDataFoundationService. Free functions, no instance/repository state. Behavior is
// byte-identical to the prior private/public methods.

export function cleanIndexName(value: string): string {
  return value
    .replace(/\s+/g, ' ')
    .replace(/\s+-\s+$/, '')
    .trim();
}

export function isLikelyBseIndexName(value: string): boolean {
  const upper = value.toUpperCase();
  if (!upper || upper.length < 5) return false;
  if (/^(INDEX|CURRENT|CHANGE|% CHANGE|CATEGORY|BROAD|SECTORAL|INVESTMENT STRATEGY|AS ON|COPYRIGHT|DESKTOP SITE)$/.test(upper)) return false;
  if (/^[+-]?\d[\d,.]*%?$/.test(upper)) return false;
  if (upper.includes('BSE LTD')) return false;
  return upper === 'SENSEX' || upper.startsWith('BSE ') || upper.startsWith('S&P BSE ');
}

export function providerSymbolForKnownIndianIndex(upperName: string): string | null {
  const aliases: Record<string, string> = {
    'NIFTY 50': '^NSEI',
    'NIFTY BANK': '^NSEBANK',
    'NIFTY IT': '^CNXIT',
    'NIFTY AUTO': '^CNXAUTO',
    'NIFTY FMCG': '^CNXFMCG',
    'NIFTY PHARMA': '^CNXPHARMA',
    'NIFTY METAL': '^CNXMETAL',
    'NIFTY REALTY': '^CNXREALTY',
    'NIFTY ENERGY': '^CNXENERGY',
    'NIFTY MEDIA': '^CNXMEDIA',
    'NIFTY PSU BANK': '^CNXPSUBANK',
    'NIFTY INFRA': '^CNXINFRA',
    'NIFTY MIDCAP 50': '^NSEMDCP50',
    'SENSEX': '^BSESN',
    'BSE SENSEX': '^BSESN',
    'S&P BSE SENSEX': '^BSESN',
  };
  return aliases[upperName] || null;
}

export function isDerivativesEligibleIndexName(upperName: string): boolean {
  return ['NIFTY 50', 'NIFTY BANK', 'NIFTY FINANCIAL SERVICES', 'NIFTY MIDCAP SELECT', 'NIFTY NEXT 50', 'SENSEX', 'BSE SENSEX', 'S&P BSE SENSEX'].includes(upperName);
}

export function indexPriceSourceForName(name: string): 'NSE_INDEX_EOD' | 'NIFTY_SECTOR_INDEX' {
  return isNseSectorIndexName(name) ? 'NIFTY_SECTOR_INDEX' : 'NSE_INDEX_EOD';
}

export function isNseSectorIndexName(name: string): boolean {
  const upperName = cleanIndexName(name).toUpperCase();
  const sectorNames = new Set([
    'NIFTY AUTO',
    'NIFTY BANK',
    'NIFTY CAPITAL MARKETS',
    'NIFTY CONSUMER DURABLES',
    'NIFTY CONSUMER SERVICES',
    'NIFTY COMMODITIES',
    'NIFTY CPSE',
    'NIFTY ENERGY',
    'NIFTY FINANCIAL SERVICES',
    'NIFTY FINANCIAL SERVICES 25/50',
    'NIFTY FMCG',
    'NIFTY HEALTHCARE INDEX',
    'NIFTY INDIA DEFENCE',
    'NIFTY INDIA CONSUMPTION',
    'NIFTY INFRA',
    'NIFTY INFRASTRUCTURE',
    'NIFTY IT',
    'NIFTY MEDIA',
    'NIFTY METAL',
    'NIFTY MNC',
    'NIFTY OIL & GAS',
    'NIFTY PHARMA',
    'NIFTY PRIVATE BANK',
    'NIFTY PSE',
    'NIFTY PSU BANK',
    'NIFTY REALTY',
    'NIFTY SERVICES SECTOR',
  ]);
  return sectorNames.has(upperName);
}

export function slugForCatalogSymbol(value: string): string {
  return value.toUpperCase().replace(/&/g, ' AND ').replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 80) || 'UNKNOWN';
}

export function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}
