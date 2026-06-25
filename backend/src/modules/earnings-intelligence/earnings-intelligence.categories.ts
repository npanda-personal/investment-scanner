/**
 * Single source of truth for Earnings-Intelligence categories.
 *
 * The `EarningsIntelligenceCategory` *type* lives in `.types.ts`; this module
 * provides the *runtime* mirror (the ordered list) plus the empty-bucket / count
 * factories and the type-guard.  Previously the category list was hand-duplicated
 * in four places (the union, the validation list, the repository guard, and two
 * empty-record factories), which drifts silently.  Anything that needs to iterate
 * categories at runtime should import from here.
 */
import type { EarningsIntelligenceCategory, EarningsSnapshotDto } from './earnings-intelligence.types';

/**
 * Canonical, ordered list of every earnings category.  `as const satisfies`
 * gives us both literal-narrowed entries AND a compile-time guarantee that the
 * array stays in lock-step with the `EarningsIntelligenceCategory` union — add a
 * member to the union without adding it here (or vice-versa) and the build fails.
 */
export const EARNINGS_INTELLIGENCE_CATEGORIES = [
  'UPCOMING_RESULTS',
  'PRE_RESULT_INTEREST',
  'GROWTH',
  'RESULT_WINNERS',
  'RESULT_DISAPPOINTMENTS',
  'RESULT_REACTION_HISTORY',
  'EARNINGS_WATCHLIST',
] as const satisfies readonly EarningsIntelligenceCategory[];

// Compile-time exhaustiveness guard: fails the build if the union gains a member
// that is missing from the array above.
type _MissingFromArray = Exclude<EarningsIntelligenceCategory, (typeof EARNINGS_INTELLIGENCE_CATEGORIES)[number]>;
const _exhaustiveCategoryCheck: _MissingFromArray extends never ? true : never = true;
void _exhaustiveCategoryCheck;

export function isEarningsIntelligenceCategory(value: string): value is EarningsIntelligenceCategory {
  return (EARNINGS_INTELLIGENCE_CATEGORIES as readonly string[]).includes(value);
}

/** Fresh, fully-zeroed map of category → empty row list. */
export function emptyCategoryBuckets(): Record<EarningsIntelligenceCategory, EarningsSnapshotDto[]> {
  return Object.fromEntries(
    EARNINGS_INTELLIGENCE_CATEGORIES.map((category) => [category, [] as EarningsSnapshotDto[]])
  ) as Record<EarningsIntelligenceCategory, EarningsSnapshotDto[]>;
}

/** Fresh, fully-zeroed map of category → count. */
export function emptyCategoryCounts(): Record<EarningsIntelligenceCategory, number> {
  return Object.fromEntries(
    EARNINGS_INTELLIGENCE_CATEGORIES.map((category) => [category, 0])
  ) as Record<EarningsIntelligenceCategory, number>;
}
