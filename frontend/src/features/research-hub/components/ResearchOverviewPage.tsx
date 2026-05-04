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
  InsightsOutlined,
  FactCheckOutlined,
  AccountTreeOutlined,
  PublicOutlined,
  ArrowForwardOutlined,
  CheckCircleOutline,
  LockOutlined,
  WarningAmberOutlined,
} from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { useResearchOverview } from '../hooks/useResearchOverview';
import { PageHeader } from '@/shared/components';

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

  const { marketGate, marketRegime, topSignals, topSmartMoney, topStrategyCandidates } = data;

  const gateColor = marketGate.marketGate === 'OPEN' ? 'success' : marketGate.marketGate === 'CLOSED' ? 'error' : 'warning';
  const gateIcon = marketGate.marketGate === 'OPEN' ? <CheckCircleOutline /> : marketGate.marketGate === 'CLOSED' ? <LockOutlined /> : <WarningAmberOutlined />;

  return (
    <Box sx={{ p: 3, maxWidth: 1600, mx: 'auto' }}>
      <PageHeader
        title="Research Overview"
        subtitle="Holistic market pulse and high-conviction trade candidates."
        primaryAction={<Button variant="outlined" onClick={reload}>Refresh Pulse</Button>}
      />

      {/* Hero Section: Market Gate */}
      <Paper 
        elevation={0} 
        sx={{ 
          p: 3, 
          mb: 4, 
          borderLeft: '6px solid', 
          borderColor: `${gateColor}.main`,
          backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)'
        }}
      >
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2}>
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="h6" fontWeight={700}>Market Trading Gate</Typography>
              <Chip icon={gateIcon} label={marketGate.marketGate} color={gateColor} size="small" />
            </Stack>
            <Typography variant="body1" color="text.primary" sx={{ mb: 0.5 }}>
              {marketGate.reasons[0] || 'Market conditions are being evaluated.'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Regime: {marketRegime.regime} (Score: {marketRegime.score}) · Updated {new Date(data.updatedAt).toLocaleTimeString()}
            </Typography>
          </Box>
          <Button 
            component={Link} 
            to="/strategy" 
            variant="contained" 
            color={gateColor}
            endIcon={<ArrowForwardOutlined />}
          >
            View Decision Dashboard
          </Button>
        </Stack>
      </Paper>

      <Grid container spacing={3}>
        {/* Strategy Candidates */}
        <Grid item xs={12} lg={6}>
          <OverviewCard 
            title="Top Strategy Candidates" 
            icon={<FactCheckOutlined color="primary" />}
            link="/strategy"
            linkLabel="Full Strategy Board"
          >
            {topStrategyCandidates.length === 0 ? (
              <Typography color="text.secondary">No active trade candidates found. Run strategy evaluation.</Typography>
            ) : (
              <Stack spacing={1.5}>
                {topStrategyCandidates.map((cand) => (
                  <Box key={cand.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography fontWeight={700}>{cand.symbol}</Typography>
                      <Typography variant="caption" color="text.secondary">{cand.strategy}</Typography>
                    </Box>
                    <Chip label={cand.action} size="small" color="primary" variant="outlined" />
                  </Box>
                ))}
              </Stack>
            )}
          </OverviewCard>
        </Grid>

        {/* Signals Pulse */}
        <Grid item xs={12} lg={6}>
          <OverviewCard 
            title="Recent Bullish Signals" 
            icon={<InsightsOutlined color="success" />}
            link="/signals"
            linkLabel="Open Signals Engine"
          >
            {topSignals.length === 0 ? (
              <Typography color="text.secondary">No high-conviction signals detected today.</Typography>
            ) : (
              <Stack spacing={1.5}>
                {topSignals.map((signal) => (
                  <Box key={signal.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography fontWeight={700}>{signal.symbol}</Typography>
                      <Typography variant="caption" color="text.secondary">{signal.direction} · Score {signal.score}</Typography>
                    </Box>
                    <Typography variant="body2" fontWeight={600} color="success.main">
                      {signal.dailyChangePercent && signal.dailyChangePercent >= 0 ? '+' : ''}
                      {(signal.dailyChangePercent ?? 0 * 100).toFixed(2)}%
                    </Typography>
                  </Box>
                ))}
              </Stack>
            )}
          </OverviewCard>
        </Grid>

        {/* Smart Money Flows */}
        <Grid item xs={12} lg={6}>
          <OverviewCard 
            title="Smart Money Accumulation" 
            icon={<AccountTreeOutlined color="info" />}
            link="/smart-money"
            linkLabel="View All Flows"
          >
            {topSmartMoney.length === 0 ? (
              <Typography color="text.secondary">Insufficient data for smart money inference.</Typography>
            ) : (
              <Stack spacing={1.5}>
                {topSmartMoney.map((stock) => (
                  <Box key={stock.instrumentId} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography fontWeight={700}>{stock.symbol}</Typography>
                      <Typography variant="caption" color="text.secondary">{stock.sector || 'Unknown Sector'}</Typography>
                    </Box>
                    <Chip label={`Score: ${stock.smartMoneyScore}`} size="small" variant="outlined" />
                  </Box>
                ))}
              </Stack>
            )}
          </OverviewCard>
        </Grid>

        {/* Market Context */}
        <Grid item xs={12} lg={6}>
          <OverviewCard 
            title="Market Context Pulse" 
            icon={<PublicOutlined color="warning" />}
            link="/market-context"
            linkLabel="Explore Context"
          >
            <Stack spacing={2}>
              <Box>
                <Typography variant="body2" fontWeight={700}>Current Regime</Typography>
                <Typography variant="body2" color="text.secondary">{marketRegime.explanation}</Typography>
              </Box>
              <Divider />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Breadth Readiness</Typography>
                <Typography variant="body2" fontWeight={700}>EVALUATED</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Sector Leadership</Typography>
                <Typography variant="body2" fontWeight={700}>STABLE</Typography>
              </Box>
            </Stack>
          </OverviewCard>
        </Grid>
      </Grid>
    </Box>
  );
};

const OverviewCard: React.FC<{ 
  title: string; 
  icon: React.ReactNode; 
  children: React.ReactNode; 
  link: string;
  linkLabel: string;
}> = ({ title, icon, children, link, linkLabel }) => (
  <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
      {icon}
      <Typography variant="h6">{title}</Typography>
    </Stack>
    <Box sx={{ flexGrow: 1 }}>
      {children}
    </Box>
    <Button 
      component={Link} 
      to={link} 
      size="small" 
      sx={{ mt: 2, alignSelf: 'flex-start' }}
      endIcon={<ArrowForwardOutlined fontSize="small" />}
    >
      {linkLabel}
    </Button>
  </Paper>
);

export default ResearchOverviewPage;
