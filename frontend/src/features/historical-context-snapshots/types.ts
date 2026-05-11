export interface SnapshotCount {
  inserted: number;
  updated: number;
  skipped: number;
}

export interface SnapshotGenerateSummary {
  snapshotDate: string;
  region: string;
  assetType: string;
  market: SnapshotCount;
  sectors: SnapshotCount;
  countries: SnapshotCount;
  smartMoney: SnapshotCount;
  dataQuality: SnapshotCount;
  warnings: string[];
}

export interface SnapshotCoverage {
  marketSnapshots: number;
  sectorSnapshots: number;
  countrySnapshots: number;
  smartMoneySnapshots: number;
  dataQualitySnapshots: number;
  latestSnapshotDate: string | null;
  warnings: string[];
}

export interface MarketContextSnapshot {
  id: string;
  snapshotDate: string;
  region?: string;
  regime: string;
  regimeScore: number;
  breadthPercentAboveSma50: number | null;
  breadthPercentAboveSma200: number | null;
  macroStatus: string | null;
  dataStatus: string;
}

export interface SectorContextSnapshot {
  id: string;
  snapshotDate: string;
  region?: string;
  sector: string;
  relativeStrengthScore: number;
  leadershipStatus: string;
  instrumentCount: number;
  dataStatus: string;
}

export interface CountryContextSnapshot {
  id: string;
  snapshotDate: string;
  region?: string;
  country: string;
  relativeStrengthScore: number;
  dataStatus: string;
}

export interface SnapshotLookupResult {
  market: MarketContextSnapshot | null;
  sector: SectorContextSnapshot | null;
  country: CountryContextSnapshot | null;
  smartMoney: any | null;
  dataQuality: any | null;
  dataStatus: 'COMPLETE' | 'PARTIAL' | 'MISSING' | 'ERROR';
  gaps: string[];
}
