import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  CircularProgress,
  Alert,
  Stack,
  Chip,
  Divider,
} from '@mui/material';
import {
  ArrowForwardOutlined,
  CheckCircleOutline,
  LockOutlined,
  WarningAmberOutlined,
  TrendingUpOutlined,
  TrendingDownOutlined,
  ShieldOutlined,
  LocalFireDepartmentOutlined,
} from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { useResearchOverview } from '../hooks/useResearchOverview';
import { PageHeader } from '@/shared/components';
import type { StrategyDecisionDto } from '@/features/strategy-decision-engine';

const ResearchOverviewPage: React.FC = () => {
  const { data, loading, error, reload } = useResearchOverview();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !data) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" action={<Button color="inherit" size="small" onClick={reload}>Retry</Button>}>
          {error || 'Unable to load research overview'}
        </Alert>
      </Box>
    );
  }

  const { 
    marketGate = { marketGate: 'UNKNOWN', reasons: [], blockers: [], allowedActions: [] } as any, 
    marketRegime = { regime: 'NEUTRAL' } as any, 
    topSectors = [], 
    weakSectors = [], 
    breadth, 
    topStrategyCandidates = [], 
    topExits = [] 
  } = data;

  const gateColor = marketGate.marketGate === 'OPEN' ? 'success' : marketGate.marketGate === 'CLOSED' ? 'error' : 'warning';
  const gateIcon = marketGate.marketGate === 'OPEN' ? <CheckCircleOutline fontSize="large" /> : marketGate.marketGate === 'CLOSED' ? <LockOutlined fontSize="large" /> : <WarningAmberOutlined fontSize="large" />;

  return (
    <Box sx={{ p: 3, maxWidth: 1600, mx: 'auto' }}>
      <PageHeader
        title="Research Decision Dashboard"
        subtitle="Holistic market pulse and actionable high-conviction decisions."
        primaryAction={<Button variant="outlined" onClick={reload}>Refresh Pulse</Button>}
      />

      {/* Hero Section: Market Verdict */}
      <Paper 
        elevation={0} 
        sx={{ 
          p: 4, 
          mb: 4, 
          borderRadius: 2,
          borderLeft: '8px solid', 
          borderColor: `${gateColor}.main`,
          backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.01)'
        }}
      >
        <Grid container spacing={4} alignItems="center">
          <Grid item xs={12} md={7}>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
              <Box sx={{ color: `${gateColor}.main`, display: 'flex' }}>
                {gateIcon}
              </Box>
              <Typography variant="h4" fontWeight={800} sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                Market is {marketGate.marketGate}
              </Typography>
            </Stack>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
              {marketGate.reasons[0] || 'Market conditions are being evaluated.'} {marketGate.blockers[0]}
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ gap: 1 }}>
              {marketGate.allowedActions.map(action => (
                <Chip key={action} label={action.replace(/_/g, ' ')} color="primary" variant="outlined" />
              ))}
            </Stack>
          </Grid>
          
          <Grid item xs={12} md={5}>
            <Paper variant="outlined" sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body1" fontWeight={700}>Market Regime</Typography>
                  <Chip size="small" label={marketRegime.regime} color={marketRegime.regime === 'RISK_ON' ? 'success' : marketRegime.regime === 'RISK_OFF' ? 'error' : 'default'} />
                </Box>
                <Divider />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body1" fontWeight={700}>Market Breadth</Typography>
                  <Typography variant="body1">{((breadth?.percentAboveSma50 ?? 0) * 100).toFixed(1)}% above SMA50</Typography>
                </Box>
                <Divider />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body1" fontWeight={700}>Update Status</Typography>
                  <Typography variant="body2" color="text.secondary">{new Date(data.updatedAt).toLocaleTimeString()}</Typography>
                </Box>
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      </Paper>

      {/* Sector Winds */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Sector Winds</Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 2, borderColor: 'success.light' }}>
              <Typography variant="subtitle2" color="success.main" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                <TrendingUpOutlined fontSize="small" /> Tailwinds (Focus Here)
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ gap: 1 }}>
                {topSectors.length === 0 ? <Typography variant="body2">No data</Typography> : topSectors.map(s => (
                  <Chip key={s.sector} label={`${s.sector} (${s.relativeStrengthScore})`} size="small" />
                ))}
              </Stack>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 2, borderColor: 'error.light' }}>
              <Typography variant="subtitle2" color="error.main" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                <TrendingDownOutlined fontSize="small" /> Headwinds (Avoid)
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ gap: 1 }}>
                {weakSectors.length === 0 ? <Typography variant="body2">No data</Typography> : weakSectors.map(s => (
                  <Chip key={s.sector} label={`${s.sector} (${s.relativeStrengthScore})`} size="small" />
                ))}
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      </Box>

      {/* Action Dashboard */}
      <Grid container spacing={4}>
        {/* High Conviction Candidates */}
        <Grid item xs={12} md={6}>
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocalFireDepartmentOutlined color="primary" /> High Conviction Setups
          </Typography>
          <Paper sx={{ p: 2 }}>
            {topStrategyCandidates.length === 0 ? (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <Typography color="text.secondary" sx={{ mb: 2 }}>No high-conviction trade candidates currently.</Typography>
                <Button component={Link} to="/strategy" variant="outlined" size="small">Open Strategy Engine</Button>
              </Box>
            ) : (
              <Stack spacing={2}>
                {topStrategyCandidates.map((cand) => (
                  <DecisionCard key={cand.id} cand={cand} type="buy" />
                ))}
                <Box sx={{ pt: 1 }}>
                  <Button component={Link} to="/strategy" endIcon={<ArrowForwardOutlined />}>View Full Strategy Board</Button>
                </Box>
              </Stack>
            )}
          </Paper>
        </Grid>

        {/* Defensive Exits / Risk Reduction */}
        <Grid item xs={12} md={6}>
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <ShieldOutlined color="warning" /> Defensive Exits & Risk Reduction
          </Typography>
          <Paper sx={{ p: 2 }}>
            {topExits.length === 0 ? (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <Typography color="text.secondary" sx={{ mb: 2 }}>No active defensive exit warnings.</Typography>
                <Button component={Link} to="/strategy" variant="outlined" size="small">Open Strategy Engine</Button>
              </Box>
            ) : (
              <Stack spacing={2}>
                {topExits.map((cand) => (
                  <DecisionCard key={cand.id} cand={cand} type="sell" />
                ))}
                <Box sx={{ pt: 1 }}>
                  <Button component={Link} to="/strategy" endIcon={<ArrowForwardOutlined />}>View Full Strategy Board</Button>
                </Box>
              </Stack>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

const DecisionCard: React.FC<{ cand: StrategyDecisionDto; type: 'buy' | 'sell' }> = ({ cand, type }) => {
  const isBuy = type === 'buy';
  return (
    <Box sx={{ 
      p: 2, 
      borderRadius: 1, 
      border: '1px solid', 
      borderColor: 'divider',
      backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)'
    }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
        <Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="h6" fontWeight={700}>{cand.symbol}</Typography>
            <Chip size="small" label={cand.action.replace(/_/g, ' ')} color={isBuy ? 'primary' : 'warning'} />
          </Stack>
          <Typography variant="caption" color="text.secondary">{cand.strategy}</Typography>
        </Box>
        <Typography variant="h6" fontWeight={700} color={isBuy ? 'success.main' : 'error.main'}>
          {cand.decisionScore}
        </Typography>
      </Stack>
      <Typography variant="body2" sx={{ mb: 1.5 }}>
        {cand.reasons[0] || cand.warnings[0] || cand.blockers[0]}
      </Typography>
      
      {isBuy && cand.entryZone && (
        <Stack direction="row" spacing={2} sx={{ mt: 1, p: 1, backgroundColor: 'background.paper', borderRadius: 1 }}>
          <Box>
            <Typography variant="caption" color="text.secondary" display="block">Entry Zone</Typography>
            <Typography variant="body2" fontWeight={600}>${cand.entryZone.preferredEntryMin} - ${cand.entryZone.preferredEntryMax}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" display="block">Stop Loss</Typography>
            <Typography variant="body2" fontWeight={600} color="error.main">${cand.riskPlan?.stopLoss}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" display="block">Target</Typography>
            <Typography variant="body2" fontWeight={600} color="success.main">${cand.riskPlan?.targetPrice}</Typography>
          </Box>
        </Stack>
      )}
    </Box>
  );
};

export default ResearchOverviewPage;
