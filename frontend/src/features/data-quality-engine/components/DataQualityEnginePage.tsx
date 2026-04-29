import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { Link } from 'react-router-dom';
import { evaluateDataQuality, fetchDataQualityDiagnostics } from '../api/dataQualityEngineService';
import { useDataQualityEngine } from '../hooks';
import type { CoverageStatus, DataQualityEvaluation, DataQualityFilters, LiquidityStatus, SignalReadinessStatus } from '../types';

const DEFAULT_BATCH_SIZE = 25;

const statusColor = (value: string): 'success' | 'warning' | 'error' | 'default' => {
  if (['GOOD', 'READY', 'LIQUID'].includes(value)) return 'success';
  if (['PARTIAL', 'LIMITED', 'THIN', 'UNKNOWN'].includes(value)) return 'warning';
  if (['POOR', 'UNUSABLE', 'NOT_READY', 'ILLIQUID'].includes(value)) return 'error';
  return 'default';
};

const MetricCard: React.FC<{ label: string; value: number | string }> = ({ label, value }) => (
  <Paper sx={{ p: 2 }}>
    <Typography color="text.secondary" variant="body2">{label}</Typography>
    <Typography variant="h5" sx={{ mt: 0.5 }}>{value}</Typography>
  </Paper>
);

const DataQualityEnginePage: React.FC = () => {
  const [filters, setFilters] = useState<DataQualityFilters>({});
  const [selected, setSelected] = useState<DataQualityEvaluation | null>(null);
  const [running, setRunning] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const effectiveFilters = useMemo(() => filters, [filters.status, filters.readinessStatus, filters.liquidityStatus, filters.sector, filters.country]);
  const { summary, items, loading, error, reload } = useDataQualityEngine(effectiveFilters);

  const runEvaluation = async () => {
    setFormError(null);
    setActionMessage(null);
    setRunning(true);
    let offset = 0;
    let batch = 0;
    let evaluatedTotal = 0;
    let failedTotal = 0;
    try {
      while (true) {
        const result = await evaluateDataQuality({ batchSize: DEFAULT_BATCH_SIZE, offset });
        batch += 1;
        evaluatedTotal += result.evaluatedCount;
        failedTotal += result.failedCount;
        setActionMessage(
          `Batch ${batch} complete. Processed ${Math.min(result.offset + result.processedCount, result.totalCount)} / ${result.totalCount} instruments. ` +
          `Evaluated ${result.evaluatedCount}, skipped ${result.skippedCount}, failed ${result.failedCount}.`
        );
        await reload();
        if (!result.hasMore || result.nextOffset === null) {
          setActionMessage(`Evaluation complete. Evaluated ${evaluatedTotal} instruments with ${failedTotal} failures.`);
          break;
        }
        offset = result.nextOffset;
      }
    } catch (err: any) {
      setFormError(err.response?.data?.error || err.message || 'Data quality evaluation failed');
    } finally {
      setRunning(false);
    }
  };

  const loadDiagnostics = async (instrumentId: string) => {
    setFormError(null);
    try {
      setSelected(await fetchDataQualityDiagnostics(instrumentId));
    } catch (err: any) {
      setFormError(err.response?.data?.error || err.message || 'Failed to load diagnostics');
    }
  };

  if (loading && !summary) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: 3, maxWidth: 1500, mx: 'auto' }}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2} sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4">Data Quality Engine</Typography>
          <Typography color="text.secondary">Signal readiness and data coverage diagnostics. This measures data quality, not investment quality.</Typography>
        </Box>
        <Button
          variant="contained"
          onClick={runEvaluation}
          disabled={running}
          startIcon={running ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {running ? 'Evaluating' : 'Run Evaluation'}
        </Button>
      </Stack>

      {(error || formError) && <Alert severity="error" sx={{ mb: 2 }}>{error || formError}</Alert>}
      {actionMessage && <Alert severity="info" sx={{ mb: 2 }}>{actionMessage}</Alert>}

      {summary && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
          <MetricCard label="Total Instruments" value={summary.totalInstruments} />
          <MetricCard label="Good Coverage" value={summary.goodCoverageCount} />
          <MetricCard label="Partial Coverage" value={summary.partialCoverageCount} />
          <MetricCard label="Poor/Unusable" value={summary.poorCoverageCount + summary.unusableCoverageCount} />
          <MetricCard label="Signal Ready" value={summary.signalReadyCount} />
          <MetricCard label="Stale Prices" value={summary.stalePriceCount} />
          <MetricCard label="Missing Fundamentals" value={summary.missingFundamentalsCount} />
          <MetricCard label="Low/Missing Liquidity" value={summary.lowLiquidityCount + summary.missingVolumeCount} />
        </Box>
      )}

      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
          <TextField select size="small" label="Coverage" value={filters.status || ''} onChange={(event) => setFilters({ ...filters, status: event.target.value as CoverageStatus | '' })} sx={{ minWidth: 150 }}>
            <MenuItem value="">All</MenuItem>
            {['GOOD', 'PARTIAL', 'POOR', 'UNUSABLE'].map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Readiness" value={filters.readinessStatus || ''} onChange={(event) => setFilters({ ...filters, readinessStatus: event.target.value as SignalReadinessStatus | '' })} sx={{ minWidth: 150 }}>
            <MenuItem value="">All</MenuItem>
            {['READY', 'LIMITED', 'NOT_READY'].map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Liquidity" value={filters.liquidityStatus || ''} onChange={(event) => setFilters({ ...filters, liquidityStatus: event.target.value as LiquidityStatus | '' })} sx={{ minWidth: 150 }}>
            <MenuItem value="">All</MenuItem>
            {['LIQUID', 'THIN', 'ILLIQUID', 'UNKNOWN'].map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
          </TextField>
          <TextField size="small" label="Sector" value={filters.sector || ''} onChange={(event) => setFilters({ ...filters, sector: event.target.value })} />
          <TextField size="small" label="Country" value={filters.country || ''} onChange={(event) => setFilters({ ...filters, country: event.target.value })} />
        </Stack>
      </Paper>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: '2fr 1fr' }, gap: 3 }}>
        <Paper sx={{ p: 2, overflowX: 'auto' }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Instrument Quality</Typography>
          {items.length === 0 ? (
            <Typography color="text.secondary">No evaluations found. Run evaluation to populate data quality diagnostics.</Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Symbol</TableCell>
                  <TableCell>Company</TableCell>
                  <TableCell>Coverage</TableCell>
                  <TableCell>Readiness</TableCell>
                  <TableCell>Liquidity</TableCell>
                  <TableCell>Sector</TableCell>
                  <TableCell>Country</TableCell>
                  <TableCell>Gaps</TableCell>
                  <TableCell>Warnings</TableCell>
                  <TableCell>Last Evaluated</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.instrumentId} hover onClick={() => void loadDiagnostics(item.instrumentId)} sx={{ cursor: 'pointer' }}>
                    <TableCell><Button component={Link} to={item.researchUrl} size="small" onClick={(event) => event.stopPropagation()}>{item.symbol}</Button></TableCell>
                    <TableCell>{item.companyName || 'N/A'}</TableCell>
                    <TableCell><Chip size="small" label={`${item.coverageScore} ${item.coverageStatus}`} color={statusColor(item.coverageStatus)} /></TableCell>
                    <TableCell><Chip size="small" label={`${item.signalReadinessScore} ${item.signalReadinessStatus}`} color={statusColor(item.signalReadinessStatus)} /></TableCell>
                    <TableCell><Chip size="small" label={`${item.liquidityScore} ${item.liquidityStatus}`} color={statusColor(item.liquidityStatus)} /></TableCell>
                    <TableCell>{item.sector || 'N/A'}</TableCell>
                    <TableCell>{item.country || 'N/A'}</TableCell>
                    <TableCell>{item.dataGaps.length}</TableCell>
                    <TableCell>{item.warnings.length}</TableCell>
                    <TableCell>{new Date(item.lastEvaluatedAt).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Paper>

        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Diagnostics</Typography>
          {!selected ? (
            <Typography color="text.secondary">Select an instrument row to inspect gaps, blockers, warnings, and recommended fixes.</Typography>
          ) : (
            <Stack spacing={2}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="subtitle1">{selected.symbol}</Typography>
                <Button component={Link} to={selected.researchUrl} size="small">Research</Button>
              </Stack>
              <Box>
                <Typography variant="body2" fontWeight={700}>Data Gaps</Typography>
                {selected.dataGaps.length ? selected.dataGaps.map((item) => <Typography key={item} variant="body2" color="text.secondary">- {item}</Typography>) : <Typography color="text.secondary" variant="body2">No major gaps detected.</Typography>}
              </Box>
              <Box>
                <Typography variant="body2" fontWeight={700}>Readiness Blockers</Typography>
                {selected.readinessBlockers.length ? selected.readinessBlockers.map((item) => <Typography key={item} variant="body2" color="text.secondary">- {item}</Typography>) : <Typography color="text.secondary" variant="body2">No readiness blockers detected.</Typography>}
              </Box>
              <Box>
                <Typography variant="body2" fontWeight={700}>Warnings</Typography>
                {selected.warnings.length ? selected.warnings.map((item) => <Typography key={item} variant="body2" color="text.secondary">- {item}</Typography>) : <Typography color="text.secondary" variant="body2">No warnings.</Typography>}
              </Box>
              <Box>
                <Typography variant="body2" fontWeight={700}>Recommended Fixes</Typography>
                {selected.recommendedFixes.length ? selected.recommendedFixes.map((item) => <Typography key={item} variant="body2" color="text.secondary">- {item}</Typography>) : <Typography color="text.secondary" variant="body2">No immediate data fixes recommended.</Typography>}
              </Box>
            </Stack>
          )}
        </Paper>
      </Box>
    </Box>
  );
};

export default DataQualityEnginePage;
