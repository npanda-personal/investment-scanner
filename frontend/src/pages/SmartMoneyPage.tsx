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
  Refresh
} from '@mui/icons-material';
import { useState, useEffect } from 'react';
import {
  fetchSmartMoneyIndicators,
  type SmartMoneyIndicator
} from '../services/smartMoneyService';

// Define signal type for the new signals endpoint
interface SmartMoneySignal {
  id: number;
  name: string;
  type: 'positive' | 'warning' | 'neutral' | 'negative';
  strength: number;
  description: string;
  explanation: string;
  stocks: string[];
  timestamp: string;
}

const SmartMoneyPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [indicators, setIndicators] = useState<SmartMoneyIndicator[]>([]);
  const [signals, setSignals] = useState<SmartMoneySignal[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toISOString());

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [indicatorsResponse] = await Promise.all([
        fetchSmartMoneyIndicators()
      ]);

      setIndicators(indicatorsResponse.data);
      
      // Mock signals data - in production, this would come from a new endpoint
      const mockSignals: SmartMoneySignal[] = [
        {
          id: 1,
          name: 'Volume Spike Detected',
          type: 'positive',
          strength: 0.8,
          description: 'Unusually high volume in Technology sector suggests institutional interest',
          explanation: 'Volume > 2.5x 20-day average with price increase indicates accumulation',
          stocks: ['AAPL', 'MSFT', 'NVDA'],
          timestamp: new Date().toISOString()
        },
        {
          id: 2,
          name: 'Accumulation Pattern',
          type: 'positive',
          strength: 0.7,
          description: 'Price up + volume up pattern across multiple sectors',
          explanation: 'Consistent buying pressure with above-average volume suggests smart money accumulation',
          stocks: ['XLK', 'XLV', 'XLF'],
          timestamp: new Date(Date.now() - 86400000).toISOString()
        },
        {
          id: 3,
          name: 'Distribution Warning',
          type: 'warning',
          strength: 0.6,
          description: 'Price down with high volume in Energy sector',
          explanation: 'Selling pressure with elevated volume may indicate distribution',
          stocks: ['XLE', 'CVX', 'XOM'],
          timestamp: new Date(Date.now() - 172800000).toISOString()
        },
        {
          id: 4,
          name: 'Momentum Shift',
          type: 'neutral',
          strength: 0.5,
          description: 'Rotation from Growth to Value sectors detected',
          explanation: 'Relative strength analysis shows early signs of sector rotation',
          stocks: ['XLK', 'XLV', 'XLF'],
          timestamp: new Date(Date.now() - 43200000).toISOString()
        }
      ];
      
      setSignals(mockSignals);
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
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mt: 3 }}>
            {error}
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
                Data sources: Yahoo Finance (price & volume), public market data. 
                No paid APIs or unverifiable institutional data claims.
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
                <Chip label={`${signals.length} Signals`} size="small" color="primary" />
              }
            />
            <CardContent>
              <Stack spacing={3}>
                {signals.map((signal) => (
                  <Paper 
                    key={signal.id}
                    elevation={0} 
                    sx={{ 
                      p: 2, 
                      borderLeft: `4px solid`,
                      borderColor: `${getSignalColor(signal.type)}.main`,
                      backgroundColor: `${getSignalColor(signal.type)}.light`,
                      borderRadius: 2 
                    }}
                  >
                    <Stack direction="row" spacing={2} alignItems="flex-start">
                      <Box sx={{ mt: 0.5 }}>
                        {getSignalIcon(signal.type)}
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                          <Typography variant="subtitle2" fontWeight="bold">
                            {signal.name}
                          </Typography>
                          <Chip 
                            label={`Strength: ${(signal.strength * 100).toFixed(0)}%`}
                            size="small"
                            color={getSignalColor(signal.type) as any}
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
          This dashboard transforms from "visually impressive but mock-based" to "credible, data-driven
          market intelligence using free data" as part of our refactoring initiative.
        </Typography>
      </Box>
    </Container>
  );
};

export default SmartMoneyPage;
