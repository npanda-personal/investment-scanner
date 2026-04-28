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
import { addWatchlistItem, fetchWatchlists } from '../api/watchlistManagementService';
import type { Watchlist } from '../types';

interface AddToWatchlistDialogProps {
  open: boolean;
  instrumentId: string;
  symbol: string;
  companyName?: string | null;
  onClose: () => void;
  onAdded?: (watchlistId: string) => void;
}

const duplicateMessage = 'This stock already exists in this watchlist.';

export const AddToWatchlistDialog: React.FC<AddToWatchlistDialogProps> = ({
  open,
  instrumentId,
  symbol,
  companyName,
  onClose,
  onAdded,
}) => {
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [watchlistId, setWatchlistId] = useState('');
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    fetchWatchlists()
      .then((items) => {
        setWatchlists(items);
        setWatchlistId(items[0]?.id || '');
      })
      .catch((err: any) => setError(err.response?.data?.error || err.message || 'Failed to load watchlists'))
      .finally(() => setLoading(false));
  }, [open]);

  const submit = async () => {
    if (!watchlistId) {
      setError('Select a watchlist.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await addWatchlistItem(watchlistId, {
        instrumentId,
        notes: notes.trim() || null,
        tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      });
      setNotes('');
      setTags('');
      onAdded?.(watchlistId);
      onClose();
    } catch (err: any) {
      const message = err.response?.data?.error || err.message || 'Failed to add to watchlist';
      setError(message.toLowerCase().includes('exists') || message.toLowerCase().includes('unique') ? duplicateMessage : message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>Add {symbol} to Watchlist</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Box>
            <Typography fontWeight={700}>{companyName || symbol}</Typography>
            <Typography variant="body2" color="text.secondary">{symbol}</Typography>
          </Box>
          {error && <Alert severity="error">{error}</Alert>}
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress /></Box>
          ) : watchlists.length === 0 ? (
            <Alert severity="info">No watchlists available. Create a watchlist first.</Alert>
          ) : (
            <>
              <TextField select label="Watchlist" value={watchlistId} onChange={(event) => setWatchlistId(event.target.value)}>
                {watchlists.map((watchlist) => <MenuItem key={watchlist.id} value={watchlist.id}>{watchlist.name}</MenuItem>)}
              </TextField>
              <TextField label="Note" value={notes} onChange={(event) => setNotes(event.target.value)} multiline minRows={2} />
              <TextField label="Tags" value={tags} onChange={(event) => setTags(event.target.value)} helperText="Comma separated, optional" />
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={loading || submitting || watchlists.length === 0}>
          {submitting ? 'Adding...' : 'Add'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
