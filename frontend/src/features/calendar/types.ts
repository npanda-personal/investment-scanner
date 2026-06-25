import type { MarketScope } from '@/contexts/MarketScopeContext';

// IPO_UPCOMING = forthcoming/ongoing-subscription IPOs (descriptive). IPO = already-listed
// (return/trend/health/signal). Surfaced as two FE sub-tabs under one "IPO" parent tab.
export const CALENDAR_EVENT_TYPES = ['IPO', 'IPO_UPCOMING', 'DIVIDEND', 'SPLIT', 'EARNINGS', 'ECONOMIC'] as const;
export type CalendarEventType = (typeof CALENDAR_EVENT_TYPES)[number];

export type CalendarMetricValue = number | string | null;

export interface CalendarEvent {
  id: string;
  eventType: CalendarEventType;
  date: string;
  region: string;
  symbol: string | null;
  companyName: string | null;
  title: string;
  detail: string | null;
  metrics: Record<string, CalendarMetricValue>;
  sourceUrl: string | null;
}

export type CalendarAvailability = 'READY' | 'EMPTY' | 'PARTIAL' | 'BACKEND_UNAVAILABLE' | 'ERROR';

export interface CalendarEnvelope {
  availability: CalendarAvailability;
  scope: MarketScope;
  events: CalendarEvent[];
  counts: Record<CalendarEventType, number>;
  message: string;
  warnings: string[];
  freshness: string | null;
  generatedAt: string | null;
  range: { from: string; to: string } | null;
}

/** Read-window presets (client-computed from today). */
export type CalendarRangePreset = 'UPCOMING' | 'RECENT' | 'WIDE';
