import React from 'react';
import { Alert, Box, Button, Chip, Divider, Drawer, IconButton, Snackbar, Stack, Tooltip, Typography } from '@mui/material';
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
const formatDate = (value?: string | null) => value ? new Date(value).toLocaleDateString() : 'N/A';

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
  strategyContextLoaded?: boolean;
  bannedSymbols?: Set<string>;
  emptyMessage?: string;
};

export function SignalTable({ signals, totalCount, loading, page, pageSize, sortBy, sortDirection, onPageChange, onPageSizeChange, onSortChange, strategyContextLoaded = false, bannedSymbols, emptyMessage }: SignalTableProps) {
  const navigate = useNavigate();
  const [selectedSignal, setSelectedSignal] = React.useState<SignalResult | null>(null);
  const [portfolioSignal, setPortfolioSignal] = React.useState<SignalResult | null>(null);
  const [watchlistSignal, setWatchlistSignal] = React.useState<SignalResult | null>(null);
  const [alertSignal, setAlertSignal] = React.useState<SignalResult | null>(null);
  const [successPortfolioId, setSuccessPortfolioId] = React.useState<string | null>(null);
  const [successWatchlistId, setSuccessWatchlistId] = React.useState<string | null>(null);

  const columns: DataTableColumn<SignalResult>[] = [
    {
      id: 'symbol',
      label: 'Symbol',
      sortable: true,
      render: (signal) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Button size="small" onClick={(event) => { event.stopPropagation(); navigate(`/research/stocks/${signal.instrument_id}`); }}>{signal.symbol}</Button>
          {bannedSymbols?.has(signal.symbol) && (
            <Tooltip title="In F&O ban period — derivatives trading restricted; elevated risk." arrow enterDelay={200}>
              <Chip
                label="F&O Ban"
                size="small"
                sx={{
                  bgcolor: 'warning.main',
                  color: 'warning.contrastText',
                  fontWeight: 700,
                  fontSize: 10,
                  height: 18,
                  '& .MuiChip-label': { px: 0.75 },
                }}
              />
            </Tooltip>
          )}
        </Box>
      ),
    },
    { id: 'company', label: 'Company', render: (signal) => signal.company_name || 'N/A' },
    { id: 'score', label: 'Raw Score', sortable: true, align: 'right', render: (signal) => signal.score },
    {
      id: 'calibratedScore',
      label: 'Calibrated',
      align: 'right',
      render: (signal) => {
        if (signal.calibratedScore != null && signal.calibrationStatus === 'CALIBRATED') {
          const tier = signal.reliabilityTier;
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'flex-end' }}>
              <Typography variant="body2">{signal.calibratedScore}</Typography>
              {tier ? (
                <Chip size="small" label={tier} color={tier === 'FULL' ? 'success' : 'warning'} variant="outlined" sx={{ height: 18, fontSize: 10 }} />
              ) : (
                <Tooltip title="Reliability tier is assigned once the signal has a sufficient track record of matured outcomes." arrow>
                  <Typography variant="body2" color="text.disabled" sx={{ cursor: 'help' }}>—</Typography>
                </Tooltip>
              )}
            </Box>
          );
        }
        return (
          <Tooltip title="Calibration pending — not enough matured outcomes yet for this signal." arrow>
            <Typography variant="body2" color="text.disabled" sx={{ cursor: 'help' }}>Pending</Typography>
          </Tooltip>
        );
      },
    },
    {
      id: 'rsPercentile',
      label: 'RS',
      sortable: true,
      align: 'right' as const,
      render: (signal: SignalResult) => {
        const pct = signal.rsPercentile;
        if (pct == null) {
          return (
            <Tooltip title="Relative-strength percentile unavailable" arrow>
              <Typography variant="body2" color="text.disabled" sx={{ cursor: 'help' }}>—</Typography>
            </Tooltip>
          );
        }
        const color = pct >= 70 ? 'success.main' : pct >= 40 ? 'text.primary' : 'error.main';
        return (
          <Tooltip title={`RS percentile ${pct} — stronger than ${pct}% of signals in this universe`} arrow>
            <Typography variant="body2" sx={{ color, fontWeight: pct >= 70 ? 600 : 400 }}>
              {pct}
            </Typography>
          </Tooltip>
        );
      },
    },
    { id: 'direction', label: 'Raw Direction', sortable: true, render: (signal) => <StatusBadge label={signal.direction} /> },
    { id: 'confidence', label: 'Confidence', sortable: true, render: (signal) => <StatusBadge label={signal.confidence} /> },
    {
      id: 'audit',
      label: 'Audit',
      render: (signal) => (
        <Tooltip title={`${signal.rulesetVersion || signal.modelVersion || 'legacy'} | source ${formatDate(signal.sourceDataDate)}`} arrow>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', maxWidth: 180 }}>
            <Chip size="small" variant="outlined" label={signal.modelVersion || 'legacy'} />
            <Chip size="small" variant="outlined" label={formatDate(signal.sourceDataDate)} color={signal.auditStatus === 'LEGACY_MISSING' ? 'warning' : 'default'} />
          </Box>
        </Tooltip>
      ),
    },
    { id: 'currentPrice', label: 'Price', align: 'right', render: (signal) => formatMoney(signal.currentPrice, signal.currency) },
    {
      id: 'dailyChangePercent',
      label: 'Daily',
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
              {!strategyContextLoaded ? <Typography variant="body2" color="text.secondary">Not loaded</Typography> : matches.length > 0 ? matches.slice(0, 2).map((match) => (
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
              {!strategyContextLoaded ? (
                <Typography variant="body2" color="text.secondary">Not loaded</Typography>
              ) : blocked.length > 0 ? (
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
            <IconButton size="small" onClick={() => navigate(`/research/stocks/${signal.instrument_id}`)}>
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
        emptyMessage={emptyMessage || 'No signals match this view.'}
        page={page}
        pageSize={pageSize}
        totalCount={totalCount ?? signals.length}
        sortBy={sortBy}
        sortDirection={sortDirection}
        onSortChange={onSortChange}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        onRowClick={(signal) => setSelectedSignal(signal)}
      />
      <Drawer
        anchor="right"
        open={Boolean(selectedSignal)}
        onClose={() => setSelectedSignal(null)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 560 }, maxWidth: '100%', p: 3 } }}
      >
        {selectedSignal && (
          <Stack spacing={2}>
            <Box>
              <Typography variant="overline" color="text.secondary">Raw Signal Diagnostics</Typography>
              <Typography variant="h5" fontWeight={700}>{selectedSignal.symbol}</Typography>
              <Typography variant="body2" color="text.secondary">{selectedSignal.company_name || 'Unknown company'}</Typography>
            </Box>

            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              <StatusBadge label={selectedSignal.direction} />
              <StatusBadge label={selectedSignal.confidence} />
              <StatusBadge label={selectedSignal.data_status} />
              <Chip size="small" variant="outlined" label={`Score ${selectedSignal.score}`} />
            </Stack>

            <Typography variant="body2">{selectedSignal.explanation}</Typography>

            <Divider />

            <Box>
              <Typography variant="subtitle2" gutterBottom>Generation Audit</Typography>
              <Stack spacing={0.75}>
                <Typography variant="body2" color="text.secondary">Model: {selectedSignal.modelVersion || 'N/A'}</Typography>
                <Typography variant="body2" color="text.secondary">Ruleset: {selectedSignal.rulesetVersion || 'N/A'}</Typography>
                <Typography variant="body2" color="text.secondary">Generated date: {formatDate(selectedSignal.generatedDate || selectedSignal.generated_at)}</Typography>
                <Typography variant="body2" color="text.secondary">Source data date: {formatDate(selectedSignal.sourceDataDate)}</Typography>
                <Typography variant="body2" color="text.secondary">Source price date: {formatDate(selectedSignal.sourcePriceDate)}</Typography>
                <Typography variant="body2" color="text.secondary">Write status: {selectedSignal.writeStatus || 'N/A'}</Typography>
                <Typography variant="body2" color="text.secondary">Audit status: {selectedSignal.auditStatus || 'N/A'}</Typography>
              </Stack>
            </Box>

            <Box>
              <Typography variant="subtitle2" gutterBottom>Calibration</Typography>
              {selectedSignal.calibrationStatus === 'CALIBRATED' && selectedSignal.calibratedScore != null ? (
                <Stack spacing={0.75}>
                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
                    <Typography variant="body2" color="text.secondary">Raw score: {selectedSignal.score}</Typography>
                    <Typography variant="body2" color="text.secondary">→ Calibrated: <strong>{selectedSignal.calibratedScore}</strong></Typography>
                    {selectedSignal.reliabilityTier && (
                      <Chip size="small" label={selectedSignal.reliabilityTier} color={selectedSignal.reliabilityTier === 'FULL' ? 'success' : 'warning'} />
                    )}
                  </Stack>
                  <Typography variant="body2" color="text.secondary">Horizon: {selectedSignal.calibrationHorizon || 'N/A'} · Samples: {selectedSignal.calibrationSampleSize ?? 'N/A'}</Typography>
                  <Typography variant="body2" color="text.secondary">Lifecycle: {selectedSignal.lifecycleState || 'N/A'}</Typography>
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {selectedSignal.calibrationStatus
                    ? `Calibration ${selectedSignal.calibrationStatus.toLowerCase()} — raw score shown, no adjustment applied.`
                    : 'Calibration not yet available for this signal.'}
                </Typography>
              )}
            </Box>

            <Box>
              <Typography variant="subtitle2" gutterBottom>Scoring Inputs</Typography>
              {selectedSignal.scoringInputSummary ? (
                <Stack spacing={0.75}>
                  <Typography variant="body2" color="text.secondary">Price bars: {selectedSignal.scoringInputSummary.priceBarsUsed}</Typography>
                  <Typography variant="body2" color="text.secondary">Latest close: {formatDate(selectedSignal.scoringInputSummary.latestCloseDate)}</Typography>
                  <Typography variant="body2" color="text.secondary">SMA50: {selectedSignal.scoringInputSummary.hasSma50 ? 'Yes' : 'No'} | SMA200: {selectedSignal.scoringInputSummary.hasSma200 ? 'Yes' : 'No'} | Volume: {selectedSignal.scoringInputSummary.hasVolume ? 'Yes' : 'No'}</Typography>
                  <Typography variant="body2" color="text.secondary">Fundamentals: {selectedSignal.scoringInputSummary.fundamentalsAvailable ? 'Yes' : 'No'} | Strategy context: {selectedSignal.scoringInputSummary.strategyContextLoaded ? 'Yes' : 'No'}</Typography>
                </Stack>
              ) : <Typography variant="body2" color="text.secondary">Legacy signal has no scoring input snapshot.</Typography>}
            </Box>

            <Box>
              <Typography variant="subtitle2" gutterBottom>Data Quality Eligibility</Typography>
              {selectedSignal.dataQualityEligibility ? (
                <Stack spacing={0.75}>
                  <Typography variant="body2" color="text.secondary">Filter applied: {selectedSignal.dataQualityEligibility.filterApplied ? 'Yes' : 'No'} | Eligible: {selectedSignal.dataQualityEligibility.eligible === null ? 'Unknown' : selectedSignal.dataQualityEligibility.eligible ? 'Yes' : 'No'}</Typography>
                  <Typography variant="body2" color="text.secondary">Coverage: {selectedSignal.dataQualityEligibility.coverageStatus || 'N/A'} | Readiness: {selectedSignal.dataQualityEligibility.signalReadinessStatus || 'N/A'} | Liquidity: {selectedSignal.dataQualityEligibility.liquidityStatus || 'N/A'}</Typography>
                  {selectedSignal.dataQualityEligibility.excludedReason && <Typography variant="body2" color="text.secondary">Reason: {selectedSignal.dataQualityEligibility.excludedReason}</Typography>}
                </Stack>
              ) : <Typography variant="body2" color="text.secondary">Legacy signal has no eligibility snapshot.</Typography>}
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle2" gutterBottom>Triggered Factors</Typography>
              {selectedSignal.triggered_signals.length ? selectedSignal.triggered_signals.map((item) => (
                <Typography key={`${item.category}-${item.code}`} variant="body2" color="text.secondary">- {item.label} ({item.category})</Typography>
              )) : <Typography variant="body2" color="text.secondary">No triggered factors.</Typography>}
            </Box>

            <Box>
              <Typography variant="subtitle2" gutterBottom>Negative Factors</Typography>
              {selectedSignal.negative_signals.length ? selectedSignal.negative_signals.map((item) => (
                <Typography key={`${item.category}-${item.code}`} variant="body2" color="text.secondary">- {item.label} ({item.category})</Typography>
              )) : <Typography variant="body2" color="text.secondary">No negative factors.</Typography>}
            </Box>

            <Box>
              <Typography variant="subtitle2" gutterBottom>Warnings</Typography>
              {selectedSignal.warnings?.length ? selectedSignal.warnings.map((item) => (
                <Typography key={item} variant="body2" color="text.secondary">- {item}</Typography>
              )) : <Typography variant="body2" color="text.secondary">No warnings.</Typography>}
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle2" gutterBottom>Strategy Context</Typography>
              {!strategyContextLoaded ? (
                <Typography variant="body2" color="text.secondary">Strategy context is not loaded for this table view. Enable "Show strategy context" to inspect matches and blockers.</Typography>
              ) : (
                <Stack spacing={1.5}>
                  <Box>
                    <Typography variant="body2" fontWeight={700}>Matches</Typography>
                    {selectedSignal.strategyMatches?.length ? selectedSignal.strategyMatches.map((match) => (
                      <Box key={`${match.strategyCode}-${match.strategyVersion}`} sx={{ mt: 0.75 }}>
                        <Typography variant="body2">{match.strategyCode} v{match.strategyVersion} | {match.decision} | Score {match.score}</Typography>
                        {match.reasons.slice(0, 4).map((reason) => <Typography key={reason} variant="caption" display="block" color="text.secondary">- {reason}</Typography>)}
                      </Box>
                    )) : <Typography variant="body2" color="text.secondary">No Strategy Framework match for this raw signal.</Typography>}
                  </Box>
                  <Box>
                    <Typography variant="body2" fontWeight={700}>Blocked Strategies</Typography>
                    {selectedSignal.blockedStrategies?.length ? selectedSignal.blockedStrategies.map((blocked) => (
                      <Box key={`${blocked.strategyCode}-${blocked.strategyVersion}`} sx={{ mt: 0.75 }}>
                        <Typography variant="body2">{blocked.strategyCode} v{blocked.strategyVersion}</Typography>
                        <Typography variant="caption" display="block" color="text.secondary">{blocked.reason}</Typography>
                      </Box>
                    )) : <Typography variant="body2" color="text.secondary">No blocked Strategy Framework matches.</Typography>}
                  </Box>
                </Stack>
              )}
            </Box>

            <Divider />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <Button variant="outlined" onClick={() => navigate(`/research/stocks/${selectedSignal.instrument_id}`)}>Open Research</Button>
              <Button variant="contained" onClick={() => navigate(`/strategy?instrumentId=${selectedSignal.instrument_id}`)}>Review Strategy Decision</Button>
            </Stack>
          </Stack>
        )}
      </Drawer>
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
