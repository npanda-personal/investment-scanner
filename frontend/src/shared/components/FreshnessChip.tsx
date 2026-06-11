import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import { alpha } from '@mui/material/styles';

/**
 * FreshnessChip — single, calm data-age indicator for market pages.
 *
 * Calendar-day thresholds (calendar days between dataThrough and today):
 *   0–1  → fresh   (subtle success outlined chip)
 *   2–4  → aging   (neutral/default outlined chip)  — "N day(s) old"
 *   5+   → warning (amber chip + tooltip)
 *   >7   → red     (error chip + tooltip)
 *
 * Weekend-aware note: we use calendar days deliberately.
 * 0–1 cal days is fresh (covers same-day and yesterday, which may be a weekend).
 * 2–4 cal days is "aging" (covers Mon data seen on Wed, i.e. over a weekend).
 * >4 cal days triggers amber; >7 triggers red.
 * This keeps the chip calm across normal weekend gaps without calendar math.
 *
 * Props:
 *   dataThrough       ISO date/datetime string for the last data point (e.g. "2026-06-09").
 *   latestTradingDay  Optional ISO date for the expected latest trading day; if provided
 *                     and dataThrough equals it, always shows "fresh" regardless of wall-clock age.
 *   label             Optional short label prefix, e.g. "Sector data". Defaults to "Market data".
 */

export interface FreshnessChipProps {
  dataThrough: string | null | undefined;
  latestTradingDay?: string | null;
  label?: string;
}

function toDateOnly(iso: string): string {
  return iso.slice(0, 10);
}

function calendarDaysOld(asOfDate: string, todayDate: string): number {
  const asOfMs = Date.UTC(
    Number(asOfDate.slice(0, 4)),
    Number(asOfDate.slice(5, 7)) - 1,
    Number(asOfDate.slice(8, 10)),
  );
  const todayMs = Date.UTC(
    Number(todayDate.slice(0, 4)),
    Number(todayDate.slice(5, 7)) - 1,
    Number(todayDate.slice(8, 10)),
  );
  return Math.round((todayMs - asOfMs) / 86_400_000);
}

/** Format YYYY-MM-DD to "10 Jun" style (no year for compactness in chip). */
function formatChipDate(dateOnly: string): string {
  const d = new Date(`${dateOnly}T00:00:00Z`);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

/** Format YYYY-MM-DD to full date "10 Jun 2026" for tooltip. */
function formatFullDate(dateOnly: string): string {
  const d = new Date(`${dateOnly}T00:00:00Z`);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

type Tier = 'fresh' | 'aging' | 'warning' | 'stale';

export function FreshnessChip({ dataThrough, latestTradingDay, label = 'Market data' }: FreshnessChipProps) {
  if (!dataThrough) return null;

  const asOfDate = toDateOnly(dataThrough);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOfDate)) return null;

  const todayDate = toDateOnly(new Date().toISOString());

  // If latestTradingDay is provided and dataThrough matches it, treat as fresh regardless of wall-clock age.
  if (latestTradingDay) {
    const ltdDate = toDateOnly(latestTradingDay);
    if (asOfDate >= ltdDate) {
      return (
        <Chip
          size="small"
          label={`Data through ${formatChipDate(asOfDate)} · fresh`}
          variant="outlined"
          color="success"
          sx={{ fontWeight: 600 }}
        />
      );
    }
  }

  const daysOld = calendarDaysOld(asOfDate, todayDate);

  // Determine tier
  let tier: Tier;
  if (daysOld <= 1) tier = 'fresh';
  else if (daysOld <= 4) tier = 'aging';
  else if (daysOld <= 7) tier = 'warning';
  else tier = 'stale';

  const chipDate = formatChipDate(asOfDate);
  const fullDate = formatFullDate(asOfDate);

  if (tier === 'fresh') {
    return (
      <Chip
        size="small"
        label={`Data through ${chipDate} · fresh`}
        variant="outlined"
        color="success"
        sx={{ fontWeight: 600 }}
      />
    );
  }

  if (tier === 'aging') {
    const dayWord = daysOld === 1 ? 'day' : 'days';
    return (
      <Tooltip
        title={`${label} is ${daysOld} calendar ${dayWord} old (data through ${fullDate}). Data refreshes on the next scheduled run.`}
        arrow
      >
        <Chip
          size="small"
          label={`Data through ${chipDate} · ${daysOld} ${dayWord} old`}
          variant="outlined"
          color="default"
          sx={{ fontWeight: 600 }}
        />
      </Tooltip>
    );
  }

  // warning (5–7 days) or stale (>7 days)
  const dayWord = daysOld === 1 ? 'day' : 'days';
  const tooltipText =
    tier === 'stale'
      ? `${label} is ${daysOld} calendar days old (data through ${fullDate}). This is significantly behind — data may be missing or the refresh pipeline may need attention.`
      : `${label} is ${daysOld} calendar days old (data through ${fullDate}). Data may be a few days behind.`;

  return (
    <Tooltip title={tooltipText} arrow>
      <Chip
        size="small"
        label={`Data through ${chipDate} · ${daysOld} ${dayWord} old`}
        variant="outlined"
        sx={(theme) => ({
          fontWeight: 600,
          ...(tier === 'stale'
            ? {
                color: theme.palette.error.dark,
                borderColor: alpha(theme.palette.error.main, 0.6),
                backgroundColor: alpha(theme.palette.error.main, theme.palette.mode === 'dark' ? 0.24 : 0.10),
              }
            : {
                color: theme.palette.warning.dark,
                borderColor: alpha(theme.palette.warning.main, 0.6),
                backgroundColor: alpha(theme.palette.warning.main, theme.palette.mode === 'dark' ? 0.22 : 0.12),
              }),
        })}
      />
    </Tooltip>
  );
}
