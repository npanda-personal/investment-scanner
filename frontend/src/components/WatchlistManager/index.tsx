import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Paper,
  Divider,
  Alert,
  CircularProgress,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import {
  fetchWatchlists,
  createWatchlist,
  updateWatchlist,
  deleteWatchlist,
  addSymbolToWatchlist,
  removeSymbolFromWatchlist,
  Watchlist,
} from '../../services/watchlistService';

const WatchlistManager: React.FC = () => {
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New watchlist dialog
  const [openDialog, setOpenDialog] = useState(false);
  const [editingWatchlist, setEditingWatchlist] = useState<Watchlist | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [symbolsInput, setSymbolsInput] = useState(''); // comma separated

  // Add symbol dialog
  const [openSymbolDialog, setOpenSymbolDialog] = useState(false);
  const [selectedWatchlist, setSelectedWatchlist] = useState<Watchlist | null>(null);
  const [newSymbol, setNewSymbol] = useState('');

  useEffect(() => {
    loadWatchlists();
  }, []);

  const loadWatchlists = async () => {
    try {
      setLoading(true);
      const data = await fetchWatchlists();
      setWatchlists(data);
      setError(null);
    } catch (err: any) {
      setError('Failed to load watchlists: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (watchlist?: Watchlist) => {
    if (watchlist) {
      setEditingWatchlist(watchlist);
      setName(watchlist.name);
      setDescription(watchlist.description || '');
      setSymbolsInput(watchlist.symbols.join(', '));
    } else {
      setEditingWatchlist(null);
      setName('');
      setDescription('');
      setSymbolsInput('');
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleSaveWatchlist = async () => {
    try {
      const symbols = symbolsInput.split(',').map(s => s.trim()).filter(s => s.length > 0);
      if (editingWatchlist) {
        await updateWatchlist(editingWatchlist.id, { name, description, symbols });
      } else {
        await createWatchlist({ name, description, symbols });
      }
      await loadWatchlists();
      handleCloseDialog();
    } catch (err: any) {
      setError('Failed to save watchlist: ' + err.message);
    }
  };

  const handleDeleteWatchlist = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this watchlist?')) return;
    try {
      await deleteWatchlist(id);
      await loadWatchlists();
    } catch (err: any) {
      setError('Failed to delete watchlist: ' + err.message);
    }
  };

  const handleOpenSymbolDialog = (watchlist: Watchlist) => {
    setSelectedWatchlist(watchlist);
    setNewSymbol('');
    setOpenSymbolDialog(true);
  };

  const handleCloseSymbolDialog = () => {
    setOpenSymbolDialog(false);
  };

  const handleAddSymbol = async () => {
    if (!selectedWatchlist || !newSymbol.trim()) return;
    try {
      await addSymbolToWatchlist(selectedWatchlist.id, newSymbol.trim());
      await loadWatchlists();
      handleCloseSymbolDialog();
    } catch (err: any) {
      setError('Failed to add symbol: ' + err.message);
    }
  };

  const handleRemoveSymbol = async (watchlistId: string, symbol: string) => {
    try {
      await removeSymbolFromWatchlist(watchlistId, symbol);
      await loadWatchlists();
    } catch (err: any) {
      setError('Failed to remove symbol: ' + err.message);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        Watchlist Management
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Create and manage your watchlists to track symbols of interest.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">Your Watchlists</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
          New Watchlist
        </Button>
      </Box>

      {watchlists.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            No watchlists yet. Create your first watchlist to start tracking symbols.
          </Typography>
        </Paper>
      ) : (
        <List sx={{ bgcolor: 'background.paper' }}>
          {watchlists.map((watchlist) => (
            <React.Fragment key={watchlist.id}>
              <ListItem alignItems="flex-start">
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="h6">{watchlist.name}</Typography>
                      {watchlist.description && (
                        <Typography variant="body2" color="text.secondary">
                          {watchlist.description}
                        </Typography>
                      )}
                    </Box>
                  }
                  secondary={
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Created {new Date(watchlist.createdAt).toLocaleDateString()} •{' '}
                        {watchlist.symbols.length} symbols
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                        {watchlist.symbols.map((symbol) => (
                          <Chip
                            key={symbol}
                            label={symbol}
                            size="small"
                            onDelete={() => handleRemoveSymbol(watchlist.id, symbol)}
                            deleteIcon={<RemoveCircleOutlineIcon />}
                          />
                        ))}
                        <Chip
                          icon={<AddIcon />}
                          label="Add"
                          size="small"
                          variant="outlined"
                          onClick={() => handleOpenSymbolDialog(watchlist)}
                        />
                      </Box>
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <IconButton edge="end" aria-label="edit" onClick={() => handleOpenDialog(watchlist)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton edge="end" aria-label="delete" onClick={() => handleDeleteWatchlist(watchlist.id)}>
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
              <Divider component="li" />
            </React.Fragment>
          ))}
        </List>
      )}

      {/* Create/Edit Watchlist Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingWatchlist ? 'Edit Watchlist' : 'Create New Watchlist'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Name"
            fullWidth
            variant="outlined"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            variant="outlined"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <TextField
            margin="dense"
            label="Symbols (comma separated)"
            fullWidth
            variant="outlined"
            value={symbolsInput}
            onChange={(e) => setSymbolsInput(e.target.value)}
            placeholder="AAPL, MSFT, GOOGL"
            helperText="Enter stock symbols separated by commas"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSaveWatchlist} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Symbol Dialog */}
      <Dialog open={openSymbolDialog} onClose={handleCloseSymbolDialog} maxWidth="xs" fullWidth>
        <DialogTitle>Add Symbol to {selectedWatchlist?.name}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Symbol"
            fullWidth
            variant="outlined"
            value={newSymbol}
            onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
            placeholder="AAPL"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseSymbolDialog}>Cancel</Button>
          <Button onClick={handleAddSymbol} variant="contained">
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WatchlistManager;