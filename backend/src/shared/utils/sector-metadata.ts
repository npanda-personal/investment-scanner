const UNKNOWN_SECTOR_VALUES = new Set(['', 'unknown', 'n/a', 'na', 'null']);

export function isKnownSector(value: unknown): boolean {
  const normalized = String(value ?? '').trim().toLowerCase();
  return !UNKNOWN_SECTOR_VALUES.has(normalized);
}

export function unknownSectorExplanation(value: unknown): string {
  const label = String(value ?? 'null').trim() || 'blank';
  return `Sector ${label} is a metadata gap and is not ranked as sector leadership evidence.`;
}

export const unknownSectorFilterValues = ['', 'Unknown', 'unknown', 'UNKNOWN', 'N/A', 'n/a', 'NA', 'na', 'null', 'NULL'];
