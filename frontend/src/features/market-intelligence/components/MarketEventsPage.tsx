/**
 * Market Events Feed — NR-105
 *
 * A morning-briefing view of chronological market events derived from
 * persisted datasets: bulk/block deals, F&O ban additions, 52-week breakouts,
 * and FII/DII daily flows.
 *
 * Research-support view only — descriptive, never advice.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import BarChartIcon from '@mui/icons-material/BarChart';
import { useMarketScope } from '@/contexts/MarketScopeContext';
import { NotApplicableForAssetClass } from '@/shared/components/NotApplicableForAssetClass';
import { fetchEventFeed, type EventFeedEnvelope, type EventTone, type EventType, type MarketEvent } from '../api/marketIntelligenceService';

// ---------------------------------------------------------------------------
// Tone config
// ---------------------------------------------------------------------------

const TONE_COLOR: Record<EventTone, string> = {
  positive: 'success.main',
  negative: 'error.main',
  risk: 'warning.main',
  info: 'text.secondary',
};

const TONE_BG: Record<EventTone, string> = {
  positive: 'success.light',
  negative: 'error.light',
  risk: 'warning.light',
  info: 'action.hover',
};

const TONE_BORDER: Record<EventTone, string> = {
  positive: 'success.main',
  negative: 'error.main',
  risk: 'warning.main',
  info: 'divider',
};

function ToneIcon({ tone }: { tone: EventTone }) {
  if (tone === 'positive') return <TrendingUpIcon fontSize="small" sx={{ color: 'success.main' }} />;
  if (tone === 'negative') return <TrendingDownIcon fontSize="small" sx={{ color: 'error.main' }} />;
  if (tone === 'risk') return <WarningAmberIcon fontSize="small" sx={{ color: 'warning.main' }} />;
  return <InfoOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} />;
}

// ---------------------------------------------------------------------------
// Type labels + colors
// ---------------------------------------------------------------------------

const TYPE_LABEL: Record<EventType, string> = {
  BULK_DEAL: 'Bulk Deal',
  BLOCK_DEAL: 'Block Deal',
  FNO_BAN_ENTRY: 'F&O Ban Entry',
  FNO_BAN_BATCH: 'F&O Ban List',
  BREAKOUT_52W_HIGH: '52W High',
  BREAKOUT_52W_LOW: '52W Low',
  FII_DII_FLOWS: 'Flows',
};

const TYPE_CHIP_COLOR: Record<EventType, 'default' | 'primary' | 'success' | 'error' | 'warning' | 'info'> = {
  BULK_DEAL: 'default',
  BLOCK_DEAL: 'primary',
  FNO_BAN_ENTRY: 'warning',
  FNO_BAN_BATCH: 'warning',
  BREAKOUT_52W_HIGH: 'success',
  BREAKOUT_52W_LOW: 'error',
  FII_DII_FLOWS: 'info',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDisplayDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function groupByDate(events: MarketEvent[]): Array<{ date: string; events: MarketEvent[] }> {
  const map = new Map<string, MarketEvent[]>();
  for (const ev of events) {
    const list = map.get(ev.date) ?? [];
    list.push(ev);
    map.set(ev.date, list);
  }
  return [...map.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, evs]) => ({ date, events: evs }));
}

// ---------------------------------------------------------------------------
// Symbol chip (links to /instrument-workspace/:symbol)
// ---------------------------------------------------------------------------

function SymbolChip({ symbol }: { symbol: string }) {
  return (
    <Chip
      component={RouterLink}
      to={`/instrument-workspace/${symbol}`}
      label={symbol}
      size="small"
      clickable
      variant="outlined"
      sx={{ fontSize: 11, height: 20, fontWeight: 600 }}
    />
  );
}

// ---------------------------------------------------------------------------
// Single event card
// ---------------------------------------------------------------------------

function EventCard({ event }: { event: MarketEvent }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.5,
        borderLeft: '3px solid',
        borderLeftColor: TONE_BORDER[event.tone],
        bgcolor: `${TONE_BG[event.tone]}10`,
      }}
    >
      <Stack direction="row" spacing={1} alignItems="flex-start">
        <Box sx={{ mt: 0.25, flexShrink: 0 }}>
          <ToneIcon tone={event.tone} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" sx={{ mb: 0.5 }}>
            <Chip
              label={TYPE_LABEL[event.type]}
              size="small"
              color={TYPE_CHIP_COLOR[event.type]}
              variant="filled"
              sx={{ fontSize: 10, height: 18, fontWeight: 700 }}
            />
            {event.symbols.length > 0 && event.symbols.length <= 5 && (
              event.symbols.map((sym) => <SymbolChip key={sym} symbol={sym} />)
            )}
            {event.symbols.length > 5 && (
              <Tooltip title={event.symbols.join(', ')} arrow>
                <Chip
                  label={`${event.symbols.length} symbols`}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: 10, height: 18 }}
                />
              </Tooltip>
            )}
          </Stack>
          <Typography variant="body2" sx={{ color: TONE_COLOR[event.tone], fontWeight: 500, wordBreak: 'break-word' }}>
            {event.description}
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );
}

// ---------------------------------------------------------------------------
// Date group
// ---------------------------------------------------------------------------

function DateGroup({ date, events }: { date: string; events: MarketEvent[] }) {
  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        <BarChartIcon fontSize="small" sx={{ color: 'text.secondary' }} />
        <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 700 }}>
          {formatDisplayDate(date)}
        </Typography>
        <Chip label={events.length} size="small" variant="outlined" sx={{ height: 18, fontSize: 10 }} />
      </Stack>
      <Stack spacing={1}>
        {events.map((ev) => (
          <EventCard key={ev.id} event={ev} />
        ))}
      </Stack>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Filter bar
// ---------------------------------------------------------------------------

type FilterType = 'ALL' | EventType;

const FILTER_OPTIONS: Array<{ value: FilterType; label: string }> = [
  { value: 'ALL', label: 'All Events' },
  { value: 'BULK_DEAL', label: 'Bulk Deals' },
  { value: 'BLOCK_DEAL', label: 'Block Deals' },
  { value: 'FNO_BAN_ENTRY', label: 'F&O Ban Entry' },
  { value: 'FNO_BAN_BATCH', label: 'F&O Ban List' },
  { value: 'BREAKOUT_52W_HIGH', label: '52W Highs' },
  { value: 'BREAKOUT_52W_LOW', label: '52W Lows' },
  { value: 'FII_DII_FLOWS', label: 'FII/DII Flows' },
];

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export function MarketEventsPage() {
  const { profile } = useMarketScope();
  const [days, setDays] = useState(5);
  const [filterType, setFilterType] = useState<FilterType>('ALL');
  const [envelope, setEnvelope] = useState<EventFeedEnvelope | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchEventFeed(days);
      setEnvelope(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load market events');
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { void load(); }, [load]);

  const filteredEvents = useMemo(() => {
    if (!envelope) return [];
    if (filterType === 'ALL') return envelope.events;
    return envelope.events.filter((ev) => ev.type === filterType);
  }, [envelope, filterType]);

  const groups = useMemo(() => groupByDate(filteredEvents), [filteredEvents]);

  if (profile.isCrypto) {
    return (
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 900, mx: 'auto' }}>
        <Box sx={{ mb: 2 }}>
          <Typography variant="h5" fontWeight={700}>
            Market Events
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Morning briefing — chronological feed from persisted data. Research support only, not investment advice.
          </Typography>
        </Box>
        <NotApplicableForAssetClass
          feature="Market Events"
          detail="Crypto coverage in this release is available on Signals, Market Scans, and the Instrument workspace. This view will support crypto in a later update."
        />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 900, mx: 'auto' }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" sx={{ mb: 2 }} spacing={1}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Market Events
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Morning briefing — chronological feed from persisted data. Research support only, not investment advice.
          </Typography>
          {envelope?.asOf && (
            <Typography variant="caption" color="text.secondary">
              Latest data as of {formatDisplayDate(envelope.asOf)}
              {envelope.generatedAt && ` · Generated ${new Date(envelope.generatedAt).toLocaleTimeString('en-IN')}`}
            </Typography>
          )}
        </Box>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <FormControl size="small" sx={{ minWidth: 110 }}>
            <InputLabel>Days</InputLabel>
            <Select
              value={days}
              label="Days"
              onChange={(e) => setDays(Number(e.target.value))}
            >
              {[1, 3, 5, 7, 10].map((d) => (
                <MenuItem key={d} value={d}>{d}d</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Type</InputLabel>
            <Select
              value={filterType}
              label="Type"
              onChange={(e) => setFilterType(e.target.value as FilterType)}
            >
              {FILTER_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </Stack>

      <Divider sx={{ mb: 2 }} />

      {/* Warnings */}
      {envelope?.warnings && envelope.warnings.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2, fontSize: 13 }}>
          {envelope.warnings.join(' · ')}
        </Alert>
      )}

      {/* Loading skeleton */}
      {loading && (
        <Stack spacing={1.5}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} variant="rectangular" height={64} sx={{ borderRadius: 1 }} />
          ))}
        </Stack>
      )}

      {/* Error */}
      {!loading && error && (
        <Alert severity="error">{error}</Alert>
      )}

      {/* Empty state */}
      {!loading && !error && filteredEvents.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
            No market events found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {filterType !== 'ALL'
              ? `No "${TYPE_LABEL[filterType as EventType]}" events in the last ${days} day(s). Try changing the filter or expanding the date range.`
              : `No events in the last ${days} day(s). Data may not have been ingested yet for this period.`}
          </Typography>
        </Paper>
      )}

      {/* Event groups */}
      {!loading && !error && groups.length > 0 && (
        <Stack spacing={3}>
          {groups.map(({ date, events }) => (
            <DateGroup key={date} date={date} events={events} />
          ))}
          <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', display: 'block', mt: 1 }}>
            Showing {filteredEvents.length} event(s) from persisted data. For research purposes only.
          </Typography>
        </Stack>
      )}
    </Box>
  );
}

export default MarketEventsPage;
