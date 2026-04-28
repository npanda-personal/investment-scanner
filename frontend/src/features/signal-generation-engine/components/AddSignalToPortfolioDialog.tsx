import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  addHolding,
  fetchPortfolios,
  type Portfolio,
} from '@/features/portfolio-management';
import type { SignalResult } from '../types';

interface AddSignalToPortfolioDialogProps {
  open: boolean;
  signal: SignalResult;
  onClose: () => void;
  onAdded: (portfolioId: string) => void;
}

const duplicateMessage = 'This stock already exists in this portfolio. Edit the existing holding instead.';

const isDuplicateError = (message: string) =>
  message.toLowerCase().includes('unique') ||
  message.toLowerCase().includes('duplicate') ||
  message.toLowerCase().includes('portfolioid_instrumentid');

export const AddSignalToPortfolioDialog: React.FC<AddSignalToPortfolioDialogProps> = ({
  open,
  signal,
  onClose,
  onAdded,
}) => {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [portfolioId, setPortfolioId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [averageCost, setAverageCost] = useState('');
  const [currency, setCurrency] = useState(signal.currency || 'USD');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    setCurrency(signal.currency || 'USD');
    fetchPortfolios()
      .then((items) => {
        setPortfolios(items);
        setPortfolioId(items[0]?.id || '');
      })
      .catch((err: any) => setError(err.response?.data?.error || err.message || 'Failed to load portfolios'))
      .finally(() => setLoading(false));
  }, [open, signal.currency]);

  const submit = async () => {
    const parsedQuantity = Number(quantity);
    const parsedAverageCost = Number(averageCost);
    if (!portfolioId) {
      setError('Select a portfolio.');
      return;
    }
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      setError('Quantity must be greater than 0.');
      return;
    }
    if (!Number.isFinite(parsedAverageCost) || parsedAverageCost < 0) {
      setError('Average cost must be greater than or equal to 0.');
      return;
    }
    if (!currency.trim()) {
      setError('Currency is required.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await addHolding(portfolioId, {
        instrumentId: signal.instrument_id,
        quantity: parsedQuantity,
        averageCost: parsedAverageCost,
        currency: currency.trim().toUpperCase(),
        notes: notes.trim() || null,
      });
      onAdded(portfolioId);
      onClose();
    } catch (err: any) {
      const message = err.response?.data?.error || err.message || 'Failed to add holding';
      setError(isDuplicateError(message) ? duplicateMessage : message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>Add {signal.symbol} to Portfolio</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Box>
            <Typography fontWeight={700}>{signal.company_name || signal.symbol}</Typography>
            <Typography variant="body2" color="text.secondary">{signal.symbol} · {signal.direction} · Score {signal.score}</Typography>
          </Box>

          {error && <Alert severity="error">{error}</Alert>}

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress /></Box>
          ) : portfolios.length === 0 ? (
            <Alert severity="info">No portfolios available. Create a portfolio first, then add this stock.</Alert>
          ) : (
            <>
              <TextField select label="Portfolio" value={portfolioId} onChange={(event) => setPortfolioId(event.target.value)} fullWidth>
                {portfolios.map((portfolio) => (
                  <MenuItem key={portfolio.id} value={portfolio.id}>{portfolio.name} ({portfolio.baseCurrency})</MenuItem>
                ))}
              </TextField>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 120px' }, gap: 1.5 }}>
                <TextField label="Quantity" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
                <TextField label="Average cost" value={averageCost} onChange={(event) => setAverageCost(event.target.value)} />
                <TextField label="Currency" value={currency} onChange={(event) => setCurrency(event.target.value.toUpperCase())} />
              </Box>
              <TextField label="Notes" value={notes} onChange={(event) => setNotes(event.target.value)} multiline minRows={2} />
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={loading || submitting || portfolios.length === 0}>
          {submitting ? 'Adding...' : 'Add Holding'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
