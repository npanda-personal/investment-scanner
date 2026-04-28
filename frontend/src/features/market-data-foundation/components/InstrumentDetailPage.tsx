import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SyncIcon from '@mui/icons-material/Sync';
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  fetchInstrument,
  fetchInstrumentCorporateActions,
  fetchInstrumentFundamentals,
  fetchInstrumentLatestPrice,
  fetchInstrumentPrices,
  syncMarketData,
  type V1CorporateActionsResponse,
  type V1FundamentalsResponse,
  type V1Instrument,
  type V1LatestPriceResponse,
  type V1PricesResponse,
} from '../api/marketDataFoundationService';

const formatDate = (value: string) => new Date(value).toLocaleDateString();
const formatDateTime = (value: string) => new Date(value).toLocaleString();
const formatNumber = (value: number | string | null | undefined) => {
  if (value === null || value === undefined || value === '') return 'N/A';
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric.toLocaleString(undefined, { maximumFractionDigits: 2 }) : String(value);
};

const InstrumentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [instrument, setInstrument] = useState<V1Instrument | null>(null);
  const [latest, setLatest] = useState<V1LatestPriceResponse | null>(null);
  const [prices, setPrices] = useState<V1PricesResponse | null>(null);
  const [fundamentals, setFundamentals] = useState<V1FundamentalsResponse | null>(null);
  const [actions, setActions] = useState<V1CorporateActionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadDetail = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [instrumentResult, latestResult, pricesResult, fundamentalsResult, actionsResult] = await Promise.all([
        fetchInstrument(id),
        fetchInstrumentLatestPrice(id),
        fetchInstrumentPrices(id, 120),
        fetchInstrumentFundamentals(id),
        fetchInstrumentCorporateActions(id),
      ]);
      setInstrument(instrumentResult);
      setLatest(latestResult);
      setPrices(pricesResult);
      setFundamentals(fundamentalsResult);
      setActions(actionsResult);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load instrument detail');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
  }, [id]);

  const chartData = useMemo(() => {
    return [...(prices?.prices || [])]
      .reverse()
      .map((price) => ({
        date: formatDate(price.date),
        close: price.close,
      }));
  }, [prices]);

  const handleSync = async () => {
    if (!id) return;
    setSyncing(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await syncMarketData({ instrumentId: id });
      if (result.success) {
        setSuccess(result.message);
        await loadDetail();
      } else {
        setError(result.message);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!instrument) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Instrument not found.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mb: 3, flexDirection: { xs: 'column', md: 'row' } }}>
        <Box>
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/market-data-foundation')} sx={{ mb: 1 }}>
            Back
          </Button>
          <Typography variant="h4">{instrument.symbol}</Typography>
          <Typography color="text.secondary">{instrument.company_name}</Typography>
        </Box>
        <Button variant="contained" startIcon={<SyncIcon />} onClick={handleSync} disabled={syncing}>
          {syncing ? 'Syncing...' : 'Sync Market Data'}
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>{success}</Alert>}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="overline" color="text.secondary">Latest Price</Typography>
          <Typography variant="h5">{latest?.latest ? formatNumber(latest.latest.close) : 'N/A'}</Typography>
          <Typography variant="caption" color="text.secondary">{latest?.latest ? formatDate(latest.latest.date) : 'No price data'}</Typography>
        </Paper>
        <Paper sx={{ p: 2 }}>
          <Typography variant="overline" color="text.secondary">Exchange</Typography>
          <Typography variant="h6">{instrument.exchange || 'UNKNOWN'}</Typography>
        </Paper>
        <Paper sx={{ p: 2 }}>
          <Typography variant="overline" color="text.secondary">Currency</Typography>
          <Typography variant="h6">{instrument.currency}</Typography>
        </Paper>
        <Paper sx={{ p: 2 }}>
          <Typography variant="overline" color="text.secondary">Metadata</Typography>
          <Typography variant="body2">Source: {instrument.source}</Typography>
          <Typography variant="body2">Updated: {formatDateTime(instrument.last_updated_timestamp)}</Typography>
        </Paper>
      </Box>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">Historical Prices</Typography>
          <Chip label={prices?.adjustment_strategy || 'Close shown as adjusted close for MVP'} size="small" variant="outlined" />
        </Box>
        {chartData.length > 0 ? (
          <Box sx={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="date" minTickGap={24} />
                <YAxis domain={['auto', 'auto']} />
                <ChartTooltip />
                <Line type="monotone" dataKey="close" stroke="#1976d2" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        ) : (
          <Typography color="text.secondary">No historical price data available.</Typography>
        )}
      </Paper>

      <TableSection title="Price Table">
        {(prices?.prices || []).slice(0, 20).map((price) => (
          <TableRow key={price.date}>
            <TableCell>{formatDate(price.date)}</TableCell>
            <TableCell align="right">{formatNumber(price.open)}</TableCell>
            <TableCell align="right">{formatNumber(price.high)}</TableCell>
            <TableCell align="right">{formatNumber(price.low)}</TableCell>
            <TableCell align="right">{formatNumber(price.close)}</TableCell>
            <TableCell align="right">{formatNumber(price.adjusted_close)}</TableCell>
            <TableCell align="right">{formatNumber(price.volume)}</TableCell>
            <TableCell>{price.source}</TableCell>
          </TableRow>
        ))}
      </TableSection>

      <TableSection title="Fundamentals">
        {(fundamentals?.records || []).map((record) => (
          <TableRow key={`${record.period_type}-${record.period_end_date}`}>
            <TableCell>{record.period_type}</TableCell>
            <TableCell>{formatDate(record.period_end_date)}</TableCell>
            <TableCell align="right">{formatNumber(record.revenue)}</TableCell>
            <TableCell align="right">{formatNumber(record.net_income)}</TableCell>
            <TableCell align="right">{formatNumber(record.pe_ratio)}</TableCell>
            <TableCell>{record.source}</TableCell>
            <TableCell>{record.data_status}</TableCell>
          </TableRow>
        ))}
      </TableSection>

      <TableSection title="Corporate Actions">
        {(actions?.actions || []).map((action) => (
          <TableRow key={`${action.action_type}-${action.effective_date}-${action.value}`}>
            <TableCell>{action.action_type}</TableCell>
            <TableCell>{formatDate(action.effective_date)}</TableCell>
            <TableCell>{formatNumber(action.value)}</TableCell>
            <TableCell>{formatNumber(action.ratio)}</TableCell>
            <TableCell>{formatNumber(action.amount)}</TableCell>
            <TableCell>{action.source}</TableCell>
            <TableCell>{action.data_status}</TableCell>
          </TableRow>
        ))}
      </TableSection>
    </Box>
  );
};

const TableSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <Paper sx={{ mb: 3 }}>
    <Box sx={{ p: 2 }}>
      <Typography variant="h6">{title}</Typography>
    </Box>
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            {title === 'Price Table' && (
              <>
                <TableCell>Date</TableCell>
                <TableCell align="right">Open</TableCell>
                <TableCell align="right">High</TableCell>
                <TableCell align="right">Low</TableCell>
                <TableCell align="right">Close</TableCell>
                <TableCell align="right">Adjusted Close</TableCell>
                <TableCell align="right">Volume</TableCell>
                <TableCell>Source</TableCell>
              </>
            )}
            {title === 'Fundamentals' && (
              <>
                <TableCell>Period</TableCell>
                <TableCell>Period End</TableCell>
                <TableCell align="right">Revenue</TableCell>
                <TableCell align="right">Net Income</TableCell>
                <TableCell align="right">PE Ratio</TableCell>
                <TableCell>Source</TableCell>
                <TableCell>Status</TableCell>
              </>
            )}
            {title === 'Corporate Actions' && (
              <>
                <TableCell>Type</TableCell>
                <TableCell>Effective Date</TableCell>
                <TableCell>Value</TableCell>
                <TableCell>Ratio</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Source</TableCell>
                <TableCell>Status</TableCell>
              </>
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {React.Children.count(children) > 0 ? children : (
            <TableRow>
              <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                <Typography color="text.secondary">No data available.</Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  </Paper>
);

export default InstrumentDetailPage;
