import React, { useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { SaveOutlined, DeleteOutline, NotificationsOutlined } from '@mui/icons-material';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { SignalBadge } from '@/features/signal-generation-engine';
import { DataTable, InstrumentSearchSelect, PageHeader, StatusBadge, type DataTableColumn } from '@/shared/components';
import { useWorkspaceSourceListStore } from '@/shared/workspace/workspaceSourceListStore';
import type { V1Instrument } from '@/features/market-data-foundation';
import {
  addWatchlistItem,
  createWatchlist,
  deleteWatchlist,
  removeWatchlistItem,
  updateWatchlistItem,
} from '../api/watchlistManagementService';
import { useWatchlistManagement } from '../hooks';
import type { WatchlistDashboardItem, WatchlistSortOption } from '../types';
import { useMarketScope } from '@/contexts/MarketScopeContext';
import { CreateAlertDialog } from '@/features/alerts-monitoring';

const money = (value: number | null, currency: string | null, regionCurrency: string) => {
  if (value === null) return 'N/A';
  const resolvedCurrency = currency || regionCurrency;
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: resolvedCurrency, maximumFractionDigits: 2 }).format(value);
  } catch {
    return `${resolvedCurrency} ${value.toFixed(2)}`.trim();
  }
};

const percent = (value: number | null) => value === null ? 'N/A' : `${value >= 0 ? '+' : ''}${(value * 100).toFixed(1)}%`;

const confidenceColor = (confidence: 'LOW' | 'MEDIUM' | 'HIGH') => {
  if (confidence === 'HIGH') return 'success' as const;
  if (confidence === 'MEDIUM') return 'warning' as const;
  return 'default' as const;
};

const WatchlistManagementPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { scope } = useMarketScope();
  const regionCurrency = scope.region === 'IN' ? 'INR' : 'USD';
  const [sort, setSort] = useState<WatchlistSortOption>('recentlyAdded');
  const { watchlists, detail, loading, error, reload } = useWatchlistManagement(id, sort);
  const setSource = useWorkspaceSourceListStore((s) => s.setSource);
  const [formError, setFormError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedInstrument, setSelectedInstrument] = useState<V1Instrument | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [tagDrafts, setTagDrafts] = useState<Record<string, string>>({});
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [alertDialogDefaults, setAlertDialogDefaults] = useState<{ scope: 'STOCK'; type: 'PRICE_ABOVE'; instrumentId: string } | undefined>(undefined);

  const submitWatchlist = async () => {
    setFormError(null);
    try {
      const watchlist = await createWatchlist({ name, description: description || null });
      setName('');
      setDescription('');
      await reload();
      navigate(`/watchlists/${watchlist.id}`);
    } catch (err: any) {
      setFormError(err.response?.data?.error || err.message || 'Failed to create watchlist');
    }
  };

  const submitItem = async () => {
    if (!id || !selectedInstrument) return;
    setFormError(null);
    try {
      await addWatchlistItem(id, { instrumentId: selectedInstrument.id });
      setSelectedInstrument(null);
      await reload();
    } catch (err: any) {
      setFormError(err.response?.data?.error || err.message || 'Failed to add stock');
    }
  };

  const saveItem = async (item: WatchlistDashboardItem) => {
    if (!id) return;
    try {
      await updateWatchlistItem(id, item.id, {
        notes: noteDrafts[item.id] ?? item.notes,
        tags: (tagDrafts[item.id] ?? item.tags.join(',')).split(',').map((tag) => tag.trim()).filter(Boolean),
      });
      await reload();
    } catch (err: any) {
      setSnackbar(err.response?.data?.error || err.message || 'Failed to save notes/tags');
    }
  };

  const handleRemoveItem = async (watchlistId: string, itemId: string) => {
    try {
      await removeWatchlistItem(watchlistId, itemId);
      await reload();
    } catch (err: any) {
      setSnackbar(err.response?.data?.error || err.message || 'Failed to remove item');
    }
  };

  const handleDeleteWatchlist = async () => {
    if (!detail) return;
    setDeleteConfirmOpen(false);
    try {
      await deleteWatchlist(detail.watchlist.id);
      navigate('/watchlists');
      await reload();
    } catch (err: any) {
      setSnackbar(err.response?.data?.error || err.message || 'Failed to delete watchlist');
    }
  };

  const openSetPriceAlert = (item: WatchlistDashboardItem) => {
    setAlertDialogDefaults({ scope: 'STOCK', type: 'PRICE_ABOVE', instrumentId: item.instrumentId });
    setAlertDialogOpen(true);
  };

  const itemColumns: DataTableColumn<WatchlistDashboardItem>[] = [
    { id: 'symbol', label: 'Symbol', render: (item) => (
      <Button
        component={Link}
        to={`/stocks/${item.instrumentId}`}
        size="small"
        onClick={() => setSource(
          `Watchlist: ${detail?.watchlist.name ?? ''}`,
          (detail?.items ?? []).map((i) => ({ instrumentId: i.instrumentId, symbol: i.symbol, companyName: i.companyName })),
        )}
      >
        {item.symbol}
      </Button>
    ) },
    { id: 'companyName', label: 'Company', render: (item) => item.companyName || 'Unknown company' },
    { id: 'sector', label: 'Sector', render: (item) => item.sector || 'N/A' },
    { id: 'country', label: 'Country', render: (item) => item.country || 'N/A' },
    { id: 'currentPrice', label: 'Price', align: 'right', render: (item) => money(item.currentPrice, item.currency, regionCurrency) },
    { id: 'dailyChange', label: 'Daily', align: 'right', render: (item) => <Typography color={item.dailyChangePercent === null ? 'text.secondary' : item.dailyChangePercent >= 0 ? 'success.main' : 'error.main'}>{percent(item.dailyChangePercent)}</Typography> },
    {
      id: 'signal',
      label: 'Signal',
      render: (item) => item.latestSignal ? (
        <Stack spacing={0.5}>
          <SignalBadge
            direction={item.latestSignal.direction}
            label={`${item.latestSignal.direction} ${item.latestSignal.score} · ${item.latestSignal.confidence}`}
          />
          <Chip
            size="small"
            label={item.latestSignal.confidence}
            color={confidenceColor(item.latestSignal.confidence)}
            variant="outlined"
            sx={{ alignSelf: 'flex-start' }}
          />
          <Typography variant="caption" color="text.secondary">
            {new Date(item.latestSignal.generatedAt).toLocaleDateString()}
          </Typography>
        </Stack>
      ) : <StatusBadge label="No signal" />,
    },
    {
      id: 'notes',
      label: 'Notes / Tags',
      render: (item) => (
        <Stack spacing={1}>
          <TextField label="Notes" value={noteDrafts[item.id] ?? item.notes ?? ''} onChange={(event) => setNoteDrafts({ ...noteDrafts, [item.id]: event.target.value })} size="small" fullWidth />
          <TextField label="Tags" value={tagDrafts[item.id] ?? item.tags.join(', ')} onChange={(event) => setTagDrafts({ ...tagDrafts, [item.id]: event.target.value })} size="small" />
        </Stack>
      ),
    },
    {
      id: 'actions',
      label: 'Actions',
      render: (item) => (
        <Stack direction="row" spacing={0.5} onClick={(event) => event.stopPropagation()}>
          <Tooltip title="Save Notes/Tags" arrow>
            <IconButton size="small" onClick={() => void saveItem(item)}>
              <SaveOutlined fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Set Price Alert" arrow>
            <IconButton size="small" color="primary" onClick={() => openSetPriceAlert(item)}>
              <NotificationsOutlined fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Remove from Watchlist" arrow>
            <IconButton size="small" color="error" onClick={async () => {
              if (!id) return;
              await handleRemoveItem(id, item.id);
            }}>
              <DeleteOutline fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ];

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: 3, maxWidth: 1500, mx: 'auto' }}>
      <PageHeader
        title="Watchlists"
        subtitle="Track stocks you are interested in before they become portfolio holdings."
        badges={<Chip label={`Scope: ${scope.region}`} color="info" variant="outlined" size="small" />}
      />
      {(error || formError) && <Alert severity="error" sx={{ mb: 2 }}>{error || formError}</Alert>}

      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="flex-start">
          <Box sx={{ flex: 1, width: '100%' }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Select Watchlist</Typography>
            <Autocomplete
              options={watchlists}
              value={watchlists.find(w => w.id === id) || null}
              onChange={(_event, value) => {
                if (value) navigate(`/watchlists/${value.id}`);
                else navigate('/watchlists');
              }}
              getOptionLabel={(option) => option.name}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderInput={(params) => <TextField {...params} label="Search watchlists..." size="small" />}
            />
          </Box>
          <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', md: 'block' } }} />
          <Box sx={{ flex: 1, width: '100%' }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Create New</Typography>
            <Stack direction="row" spacing={1}>
              <TextField label="Name" value={name} onChange={(event) => setName(event.target.value)} size="small" sx={{ flex: 1 }} />
              <TextField label="Description" value={description} onChange={(event) => setDescription(event.target.value)} size="small" sx={{ flex: 1 }} />
              <Button variant="contained" onClick={submitWatchlist} disabled={!name}>Create</Button>
            </Stack>
          </Box>
        </Stack>
      </Paper>

      {!id || !detail ? (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6">Select a watchlist</Typography>
          <Typography color="text.secondary">Choose or create a watchlist to view tracked stocks.</Typography>
        </Paper>
      ) : (
        <Stack spacing={2}>
          <Paper sx={{ p: 2 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
              <Box>
                <Typography variant="h5">{detail.watchlist.name}</Typography>
                <Typography color="text.secondary">{detail.watchlist.description || 'No description'}</Typography>
              </Box>
              <Button color="error" variant="outlined" onClick={() => setDeleteConfirmOpen(true)}>
                Delete Watchlist
              </Button>
            </Stack>
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
              <Box sx={{ flex: 1 }}>
                <InstrumentSearchSelect value={selectedInstrument} onChange={setSelectedInstrument} />
              </Box>
              <TextField select label="Sort" value={sort} onChange={(event) => { setSort(event.target.value as WatchlistSortOption); setPage(0); }} size="small" sx={{ minWidth: 190 }}>
                <MenuItem value="recentlyAdded">Recently Added</MenuItem>
                <MenuItem value="signalScoreDesc">Signal Score</MenuItem>
                <MenuItem value="dailyChangeDesc">Daily Change High</MenuItem>
                <MenuItem value="dailyChangeAsc">Daily Change Low</MenuItem>
                <MenuItem value="symbolAsc">Symbol</MenuItem>
              </TextField>
              <Button variant="contained" onClick={submitItem} disabled={!selectedInstrument}>Add Stock</Button>
            </Stack>
          </Paper>

          <DataTable
            columns={itemColumns}
            rows={(detail.items || []).slice(page * pageSize, page * pageSize + pageSize)}
            getRowId={(item) => item.id}
            page={page}
            pageSize={pageSize}
            totalCount={detail.items.length}
            emptyMessage="This watchlist has no stocks yet."
            onPageChange={setPage}
            onPageSizeChange={(nextPageSize) => { setPageSize(nextPageSize); setPage(0); }}
          />
        </Stack>
      )}

      {/* Delete watchlist confirmation */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Delete Watchlist</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete &ldquo;{detail?.watchlist.name}&rdquo;? This will remove all tracked stocks from this watchlist. This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={() => void handleDeleteWatchlist()}>Delete</Button>
        </DialogActions>
      </Dialog>

      {/* Set Price Alert dialog */}
      <CreateAlertDialog
        open={alertDialogOpen}
        onClose={() => setAlertDialogOpen(false)}
        onCreated={reload}
        defaults={alertDialogDefaults}
      />

      {/* Error snackbar for silent failures */}
      <Snackbar
        open={!!snackbar}
        autoHideDuration={5000}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setSnackbar(null)}>{snackbar}</Alert>
      </Snackbar>
    </Box>
  );
};

export default WatchlistManagementPage;
