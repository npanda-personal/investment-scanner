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

// Dynamic scanner summary based on actual results
const getEnhancedInsightText = (opportunities: SimplifiedOpportunity[]): string => {
  if (opportunities.length === 0) {
    return 'No opportunities found. Try running a scan.';
  }
  
  const buyCount = opportunities.filter(r => r.decision === "BUY").length;
  const watchCount = opportunities.filter(r => r.decision === "WATCH").length;
  const avoidCount = opportunities.filter(r => r.decision === "AVOID").length;
  
  // Calculate average metrics for smarter insights
  const avgConviction = opportunities.reduce((sum, opp) => sum + (opp.conviction || opp.score || 0), 0) / opportunities.length;
  const avgAlignment = opportunities.reduce((sum, opp) => sum + (opp.alignmentScore || 0), 0) / opportunities.length;
  
  // Count ideal entries and near support opportunities
  const idealEntryCount = opportunities.filter(opp => opp.entryQuality === "IDEAL").length;
  const nearSupportCount = opportunities.filter(opp => opp.distanceToSupport === "NEAR").length;
  const strongTrendCount = opportunities.filter(opp => opp.trendStrength === "STRONG").length;
  
  // Market condition assessment
  let marketCondition = "mixed";
  if (buyCount >= opportunities.length * 0.3) {
    marketCondition = "bullish";
  } else if (avoidCount >= opportunities.length * 0.7) {
    marketCondition = "bearish";
  } else if (watchCount >= opportunities.length * 0.5) {
    marketCondition = "neutral";
  }
  
  // Generate smart summary based on metrics
  if (buyCount > 0) {
    const buyOpportunities = opportunities.filter(r => r.decision === "BUY");
    const bestBuy = buyOpportunities[0]; // Already sorted by rank
    
    let additionalInsights = [];
    if (idealEntryCount > 0) additionalInsights.push(`${idealEntryCount} ideal entries`);
    if (nearSupportCount > 0) additionalInsights.push(`${nearSupportCount} near support`);
    if (strongTrendCount > 0) additionalInsights.push(`${strongTrendCount} strong trends`);
    
    const additionalText = additionalInsights.length > 0 ? ` (${additionalInsights.join(', ')})` : '';
    
    return `${buyCount} high-conviction setups found in ${marketCondition} market${additionalText}. Avg conviction: ${avgConviction.toFixed(0)}/100`;
  } else if (watchCount > 0) {
    // Analyze why no BUY opportunities
    const lowConvictionCount = opportunities.filter(opp => (opp.conviction || opp.score || 0) < 55).length;
    const poorAlignmentCount = opportunities.filter(opp => (opp.alignmentScore || 0) < 60).length;
    
    let reason = "market is mixed";
    if (lowConvictionCount >= watchCount * 0.7) {
      reason = "low conviction across opportunities";
    } else if (poorAlignmentCount >= watchCount * 0.7) {
      reason = "poor trend alignment";
    } else if (strongTrendCount === 0) {
      reason = "weak trend strength";
    }
    
    return `No strong setups. ${watchCount} watch candidates found (${reason}). Avg alignment: ${avgAlignment.toFixed(0)}/100`;
  } else {
    // All AVOID - market is unfavorable
    const bearishTrendCount = opportunities.filter(opp => opp.alignment?.includes("BEARISH")).length;
    const highRiskCount = opportunities.filter(opp => opp.riskLevel === "HIGH").length;
    
    let reason = "market conditions unfavorable";
    if (bearishTrendCount >= avoidCount * 0.8) {
      reason = "predominantly bearish trends";
    } else if (highRiskCount >= avoidCount * 0.8) {
      reason = "high risk across opportunities";
    } else if (avgConviction < 40) {
      reason = "very low conviction";
    }
    
    return `No actionable setups. ${avoidCount} opportunities filtered out (${reason}).`;
  }
};

// Identify top pick (best opportunity) with guard filters
const getTopPick = (opportunities: SimplifiedOpportunity[]): SimplifiedOpportunity | null => {
  if (opportunities.length === 0) return null;
  
  // Apply guard filters: decision === 'BUY' AND conviction >= 75 AND alignmentScore >= 80
  const qualifiedBuyOpportunities = opportunities.filter(opp =>
    opp.decision === "BUY" &&
    (opp.conviction || opp.score) >= 75 &&
    (opp.alignmentScore || 0) >= 80
  );
  
  if (qualifiedBuyOpportunities.length > 0) {
    // Return the qualified BUY with highest conviction
    return qualifiedBuyOpportunities.reduce((best, current) =>
      (current.conviction || current.score) > (best.conviction || best.score) ? current : best
    );
  }
  
  // If no qualified BUY, fall back to any BUY (but warn about missing guard filters)
  const anyBuyOpportunities = opportunities.filter(opp => opp.decision === "BUY");
  if (anyBuyOpportunities.length > 0) {
    // Return the BUY with highest conviction (but it doesn't meet guard filters)
    return anyBuyOpportunities.reduce((best, current) =>
      (current.conviction || current.score) > (best.conviction || best.score) ? current : best
    );
  }
  
  // If no BUY at all, look for WATCH with highest conviction
  const watchOpportunities = opportunities.filter(opp => opp.decision === "WATCH");
  if (watchOpportunities.length > 0) {
    return watchOpportunities.reduce((best, current) =>
      (current.conviction || current.score) > (best.conviction || best.score) ? current : best
    );
  }
  
  return null;
};

// Get top pick description
const getTopPickDescription = (opportunity: SimplifiedOpportunity | null): string => {
  if (!opportunity) return '';
  
  const parts = [];
  
  // Add trend info
  if (opportunity.alignment) {
    const alignmentParts = opportunity.alignment.split('/');
    if (alignmentParts.length >= 2) {
      const weeklyTrend = alignmentParts[1];
      if (weeklyTrend === 'BULLISH') parts.push('Strong trend');
      else if (weeklyTrend === 'BEARISH') parts.push('Counter-trend');
    }
  }
  
  // Add volume info
  if (opportunity.volumeVisibility === 'HIGH') {
    parts.push('High volume');
  }
  
  // Add setup type
  if (opportunity.setupType) {
    parts.push(opportunity.setupType.toLowerCase());
  }
  
  // Add conviction
  const conviction = opportunity.conviction || opportunity.score;
  if (conviction >= 80) parts.push('High conviction');
  
  return parts.length > 0 ? `— ${parts.join(' + ')}` : '';
};

// Detect trap warning (counter-trend bounce)
const getTrapWarning = (opportunity: SimplifiedOpportunity): string | null => {
  if (!opportunity.alignment) return null;
  
  const alignmentParts = opportunity.alignment.split('/');
  if (alignmentParts.length < 2) return null;
  
  const dailyTrend = alignmentParts[0];
  const weeklyTrend = alignmentParts[1];
  
  // Trap: Daily bullish but weekly bearish (counter-trend bounce)
  if (dailyTrend === "BULLISH" && weeklyTrend === "BEARISH") {
    return "⚠️ Counter-trend bounce (avoid)";
  }
  
  // Also flag if daily bearish but weekly bullish (potential reversal)
  if (dailyTrend === "BEARISH" && weeklyTrend === "BULLISH") {
    return "⚠️ Pullback in uptrend (watch for entry)";
  }
  
  return null;
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
  
  // Get top pick and trap warnings
  const topPick = getTopPick(opportunities);
  const topPickDescription = getTopPickDescription(topPick);
  const trapWarnings = opportunities.map(opp => ({
    opportunity: opp,
    warning: getTrapWarning(opp)
  })).filter(item => item.warning);

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

      {/* Top Pick Highlight */}
      {topPick && (
        <Fade in={!isLoading}>
          <Alert
            severity="success"
            icon={<span>⭐</span>}
            sx={{ mb: 2, border: '1px solid', borderColor: 'success.light', backgroundColor: 'success.50' }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
              <Box>
                <Typography variant="body1" fontWeight="bold">
                  ⭐ Top Pick: {topPick.symbol} — {topPick.companyName}
                </Typography>
                <Typography variant="body2">
                  {topPickDescription} • Conviction: {topPick.conviction || topPick.score}/100
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip
                  label={topPick.decision}
                  color={topPick.decision === 'BUY' ? 'success' : topPick.decision === 'WATCH' ? 'warning' : 'error'}
                  size="small"
                  variant="outlined"
                />
                <Chip
                  label={topPick.setupType || 'SETUP'}
                  color="primary"
                  size="small"
                  variant="outlined"
                />
              </Box>
            </Box>
          </Alert>
        </Fade>
      )}

      {/* Trap Warnings */}
      {trapWarnings.length > 0 && (
        <Fade in={!isLoading}>
          <Alert
            severity="warning"
            icon={<span>⚠️</span>}
            sx={{ mb: 2, border: '1px solid', borderColor: 'warning.light', backgroundColor: 'warning.50' }}
          >
            <Typography variant="body1" fontWeight="bold" gutterBottom>
              ⚠️ Trap Warnings ({trapWarnings.length} detected)
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
              {trapWarnings.slice(0, 3).map((item, index) => (
                <Chip
                  key={index}
                  label={`${item.opportunity.symbol}: ${item.warning}`}
                  size="small"
                  color="warning"
                  variant="outlined"
                  sx={{ fontSize: '0.75rem' }}
                />
              ))}
              {trapWarnings.length > 3 && (
                <Chip
                  label={`+${trapWarnings.length - 3} more`}
                  size="small"
                  color="warning"
                  variant="outlined"
                  sx={{ fontSize: '0.75rem' }}
                />
              )}
            </Box>
            <Typography variant="body2" sx={{ mt: 1, fontSize: '0.75rem' }}>
              Counter-trend bounces often fail. Consider avoiding these setups.
            </Typography>
          </Alert>
        </Fade>
      )}

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