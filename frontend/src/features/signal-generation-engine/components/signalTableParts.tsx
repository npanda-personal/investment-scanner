/**
 * signalTableParts — pure presentational helpers and formatters for SignalTable.
 *
 * Extracted from SignalTable.tsx (over the source-file line cap) so the column/cell
 * presentation lives in one cohesive place and the table file stays focused on the
 * DataTable wiring and the detail drawer. All helpers are pure/presentational —
 * research-support framing, no fetching.
 */
import { Box, Typography } from '@mui/material';
import type { SignalResult } from '../types';
import { humanizeCode } from '@/shared/format/enumLabels';

export const formatMoney = (value: number | null, currency: string | null) => {
  if (value === null) return 'N/A';
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'USD', maximumFractionDigits: 2 }).format(value);
  } catch {
    return `${currency || ''} ${value.toFixed(2)}`.trim();
  }
};

export const formatPercent = (value: number | null) => value === null ? 'N/A' : `${value >= 0 ? '+' : ''}${(value * 100).toFixed(1)}%`;

export const formatDate = (value?: string | null) => value ? new Date(value).toLocaleDateString() : 'N/A';

export const SignalReasons = ({ signal }: { signal: SignalResult }) => {
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

export const reasonSummary = (signal: SignalResult) => {
  const primary = signal.direction === 'BEARISH' ? signal.negative_signals : signal.triggered_signals;
  const secondary = signal.direction === 'BEARISH' ? signal.triggered_signals : signal.negative_signals;

  const top = primary.length > 0 ? primary : secondary;
  return top.slice(0, 2).map((reason) => reason.label).join('; ') || 'Insufficient data';
};

export const StrategyMatchDetails = ({ signal }: { signal: SignalResult }) => (
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

export const BlockedStrategyDetails = ({ signal }: { signal: SignalResult }) => (
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
