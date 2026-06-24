import axios from 'axios';
import type { MarketScope } from '@/contexts/MarketScopeContext';
import {
  CALENDAR_EVENT_TYPES,
  type CalendarAvailability,
  type CalendarEnvelope,
  type CalendarEvent,
  type CalendarEventType,
} from '../types';

const API_BASE = '/api/v1/calendar';

interface BackendCalendarResponse {
  scope?: { region?: string; assetType?: string };
  type?: string;
  range?: { from?: string; to?: string };
  generatedAt?: string | null;
  freshness?: string | null;
  counts?: Partial<Record<CalendarEventType, number>>;
  items?: CalendarEvent[];
  warnings?: string[];
}

function emptyCounts(): Record<CalendarEventType, number> {
  return { IPO: 0, DIVIDEND: 0, SPLIT: 0, EARNINGS: 0, ECONOMIC: 0 };
}

function normalizeCounts(raw: Partial<Record<CalendarEventType, number>> | undefined): Record<CalendarEventType, number> {
  const counts = emptyCounts();
  if (raw) {
    for (const t of CALENDAR_EVENT_TYPES) counts[t] = Number(raw[t] ?? 0);
  }
  return counts;
}

function availabilityFromFreshness(freshness: string | null | undefined, hasRows: boolean): CalendarAvailability {
  const normalized = String(freshness || '').toUpperCase();
  if (normalized === 'NO_DATA' || !hasRows) return hasRows ? 'READY' : 'EMPTY';
  if (normalized === 'PARTIAL') return 'PARTIAL';
  return 'READY';
}

function errorMessage(caught: unknown, fallback: string): string {
  if (axios.isAxiosError(caught)) {
    const data = caught.response?.data as { error?: string; message?: string } | undefined;
    return data?.error || data?.message || caught.message || fallback;
  }
  return caught instanceof Error ? caught.message : fallback;
}

export interface FetchCalendarOptions {
  from?: string;
  to?: string;
  limit?: number;
}

/**
 * Persisted read of the unified calendar (all event families). Region/assetType come
 * from the global market scope; date window is optional (backend defaults to -30/+90d).
 */
export async function fetchCalendar(scope: MarketScope, options: FetchCalendarOptions = {}): Promise<CalendarEnvelope> {
  try {
    const response = await axios.get<BackendCalendarResponse>(API_BASE, {
      params: {
        region: scope.region,
        assetType: scope.assetType,
        type: 'ALL',
        ...(options.from ? { from: options.from } : {}),
        ...(options.to ? { to: options.to } : {}),
        ...(options.limit ? { limit: options.limit } : {}),
      },
    });
    const body = response.data;
    const events = Array.isArray(body.items) ? body.items : [];
    return {
      availability: availabilityFromFreshness(body.freshness, events.length > 0),
      scope: {
        region: (body.scope?.region || scope.region) as MarketScope['region'],
        assetType: (body.scope?.assetType || scope.assetType) as MarketScope['assetType'],
      },
      events,
      counts: normalizeCounts(body.counts),
      message: events.length ? '' : 'No calendar events for this scope and window yet.',
      warnings: Array.isArray(body.warnings) ? body.warnings.map(String) : [],
      freshness: body.freshness ?? null,
      generatedAt: body.generatedAt ?? null,
      range: body.range?.from && body.range?.to ? { from: body.range.from, to: body.range.to } : null,
    };
  } catch (caught) {
    return {
      availability: 'ERROR',
      scope,
      events: [],
      counts: emptyCounts(),
      message: 'Calendar is unavailable right now.',
      warnings: [errorMessage(caught, 'Calendar read failed.')],
      freshness: null,
      generatedAt: null,
      range: null,
    };
  }
}
