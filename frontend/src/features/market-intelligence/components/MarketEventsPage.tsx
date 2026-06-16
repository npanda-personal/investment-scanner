/**
 * Market Events Feed — NR-105
 *
 * A morning-briefing view of chronological market events derived from
 * persisted datasets: bulk/block deals, F&O ban additions, 52-week breakouts,
 * and FII/DII daily flows.
 *
 * Split into three tabs: Bulk Deals, Block Deals, and Other Events (F&O bans,
 * breakouts, FII/DII flows). Each tab has its own pagination. The days-window
 * selector is global; changing it reloads all three tabs and resets their pages.
 *
 * Research-support view only — descriptive, never advice.
 */

import { useCallback, useEffect, useMemo, useState, type SyntheticEvent } from 'react';
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
  Tab,
  TablePagination,
  Tabs,
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
// Tab identifiers
// ---------------------------------------------------------------------------

type EventTab = 'BULK_DEAL' | 'BLOCK_DEAL' | 'OTHER';

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

function isOtherEvent(type: EventType): boolean {
  return type !== 'BULK_DEAL' && type !== 'BLOCK_DEAL';
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
// Other-events filter (non-deal types only)
// ---------------------------------------------------------------------------

type OtherFilterType = 'ALL_OTHER' | 'FNO_BAN_ENTRY' | 'FNO_BAN_BATCH' | 'BREAKOUT_52W_HIGH' | 'BREAKOUT_52W_LOW' | 'FII_DII_FLOWS';

const OTHER_FILTER_OPTIONS: Array<{ value: OtherFilterType; label: string }> = [
  { value: 'ALL_OTHER', label: 'All Other' },
  { value: 'FNO_BAN_ENTRY', label: 'F&O Ban Entry' },
  { value: 'FNO_BAN_BATCH', label: 'F&O Ban List' },
  { value: 'BREAKOUT_52W_HIGH', label: '52W Highs' },
  { value: 'BREAKOUT_52W_LOW', label: '52W Lows' },
  { value: 'FII_DII_FLOWS', label: 'FII/DII Flows' },
];

// ---------------------------------------------------------------------------
// Per-tab pagination state
// ---------------------------------------------------------------------------

interface TabPagination {
  page: number;
  rowsPerPage: number;
}

const DEFAULT_ROWS_PER_PAGE = 25;

function resetPagination(): TabPagination {
  return { page: 0, rowsPerPage: DEFAULT_ROWS_PER_PAGE };
}

// ---------------------------------------------------------------------------
// Tab panel — renders one tab's event list with its own pagination
// ---------------------------------------------------------------------------

interface TabPanelProps {
  events: MarketEvent[];
  emptyText: string;
  pagination: TabPagination;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rowsPerPage: number) => void;
}

function EventTabPanel({ events, emptyText, pagination, onPageChange, onRowsPerPageChange }: TabPanelProps) {
  const { page, rowsPerPage } = pagination;

  const pagedEvents = useMemo(
    () => events.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [events, page, rowsPerPage],
  );

  const groups = useMemo(() => groupByDate(pagedEvents), [pagedEvents]);

  if (events.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          {emptyText}
        </Typography>
      </Paper>
    );
  }

  return (
    <>
      <Stack spacing={3}>
        {groups.map(({ date, events: grpEvents }) => (
          <DateGroup key={date} date={date} events={grpEvents} />
        ))}
        <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', display: 'block', mt: 1 }}>
          Showing {pagedEvents.length} of {events.length} event(s). For research purposes only.
        </Typography>
      </Stack>
      <Paper variant="outlined" sx={{ mt: 2 }}>
        <TablePagination
          component="div"
          count={events.length}
          page={page}
          onPageChange={(_e, newPage) => onPageChange(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => { onRowsPerPageChange(parseInt(e.target.value, 10)); }}
          rowsPerPageOptions={[10, 25, 50, 100]}
          labelRowsPerPage="Events per page:"
        />
      </Paper>
    </>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export function MarketEventsPage() {
  const { profile } = useMarketScope();
  const [days, setDays] = useState(5);
  const [envelope, setEnvelope] = useState<EventFeedEnvelope | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Three independent pagination states — one per tab
  const [bulkPagination, setBulkPagination] = useState<TabPagination>(resetPagination());
  const [blockPagination, setBlockPagination] = useState<TabPagination>(resetPagination());
  const [otherPagination, setOtherPagination] = useState<TabPagination>(resetPagination());

  // Active tab (preserved across days reload). Bulk/Block deals are NSE-only, so default to Other elsewhere.
  const [activeTab, setActiveTab] = useState<EventTab>(profile.capabilities.hasInstitutionalFlow ? 'BULK_DEAL' : 'OTHER');

  // Other-events type filter
  const [otherFilter, setOtherFilter] = useState<OtherFilterType>('ALL_OTHER');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    // Reset all paginations on reload
    setBulkPagination(resetPagination());
    setBlockPagination(resetPagination());
    setOtherPagination(resetPagination());
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

  // Reset other-tab pagination when its filter changes
  useEffect(() => { setOtherPagination(resetPagination()); }, [otherFilter]);

  // Derived event lists for each tab
  const bulkEvents = useMemo(
    () => envelope?.events.filter((ev) => ev.type === 'BULK_DEAL') ?? [],
    [envelope],
  );

  const blockEvents = useMemo(
    () => envelope?.events.filter((ev) => ev.type === 'BLOCK_DEAL') ?? [],
    [envelope],
  );

  const otherEventsBase = useMemo(
    () => envelope?.events.filter((ev) => isOtherEvent(ev.type)) ?? [],
    [envelope],
  );

  const otherEvents = useMemo(() => {
    if (otherFilter === 'ALL_OTHER') return otherEventsBase;
    return otherEventsBase.filter((ev) => ev.type === otherFilter);
  }, [otherEventsBase, otherFilter]);

  const handleTabChange = (_event: SyntheticEvent, value: EventTab) => {
    setActiveTab(value);
  };

  if (profile.isCrypto) {
    return (
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 900, mx: 'auto' }}>
        <Box sx={{ mb: 2 }}>
          <Typography variant="h5" fontWeight={700}>
            Market Events
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Morning briefing — chronological feed of recent market events. Research support only, not investment advice.
          </Typography>
        </Box>
        <NotApplicableForAssetClass
          feature="Market Events"
          detail="Crypto coverage in this release is available on Market Scans and the Instrument workspace. This view will support crypto in a later update."
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
            Morning briefing — chronological feed of recent market events. Research support only, not investment advice.
          </Typography>
          {envelope?.asOf && (
            <Typography variant="caption" color="text.secondary">
              Latest data as of {formatDisplayDate(envelope.asOf)}
              {envelope.generatedAt && ` · Generated ${new Date(envelope.generatedAt).toLocaleTimeString('en-IN')}`}
            </Typography>
          )}
        </Box>
        {/* Global days selector */}
        <Stack direction="row" spacing={1} alignItems="center">
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

      {/* Three-tab layout */}
      {!loading && !error && (
        <>
          {/* Tab strip */}
          <Paper variant="outlined" sx={{ mb: 2 }}>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
              allowScrollButtonsMobile
              aria-label="Market events by category"
            >
              {/* Bulk & Block deals are sourced from the NSE feed (India only) — hide them elsewhere. */}
              {profile.capabilities.hasInstitutionalFlow && [
                { value: 'BULK_DEAL' as const, text: 'Bulk Deals', count: bulkEvents.length },
                { value: 'BLOCK_DEAL' as const, text: 'Block Deals', count: blockEvents.length },
              ].map((t) => (
                <Tab
                  key={t.value}
                  value={t.value}
                  label={
                    <Stack direction="row" spacing={0.75} alignItems="center">
                      <span>{t.text}</span>
                      <Chip label={t.count} size="small" variant="outlined" sx={{ height: 18, fontSize: 10, pointerEvents: 'none' }} />
                    </Stack>
                  }
                />
              ))}
              <Tab
                value="OTHER"
                label={
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    <span>Other Events</span>
                    <Chip label={otherEventsBase.length} size="small" variant="outlined" sx={{ height: 18, fontSize: 10, pointerEvents: 'none' }} />
                  </Stack>
                }
              />
            </Tabs>
          </Paper>

          {/* Bulk Deals tab */}
          {activeTab === 'BULK_DEAL' && (
            <EventTabPanel
              events={bulkEvents}
              emptyText={`No bulk deals in the last ${days} day(s).`}
              pagination={bulkPagination}
              onPageChange={(p) => setBulkPagination((prev) => ({ ...prev, page: p }))}
              onRowsPerPageChange={(rpp) => setBulkPagination({ page: 0, rowsPerPage: rpp })}
            />
          )}

          {/* Block Deals tab */}
          {activeTab === 'BLOCK_DEAL' && (
            <EventTabPanel
              events={blockEvents}
              emptyText={`No block deals in the last ${days} day(s).`}
              pagination={blockPagination}
              onPageChange={(p) => setBlockPagination((prev) => ({ ...prev, page: p }))}
              onRowsPerPageChange={(rpp) => setBlockPagination({ page: 0, rowsPerPage: rpp })}
            />
          )}

          {/* Other Events tab */}
          {activeTab === 'OTHER' && (
            <Box>
              {/* Type filter for Other Events only */}
              <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
                <FormControl size="small" sx={{ minWidth: 170 }}>
                  <InputLabel>Event Type</InputLabel>
                  <Select
                    value={otherFilter}
                    label="Event Type"
                    onChange={(e) => setOtherFilter(e.target.value as OtherFilterType)}
                  >
                    {OTHER_FILTER_OPTIONS.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
              <EventTabPanel
                events={otherEvents}
                emptyText={
                  otherFilter !== 'ALL_OTHER'
                    ? `No "${OTHER_FILTER_OPTIONS.find((o) => o.value === otherFilter)?.label ?? otherFilter}" events in the last ${days} day(s).`
                    : `No other events in the last ${days} day(s).`
                }
                pagination={otherPagination}
                onPageChange={(p) => setOtherPagination((prev) => ({ ...prev, page: p }))}
                onRowsPerPageChange={(rpp) => setOtherPagination({ page: 0, rowsPerPage: rpp })}
              />
            </Box>
          )}
        </>
      )}
    </Box>
  );
}

export default MarketEventsPage;
