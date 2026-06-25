// Request parsing/validation for the calendar module. Mirrors the lightweight,
// dependency-free style used by earnings-intelligence (no zod): tolerant parsing
// with explicit defaults and clamped bounds.

import { CALENDAR_EVENT_TYPES, type CalendarEventType, type CalendarQuery } from './calendar.types';

const DEFAULT_REGION = 'IN';
const DEFAULT_ASSET_TYPE = 'STOCK';
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;
/** Default read window: 30 days back, 90 days forward (covers recent + upcoming events). */
const DEFAULT_PAST_DAYS = 30;
const DEFAULT_FUTURE_DAYS = 90;

const DAY_MS = 24 * 60 * 60 * 1000;

function first(value: unknown): string | undefined {
  if (Array.isArray(value)) return first(value[0]);
  if (typeof value === 'string') return value;
  return undefined;
}

function normalizeText(value: unknown): string | undefined {
  const raw = first(value);
  if (raw === undefined) return undefined;
  const trimmed = raw.trim();
  return trimmed.length ? trimmed : undefined;
}

function parseLimit(value: unknown): number {
  const raw = normalizeText(value);
  if (!raw) return DEFAULT_LIMIT;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_LIMIT;
  return Math.min(n, MAX_LIMIT);
}

/** IPO "Closed" look-back window in months — only 1, 3, or 6 are allowed; default 3. */
const ALLOWED_IPO_MONTHS = [1, 3, 6];
const DEFAULT_IPO_MONTHS = 3;
function parseIpoMonths(value: unknown): number {
  const raw = normalizeText(value);
  if (!raw) return DEFAULT_IPO_MONTHS;
  const n = Number.parseInt(raw, 10);
  return ALLOWED_IPO_MONTHS.includes(n) ? n : DEFAULT_IPO_MONTHS;
}

function parseType(value: unknown): CalendarEventType | 'ALL' {
  const raw = normalizeText(value)?.toUpperCase();
  if (!raw || raw === 'ALL') return 'ALL';
  if ((CALENDAR_EVENT_TYPES as readonly string[]).includes(raw)) {
    return raw as CalendarEventType;
  }
  return 'ALL';
}

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Parse an ISO-ish date (YYYY-MM-DD or full ISO); returns undefined when unparseable. */
function parseDate(value: unknown): Date | undefined {
  const raw = normalizeText(value);
  if (!raw) return undefined;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed;
}

export function parseCalendarQuery(query: Record<string, unknown>): CalendarQuery {
  const region = (normalizeText(query.region) ?? DEFAULT_REGION).toUpperCase();
  const assetType = (normalizeText(query.assetType) ?? DEFAULT_ASSET_TYPE).toUpperCase();
  const type = parseType(query.type);

  const today = startOfUtcDay(new Date());
  const from = parseDate(query.from) ?? new Date(today.getTime() - DEFAULT_PAST_DAYS * DAY_MS);
  const to = parseDate(query.to) ?? new Date(today.getTime() + DEFAULT_FUTURE_DAYS * DAY_MS);

  // Guard against an inverted range — swap rather than 400 so the UI stays forgiving.
  const [rangeFrom, rangeTo] = from.getTime() <= to.getTime() ? [from, to] : [to, from];

  return {
    region,
    assetType,
    type,
    from: rangeFrom,
    to: rangeTo,
    limit: parseLimit(query.limit),
    ipoMonths: parseIpoMonths(query.ipoMonths),
  };
}

export interface CalendarRefreshInput {
  region: string;
  assetType: string;
  lookbackDays: number;
  includeEconomic: boolean;
  includeUpcomingIpo: boolean;
}

const DEFAULT_IPO_LOOKBACK_DAYS = 365;
const MAX_IPO_LOOKBACK_DAYS = 1825; // 5y guard

export function parseCalendarRefreshBody(body: Record<string, unknown>): CalendarRefreshInput {
  const region = (normalizeText(body.region) ?? DEFAULT_REGION).toUpperCase();
  const assetType = (normalizeText(body.assetType) ?? DEFAULT_ASSET_TYPE).toUpperCase();

  let lookbackDays = DEFAULT_IPO_LOOKBACK_DAYS;
  const rawLookback = normalizeText(body.lookbackDays);
  if (rawLookback) {
    const n = Number.parseInt(rawLookback, 10);
    if (Number.isFinite(n) && n > 0) lookbackDays = Math.min(n, MAX_IPO_LOOKBACK_DAYS);
  }

  // includeEconomic defaults true; accept explicit false.
  const includeEconomicRaw = normalizeText(body.includeEconomic)?.toLowerCase();
  const includeEconomic = includeEconomicRaw !== 'false' && body.includeEconomic !== false;

  // includeUpcomingIpo defaults true (IN scope); accept explicit false. The provider fetch is
  // self-guarding (graceful empty on failure), so a default-on flag never breaks the refresh.
  const includeUpcomingIpoRaw = normalizeText(body.includeUpcomingIpo)?.toLowerCase();
  const includeUpcomingIpo = includeUpcomingIpoRaw !== 'false' && body.includeUpcomingIpo !== false;

  return { region, assetType, lookbackDays, includeEconomic, includeUpcomingIpo };
}
