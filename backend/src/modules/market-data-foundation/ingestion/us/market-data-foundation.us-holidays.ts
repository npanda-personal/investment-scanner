/**
 * NYSE / US equity market full-day holidays (ISO YYYY-MM-DD).
 *
 * Maintained static list — NYSE publishes its calendar a few years out.  Only
 * FULL closures are modelled; half-days (1pm early close, e.g. day after
 * Thanksgiving) are intentionally omitted because we ingest EOD candles, for
 * which an early close still produces a valid daily bar.
 *
 * Extend this list as NYSE publishes future years.  Observed-date rules:
 * a Saturday holiday → observed the preceding Friday; a Sunday holiday →
 * observed the following Monday.
 */
export const US_NYSE_HOLIDAYS: string[] = [
  // 2025
  '2025-01-01', // New Year's Day
  '2025-01-20', // Martin Luther King Jr. Day
  '2025-02-17', // Washington's Birthday
  '2025-04-18', // Good Friday
  '2025-05-26', // Memorial Day
  '2025-06-19', // Juneteenth
  '2025-07-04', // Independence Day
  '2025-09-01', // Labor Day
  '2025-11-27', // Thanksgiving Day
  '2025-12-25', // Christmas Day
  // 2026
  '2026-01-01', // New Year's Day
  '2026-01-19', // Martin Luther King Jr. Day
  '2026-02-16', // Washington's Birthday
  '2026-04-03', // Good Friday
  '2026-05-25', // Memorial Day
  '2026-06-19', // Juneteenth
  '2026-07-03', // Independence Day (observed; Jul 4 is Saturday)
  '2026-09-07', // Labor Day
  '2026-11-26', // Thanksgiving Day
  '2026-12-25', // Christmas Day
  // 2027
  '2027-01-01', // New Year's Day
  '2027-01-18', // Martin Luther King Jr. Day
  '2027-02-15', // Washington's Birthday
  '2027-03-26', // Good Friday
  '2027-05-31', // Memorial Day
  '2027-06-18', // Juneteenth (observed; Jun 19 is Saturday)
  '2027-07-05', // Independence Day (observed; Jul 4 is Sunday)
  '2027-09-06', // Labor Day
  '2027-11-25', // Thanksgiving Day
  '2027-12-24', // Christmas Day (observed; Dec 25 is Saturday)
];
