import React from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { 
  VisibilityOutlined, 
  LaunchOutlined 
} from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { usePortfolioIntelligence } from '../hooks';
import { fetchExits, type StrategyDecisionDto } from '@/features/strategy-decision-engine';
import { useMarketScope } from '@/contexts/MarketScopeContext';
import type { GroupedHoldingSummary, RedFlag, ReviewItem } from '../types';

const StrategyExitCard: React.FC<{ decision: StrategyDecisionDto }> = ({ decision }) => (
  <Paper variant="outlined" sx={{ p: 1.5, borderLeft: '4px solid', borderColor: 'error.main' }}>
    <Stack direction="row" justifyContent="space-between" alignItems="center">
      <Typography fontWeight={700}>{decision.symbol}</Typography>
      <Chip size="small" color="error" label={decision.decision.replace(/_/g, ' ')} />
    </Stack>
    <Typography variant="body2" color="primary" sx={{ my: 0.5 }}>{decision.action.replace(/_/g, ' ')}</Typography>
    <Typography variant="caption" color="textSecondary">{decision.reasons[0]}</Typography>
    <Box sx={{ mt: 1 }}>
      <Tooltip title="View Decision Detail" arrow>
        <IconButton component={Link} to="/strategy" size="small">
          <VisibilityOutlined fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  </Paper>
);

const percent = (value: number | null | undefined) =>
  value === null || value === undefined ? 'N/A' : `${(value * 100).toFixed(1)}%`;

const statusColor = (status: string) => {
  if (status === 'HEALTHY') return 'success';
  if (status === 'AT_RISK') return 'error';
  return 'warning';
};

const severityColor = (severity: string) => {
  if (severity === 'HIGH') return 'error';
  if (severity === 'MEDIUM') return 'warning';
  return 'info';
};

const decisionColor = (label: string) => {
  if (label === 'GOOD') return 'success';
  if (label === 'HIGH_RISK') return 'error';
  if (label === 'REVIEW') return 'warning';
  return 'info';
};

const BreakdownBar: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <Box>
    <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
      <Typography variant="body2">{label}</Typography>
      <Typography variant="body2" color="text.secondary">{value}</Typography>
    </Stack>
    <LinearProgress variant="determinate" value={value} sx={{ height: 8, borderRadius: 1 }} />
  </Box>
);

const RedFlagCard: React.FC<{ flag: RedFlag }> = ({ flag }) => (
  <Paper variant="outlined" sx={{ p: 1.5 }}>
    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
      <Chip size="small" color={severityColor(flag.severity)} label={flag.severity} />
      <Typography fontWeight={700}>{flag.title}</Typography>
    </Stack>
    <Typography variant="body2" color="text.secondary">{flag.description}</Typography>
  </Paper>
);

const ReviewCard: React.FC<{ item: ReviewItem }> = ({ item }) => (
  <Paper variant="outlined" sx={{ p: 1.5 }}>
    <Stack direction="row" justifyContent="space-between" spacing={1}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Tooltip title="View Research" arrow>
          <IconButton component={Link} to={`/research/stocks/${item.instrumentId}`} size="small">
            <LaunchOutlined fontSize="small" />
          </IconButton>
        </Tooltip>
        <Box>
          <Typography fontWeight={700}>{item.symbol}</Typography>
          <Typography variant="body2" color="text.secondary">{item.companyName || 'Unknown company'}</Typography>
        </Box>
      </Box>
      <Chip size="small" color={decisionColor(item.decisionLabel)} label={item.decisionLabel} />
    </Stack>
    <Typography variant="body2" sx={{ mt: 1 }}>Action: {item.actionSuggestion}</Typography>
    <Typography variant="body2" color="text.secondary">Allocation {percent(item.allocationPercent)} · P&L {percent(item.unrealizedPnLPercent)} · Signal {item.signalDirection || 'Missing'}</Typography>
    <Box component="ul" sx={{ pl: 2, my: 1 }}>
      {item.reasons.map((reason) => <Typography component="li" variant="body2" key={reason}>{reason}</Typography>)}
    </Box>
  </Paper>
);

const GroupSection: React.FC<{ title: string; items: GroupedHoldingSummary[] }> = ({ title, items }) => (
  <Paper sx={{ p: 2 }}>
    <Typography variant="h6" sx={{ mb: 1 }}>{title}</Typography>
    {items.length === 0 ? (
      <Typography color="text.secondary">No items in this group.</Typography>
    ) : (
      <Stack spacing={1}>
        {items.slice(0, 5).map((item) => (
          <Box key={item.holdingId} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title="View Research" arrow>
              <IconButton component={Link} to={`/research/stocks/${item.instrumentId}`} size="small">
                <LaunchOutlined fontSize="small" />
              </IconButton>
            </Tooltip>
            <Box>
              <Typography variant="body2" fontWeight={700}>{item.symbol}</Typography>
              <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 150 }}>{item.reasons[0]}</Typography>
            </Box>
          </Box>
        ))}
      </Stack>
    )}
  </Paper>
);

export const PortfolioIntelligencePanel: React.FC<{ portfolioId?: string }> = ({ portfolioId }) => {
  const { scope } = useMarketScope();
  const { intelligence, loading, error } = usePortfolioIntelligence(portfolioId);
  const [strategyExits, setStrategyExits] = React.useState<StrategyDecisionDto[]>([]);

  React.useEffect(() => {
    if (portfolioId) {
      fetchExits({ portfolioId, region: scope.region }).then(setStrategyExits).catch(() => {});
    }
  }, [portfolioId, scope.region]);

  if (!portfolioId) return null;
  if (loading) return <Paper sx={{ p: 3, textAlign: 'center' }}><CircularProgress /></Paper>;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!intelligence) return null;

  if (intelligence.holdings.length === 0) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6">Portfolio Intelligence</Typography>
        <Typography color="text.secondary">Add holdings to unlock health scoring, red flags, and review ranking.</Typography>
      </Paper>
    );
  }

  const breakdown = intelligence.scoreBreakdown;
  return (
    <Stack spacing={3}>
      <Paper sx={{ p: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
          <Box>
            <Typography variant="h6">Portfolio Intelligence</Typography>
            <Typography color="text.secondary">{intelligence.explanation}</Typography>
          </Box>
          <Stack alignItems={{ xs: 'flex-start', md: 'flex-end' }} spacing={1}>
            <Typography variant="h3">{intelligence.healthScore}</Typography>
            <Chip color={statusColor(intelligence.status)} label={intelligence.status} />
          </Stack>
        </Stack>
      </Paper>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2 }}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Score Breakdown</Typography>
          <Stack spacing={1.5}>
            <BreakdownBar label="Concentration" value={breakdown.concentration} />
            <BreakdownBar label="P&L Health" value={breakdown.pnlHealth} />
            <BreakdownBar label="Signal Quality" value={breakdown.signalQuality} />
            <BreakdownBar label="Data Completeness" value={breakdown.dataCompleteness} />
            <BreakdownBar label="Sector Concentration" value={breakdown.sectorConcentration} />
          </Stack>
        </Paper>

        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Signal Overlay</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
            <Typography>Bullish: {intelligence.signalOverlay.bullishCount}</Typography>
            <Typography>Neutral: {intelligence.signalOverlay.neutralCount}</Typography>
            <Typography>Bearish: {intelligence.signalOverlay.bearishCount}</Typography>
            <Typography>Missing: {intelligence.signalOverlay.missingSignalCount}</Typography>
            <Typography>Weighted score: {intelligence.signalOverlay.weightedAverageSignalScore ?? 'N/A'}</Typography>
            <Typography>Bearish value: {percent(intelligence.signalOverlay.bearishMarketValuePercent)}</Typography>
          </Box>
        </Paper>
      </Box>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Red Flags</Typography>
        {intelligence.redFlags.length === 0 ? (
          <Typography color="text.secondary">No red flags detected by the MVP checks.</Typography>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' }, gap: 1.5 }}>
            {intelligence.redFlags.slice(0, 8).map((flag) => <RedFlagCard key={`${flag.category}-${flag.title}`} flag={flag} />)}
          </Box>
        )}
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Review Ranking</Typography>
        <Stack spacing={1.5}>
          {intelligence.reviewRanking.map((item) => <ReviewCard key={item.holdingId} item={item} />)}
        </Stack>
      </Paper>

      {strategyExits.length > 0 && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }} color="error">Strategy Exit Candidates</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
            {strategyExits.map((d) => <StrategyExitCard key={d.id} decision={d} />)}
          </Box>
        </Paper>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(4, 1fr)' }, gap: 2 }}>
        <GroupSection title="Strong Holdings" items={intelligence.groupedSummary.strongHoldings} />
        <GroupSection title="Weak Holdings" items={intelligence.groupedSummary.weakHoldings} />
        <GroupSection title="Needs Review" items={intelligence.groupedSummary.needsReview} />
        <GroupSection title="Data Issues" items={intelligence.groupedSummary.dataIssues} />
      </Box>
    </Stack>
  );
};
