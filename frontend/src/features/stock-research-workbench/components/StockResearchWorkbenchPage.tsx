import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import {
  Bar,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { fetchStockResearchWorkbench } from '../api/stockResearchWorkbenchService';
import type { ResearchRange, ResearchWorkbenchResponse } from '../types';
import { SignalWidget } from '@/features/signal-generation-engine';

const ranges: ResearchRange[] = ['1W', '1M', '3M', '6M', 'YTD', '1Y', '3Y', '5Y', 'MAX'];

const formatNumber = (value: unknown, suffix = '') => {
  if (value === null || value === undefined || value === '') return 'N/A';
  const numeric = Number(value);
  return Number.isFinite(numeric) ? `${numeric.toLocaleString(undefined, { maximumFractionDigits: 2 })}${suffix}` : String(value);
};

const formatPercent = (value: unknown) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'N/A';
  return `${(value * 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}%`;
};

const formatDateTime = (value: string | null | undefined) => value ? new Date(value).toLocaleString() : 'N/A';

const StatusChip: React.FC<{ status?: string }> = ({ status }) => (
  <Chip
    label={status || 'MISSING'}
    size="small"
    color={status === 'COMPLETE' ? 'success' : status === 'ERROR' ? 'error' : 'warning'}
    variant="outlined"
  />
);

const StockResearchWorkbenchPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [range, setRange] = useState<ResearchRange>('1Y');
  const [data, setData] = useState<ResearchWorkbenchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    fetchStockResearchWorkbench(id, range)
      .then(setData)
      .catch((err: any) => setError(err.response?.data?.error || err.message || 'Failed to load research workbench'))
      .finally(() => setLoading(false));
  }, [id, range]);

  const chartData = useMemo(() => {
    return [...(data?.chart.prices || [])].reverse().map((point) => ({
      date: new Date(point.date).toLocaleDateString(),
      adjusted_close: point.adjusted_close,
      volume: point.volume || 0,
    }));
  }, [data]);

  if (loading) {
    return <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>;
  }

  if (error || !data) {
    return <Box sx={{ p: 3 }}><Alert severity="error">{error || 'Research data unavailable'}</Alert></Box>;
  }

  const overview = data.overview;
  const fundamentals = data.fundamentals;
  const valuation = data.valuation;

  return (
    <Box sx={{ p: 3, maxWidth: 1500, mx: 'auto' }}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(`/market-data-foundation/${overview.instrument_id}`)} sx={{ mb: 2 }}>
        Back to Market Data
      </Button>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
          <Box>
            <Typography variant="h4">{overview.company_name}</Typography>
            <Typography color="text.secondary">
              {overview.symbol} | {overview.exchange || 'UNKNOWN'} | {overview.country || 'N/A'} | {overview.currency}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {overview.sector || 'N/A'} | {overview.industry || 'N/A'}
            </Typography>
          </Box>
          <Box sx={{ textAlign: { xs: 'left', md: 'right' } }}>
            <Typography variant="h4">{formatNumber(overview.latest_price)}</Typography>
            <Typography color={overview.daily_change_percent && overview.daily_change_percent >= 0 ? 'success.main' : 'error.main'}>
              {formatNumber(overview.daily_change)} ({formatPercent(overview.daily_change_percent)})
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {overview.source} | {formatDateTime(overview.last_updated_timestamp)}
            </Typography>
            <Box sx={{ mt: 1 }}><StatusChip status={overview.data_status} /></Box>
          </Box>
        </Box>
      </Paper>

      <SignalWidget instrumentId={String(overview.instrument_id || '')} />

      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mb: 2, flexDirection: { xs: 'column', md: 'row' } }}>
          <Box>
            <Typography variant="h6">Price Chart</Typography>
            {data.chart.adjusted_close_fallback && (
              <Typography variant="caption" color="text.secondary">Adjusted close unavailable for some rows; close is used as fallback.</Typography>
            )}
          </Box>
          <ToggleButtonGroup size="small" value={range} exclusive onChange={(_event, value) => value && setRange(value)}>
            {ranges.map((item) => <ToggleButton key={item} value={item}>{item}</ToggleButton>)}
          </ToggleButtonGroup>
        </Box>
        {chartData.length === 0 ? (
          <Typography color="text.secondary">No price history available.</Typography>
        ) : (
          <Box sx={{ height: 360 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <XAxis dataKey="date" minTickGap={28} />
                <YAxis yAxisId="price" domain={['auto', 'auto']} />
                <YAxis yAxisId="volume" orientation="right" hide />
                <ChartTooltip />
                <Bar yAxisId="volume" dataKey="volume" fill="#cfd8dc" />
                <Line yAxisId="price" type="monotone" dataKey="adjusted_close" stroke="#1976d2" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </Box>
        )}
      </Paper>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3 }}>
        <Section title="Performance" status={data.trust.data_status} source={data.trust.source} updatedAt={data.trust.last_updated_timestamp}>
          <MetricGrid items={{
            [`${range} Return`]: formatPercent(data.performance.selected_range_return),
            '1D Return': formatPercent(data.performance.return_1d),
            '1W Return': formatPercent(data.performance.return_1w),
            '1M Return': formatPercent(data.performance.return_1m),
            'YTD Return': formatPercent(data.performance.return_ytd),
            '1Y Return': formatPercent(data.performance.return_1y),
            '3Y CAGR': formatPercent(data.performance.cagr_3y),
            'Max Drawdown': formatPercent(data.performance.max_drawdown),
            Volatility: formatPercent(data.performance.volatility),
          }} />
        </Section>

        <Section
          title="Fundamental Snapshot"
          status={String(fundamentals?.data_status || 'MISSING')}
          source={String(fundamentals?.source || 'database')}
          updatedAt={typeof fundamentals?.last_updated_timestamp === 'string' ? fundamentals.last_updated_timestamp : null}
        >
          {fundamentals ? (
            <MetricGrid items={{
              Revenue: formatNumber(fundamentals.revenue),
              EPS: formatNumber(fundamentals.eps),
              'Net Income': formatNumber(fundamentals.net_income),
              'P/E': formatNumber(fundamentals.pe_ratio),
              'Dividend Yield': formatPercent(fundamentals.dividend_yield),
              Shares: formatNumber(fundamentals.shares_outstanding),
              'Market Cap': formatNumber(fundamentals.market_cap),
              Period: String(fundamentals.period_type || 'N/A'),
            }} />
          ) : <Typography color="text.secondary">No fundamentals available.</Typography>}
        </Section>

        <Section title="Valuation Context" status={data.trust.data_status} source={data.trust.source} updatedAt={data.trust.last_updated_timestamp}>
          {!fundamentals && data.peers.length === 0 ? (
            <Typography color="text.secondary">No valuation context available because fundamentals and peers are missing.</Typography>
          ) : (
            <MetricGrid items={{
              'Stock P/E': formatNumber(valuation.pe_ratio),
              'Peer Avg P/E': formatNumber(valuation.peer_average_pe),
              'Dividend Yield': formatPercent(valuation.dividend_yield),
              'Peer Avg Yield': formatPercent(valuation.peer_average_dividend_yield),
              'Market Cap Rank': valuation.market_cap_rank ? `${valuation.market_cap_rank} of ${valuation.peer_count + 1}` : 'N/A',
            }} />
          )}
        </Section>

        <Section title="Relative Strength" status={String(data.relative_strength.data_status || 'MISSING')} source={data.trust.source} updatedAt={data.trust.last_updated_timestamp}>
          <MetricGrid items={{
            'Stock Return': formatPercent(data.relative_strength.stock_return),
            'Peer Avg Return': formatPercent(data.relative_strength.peer_average_return),
            'Relative to Peers': formatPercent(data.relative_strength.relative_to_peer_average),
            Basis: `${range} ${String(data.relative_strength.fallback_used || 'N/A')}`,
          }} />
        </Section>
      </Box>

      <Section title="Peer Comparison" status={data.peers.length > 0 ? 'PARTIAL' : 'MISSING'} source={data.trust.source} updatedAt={data.trust.last_updated_timestamp}>
        {data.peers.length === 0 ? (
          <Typography color="text.secondary">No peers available from the current instrument universe.</Typography>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 1.5 }}>
            {data.peers.map((peer) => (
              <Paper
                key={String(peer.instrument_id)}
                variant="outlined"
                onClick={() => navigate(`/research/stocks/${String(peer.instrument_id)}`)}
                sx={{ p: 1.5, cursor: 'pointer', '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' } }}
              >
                <Typography fontWeight={700}>{String(peer.symbol)} | {String(peer.company_name)}</Typography>
                <Typography variant="body2" color="text.secondary">{String(peer.exchange || 'UNKNOWN')}</Typography>
                <Typography variant="body2">Price: {formatNumber(peer.latest_price)} | {range}: {formatPercent(peer.return_selected)}</Typography>
                <Typography variant="body2">P/E: {formatNumber(peer.pe_ratio)} | Yield: {formatPercent(peer.dividend_yield)}</Typography>
              </Paper>
            ))}
          </Box>
        )}
      </Section>

      <Section
        title="Corporate Actions"
        status={data.corporate_actions.length > 0 ? 'COMPLETE' : 'MISSING'}
        source={String(data.corporate_actions[0]?.source || data.trust.source)}
        updatedAt={String(data.corporate_actions[0]?.last_updated_timestamp || data.trust.last_updated_timestamp || '') || null}
      >
        {data.corporate_actions.length === 0 ? (
          <Typography color="text.secondary">No corporate actions available.</Typography>
        ) : (
          <Box sx={{ display: 'grid', gap: 1 }}>
            {data.corporate_actions.map((action) => (
              <Paper key={`${action.action_type}-${action.effective_date}-${action.value}`} variant="outlined" sx={{ p: 1.5 }}>
                <Typography fontWeight={700}>{String(action.action_type)} | {new Date(String(action.effective_date)).toLocaleDateString()}</Typography>
                <Typography variant="body2">Amount: {formatNumber(action.amount)} | Ratio: {formatNumber(action.ratio)} | {String(action.currency || overview.currency)}</Typography>
                <Typography variant="caption" color="text.secondary">{String(action.source)} | {String(action.data_status)}</Typography>
              </Paper>
            ))}
          </Box>
        )}
      </Section>
    </Box>
  );
};

const Section: React.FC<{ title: string; status?: string; source?: string; updatedAt?: string | null; children: React.ReactNode }> = ({ title, status, source, updatedAt, children }) => (
  <Paper sx={{ p: 2, mb: 3 }}>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
      <Box>
        <Typography variant="h6">{title}</Typography>
        {(source || updatedAt) && (
          <Typography variant="caption" color="text.secondary">
            {source || 'database'} | {formatDateTime(updatedAt)}
          </Typography>
        )}
      </Box>
      <StatusChip status={status} />
    </Box>
    {children}
  </Paper>
);

const MetricGrid: React.FC<{ items: Record<string, string> }> = ({ items }) => (
  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 1.5 }}>
    {Object.entries(items).map(([label, value]) => (
      <Box key={label}>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography variant="body1" fontWeight={700}>{value}</Typography>
      </Box>
    ))}
  </Box>
);

export default StockResearchWorkbenchPage;
