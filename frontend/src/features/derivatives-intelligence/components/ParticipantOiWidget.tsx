/**
 * FII Derivatives Positioning Widget — Participant-wise OI
 *
 * Pure persisted-read of NSE participant-wise open interest. Highlights the net
 * index-futures and stock-futures positioning of each participant class
 * (FII / DII / Pro / Client), with FII surfaced first as the most-watched
 * directional gauge.
 *
 * Research-support only — descriptive positioning, NOT trade advice.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Paper,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import RemoveIcon from '@mui/icons-material/Remove';
import { StalenessBadge } from '@/shared/components/StalenessBadge';
import {
  fetchParticipantOi,
  type ParticipantOiRow,
} from '../api/derivativesIntelligenceService';

function fmtNet(value: number): string {
  if (!Number.isFinite(value)) return '—';
  const sign = value < 0 ? '−' : '+';
  return `${sign}${Math.abs(value).toLocaleString('en-IN')}`;
}

function NetCell({ value }: { value: number }) {
  const color = value > 0 ? 'success.main' : value < 0 ? 'error.main' : 'text.secondary';
  const Icon = value > 0 ? TrendingUpIcon : value < 0 ? TrendingDownIcon : RemoveIcon;
  return (
    <Stack direction="row" justifyContent="flex-end" alignItems="center" spacing={0.5} sx={{ color }}>
      <Icon sx={{ fontSize: 15 }} />
      <Typography variant="body2" fontWeight={700} color="inherit">{fmtNet(value)}</Typography>
    </Stack>
  );
}

export const ParticipantOiWidget: React.FC = () => {
  const [rows, setRows] = useState<ParticipantOiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [asOf, setAsOf] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setUnavailable(false);
    try {
      const resp = await fetchParticipantOi();
      if (resp.status === 'missing' || resp.rows.length === 0) {
        setUnavailable(true);
        setRows([]);
        return;
      }
      if (resp.status === 'error') {
        setError(resp.message ?? 'Failed to load participant OI');
        setRows([]);
        return;
      }
      setAsOf(resp.tradingDate);
      setRows(resp.rows);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const fii = rows.find((r) => r.participant === 'FII');

  return (
    <Paper sx={{ p: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.5 }}>
        <Box>
          <Typography variant="h6">FII Derivatives Positioning</Typography>
          <Typography variant="caption" color="text.secondary">
            Participant-wise net open interest · contracts · Source: NSE participant OI
          </Typography>
        </Box>
        {asOf && <StalenessBadge asOf={asOf} label="Participant OI" />}
      </Stack>

      {!loading && !error && !unavailable && fii && (
        <Alert
          severity="info"
          icon={false}
          sx={{ mb: 2, bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider', '& .MuiAlert-message': { width: '100%' } }}
        >
          <Typography variant="body2" color="text.primary">
            FIIs are net{' '}
            <Typography component="span" fontWeight={700} color={fii.netIndexFutures >= 0 ? 'success.main' : 'error.main'}>
              {fii.netIndexFutures >= 0 ? 'LONG' : 'SHORT'}
            </Typography>{' '}
            index futures ({fmtNet(fii.netIndexFutures)} contracts) and net{' '}
            <Typography component="span" fontWeight={700} color={fii.netStockFutures >= 0 ? 'success.main' : 'error.main'}>
              {fii.netStockFutures >= 0 ? 'LONG' : 'SHORT'}
            </Typography>{' '}
            stock futures ({fmtNet(fii.netStockFutures)}).
          </Typography>
        </Alert>
      )}

      {loading && (
        <Stack spacing={1}>
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} variant="rectangular" height={28} />)}
        </Stack>
      )}

      {!loading && error && <Alert severity="error" sx={{ fontSize: 13 }}>{error}</Alert>}

      {!loading && !error && unavailable && (
        <Alert severity="info" sx={{ fontSize: 13 }}>
          Participant OI not yet ingested. Use POST /api/v1/derivatives/participant-oi/ingest to fetch from NSE.
        </Alert>
      )}

      {!loading && !error && !unavailable && (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell><Typography variant="caption" fontWeight={700}>Participant</Typography></TableCell>
              <Tooltip title="Index futures: long − short OI (contracts)" arrow>
                <TableCell align="right"><Typography variant="caption" fontWeight={700}>Net Index Fut</Typography></TableCell>
              </Tooltip>
              <Tooltip title="Stock futures: long − short OI (contracts)" arrow>
                <TableCell align="right"><Typography variant="caption" fontWeight={700}>Net Stock Fut</Typography></TableCell>
              </Tooltip>
              <TableCell align="right"><Typography variant="caption" fontWeight={700}>Total Long</Typography></TableCell>
              <TableCell align="right"><Typography variant="caption" fontWeight={700}>Total Short</Typography></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.participant} hover selected={r.participant === 'FII'}>
                <TableCell><Typography variant="body2" fontWeight={r.participant === 'FII' ? 700 : 600}>{r.participant}</Typography></TableCell>
                <TableCell align="right"><NetCell value={r.netIndexFutures} /></TableCell>
                <TableCell align="right"><NetCell value={r.netStockFutures} /></TableCell>
                <TableCell align="right"><Typography variant="body2" color="text.secondary">{r.totalLong.toLocaleString('en-IN')}</Typography></TableCell>
                <TableCell align="right"><Typography variant="body2" color="text.secondary">{r.totalShort.toLocaleString('en-IN')}</Typography></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
        Net = long − short open interest (contracts). FII net index-futures is a widely-watched directional sentiment gauge.
        Descriptive positioning for research only — not buy/sell advice.
      </Typography>
    </Paper>
  );
};

export default ParticipantOiWidget;
