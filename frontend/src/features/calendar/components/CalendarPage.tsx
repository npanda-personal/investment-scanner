import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Chip,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { useMarketScope } from '@/contexts/MarketScopeContext';
import {
  DataTable,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  type DataTableColumn,
} from '@/shared/components';
import { NotApplicableForAssetClass } from '@/shared/components/NotApplicableForAssetClass';
import { fetchCalendar } from '../api/calendarService';
import {
  type CalendarEnvelope,
  type CalendarEvent,
  type CalendarEventType,
  type CalendarRangePreset,
} from '../types';

const DAY_MS = 24 * 60 * 60 * 1000;

type TabKey = 'ALL' | CalendarEventType;

const TAB_ORDER: { key: TabKey; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'IPO', label: 'IPO' },
  { key: 'DIVIDEND', label: 'Dividends' },
  { key: 'SPLIT', label: 'Splits' },
  { key: 'EARNINGS', label: 'Earnings' },
  { key: 'ECONOMIC', label: 'Economic' },
];

const RANGE_PRESETS: { key: CalendarRangePreset; label: string; pastDays: number; futureDays: number }[] = [
  { key: 'UPCOMING', label: 'Upcoming (next 90 days)', pastDays: 7, futureDays: 90 },
  { key: 'RECENT', label: 'Recent (last 30 days)', pastDays: 30, futureDays: 7 },
  { key: 'WIDE', label: 'Wide (±180 days)', pastDays: 180, futureDays: 180 },
];

const EVENT_TYPE_LABEL: Record<CalendarEventType, string> = {
  IPO: 'IPO',
  IPO_UPCOMING: 'IPO (upcoming)',
  DIVIDEND: 'Dividend',
  SPLIT: 'Split',
  EARNINGS: 'Earnings',
  ECONOMIC: 'Economic',
};

/** IPO sub-tab + Closed timeframe — both persisted in the URL alongside ?tab=IPO. */
type IpoSub = 'UPCOMING' | 'CLOSED';
type IpoTimeframe = '1M' | '3M' | '6M';
const IPO_TIMEFRAMES: { key: IpoTimeframe; months: number }[] = [
  { key: '1M', months: 1 },
  { key: '3M', months: 3 },
  { key: '6M', months: 6 },
];

function isoDay(d: Date): string {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString().slice(0, 10);
}

function rangeToDates(preset: CalendarRangePreset): { from: string; to: string } {
  const cfg = RANGE_PRESETS.find((r) => r.key === preset) ?? RANGE_PRESETS[0];
  const today = Date.now();
  return {
    from: isoDay(new Date(today - cfg.pastDays * DAY_MS)),
    to: isoDay(new Date(today + cfg.futureDays * DAY_MS)),
  };
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

function num(value: unknown, digits = 2): string {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function percent(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  const pct = n * 100;
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
}

function metric(row: CalendarEvent, key: string): unknown {
  return row.metrics ? row.metrics[key] : undefined;
}

// ---- Per-tab column definitions ------------------------------------------

function nameCell(row: CalendarEvent) {
  return (
    <Stack spacing={0}>
      <Typography variant="body2" fontWeight={600}>{row.symbol ?? row.title}</Typography>
      {row.companyName && row.companyName !== row.symbol && (
        <Typography variant="caption" color="text.secondary">{row.companyName}</Typography>
      )}
    </Stack>
  );
}

const allColumns: DataTableColumn<CalendarEvent>[] = [
  { id: 'date', label: 'Date', minWidth: 110, render: (r) => formatDate(r.date) },
  {
    id: 'type',
    label: 'Type',
    minWidth: 96,
    render: (r) => <Chip size="small" variant="outlined" label={EVENT_TYPE_LABEL[r.eventType]} />,
  },
  { id: 'name', label: 'Instrument / Release', minWidth: 200, render: nameCell },
  { id: 'title', label: 'Event', minWidth: 220, render: (r) => r.title },
  { id: 'detail', label: 'Detail', minWidth: 140, render: (r) => r.detail ?? '—' },
];

type ChipColor = 'success' | 'error' | 'warning' | 'info' | 'default';

function dash() {
  return <Typography variant="body2" color="text.secondary">—</Typography>;
}

/** Recent-direction trend chip (read-time, from persisted closes). */
function trendCell(r: CalendarEvent) {
  const dir = metric(r, 'trendDirection') as string | null;
  if (!dir) return dash();
  const cfg: Record<string, { c: ChipColor; arrow: string }> = {
    UP: { c: 'success', arrow: '▲' },
    DOWN: { c: 'error', arrow: '▼' },
    FLAT: { c: 'default', arrow: '▬' },
  };
  const m = cfg[dir] ?? cfg.FLAT;
  const pct = metric(r, 'trendPct');
  const label = pct === null || pct === undefined ? m.arrow : `${m.arrow} ${percent(pct)}`;
  return <Chip size="small" variant="outlined" color={m.c} label={label} />;
}

/** Snapshot freshness rendered as a "health" badge. */
function healthCell(r: CalendarEvent) {
  const f = metric(r, 'freshness') as string | null;
  if (!f) return dash();
  const cfg: Record<string, { c: ChipColor; l: string }> = {
    FRESH: { c: 'success', l: 'Fresh' },
    PARTIAL: { c: 'warning', l: 'Partial' },
    NO_DATA: { c: 'default', l: 'No data' },
  };
  const m = cfg[f] ?? { c: 'default' as ChipColor, l: f };
  return <Chip size="small" variant="outlined" color={m.c} label={m.l} />;
}

/** Real signal-engine verdict; "—" when no trusted signal exists yet (never an error). */
function signalCell(r: CalendarEvent) {
  const dir = metric(r, 'signalDirection') as string | null;
  if (!dir) return dash();
  const cfg: Record<string, { c: ChipColor; l: string }> = {
    BULLISH: { c: 'success', l: 'Bullish' },
    BEARISH: { c: 'error', l: 'Bearish' },
    NEUTRAL: { c: 'default', l: 'Neutral' },
  };
  const m = cfg[dir] ?? { c: 'default' as ChipColor, l: dir };
  return <Chip size="small" color={m.c} label={m.l} />;
}

// IPO "Closed" sub-tab: already-listed → return · trend · health · signal.
const ipoClosedColumns: DataTableColumn<CalendarEvent>[] = [
  { id: 'name', label: 'Company', minWidth: 200, render: nameCell },
  { id: 'listed', label: 'Listed', minWidth: 110, render: (r) => formatDate(r.date) },
  {
    id: 'return',
    label: 'Return since listing',
    align: 'right',
    minWidth: 150,
    render: (r) => percent(metric(r, 'returnSinceListing')),
  },
  { id: 'trend', label: 'Trend', minWidth: 120, render: trendCell },
  { id: 'health', label: 'Health', minWidth: 110, render: healthCell },
  { id: 'signal', label: 'Signal', minWidth: 110, render: signalCell },
  { id: 'exchange', label: 'Exchange', minWidth: 100, render: (r) => (metric(r, 'exchange') as string) ?? '—' },
];

function upcomingNameCell(r: CalendarEvent) {
  return (
    <Stack spacing={0}>
      <Typography variant="body2" fontWeight={600}>{r.companyName ?? r.symbol ?? r.title}</Typography>
      {r.symbol && <Typography variant="caption" color="text.secondary">{r.symbol}</Typography>}
    </Stack>
  );
}

function priceBand(r: CalendarEvent): string {
  const lo = metric(r, 'priceBandMin');
  const hi = metric(r, 'priceBandMax');
  if ((lo === null || lo === undefined) && (hi === null || hi === undefined)) return '—';
  if (lo !== null && lo !== undefined && hi !== null && hi !== undefined) return `₹${num(lo)} – ₹${num(hi)}`;
  return `₹${num(lo ?? hi)}`;
}

function subscriptionWindow(r: CalendarEvent): string {
  const o = metric(r, 'openDate') as string | null;
  const c = metric(r, 'closeDate') as string | null;
  if (!o && !c) return '—';
  return `${formatDate(o)} – ${formatDate(c)}`;
}

function statusCell(r: CalendarEvent) {
  const s = metric(r, 'status') as string | null;
  if (!s) return dash();
  const ongoing = s === 'ONGOING';
  return (
    <Chip
      size="small"
      color={ongoing ? 'success' : 'info'}
      variant={ongoing ? 'filled' : 'outlined'}
      label={ongoing ? 'Open now' : 'Upcoming'}
    />
  );
}

// IPO "Upcoming" sub-tab: forthcoming/ongoing subscription data (descriptive only).
const ipoUpcomingColumns: DataTableColumn<CalendarEvent>[] = [
  { id: 'name', label: 'Company', minWidth: 200, render: upcomingNameCell },
  {
    id: 'exchangeType',
    label: 'Exchange / Type',
    minWidth: 150,
    render: (r) => {
      const ex = metric(r, 'exchange') as string | null;
      const tp = metric(r, 'ipoType') as string | null;
      const tpLabel = tp ? (tp === 'SME' ? 'SME' : 'Mainboard') : null;
      return [ex, tpLabel].filter(Boolean).join(' · ') || '—';
    },
  },
  { id: 'subscription', label: 'Subscription', minWidth: 180, render: subscriptionWindow },
  { id: 'priceBand', label: 'Price band', align: 'right', minWidth: 130, render: priceBand },
  {
    id: 'issueSize',
    label: 'Issue size',
    align: 'right',
    minWidth: 120,
    render: (r) => {
      const v = metric(r, 'issueSizeCr');
      return v === null || v === undefined ? '—' : `₹${num(v, 0)} Cr`;
    },
  },
  { id: 'status', label: 'Status', minWidth: 110, render: statusCell },
  { id: 'expectedListing', label: 'Expected listing', minWidth: 140, render: (r) => formatDate(metric(r, 'expectedListingDate') as string) },
];

const dividendColumns: DataTableColumn<CalendarEvent>[] = [
  { id: 'name', label: 'Company', minWidth: 200, render: nameCell },
  { id: 'exDate', label: 'Effective date', minWidth: 120, render: (r) => formatDate(r.date) },
  { id: 'amount', label: 'Amount', align: 'right', minWidth: 110, render: (r) => num(metric(r, 'amount')) },
  { id: 'currency', label: 'Currency', minWidth: 90, render: (r) => (metric(r, 'currency') as string) ?? '—' },
  { id: 'payment', label: 'Payment date', minWidth: 120, render: (r) => formatDate(metric(r, 'paymentDate') as string) },
];

const splitColumns: DataTableColumn<CalendarEvent>[] = [
  { id: 'name', label: 'Company', minWidth: 200, render: nameCell },
  { id: 'exDate', label: 'Effective date', minWidth: 120, render: (r) => formatDate(r.date) },
  { id: 'event', label: 'Event', minWidth: 140, render: (r) => r.title },
  { id: 'ratio', label: 'Ratio', align: 'right', minWidth: 100, render: (r) => num(metric(r, 'ratio')) },
  { id: 'actionType', label: 'Type', minWidth: 130, render: (r) => (metric(r, 'actionType') as string) ?? '—' },
];

const earningsColumns: DataTableColumn<CalendarEvent>[] = [
  { id: 'name', label: 'Company', minWidth: 200, render: nameCell },
  { id: 'resultDate', label: 'Result date', minWidth: 120, render: (r) => formatDate(r.date) },
  { id: 'daysToResult', label: 'Days to result', align: 'right', minWidth: 120, render: (r) => num(metric(r, 'daysToResult'), 0) },
  { id: 'source', label: 'Date source', minWidth: 130, render: (r) => (metric(r, 'resultDateSource') as string) ?? '—' },
];

const economicColumns: DataTableColumn<CalendarEvent>[] = [
  { id: 'release', label: 'Release', minWidth: 240, render: (r) => r.title },
  { id: 'date', label: 'Date', minWidth: 120, render: (r) => formatDate(r.date) },
  { id: 'actual', label: 'Actual', align: 'right', minWidth: 110, render: (r) => num(metric(r, 'actualValue')) },
  { id: 'previous', label: 'Previous', align: 'right', minWidth: 110, render: (r) => num(metric(r, 'previousValue')) },
  { id: 'unit', label: 'Unit', minWidth: 160, render: (r) => (metric(r, 'unit') as string) ?? '—' },
];

function columnsForTab(tab: TabKey, ipoSub: IpoSub): DataTableColumn<CalendarEvent>[] {
  switch (tab) {
    case 'IPO': return ipoSub === 'UPCOMING' ? ipoUpcomingColumns : ipoClosedColumns;
    case 'DIVIDEND': return dividendColumns;
    case 'SPLIT': return splitColumns;
    case 'EARNINGS': return earningsColumns;
    case 'ECONOMIC': return economicColumns;
    default: return allColumns;
  }
}

const TAB_EMPTY_MESSAGE: Record<TabKey, string> = {
  ALL: 'No calendar events for this scope and window.',
  IPO: 'No recently-listed companies in this window. Run a calendar refresh to materialize IPO data.',
  IPO_UPCOMING: 'No forthcoming IPOs ingested yet (NSE/BSE). Run a calendar refresh.',
  DIVIDEND: 'No dividend actions recorded for this region and window.',
  SPLIT: 'No splits or bonus issues recorded for this region and window.',
  EARNINGS: 'No upcoming results in this window for this region.',
  ECONOMIC: 'No economic releases ingested yet (FRED, US/global). Run a calendar refresh.',
};

// ---- Page ----------------------------------------------------------------

export function CalendarPage() {
  const { scope, profile } = useMarketScope();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Economic releases are US/global (FRED); hide that tab outside US.
  const visibleTabs = useMemo(
    () => TAB_ORDER.filter((t) => t.key !== 'ECONOMIC' || scope.region === 'US'),
    [scope.region],
  );
  // Tab lives in the URL so browser-back from an instrument page restores it.
  const tabParam = (searchParams.get('tab') ?? 'ALL') as TabKey;
  const tab: TabKey = visibleTabs.some((t) => t.key === tabParam) ? tabParam : 'ALL';
  // IPO sub-tab + Closed timeframe live in the URL (?tab=IPO&ipo=CLOSED&tf=3M) so reload/back restore them.
  const ipoSub: IpoSub = (searchParams.get('ipo') ?? 'UPCOMING') === 'CLOSED' ? 'CLOSED' : 'UPCOMING';
  const tfParam = (searchParams.get('tf') ?? '3M') as IpoTimeframe;
  const tf: IpoTimeframe = IPO_TIMEFRAMES.some((t) => t.key === tfParam) ? tfParam : '3M';
  const ipoMonths = IPO_TIMEFRAMES.find((t) => t.key === tf)?.months ?? 3;

  const selectTab = useCallback(
    (next: TabKey) => {
      if (next === 'ALL') return setSearchParams({}, { replace: false });
      // Default the IPO parent into its Upcoming sub-tab; other tabs carry only ?tab.
      if (next === 'IPO') return setSearchParams({ tab: 'IPO', ipo: 'UPCOMING', tf }, { replace: false });
      return setSearchParams({ tab: next }, { replace: false });
    },
    [setSearchParams, tf],
  );
  const selectIpoSub = useCallback(
    (next: IpoSub) => setSearchParams({ tab: 'IPO', ipo: next, tf }, { replace: false }),
    [setSearchParams, tf],
  );
  const selectTimeframe = useCallback(
    (next: IpoTimeframe) => setSearchParams({ tab: 'IPO', ipo: 'CLOSED', tf: next }, { replace: false }),
    [setSearchParams],
  );
  const openInstrument = useCallback(
    (row: CalendarEvent) => {
      if (row.symbol) navigate(`/instrument-workspace/${encodeURIComponent(row.symbol)}`);
    },
    [navigate],
  );

  const [preset, setPreset] = useState<CalendarRangePreset>('UPCOMING');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  const [data, setData] = useState<CalendarEnvelope | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);

  const range = useMemo(() => rangeToDates(preset), [preset]);

  const loader = useCallback(
    () => fetchCalendar(scope, { from: range.from, to: range.to, limit: 500, ipoMonths }),
    [scope, range, ipoMonths],
  );

  useEffect(() => {
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    setLoading(true);
    setError(null);
    loader()
      .then((next) => {
        if (requestRef.current !== requestId) return;
        setData(next);
        if (next.availability === 'ERROR') setError(next.warnings[0] ?? next.message);
      })
      .catch((caught) => {
        if (requestRef.current !== requestId) return;
        setData(null);
        setError(caught instanceof Error ? caught.message : 'Calendar unavailable.');
      })
      .finally(() => {
        if (requestRef.current === requestId) setLoading(false);
      });
  }, [loader]);

  // Reset pagination when the active tab, sub-tab, timeframe or range changes.
  useEffect(() => { setPage(0); }, [tab, ipoSub, tf, preset, scope]);

  // Drop a stale ?tab when its tab is no longer visible (e.g. region switched away from US).
  useEffect(() => {
    if (tabParam !== 'ALL' && !visibleTabs.some((t) => t.key === tabParam)) {
      setSearchParams({}, { replace: true });
    }
  }, [tabParam, visibleTabs, setSearchParams]);

  const filtered = useMemo(() => {
    const events = data?.events ?? [];
    if (tab === 'ALL') return events;
    if (tab === 'IPO') {
      // Parent IPO tab splits client-side: Upcoming = forthcoming feed, Closed = already-listed.
      const wantType: CalendarEventType = ipoSub === 'UPCOMING' ? 'IPO_UPCOMING' : 'IPO';
      return events.filter((e) => e.eventType === wantType);
    }
    return events.filter((e) => e.eventType === tab);
  }, [data, tab, ipoSub]);
  const pageRows = useMemo(
    () => filtered.slice(page * pageSize, page * pageSize + pageSize),
    [filtered, page, pageSize],
  );

  // Crypto has no calendar coverage in this release (nav hides it; guard defensively).
  if (profile.isCrypto) {
    return (
      <Box className="page-container page-container--hub">
        <PageHeader title="Calendar" subtitle="IPOs, dividends, splits, results and economic releases." />
        <NotApplicableForAssetClass
          feature="Calendar"
          detail="The events calendar covers equities (IN and US). Crypto coverage is available on Market Scans and the Instrument workspace."
        />
      </Box>
    );
  }

  const counts = data?.counts;
  const tabLabel = (t: { key: TabKey; label: string }) => {
    if (t.key === 'ALL' || !counts) return t.label;
    // IPO parent aggregates both families (Closed + Upcoming).
    const c = t.key === 'IPO' ? (counts.IPO ?? 0) + (counts.IPO_UPCOMING ?? 0) : counts[t.key];
    return c ? `${t.label} (${c})` : t.label;
  };

  const emptyMessage = tab === 'IPO' && ipoSub === 'UPCOMING' ? TAB_EMPTY_MESSAGE.IPO_UPCOMING : TAB_EMPTY_MESSAGE[tab];
  // Upcoming IPOs are pre-listing (no tradable symbol) → not row-clickable; economic rows never link.
  const rowClickHandler = tab === 'ECONOMIC' || (tab === 'IPO' && ipoSub === 'UPCOMING') ? undefined : openInstrument;

  return (
    <Box className="page-container page-container--hub">
      <PageHeader
        title="Calendar"
        subtitle="Recently listed IPOs, dividends, splits, upcoming results and economic releases — a research-support view across the events that move attention."
        primaryAction={
          <TextField
            select
            size="small"
            label="Window"
            value={preset}
            onChange={(e) => setPreset(e.target.value as CalendarRangePreset)}
            sx={{ minWidth: 220 }}
          >
            {RANGE_PRESETS.map((r) => (
              <MenuItem key={r.key} value={r.key}>{r.label}</MenuItem>
            ))}
          </TextField>
        }
      />

      <Tabs
        value={tab}
        onChange={(_, next) => selectTab(next as TabKey)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        {visibleTabs.map((t) => (
          <Tab key={t.key} value={t.key} label={tabLabel(t)} />
        ))}
      </Tabs>

      {tab === 'IPO' && (
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5, flexWrap: 'wrap', rowGap: 1 }}>
          <Tabs
            value={ipoSub}
            onChange={(_, next) => selectIpoSub(next as IpoSub)}
            sx={{ minHeight: 36, '& .MuiTab-root': { minHeight: 36, py: 0 } }}
          >
            <Tab value="UPCOMING" label="Upcoming" />
            <Tab value="CLOSED" label="Closed" />
          </Tabs>
          {ipoSub === 'CLOSED' && (
            <Stack direction="row" spacing={0.75} alignItems="center">
              <Typography variant="caption" color="text.secondary">Listed in last</Typography>
              {IPO_TIMEFRAMES.map((t) => (
                <Chip
                  key={t.key}
                  size="small"
                  label={t.key}
                  color={tf === t.key ? 'primary' : 'default'}
                  variant={tf === t.key ? 'filled' : 'outlined'}
                  onClick={() => selectTimeframe(t.key)}
                />
              ))}
            </Stack>
          )}
        </Stack>
      )}

      {tab === 'IPO' && ipoSub === 'UPCOMING' && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          Forthcoming and currently-open IPOs from NSE/BSE — subscription window, price band and issue size. Descriptive data only.
        </Typography>
      )}

      {tab === 'ECONOMIC' && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          Economic releases are US/global (FRED): release date with latest actual and previous value. FRED carries no forecasts.
        </Typography>
      )}

      {loading ? (
        <LoadingState message="Loading calendar…" />
      ) : error ? (
        <ErrorState message={error} />
      ) : filtered.length === 0 ? (
        <EmptyState title="Nothing scheduled here yet" message={emptyMessage} />
      ) : (
        <>
          {data?.warnings && data.warnings.length > 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              {data.warnings[0]}
            </Typography>
          )}
          <DataTable<CalendarEvent>
            columns={columnsForTab(tab, ipoSub)}
            rows={pageRows}
            getRowId={(r) => r.id}
            page={page}
            pageSize={pageSize}
            totalCount={filtered.length}
            onPageChange={setPage}
            onPageSizeChange={(size) => { setPageSize(size); setPage(0); }}
            emptyMessage={emptyMessage}
            onRowClick={rowClickHandler}
          />
        </>
      )}

      {data?.generatedAt && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          Generated {formatDate(data.generatedAt)}. Data refreshes on a schedule — not live on page load.
        </Typography>
      )}
    </Box>
  );
}

export default CalendarPage;
