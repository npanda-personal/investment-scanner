/**
 * NSE CM (Capital Markets) segment full-day trading holidays (ISO YYYY-MM-DD).
 *
 * This is a STATIC FALLBACK list used when the live NSE holiday API has not
 * yet been fetched (e.g. first scheduler tick after a cold start, or when
 * the API is unreachable).  The live fetcher in MarketDataFoundationService
 * (`nseCmTradingHolidayDatesForYear`) populates the in-process cache on its
 * first call; once the cache is warm, the live list takes precedence via
 * `getKnownNseHolidaysForYear()`.
 *
 * NOTE: This list is PARTIAL for 2026 — it contains only the fixed public
 * holidays that are universally observed by NSE.  NSE also closes for
 * Mahashivratri, Holi, Ram Navami, Id-Ul-Fitr, Good Friday, Eid al-Adha,
 * Muharram, Diwali (Laxmi Pujan), Diwali (Balipratipada), Guru Nanak Jayanti
 * etc., whose calendar dates change yearly.  Run the live fetcher or extend
 * this list manually once NSE publishes the official calendar for future years.
 *
 * Source: https://www.nseindia.com/api/holiday-master?type=trading&year={year}
 */
export const NSE_TRADING_HOLIDAYS_STATIC_FALLBACK: string[] = [
  // ── 2025 ─────────────────────────────────────────────────────────────────
  '2025-01-26', // Republic Day
  '2025-03-14', // Mahashivratri
  '2025-03-31', // Id-Ul-Fitr (Ramzan)
  '2025-04-10', // Shri Ram Navami
  '2025-04-14', // Dr. Baba Saheb Ambedkar Jayanti / Good Friday
  '2025-04-18', // Good Friday
  '2025-05-01', // Maharashtra Day
  '2025-06-07', // Eid al-Adha (Bakri Eid)
  '2025-07-28', // Muharram
  '2025-08-15', // Independence Day
  '2025-08-27', // Ganesh Chaturthi
  '2025-10-02', // Gandhi Jayanti / Dussehra
  '2025-10-02', // Mahatma Gandhi Jayanti
  '2025-10-21', // Diwali – Laxmi Pujan
  '2025-10-22', // Diwali – Balipratipada
  '2025-11-05', // Prakash Gurpurb Sri Guru Nanak Dev Ji
  '2025-12-25', // Christmas

  // ── 2026 (PARTIAL — fixed public holidays only) ──────────────────────────
  // Variable-date holidays (Holi, Good Friday, Eid, Diwali, etc.) are NOT
  // listed here; they will be populated once the live fetcher runs.
  '2026-01-26', // Republic Day
  '2026-08-15', // Independence Day (Saturday — harmless to include; NSE closed)
  '2026-10-02', // Gandhi Jayanti
  '2026-12-25', // Christmas
];

/**
 * Returns the subset of the static fallback list that falls in the given year.
 * Used by `getKnownNseHolidaysForYear` as the cold-start fallback.
 */
export function getStaticNseHolidaysForYear(year: number): string[] {
  const prefix = `${year}-`;
  return NSE_TRADING_HOLIDAYS_STATIC_FALLBACK.filter((d) => d.startsWith(prefix));
}
