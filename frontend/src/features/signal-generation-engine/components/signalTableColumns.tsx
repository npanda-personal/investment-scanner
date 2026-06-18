/**
 * signalTableColumns.tsx
 *
 * Column definitions + the presentational cell helpers for the signals DataTable,
 * extracted from SignalTable.tsx (which was over the 500-line cap). `buildSignalColumns`
 * takes the component's dynamic dependencies (navigation, banned symbols, the
 * strategy-context flag, and the row-action callbacks) and returns the column array, so the
 * table component stays a thin shell around DataTable + the detail drawer.
 */
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
import { Box, Button, Chip, IconButton, Tooltip, Typography } from '@mui/material';
import type { NavigateFunction } from 'react-router-dom';
import { StatusBadge, type DataTableColumn } from '@/shared/components';
import { humanizeCode } from '@/shared/format/enumLabels';
import type { SignalResult } from '../types';
import { formatDate, formatMoney, formatPercent } from './signalTableFormat';

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
        <Typography variant="caption" display="block">Score {match.score} · {match.confidence} · {humanizeCode(match.ratingGrade || 'UNPROVEN')} · {humanizeCode(match.readinessLabel || 'RESEARCH_ONLY')}</Typography>
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

export interface SignalColumnDeps {
  navigate: NavigateFunction;
  strategyContextLoaded: boolean;
  bannedSymbols?: Set<string>;
  onAddWatchlist: (signal: SignalResult) => void;
  onAddPortfolio: (signal: SignalResult) => void;
  onCreateAlert: (signal: SignalResult) => void;
}

export function buildSignalColumns({ navigate, strategyContextLoaded, bannedSymbols, onAddWatchlist, onAddPortfolio, onCreateAlert }: SignalColumnDeps): DataTableColumn<SignalResult>[] {
  return [
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
    {
      id: 'cohortWinRate',
      label: 'Track Record',
      align: 'right' as const,
      render: (signal: SignalResult) => {
        const wr = signal.cohortWinRate;
        if (wr == null) {
          return (
            <Tooltip title="No matured outcomes yet for this signal's cohort (same direction & score band)." arrow>
              <Typography variant="body2" color="text.disabled" sx={{ cursor: 'help' }}>—</Typography>
            </Tooltip>
          );
        }
        const pct = Math.round(wr * 100);
        const n = signal.cohortDirectionalSampleSize ?? 0;
        const conf = signal.cohortWinRateConfidence ?? 'LOW';
        const horizon = signal.cohortMetricsHorizon ?? '20D';
        const lowSample = conf === 'LOW';
        const color = lowSample ? 'text.secondary' : pct >= 55 ? 'success.main' : pct >= 45 ? 'text.primary' : 'error.main';
        return (
          <Tooltip
            title={`Historically, signals like this (same direction & score band) resolved in their signaled direction ${pct}% of the time over ${horizon} (n=${n} directional, ${conf} confidence). Past outcomes — not a forecast.`}
            arrow
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'flex-end', cursor: 'help' }}>
              <Typography variant="body2" sx={{ color, fontWeight: !lowSample && pct >= 55 ? 600 : 400 }}>{pct}%</Typography>
              <Typography variant="caption" color="text.disabled">n={n}</Typography>
            </Box>
          </Tooltip>
        );
      },
    },
    { id: 'direction', label: 'Raw Direction', sortable: true, render: (signal) => <StatusBadge label={signal.direction} /> },
    { id: 'confidence', label: 'Confidence', sortable: true, render: (signal) => <StatusBadge label={signal.confidence} /> },
    {
      id: 'lifecycle',
      label: 'Lifecycle',
      render: (signal: SignalResult) => {
        const ls = signal.lifecycleState;
        if (!ls) {
          return <Typography variant="body2" color="text.disabled">—</Typography>;
        }
        const color = ls === 'EXIT' ? 'warning' : ls === 'ACTIVE' ? 'success' : ls === 'ENTRY' ? 'info' : 'default';
        const tip =
          ls === 'EXIT' ? 'A previously bullish signal has weakened or flipped. Review whether to exit the position.'
          : ls === 'ACTIVE' ? 'Signal is active and still holding its reading.'
          : ls === 'ENTRY' ? 'New candidate surfaced in the latest run.'
          : 'Signal has expired — no current reading for this instrument.';
        return (
          <Tooltip title={tip} arrow>
            <Chip
              size="small"
              variant={ls === 'EXIT' ? 'filled' : 'outlined'}
              color={color as 'warning' | 'success' | 'info' | 'default'}
              label={ls}
              sx={{ cursor: 'help', fontWeight: ls === 'EXIT' ? 700 : 400 }}
            />
          </Tooltip>
        );
      },
    },
    {
      id: 'audit',
      label: 'Audit',
      render: (signal) => (
        <Tooltip title={`${signal.rulesetVersion || signal.modelVersion || 'Default'} | source ${formatDate(signal.sourceDataDate)}`} arrow>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', maxWidth: 180 }}>
            <Chip size="small" variant="outlined" label={signal.modelVersion || 'Default'} />
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
            <IconButton size="small" onClick={() => onAddWatchlist(signal)}>
              <PlaylistAddOutlined fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Add to Portfolio" arrow>
            <IconButton size="small" onClick={() => onAddPortfolio(signal)}>
              <AccountBalanceWalletOutlined fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Create Alert" arrow>
            <IconButton size="small" onClick={() => onCreateAlert(signal)}>
              <NotificationsNoneOutlined fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];
}
