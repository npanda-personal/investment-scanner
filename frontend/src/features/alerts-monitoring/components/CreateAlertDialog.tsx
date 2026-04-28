import React, { useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField } from '@mui/material';
import { createAlertRule } from '../api/alertsMonitoringService';
import type { AlertScope, AlertType, CreateAlertRuleInput } from '../types';

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
  const [portfolioId, setPortfolioId] = useState(defaults?.portfolioId || '');
  const [watchlistId, setWatchlistId] = useState(defaults?.watchlistId || '');
  const [threshold, setThreshold] = useState(String(defaults?.condition?.threshold ?? ''));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (!open) return;
    setName(defaults?.name || '');
    setType(defaults?.type || 'PRICE_ABOVE');
    setScope(defaults?.scope || 'STOCK');
    setInstrumentId(defaults?.instrumentId || '');
    setPortfolioId(defaults?.portfolioId || '');
    setWatchlistId(defaults?.watchlistId || '');
    setThreshold(String(defaults?.condition?.threshold ?? ''));
    setError(null);
  }, [open, defaults]);

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      await createAlertRule({
        name,
        type,
        scope,
        instrumentId: instrumentId || null,
        portfolioId: portfolioId || null,
        watchlistId: watchlistId || null,
        condition: { threshold: Number(threshold) },
        enabled: true,
      });
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
            <MenuItem value="PORTFOLIO_HOLDING_DRAWDOWN">Portfolio Holding Drawdown</MenuItem>
            <MenuItem value="PORTFOLIO_BEARISH_SIGNAL">Portfolio Bearish Signal</MenuItem>
            <MenuItem value="WATCHLIST_SIGNAL_SCORE_ABOVE">Watchlist Signal Score Above</MenuItem>
            <MenuItem value="WATCHLIST_PRICE_ABOVE">Watchlist Price Above</MenuItem>
            <MenuItem value="WATCHLIST_PRICE_BELOW">Watchlist Price Below</MenuItem>
          </TextField>
          {scope === 'STOCK' && <TextField label="Instrument ID" value={instrumentId} onChange={(event) => setInstrumentId(event.target.value)} />}
          {scope === 'PORTFOLIO' && <TextField label="Portfolio ID" value={portfolioId} onChange={(event) => setPortfolioId(event.target.value)} />}
          {scope === 'WATCHLIST' && <TextField label="Watchlist ID" value={watchlistId} onChange={(event) => setWatchlistId(event.target.value)} />}
          <TextField label="Threshold" value={threshold} onChange={(event) => setThreshold(event.target.value)} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={saving}>{saving ? 'Saving...' : 'Create'}</Button>
      </DialogActions>
    </Dialog>
  );
};
