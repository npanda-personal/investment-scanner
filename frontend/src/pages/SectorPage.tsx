import {
  Box,
  Typography,
  Grid,
  Paper,
  Container,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Stack,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
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
  ShowChart,
  CompareArrows,
  Refresh,
  Timeline,
  Analytics
} from '@mui/icons-material';
import { useState, useEffect } from 'react';
import {
  fetchSectorPerformance,
  fetchRelativeStrength,
  getPerformanceColor,
  type SectorPerformance,
  type RelativeStrengthData
} from '../services/smartMoneyService';

// Sector display configuration with colors
const SECTOR_CONFIG: Record<string, string> = {
  'Technology': '#2196f3',
  'Healthcare': '#4caf50',
  'Financials': '#ff9800',
  'Energy': '#f44336',
  'Consumer Discretionary': '#9c27b0',
  'Industrials': '#3f51b5',
  'Utilities': '#00bcd4',
  'Materials': '#795548',
  'Real Estate': '#607d8b',
  'Communication Services': '#e91e63',
};

const SectorPage = () => {
  const [timeFrame, setTimeFrame] = useState('weekly');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sectorPerformance, setSectorPerformance] = useState<SectorPerformance[]>([]);
  const [relativeStrength, setRelativeStrength] = useState<RelativeStrengthData[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toISOString());

  const handleTimeFrameChange = (event: SelectChangeEvent) => {
    setTimeFrame(event.target.value);
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sectorResponse, strengthResponse] = await Promise.all([
        fetchSectorPerformance(timeFrame),
        fetchRelativeStrength(Object.keys(SECTOR_CONFIG))
      ]);

      setSectorPerformance(sectorResponse.data);
      setRelativeStrength(strengthResponse.data);
      setLastUpdated(new Date().toISOString());
    } catch (err) {
      setError('Failed to load sector data. Please try again later.');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [timeFrame]);

  const handleRefresh = () => {
    loadData();
  };

  if (loading && sectorPerformance.length === 0) {
    return (
      <Container maxWidth="xl" sx={{ py: 8, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={60} sx={{ mb: 3 }} />
          <Typography variant="h6" color="text.secondary">
            Loading Sector Analysis Dashboard...
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Fetching sector performance and relative strength data
          </Typography>
        </Box>
      </Container>
    );
  }

  // Calculate relative strength vs SPY
  const calculateRelativeStrength = (sector: string) => {
    const strengthData = relativeStrength.find(rs => rs.sector === sector);
    return strengthData ? strengthData.currentStrength : 0;
  };

  // Get top performing sectors
  const topPerformers = [...sectorPerformance]
    .sort((a, b) => b.performance - a.performance)
    .slice(0, 3);

  // Get bottom performing sectors
  const bottomPerformers = [...sectorPerformance]
    .sort((a, b) => a.performance - b.performance)
    .slice(0, 3);

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
              Sector Analysis & Rotation
            </Typography>
            <Typography variant="h6" color="text.secondary" paragraph sx={{ fontSize: { xs: 'body1', md: 'h6' } }}>
              Track sector performance using aggregated stock data, identify rotation patterns, and compare relative strength vs market average
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
          <Chip icon={<ShowChart />} label="Stock-Based Analysis" color="primary" variant="outlined" size="small" />
          <Chip icon={<CompareArrows />} label="Relative Strength" color="secondary" variant="outlined" size="small" />
          <Chip icon={<Analytics />} label="Benchmark: Market Average" color="info" variant="outlined" size="small" />
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

      {/* Controls */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Time Frame</InputLabel>
                <Select
                  value={timeFrame}
                  label="Time Frame"
                  onChange={handleTimeFrameChange}
                >
                  <MenuItem value="daily">Daily</MenuItem>
                  <MenuItem value="weekly">Weekly</MenuItem>
                  <MenuItem value="monthly">Monthly</MenuItem>
                  <MenuItem value="quarterly">Quarterly</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={8}>
              <Typography variant="body2" color="text.secondary">
                Sector performance aggregated from individual stock prices in the database.
                Benchmark comparison against overall market average.
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Main Dashboard Grid */}
      <Grid container spacing={4}>
        {/* Left Column: Performance Overview */}
        <Grid item xs={12} md={8}>
          {/* Sector Performance Table */}
          <Card sx={{ mb: 4 }}>
            <CardHeader
              title="Sector Performance"
              subheader={`${timeFrame.charAt(0).toUpperCase() + timeFrame.slice(1)} performance vs market average`}
              avatar={<ShowChart color="primary" />}
            />
            <CardContent>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Sector</TableCell>
                      <TableCell align="right">Performance</TableCell>
                      <TableCell align="right">Relative Strength</TableCell>
                      <TableCell align="right">Trend</TableCell>
                      <TableCell align="right">Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sectorPerformance.map((sector) => {
                      const sectorColor = SECTOR_CONFIG[sector.sector] || '#9e9e9e';
                      const strength = calculateRelativeStrength(sector.sector);
                      const isOutperforming = strength > 100;
                      return (
                        <TableRow key={sector.sector}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: sector.color, mr: 2 }} />
                              <Typography variant="subtitle2">{sector.sector}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="right">
                            <Typography
                              variant="body1"
                              color={sector.performance >= 0 ? 'success.main' : 'error.main'}
                              fontWeight="bold"
                            >
                              {sector.performance > 0 ? '+' : ''}{sector.performance.toFixed(1)}%
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography
                              variant="body1"
                              color={isOutperforming ? 'success.main' : 'error.main'}
                            >
                              {strength.toFixed(1)}
                              <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                                vs Market
                              </Typography>
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            {sector.performance >= 0 ? (
                              <TrendingUp fontSize="small" color="success" />
                            ) : (
                              <TrendingDown fontSize="small" color="error" />
                            )}
                          </TableCell>
                          <TableCell align="right">
                            <Chip
                              label={isOutperforming ? 'Outperforming' : 'Underperforming'}
                              size="small"
                              color={isOutperforming ? 'success' : 'error'}
                              variant="outlined"
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>

          {/* Performance Heat Map */}
          <Card>
            <CardHeader
              title="Sector Heat Map"
              subheader="Visual performance comparison"
              avatar={<CompareArrows color="secondary" />}
            />
            <CardContent>
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', 
                gap: 2,
                mt: 2
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
                  </Paper>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Right Column: Insights & Rankings */}
        <Grid item xs={12} md={4}>
          {/* Top Performers */}
          <Card sx={{ mb: 4 }}>
            <CardHeader
              title="Top Performers"
              avatar={<TrendingUp color="success" />}
            />
            <CardContent>
              <Stack spacing={2}>
                {topPerformers.map((sector, index) => (
                  <Paper key={sector.sector} sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="subtitle2" fontWeight="bold">
                          #{index + 1} {sector.sector}
                        </Typography>
                      </Box>
                      <Typography 
                        variant="h6" 
                        color="success.main"
                        fontWeight="bold"
                      >
                        +{sector.performance.toFixed(1)}%
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={Math.min(sector.performance * 5, 100)} 
                      color="success"
                      sx={{ mt: 1, height: 6, borderRadius: 3 }}
                    />
                  </Paper>
                ))}
              </Stack>
            </CardContent>
          </Card>

          {/* Bottom Performers */}
          <Card sx={{ mb: 4 }}>
            <CardHeader
              title="Lagging Sectors"
              avatar={<TrendingDown color="error" />}
            />
            <CardContent>
              <Stack spacing={2}>
                {bottomPerformers.map((sector, index) => (
                  <Paper key={sector.sector} sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="subtitle2" fontWeight="bold">
                          #{index + 1} {sector.sector}
                        </Typography>
                      </Box>
                      <Typography 
                        variant="h6" 
                        color="error.main"
                        fontWeight="bold"
                      >
                        {sector.performance.toFixed(1)}%
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={Math.min(Math.abs(sector.performance) * 5, 100)} 
                      color="error"
                      sx={{ mt: 1, height: 6, borderRadius: 3 }}
                    />
                  </Paper>
                ))}
              </Stack>
            </CardContent>
          </Card>

          {/* Sector Rotation Insights */}
          <Card>
            <CardHeader
              title="Rotation Insights"
              avatar={<Analytics color="info" />}
            />
            <CardContent>
              <Typography variant="body2" paragraph>
                Based on current performance trends:
              </Typography>
              <Stack spacing={1}>
                {topPerformers.length > 0 && (
                  <Chip 
                    label={`${topPerformers[0].sector} leading at +${topPerformers[0].performance.toFixed(1)}%`}
                    color="success"
                    size="small"
                    variant="outlined"
                  />
                )}
                {bottomPerformers.length > 0 && (
                  <Chip 
                    label={`${bottomPerformers[0].sector} lagging at ${bottomPerformers[0].performance.toFixed(1)}%`}
                    color="error"
                    size="small"
                    variant="outlined"
                  />
                )}
                <Chip 
                  label={`${sectorPerformance.filter(s => s.performance > 0).length} of ${sectorPerformance.length} sectors positive`}
                  color="info"
                  size="small"
                  variant="outlined"
                />
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                Data source: Database aggregated from individual stock prices. Relative strength calculated vs market average.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Footer Note */}
      <Box sx={{ mt: 6, textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          Note: Sector performance aggregated from individual stock prices in the database. Past performance does not guarantee future results.
          Consider macroeconomic factors and diversification when making investment decisions.
        </Typography>
      </Box>
    </Container>
  );
};

export default SectorPage;