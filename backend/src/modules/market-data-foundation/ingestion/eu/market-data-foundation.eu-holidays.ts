/**
 * Eurozone exchange holidays (XETRA / Euronext / Borsa Italiana / BME / Vienna /
 * Helsinki) — the full-day closures common to the EUR-denominated exchanges this
 * app ingests (region='EU').  Used by the trading-calendar helpers so the
 * scheduler does not treat a holiday as a missing trading day.
 *
 * Scope: the closures shared by all eurozone venues — New Year, Good Friday,
 * Easter Monday, Labour Day (May 1), Christmas Day, and Dec 26 (St Stephen's /
 * Boxing Day, a XETRA + Euronext + Borsa Italiana closure).  Venue-specific
 * national holidays (e.g. German Unity Day, Bastille Day, Italian Liberation
 * Day) are intentionally omitted: this is a conservative shared set, and the
 * helpers treat an unexpected single-day gap as data-uncertain rather than an
 * error.  Dates are ISO (YYYY-MM-DD) in the exchange local calendar.
 */
export const EU_EUROZONE_HOLIDAYS: string[] = [
  // 2024
  '2024-01-01', // New Year's Day
  '2024-03-29', // Good Friday
  '2024-04-01', // Easter Monday
  '2024-05-01', // Labour Day
  '2024-12-24', // Christmas Eve (XETRA + Euronext closed)
  '2024-12-25', // Christmas Day
  '2024-12-26', // St Stephen's Day / Boxing Day
  '2024-12-31', // New Year's Eve (XETRA + Euronext closed)
  // 2025
  '2025-01-01',
  '2025-04-18', // Good Friday
  '2025-04-21', // Easter Monday
  '2025-05-01',
  '2025-12-24',
  '2025-12-25',
  '2025-12-26',
  '2025-12-31',
  // 2026
  '2026-01-01',
  '2026-04-03', // Good Friday
  '2026-04-06', // Easter Monday
  '2026-05-01',
  '2026-12-24',
  '2026-12-25',
  '2026-12-26',
  '2026-12-31',
  // 2027
  '2027-01-01',
  '2027-03-26', // Good Friday
  '2027-03-29', // Easter Monday
  '2027-05-01',
  '2027-12-24',
  '2027-12-25',
  '2027-12-26',
  '2027-12-31',
];
