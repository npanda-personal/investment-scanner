import React, { useState } from 'react';
import { Alert, Autocomplete, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField } from '@mui/material';
import { createAlertRule } from '../api/alertsMonitoringService';
import type { AlertScope, AlertType, CreateAlertRuleInput } from '../types';
import { InstrumentSearchSelect } from '@/shared/components';
import type { V1Instrument } from '@/features/market-data-foundation';
import { fetchPortfolios, type Portfolio } from '@/features/portfolio-management';
import { fetchWatchlists, type Watchlist } from '@/features/watchlist-management';

/** Alert types that do not require a numeric threshold. */
const THRESHOLD_FREE_TYPES: AlertType[] = ['SIGNAL_DIRECTION_CHANGED'];

interface CreateAlertDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
  defaults?: Partial<CreateAlertRuleInput>;
}

export const CreateAlertDialog: React.FC<CreateAlertDialogProps> = ({ open, onClose, onCreated, defaults }) => {
  const [name, setName] = useState(defaults?.name || '');
  const [type, setType] = useState<AlertType>(defaults?.type || 'PRICE_ABOVE');
  const [scope, setScope] = useState<AlertScope>(defaults?.scope || 'STOCK');
  const [instrumentId, setInstrumentId] = useState(defaults?.instrumentId || '');
  const [selectedInstrument, setSelectedInstrument] = useState<V1Instrument | null>(null);
  const [portfolioId, setPortfolioId] = useState(defaults?.portfolioId || '');
  const [watchlistId, setWatchlistId] = useState(defaults?.watchlistId || '');
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [watchlist, setWatchlist] = useState<Watchlist | null>(null);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [threshold, setThreshold] = useState(String(defaults?.condition?.threshold ?? ''));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const thresholdFree = THRESHOLD_FREE_TYPES.includes(type);
  const thresholdValue = Number(threshold);
  const thresholdInvalid = !thresholdFree && (threshold.trim() === '' || isNaN(thresholdValue));

  React.useEffect(() => {
    if (!open) return;
    setName(defaults?.name || '');
    setType(defaults?.type || 'PRICE_ABOVE');
    setScope(defaults?.scope || 'STOCK');
    setInstrumentId(defaults?.instrumentId || '');
    setSelectedInstrument(null);
    setPortfolioId(defaults?.portfolioId || '');
    setWatchlistId(defaults?.watchlistId || '');
    setPortfolio(null);
    setWatchlist(null);
    setThreshold(String(defaults?.condition?.threshold ?? ''));
    setError(null);
    void fetchPortfolios().then(setPortfolios).catch(() => setPortfolios([]));
    void fetchWatchlists().then(setWatchlists).catch(() => setWatchlists([]));
  }, [open, defaults]);

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      const input: CreateAlertRuleInput = {
        name,
        type,
        scope,
        instrumentId: instrumentId || null,
        portfolioId: portfolioId || null,
        watchlistId: watchlistId || null,
        condition: thresholdFree ? {} : { threshold: thresholdValue },
        enabled: true,
      };
      await createAlertRule(input);
      onCreated?.();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to create alert');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>Create Alert Rule</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField label="Name" value={name} onChange={(event) => setName(event.target.value)} />
          <TextField select label="Scope" value={scope} onChange={(event) => setScope(event.target.value as AlertScope)}>
            <MenuItem value="STOCK">Stock</MenuItem>
            <MenuItem value="PORTFOLIO">Portfolio</MenuItem>
            <MenuItem value="WATCHLIST">Watchlist</MenuItem>
          </TextField>
          <TextField select label="Type" value={type} onChange={(event) => setType(event.target.value as AlertType)}>
            <MenuItem value="PRICE_ABOVE">Price Above</MenuItem>
            <MenuItem value="PRICE_BELOW">Price Below</MenuItem>
            <MenuItem value="DAILY_MOVE_ABOVE">Daily Move Above</MenuItem>
            <MenuItem value="DAILY_MOVE_BELOW">Daily Move Below</MenuItem>
            <MenuItem value="SIGNAL_SCORE_ABOVE">Signal Score Above</MenuItem>
            <MenuItem value="SIGNAL_DIRECTION_CHANGED">Signal Direction Changed</MenuItem>
            <MenuItem value="PORTFOLIO_HOLDING_DRAWDOWN">Portfolio Holding Drawdown</MenuItem>
            <MenuItem value="PORTFOLIO_BEARISH_SIGNAL">Portfolio Bearish Signal</MenuItem>
            <MenuItem value="WATCHLIST_SIGNAL_SCORE_ABOVE">Watchlist Signal Score Above</MenuItem>
            <MenuItem value="WATCHLIST_PRICE_ABOVE">Watchlist Price Above</MenuItem>
            <MenuItem value="WATCHLIST_PRICE_BELOW">Watchlist Price Below</MenuItem>
          </TextField>
          {scope === 'STOCK' && (
            <InstrumentSearchSelect
              value={selectedInstrument}
              onChange={(instrument) => {
                setSelectedInstrument(instrument);
                setInstrumentId(instrument?.id || defaults?.instrumentId || '');
              }}
              label={defaults?.instrumentId ? `Stock (${defaults.instrumentId})` : 'Stock'}
            />
          )}
          {scope === 'PORTFOLIO' && (
            <Autocomplete
              options={portfolios}
              value={portfolio}
              onChange={(_event, value) => {
                setPortfolio(value);
                setPortfolioId(value?.id || defaults?.portfolioId || '');
              }}
              getOptionLabel={(option) => `${option.name} (${option.baseCurrency})`}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderInput={(params) => <TextField {...params} label={defaults?.portfolioId ? `Portfolio (${defaults.portfolioId})` : 'Portfolio'} />}
            />
          )}
          {scope === 'WATCHLIST' && (
            <Autocomplete
              options={watchlists}
              value={watchlist}
              onChange={(_event, value) => {
                setWatchlist(value);
                setWatchlistId(value?.id || defaults?.watchlistId || '');
              }}
              getOptionLabel={(option) => option.name}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderInput={(params) => <TextField {...params} label={defaults?.watchlistId ? `Watchlist (${defaults.watchlistId})` : 'Watchlist'} />}
            />
          )}
          {!thresholdFree && (
            <TextField
              label="Threshold"
              value={threshold}
              type="number"
              onChange={(event) => setThreshold(event.target.value)}
              error={thresholdInvalid && threshold.trim() !== ''}
              helperText={thresholdInvalid && threshold.trim() !== '' ? 'Enter a valid number' : undefined}
            />
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button
          variant="contained"
          onClick={submit}
          disabled={saving || thresholdInvalid}
        >
          {saving ? 'Saving...' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
