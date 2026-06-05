import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import { alpha } from '@mui/material/styles';

/**
 * StalenessBadge — honest data-age indicator for persisted-read screens.
 *
 * Thresholds (calendar days between asOf and today):
 *   0  — fresh (same day): no badge rendered
 *   1–3 — amber  "as of <date> · N day(s) old"
 *   4+  — red    "as of <date> · N days old"
 *
 * Contract:
 *   - asOf: ISO date or datetime string from the payload (e.g. "2026-06-01" or
 *     "2026-06-01T12:00:00Z"). If falsy/invalid, no badge is rendered — never
 *     fabricate a date.
 *   - todayIso: optional override for today's date (ISO string). Defaults to
 *     new Date() so callers do not need to pass it.
 *   - label: optional short prefix for the tooltip (e.g. "VIX"). Defaults to
 *     "Data".
 */
export interface StalenessBadgeProps {
  asOf: string | null | undefined;
  todayIso?: string;
  label?: string;
  size?: 'small' | 'medium';
}

/** Extract a YYYY-MM-DD date string from an ISO datetime, normalised to UTC midnight. */
function toDateOnly(iso: string): string {
  // Accept both "2026-06-01" and "2026-06-01T12:00:00Z"
  return iso.slice(0, 10);
}

/** Count calendar days between two YYYY-MM-DD strings (result >= 0 means asOf is behind). */
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

/** Format YYYY-MM-DD to a locale-friendly short date, e.g. "1 Jun 2026". */
function formatShortDate(dateOnly: string): string {
  const d = new Date(`${dateOnly}T00:00:00Z`);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export function StalenessBadge({ asOf, todayIso, label = 'Data', size = 'small' }: StalenessBadgeProps) {
  if (!asOf) return null;

  const asOfDate = toDateOnly(asOf);
  const todayDate = todayIso ? toDateOnly(todayIso) : toDateOnly(new Date().toISOString());

  // Validate both dates parsed correctly
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOfDate) || !/^\d{4}-\d{2}-\d{2}$/.test(todayDate)) return null;

  const daysOld = calendarDaysOld(asOfDate, todayDate);

  // Fresh (same trading day or future — data was ingested today) — no badge
  if (daysOld <= 0) return null;

  const tier: 'amber' | 'red' = daysOld <= 3 ? 'amber' : 'red';
  const dayWord = daysOld === 1 ? 'day' : 'days';
  const chipLabel = `as of ${formatShortDate(asOfDate)} · ${daysOld} ${dayWord} old`;
  const tooltipText = `${label} snapshot is ${daysOld} calendar ${dayWord} old (data through ${formatShortDate(asOfDate)}). This is a labeling indicator only — no data refresh is triggered from this page.`;

  return (
    <Tooltip title={tooltipText} arrow>
      <Chip
        size={size}
        label={chipLabel}
        variant="outlined"
        sx={(theme) => ({
          fontWeight: 600,
          ...(tier === 'amber'
            ? {
                color: theme.palette.warning.dark,
                borderColor: alpha(theme.palette.warning.main, 0.6),
                backgroundColor: alpha(theme.palette.warning.main, theme.palette.mode === 'dark' ? 0.22 : 0.12),
              }
            : {
                color: theme.palette.error.dark,
                borderColor: alpha(theme.palette.error.main, 0.6),
                backgroundColor: alpha(theme.palette.error.main, theme.palette.mode === 'dark' ? 0.24 : 0.10),
              }),
        })}
      />
    </Tooltip>
  );
}
