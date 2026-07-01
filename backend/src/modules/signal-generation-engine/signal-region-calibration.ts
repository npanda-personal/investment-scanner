/**
 * signal-region-calibration.ts
 *
 * Loads the pre-fitted per-region calibration artifact at module initialisation
 * (single synchronous read — no DB, no I/O after boot).
 *
 * The artifact is written by `backend/scripts/fit-region-calibration.ts`; until
 * that script is run, the file ships with an empty `cohorts` object so every
 * lookup returns null and the caller falls back to the global defaults —
 * identical behaviour to the pre-calibration state.
 *
 * Cohort key resolution order:
 *   1. REGION:ASSETTYPE  (most specific)
 *   2. REGION:ALL        (region rollup)
 *   3. null              (caller falls back to global defaults)
 */

import * as fs from 'fs';
import * as path from 'path';

// ── Artifact shape ────────────────────────────────────────────────────────────

interface DirectionThresholds {
  bullish: number;
  bearish: number;
}

interface CategoryWeights {
  technical: number;
  momentum: number;
  fundamental: number;
}

interface CohortEntry {
  directionThresholds: DirectionThresholds;
  weights: CategoryWeights;
  samples: number;
  method: string;
}

interface RegionCalibrationArtifact {
  generatedAt: string | null;
  modelVersion: string;
  horizon: string;
  cohorts: Record<string, CohortEntry>;
}

// ── Load once at module initialisation ───────────────────────────────────────

const ARTIFACT_PATH = path.join(__dirname, 'calibration', 'region-calibration.json');

function loadArtifact(): RegionCalibrationArtifact {
  try {
    const raw = fs.readFileSync(ARTIFACT_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed) &&
      'cohorts' in parsed &&
      typeof (parsed as any).cohorts === 'object' &&
      (parsed as any).cohorts !== null
    ) {
      return parsed as RegionCalibrationArtifact;
    }
    return { generatedAt: null, modelVersion: '', horizon: '', cohorts: {} };
  } catch {
    // Missing file or parse error → safe empty state; scoring falls back to global defaults.
    return { generatedAt: null, modelVersion: '', horizon: '', cohorts: {} };
  }
}

const _artifact = loadArtifact();

// ── Validation helpers ────────────────────────────────────────────────────────

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && isFinite(v);
}

function isValidDirectionThresholds(dt: unknown): dt is DirectionThresholds {
  if (dt === null || typeof dt !== 'object') return false;
  const { bullish, bearish } = dt as any;
  return (
    isFiniteNumber(bullish) &&
    isFiniteNumber(bearish) &&
    bullish > bearish
  );
}

function isValidWeights(w: unknown): w is CategoryWeights {
  if (w === null || typeof w !== 'object') return false;
  const { technical, momentum, fundamental } = w as any;
  if (!isFiniteNumber(technical) || !isFiniteNumber(momentum) || !isFiniteNumber(fundamental)) return false;
  const sum = technical + momentum + fundamental;
  // Allow 0.01 rounding tolerance
  return Math.abs(sum - 1.0) <= 0.01;
}

function isValidCohortEntry(entry: unknown): entry is CohortEntry {
  if (entry === null || typeof entry !== 'object') return false;
  const e = entry as any;
  return isValidDirectionThresholds(e.directionThresholds) && isValidWeights(e.weights);
}

// ── Cohort key resolution ─────────────────────────────────────────────────────

function cohortKey(region: string, assetType: string): string {
  return `${region.toUpperCase()}:${assetType.toUpperCase()}`;
}

function resolveEntry(region: string, assetType: string): CohortEntry | null {
  const specific = _artifact.cohorts[cohortKey(region, assetType)];
  if (specific !== undefined && isValidCohortEntry(specific)) return specific;

  const rollup = _artifact.cohorts[cohortKey(region, 'ALL')];
  if (rollup !== undefined && isValidCohortEntry(rollup)) return rollup;

  return null;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns the fitted direction thresholds for the given region/assetType cohort,
 * or null if no valid fitted entry exists (caller should fall back to global defaults).
 */
export function fittedDirectionThresholds(
  region?: string | null,
  assetType?: string | null,
): DirectionThresholds | null {
  if (!region) return null;
  const r = region.trim();
  const a = (assetType ?? '').trim() || 'ALL';
  const entry = resolveEntry(r, a);
  return entry ? entry.directionThresholds : null;
}

/**
 * Returns the fitted base category weights for the given region/assetType cohort,
 * or null if no valid fitted entry exists (caller should fall back to global defaults).
 */
export function fittedBaseWeights(
  region?: string | null,
  assetType?: string | null,
): CategoryWeights | null {
  if (!region) return null;
  const r = region.trim();
  const a = (assetType ?? '').trim() || 'ALL';
  const entry = resolveEntry(r, a);
  return entry ? entry.weights : null;
}

/** Expose the loaded artifact for testing/inspection only — do not mutate. */
export function _getLoadedArtifact(): Readonly<RegionCalibrationArtifact> {
  return _artifact;
}

/**
 * Parse and validate a raw JSON string into a RegionCalibrationArtifact.
 * Exported for unit testing the parsing/validation logic without fs interaction.
 * Returns an empty-cohorts artifact on any parse or shape error.
 */
export function parseCalibrationArtifact(raw: string): RegionCalibrationArtifact {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed) &&
      'cohorts' in parsed &&
      typeof (parsed as any).cohorts === 'object' &&
      (parsed as any).cohorts !== null
    ) {
      return parsed as RegionCalibrationArtifact;
    }
  } catch {
    // fall through
  }
  return { generatedAt: null, modelVersion: '', horizon: '', cohorts: {} };
}

/**
 * Resolve a cohort entry from a parsed artifact by REGION:ASSETTYPE key,
 * falling back to REGION:ALL, then null.
 * Validates the entry shape defensively.
 * Exported for unit testing.
 */
export function resolveCohortFromArtifact(
  artifact: RegionCalibrationArtifact,
  region: string,
  assetType: string,
): { directionThresholds: { bullish: number; bearish: number }; weights: { technical: number; momentum: number; fundamental: number } } | null {
  const key1 = `${region.toUpperCase()}:${assetType.toUpperCase()}`;
  const key2 = `${region.toUpperCase()}:ALL`;
  for (const key of [key1, key2]) {
    const entry = artifact.cohorts[key];
    if (entry !== undefined && isValidCohortEntry(entry)) return { directionThresholds: entry.directionThresholds, weights: entry.weights };
  }
  return null;
}
