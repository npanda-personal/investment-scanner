import {
  Box,
  Typography,
  Grid,
  Paper,
  Container,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Chip,
  Stack,
  Button,
  CircularProgress,
  Alert,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Analytics,
  Timeline,
  Refresh,
  Warning,
  CheckCircle,
  Error
} from '@mui/icons-material';
import { useState, useEffect } from 'react';
import {
  fetchMacroIndicators,
  fetchEconomicCycle,
  type MacroIndicator,
  type EconomicCyclePhase
} from '../services/smartMoneyService';

// Risk-on vs risk-off assessment
const RISK_ASSESSMENT = {
  'risk-on': {
    label: 'Risk-On Environment',
    color: 'success',
    description: 'Investors are favoring growth assets (stocks, commodities)',
    indicators: ['Low VIX', 'Rising stock markets', 'Strong economic data']
  },
  'risk-off': {
    label: 'Risk-Off Environment',
    color: 'warning',
    description: 'Investors are favoring safe-haven assets (bonds, gold, cash)',
    indicators: ['High VIX', 'Falling stock markets', 'Weak economic data']
  },
  'neutral': {
    label: 'Neutral Environment',
    color: 'info',
    description: 'Mixed signals with no clear risk direction',
    indicators: ['Moderate VIX', 'Sideways markets', 'Mixed economic data']
  }
};

const MacroPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [macroIndicators, setMacroIndicators] = useState<MacroIndicator[]>([]);
  const [economicCycle, setEconomicCycle] = useState<EconomicCyclePhase[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toISOString());

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [macroResponse, cycleResponse] = await Promise.all([
        fetchMacroIndicators(),
        fetchEconomicCycle()
      ]);

      setMacroIndicators(macroResponse.data);
      setEconomicCycle(cycleResponse.data);
      setLastUpdated(new Date().toISOString());
    } catch (err) {
      setError('Failed to load macroeconomic data. Please try again later.');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    loadData();
  };

  // Determine risk environment based on indicators
  const determineRiskEnvironment = () => {
    if (macroIndicators.length === 0) return 'neutral';
    
    const vixIndicator = macroIndicators.find(ind => ind.name.includes('VIX'));
    const gdpIndicator = macroIndicators.find(ind => ind.name.includes('GDP'));
    
    let riskScore = 0;
    
    if (vixIndicator) {
      // VIX below 20 suggests risk-on, above 25 suggests risk-off
      if (vixIndicator.value < 20) riskScore += 1;
      else if (vixIndicator.value > 25) riskScore -= 1;
    }
    
    if (gdpIndicator) {
      // GDP growth above 2% suggests risk-on
      if (gdpIndicator.value > 2) riskScore += 1;
      else if (gdpIndicator.value < 1) riskScore -= 1;
    }
    
    if (riskScore > 0) return 'risk-on';
    if (riskScore < 0) return 'risk-off';
    return 'neutral';
  };

  // Get current economic cycle phase
  const getCurrentCyclePhase = () => {
    return economicCycle.find(phase => phase.currentPhase) || economicCycle[0];
  };

  if (loading && macroIndicators.length === 0) {
    return (
      <Container maxWidth="xl" sx={{ py: 8, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={60} sx={{ mb: 3 }} />
          <Typography variant="h6" color="text.secondary">
            Loading Macroeconomic Dashboard...
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Fetching economic indicators and cycle data
          </Typography>
        </Box>
      </Container>
    );
  }

  const riskEnvironment = determineRiskEnvironment();
  const currentCycle = getCurrentCyclePhase();
  const riskConfig = RISK_ASSESSMENT[riskEnvironment as keyof typeof RISK_ASSESSMENT];

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 } }}>
      {/* Page Header */}
      <Box sx={{ mb: { xs: 4, md: 6 } }}>
        <Box sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', md: 'flex-start' },
          mb: 2,
          gap: 2
        }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h3" gutterBottom fontWeight="bold" sx={{ fontSize: { xs: 'h4', md: 'h3' } }}>
              Macroeconomic Indicators
            </Typography>
            <Typography variant="h6" color="text.secondary" paragraph sx={{ fontSize: { xs: 'body1', md: 'h6' } }}>
              Monitor key economic metrics, assess risk environment, and understand market context
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={handleRefresh}
            disabled={loading}
            sx={{ alignSelf: { xs: 'stretch', md: 'flex-start' } }}
          >
            {loading ? 'Refreshing...' : 'Refresh Data'}
          </Button>
        </Box>
        
        <Stack
          direction="row"
          spacing={2}
          sx={{ mt: 2, flexWrap: 'wrap', gap: 1 }}
        >
          <Chip 
            icon={riskEnvironment === 'risk-on' ? <TrendingUp /> : riskEnvironment === 'risk-off' ? <Warning /> : <Analytics />}
            label={riskConfig.label}
            color={riskConfig.color as any}
            variant="outlined"
            size="small"
          />
          <Chip icon={<Timeline />} label="Economic Cycle" color="secondary" variant="outlined" size="small" />
          <Chip icon={<Analytics />} label="Key Indicators" color="primary" variant="outlined" size="small" />
          <Chip
            icon={<Timeline />}
            label={`Updated: ${new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
            color="default"
            variant="outlined"
            size="small"
          />
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mt: 3 }}>
            {error}
          </Alert>
        )}
      </Box>

      {loading && macroIndicators.length > 0 && (
        <LinearProgress sx={{ mb: 3 }} />
      )}

      {/* Risk Assessment Banner */}
      <Card sx={{ mb: 4, bgcolor: `${riskConfig.color}.light` }}>
        <CardContent>
          <Grid container alignItems="center" spacing={2}>
            <Grid item xs={12} md={8}>
              <Typography variant="h5" gutterBottom>
                {riskConfig.label}
              </Typography>
              <Typography variant="body1" paragraph>
                {riskConfig.description}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                {riskConfig.indicators.map((indicator, index) => (
                  <Chip
                    key={index}
                    label={indicator}
                    size="small"
                    variant="outlined"
                  />
                ))}
              </Stack>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ textAlign: 'center' }}>
                {riskEnvironment === 'risk-on' && <TrendingUp sx={{ fontSize: 80, color: 'success.main' }} />}
                {riskEnvironment === 'risk-off' && <Warning sx={{ fontSize: 80, color: 'warning.main' }} />}
                {riskEnvironment === 'neutral' && <Analytics sx={{ fontSize: 80, color: 'info.main' }} />}
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Main Dashboard Grid */}
      <Grid container spacing={4}>
        {/* Left Column: Economic Cycle */}
        <Grid item xs={12} md={4}>
          <Card sx={{ mb: 4, height: '100%' }}>
            <CardHeader
              title="Economic Cycle"
              avatar={<Timeline color="secondary" />}
            />
            <CardContent>
              <Typography variant="body2" paragraph>
                The economy moves through predictable phases, each favoring different sectors.
              </Typography>
              
              <Stack spacing={2}>
                {economicCycle.map((phase) => (
                  <Paper
                    key={phase.phase}
                    elevation={phase.currentPhase ? 3 : 0}
                    sx={{
                      p: 2,
                      borderLeft: `4px solid ${phase.color}`,
                      backgroundColor: phase.currentPhase ? 'action.selected' : 'background.default',
                      border: phase.currentPhase ? `1px solid ${phase.color}` : 'none'
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {phase.phase}
                        {phase.currentPhase && (
                          <Chip label="Current" size="small" color="primary" sx={{ ml: 1 }} />
                        )}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {phase.description}
                    </Typography>
                    <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                      <strong>Leading sectors:</strong> {phase.leadingSectors.join(', ')}
                    </Typography>
                    <Typography variant="caption" display="block">
                      <strong>Typical duration:</strong> {phase.durationMonths} months
                    </Typography>
                  </Paper>
                ))}
              </Stack>
            </CardContent>
          </Card>

          {/* Market Context */}
          <Card>
            <CardHeader
              title="Market Context"
              avatar={<Analytics color="info" />}
            />
            <CardContent>
              <Typography variant="body2" paragraph>
                Current market conditions based on macroeconomic indicators:
              </Typography>
              
              <Stack spacing={1}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Risk Appetite:</Typography>
                  <Chip 
                    label={riskEnvironment === 'risk-on' ? 'High' : riskEnvironment === 'risk-off' ? 'Low' : 'Moderate'}
                    size="small"
                    color={riskEnvironment === 'risk-on' ? 'success' : riskEnvironment === 'risk-off' ? 'warning' : 'info'}
                  />
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Economic Phase:</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {currentCycle?.phase || 'N/A'}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Indicator Health:</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {macroIndicators.filter(ind => ind.trend === 'up').length > macroIndicators.length / 2 ? (
                      <>
                        <CheckCircle fontSize="small" color="success" />
                        <Typography variant="body2" color="success.main" sx={{ ml: 0.5 }}>
                          Mostly Positive
                        </Typography>
                      </>
                    ) : (
                      <>
                        <Error fontSize="small" color="warning" />
                        <Typography variant="body2" color="warning.main" sx={{ ml: 0.5 }}>
                          Mixed
                        </Typography>
                      </>
                    )}
                  </Box>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Right Column: Macro Indicators Table */}
        <Grid item xs={12} md={8}>
          <Card sx={{ mb: 4 }}>
            <CardHeader
              title="Key Macroeconomic Indicators"
              subheader="Real-time economic data for market context"
              avatar={<Analytics color="primary" />}
            />
            <CardContent>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Indicator</TableCell>
                      <TableCell align="right">Current Value</TableCell>
                      <TableCell align="right">Change</TableCell>
                      <TableCell align="right">Trend</TableCell>
                      <TableCell align="right">Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {macroIndicators.map((indicator) => {
                      const isInTargetRange = indicator.value >= indicator.targetRange.min && 
                                              indicator.value <= indicator.targetRange.max;
                      return (
                        <TableRow key={indicator.name}>
                          <TableCell>
                            <Box>
                              <Typography variant="subtitle2">{indicator.name}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {indicator.description}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body1" fontWeight="bold">
                              {indicator.value}{indicator.unit}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography 
                              variant="body2" 
                              color={indicator.change > 0 ? 'success.main' : indicator.change < 0 ? 'error.main' : 'text.secondary'}
                            >
                              {indicator.change > 0 ? '+' : ''}{indicator.change}{indicator.unit}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            {indicator.trend === 'up' && <TrendingUp fontSize="small" color="success" />}
                            {indicator.trend === 'down' && <TrendingDown fontSize="small" color="error" />}
                            {indicator.trend === 'stable' && <Timeline fontSize="small" color="info" />}
                          </TableCell>
                          <TableCell align="right">
                            <Chip
                              label={isInTargetRange ? 'Normal' : 'Outside Range'}
                              size="small"
                              color={isInTargetRange ? 'success' : 'warning'}
                              variant="outlined"
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
              
              <Divider sx={{ my: 3 }} />
              
              {/* Indicator Summary */}
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary">
                      Positive Trends
                    </Typography>
                    <Typography variant="h4" color="success.main">
                      {macroIndicators.filter(ind => ind.trend === 'up').length}
                    </Typography>
                    <Typography variant="caption">
                      of {macroIndicators.length} indicators
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary">
                      In Target Range
                    </Typography>
                    <Typography variant="h4" color="info.main">
                      {macroIndicators.filter(ind => 
                        ind.value >= ind.targetRange.min && ind.value <= ind.targetRange.max
                      ).length}
                    </Typography>
                    <Typography variant="caption">
                      of {macroIndicators.length} indicators
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary">
                      Risk Level
                    </Typography>
                    <Typography variant="h4" color={
                      riskEnvironment === 'risk-on' ? 'success.main' : 
                      riskEnvironment === 'risk-off' ? 'warning.main' : 'info.main'
                    }>
                      {riskEnvironment === 'risk-on' ? 'Low' : 
                       riskEnvironment === 'risk-off' ? 'High' : 'Medium'}
                    </Typography>
                    <Typography variant="caption">
                      Market Risk
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Data Sources & Notes */}
          <Card>
            <CardHeader
              title="Data Sources & Methodology"
            />
            <CardContent>
              <Typography variant="body2" paragraph>
                This dashboard uses publicly available economic data to provide market context.
                Data is sourced from FRED API, Yahoo Finance, and public economic reports.
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Note: Macro indicators are lagging indicators and should be used as context
                rather than precise timing signals. Always consider multiple data points
                when making investment decisions.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Footer Note */}
      <Box sx={{ mt: 6, textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          Note: Macroeconomic data provides context for investment decisions but should not
          be used as the sole basis for investment decisions. Consider multiple data sources
          and consult with financial professionals when appropriate.
        </Typography>
      </Box>
    </Container>
  );
};

export default MacroPage;