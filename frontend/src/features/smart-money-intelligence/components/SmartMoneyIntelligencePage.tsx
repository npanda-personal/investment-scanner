import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { Link } from 'react-router-dom';
import { useSmartMoneyIntelligence } from '../hooks';
import type { SectorSmartMoneySummary, SmartMoneyRange, SmartMoneyStatus, SmartMoneyStockSummary } from '../types';

const statusColor = (status: SmartMoneyStatus | string) => {
  if (status === 'ACCUMULATION' || status === 'ACCUMULATING') return 'success';
  if (status === 'DISTRIBUTION' || status === 'DISTRIBUTING') return 'error';
  if (status === 'INSUFFICIENT_DATA') return 'default';
  return 'warning';
};

const fmtPercent = (value: number | null | undefined) => value === null || value === undefined ? 'N/A' : `${(value * 100).toFixed(1)}%`;
const fmtVolume = (value: number | null | undefined) => value === null || value === undefined ? 'N/A' : Intl.NumberFormat('en-US', { notation: 'compact' }).format(value);

export default function SmartMoneyIntelligencePage() {
  const {
    range,
    setRange,
    health,
    top,
    distribution,
    sectors,
    selectedStock,
    loading,
    detailLoading,
    error,
    setError,
    loadStock,
  } = useSmartMoneyIntelligence();

  if (loading) {
    return <Stack alignItems="center" sx={{ py: 8 }}><CircularProgress /></Stack>;
  }

  return (
    <Box sx={{ maxWidth: 1280 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={2} sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Smart Money Intelligence</Typography>
          <Typography color="text.secondary">Price-volume accumulation, distribution warnings, and sector flow context from free/local market data.</Typography>
        </Box>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Range</InputLabel>
          <Select label="Range" value={range} onChange={(event) => setRange(event.target.value as SmartMoneyRange)}>
            <MenuItem value="1M">1M</MenuItem>
            <MenuItem value="3M">3M</MenuItem>
            <MenuItem value="6M">6M</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.1fr 0.9fr' }, gap: 2 }}>
        <Stack spacing={2}>
          <StockList title="Top Accumulation Candidates" items={top} empty="No accumulation candidates found yet." onSelect={loadStock} />
          <StockList title="Top Distribution Warnings" items={distribution} empty="No distribution warnings found yet." onSelect={loadStock} />
          <SectorView sectors={sectors} />
        </Stack>
        <Stack spacing={2}>
          <StockDetail stock={selectedStock} loading={detailLoading} />
          <Paper sx={{ p: 2 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="h6">Data Coverage</Typography>
              <Chip size="small" label={health?.dataStatus || 'PARTIAL'} color="warning" />
            </Stack>
            <Typography color="text.secondary" sx={{ mb: 1 }}>
              This MVP uses persisted price and volume from Market Data Foundation. Insider and institutional ownership are explicit placeholders unless a free provider is configured.
            </Typography>
            <Stack spacing={0.5}>
              {(health?.notes || []).map((note) => <Typography key={note} variant="body2" color="text.secondary">{note}</Typography>)}
            </Stack>
          </Paper>
        </Stack>
      </Box>
    </Box>
  );
}

function StockList({ title, items, empty, onSelect }: { title: string; items: SmartMoneyStockSummary[]; empty: string; onSelect: (instrumentId: string) => Promise<void> }) {
  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 1 }}>{title}</Typography>
      {items.length === 0 ? <Typography color="text.secondary">{empty}</Typography> : (
        <Stack spacing={1}>
          {items.map((item) => (
            <Paper key={item.instrumentId} variant="outlined" sx={{ p: 1.25 }}>
              <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={1}>
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                    <Typography fontWeight={700}>{item.symbol}</Typography>
                    <Chip size="small" label={item.status} color={statusColor(item.status)} />
                    <Chip size="small" label={item.dataStatus} variant="outlined" />
                  </Stack>
                  <Typography variant="body2" color="text.secondary">{item.companyName || 'Unknown company'}{item.sector ? ` · ${item.sector}` : ''}</Typography>
                  <Typography variant="body2">{item.explanation}</Typography>
                </Box>
                <Stack alignItems={{ xs: 'flex-start', md: 'flex-end' }} spacing={0.5}>
                  <Typography variant="h6">{item.smartMoneyScore}</Typography>
                  <Typography variant="body2" color={item.dailyChangePercent && item.dailyChangePercent < 0 ? 'error.main' : 'success.main'}>{fmtPercent(item.dailyChangePercent)}</Typography>
                  <Stack direction="row" spacing={1}>
                    <Button size="small" onClick={() => void onSelect(item.instrumentId)}>Details</Button>
                    <Button size="small" component={Link} to={item.researchUrl}>Research</Button>
                  </Stack>
                </Stack>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}
    </Paper>
  );
}

function SectorView({ sectors }: { sectors: SectorSmartMoneySummary[] }) {
  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 1 }}>Sector Smart Money View</Typography>
      {sectors.length === 0 ? <Typography color="text.secondary">No sector data available.</Typography> : (
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Sector</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Score</TableCell>
                <TableCell align="right">Accum.</TableCell>
                <TableCell align="right">Distrib.</TableCell>
                <TableCell align="right">Unusual Vol.</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sectors.slice(0, 12).map((sector) => (
                <TableRow key={sector.sector}>
                  <TableCell>{sector.sector}</TableCell>
                  <TableCell><Chip size="small" label={sector.sectorStatus} color={statusColor(sector.sectorStatus)} /></TableCell>
                  <TableCell align="right">{sector.averageSmartMoneyScore}</TableCell>
                  <TableCell align="right">{sector.accumulationCount}</TableCell>
                  <TableCell align="right">{sector.distributionCount}</TableCell>
                  <TableCell align="right">{sector.unusualVolumeCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}
    </Paper>
  );
}

function StockDetail({ stock, loading }: { stock: SmartMoneyStockSummary | null; loading: boolean }) {
  if (loading) return <Paper sx={{ p: 2 }}><LinearProgress /></Paper>;
  if (!stock) {
    return (
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6">Stock Smart Money Detail</Typography>
        <Typography color="text.secondary">Select an accumulation or distribution candidate to inspect the signals.</Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Stack direction="row" justifyContent="space-between" gap={2} sx={{ mb: 1 }}>
        <Box>
          <Typography variant="h6">{stock.symbol}</Typography>
          <Typography color="text.secondary">{stock.companyName || 'Unknown company'}</Typography>
        </Box>
        <Stack alignItems="flex-end">
          <Typography variant="h4" fontWeight={700}>{stock.smartMoneyScore}</Typography>
          <Chip size="small" label={stock.status} color={statusColor(stock.status)} />
        </Stack>
      </Stack>
      <Typography sx={{ mb: 2 }}>{stock.explanation}</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1, mb: 2 }}>
        <Metric label="Latest volume" value={fmtVolume(stock.latestVolume)} />
        <Metric label="20D avg volume" value={fmtVolume(stock.averageVolume20)} />
        <Metric label="Daily move" value={fmtPercent(stock.dailyChangePercent)} />
        <Metric label="Confidence" value={stock.confidence} />
      </Box>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>Signals</Typography>
      {stock.signals.length === 0 ? <Typography color="text.secondary">No strong price-volume signal detected.</Typography> : (
        <Stack spacing={1}>
          {stock.signals.map((signal) => (
            <Paper key={`${signal.type}-${signal.details}`} variant="outlined" sx={{ p: 1 }}>
              <Stack direction="row" justifyContent="space-between" gap={1}>
                <Typography fontWeight={700}>{signal.label}</Typography>
                <Chip size="small" label={signal.direction} color={statusColor(signal.direction)} />
              </Stack>
              <Typography variant="body2" color="text.secondary">{signal.details}</Typography>
            </Paper>
          ))}
        </Stack>
      )}
      <Divider sx={{ my: 2 }} />
      <Typography variant="subtitle2">Insider / Ownership</Typography>
      <Typography variant="body2" color="text.secondary">{stock.insiderOwnership.explanation}</Typography>
      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
        <Chip size="small" label={`Ownership: ${stock.insiderOwnership.ownershipDataStatus}`} variant="outlined" />
        <Button size="small" component={Link} to={stock.researchUrl}>Open Research</Button>
      </Stack>
    </Paper>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Paper variant="outlined" sx={{ p: 1 }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography fontWeight={700}>{value}</Typography>
    </Paper>
  );
}
