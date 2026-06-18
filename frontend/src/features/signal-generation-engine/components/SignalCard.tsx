import React from 'react';
import { Alert, Box, Button, Chip, IconButton, Paper, Snackbar, Tooltip, Typography } from '@mui/material';
import { 
  VisibilityOutlined, 
  AccountBalanceWalletOutlined, 
  PlaylistAddOutlined, 
  NotificationsNoneOutlined 
} from '@mui/icons-material';
import { Link, useNavigate } from 'react-router-dom';
import { SignalBadge } from './SignalBadge';
import { AddSignalToPortfolioDialog } from './AddSignalToPortfolioDialog';
import { AddToWatchlistDialog } from '@/features/watchlist-management';
import { CreateAlertDialog } from '@/features/alerts-monitoring';
import type { SignalResult } from '../types';

const formatDateTime = (value: string) => new Date(value).toLocaleString();
const formatPrice = (value: number | null, currency: string | null) => {
  if (value === null) return 'Price unavailable';
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency || ''} ${value.toFixed(2)}`.trim();
  }
};

const formatChange = (value: number | null) => value === null ? 'N/A' : `${value >= 0 ? '+' : ''}${(value * 100).toFixed(1)}%`;
const priceTone = (value: number | null) => {
  if (value === null || value === 0) return 'text.secondary';
  return value > 0 ? 'success.main' : 'error.main';
};

export const SignalCard: React.FC<{ signal: SignalResult }> = ({ signal }) => {
  const navigate = useNavigate();
  const reasons = signal.triggered_signals.length > 0 ? signal.triggered_signals : signal.negative_signals;
  const [portfolioDialogOpen, setPortfolioDialogOpen] = React.useState(false);
  const [successPortfolioId, setSuccessPortfolioId] = React.useState<string | null>(null);
  const [watchlistDialogOpen, setWatchlistDialogOpen] = React.useState(false);
  const [successWatchlistId, setSuccessWatchlistId] = React.useState<string | null>(null);
  const [alertDialogOpen, setAlertDialogOpen] = React.useState(false);

  return (
    <>
      <Paper variant="outlined" sx={{ p: 1.5, height: '100%' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mb: 1 }}>
          <Box>
            <Typography fontWeight={700}>{signal.symbol}</Typography>
            <Typography variant="body2" color="text.secondary">{signal.company_name || 'Unknown company'}</Typography>
          </Box>
          <SignalBadge direction={signal.direction} />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, flexWrap: 'wrap' }}>
          {signal.calibratedScore != null && signal.calibrationStatus === 'CALIBRATED' ? (
            <>
              <Typography variant="h5">{signal.score}</Typography>
              <Typography variant="body2" color="text.secondary">→ {signal.calibratedScore} (calibrated)</Typography>
              {signal.reliabilityTier && (
                <Chip size="small" label={signal.reliabilityTier} color={signal.reliabilityTier === 'FULL' ? 'success' : 'warning'} sx={{ height: 18, fontSize: 10 }} />
              )}
            </>
          ) : (
            <>
              <Typography variant="h5">{signal.score}</Typography>
              <Typography variant="caption" color="text.disabled">calibration pending</Typography>
            </>
          )}
        </Box>
        <Typography variant="caption" color="text.secondary">Confidence: {signal.confidence}</Typography>
        <Box sx={{ mt: 1, display: 'flex', gap: 1, alignItems: 'baseline', flexWrap: 'wrap' }}>
          <Typography fontWeight={700}>{formatPrice(signal.currentPrice, signal.currency)}</Typography>
          <Typography color={priceTone(signal.dailyChangePercent)} variant="body2">
            {signal.dailyChange !== null && signal.dailyChange >= 0 ? '+' : ''}{signal.dailyChange?.toFixed(2) ?? 'N/A'} ({formatChange(signal.dailyChangePercent)})
          </Typography>
          {signal.priceTimestamp && <Typography variant="caption" color="text.secondary">{new Date(signal.priceTimestamp).toLocaleDateString()}</Typography>}
        </Box>
        <Box component="ul" sx={{ pl: 2, my: 1 }}>
          {reasons.slice(0, 3).map((reason) => (
            <Typography key={reason.code} component="li" variant="body2">{reason.label}</Typography>
          ))}
        </Box>
        <Typography variant="caption" color="text.secondary">{formatDateTime(signal.generated_at)}</Typography>
        <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          <Tooltip title="View Research" arrow>
            <IconButton size="small" onClick={() => navigate(`/stocks/${signal.instrument_id}`)}>
              <VisibilityOutlined fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Add to Portfolio" arrow>
            <IconButton size="small" onClick={() => setPortfolioDialogOpen(true)}>
              <AccountBalanceWalletOutlined fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Add to Watchlist" arrow>
            <IconButton size="small" onClick={() => setWatchlistDialogOpen(true)}>
              <PlaylistAddOutlined fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Create Alert" arrow>
            <IconButton size="small" onClick={() => setAlertDialogOpen(true)}>
              <NotificationsNoneOutlined fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>
      <AddSignalToPortfolioDialog
        open={portfolioDialogOpen}
        signal={signal}
        onClose={() => setPortfolioDialogOpen(false)}
        onAdded={(portfolioId) => setSuccessPortfolioId(portfolioId)}
      />
      <AddToWatchlistDialog
        open={watchlistDialogOpen}
        instrumentId={signal.instrument_id}
        symbol={signal.symbol}
        companyName={signal.company_name}
        onClose={() => setWatchlistDialogOpen(false)}
        onAdded={(watchlistId) => setSuccessWatchlistId(watchlistId)}
      />
      <CreateAlertDialog
        open={alertDialogOpen}
        onClose={() => setAlertDialogOpen(false)}
        defaults={{
          name: `${signal.symbol} signal score above ${signal.score}`,
          type: 'SIGNAL_SCORE_ABOVE',
          scope: 'STOCK',
          instrumentId: signal.instrument_id,
          condition: { threshold: signal.score },
        }}
      />
      <Snackbar open={Boolean(successPortfolioId)} autoHideDuration={5000} onClose={() => setSuccessPortfolioId(null)}>
        <Alert severity="success" variant="filled" onClose={() => setSuccessPortfolioId(null)}>
          Added {signal.symbol} to portfolio. <Button color="inherit" component={Link} to={successPortfolioId ? `/portfolios/${successPortfolioId}` : '/portfolios'} size="small">Open</Button>
        </Alert>
      </Snackbar>
      <Snackbar open={Boolean(successWatchlistId)} autoHideDuration={5000} onClose={() => setSuccessWatchlistId(null)}>
        <Alert severity="success" variant="filled" onClose={() => setSuccessWatchlistId(null)}>
          Added {signal.symbol} to watchlist. <Button color="inherit" component={Link} to={successWatchlistId ? `/watchlists/${successWatchlistId}` : '/watchlists'} size="small">Open</Button>
        </Alert>
      </Snackbar>
    </>
  );
};
