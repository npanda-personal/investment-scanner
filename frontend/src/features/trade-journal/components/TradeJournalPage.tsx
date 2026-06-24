import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import { PageHeader, SortableTableCell } from '@/shared/components';
import { useTradeJournal } from '../hooks';
import {
  createTradeJournalEntry,
  deleteTradeJournalEntry,
  updateTradeJournalEntry,
} from '../api/tradeJournalService';
import type {
  CreateTradeJournalInput,
  OutcomeStatus,
  TradeDecision,
  TradeJournalEntry,
  TradeJournalListFilters,
  UpdateTradeJournalInput,
} from '../types';
import TradeEntryDialog from './TradeEntryDialog';
import PostMortemCard from './PostMortemCard';

const decisionColor = (d: TradeDecision): 'primary' | 'default' | 'warning' => {
  if (d === 'ACTED') return 'primary';
  if (d === 'WATCHING') return 'warning';
  return 'default';
};

const outcomeColor = (s: OutcomeStatus | null): 'success' | 'error' | 'warning' | 'default' => {
  if (s === 'CLOSED') return 'success';
  if (s === 'INVALIDATED') return 'error';
  if (s === 'OPEN') return 'warning';
  return 'default';
};

const directionLabel = (d: string) => (d === 'LONG' ? 'Long' : 'Short');

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return iso.slice(0, 10);
  }
};

const formatReturn = (pct: number | null) => {
  if (pct == null) return '—';
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(2)}%`;
};

type TradeSortKey = 'reviewedAt' | 'symbol' | 'direction' | 'decision' | 'entryPrice' | 'conviction' | 'outcomeStatus' | 'realizedReturnPct';

export default function TradeJournalPage() {
  const [filters, setFilters] = useState<TradeJournalListFilters>({ page: 1, pageSize: 25 });
  const { entries, total, postMortem, loading, error, reload } = useTradeJournal(filters);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<TradeJournalEntry | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Sorting is server-driven so it orders the full result set, not just the
  // current page. Clicking the active column flips direction; a new column
  // defaults to descending, mirroring the app's other sortable tables.
  const sortKey: TradeSortKey | null = (filters.sortBy as TradeSortKey | undefined) ?? null;
  const sortDirection = filters.sortDirection ?? 'desc';
  const handleSort = (key: TradeSortKey) => {
    setFilters((prev) => ({
      ...prev,
      sortBy: key,
      sortDirection: prev.sortBy === key && prev.sortDirection === 'desc' ? 'asc' : 'desc',
      page: 1,
    }));
  };

  const updateFilter = (key: keyof TradeJournalListFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value || undefined, page: key === 'page' ? value : 1 }));
  };

  const handleCreate = () => {
    setEditEntry(null);
    setDialogOpen(true);
  };

  const handleEdit = (entry: TradeJournalEntry) => {
    setEditEntry(entry);
    setDialogOpen(true);
  };

  const handleSave = async (input: CreateTradeJournalInput | UpdateTradeJournalInput, id?: string) => {
    if (id) {
      await updateTradeJournalEntry(id, input as UpdateTradeJournalInput);
    } else {
      await createTradeJournalEntry(input as CreateTradeJournalInput);
    }
    reload();
  };

  const handleDelete = async (entry: TradeJournalEntry) => {
    if (!window.confirm(`Delete entry for ${entry.symbol}?`)) return;
    setActionError(null);
    try {
      await deleteTradeJournalEntry(entry.id);
      reload();
    } catch (err: any) {
      setActionError(err.response?.data?.error || err.message || 'Failed to delete');
    }
  };

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
      <PageHeader
        title="Trade Journal"
        subtitle="Log trade decisions, track outcomes, and review your decision quality over time"
        primaryAction={
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate} size="small">
            New Entry
          </Button>
        }
        secondaryActions={
          <Tooltip title="Refresh">
            <IconButton onClick={reload} size="small"><RefreshIcon /></IconButton>
          </Tooltip>
        }
      />

      {postMortem && postMortem.totalEntries > 0 && <PostMortemCard data={postMortem} />}

      {actionError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError(null)}>{actionError}</Alert>}

      <Paper variant="outlined" sx={{ mb: 2, p: 1.5 }}>
        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap alignItems="center" sx={{ rowGap: 1 }}>
          <TextField select label="Decision" value={filters.decision ?? ''} onChange={(e) => updateFilter('decision', e.target.value)} size="small" sx={{ minWidth: 130 }}>
            <MenuItem value="">All</MenuItem>
            <MenuItem value="ACTED">Acted</MenuItem>
            <MenuItem value="SKIPPED">Skipped</MenuItem>
            <MenuItem value="WATCHING">Watching</MenuItem>
          </TextField>
          <TextField select label="Outcome" value={filters.outcomeStatus ?? ''} onChange={(e) => updateFilter('outcomeStatus', e.target.value)} size="small" sx={{ minWidth: 130 }}>
            <MenuItem value="">All</MenuItem>
            <MenuItem value="OPEN">Open</MenuItem>
            <MenuItem value="CLOSED">Closed</MenuItem>
            <MenuItem value="INVALIDATED">Invalidated</MenuItem>
          </TextField>
          <TextField label="Symbol" value={filters.symbol ?? ''} onChange={(e) => updateFilter('symbol', e.target.value)} size="small" sx={{ maxWidth: 140 }} placeholder="e.g. RELIANCE" />
          <TextField label="From" type="date" value={filters.fromDate ?? ''} onChange={(e) => updateFilter('fromDate', e.target.value)} size="small" slotProps={{ inputLabel: { shrink: true } }} sx={{ minWidth: 150 }} />
          <TextField label="To" type="date" value={filters.toDate ?? ''} onChange={(e) => updateFilter('toDate', e.target.value)} size="small" slotProps={{ inputLabel: { shrink: true } }} sx={{ minWidth: 150 }} />
        </Stack>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : entries.length === 0 ? (
        <Paper variant="outlined" sx={{ py: 8, textAlign: 'center' }}>
          <MenuBookIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography variant="h6" color="text.secondary">No journal entries yet</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Start logging your trade decisions to build a track record
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate}>Add First Entry</Button>
        </Paper>
      ) : (
        <>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <SortableTableCell label="Date" columnKey="reviewedAt" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
                  <SortableTableCell label="Symbol" columnKey="symbol" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
                  <SortableTableCell label="Direction" columnKey="direction" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
                  <SortableTableCell label="Decision" columnKey="decision" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
                  <SortableTableCell label="Entry" columnKey="entryPrice" activeKey={sortKey} direction={sortDirection} onSort={handleSort} align="right" />
                  <SortableTableCell label="Conviction" columnKey="conviction" activeKey={sortKey} direction={sortDirection} onSort={handleSort} align="center" />
                  <SortableTableCell label="Outcome" columnKey="outcomeStatus" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
                  <SortableTableCell label="Return" columnKey="realizedReturnPct" activeKey={sortKey} direction={sortDirection} onSort={handleSort} align="right" />
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id} hover sx={{ cursor: 'pointer' }} onClick={() => handleEdit(entry)}>
                    <TableCell>{formatDate(entry.reviewedAt)}</TableCell>
                    <TableCell><Typography variant="body2" fontWeight={600}>{entry.symbol}</Typography></TableCell>
                    <TableCell>
                      <Chip label={directionLabel(entry.direction)} size="small" color={entry.direction === 'LONG' ? 'success' : 'error'} variant="outlined" />
                    </TableCell>
                    <TableCell><Chip label={entry.decision} size="small" color={decisionColor(entry.decision)} /></TableCell>
                    <TableCell align="right">{entry.entryPrice != null ? entry.entryPrice.toLocaleString() : '—'}</TableCell>
                    <TableCell align="center">{entry.conviction ?? '—'}</TableCell>
                    <TableCell>
                      {entry.outcomeStatus ? (
                        <Chip label={entry.outcomeStatus} size="small" color={outcomeColor(entry.outcomeStatus)} variant="outlined" />
                      ) : (
                        <Typography variant="body2" color="text.disabled">—</Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color={entry.realizedReturnPct != null ? (entry.realizedReturnPct >= 0 ? 'success.main' : 'error.main') : 'text.disabled'}>
                        {formatReturn(entry.realizedReturnPct)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                      <IconButton size="small" onClick={() => handleEdit(entry)}><EditOutlinedIcon fontSize="small" /></IconButton>
                      <IconButton size="small" onClick={() => handleDelete(entry)} color="error"><DeleteOutlineIcon fontSize="small" /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={total}
            page={(filters.page ?? 1) - 1}
            rowsPerPage={filters.pageSize ?? 25}
            onPageChange={(_, newPage) => updateFilter('page', newPage + 1)}
            onRowsPerPageChange={(e) => {
              setFilters((prev) => ({ ...prev, pageSize: parseInt(e.target.value, 10), page: 1 }));
            }}
            rowsPerPageOptions={[10, 25, 50, 100]}
          />
        </>
      )}

      <TradeEntryDialog open={dialogOpen} entry={editEntry} onClose={() => setDialogOpen(false)} onSave={handleSave} />
    </Box>
  );
}
