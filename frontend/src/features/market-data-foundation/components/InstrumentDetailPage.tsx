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
  type V1CorporateActionsResponse,
  type V1FundamentalsResponse,
  type V1Instrument,
  type V1LatestPriceResponse,
  type V1PricesResponse,
} from '../api/marketDataFoundationService';
import { PageHeader } from '@/shared/components';
import { useMarketScope } from '@/contexts/MarketScopeContext';
import { compactByProfile, currencySymbol, money, stripSuffix } from '@/shared/format/money';

type ChipColor = 'default' | 'success' | 'warning' | 'error' | 'info';

const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
};
const formatDateTime = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};
const formatOptionalDate = (value: string | null | undefined) => value ? formatDate(value) : 'Unavailable';
const formatOptionalDateTime = (value: string | null | undefined) => value ? formatDateTime(value) : 'Unavailable';
const formatStatusLabel = (value: string | null | undefined) => {
  if (!value) return 'Unknown';
  return value
    .replace(/[_-]/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};
const statusChipColor = (value: string | null | undefined): ChipColor => {
  if (!value) return 'default';
  const normalized = value.toUpperCase();
  if (['COMPLETE', 'READY', 'PRICE_READY', 'REVIEW_READY'].includes(normalized)) return 'success';
  if (['ERROR', 'MISSING', 'MISSING_LATEST_PRICE', 'STALE_LATEST_PRICE', 'INADEQUATE_HISTORY'].includes(normalized)) return 'error';
  if (['PARTIAL', 'DELAYED', 'MARKET_CALENDAR_UNCERTAIN', 'MISSING_RECENT_VOLUME'].includes(normalized)) return 'warning';
  return 'info';
};
const formatNumber = (value: number | string | null | undefined) => {
  if (value === null || value === undefined || value === '') return 'N/A';
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric.toLocaleString(undefined, { maximumFractionDigits: 2 }) : String(value);
};

/**
 * Suppress TEST_* provider values that are seeded for integration tests and
 * must never be shown to the trader. Prefer the real price-record source when
 * available, otherwise fall back to a generic exchange-feed label.
 */
const safeSource = (instrumentSource: string | null | undefined, priceSource?: string | null, isCrypto = false): string => {
  const src = instrumentSource ?? '';
  if (src.startsWith('TEST_') || src === '') {
    // Use the latest price-record source if it doesn't look like a test value
    if (priceSource && !priceSource.startsWith('TEST_') && priceSource !== '') return priceSource;
    return isCrypto ? 'Binance / CoinGecko' : 'NSE/BSE exchange feed';
  }
  return src;
};

interface InstrumentDetailPageProps {
  /** When rendered inside UnifiedStockPage, the active tab controls which sections are shown. */
  activeTab?: 'overview' | 'prices' | 'fundamentals' | string;
}

const InstrumentDetailPage: React.FC<InstrumentDetailPageProps> = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { scope, profile } = useMarketScope();
  const [instrument, setInstrument] = useState<V1Instrument | null>(null);
  const [latest, setLatest] = useState<V1LatestPriceResponse | null>(null);
  const [prices, setPrices] = useState<V1PricesResponse | null>(null);
  const [fundamentals, setFundamentals] = useState<V1FundamentalsResponse | null>(null);
  const [actions, setActions] = useState<V1CorporateActionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDetail = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [instrumentResult, latestResult, pricesResult, fundamentalsResult, actionsResult] = await Promise.all([
        fetchInstrument(id, { region: scope.region, assetType: scope.assetType }),
        fetchInstrumentLatestPrice(id, { region: scope.region, assetType: scope.assetType }),
        fetchInstrumentPrices(id, 120, { region: scope.region, assetType: scope.assetType }),
        fetchInstrumentFundamentals(id, { region: scope.region, assetType: scope.assetType }),
        fetchInstrumentCorporateActions(id, { region: scope.region, assetType: scope.assetType }),
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
  }, [id, scope.region, scope.assetType]);

  const chartData = useMemo(() => {
    return [...(prices?.prices || [])]
      .reverse()
      .map((price) => ({
        date: formatDate(price.date),
        close: price.close,
      }));
  }, [prices]);

  const latestPriceRecord = latest?.latest ?? null;
  const dataThrough = instrument?.stored_data_through_date || latestPriceRecord?.date || instrument?.latest_price_date || null;
  const expectedThrough = instrument?.expected_latest_trading_date || instrument?.required_history_end_date || null;
  const latestUpdatedAt = latestPriceRecord?.last_updated_timestamp || prices?.last_updated_timestamp || instrument?.last_updated_timestamp || null;
  const persistedSource = safeSource(
    latestPriceRecord?.source || prices?.source || instrument?.source || null,
    null,
    profile.isCrypto,
  );
  const sourceStatus = latestPriceRecord?.data_status || latest?.data_status || prices?.data_status || instrument?.data_status || null;
  const freshnessStatus = instrument?.price_readiness || (dataThrough ? sourceStatus : 'MISSING_LATEST_PRICE');

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
      <PageHeader
        title={stripSuffix(instrument.symbol)}
        subtitle={instrument.company_name}
        backTo="/instrument-workspace"
        backLabel="Instrument search"
        secondaryActions={
          <Button variant="outlined" onClick={() => navigate(`/stocks/${instrument.id}`)}>
            Research
          </Button>
        }
      />

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      <Alert severity="info" sx={{ mb: 2 }}>
        This instrument workspace is read-only for shared market data. Data sync, import, repair, and backfill workflows belong in Admin / Data Ops.
      </Alert>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="overline" color="text.secondary">Latest Price</Typography>
          <Typography variant="h5">{latest?.latest ? money(latest.latest.close, instrument.currency) : 'N/A'}</Typography>
          <Typography variant="caption" color="text.secondary">{latest?.latest ? formatDate(latest.latest.date) : 'No price data'}</Typography>
          <PriceRangeBand prices={prices?.prices ?? []} currency={instrument.currency} />
        </Paper>
        <Paper sx={{ p: 2 }}>
          <Typography variant="overline" color="text.secondary">Exchange</Typography>
          <Typography variant="h6">{instrument.exchange || 'UNKNOWN'}</Typography>
          {instrument.catalog_source === 'NSE_SME_EQUITY_SECURITIES' && (
            <Chip size="small" label="SME" color="warning" sx={{ mt: 0.5 }} title="NSE SME platform — limited liquidity; verify tradability before acting" />
          )}
        </Paper>
        {/* ISIN is an NSE/exchange-catalog identifier — not applicable to crypto. */}
        {!profile.isCrypto && (
          <Paper sx={{ p: 2 }}>
            <Typography variant="overline" color="text.secondary">ISIN</Typography>
            <Typography variant="h6" sx={{ fontFamily: 'monospace', fontSize: 14, wordBreak: 'break-all' }}>
              {instrument.isin || '—'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {instrument.isin ? 'NSE catalog' : 'Not available'}
            </Typography>
          </Paper>
        )}
        <Paper sx={{ p: 2 }}>
          <Typography variant="overline" color="text.secondary">Metadata</Typography>
          <Typography variant="body2">Source: {safeSource(instrument.source, latestPriceRecord?.source, profile.isCrypto)}</Typography>
          <Typography variant="body2">Updated: {formatDateTime(instrument.last_updated_timestamp)}</Typography>
        </Paper>
      </Box>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="overline" color="text.secondary">Data Coverage</Typography>
            <Typography variant="h6">Data through: {formatOptionalDate(dataThrough)}</Typography>
            <Typography variant="body2" color="text.secondary">Expected latest session: {formatOptionalDate(expectedThrough)}</Typography>
            <Typography variant="body2" color="text.secondary">Last updated: {formatOptionalDateTime(latestUpdatedAt)}</Typography>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
            <Chip label={`Freshness: ${formatStatusLabel(freshnessStatus)}`} size="small" color={statusChipColor(freshnessStatus)} variant="outlined" />
            <Chip label={`Source: ${formatStatusLabel(persistedSource)}`} size="small" variant="outlined" />
            <Chip label={`Source status: ${formatStatusLabel(sourceStatus)}`} size="small" color={statusChipColor(sourceStatus)} variant="outlined" />
          </Box>
        </Box>
      </Paper>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">Historical Prices</Typography>
          {/* Crypto has no splits/dividends → no adjustment caveat. */}
          {!profile.isCrypto && <Chip label="Prices shown are split/bonus-adjusted." size="small" variant="outlined" />}
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

      <TableSection title="Price Table" currencyLabel={currencySymbol(instrument.currency)}>
        {(prices?.prices || []).slice(0, 20).map((price) => (
          <TableRow key={price.date}>
            <TableCell>{formatDate(price.date)}</TableCell>
            <TableCell align="right">{money(price.open, instrument.currency)}</TableCell>
            <TableCell align="right">{money(price.high, instrument.currency)}</TableCell>
            <TableCell align="right">{money(price.low, instrument.currency)}</TableCell>
            <TableCell align="right">{money(price.close, instrument.currency)}</TableCell>
            <TableCell align="right">{money(price.adjusted_close, instrument.currency)}</TableCell>
            <TableCell align="right">{formatNumber(price.volume)}</TableCell>
            <TableCell>{price.source}</TableCell>
          </TableRow>
        ))}
      </TableSection>

      {/* Fundamentals & corporate actions are equity-only — hidden for crypto. */}
      {profile.capabilities.hasFundamentals && (
      <TableSection title="Fundamentals" currencyLabel={currencySymbol(instrument.currency)}>
        {(fundamentals?.records || []).map((record) => (
          <TableRow key={`${record.period_type}-${record.period_end_date}`}>
            <TableCell>{record.period_type}</TableCell>
            <TableCell>{formatDate(record.period_end_date)}</TableCell>
            <TableCell align="right">{compactByProfile(record.revenue, { currency: record.currency || instrument.currency || 'INR' })}</TableCell>
            <TableCell align="right">{money(record.eps, record.currency || instrument.currency)}</TableCell>
            <TableCell align="right">{compactByProfile(record.net_income, { currency: record.currency || instrument.currency || 'INR' })}</TableCell>
            <TableCell align="right">{formatNumber(record.pe_ratio)}</TableCell>
            <TableCell align="right">{formatNumber(record.dividend_yield)}</TableCell>
            <TableCell align="right">{formatNumber(record.shares_outstanding)}</TableCell>
            <TableCell align="right">{compactByProfile(record.market_cap, { currency: record.currency || instrument.currency || 'INR' })}</TableCell>
            <TableCell>{record.currency || 'N/A'}</TableCell>
            <TableCell>{record.source}</TableCell>
            <TableCell>{record.data_status}</TableCell>
          </TableRow>
        ))}
      </TableSection>
      )}

      {profile.capabilities.hasDividends && (
      <TableSection title="Corporate Actions" currencyLabel={currencySymbol(instrument.currency)}>
        {(actions?.actions || []).map((action) => (
          <TableRow key={`${action.action_type}-${action.effective_date}-${action.value}`}>
            <TableCell>{action.action_type}</TableCell>
            <TableCell>{formatDate(action.effective_date)}</TableCell>
            <TableCell>{action.declared_date ? formatDate(action.declared_date) : 'N/A'}</TableCell>
            <TableCell>{action.payment_date ? formatDate(action.payment_date) : 'N/A'}</TableCell>
            <TableCell>{formatNumber(action.value)}</TableCell>
            <TableCell>{formatNumber(action.ratio)}</TableCell>
            <TableCell>{money(action.amount, action.currency || instrument.currency)}</TableCell>
            <TableCell>{action.currency || 'N/A'}</TableCell>
            <TableCell>{action.source}</TableCell>
            <TableCell>{action.data_status}</TableCell>
          </TableRow>
        ))}
      </TableSection>
      )}
    </Box>
  );
};

const tableSectionLayout = (title: string) => {
  if (title === 'Fundamentals') return { columnCount: 12, minWidth: 1260 };
  if (title === 'Corporate Actions') return { columnCount: 10, minWidth: 1080 };
  return { columnCount: 8, minWidth: 900 };
};

const TableSection: React.FC<{ title: string; children: React.ReactNode; currencyLabel?: string }> = ({ title, children, currencyLabel = '₹' }) => {
  const layout = tableSectionLayout(title);
  return (
    <Paper sx={{ mb: 3, overflow: 'hidden' }}>
      <Box sx={{ p: 2 }}>
        <Typography variant="h6">{title}</Typography>
      </Box>
      <TableContainer sx={{ maxWidth: '100%', overflowX: 'auto' }}>
        <Table
          size="small"
          sx={{
            minWidth: layout.minWidth,
            tableLayout: 'fixed',
            '& .MuiTableCell-root': {
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              verticalAlign: 'middle',
            },
            '& .MuiTableCell-head': {
              color: 'text.secondary',
              fontSize: 12,
              fontWeight: 700,
            },
          }}
        >
          <TableHead>
            <TableRow>
              {title === 'Price Table' && (
                <>
                  <TableCell sx={{ width: 128 }}>Date</TableCell>
                  <TableCell sx={{ width: 110 }} align="right">Open ({currencyLabel})</TableCell>
                  <TableCell sx={{ width: 110 }} align="right">High ({currencyLabel})</TableCell>
                  <TableCell sx={{ width: 110 }} align="right">Low ({currencyLabel})</TableCell>
                  <TableCell sx={{ width: 110 }} align="right">Close ({currencyLabel})</TableCell>
                  <TableCell sx={{ width: 140 }} align="right">Adj. Close ({currencyLabel})</TableCell>
                  <TableCell sx={{ width: 130 }} align="right">Volume</TableCell>
                  <TableCell sx={{ width: 162 }}>Source</TableCell>
                </>
              )}
              {title === 'Fundamentals' && (
                <>
                  <TableCell sx={{ width: 110 }}>Period</TableCell>
                  <TableCell sx={{ width: 130 }}>Period End</TableCell>
                  <TableCell sx={{ width: 120 }} align="right">Revenue</TableCell>
                  <TableCell sx={{ width: 90 }} align="right">EPS ({currencyLabel})</TableCell>
                  <TableCell sx={{ width: 126 }} align="right">Net Income</TableCell>
                  <TableCell sx={{ width: 104 }} align="right">PE Ratio</TableCell>
                  <TableCell sx={{ width: 136 }} align="right">Dividend Yield</TableCell>
                  <TableCell sx={{ width: 110 }} align="right">Shares</TableCell>
                  <TableCell sx={{ width: 132 }} align="right">Market Cap</TableCell>
                  <TableCell sx={{ width: 96 }}>Currency</TableCell>
                  <TableCell sx={{ width: 156 }}>Source</TableCell>
                  <TableCell sx={{ width: 150 }}>Status</TableCell>
                </>
              )}
              {title === 'Corporate Actions' && (
                <>
                  <TableCell sx={{ width: 136 }}>Type</TableCell>
                  <TableCell sx={{ width: 130 }}>Effective Date</TableCell>
                  <TableCell sx={{ width: 130 }}>Declared Date</TableCell>
                  <TableCell sx={{ width: 130 }}>Payment Date</TableCell>
                  <TableCell sx={{ width: 110 }}>Value</TableCell>
                  <TableCell sx={{ width: 110 }}>Ratio</TableCell>
                  <TableCell sx={{ width: 110 }}>Amount ({currencyLabel})</TableCell>
                  <TableCell sx={{ width: 96 }}>Currency</TableCell>
                  <TableCell sx={{ width: 156 }}>Source</TableCell>
                  <TableCell sx={{ width: 152 }}>Status</TableCell>
                </>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {React.Children.count(children) > 0 ? children : (
              <TableRow>
                <TableCell colSpan={layout.columnCount} align="center" sx={{ py: 3 }}>
                  <Typography color="text.secondary">No data available.</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

/**
 * Shows a derived high/low band from the loaded price array.
 * A true 52-week field requires a dedicated backend API field (not yet present).
 */
const PriceRangeBand: React.FC<{ prices: { close: number }[]; currency?: string | null }> = ({ prices, currency }) => {
  if (prices.length === 0) return null;
  const closes = prices.map((p) => p.close).filter(Number.isFinite);
  if (closes.length === 0) return null;
  const hi = Math.max(...closes);
  const lo = Math.min(...closes);
  return (
    <Typography variant="caption" color="text.secondary" display="block">
      ~{prices.length}D range: {money(lo, currency)} - {money(hi, currency)}
    </Typography>
  );
};
export default InstrumentDetailPage;
