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
  LinearProgress
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  AccountBalance,
  ShowChart,
  Timeline,
  CompareArrows,
  Insights,
  School,
  Analytics,
  Warning,
  Refresh,
  PlayArrow,
  Assessment
} from '@mui/icons-material';
import { useState, useEffect } from 'react';
import {
  fetchSmartMoneyIndicators,
  type SmartMoneyIndicator
} from '../services/smartMoneyService';
import {
  runScan,
  type ScanRunResponse,
  type ScanResultItem,
} from '../services/scannerService';
import {
  runBacktestFromScan,
} from '../services/backtestService';

const SmartMoneyPage = () => {
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [backtesting, setBacktesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [indicators, setIndicators] = useState<SmartMoneyIndicator[]>([]);
  const [signals, setSignals] = useState<ScanResultItem[]>([]);
  const [scanRunId, setScanRunId] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toISOString());
  const [backtestResult, setBacktestResult] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [indicatorsResponse] = await Promise.all([
        fetchSmartMoneyIndicators()
      ]);

      setIndicators(indicatorsResponse.data);
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

  const handleRunScan = async () => {
    setScanning(true);
    setError(null);
    setBacktestResult(null);
    try {
      const result: ScanRunResponse = await runScan();
      setSignals(result.results);
      setScanRunId(result.id);
      setLastUpdated(new Date().toISOString());
    } catch (err) {
      setError('Failed to run scan. Please try again.');
      console.error('Error running scan:', err);
    } finally {
      setScanning(false);
    }
  };

  const handleBacktestScan = async () => {
    if (!scanRunId) return;
    setBacktesting(true);
    setError(null);
    try {
      const result = await runBacktestFromScan(scanRunId);
      setBacktestResult(`Backtest completed: ${result.symbols.length} symbols, config ${result.configId}`);
      console.log('Backtest result:', result);
    } catch (err) {
      setError('Failed to run backtest from scan. Please try again.');
      console.error('Error running backtest from scan:', err);
    } finally {
      setBacktesting(false);
    }
  };

  if (loading && indicators.length === 0) {
    return (
      <Container maxWidth="xl" sx={{ py: 8, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={60} sx={{ mb: 3 }} />
          <Typography variant="h6" color="text.secondary">
            Loading Smart Money Dashboard...
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Analyzing price and volume patterns for smart money signals
          </Typography>
        </Box>
      </Container>
    );
  }

  // Get signal color based on type
  const getSignalColor = (type: string) => {
    switch (type) {
      case 'positive': return 'success';
      case 'warning': return 'warning';
      case 'negative': return 'error';
      default: return 'info';
    }
  };

  // Get signal icon based on type
  const getSignalIcon = (type: string) => {
    switch (type) {
      case 'positive': return <TrendingUp />;
      case 'warning': return <Warning />;
      case 'negative': return <TrendingDown />;
      default: return <CompareArrows />;
    }
  };

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
              Smart Money Signals
            </Typography>
            <Typography variant="h6" color="text.secondary" paragraph sx={{ fontSize: { xs: 'body1', md: 'h6' } }}>
              Detect institutional activity through price and volume patterns - no misleading claims, just observable market behavior
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} sx={{ alignSelf: { xs: 'stretch', md: 'flex-start' } }}>
            <Button
              variant="contained"
              startIcon={scanning ? <CircularProgress size={20} color="inherit" /> : <PlayArrow />}
              onClick={handleRunScan}
              disabled={scanning}
            >
              {scanning ? 'Scanning...' : 'Run Scan'}
            </Button>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={handleRefresh}
              disabled={loading}
            >
              {loading ? 'Refreshing...' : 'Refresh Data'}
            </Button>
          </Stack>
        </Box>
        
        <Stack
          direction="row"
          spacing={2}
          sx={{ mt: 2, flexWrap: 'wrap', gap: 1 }}
        >
          <Chip icon={<AccountBalance />} label="Volume + Price Analysis" color="primary" variant="outlined" size="small" />
          <Chip icon={<ShowChart />} label="No Fake Metrics" color="secondary" variant="outlined" size="small" />
          <Chip icon={<Insights />} label="Explainable Signals" color="success" variant="outlined" size="small" />
          <Chip icon={<School />} label="Educational Focus" color="info" variant="outlined" size="small" />
          <Chip
            icon={<Timeline />}
            label={`Updated: ${new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
            color="default"
            variant="outlined"
            size="small"
          />
          {scanRunId && (
            <Chip
              icon={<Assessment />}
              label={`Scan: ${scanRunId.slice(0, 8)}...`}
              color="primary"
              size="small"
            />
          )}
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mt: 3 }}>
            {error}
          </Alert>
        )}

        {backtestResult && (
          <Alert severity="success" sx={{ mt: 2 }}>
            {backtestResult}
          </Alert>
        )}
      </Box>

      {loading && indicators.length > 0 && (
        <LinearProgress sx={{ mb: 3 }} />
      )}

      {/* Educational Note */}
      <Card sx={{ mb: 4, bgcolor: 'info.light' }}>
        <CardContent>
          <Grid container alignItems="center" spacing={2}>
            <Grid item xs={12} md={1}>
              <School sx={{ fontSize: 40, color: 'info.main' }} />
            </Grid>
            <Grid item xs={12} md={11}>
              <Typography variant="h6" gutterBottom>
                What is "Smart Money" in this context?
              </Typography>
              <Typography variant="body2">
                Unlike traditional claims of "institutional flow data", this dashboard uses observable market behavior
                (price movements + volume patterns) as a proxy for institutional activity. We avoid misleading metrics
                like "block trades" or "options activity" which are often unverifiable. Instead, we focus on patterns
                that suggest accumulation (price ↑ + volume ↑) or distribution (price ↓ + volume ↑).
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Main Dashboard Grid */}
      <Grid container spacing={4}>
        {/* Left Column: Key Indicators */}
        <Grid item xs={12} md={6}>
          <Card sx={{ mb: 4, height: '100%' }}>
            <CardHeader
              title="Smart Money Indicators"
              subheader="Based on observable price + volume patterns"
              avatar={<Analytics color="primary" />}
            />
            <CardContent>
              <Typography variant="body2" color="text.secondary" paragraph>
                These indicators use publicly available data to detect patterns that often precede market moves.
                All values are computed from actual market data, not claimed institutional access.
              </Typography>
              
              <Grid container spacing={2}>
                {indicators.map((indicator) => (
                  <Grid item xs={12} md={6} key={indicator.indicator}>
                    <Paper sx={{ p: 2, height: '100%' }}>
                      <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                        {indicator.indicator}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'baseline', mb: 1 }}>
                        <Typography variant="h4" fontWeight="bold">
                          {indicator.value}
                        </Typography>
                        {indicator.unit && (
                          <Typography variant="body2" color="text.secondary" sx={{ ml: 0.5 }}>
                            {indicator.unit}
                          </Typography>
                        )}
                      </Box>
                      <Stack direction="row" alignItems="center" spacing={0.5}>
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
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        {indicator.description}
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>

          {/* Methodology */}
          <Card>
            <CardHeader
              title="Methodology & Data Sources"
              avatar={<School color="info" />}
            />
            <CardContent>
              <Typography variant="body2" paragraph>
                This dashboard uses the following approach to detect smart money patterns:
              </Typography>
              
              <Stack spacing={1}>
                <Chip label="Volume Ratio = Current Volume / 20-day Average" size="small" variant="outlined" />
                <Chip label="Accumulation = Price ↑ + Volume Ratio > 1.5" size="small" variant="outlined" />
                <Chip label="Distribution = Price ↓ + Volume Ratio > 1.5" size="small" variant="outlined" />
                <Chip label="Momentum = % of sectors with positive performance" size="small" variant="outlined" />
              </Stack>
              
              <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                Data sources: Historical price and volume data from database.
                All indicators computed from observable market data — no paid APIs or unverifiable claims.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Right Column: Signals & Insights */}
        <Grid item xs={12} md={6}>
          {/* Active Signals */}
          <Card sx={{ mb: 4 }}>
            <CardHeader
              title="Active Smart Money Signals"
              subheader="Detected patterns with explanations"
              avatar={<Insights color="warning" />}
              action={
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip label={`${signals.length} Signals`} size="small" color="primary" />
                  {scanRunId && signals.length > 0 && (
                    <Button
                      variant="contained"
                      size="small"
                      color="secondary"
                      startIcon={backtesting ? <CircularProgress size={16} color="inherit" /> : <Assessment />}
                      onClick={handleBacktestScan}
                      disabled={backtesting}
                    >
                      {backtesting ? 'Running...' : 'Backtest This Scan'}
                    </Button>
                  )}
                </Stack>
              }
            />
            <CardContent>
              {signals.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body1" color="text.secondary" gutterBottom>
                    No scan results yet
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Click "Run Scan" above to generate smart money signals
                  </Typography>
                </Box>
              ) : (
                <Stack spacing={3}>
                  {signals.map((signal) => (
                    <Paper 
                      key={signal.id}
                      elevation={0} 
                      sx={{ 
                        p: 2, 
                        borderLeft: `4px solid`,
                        borderColor: `${getSignalColor(signal.signalType)}.main`,
                        backgroundColor: `${getSignalColor(signal.signalType)}.light`,
                        borderRadius: 2 
                      }}
                    >
                      <Stack direction="row" spacing={2} alignItems="flex-start">
                        <Box sx={{ mt: 0.5 }}>
                          {getSignalIcon(signal.signalType)}
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                            <Typography variant="subtitle2" fontWeight="bold">
                              {signal.description}
                            </Typography>
                            <Chip 
                              label={`Strength: ${(signal.strength * 100).toFixed(0)}%`}
                              size="small"
                              color={getSignalColor(signal.signalType) as any}
                              variant="outlined"
                            />
                          </Stack>
                          <Typography variant="body2" sx={{ mt: 0.5 }}>
                            {signal.description}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                            <strong>Explanation:</strong> {signal.explanation}
                          </Typography>
                          <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', gap: 0.5 }}>
                            {signal.stocks.map((stock) => (
                              <Chip 
                                key={stock}
                                label={stock}
                                size="small"
                                variant="outlined"
                              />
                            ))}
                          </Stack>
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                            Detected: {new Date(signal.timestamp).toLocaleString()}
                          </Typography>
                        </Box>
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>

          {/* Key Takeaways */}
          <Card>
            <CardHeader
              title="Key Takeaways & Interpretation"
              avatar={<CompareArrows color="secondary" />}
            />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.light' }}>
                    <TrendingUp color="success" sx={{ fontSize: 40, mb: 1 }} />
                    <Typography variant="subtitle2" fontWeight="bold">
                      Bullish Signals
                    </Typography>
                    <Typography variant="body2">
                      Volume spikes with price increases suggest accumulation
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.light' }}>
                    <Warning color="warning" sx={{ fontSize: 40, mb: 1 }} />
                    <Typography variant="subtitle2" fontWeight="bold">
                      Caution Signals
                    </Typography>
                    <Typography variant="body2">
                      High volume with price declines may indicate distribution
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
              
              <Divider sx={{ my: 3 }} />
              
              <Typography variant="body2" paragraph>
                <strong>How to use this information:</strong> Smart money signals are one piece of the puzzle.
                Combine with sector analysis, macroeconomic context, and your own research before making
                investment decisions.
              </Typography>
              
              <Typography variant="caption" color="text.secondary">
                Remember: These are proxies for institutional activity, not direct measurements.
                All investment involves risk, and past patterns don't guarantee future results.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Footer Note */}
      <Box sx={{ mt: 6, textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          All indicators computed from actual market data — transparent, verifiable, and data-driven.
        </Typography>
      </Box>
    </Container>
  );
};

export default SmartMoneyPage;
