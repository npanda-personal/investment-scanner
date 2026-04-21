import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  LinearProgress,
  Chip,
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel,
  Skeleton,
  Fade,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RefreshIcon from '@mui/icons-material/Refresh';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ResultsTable from './components/ResultsTable';
import {
  SimplifiedOpportunity,
  ScanType,
  SCAN_CONFIG,
  generateMockOpportunities,
} from '../../../types/simple-scanner';
// Note: realTimeScannerService imports would be used in a real implementation
// import { startQuickScan, fetchSessionProgress, fetchSessionResults } from '../../../services/realTimeScannerService';

// Helper functions
const getScanTypeDescription = (scanType: ScanType): string => {
  switch (scanType) {
    case 'momentum':
      return 'Find stocks moving strongly up/down';
    case 'reversal':
      return 'Find potential turning points';
    case 'trend':
      return 'Find steady trending stocks';
    default:
      return 'Scan for trading opportunities';
  }
};

const getScanProgressText = (scanType: ScanType, progress: number): string => {
  if (progress < 30) {
    return `Scanning market for ${scanType} setups...`;
  } else if (progress < 70) {
    return `Analyzing signals...`;
  } else {
    return `Finalizing results...`;
  }
};

const getEnhancedInsightText = (opportunities: SimplifiedOpportunity[]): string => {
  if (opportunities.length === 0) {
    return 'No opportunities found. Try running a scan.';
  }
  
  const topOpportunities = opportunities.slice(0, 2);
  const symbols = topOpportunities.map(opp => opp.symbol).join(' and ');
  const avgScore = opportunities.reduce((sum, opp) => sum + opp.score, 0) / opportunities.length;
  
  if (avgScore > 75) {
    return `Strong opportunities detected! ${symbols} showing excellent signals.`;
  } else if (avgScore > 60) {
    return `Good opportunities found. ${symbols} look promising.`;
  } else {
    return `Found ${opportunities.length} opportunities. ${symbols} worth watching.`;
  }
};

const formatTimeAgo = (dateString: string | null): string => {
  if (!dateString) return 'Never';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  
  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hr ago`;
  
  return date.toLocaleDateString();
};

const SimplifiedScannerDashboard: React.FC = () => {
  // State
  const [scanType, setScanType] = useState<ScanType>('momentum');
  const [opportunities, setOpportunities] = useState<SimplifiedOpportunity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [foundDuringScan, setFoundDuringScan] = useState<number>(0);
  
  // Refs for intervals
  const autoRefreshRef = useRef<number | null>(null);
  const scanIntervalRef = useRef<number | null>(null);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // For now, use mock data
      // In a real implementation, we would fetch cached results or run a default scan
      const mockData = generateMockOpportunities(10);
      setOpportunities(mockData);
      setLastUpdated(new Date().toISOString());
    } catch (err) {
      console.error('Error loading initial data:', err);
      setError('Failed to load initial data. Using mock data instead.');
      // Fallback to mock data
      const mockData = generateMockOpportunities(10);
      setOpportunities(mockData);
      setLastUpdated(new Date().toISOString());
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh) {
      autoRefreshRef.current = window.setInterval(() => {
        loadInitialData();
      }, 30000); // 30 seconds
    } else if (autoRefreshRef.current) {
      clearInterval(autoRefreshRef.current);
      autoRefreshRef.current = null;
    }

    return () => {
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current);
      }
    };
  }, [autoRefresh]);

  // Poll for scan progress (mock implementation)
  useEffect(() => {
    if (isScanning) {
      // Clear any existing interval
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }

      // Simulate scan progress with dynamic found count
      let progress = 0;
      let foundCount = 0;
      
      scanIntervalRef.current = window.setInterval(() => {
        progress += 8; // Slightly slower for better UX
        setScanProgress(progress);
        
        // Simulate finding opportunities during scan
        if (progress > 20 && progress < 80 && Math.random() > 0.7) {
          foundCount += Math.floor(Math.random() * 3) + 1;
          setFoundDuringScan(foundCount);
        }
        
        if (progress >= 100) {
          // Scan completed
          if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
          setIsScanning(false);
          setFoundDuringScan(0);
          
          // Generate mock results (keep some from previous if any)
          const mockData = generateMockOpportunities(10);
          setOpportunities(mockData);
          setLastUpdated(new Date().toISOString());
          setError(null);
        }
      }, 600); // Update every 600ms
    } else {
      // Clean up interval when not scanning
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
    }

    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
    };
  }, [isScanning]);

  const handleRunScan = async () => {
    try {
      setIsScanning(true);
      setError(null);
      setScanProgress(0);
      setFoundDuringScan(0);

      // DO NOT clear previous results - keep them visible during scan
      // This provides continuity and avoids empty screen
      
      // Note: In a real implementation, we would use:
      // const signalTypes = SCAN_CONFIG[scanType];
      
      // In a real implementation, we would call:
      // const session = await startQuickScan(demoSymbols, signalTypes);
      // setActiveSessionId(session.id);
      
      // For demo, we'll simulate the scan with the progress timer above
    } catch (err) {
      console.error('Error starting scan:', err);
      setError('Failed to start scan. Using mock data instead.');
      
      // Fallback to mock data
      const mockData = generateMockOpportunities(10);
      setOpportunities(mockData);
      setLastUpdated(new Date().toISOString());
      setIsScanning(false);
    }
  };

  const handleRefresh = () => {
    loadInitialData();
  };

  const handleAddToWatchlist = (symbol: string) => {
    // Simple implementation - just show an alert
    alert(`Added ${symbol} to watchlist`);
    // In a real implementation, this would call a watchlist service
  };

  // Use the new formatTimeAgo helper
  const lastUpdatedText = formatTimeAgo(lastUpdated);

  // Use enhanced insight text
  const insightText = getEnhancedInsightText(opportunities);
  const insightSeverity = opportunities.length > 0 && opportunities.reduce((sum, opp) => sum + opp.score, 0) / opportunities.length > 70 ? "success" : "info";

  return (
    <Box sx={{ p: 3, maxWidth: 1200, margin: '0 auto' }}>
      {/* Global styles for animations */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
          }
        `}
      </style>
      
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
            🔥 Smart Scanner
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Find the best trading opportunities right now
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                size="small"
                color="primary"
                disabled={isScanning}
              />
            }
            label={
              <Typography variant="body2" color="text.secondary">
                Auto-refresh
              </Typography>
            }
          />
          <Typography variant="body2" color="text.secondary">
            Updated: {lastUpdatedText}
          </Typography>
          <Tooltip title={isScanning ? "Scan in progress" : "Refresh now"}>
            <span>
              <IconButton
                onClick={handleRefresh}
                disabled={isLoading || isScanning}
                size="small"
                sx={{
                  animation: isScanning ? 'pulse 1.5s infinite' : 'none',
                }}
              >
                <RefreshIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Box>

      {/* Controls Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Scan Type</InputLabel>
              <Select
                value={scanType}
                label="Scan Type"
                onChange={(e) => setScanType(e.target.value as ScanType)}
                disabled={isScanning}
              >
                <MenuItem value="momentum">Momentum</MenuItem>
                <MenuItem value="reversal">Reversal</MenuItem>
                <MenuItem value="trend">Trend</MenuItem>
              </Select>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                {getScanTypeDescription(scanType)}
              </Typography>
            </FormControl>

            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Scans for: {SCAN_CONFIG[scanType].join(', ')}
              </Typography>
            </Box>

            <Fade in={!isScanning}>
              <Button
                variant="contained"
                color="primary"
                size="large"
                startIcon={<PlayArrowIcon />}
                onClick={handleRunScan}
                disabled={isScanning || isLoading}
                sx={{ minWidth: 120 }}
              >
                Run Scan
              </Button>
            </Fade>
          </Box>

          {isScanning && (
            <Fade in={isScanning}>
              <Box sx={{ mt: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    {getScanProgressText(scanType, scanProgress)}
                  </Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {scanProgress}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={scanProgress}
                  sx={{ height: 8, borderRadius: 4 }}
                />
                {foundDuringScan > 0 && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    Found {foundDuringScan} opportunities so far
                  </Typography>
                )}
              </Box>
            </Fade>
          )}
        </CardContent>
      </Card>

      {/* Insight Banner */}
      <Fade in={!isLoading}>
        <Alert
          severity={insightSeverity}
          icon={<AutoAwesomeIcon />}
          sx={{ mb: 3 }}
        >
          <Typography variant="body1" fontWeight="medium">
            {insightText}
          </Typography>
          <Typography variant="body2">
            Showing top {Math.min(opportunities.length, 10)} opportunities • Avg score: {opportunities.length > 0 ? Math.round(opportunities.reduce((sum, opp) => sum + opp.score, 0) / opportunities.length) : 0}/100
          </Typography>
        </Alert>
      </Fade>

      {/* Error Alert */}
      {error && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Results Table */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" component="h2">
              Top Opportunities
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {isScanning && (
                <Chip
                  label="Updating..."
                  size="small"
                  color="primary"
                  variant="outlined"
                  icon={<RefreshIcon fontSize="small" />}
                />
              )}
              <Chip
                label={`${opportunities.length} ${opportunities.length === 1 ? 'result' : 'results'}`}
                size="small"
                variant="outlined"
              />
            </Box>
          </Box>
          
          {/* Overlay for scanning state */}
          <Box sx={{ position: 'relative' }}>
            {isScanning && (
              <Fade in={isScanning}>
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    zIndex: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 1,
                  }}
                >
                  <Box sx={{ textAlign: 'center', p: 3 }}>
                    <RefreshIcon sx={{
                      fontSize: 40,
                      color: 'primary.main',
                      mb: 1,
                      animation: 'spin 2s linear infinite'
                    }} />
                    <Typography variant="body1" color="primary" fontWeight="medium">
                      Updating results...
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Previous results remain visible
                    </Typography>
                  </Box>
                </Box>
              </Fade>
            )}
            
            {isLoading && !isScanning && opportunities.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Skeleton variant="rectangular" width="100%" height={200} sx={{ mb: 2, borderRadius: 1 }} />
                <Skeleton variant="text" width="60%" sx={{ mx: 'auto' }} />
                <Skeleton variant="text" width="40%" sx={{ mx: 'auto' }} />
              </Box>
            ) : opportunities.length === 0 && !isScanning ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="body1" color="text.secondary" gutterBottom>
                  No opportunities found.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Try running a scan or selecting a different scan type.
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleRunScan}
                  sx={{ mt: 2 }}
                >
                  Run Scan
                </Button>
              </Box>
            ) : (
              <ResultsTable
                opportunities={opportunities}
                onAddToWatchlist={handleAddToWatchlist}
                isLoading={false} // We handle loading state above
              />
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Footer Info */}
      <Fade in={!isScanning}>
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            💡 Tip: Click on any row to see detailed signal explanations
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            Signals are automatically translated from technical indicators to human-readable insights
          </Typography>
          {autoRefresh && (
            <Typography variant="caption" color="primary" display="block" sx={{ mt: 0.5 }}>
              ⚡ Auto-refresh enabled (every 30s)
            </Typography>
          )}
        </Box>
      </Fade>
    </Box>
  );
};

export default SimplifiedScannerDashboard;