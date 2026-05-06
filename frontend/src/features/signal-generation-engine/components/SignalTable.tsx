import React from 'react';
import { Alert, Box, Button, Chip, IconButton, Snackbar, Tooltip, Typography } from '@mui/material';
import { 
  InfoOutlined, 
  WarningAmberOutlined, 
  VisibilityOutlined, 
  PlaylistAddOutlined, 
  AccountBalanceWalletOutlined, 
  NotificationsNoneOutlined,
  AccountTreeOutlined,
  FactCheckOutlined,
  InsightsOutlined,
} from '@mui/icons-material';
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

const SignalReasons = ({ signal }: { signal: SignalResult }) => {
  const triggered = signal.triggered_signals.map(s => s.label);
  const negative = signal.negative_signals.map(s => s.label);
  const warnings = signal.warnings || [];

  return (
    <Box sx={{ p: 1 }}>
      {warnings.length > 0 && (
        <Box sx={{ mb: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'orange' }}>Warnings:</Typography>
          {warnings.map((w, i) => <Typography key={i} variant="caption" display="block">• {w}</Typography>)}
        </Box>
      )}
      {triggered.length > 0 && (
        <Box sx={{ mb: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#4caf50' }}>Bullish Factors:</Typography>
          {triggered.map((s, i) => <Typography key={i} variant="caption" display="block">• {s}</Typography>)}
        </Box>
      )}
      {negative.length > 0 && (
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#f44336' }}>Bearish Factors:</Typography>
          {negative.map((s, i) => <Typography key={i} variant="caption" display="block">• {s}</Typography>)}
        </Box>
      )}
    </Box>
  );
};

const reasonSummary = (signal: SignalResult) => {
  const primary = signal.direction === 'BEARISH' ? signal.negative_signals : signal.triggered_signals;
  const secondary = signal.direction === 'BEARISH' ? signal.triggered_signals : signal.negative_signals;
  
  const top = primary.length > 0 ? primary : secondary;
  return top.slice(0, 2).map((reason) => reason.label).join('; ') || 'Insufficient data';
};

const StrategyMatchDetails = ({ signal }: { signal: SignalResult }) => (
  <Box sx={{ p: 1, maxWidth: 420 }}>
    {(signal.strategyMatches || []).map((match) => (
      <Box key={`${match.strategyCode}-${match.strategyVersion}`} sx={{ mb: 1 }}>
        <Typography variant="subtitle2" fontWeight={700}>{match.strategyName || match.strategyCode} v{match.strategyVersion}</Typography>
        <Typography variant="caption" display="block">Score {match.score} · {match.confidence} · {match.ratingGrade || 'UNPROVEN'} · {match.readinessLabel || 'RESEARCH_ONLY'}</Typography>
        {match.reasons.slice(0, 3).map((reason, index) => <Typography key={index} variant="caption" display="block">- {reason}</Typography>)}
      </Box>
    ))}
    {(signal.strategyMatches || []).length === 0 && <Typography variant="caption">No registered strategy match for this raw signal.</Typography>}
  </Box>
);

const BlockedStrategyDetails = ({ signal }: { signal: SignalResult }) => (
  <Box sx={{ p: 1, maxWidth: 420 }}>
    {(signal.blockedStrategies || []).map((blocked) => (
      <Box key={`${blocked.strategyCode}-${blocked.strategyVersion}`} sx={{ mb: 1 }}>
        <Typography variant="subtitle2" fontWeight={700}>{blocked.strategyName || blocked.strategyCode} v{blocked.strategyVersion}</Typography>
        <Typography variant="caption" display="block">{blocked.reason}</Typography>
        {[...blocked.blockers, ...blocked.dataGaps, ...blocked.warnings].slice(0, 4).map((item, index) => <Typography key={index} variant="caption" display="block">- {item}</Typography>)}
      </Box>
    ))}
    {(signal.blockedStrategies || []).length === 0 && <Typography variant="caption">No blocked Strategy Framework matches.</Typography>}
  </Box>
);

type SignalTableProps = {
  signals: SignalResult[];
  totalCount?: number;
  loading?: boolean;
  page: number;
  pageSize: number;
  sortBy: string;
  sortDirection: SortDirection;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onSortChange: (sortBy: string, direction: SortDirection) => void;
};

export function SignalTable({ signals, totalCount, loading, page, pageSize, sortBy, sortDirection, onPageChange, onPageSizeChange, onSortChange }: SignalTableProps) {
  const navigate = useNavigate();
  const [portfolioSignal, setPortfolioSignal] = React.useState<SignalResult | null>(null);
  const [watchlistSignal, setWatchlistSignal] = React.useState<SignalResult | null>(null);
  const [alertSignal, setAlertSignal] = React.useState<SignalResult | null>(null);
  const [successPortfolioId, setSuccessPortfolioId] = React.useState<string | null>(null);
  const [successWatchlistId, setSuccessWatchlistId] = React.useState<string | null>(null);

  const columns: DataTableColumn<SignalResult>[] = [
    { id: 'symbol', label: 'Symbol', sortable: true, render: (signal) => <Button size="small" onClick={(event) => { event.stopPropagation(); navigate(`/stocks/${signal.instrument_id}`); }}>{signal.symbol}</Button> },
    { id: 'company', label: 'Company', render: (signal) => signal.company_name || 'N/A' },
    { id: 'score', label: 'Raw Score', sortable: true, align: 'right', render: (signal) => signal.score },
    { id: 'direction', label: 'Raw Direction', sortable: true, render: (signal) => <StatusBadge label={signal.direction} /> },
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
    { 
      id: 'reasons', 
      label: 'Top Reason', 
      render: (signal) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" sx={{ maxWidth: 300, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {reasonSummary(signal)}
          </Typography>
          <Tooltip title={<SignalReasons signal={signal} />} arrow>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {signal.warnings && signal.warnings.length > 0 ? (
                <WarningAmberOutlined sx={{ fontSize: 18, color: 'warning.main', cursor: 'help' }} />
              ) : (
                <InfoOutlined sx={{ fontSize: 18, color: 'text.secondary', cursor: 'help' }} />
              )}
            </Box>
          </Tooltip>
        </Box>
      ) 
    },
    {
      id: 'strategyMatches',
      label: 'Strategy Matches',
      render: (signal) => {
        const matches = signal.strategyMatches || [];
        return (
          <Tooltip title={<StrategyMatchDetails signal={signal} />} arrow>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', maxWidth: 220 }}>
              {matches.length > 0 ? matches.slice(0, 2).map((match) => (
                <Chip key={match.strategyCode} size="small" color="success" variant="outlined" label={match.strategyCode} />
              )) : <Chip size="small" variant="outlined" label="No match" />}
              {matches.length > 2 && <Chip size="small" label={`+${matches.length - 2}`} />}
            </Box>
          </Tooltip>
        );
      },
    },
    {
      id: 'blockedStrategies',
      label: 'Blocked Strategies',
      render: (signal) => {
        const blocked = signal.blockedStrategies || [];
        return (
          <Tooltip title={<BlockedStrategyDetails signal={signal} />} arrow>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', maxWidth: 180 }}>
              {blocked.length > 0 ? (
                <Chip size="small" color="warning" variant="outlined" label={`${blocked.length} blocked`} />
              ) : (
                <Chip size="small" variant="outlined" label="None" />
              )}
            </Box>
          </Tooltip>
        );
      },
    },
    { id: 'generatedAt', label: 'Generated', sortable: true, render: (signal) => new Date(signal.generated_at).toLocaleString() },
    {
      id: 'actions',
      label: 'Actions',
      render: (signal) => (
        <Box sx={{ display: 'flex', gap: 0.5 }} onClick={(event) => event.stopPropagation()}>
          <Tooltip title="View Stock Details" arrow>
            <IconButton size="small" onClick={() => navigate(`/stocks/${signal.instrument_id}`)}>
              <VisibilityOutlined fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="View Strategy Decision" arrow>
            <IconButton size="small" onClick={() => navigate(`/strategy?instrumentId=${signal.instrument_id}`)}>
              <FactCheckOutlined fontSize="small" />
            </IconButton>
          </Tooltip>
          {signal.strategyMatches?.[0] && (
            <>
              <Tooltip title="View Strategy" arrow>
                <IconButton size="small" onClick={() => navigate(`/strategies?strategyCode=${signal.strategyMatches?.[0]?.strategyCode}`)}>
                  <AccountTreeOutlined fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="View Backtest" arrow>
                <IconButton size="small" onClick={() => navigate(`/backtests?mode=registered&strategyCode=${signal.strategyMatches?.[0]?.strategyCode}&timeframe=3Y`)}>
                  <InsightsOutlined fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          )}
          <Tooltip title="Add to Watchlist" arrow>
            <IconButton size="small" onClick={() => setWatchlistSignal(signal)}>
              <PlaylistAddOutlined fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Add to Portfolio" arrow>
            <IconButton size="small" onClick={() => setPortfolioSignal(signal)}>
              <AccountBalanceWalletOutlined fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Create Alert" arrow>
            <IconButton size="small" onClick={() => setAlertSignal(signal)}>
              <NotificationsNoneOutlined fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        rows={signals}
        getRowId={(signal) => signal.id || `${signal.instrument_id}-${signal.generated_at}`}
        loading={loading}
        emptyMessage="No signals match this view."
        page={page}
        pageSize={pageSize}
        totalCount={totalCount ?? signals.length}
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
