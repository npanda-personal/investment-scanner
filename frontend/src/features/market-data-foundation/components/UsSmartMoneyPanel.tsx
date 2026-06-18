/**
 * US Smart Money panel — persisted-read SEC Form 4 (insider) + 13F
 * (institutional) activity for a US symbol. Rendered on the stock workspace
 * rail, gated on the `hasSecSmartMoney` capability (US only).
 *
 * Research-support only: observed regulatory-filing data, not advice.
 */

import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  fetchUsSmartMoneyPanel,
  type UsInsiderTrade,
  type UsSmartMoneyPanel as Panel,
} from '../api/usSmartMoneyService';

function formatUsd(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  if (abs >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

function formatShares(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return value.toLocaleString('en-US');
}

function formatPct(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return `${value.toFixed(1)}%`;
}

/** SEC Form 4 transaction codes → short human label. */
const TXN_CODE_LABELS: Record<string, string> = {
  P: 'Buy',
  S: 'Sell',
  A: 'Grant',
  M: 'Option exercise',
  F: 'Tax withholding',
  G: 'Gift',
  D: 'Disposition',
  C: 'Conversion',
  X: 'Option exercise',
};

function txnCodeColor(code: string): 'success' | 'error' | 'default' {
  if (code === 'P') return 'success';
  if (code === 'S') return 'error';
  return 'default';
}

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Box sx={{ flex: 1, minWidth: 90 }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={700}>
        {value}
      </Typography>
      {sub && (
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
          {sub}
        </Typography>
      )}
    </Box>
  );
}

function InsiderRow({ trade }: { trade: UsInsiderTrade }) {
  const codeLabel = TXN_CODE_LABELS[trade.transactionCode] ?? trade.transactionCode;
  return (
    <TableRow>
      <TableCell sx={{ py: 0.5 }}>
        <Typography variant="caption" fontWeight={600}>
          {trade.insiderName}
        </Typography>
        {trade.insiderTitle && (
          <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.6rem' }}>
            {trade.insiderTitle}
          </Typography>
        )}
      </TableCell>
      <TableCell sx={{ py: 0.5 }}>
        <Tooltip title={`SEC code ${trade.transactionCode}`}>
          <Chip size="small" label={codeLabel} color={txnCodeColor(trade.transactionCode)} sx={{ height: 18, fontSize: '0.6rem' }} />
        </Tooltip>
      </TableCell>
      <TableCell align="right" sx={{ py: 0.5, fontSize: '0.7rem' }}>{formatShares(trade.shares)}</TableCell>
      <TableCell align="right" sx={{ py: 0.5, fontSize: '0.7rem' }}>{trade.transactionDate}</TableCell>
    </TableRow>
  );
}

export default function UsSmartMoneyPanel({ symbol }: { symbol?: string | null }) {
  const [panel, setPanel] = useState<Panel | null>(null);
  const [loading, setLoading] = useState(!!symbol);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!symbol) {
      setPanel(null);
      setLoading(false);
      return;
    }
    let canceled = false;
    setLoading(true);
    setError(null);
    fetchUsSmartMoneyPanel(symbol)
      .then((result) => {
        if (!canceled) {
          setPanel(result);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!canceled) {
          setError(err instanceof Error ? err.message : 'Failed to load smart-money activity');
          setLoading(false);
        }
      });
    return () => {
      canceled = true;
    };
  }, [symbol]);

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 0.5 }}>
        Smart Money &amp; Short Pressure
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5, fontSize: '0.65rem' }}>
        Insider (Form 4) &amp; institutional (13F) activity from public SEC filings, plus daily short-volume from FINRA Reg SHO. Research support only.
      </Typography>

      {loading && (
        <Stack alignItems="center" sx={{ py: 2 }}>
          <CircularProgress size={20} />
        </Stack>
      )}

      {!loading && error && (
        <Alert severity="warning" sx={{ fontSize: '0.7rem' }}>
          {error}
        </Alert>
      )}

      {!loading && !error && panel && !panel.hasData && (
        <Alert severity="info" sx={{ fontSize: '0.7rem' }}>
          No SEC filings or short-volume data recorded for {panel.symbol} yet.
        </Alert>
      )}

      {!loading && !error && panel && panel.hasData && (
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <StatTile label="Insider buys" value={String(panel.summary.netInsiderBuys)} />
            <StatTile label="Insider sells" value={String(panel.summary.netInsiderSells)} />
            <StatTile
              label="Last insider"
              value={panel.summary.lastInsiderDate ?? '—'}
            />
          </Stack>

          {panel.institutional && (
            <>
              <Divider />
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <StatTile
                  label="Institutional (13F)"
                  value={formatUsd(panel.institutional.totalValue)}
                  sub={`${panel.institutional.holderCount.toLocaleString('en-US')} holders`}
                />
                <StatTile label="Filing window" value={panel.institutional.periodLabel} />
              </Stack>
              {panel.institutional.topHolders.length > 0 && (
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                    Top holders
                  </Typography>
                  {panel.institutional.topHolders.slice(0, 5).map((h) => (
                    <Stack key={h.manager} direction="row" justifyContent="space-between" sx={{ fontSize: '0.7rem' }}>
                      <Typography variant="caption" noWrap sx={{ maxWidth: 170 }}>{h.manager}</Typography>
                      <Typography variant="caption" fontWeight={600}>{formatUsd(h.value)}</Typography>
                    </Stack>
                  ))}
                </Box>
              )}
            </>
          )}

          {panel.shortPressure && (
            <>
              <Divider />
              <Box>
                <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="flex-start">
                  <StatTile
                    label="Daily Short Volume %"
                    value={formatPct(panel.shortPressure.shortVolumePct)}
                    sub={`as of ${panel.shortPressure.tradingDate}`}
                  />
                  <StatTile
                    label={`${panel.shortPressure.sessionsInAvg}-session avg`}
                    value={formatPct(panel.shortPressure.avg5dPct)}
                  />
                </Stack>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', mt: 0.5, fontSize: '0.6rem' }}
                >
                  Observed share of consolidated volume executed as short sales (FINRA Reg SHO).
                  A short-pressure proxy — not short interest, a squeeze prediction, or advice.
                </Typography>
              </Box>
            </>
          )}

          {panel.insiderTrades.length > 0 && (
            <>
              <Divider />
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                Recent insider transactions
              </Typography>
              <Table size="small" sx={{ '& td, & th': { borderBottom: 'none', px: 0.5 } }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ py: 0.5, fontSize: '0.6rem' }}>Insider</TableCell>
                    <TableCell sx={{ py: 0.5, fontSize: '0.6rem' }}>Type</TableCell>
                    <TableCell align="right" sx={{ py: 0.5, fontSize: '0.6rem' }}>Shares</TableCell>
                    <TableCell align="right" sx={{ py: 0.5, fontSize: '0.6rem' }}>Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {panel.insiderTrades.slice(0, 8).map((t) => (
                    <InsiderRow key={`${t.accession}-${t.insiderName}-${t.transactionDate}-${t.transactionCode}-${t.shares}`} trade={t} />
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </Stack>
      )}
    </Paper>
  );
}
