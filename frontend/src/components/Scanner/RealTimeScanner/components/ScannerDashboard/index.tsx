import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Typography,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
  Alert,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import AddIcon from '@mui/icons-material/Add';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ScheduleIcon from '@mui/icons-material/Schedule';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { 
  ScannerDashboardProps, 
  ScanSession, 
  ScoredOpportunity, 
  DashboardStats,
  generateMockSession,
  generateMockOpportunity
} from '../../../../../types/real-time-scanner';

// Mock data for development
const MOCK_DASHBOARD_STATS: DashboardStats = {
  activeSessions: 3,
  totalSessions: 42,
  opportunitiesFound: 156,
  avgScanTime: 127,
  successRate: 87,
  topSignals: [
    { type: 'RSI', count: 89, avgConfidence: 78 },
    { type: 'EMA', count: 67, avgConfidence: 72 },
    { type: 'VOLUME', count: 45, avgConfidence: 65 },
    { type: 'MACD', count: 32, avgConfidence: 81 },
  ],
};

const ScannerDashboard: React.FC<ScannerDashboardProps> = ({
  userId = 'demo-user',
  onSessionSelect,
  onQuickScan,
  refreshInterval = 30000, // 30 seconds
}) => {
  const [dashboardStats] = useState<DashboardStats>(MOCK_DASHBOARD_STATS);
  const [activeSessions, setActiveSessions] = useState<ScanSession[]>([]);
  const [recentOpportunities, setRecentOpportunities] = useState<ScoredOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Load dashboard data
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // TODO: Replace with actual API calls
      // For now, use mock data
      const mockSessions: ScanSession[] = [
        generateMockSession({ id: '1', name: 'S&P 500 Technical Scan', status: 'PROCESSING' }),
        generateMockSession({ id: '2', name: 'NASDAQ Momentum Scan', status: 'PROCESSING' }),
        generateMockSession({ id: '3', name: 'Russell 2000 Value Scan', status: 'PENDING' }),
      ];
      
      const mockOpportunities: ScoredOpportunity[] = [
        generateMockOpportunity({ symbol: 'AAPL', score: 87.5, confidence: 82, rank: 1 }),
        generateMockOpportunity({ symbol: 'MSFT', score: 84.2, confidence: 79, rank: 2 }),
        generateMockOpportunity({ symbol: 'GOOGL', score: 81.7, confidence: 76, rank: 3 }),
        generateMockOpportunity({ symbol: 'AMZN', score: 78.9, confidence: 73, rank: 4 }),
        generateMockOpportunity({ symbol: 'TSLA', score: 75.4, confidence: 70, rank: 5 }),
      ];
      
      setActiveSessions(mockSessions);
      setRecentOpportunities(mockOpportunities);
      setLastRefresh(new Date());
    } catch (err: any) {
      setError(`Failed to load dashboard data: ${err.message}`);
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadDashboardData();
  }, [userId]);

  // Auto-refresh
  useEffect(() => {
    if (!refreshInterval) return;
    
    const intervalId = setInterval(() => {
      loadDashboardData();
    }, refreshInterval);
    
    return () => clearInterval(intervalId);
  }, [refreshInterval]);

  const handleRefresh = () => {
    loadDashboardData();
  };

  const handleQuickScan = () => {
    if (onQuickScan) {
      onQuickScan();
    } else {
      // Default behavior: show informative toast/alert
      alert('Quick scan would analyze top 10 symbols for common signals. This feature is ready for integration with backend API.');
    }
  };

  const handleSessionClick = (sessionId: string) => {
    if (onSessionSelect) {
      onSessionSelect(sessionId);
    } else {
      // Default behavior: show session details
      alert(`Session ${sessionId} selected. In a full implementation, this would navigate to session details.`);
    }
  };

  const handleOpportunityClick = (opportunity: ScoredOpportunity) => {
    // Navigate to results view or show details
    console.log('Opportunity clicked:', opportunity);
    alert(`Opportunity details:\nSymbol: ${opportunity.symbol}\nScore: ${opportunity.score}\nConfidence: ${opportunity.confidence}%\nSignals: ${opportunity.signals.length}`);
  };

  const getStatusColor = (status: ScanSession['status']) => {
    switch (status) {
      case 'PROCESSING': return 'primary';
      case 'COMPLETED': return 'success';
      case 'FAILED': return 'error';
      case 'CANCELLED': return 'warning';
      case 'PENDING': return 'default';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: ScanSession['status']) => {
    switch (status) {
      case 'PROCESSING': return <ScheduleIcon fontSize="small" />;
      case 'COMPLETED': return <CheckCircleIcon fontSize="small" />;
      case 'FAILED': return <ErrorIcon fontSize="small" />;
      default: return undefined;
    }
  };

  // Calculate progress for a session
  const getSessionProgress = (session: ScanSession) => {
    return session.symbolsProcessed / session.totalSymbols * 100;
  };

  if (loading && activeSessions.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Real-Time Scanner Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Monitor active scans, view recent opportunities, and launch quick scans
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Tooltip title={`Last refreshed: ${lastRefresh.toLocaleTimeString()}`}>
            <IconButton onClick={handleRefresh} color="primary">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<PlayArrowIcon />}
            onClick={handleQuickScan}
            sx={{ minWidth: 140 }}
          >
            Quick Scan
          </Button>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => handleSessionClick('new')}
            sx={{ minWidth: 140 }}
          >
            New Session
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Stats Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Active Sessions
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="h4">
                  {dashboardStats.activeSessions}
                </Typography>
                <ScheduleIcon color="primary" />
              </Box>
              <Typography variant="body2" color="text.secondary">
                {dashboardStats.totalSessions} total sessions
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Opportunities Found
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="h4">
                  {dashboardStats.opportunitiesFound}
                </Typography>
                <TrendingUpIcon color="success" />
              </Box>
              <Typography variant="body2" color="text.secondary">
                Across all sessions
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Avg Scan Time
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="h4">
                  {Math.round(dashboardStats.avgScanTime / 60)}m
                </Typography>
                <ScheduleIcon color="action" />
              </Box>
              <Typography variant="body2" color="text.secondary">
                {dashboardStats.avgScanTime} seconds
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Success Rate
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="h4">
                  {dashboardStats.successRate}%
                </Typography>
                <CheckCircleIcon color="success" />
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={dashboardStats.successRate} 
                sx={{ mt: 1 }}
                color={dashboardStats.successRate > 80 ? 'success' : dashboardStats.successRate > 60 ? 'warning' : 'error'}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Two-column layout for sessions and opportunities */}
      <Grid container spacing={3}>
        {/* Active Sessions Column */}
        <Grid item xs={12} lg={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6">
                  Active Scan Sessions
                </Typography>
                <Chip 
                  label={`${activeSessions.length} active`} 
                  size="small" 
                  color="primary" 
                  variant="outlined"
                />
              </Box>
              
              {activeSessions.length === 0 ? (
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                  <Typography variant="body1" color="text.secondary">
                    No active scan sessions. Start a new session to begin scanning.
                  </Typography>
                  <Button 
                    variant="contained" 
                    startIcon={<AddIcon />} 
                    onClick={() => handleSessionClick('new')}
                    sx={{ mt: 2 }}
                  >
                    Create Session
                  </Button>
                </Paper>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Session</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Progress</TableCell>
                        <TableCell>Symbols</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {activeSessions.map((session) => (
                        <TableRow 
                          key={session.id}
                          hover
                          onClick={() => handleSessionClick(session.id)}
                          sx={{ cursor: 'pointer' }}
                        >
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">
                              {session.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {session.scopeType === 'preset' ? 'Preset' : 
                               session.scopeType === 'watchlist' ? 'Watchlist' :
                               session.scopeType === 'custom' ? 'Custom' : 'Database'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={session.status}
                              size="small"
                              color={getStatusColor(session.status)}
                              icon={getStatusIcon(session.status)}
                            />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box sx={{ width: '100%', mr: 1 }}>
                                <LinearProgress 
                                  variant="determinate" 
                                  value={getSessionProgress(session)} 
                                  sx={{ height: 6, borderRadius: 3 }}
                                />
                              </Box>
                              <Typography variant="body2" minWidth={35}>
                                {Math.round(getSessionProgress(session))}%
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {session.symbolsProcessed}/{session.totalSymbols}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {session.opportunitiesFound} found
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Button 
                              size="small" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSessionClick(session.id);
                              }}
                            >
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Opportunities Column */}
        <Grid item xs={12} lg={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6">
                  Recent Opportunities
                </Typography>
                <Chip 
                  label={`${recentOpportunities.length} recent`} 
                  size="small" 
                  color="success" 
                  variant="outlined"
                />
              </Box>
              
              {recentOpportunities.length === 0 ? (
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                  <Typography variant="body1" color="text.secondary">
                    No opportunities found yet. Start a scan session to discover opportunities.
                  </Typography>
                </Paper>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Symbol</TableCell>
                        <TableCell>Score</TableCell>
                        <TableCell>Confidence</TableCell>
                        <TableCell>Price</TableCell>
                        <TableCell>Signals</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {recentOpportunities.map((opportunity) => (
                        <TableRow 
                          key={opportunity.id}
                          hover
                          onClick={() => handleOpportunityClick(opportunity)}
                          sx={{ cursor: 'pointer' }}
                        >
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">
                              {opportunity.symbol}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {opportunity.metadata.sector || 'N/A'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2" fontWeight="medium">
                                {opportunity.score.toFixed(1)}
                              </Typography>
                              <Chip 
                                label={`#${opportunity.rank}`} 
                                size="small" 
                                color={opportunity.rank <= 3 ? 'success' : 'default'}
                                variant="outlined"
                              />
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box sx={{ width: '100%' }}>
                                <LinearProgress 
                                  variant="determinate" 
                                  value={opportunity.confidence} 
                                  sx={{ height: 6, borderRadius: 3 }}
                                  color={opportunity.confidence > 80 ? 'success' : opportunity.confidence > 60 ? 'warning' : 'error'}
                                />
                              </Box>
                              <Typography variant="body2" minWidth={35}>
                                {opportunity.confidence}%
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">
                              ${opportunity.metadata.price.toFixed(2)}
                            </Typography>
                            <Typography 
                              variant="caption" 
                              color={opportunity.metadata.change >= 0 ? 'success.main' : 'error.main'}
                            >
                              {opportunity.metadata.change >= 0 ? '+' : ''}{opportunity.metadata.change.toFixed(2)} 
                              ({opportunity.metadata.change >= 0 ? '+' : ''}{(opportunity.metadata.change / opportunity.metadata.price * 100).toFixed(1)}%)
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                              {opportunity.signals.slice(0, 2).map((signal, idx) => (
                                <Chip
                                  key={idx}
                                  label={signal.type}
                                  size="small"
                                  variant="outlined"
                                  sx={{ fontSize: '0.7rem' }}
                                />
                              ))}
                              {opportunity.signals.length > 2 && (
                                <Chip
                                  label={`+${opportunity.signals.length - 2} more`}
                                  size="small"
                                  variant="outlined"
                                  sx={{ fontSize: '0.7rem' }}
                                />
                              )}
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ScannerDashboard;
