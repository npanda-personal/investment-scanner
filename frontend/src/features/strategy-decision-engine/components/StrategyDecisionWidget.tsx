import React, { useEffect, useState } from 'react';
import { Box, Paper, Typography, CircularProgress, Alert, List, ListItem, ListItemIcon, ListItemText, Divider, IconButton, Tooltip } from '@mui/material';
import { CheckCircleOutline, ErrorOutline, FactCheckOutlined, LaunchOutlined } from '@mui/icons-material';
import { fetchLatestDecision, fetchMarketGate } from '../api/strategyDecisionApi';
import type { StrategyDecisionDto, MarketGateResponse } from '../types';
import { StatusBadge } from '@/shared/components';
import { Link } from 'react-router-dom';
import { useMarketScope } from '@/contexts/MarketScopeContext';

const titleCase = (value: string) =>
  value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const formatDecision = (value: string) => {
  if (value === 'TRADE_CANDIDATE') return 'Review Candidate';
  if (value === 'EXIT_CANDIDATE') return 'Exit Review';
  if (value === 'REDUCE_RISK') return 'Reduce Risk';
  if (value === 'INSUFFICIENT_DATA') return 'Insufficient Data';
  return titleCase(value);
};

const formatAction = (value: string) => {
  if (value === 'CONSIDER_ENTRY') return 'Consider Review';
  if (value === 'AVOID_NEW_ENTRY') return 'Avoid New Review';
  if (value === 'WAIT_FOR_CONFIRMATION') return 'Wait For Confirmation';
  if (value === 'WAIT_FOR_PULLBACK') return 'Wait For Pullback';
  if (value === 'REVIEW_EXIT') return 'Review Exit Risk';
  if (value === 'REDUCE_EXPOSURE') return 'Reduce Exposure Risk';
  return titleCase(value);
};

interface StrategyDecisionWidgetProps {
  instrumentId: string;
}

const StrategyDecisionWidget: React.FC<StrategyDecisionWidgetProps> = ({ instrumentId }) => {
  const { scope } = useMarketScope();
  const [decision, setDecision] = useState<StrategyDecisionDto | null>(null);
  const [gate, setGate] = useState<MarketGateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchLatestDecision(instrumentId),
      fetchMarketGate({ region: scope.region })
    ])
    .then(([d, g]) => {
      setDecision(d && 'strategy' in d ? d : null);
      setGate(g && 'marketGate' in g ? g : null);
    })
    .catch(err => setError(err.message || 'Failed to load decision'))
    .finally(() => setLoading(false));
  }, [instrumentId, scope.region]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}><CircularProgress size={24} /></Box>;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Paper sx={{ p: 2, mb: 3, borderLeft: '4px solid', borderColor: 'primary.main' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FactCheckOutlined color="primary" />
          <Typography variant="h6">Strategy Decision</Typography>
        </Box>
        {decision && <StatusBadge label={formatDecision(decision.decision)} />}
      </Box>

      {gate && (
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" color="textSecondary">Market Gate:</Typography>
          <StatusBadge label={gate.marketGate} size="small" />
        </Box>
      )}

      {decision ? (
        <Box>
          <Typography variant="body1" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
            {formatAction(decision.action)}
          </Typography>
          <Typography variant="caption" color="textSecondary" display="block" sx={{ mb: 1 }}>
            Strategy: {decision.strategy} | Region: {decision.country || 'N/A'} | Exchange: {decision.exchange || 'N/A'} | Score: {decision.decisionScore}/100
          </Typography>
          
          <List dense sx={{ py: 0 }}>
            {decision.reasons.slice(0, 2).map((r, i) => (
              <ListItem key={i} sx={{ px: 0, py: 0.25 }}>
                <ListItemIcon sx={{ minWidth: 28 }}><CheckCircleOutline color="success" sx={{ fontSize: 16 }} /></ListItemIcon>
                <ListItemText primary={<Typography variant="caption">{r}</Typography>} />
              </ListItem>
            ))}
            {decision.blockers.slice(0, 2).map((b, i) => (
              <ListItem key={i} sx={{ px: 0, py: 0.25 }}>
                <ListItemIcon sx={{ minWidth: 28 }}><ErrorOutline color="error" sx={{ fontSize: 16 }} /></ListItemIcon>
                <ListItemText primary={<Typography variant="caption">{b}</Typography>} />
              </ListItem>
            ))}
          </List>

          <Divider sx={{ my: 1 }} />
          <Tooltip title="View Full Strategy Dashboard" arrow>
            <IconButton 
              component={Link} 
              to="/strategy" 
              size="small"
            >
              <LaunchOutlined fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" color="textSecondary">
            No strategy decision generated yet.
          </Typography>
          <Tooltip title="Go to Strategy Dashboard" arrow>
            <IconButton component={Link} to="/strategy" size="small">
              <LaunchOutlined fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      )}
    </Paper>
  );
};

export default StrategyDecisionWidget;
