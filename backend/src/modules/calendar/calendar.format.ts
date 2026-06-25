// Shared date-format helpers for the calendar module. Consumed by both calendar.service.ts
// (range + earnings/economic mappers) and calendar.ipo-service.ts (IPO mappers) — kept here so
// neither imports the other (avoids a cycle) and the formatting stays consistent across families.

/** UTC midnight ISO string for a date (day-granularity key/anchor). */
export function isoDay(d: Date): string {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString();
}

/** ISO string or null — for optional dates in event metrics. */
export function isoOrNull(d: Date | null | undefined): string | null {
  return d ? new Date(d).toISOString() : null;
}
