import React from 'react';
import { Alert, Box, Button, Snackbar, Typography } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { AddSignalToPortfolioDialog } from './AddSignalToPortfolioDialog';
import { AddToWatchlistDialog } from '@/features/watchlist-management';
import { CreateAlertDialog } from '@/features/alerts-monitoring';
import { DataTable, StatusBadge, type DataTableColumn, type SortDirection } from '@/shared/components';
import type { SignalResult } from '../types';

const formatMoney = (value: number | null, currency: string | null) => {
  if (value === null) return 'N/A';
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'USD', maximumFractionDigits: 2 }).format(value);
  } catch {
    return `${currency || ''} ${value.toFixed(2)}`.trim();
  }
};
const formatPercent = (value: number | null) => value === null ? 'N/A' : `${value >= 0 ? '+' : ''}${(value * 100).toFixed(1)}%`;
const reasonText = (signal: SignalResult) => {
  const reasons = signal.triggered_signals.length > 0 ? signal.triggered_signals : signal.negative_signals;
  return reasons.slice(0, 3).map((reason) => reason.label).join('; ') || 'No reasons available';
};

type SignalTableProps = {
  signals: SignalResult[];
  loading?: boolean;
  page: number;
  pageSize: number;
  sortBy: string;
  sortDirection: SortDirection;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onSortChange: (sortBy: string, direction: SortDirection) => void;
};

export function SignalTable({ signals, loading, page, pageSize, sortBy, sortDirection, onPageChange, onPageSizeChange, onSortChange }: SignalTableProps) {
  const navigate = useNavigate();
  const [portfolioSignal, setPortfolioSignal] = React.useState<SignalResult | null>(null);
  const [watchlistSignal, setWatchlistSignal] = React.useState<SignalResult | null>(null);
  const [alertSignal, setAlertSignal] = React.useState<SignalResult | null>(null);
  const [successPortfolioId, setSuccessPortfolioId] = React.useState<string | null>(null);
  const [successWatchlistId, setSuccessWatchlistId] = React.useState<string | null>(null);

  const sorted = React.useMemo(() => {
    const getValue = (signal: SignalResult): string | number => {
      switch (sortBy) {
        case 'symbol': return signal.symbol;
        case 'score': return signal.score;
        case 'direction': return signal.direction;
        case 'confidence': return signal.confidence;
        case 'currentPrice': return signal.currentPrice ?? -Infinity;
        case 'dailyChangePercent': return signal.dailyChangePercent ?? -Infinity;
        case 'generatedAt': return new Date(signal.generated_at).getTime();
        default: return signal.score;
      }
    };
    return [...signals].sort((a, b) => {
      const left = getValue(a);
      const right = getValue(b);
      const result = typeof left === 'number' && typeof right === 'number'
        ? left - right
        : String(left).localeCompare(String(right));
      return sortDirection === 'asc' ? result : -result;
    });
  }, [signals, sortBy, sortDirection]);

  const paged = sorted.slice(page * pageSize, page * pageSize + pageSize);

  const columns: DataTableColumn<SignalResult>[] = [
    { id: 'symbol', label: 'Symbol', sortable: true, render: (signal) => <Button size="small" onClick={(event) => { event.stopPropagation(); navigate(`/stocks/${signal.instrument_id}`); }}>{signal.symbol}</Button> },
    { id: 'company', label: 'Company', render: (signal) => signal.company_name || 'N/A' },
    { id: 'score', label: 'Score', sortable: true, align: 'right', render: (signal) => signal.score },
    { id: 'direction', label: 'Direction', sortable: true, render: (signal) => <StatusBadge label={signal.direction} /> },
    { id: 'confidence', label: 'Confidence', sortable: true, render: (signal) => <StatusBadge label={signal.confidence} /> },
    { id: 'currentPrice', label: 'Price', sortable: true, align: 'right', render: (signal) => formatMoney(signal.currentPrice, signal.currency) },
    {
      id: 'dailyChangePercent',
      label: 'Daily',
      sortable: true,
      align: 'right',
      render: (signal) => (
        <Typography color={signal.dailyChangePercent === null ? 'text.secondary' : signal.dailyChangePercent >= 0 ? 'success.main' : 'error.main'} variant="body2">
          {formatPercent(signal.dailyChangePercent)}
        </Typography>
      ),
    },
    { id: 'reasons', label: 'Top Reasons', render: (signal) => <Typography variant="body2" sx={{ maxWidth: 360 }}>{reasonText(signal)}</Typography> },
    { id: 'generatedAt', label: 'Generated', sortable: true, render: (signal) => new Date(signal.generated_at).toLocaleString() },
    {
      id: 'actions',
      label: 'Actions',
      render: (signal) => (
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }} onClick={(event) => event.stopPropagation()}>
          <Button size="small" onClick={() => navigate(`/stocks/${signal.instrument_id}`)}>View</Button>
          <Button size="small" onClick={() => setWatchlistSignal(signal)}>Watchlist</Button>
          <Button size="small" onClick={() => setPortfolioSignal(signal)}>Portfolio</Button>
          <Button size="small" onClick={() => setAlertSignal(signal)}>Alert</Button>
        </Box>
      ),
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        rows={paged}
        getRowId={(signal) => signal.id || `${signal.instrument_id}-${signal.generated_at}`}
        loading={loading}
        emptyMessage="No signals match this view."
        page={page}
        pageSize={pageSize}
        totalCount={sorted.length}
        sortBy={sortBy}
        sortDirection={sortDirection}
        onSortChange={onSortChange}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        onRowClick={(signal) => navigate(`/stocks/${signal.instrument_id}`)}
      />
      {portfolioSignal && (
        <AddSignalToPortfolioDialog open signal={portfolioSignal} onClose={() => setPortfolioSignal(null)} onAdded={(portfolioId) => setSuccessPortfolioId(portfolioId)} />
      )}
      {watchlistSignal && (
        <AddToWatchlistDialog open instrumentId={watchlistSignal.instrument_id} symbol={watchlistSignal.symbol} companyName={watchlistSignal.company_name} onClose={() => setWatchlistSignal(null)} onAdded={(watchlistId) => setSuccessWatchlistId(watchlistId)} />
      )}
      {alertSignal && (
        <CreateAlertDialog
          open
          onClose={() => setAlertSignal(null)}
          defaults={{
            name: `${alertSignal.symbol} signal score above ${alertSignal.score}`,
            type: 'SIGNAL_SCORE_ABOVE',
            scope: 'STOCK',
            instrumentId: alertSignal.instrument_id,
            condition: { threshold: alertSignal.score },
          }}
        />
      )}
      <Snackbar open={Boolean(successPortfolioId)} autoHideDuration={5000} onClose={() => setSuccessPortfolioId(null)}>
        <Alert severity="success" variant="filled" onClose={() => setSuccessPortfolioId(null)}>
          Added to portfolio. <Button color="inherit" component={Link} to={successPortfolioId ? `/portfolios/${successPortfolioId}` : '/portfolios'} size="small">Open</Button>
        </Alert>
      </Snackbar>
      <Snackbar open={Boolean(successWatchlistId)} autoHideDuration={5000} onClose={() => setSuccessWatchlistId(null)}>
        <Alert severity="success" variant="filled" onClose={() => setSuccessWatchlistId(null)}>
          Added to watchlist. <Button color="inherit" component={Link} to={successWatchlistId ? `/watchlists/${successWatchlistId}` : '/watchlists'} size="small">Open</Button>
        </Alert>
      </Snackbar>
    </>
  );
}
