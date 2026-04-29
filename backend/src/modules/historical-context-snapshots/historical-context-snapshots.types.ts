export type SnapshotDataStatus = 'COMPLETE' | 'PARTIAL' | 'MISSING' | 'ERROR';

export interface GenerateSnapshotsRequest {
  snapshotDate?: string;
  limit?: number;
}

export interface SnapshotQuery {
  from?: Date;
  to?: Date;
  date?: Date;
  sector?: string;
  country?: string;
  instrumentId?: string;
  limit: number;
}

export interface SnapshotGenerateSummary {
  snapshotDate: string;
  market: SnapshotCount;
  sectors: SnapshotCount;
  countries: SnapshotCount;
  smartMoney: SnapshotCount;
  dataQuality: SnapshotCount;
  warnings: string[];
}

export interface SnapshotCount {
  inserted: number;
  updated: number;
  skipped: number;
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

export interface SnapshotLookupResult {
  market: any | null;
  sector: any | null;
  country: any | null;
  smartMoney: any | null;
  dataQuality: any | null;
  dataStatus: SnapshotDataStatus;
  gaps: string[];
}
