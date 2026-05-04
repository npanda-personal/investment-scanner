import React, { useEffect, useState } from 'react';
import { Box, Paper, Typography, CircularProgress, Alert, List, ListItem, ListItemIcon, ListItemText, Divider, Button, IconButton, Tooltip } from '@mui/material';
import { CheckCircleOutline, ErrorOutline, FactCheckOutlined, VisibilityOutlined, LaunchOutlined } from '@mui/icons-material';
import { fetchLatestDecision, fetchMarketGate } from '../api/strategyDecisionApi';
import type { StrategyDecisionDto, MarketGateResponse } from '../types';
import { StatusBadge } from '@/shared/components';
import { Link } from 'react-router-dom';

interface StrategyDecisionWidgetProps {
  instrumentId: string;
}

const StrategyDecisionWidget: React.FC<StrategyDecisionWidgetProps> = ({ instrumentId }) => {
  const [decision, setDecision] = useState<StrategyDecisionDto | null>(null);
  const [gate, setGate] = useState<MarketGateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchLatestDecision(instrumentId),
      fetchMarketGate()
    ])
    .then(([d, g]) => {
      setDecision(d);
      setGate(g);
    })
    .catch(err => setError(err.message || 'Failed to load decision'))
    .finally(() => setLoading(false));
  }, [instrumentId]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}><CircularProgress size={24} /></Box>;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Paper sx={{ p: 2, mb: 3, borderLeft: '4px solid', borderColor: 'primary.main' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FactCheckOutlined color="primary" />
          <Typography variant="h6">Strategy Decision</Typography>
        </Box>
        {decision && <StatusBadge label={decision.decision} />}
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
            {decision.action.replace(/_/g, ' ')}
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
