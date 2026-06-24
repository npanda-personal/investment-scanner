import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
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
  DIVIDEND: 'Dividend',
  SPLIT: 'Split',
  EARNINGS: 'Earnings',
  ECONOMIC: 'Economic',
};

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

const ipoColumns: DataTableColumn<CalendarEvent>[] = [
  { id: 'name', label: 'Company', minWidth: 200, render: nameCell },
  { id: 'listed', label: 'Listed', minWidth: 110, render: (r) => formatDate(r.date) },
  { id: 'daysListed', label: 'Days listed', align: 'right', minWidth: 100, render: (r) => num(metric(r, 'daysListed'), 0) },
  { id: 'firstClose', label: 'First close', align: 'right', minWidth: 110, render: (r) => num(metric(r, 'firstClose')) },
  { id: 'latestClose', label: 'Last price', align: 'right', minWidth: 110, render: (r) => num(metric(r, 'latestClose')) },
  {
    id: 'return',
    label: 'Return since listing',
    align: 'right',
    minWidth: 150,
    render: (r) => percent(metric(r, 'returnSinceListing')),
  },
  { id: 'sector', label: 'Sector', minWidth: 140, render: (r) => (metric(r, 'sector') as string) ?? '—' },
  { id: 'exchange', label: 'Exchange', minWidth: 110, render: (r) => (metric(r, 'exchange') as string) ?? '—' },
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
  {
    id: 'open',
    label: '',
    align: 'right',
    minWidth: 60,
    render: () => <OpenInNewIcon fontSize="small" color="action" />,
  },
];

const economicColumns: DataTableColumn<CalendarEvent>[] = [
  { id: 'release', label: 'Release', minWidth: 240, render: (r) => r.title },
  { id: 'date', label: 'Date', minWidth: 120, render: (r) => formatDate(r.date) },
  { id: 'actual', label: 'Actual', align: 'right', minWidth: 110, render: (r) => num(metric(r, 'actualValue')) },
  { id: 'previous', label: 'Previous', align: 'right', minWidth: 110, render: (r) => num(metric(r, 'previousValue')) },
  { id: 'unit', label: 'Unit', minWidth: 160, render: (r) => (metric(r, 'unit') as string) ?? '—' },
];

function columnsForTab(tab: TabKey): DataTableColumn<CalendarEvent>[] {
  switch (tab) {
    case 'IPO': return ipoColumns;
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
  DIVIDEND: 'No dividend actions recorded for this region and window.',
  SPLIT: 'No splits or bonus issues recorded for this region and window.',
  EARNINGS: 'No upcoming results in this window — open Earnings Intelligence for the full view.',
  ECONOMIC: 'No economic releases ingested yet (FRED, US/global). Run a calendar refresh.',
};

// ---- Page ----------------------------------------------------------------

export function CalendarPage() {
  const { scope, profile } = useMarketScope();
  const navigate = useNavigate();

  const [tab, setTab] = useState<TabKey>('ALL');
  const [preset, setPreset] = useState<CalendarRangePreset>('UPCOMING');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  const [data, setData] = useState<CalendarEnvelope | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);

  const range = useMemo(() => rangeToDates(preset), [preset]);

  const loader = useCallback(() => fetchCalendar(scope, { from: range.from, to: range.to, limit: 500 }), [scope, range]);

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

  // Reset pagination when the active tab or range changes.
  useEffect(() => { setPage(0); }, [tab, preset, scope]);

  const filtered = useMemo(() => {
    const events = data?.events ?? [];
    return tab === 'ALL' ? events : events.filter((e) => e.eventType === tab);
  }, [data, tab]);
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
    const c = counts[t.key];
    return c ? `${t.label} (${c})` : t.label;
  };

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
        onChange={(_, next) => setTab(next as TabKey)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        {TAB_ORDER.map((t) => (
          <Tab key={t.key} value={t.key} label={tabLabel(t)} />
        ))}
      </Tabs>

      {tab === 'ECONOMIC' && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          Economic releases are US/global (FRED): release date with latest actual and previous value. FRED carries no forecasts.
        </Typography>
      )}

      {tab === 'EARNINGS' && (
        <Stack direction="row" justifyContent="flex-end" sx={{ mb: 1 }}>
          <Button
            size="small"
            endIcon={<OpenInNewIcon />}
            onClick={() => navigate('/earnings-intelligence')}
          >
            Open Earnings Intelligence
          </Button>
        </Stack>
      )}

      {loading ? (
        <LoadingState message="Loading calendar…" />
      ) : error ? (
        <ErrorState message={error} />
      ) : filtered.length === 0 ? (
        <EmptyState title="Nothing scheduled here yet" message={TAB_EMPTY_MESSAGE[tab]} />
      ) : (
        <>
          {data?.warnings && data.warnings.length > 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              {data.warnings[0]}
            </Typography>
          )}
          <DataTable<CalendarEvent>
            columns={columnsForTab(tab)}
            rows={pageRows}
            getRowId={(r) => r.id}
            page={page}
            pageSize={pageSize}
            totalCount={filtered.length}
            onPageChange={setPage}
            onPageSizeChange={(size) => { setPageSize(size); setPage(0); }}
            emptyMessage={TAB_EMPTY_MESSAGE[tab]}
            onRowClick={tab === 'EARNINGS' ? () => navigate('/earnings-intelligence') : undefined}
          />
        </>
      )}

      {data?.generatedAt && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          Generated {formatDate(data.generatedAt)}. Persisted read — refresh runs from pipeline actions.
        </Typography>
      )}
    </Box>
  );
}

export default CalendarPage;
