/**
 * Single canonical "recommended fixes" derivation.
 *
 * This was duplicated across the service and the repository, and the two copies
 * had already drifted (the repository matched 'SMA200'/'backtesting' keywords
 * the service lacked). This is the union of both, so the evaluate-time and
 * read-time paths now always produce the same fixes for the same gaps.
 */
export function recommendedFixes(gaps: string[], blockers: string[]): string[] {
  const text = [...gaps, ...blockers].join(' ');
  const fixes = new Set<string>();
  if (text.includes('price history') || text.includes('SMA') || text.includes('backtesting')) {
    fixes.add('Sync more historical price data.');
  }
  if (text.includes('latest price')) fixes.add('Refresh latest price data.');
  if (text.includes('Sector') || text.includes('Industry')) fixes.add('Add sector/industry metadata.');
  if (text.includes('Country')) fixes.add('Add country metadata.');
  if (text.includes('Fundamentals')) fixes.add('Sync or add fundamentals.');
  if (text.includes('Volume')) fixes.add('Refresh price history with volume data.');
  return [...fixes];
}
