/**
 * Presentation mapping for the earnings result-date provenance.
 *
 * The relationship between `resultDateSource` and (a) its human-readable label
 * and (b) the canonical per-row warning codes was previously implemented twice —
 * once at write time in the service and once at read time in the repository —
 * with subtly overlapping legacy-remap logic.  Centralising it here keeps the two
 * sides in lock-step and gives a single place to evolve the provenance vocabulary.
 */
import type { EarningsResultDateSource } from './earnings-intelligence.types';

/**
 * Label shown next to the result date so a trader instantly knows its reliability
 * without decoding the enum.  Only authoritative ("Official") and not-yet-announced
 * ("TBA") states get a label; fallback/unknown sources are unlabelled (null).
 */
export function resultDateLabelFor(source: string): 'Official' | 'TBA' | null {
  if (source === 'OFFICIAL_CALENDAR') return 'Official';
  if (source === 'DATE_TBA') return 'TBA';
  return null;
}

/** True for sources whose date/daysToResult must be suppressed in the read DTO. */
export function isTbaSource(source: string): boolean {
  return source === 'DATE_TBA';
}

/**
 * Canonical, de-duplicated warning codes for a freshly-calculated row, derived
 * purely from its result-date source.  This is the write-time vocabulary; the
 * repository additionally remaps a handful of *legacy persisted* codes at read
 * time (see `remapLegacyWarnings`).
 */
export function rowWarningsForSource(source: EarningsResultDateSource): string[] {
  const warnings: string[] = [];
  // DATE_TBA / legacy ESTIMATED_FROM_PERIOD_CADENCE: the result date has not been
  // announced on the official calendar — a single calm code, no per-row spam.
  if (source === 'DATE_TBA' || source === 'ESTIMATED_FROM_PERIOD_CADENCE') {
    warnings.push('RESULT_DATE_NOT_ANNOUNCED');
  }
  if (source === 'PERIOD_END_DATE_FALLBACK') warnings.push('RESULT_DATE_USES_PERIOD_END_DATE_FALLBACK');
  if (source === 'VALIDATED_AT_FALLBACK') warnings.push('RESULT_DATE_USES_VALIDATED_AT_FALLBACK');
  if (source === 'UNKNOWN') warnings.push('RESULT_DATE_SOURCE_UNKNOWN');
  if (source !== 'OFFICIAL_CALENDAR') warnings.push('RESULT_REACTION_REQUIRES_OFFICIAL_RESULT_DATE');
  return [...new Set(warnings)];
}

/**
 * Read-time backward-compat remap for warnings stored on legacy snapshots:
 *   - the old estimated-cadence warning collapses to RESULT_DATE_NOT_ANNOUNCED, and
 *   - the old per-row OFFICIAL_CALENDAR_NOT_AVAILABLE spam is dropped.
 * New snapshots already carry the canonical vocabulary, so this is a no-op for them.
 */
export function remapLegacyWarnings(warnings: string[]): string[] {
  return warnings
    .map((w) =>
      w === 'RESULT_DATE_ESTIMATED_FROM_PERIOD_CADENCE'
        ? 'RESULT_DATE_NOT_ANNOUNCED'
        : w === 'OFFICIAL_CALENDAR_NOT_AVAILABLE'
          ? null
          : w
    )
    .filter((w): w is string => w !== null);
}

/**
 * Read-time backward-compat remap for the result-date source itself: legacy
 * ESTIMATED_FROM_PERIOD_CADENCE rows are surfaced as DATE_TBA so the honesty fix
 * takes effect for already-persisted snapshots without a re-materialisation.
 */
export function remapLegacySource(rawSource: string): string {
  return rawSource === 'ESTIMATED_FROM_PERIOD_CADENCE' ? 'DATE_TBA' : rawSource;
}
