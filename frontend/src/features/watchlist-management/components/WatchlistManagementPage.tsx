import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { SignalBadge } from '@/features/signal-generation-engine';
import { DataTable, InstrumentSearchSelect, StatusBadge, type DataTableColumn } from '@/shared/components';
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

const money = (value: number | null, currency: string | null) => {
  if (value === null) return 'N/A';
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'USD', maximumFractionDigits: 2 }).format(value);
  } catch {
    return `${currency || ''} ${value.toFixed(2)}`.trim();
  }
};

const percent = (value: number | null) => value === null ? 'N/A' : `${value >= 0 ? '+' : ''}${(value * 100).toFixed(1)}%`;

const WatchlistManagementPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sort, setSort] = useState<WatchlistSortOption>('recentlyAdded');
  const { watchlists, detail, loading, error, reload } = useWatchlistManagement(id, sort);
  const [formError, setFormError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedInstrument, setSelectedInstrument] = useState<V1Instrument | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [tagDrafts, setTagDrafts] = useState<Record<string, string>>({});
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);

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
    await updateWatchlistItem(id, item.id, {
      notes: noteDrafts[item.id] ?? item.notes,
      tags: (tagDrafts[item.id] ?? item.tags.join(',')).split(',').map((tag) => tag.trim()).filter(Boolean),
    });
    await reload();
  };

  const itemColumns: DataTableColumn<WatchlistDashboardItem>[] = [
    { id: 'symbol', label: 'Symbol', render: (item) => <Button component={Link} to={item.researchUrl} size="small">{item.symbol}</Button> },
    { id: 'companyName', label: 'Company', render: (item) => item.companyName || 'Unknown company' },
    { id: 'sector', label: 'Sector', render: (item) => item.sector || 'N/A' },
    { id: 'country', label: 'Country', render: (item) => item.country || 'N/A' },
    { id: 'currentPrice', label: 'Price', align: 'right', render: (item) => money(item.currentPrice, item.currency) },
    { id: 'dailyChange', label: 'Daily', align: 'right', render: (item) => <Typography color={item.dailyChangePercent === null ? 'text.secondary' : item.dailyChangePercent >= 0 ? 'success.main' : 'error.main'}>{percent(item.dailyChangePercent)}</Typography> },
    {
      id: 'signal',
      label: 'Signal',
      render: (item) => item.latestSignal ? <SignalBadge direction={item.latestSignal.direction} label={`${item.latestSignal.direction} ${item.latestSignal.score}`} /> : <StatusBadge label="No signal" />,
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
        <Stack direction="row" spacing={1} onClick={(event) => event.stopPropagation()}>
          <Button onClick={() => void saveItem(item)}>Save</Button>
          <Button color="error" onClick={async () => {
            if (!id) return;
            await removeWatchlistItem(id, item.id);
            await reload();
          }}>Remove</Button>
        </Stack>
      ),
    },
  ];

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: 3, maxWidth: 1500, mx: 'auto' }}>
      <Typography variant="h4">Watchlists</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>Track stocks you are interested in before they become portfolio holdings.</Typography>
      {(error || formError) && <Alert severity="error" sx={{ mb: 2 }}>{error || formError}</Alert>}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '320px 1fr' }, gap: 3 }}>
        <Stack spacing={2}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Your Watchlists</Typography>
            {watchlists.length === 0 ? (
              <Typography color="text.secondary">No watchlists yet. Create one to start tracking ideas.</Typography>
            ) : (
              <Stack spacing={1}>
                {watchlists.map((watchlist) => (
                  <Button key={watchlist.id} component={Link} to={`/watchlists/${watchlist.id}`} variant={watchlist.id === id ? 'contained' : 'outlined'}>{watchlist.name}</Button>
                ))}
              </Stack>
            )}
          </Paper>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Create Watchlist</Typography>
            <Stack spacing={1.5}>
              <TextField label="Name" value={name} onChange={(event) => setName(event.target.value)} size="small" />
              <TextField label="Description" value={description} onChange={(event) => setDescription(event.target.value)} size="small" multiline minRows={2} />
              <Button variant="contained" onClick={submitWatchlist}>Create</Button>
            </Stack>
          </Paper>
        </Stack>

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
                <Button color="error" variant="outlined" onClick={async () => {
                  await deleteWatchlist(detail.watchlist.id);
                  navigate('/watchlists');
                  await reload();
                }}>Delete Watchlist</Button>
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
      </Box>
    </Box>
  );
};

export default WatchlistManagementPage;
