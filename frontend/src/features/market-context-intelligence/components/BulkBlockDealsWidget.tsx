/**
 * CB-22: Bulk & Block Deals Widget
 *
 * Displays today's (or last N days') NSE bulk and block deals —
 * large institutional/HNI trades that are a key smart-money signal.
 *
 * Data is persisted server-side; this component is a pure read — it never
 * calls the /ingest endpoint.
 *
 * Columns: Type | Symbol | Client | B/S | Qty | Avg Price (₹)
 * Color: BUY → success.main, SELL → error.main
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
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
import { changeColor } from '@/shared/format/money';
import { fetchBulkBlockDeals, type BulkBlockDealRow, type DealType } from '../api/marketContextIntelligenceService';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', timeZone: 'UTC' });
}

/** Format qty with Indian number grouping (e.g. 12,34,567) */
function fmtQty(qty: number): string {
  return qty.toLocaleString('en-IN');
}

/** Format price as ₹1,234.50 */
function fmtPrice(price: number): string {
  if (!Number.isFinite(price)) return 'N/A';
  return `₹${price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Compute notional value in ₹ Crore for tooltip */
function notionalCr(qty: number, price: number): string {
  const cr = (qty * price) / 1e7;
  return `₹${cr.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Cr`;
}

const DEAL_TYPE_LABEL: Record<DealType, string> = { BULK: 'Bulk', BLOCK: 'Block' };
const DEAL_TYPE_COLOR: Record<DealType, 'default' | 'primary' | 'secondary'> = { BULK: 'default', BLOCK: 'secondary' };

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const BulkBlockDealsWidget: React.FC = () => {
  const [rows, setRows] = useState<BulkBlockDealRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [asOf, setAsOf] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setUnavailable(false);
    try {
      const resp = await fetchBulkBlockDeals({ days: 1 });
      if (resp.status === 'missing' || resp.rows.length === 0) {
        setUnavailable(true);
        setRows([]);
        return;
      }
      if (resp.status === 'error') {
        setError(resp.message ?? 'Failed to load bulk/block deals');
        setRows([]);
        return;
      }
      setAsOf(resp.asOf);
      setRows(resp.rows);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <Paper sx={{ p: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
        <Box>
          <Typography variant="h6">Bulk &amp; Block Deals</Typography>
          <Typography variant="caption" color="text.secondary">
            Large institutional / HNI trades · Source: NSE
          </Typography>
        </Box>
        {asOf && (
          <Tooltip title={`Trade date: ${asOf}`} arrow>
            <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
              As of {formatDate(asOf)}
            </Typography>
          </Tooltip>
        )}
      </Stack>

      {loading && (
        <Stack spacing={1}>
          <Skeleton variant="rectangular" height={28} />
          <Skeleton variant="rectangular" height={28} />
          <Skeleton variant="rectangular" height={28} />
        </Stack>
      )}

      {!loading && error && (
        <Alert severity="error" sx={{ fontSize: 13 }}>{error}</Alert>
      )}

      {!loading && !error && unavailable && (
        <Alert severity="info" sx={{ fontSize: 13 }}>
          Bulk/block deal data not yet ingested. Use POST /api/v1/market-context/bulk-block-deals/ingest to fetch from NSE.
        </Alert>
      )}

      {!loading && !error && !unavailable && rows.length > 0 && (
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell><Typography variant="caption" fontWeight={700}>Type</Typography></TableCell>
                <TableCell><Typography variant="caption" fontWeight={700}>Symbol</Typography></TableCell>
                <TableCell><Typography variant="caption" fontWeight={700}>Client</Typography></TableCell>
                <TableCell align="center"><Typography variant="caption" fontWeight={700}>B/S</Typography></TableCell>
                <TableCell align="right"><Typography variant="caption" fontWeight={700}>Qty</Typography></TableCell>
                <TableCell align="right"><Typography variant="caption" fontWeight={700}>Avg Price</Typography></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row, idx) => {
                const isBuy = row.buySell === 'BUY';
                const sideColor = changeColor(isBuy ? 1 : -1);
                return (
                  <TableRow key={idx}>
                    <TableCell>
                      <Chip
                        size="small"
                        label={DEAL_TYPE_LABEL[row.dealType]}
                        color={DEAL_TYPE_COLOR[row.dealType]}
                        variant="outlined"
                        sx={{ fontSize: 11 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title={row.name} arrow>
                        <Typography variant="body2" fontWeight={600} sx={{ cursor: 'default' }}>
                          {row.symbol}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={row.remarks ? `Remarks: ${row.remarks}` : row.clientName} arrow>
                        <Typography
                          variant="body2"
                          sx={{
                            maxWidth: 200,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            cursor: 'default',
                          }}
                        >
                          {row.clientName}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="center">
                      <Stack direction="row" justifyContent="center" alignItems="center" spacing={0.25} sx={{ color: sideColor }}>
                        {isBuy ? <TrendingUpIcon fontSize="small" /> : <TrendingDownIcon fontSize="small" />}
                        <Typography variant="body2" fontWeight={700} color="inherit">
                          {row.buySell}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">{fmtQty(row.qty)}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title={`Notional: ${notionalCr(row.qty, row.avgPrice)}`} arrow>
                        <Typography variant="body2" sx={{ cursor: 'default' }}>
                          {fmtPrice(row.avgPrice)}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>
      )}
    </Paper>
  );
};

export default BulkBlockDealsWidget;
