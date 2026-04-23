import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  LinearProgress,
  Chip,
  IconButton,
  Tooltip,
  Paper,
  Alert,
  CircularProgress,
  Divider,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  SelectChangeEvent,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  Memory as MemoryIcon,
  Speed as SpeedIcon,
  ErrorOutline as ErrorIcon,
  Storage as StorageIcon,
  Timeline as TimelineIcon,
} from '@mui/icons-material';
import { RealTimeMetricsPanelProps, SystemMetrics } from '../../../../../types/real-time-scanner';

// Mock data for development
const generateMockMetrics = (): SystemMetrics => ({
  processingRate: Math.random() * 100 + 50, // 50-150 symbols/sec
  memoryUsage: Math.random() * 30 + 50, // 50-80%
  cpuUtilization: Math.random() * 40 + 30, // 30-70%
  cacheHitRate: Math.random() * 30 + 65, // 65-95%
  errorRate: Math.random() * 5, // 0-5%
  queueLength: Math.floor(Math.random() * 50),
  timestamp: new Date().toISOString(),
});

const RealTimeMetricsPanel: React.FC<RealTimeMetricsPanelProps> = ({
  sessionId: _sessionId,
  refreshInterval = 10000, // 10 seconds default
  compact = false,
}) => {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [timeRange, setTimeRange] = useState<string>('5m');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const loadMetricsData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // In a real implementation, this would fetch from an API endpoint
      const mockMetrics = generateMockMetrics();
      
      setMetrics(mockMetrics);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error loading metrics:', err);
      setError('Failed to load system metrics. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetricsData();
    
    let intervalId: number | null = null;
    if (autoRefresh) {
      intervalId = window.setInterval(loadMetricsData, refreshInterval);
    }
    
    return () => {
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [autoRefresh, refreshInterval]);

  const handleRefresh = () => {
    loadMetricsData();
  };

  const handleTimeRangeChange = (event: SelectChangeEvent<string>) => {
    setTimeRange(event.target.value);
  };

  const handleAutoRefreshToggle = () => {
    setAutoRefresh(!autoRefresh);
  };

  const getMetricColor = (value: number, metricType: string): string => {
    switch (metricType) {
      case 'processingRate':
        return value > 100 ? '#4caf50' : value > 50 ? '#ff9800' : '#f44336';
      case 'memoryUsage':
        return value < 70 ? '#4caf50' : value < 85 ? '#ff9800' : '#f44336';
      case 'cpuUtilization':
        return value < 50 ? '#4caf50' : value < 75 ? '#ff9800' : '#f44336';
      case 'cacheHitRate':
        return value > 85 ? '#4caf50' : value > 70 ? '#ff9800' : '#f44336';
      case 'errorRate':
        return value < 1 ? '#4caf50' : value < 3 ? '#ff9800' : '#f44336';
      case 'queueLength':
        return value < 10 ? '#4caf50' : value < 30 ? '#ff9800' : '#f44336';
      default:
        return '#757575';
    }
  };

  const getMetricIcon = (metricType: string) => {
    switch (metricType) {
      case 'processingRate':
        return <SpeedIcon />;
      case 'memoryUsage':
        return <MemoryIcon />;
      case 'cpuUtilization':
        return <TrendingUpIcon />;
      case 'cacheHitRate':
        return <StorageIcon />;
      case 'errorRate':
        return <ErrorIcon />;
      case 'queueLength':
        return <TimelineIcon />;
      default:
        return null;
    }
  };

  const formatMetricValue = (value: number, metricType: string): string => {
    switch (metricType) {
      case 'processingRate':
        return `${value.toFixed(1)} symbols/sec`;
      case 'memoryUsage':
      case 'cpuUtilization':
      case 'cacheHitRate':
      case 'errorRate':
        return `${value.toFixed(1)}%`;
      case 'queueLength':
        return value.toString();
      default:
        return value.toFixed(2);
    }
  };

  const renderCompactView = () => {
    if (!metrics) return null;

    return (
      <Card>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" component="div">
              System Metrics
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Tooltip title="Last updated">
                <Typography variant="caption" color="text.secondary">
                  {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Typography>
              </Tooltip>
              <Tooltip title="Refresh">
                <IconButton size="small" onClick={handleRefresh} disabled={loading}>
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          <Grid container spacing={1}>
            {Object.entries(metrics).map(([key, value]) => {
              if (key === 'timestamp') return null;
              
              const metricType = key;
              const color = getMetricColor(value as number, metricType);
              
              return (
                <Grid item xs={6} key={key}>
                  <Paper variant="outlined" sx={{ p: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      {getMetricIcon(metricType)}
                      <Typography variant="caption" sx={{ textTransform: 'capitalize' }}>
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </Typography>
                    </Box>
                    <Typography variant="body2" fontWeight="medium" sx={{ color }}>
                      {formatMetricValue(value as number, metricType)}
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min((value as number) * (metricType === 'queueLength' ? 2 : 1), 100)}
                      sx={{
                        mt: 0.5,
                        height: 4,
                        borderRadius: 2,
                        backgroundColor: 'rgba(0, 0, 0, 0.1)',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: color,
                        },
                      }}
                    />
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        </CardContent>
      </Card>
    );
  };

  const renderDetailedView = () => {
    if (!metrics) return null;

    return (
      <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              System Performance Metrics
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Real-time monitoring of scanner system performance and resource utilization
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Time Range</InputLabel>
              <Select value={timeRange} label="Time Range" onChange={handleTimeRangeChange}>
                <MenuItem value="5m">Last 5 minutes</MenuItem>
                <MenuItem value="15m">Last 15 minutes</MenuItem>
                <MenuItem value="30m">Last 30 minutes</MenuItem>
                <MenuItem value="1h">Last hour</MenuItem>
              </Select>
            </FormControl>
            <FormControlLabel
              control={<Switch checked={autoRefresh} onChange={handleAutoRefreshToggle} />}
              label="Auto-refresh"
            />
            <Tooltip title={`Refresh (${refreshInterval / 1000}s)`}>
              <IconButton onClick={handleRefresh} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Chip
              label={`Updated: ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`}
              size="small"
              variant="outlined"
            />
          </Box>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Loading State */}
        {loading && !metrics && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {/* Main Metrics Grid */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {Object.entries(metrics).map(([key, value]) => {
            if (key === 'timestamp') return null;
            
            const metricType = key;
            const color = getMetricColor(value as number, metricType);
            const icon = getMetricIcon(metricType);
            
            return (
              <Grid item xs={12} sm={6} md={4} key={key}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </Typography>
                        <Typography variant="h4" component="div" sx={{ color, mt: 1 }}>
                          {formatMetricValue(value as number, metricType)}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {icon && React.cloneElement(icon, { sx: { color } })}
                      </Box>
                    </Box>
                    
                    <LinearProgress
                      variant="determinate"
                      value={Math.min((value as number) * (metricType === 'queueLength' ? 2 : 1), 100)}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: 'rgba(0, 0, 0, 0.1)',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: color,
                          borderRadius: 4,
                        },
                      }}
                    />
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        {metricType === 'processingRate' ? 'Low' : metricType === 'errorRate' ? 'Good' : 'Low'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {metricType === 'processingRate' ? 'High' : metricType === 'errorRate' ? 'Critical' : 'High'}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>

        {/* System Health Summary */}
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              System Health Summary
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Performance Indicators
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2">Overall System Health</Typography>
                      <Chip
                        label={metrics.errorRate < 2 && metrics.memoryUsage < 80 ? "Healthy" : "Warning"}
                        size="small"
                        color={metrics.errorRate < 2 && metrics.memoryUsage < 80 ? "success" : "warning"}
                      />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2">Processing Efficiency</Typography>
                      <Chip
                        label={metrics.processingRate > 80 ? "High" : "Moderate"}
                        size="small"
                        color={metrics.processingRate > 80 ? "success" : metrics.processingRate > 50 ? "warning" : "error"}
                      />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2">Resource Utilization</Typography>
                      <Chip
                        label={metrics.memoryUsage < 70 && metrics.cpuUtilization < 60 ? "Optimal" : "High"}
                        size="small"
                        color={metrics.memoryUsage < 70 && metrics.cpuUtilization < 60 ? "success" : "warning"}
                      />
                    </Box>
                  </Box>
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Recommendations
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {metrics.memoryUsage > 75 && (
                      <Alert severity="warning" sx={{ py: 0.5 }}>
                        Consider increasing system memory allocation
                      </Alert>
                    )}
                    {metrics.errorRate > 2 && (
                      <Alert severity="error" sx={{ py: 0.5 }}>
                        Investigate error rate increase
                      </Alert>
                    )}
                    {metrics.cacheHitRate < 70 && (
                      <Alert severity="info" sx={{ py: 0.5 }}>
                        Cache optimization recommended
                      </Alert>
                    )}
                    {metrics.queueLength > 30 && (
                      <Alert severity="warning" sx={{ py: 0.5 }}>
                        Processing queue is building up
                      </Alert>
                    )}
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Performance History */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Performance Trends
            </Typography>
            <Divider sx={{ mb: 3 }} />
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Historical performance data visualization would appear here
              </Typography>
              <Typography variant="caption" color="text.secondary">
                (Chart integration would be implemented with a charting library like Recharts or Chart.js)
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>
    );
  };

  // Main render
  if (compact) {
    return renderCompactView();
  }
  
  return renderDetailedView();
};

export default RealTimeMetricsPanel;
