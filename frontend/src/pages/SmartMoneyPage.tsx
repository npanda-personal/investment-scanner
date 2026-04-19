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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  ToggleButton,
  ToggleButtonGroup,
  CircularProgress,
  Alert,
  LinearProgress
} from '@mui/material';
import { 
  TrendingUp, 
  TrendingDown, 
  AccountBalance, 
  ShowChart, 
  Timeline, 
  CompareArrows,
  FilterAlt,
  Insights,
  School,
  Analytics,
  Warning,
  Refresh
} from '@mui/icons-material';
import { useState, useEffect } from 'react';
import {
  fetchSectorPerformance,
  fetchSmartMoneyIndicators,
  fetchEconomicCycle,
  fetchActionableInsights,
  fetchMacroIndicators,
  getPerformanceColor,
  formatLargeNumber,
  type SectorPerformance,
  type SmartMoneyIndicator,
  type EconomicCyclePhase,
  type ActionableInsight,
  type MacroIndicator
} from '../services/smartMoneyService';

const SmartMoneyPage = () => {
  const [timeFrame, setTimeFrame] = useState('weekly');
  const [assetClass, setAssetClass] = useState('equities');
  const [selectedSectors, setSelectedSectors] = useState<string[]>(['Technology', 'Financials']);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sectorPerformance, setSectorPerformance] = useState<SectorPerformance[]>([]);
  const [indicators, setIndicators] = useState<SmartMoneyIndicator[]>([]);
  const [economicCycle, setEconomicCycle] = useState<EconomicCyclePhase[]>([]);
  const [insights, setInsights] = useState<ActionableInsight[]>([]);
  const [macroIndicators, setMacroIndicators] = useState<MacroIndicator[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toISOString());

  const handleTimeFrameChange = (event: SelectChangeEvent) => {
    setTimeFrame(event.target.value);
  };

  const handleAssetClassChange = (event: SelectChangeEvent) => {
    setAssetClass(event.target.value);
  };

  const handleSectorChange = (
    _event: React.MouseEvent<HTMLElement>,
    newSectors: string[],
  ) => {
    setSelectedSectors(newSectors);
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        sectorResponse,
        indicatorsResponse,
        economicCycleResponse,
        insightsResponse,
        macroResponse
      ] = await Promise.all([
        fetchSectorPerformance(timeFrame),
        fetchSmartMoneyIndicators(),
        fetchEconomicCycle(),
        fetchActionableInsights(),
        fetchMacroIndicators()
      ]);

      setSectorPerformance(sectorResponse.data);
      setIndicators(indicatorsResponse.data);
      setEconomicCycle(economicCycleResponse.data);
      setInsights(insightsResponse.data);
      setMacroIndicators(macroResponse.data);
      setLastUpdated(new Date().toISOString());
    } catch (err) {
      setError('Failed to load smart money data. Please try again later.');
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

  if (loading && sectorPerformance.length === 0) {
    return (
      <Container maxWidth="xl" sx={{ py: 8, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={60} sx={{ mb: 3 }} />
          <Typography variant="h6" color="text.secondary">
            Loading Smart Money Dashboard...
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Fetching institutional flow data and sector performance
          </Typography>
        </Box>
      </Container>
    );
  }

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
              Smart Money & Sector Rotation Dashboard
            </Typography>
            <Typography variant="h6" color="text.secondary" paragraph sx={{ fontSize: { xs: 'body1', md: 'h6' } }}>
              Track institutional capital flows, identify sector rotation patterns, and make data-driven investment decisions
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
          <Chip icon={<AccountBalance />} label="Institutional Flow" color="primary" variant="outlined" size="small" />
          <Chip icon={<ShowChart />} label="Sector Rotation" color="secondary" variant="outlined" size="small" />
          <Chip icon={<Insights />} label="Actionable Insights" color="success" variant="outlined" size="small" />
          <Chip icon={<School />} label="Educational Resources" color="info" variant="outlined" size="small" />
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

      {loading && sectorPerformance.length > 0 && (
        <LinearProgress sx={{ mb: 3 }} />
      )}

      {/* Main Dashboard Grid */}
      <Grid container spacing={4}>
        
        {/* Left Column: Educational Modules and Controls */}
        <Grid item xs={12} md={4}>
          {/* Educational Module: Smart Money Concepts */}
          <Card sx={{ mb: 4 }}>
            <CardHeader 
              title="What is Smart Money?" 
              avatar={<School color="primary" />}
            />
            <CardContent>
              <Typography variant="body1" paragraph>
                <strong>Smart Money</strong> refers to institutional investors, hedge funds, insiders, and other sophisticated market participants whose investment decisions often precede market movements.
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                  Key Characteristics:
                </Typography>
                <ul style={{ paddingLeft: '20px', margin: 0 }}>
                  <li><Typography variant="body2">Large capital allocation capacity</Typography></li>
                  <li><Typography variant="body2">Access to proprietary research and data</Typography></li>
                  <li><Typography variant="body2">Long-term investment horizon</Typography></li>
                  <li><Typography variant="body2">Influence on market sentiment and prices</Typography></li>
                </ul>
              </Box>
            </CardContent>
          </Card>

          {/* Educational Module: Sector Rotation */}
          <Card sx={{ mb: 4 }}>
            <CardHeader 
              title="Sector Rotation Strategy" 
              avatar={<CompareArrows color="secondary" />}
            />
            <CardContent>
              <Typography variant="body1" paragraph>
                <strong>Sector Rotation</strong> is an investment strategy that involves shifting capital among different economic sectors based on their expected performance during various phases of the economic cycle.
              </Typography>
              
              <Typography variant="subtitle2" gutterBottom fontWeight="bold" sx={{ mt: 2 }}>
                Economic Cycle Phases:
              </Typography>
              
              <Grid container spacing={2}>
                {economicCycle.map((phase) => (
                  <Grid item xs={12} key={phase.phase}>
                    <Paper 
                      elevation={0} 
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
                        Leading: {phase.leadingSectors.join(', ')}
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>

          {/* Analytical Tools Controls */}
          <Card>
            <CardHeader 
              title="Analytical Tools" 
              avatar={<FilterAlt color="action" />}
            />
            <CardContent>
              <Stack spacing={3}>
                {/* Time Frame Filter */}
                <FormControl fullWidth>
                  <InputLabel>Time Frame</InputLabel>
                  <Select
                    value={timeFrame}
                    label="Time Frame"
                    onChange={handleTimeFrameChange}
                  >
                    <MenuItem value="intraday">Intraday</MenuItem>
                    <MenuItem value="daily">Daily</MenuItem>
                    <MenuItem value="weekly">Weekly</MenuItem>
                    <MenuItem value="monthly">Monthly</MenuItem>
                    <MenuItem value="quarterly">Quarterly</MenuItem>
                  </Select>
                </FormControl>

                {/* Asset Class Filter */}
                <FormControl fullWidth>
                  <InputLabel>Asset Class</InputLabel>
                  <Select
                    value={assetClass}
                    label="Asset Class"
                    onChange={handleAssetClassChange}
                  >
                    <MenuItem value="equities">Equities</MenuItem>
                    <MenuItem value="etfs">ETFs</MenuItem>
                    <MenuItem value="bonds">Bonds</MenuItem>
                    <MenuItem value="commodities">Commodities</MenuItem>
                    <MenuItem value="all">All Asset Classes</MenuItem>
                  </Select>
                </FormControl>

                {/* Sector Selection */}
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Select Sectors to Compare
                  </Typography>
                  <ToggleButtonGroup
                    value={selectedSectors}
                    onChange={handleSectorChange}
                    aria-label="sector selection"
                    sx={{ flexWrap: 'wrap', gap: 1 }}
                  >
                    {sectorPerformance.map((sector) => (
                      <ToggleButton 
                        key={sector.sector} 
                        value={sector.sector}
                        sx={{ borderRadius: 2 }}
                      >
                        {sector.sector}
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                </Box>

                {/* Benchmark Comparison */}
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Benchmark Comparison
                  </Typography>
                  <Button 
                    variant="outlined" 
                    fullWidth 
                    startIcon={<CompareArrows />}
                    sx={{ justifyContent: 'flex-start' }}
                  >
                    Compare Selected Sectors vs S&P 500
                  </Button>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Center Column: Data Visualizations */}
        <Grid item xs={12} md={5}>
          {/* Sector Performance Heat Map */}
          <Card sx={{ mb: 4, height: '100%' }}>
            <CardHeader 
              title="Sector Performance & Money Flow" 
              subheader={`${timeFrame.charAt(0).toUpperCase() + timeFrame.slice(1)} view`}
              avatar={<ShowChart color="primary" />}
              action={
                <Chip 
                  label="Live Data" 
                  color="success" 
                  size="small" 
                  icon={<Timeline />}
                />
              }
            />
            <CardContent>
              <Typography variant="body2" color="text.secondary" paragraph>
                Heat map showing sector performance (Y-axis) vs. institutional money flow (bubble size). Green indicates outperformance, red indicates underperformance.
              </Typography>
              
              {/* Heat Map Visualization */}
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', 
                gap: 2,
                mt: 3
              }}>
                {sectorPerformance.map((sector) => (
                  <Paper
                    key={sector.sector}
                    elevation={2}
                    sx={{
                      p: 2,
                      textAlign: 'center',
                      backgroundColor: getPerformanceColor(sector.performance),
                      border: `2px solid ${sector.color}`,
                      borderRadius: 2,
                      transition: 'transform 0.2s',
                      '&:hover': {
                        transform: 'scale(1.05)',
                      }
                    }}
                  >
                    <Typography variant="subtitle2" fontWeight="bold">
                      {sector.sector}
                    </Typography>
                    <Typography 
                      variant="h6" 
                      color={sector.performance >= 0 ? 'success.main' : 'error.main'}
                      sx={{ my: 1 }}
                    >
                      {sector.performance > 0 ? '+' : ''}{sector.performance.toFixed(1)}%
                    </Typography>
                    <Typography variant="caption" display="block">
                      Flow: {formatLargeNumber(sector.flow)}
                    </Typography>
                    <Box sx={{ 
                      width: '100%', 
                      height: 4, 
                      backgroundColor: 'rgba(0,0,0,0.1)',
                      mt: 1,
                      borderRadius: 2,
                      overflow: 'hidden'
                    }}>
                      <Box sx={{ 
                        width: `${Math.min(Math.abs(sector.performance) * 5, 100)}%`, 
                        height: '100%',
                        backgroundColor: sector.performance >= 0 ? '#4caf50' : '#f44336'
                      }} />
                    </Box>
                  </Paper>
                ))}
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* Smart Money Indicators */}
              <Box>
                <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                  Smart Money Indicators
                </Typography>
                <Grid container spacing={2}>
                  {indicators.slice(0, 4).map((indicator) => (
                    <Grid item xs={6} key={indicator.indicator}>
                      <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {indicator.indicator}
                        </Typography>
                        <Typography variant="h5" fontWeight="bold" sx={{ my: 1 }}>
                          {indicator.value}{indicator.unit || ''}
                        </Typography>
                        <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.5}>
                          {indicator.trend === 'up' ? (
                            <TrendingUp fontSize="small" color="success" />
                          ) : indicator.trend === 'down' ? (
                            <TrendingDown fontSize="small" color="error" />
                          ) : null}
                          <Typography 
                            variant="body2" 
                            color={indicator.trend === 'up' ? 'success.main' : indicator.trend === 'down' ? 'error.main' : 'text.secondary'}
                          >
                            {indicator.change > 0 ? '+' : ''}{indicator.change}%
                          </Typography>
                        </Stack>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </CardContent>
          </Card>

          {/* Actionable Insights */}
          <Card>
            <CardHeader 
              title="Actionable Insights" 
              avatar={<Insights color="warning" />}
              action={
                <Chip label={`${insights.length} Insights`} size="small" color="primary" />
              }
            />
            <CardContent>
              <Stack spacing={3}>
                {insights.map((insight) => (
                  <Paper 
                    key={insight.id}
                    elevation={0} 
                    sx={{ 
                      p: 2, 
                      backgroundColor: 
                        insight.type === 'positive' ? 'success.light' :
                        insight.type === 'warning' ? 'warning.light' :
                        insight.type === 'negative' ? 'error.light' : 'info.light',
                      borderRadius: 2 
                    }}
                  >
                    <Stack direction="row" spacing={1} alignItems="flex-start">
                      {insight.type === 'positive' && <TrendingUp color="success" />}
                      {insight.type === 'warning' && <Warning color="warning" />}
                      {insight.type === 'negative' && <TrendingDown color="error" />}
                      {insight.type === 'neutral' && <CompareArrows color="info" />}
                      <Box>
                        <Typography variant="subtitle2" fontWeight="bold">
                          {insight.title}
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 0.5 }}>
                          {insight.description}
                        </Typography>
                        <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                          <Chip 
                            label={insight.sectors.join(', ')} 
                            size="small" 
                            variant="outlined"
                          />
                          <Typography variant="caption" color="text.secondary">
                            Confidence: {(insight.confidence * 100).toFixed(0)}%
                          </Typography>
                        </Stack>
                      </Box>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
{/* Right Column: Macro Indicators and Additional Data */}
<Grid item xs={12} md={3}>
  {/* Macro Economic Indicators */}
  <Card sx={{ mb: 4 }}>
    <CardHeader
      title="Macro Indicators"
      avatar={<Analytics color="info" />}
    />
    <CardContent>
      <Stack spacing={2}>
        {macroIndicators.map((indicator) => (
          <Paper key={indicator.name} sx={{ p: 2 }}>
            <Typography variant="subtitle2" fontWeight="bold">
              {indicator.name}
            </Typography>
            <Typography variant="h6" color={indicator.trend === 'up' ? 'success.main' : 'error.main'}>
              {indicator.value}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {indicator.description}
            </Typography>
          </Paper>
        ))}
      </Stack>
    </CardContent>
  </Card>

  {/* Data Source Information */}
  <Card>
    <CardHeader
      title="Data Sources"
      subheader="Real-time institutional data"
    />
    <CardContent>
      <Typography variant="body2" paragraph>
        This dashboard aggregates data from multiple institutional sources:
      </Typography>
      <Stack spacing={1}>
        <Chip label="NYSE/NASDAQ Flow" size="small" variant="outlined" />
        <Chip label="Options Activity" size="small" variant="outlined" />
        <Chip label="ETF Creation/Redemption" size="small" variant="outlined" />
        <Chip label="Block Trade Analysis" size="small" variant="outlined" />
      </Stack>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
        Data updated every 15 minutes. Last refresh: {new Date(lastUpdated).toLocaleString()}
      </Typography>
    </CardContent>
  </Card>
</Grid>
</Grid>

{/* Footer Note */}
<Box sx={{ mt: 6, textAlign: 'center' }}>
<Typography variant="caption" color="text.secondary">
  Note: Smart money indicators are lagging indicators and should be used in conjunction with other analysis.
  Past performance does not guarantee future results.
</Typography>
</Box>
</Container>
);
};

export default SmartMoneyPage;
