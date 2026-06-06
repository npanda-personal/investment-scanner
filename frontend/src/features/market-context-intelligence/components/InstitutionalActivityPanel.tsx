/**
 * CB-25: Institutional Activity Panel
 *
 * Consolidated "what are the big players doing today" summary that composes:
 *   1. FII/DII net flows (cash-market buy/sell, ₹ Cr)
 *   2. Bulk & Block deals (count + top highlights by notional value)
 *   3. F&O ban list (count + symbols — risk flag)
 *   4. Smart-money sectors (top accumulating vs distributing)
 *
 * Data is sourced from a single backend aggregate endpoint that does
 * persisted-reads only.  No data is generated on GET.
 *
 * Placement: top of the Market Context page, above the individual
 * FII/DII and Bulk/Block widgets.  Rationale: the four datasets are all
 * institutional-signal sources on the same page; surfacing the at-a-glance
 * picture first lets a trader quickly assess the "big picture" before
 * drilling into individual widgets below.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import RemoveIcon from '@mui/icons-material/Remove';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { changeColor } from '@/shared/format/money';
import {
  fetchInstitutionalActivity,
  type InstitutionalActivityResponse,
  type InstitutionalActivityDealHighlight,
} from '../api/marketContextIntelligenceService';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string | null): string {
  if (!iso) return 'N/A';
  const d = new Date(`${iso.length === 10 ? iso + 'T00:00:00Z' : iso}`);
  if (!Number.isFinite(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

function fmtCr(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return 'N/A';
  const abs = Math.abs(value);
  const sign = value < 0 ? '−' : '+';
  return `${sign}₹${abs.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} Cr`;
}

function humanizeSectorName(sector: string): string {
  return sector
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const SECTOR_STATUS_COLOR: Record<string, string> = {
  STRONG_ACCUMULATION: '#1b5e20',
  ACCUMULATING: '#388e3c',
  NEUTRAL: '#f9a825',
  DISTRIBUTING: '#e64a19',
  STRONG_DISTRIBUTION: '#b71c1c',
};

function sectorStatusBgColor(status: string): string {
  return SECTOR_STATUS_COLOR[status] ?? '#757575';
}

function NetDirectionIcon({ positive }: { positive: boolean | null }) {
  if (positive === null) return <RemoveIcon fontSize="small" sx={{ color: 'text.secondary' }} />;
  return positive
    ? <TrendingUpIcon fontSize="small" sx={{ color: 'success.main' }} />
    : <TrendingDownIcon fontSize="small" sx={{ color: 'error.main' }} />;
}

// ---------------------------------------------------------------------------
// Sub-sections
// ---------------------------------------------------------------------------

function FiiDiiRow({ label, netCr, positive }: { label: string; netCr: number | null; positive: boolean | null }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 36 }}>{label}</Typography>
      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ color: changeColor(netCr) }}>
        <NetDirectionIcon positive={positive} />
        <Typography variant="body2" fontWeight={700} color="inherit">
          {fmtCr(netCr)}
        </Typography>
      </Stack>
    </Stack>
  );
}

function DealHighlightRow({ deal }: { deal: InstitutionalActivityDealHighlight }) {
  const isBuy = deal.buySell === 'BUY';
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
      <Stack direction="row" alignItems="center" spacing={0.75}>
        <Typography variant="body2" fontWeight={700} sx={{ minWidth: 72 }}>{deal.symbol}</Typography>
        <Chip
          size="small"
          label={deal.dealType}
          variant="outlined"
          sx={{ fontSize: 10, height: 18 }}
        />
      </Stack>
      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ color: changeColor(isBuy ? 1 : -1) }}>
        {isBuy ? <TrendingUpIcon sx={{ fontSize: 14 }} /> : <TrendingDownIcon sx={{ fontSize: 14 }} />}
        <Typography variant="body2" fontWeight={700} color="inherit" sx={{ fontSize: 12 }}>
          {deal.buySell}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: 11 }}>
          ₹{deal.notionalCr.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 1 })} Cr
        </Typography>
      </Stack>
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export const InstitutionalActivityPanel: React.FC = () => {
  const [data, setData] = useState<InstitutionalActivityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetchInstitutionalActivity();
      setData(resp);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (loading) {
    return (
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 1.5 }}>Institutional Activity</Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
          <CircularProgress size={28} />
        </Box>
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>Institutional Activity</Typography>
        <Alert severity="error" sx={{ fontSize: 13 }}>{error}</Alert>
      </Paper>
    );
  }

  if (!data) return null;

  const { fiiDii, deals, fnoBan, sectors } = data;

  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      {/* Header */}
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1} sx={{ mb: 1.5 }}>
        <Box>
          <Typography variant="h6">Institutional Activity</Typography>
          <Typography variant="caption" color="text.secondary">
            At-a-glance picture of what large players are doing — cash flows, large deals, derivatives exposure
          </Typography>
        </Box>
        <Tooltip title={`Assembled at ${formatDate(data.assembledAt)}`} arrow>
          <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
            As of {formatDate(fiiDii.asOf ?? deals.asOf ?? fnoBan.banDate)}
          </Typography>
        </Tooltip>
      </Stack>

      {/* One-line narrative summary */}
      <Alert
        severity="info"
        icon={false}
        sx={{
          mb: 2,
          bgcolor: 'action.hover',
          border: '1px solid',
          borderColor: 'divider',
          '& .MuiAlert-message': { width: '100%' },
        }}
      >
        <Typography variant="body2" fontStyle="italic" color="text.primary">
          {data.narrative}
        </Typography>
      </Alert>

      {/* Four-column grid: FII/DII | Deals | F&O Ban | Sectors */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
          gap: 2,
        }}
      >
        {/* --- FII / DII --- */}
        <Box>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75 }}>
            <Typography variant="subtitle2" fontWeight={700}>FII / DII Net</Typography>
            {fiiDii.asOf && (
              <Typography variant="caption" color="text.secondary">{formatDate(fiiDii.asOf)}</Typography>
            )}
          </Stack>
          {fiiDii.status === 'ready' ? (
            <Stack spacing={0.5}>
              <FiiDiiRow label="FII" netCr={fiiDii.fiiNetCr} positive={fiiDii.fiiNetPositive} />
              <FiiDiiRow label="DII" netCr={fiiDii.diiNetCr} positive={fiiDii.diiNetPositive} />
              <Typography variant="caption" color="text.secondary" sx={{ pt: 0.5, fontStyle: 'italic' }}>
                {fiiDii.narrative}
              </Typography>
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">
              {fiiDii.status === 'missing'
                ? 'Not yet ingested'
                : 'Data unavailable'}
            </Typography>
          )}
        </Box>

        <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'none', lg: 'block' } }} />

        {/* --- Bulk / Block Deals --- */}
        <Box>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75 }}>
            <Typography variant="subtitle2" fontWeight={700}>Bulk &amp; Block Deals</Typography>
            {deals.asOf && (
              <Typography variant="caption" color="text.secondary">{formatDate(deals.asOf)}</Typography>
            )}
          </Stack>
          {deals.status === 'ready' && deals.totalDeals > 0 ? (
            <Stack spacing={0.5}>
              <Stack direction="row" spacing={1} sx={{ mb: 0.5 }}>
                <Chip
                  size="small"
                  label={`${deals.totalDeals} deals`}
                  variant="outlined"
                  sx={{ fontSize: 11 }}
                />
                <Chip
                  size="small"
                  label={`${deals.buyCount} buy`}
                  color="success"
                  variant="outlined"
                  sx={{ fontSize: 11 }}
                />
                <Chip
                  size="small"
                  label={`${deals.sellCount} sell`}
                  color="error"
                  variant="outlined"
                  sx={{ fontSize: 11 }}
                />
              </Stack>
              <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ pb: 0.25 }}>
                Top by value:
              </Typography>
              <Stack spacing={0.5}>
                {deals.highlights.map((deal, idx) => (
                  <DealHighlightRow key={idx} deal={deal} />
                ))}
              </Stack>
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">
              {deals.status === 'missing'
                ? 'No deals recorded today'
                : 'Data unavailable'}
            </Typography>
          )}
        </Box>

        <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'none', lg: 'block' } }} />

        {/* --- F&O Ban --- */}
        <Box>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75 }}>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Typography variant="subtitle2" fontWeight={700}>F&amp;O Ban</Typography>
              {fnoBan.count > 0 && (
                <WarningAmberIcon sx={{ fontSize: 16, color: 'warning.main' }} />
              )}
            </Stack>
            {fnoBan.banDate && (
              <Typography variant="caption" color="text.secondary">{formatDate(fnoBan.banDate)}</Typography>
            )}
          </Stack>
          {fnoBan.status === 'ready' ? (
            fnoBan.count === 0 ? (
              <Typography variant="body2" color="success.main">No stocks in F&O ban period</Typography>
            ) : (
              <Stack spacing={0.5}>
                <Typography variant="body2">
                  <Typography component="span" fontWeight={700} color="warning.main">{fnoBan.count}</Typography>
                  {' '}stock{fnoBan.count > 1 ? 's' : ''} in ban period
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  OI exceeded 95% of market-wide position limit. Derivatives trading restricted.
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, pt: 0.25 }}>
                  {fnoBan.symbols.slice(0, 10).map((sym) => (
                    <Chip
                      key={sym}
                      size="small"
                      label={sym}
                      color="warning"
                      variant="outlined"
                      sx={{ fontSize: 10, height: 20 }}
                    />
                  ))}
                  {fnoBan.symbols.length > 10 && (
                    <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>
                      +{fnoBan.symbols.length - 10} more
                    </Typography>
                  )}
                </Box>
              </Stack>
            )
          ) : (
            <Typography variant="body2" color="text.secondary">
              {fnoBan.status === 'missing'
                ? 'Not yet ingested'
                : 'Data unavailable'}
            </Typography>
          )}
        </Box>

        <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'none', lg: 'block' } }} />

        {/* --- Smart-money Sectors --- */}
        <Box>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75 }}>
            <Typography variant="subtitle2" fontWeight={700}>Sector Flows</Typography>
            {sectors.asOf && (
              <Tooltip title={`Smart-money snapshot: ${sectors.asOf}`} arrow>
                <Typography variant="caption" color="text.secondary">{formatDate(sectors.asOf)}</Typography>
              </Tooltip>
            )}
          </Stack>
          {sectors.status === 'ready' ? (
            <Stack spacing={1}>
              {sectors.topAccumulating.length > 0 && (
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    Accumulating
                  </Typography>
                  <Stack spacing={0.5} sx={{ mt: 0.25 }}>
                    {sectors.topAccumulating.map((s) => (
                      <Stack key={s.sector} direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2">{humanizeSectorName(s.sector)}</Typography>
                        <Box
                          sx={{
                            px: 0.75,
                            py: 0.25,
                            borderRadius: 0.75,
                            bgcolor: sectorStatusBgColor(s.sectorStatus),
                            color: '#fff',
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: 0.3,
                          }}
                        >
                          {s.sectorStatus.replace('_', ' ')}
                        </Box>
                      </Stack>
                    ))}
                  </Stack>
                </Box>
              )}
              {sectors.topDistributing.length > 0 && (
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    Distributing
                  </Typography>
                  <Stack spacing={0.5} sx={{ mt: 0.25 }}>
                    {sectors.topDistributing.map((s) => (
                      <Stack key={s.sector} direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2">{humanizeSectorName(s.sector)}</Typography>
                        <Box
                          sx={{
                            px: 0.75,
                            py: 0.25,
                            borderRadius: 0.75,
                            bgcolor: sectorStatusBgColor(s.sectorStatus),
                            color: '#fff',
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: 0.3,
                          }}
                        >
                          {s.sectorStatus.replace('_', ' ')}
                        </Box>
                      </Stack>
                    ))}
                  </Stack>
                </Box>
              )}
              {sectors.topAccumulating.length === 0 && sectors.topDistributing.length === 0 && (
                <Typography variant="body2" color="text.secondary">All sectors neutral</Typography>
              )}
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">
              {sectors.status === 'missing'
                ? 'Smart-money snapshots not yet generated'
                : 'Data unavailable'}
            </Typography>
          )}
        </Box>
      </Box>
    </Paper>
  );
};

export default InstitutionalActivityPanel;
