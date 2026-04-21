import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Chip,
  Alert,
  CircularProgress,
  Paper,
  Grid,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import CancelIcon from '@mui/icons-material/Cancel';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import ScheduleIcon from '@mui/icons-material/Schedule';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import MemoryIcon from '@mui/icons-material/Memory';
import SpeedIcon from '@mui/icons-material/Speed';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import {
  SessionMonitorProps,
  ScanSession,
  ScanProgressResponse,
  ChunkStatus,
  generateMockSession,
} from '../../../../../types/real-time-scanner';

// Mock data for development
const MOCK_PROGRESS: ScanProgressResponse = {
  sessionId: 'session-1',
  status: 'PROCESSING',
  progress: 65,
  symbolsProcessed: 130,
  totalSymbols: 200,
  opportunitiesFound: 42,
  processingRate: 8.5,
  estimatedCompletion: '2024-01-01T12:30:00Z',
  chunks: [
    { index: 0, status: 'COMPLETED', symbols: ['AAPL', 'MSFT', 'GOOGL'], processed: 3, total: 3, startedAt: '2024-01-01T12:00:00Z', completedAt: '2024-01-01T12:05:00Z' },
    { index: 1, status: 'COMPLETED', symbols: ['AMZN', 'TSLA', 'NVDA'], processed: 3, total: 3, startedAt: '2024-01-01T12:05:00Z', completedAt: '2024-01-01T12:10:00Z' },
    { index: 2, status: 'PROCESSING', symbols: ['META', 'NFLX', 'AMD'], processed: 1, total: 3, startedAt: '2024-01-01T12:10:00Z' },
    { index: 3, status: 'PENDING', symbols: ['INTC', 'CSCO', 'ORCL'], processed: 0, total: 3 },
    { index: 4, status: 'PENDING', symbols: ['ADBE', 'CRM', 'PYPL'], processed: 0, total: 3 },
  ],
  startedAt: '2024-01-01T12:00:00Z',
  updatedAt: '2024-01-01T12:15:00Z',
};

const MOCK_LOGS = [
  { id: '1', timestamp: '2024-01-01T12:00:05Z', level: 'INFO', message: 'Session started with 200 symbols' },
  { id: '2', timestamp: '2024-01-01T12:00:10Z', level: 'INFO', message: 'Chunk 0 processing started (AAPL, MSFT, GOOGL)' },
  { id: '3', timestamp: '2024-01-01T12:05:15Z', level: 'INFO', message: 'Chunk 0 completed - 3 opportunities found' },
  { id: '4', timestamp: '2024-01-01T12:05:20Z', level: 'INFO', message: 'Chunk 1 processing started (AMZN, TSLA, NVDA)' },
  { id: '5', timestamp: '2024-01-01T12:10:25Z', level: 'INFO', message: 'Chunk 1 completed - 5 opportunities found' },
  { id: '6', timestamp: '2024-01-01T12:10:30Z', level: 'INFO', message: 'Chunk 2 processing started (META, NFLX, AMD)' },
  { id: '7', timestamp: '2024-01-01T12:12:35Z', level: 'WARNING', message: 'AMD: RSI signal below threshold (28.5)' },
  { id: '8', timestamp: '2024-01-01T12:13:40Z', level: 'INFO', message: 'META: Strong bullish signals detected (confidence: 87%)' },
];

const SessionMonitor: React.FC<SessionMonitorProps> = ({
  sessionId,
  userId,
  onSessionComplete,
  onSessionCancel,
}) => {
  const [session, setSession] = useState<ScanSession | null>(null);
  const [progress, setProgress] = useState<ScanProgressResponse | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [realTimeUpdates, setRealTimeUpdates] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Load session data
  const loadSessionData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // TODO: Replace with actual API calls
      // For now, use mock data
      const mockSession = generateMockSession({ 
        id: sessionId, 
        name: 'S&P 500 Technical Scan',
        status: 'PROCESSING',
        totalSymbols: 200,
        symbolsProcessed: 130,
        opportunitiesFound: 42,
      });
      
      setSession(mockSession);
      setProgress(MOCK_PROGRESS);
      setLogs(MOCK_LOGS);
    } catch (err: any) {
      setError(`Failed to load session data: ${err.message}`);
      console.error('Error loading session data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadSessionData();
  }, [sessionId, userId]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || !progress || progress.status !== 'PROCESSING') return;
    
    const intervalId = setInterval(() => {
      loadSessionData();
    }, 5000); // 5 seconds
    
    return () => clearInterval(intervalId);
  }, [autoRefresh, progress?.status]);

  // Check for session completion
  useEffect(() => {
    if (progress?.status === 'COMPLETED' && onSessionComplete) {
      // Simulate results
      const mockResults: any[] = [];
      onSessionComplete(mockResults);
    }
  }, [progress?.status, onSessionComplete]);

  const handleRefresh = () => {
    loadSessionData();
  };

  const handleCancelSession = async () => {
    setCancelling(true);
    try {
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (onSessionCancel) {
        onSessionCancel();
      }
      
      setCancelDialogOpen(false);
    } catch (err) {
      setError('Failed to cancel session');
      console.error('Error cancelling session:', err);
    } finally {
      setCancelling(false);
    }
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
      case 'PROCESSING': return <PlayArrowIcon fontSize="small" />;
      case 'COMPLETED': return <CheckCircleIcon fontSize="small" />;
      case 'FAILED': return <ErrorIcon fontSize="small" />;
      case 'CANCELLED': return <CancelIcon fontSize="small" />;
      case 'PENDING': return <HourglassEmptyIcon fontSize="small" />;
      default: return undefined;
    }
  };

  const getChunkStatusColor = (status: ChunkStatus['status']) => {
    switch (status) {
      case 'COMPLETED': return 'success';
      case 'PROCESSING': return 'primary';
      case 'FAILED': return 'error';
      case 'PENDING': return 'default';
      default: return 'default';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const calculateTimeRemaining = () => {
    if (!progress || !progress.estimatedCompletion) return 'Calculating...';
    
    const now = new Date();
    const completion = new Date(progress.estimatedCompletion);
    const diffMs = completion.getTime() - now.getTime();
    
    if (diffMs <= 0) return 'Soon';
    
    const diffMins = Math.round(diffMs / 60000);
    if (diffMins < 60) {
      return `${diffMins} minute${diffMins !== 1 ? 's' : ''}`;
    } else {
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      return `${hours}h ${mins}m`;
    }
  };

  if (loading && !session) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && !session) {
    return (
      <Alert severity="error" sx={{ m: 3 }}>
        {error}
        <Button onClick={loadSessionData} sx={{ ml: 2 }} size="small">
          Retry
        </Button>
      </Alert>
    );
  }

  if (!session || !progress) {
    return (
      <Alert severity="warning" sx={{ m: 3 }}>
        Session not found
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      {/* Session Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            {session.name}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Chip
              label={session.status}
              color={getStatusColor(session.status)}
              icon={getStatusIcon(session.status)}
              size="medium"
            />
            <Typography variant="body2" color="text.secondary">
              Started: {formatTime(session.startedAt)}
            </Typography>
            {session.description && (
              <Typography variant="body2" color="text.secondary">
                {session.description}
              </Typography>
            )}
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Tooltip title="Refresh">
            <IconButton onClick={handleRefresh}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          
          <FormControlLabel
            control={
              <Switch
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                disabled={progress.status !== 'PROCESSING'}
              />
            }
            label="Auto-refresh"
          />
          
          {session.status === 'PROCESSING' && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<CancelIcon />}
              onClick={() => setCancelDialogOpen(true)}
            >
              Cancel Session
            </Button>
          )}
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Progress Overview */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Progress Overview
          </Typography>
          
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Overall Progress
              </Typography>
              <Typography variant="body2" fontWeight="medium">
                {progress.progress}% ({progress.symbolsProcessed}/{progress.totalSymbols} symbols)
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={progress.progress} 
              sx={{ height: 10, borderRadius: 5 }}
            />
          </Box>
          
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <TrendingUpIcon color="primary" />
                  <Typography variant="body2" color="text.secondary">
                    Opportunities Found
                  </Typography>
                </Box>
                <Typography variant="h4">
                  {progress.opportunitiesFound}
                </Typography>
              </Paper>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <SpeedIcon color="primary" />
                  <Typography variant="body2" color="text.secondary">
                    Processing Rate
                  </Typography>
                </Box>
                <Typography variant="h4">
                  {progress.processingRate.toFixed(1)}
                  <Typography variant="caption" sx={{ ml: 0.5 }}>
                    symbols/sec
                  </Typography>
                </Typography>
              </Paper>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <ScheduleIcon color="primary" />
                  <Typography variant="body2" color="text.secondary">
                    Time Remaining
                  </Typography>
                </Box>
                <Typography variant="h4">
                  {calculateTimeRemaining()}
                </Typography>
              </Paper>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <MemoryIcon color="primary" />
                  <Typography variant="body2" color="text.secondary">
                    Chunks
                  </Typography>
                </Box>
                <Typography variant="h4">
                  {progress.chunks.filter(c => c.status === 'COMPLETED').length}/{progress.chunks.length}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  completed
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Chunk Status Grid */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Chunk Status
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Symbols are processed in parallel chunks for better performance.
          </Typography>
          
          <Grid container spacing={2}>
            {progress.chunks.map((chunk) => (
              <Grid item xs={12} sm={6} md={4} key={chunk.index}>
                <Paper 
                  variant="outlined" 
                  sx={{ 
                    p: 2,
                    borderColor: getChunkStatusColor(chunk.status) === 'default' ? 'divider' : `${getChunkStatusColor(chunk.status)}.main`,
                    bgcolor: chunk.status === 'PROCESSING' ? 'primary.50' : 'background.paper',
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle2">
                      Chunk {chunk.index + 1}
                    </Typography>
                    <Chip
                      label={chunk.status}
                      size="small"
                      color={getChunkStatusColor(chunk.status)}
                    />
                  </Box>
                  
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Symbols: {chunk.symbols.join(', ')}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ mb: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        Progress
                      </Typography>
                      <Typography variant="caption" fontWeight="medium">
                        {chunk.processed}/{chunk.total}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={(chunk.processed / chunk.total) * 100}
                      sx={{ height: 6, borderRadius: 3 }}
                    />
                  </Box>
                  
                  {chunk.startedAt && (
                    <Typography variant="caption" color="text.secondary">
                      Started: {formatTime(chunk.startedAt)}
                    </Typography>
                  )}
                  {chunk.completedAt && (
                    <Typography variant="caption" color="text.secondary">
                      Completed: {formatTime(chunk.completedAt)}
                    </Typography>
                  )}
                </Paper>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* Live Log Feed */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6">
              Live Log Feed
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={realTimeUpdates}
                  onChange={(e) => setRealTimeUpdates(e.target.checked)}
                />
              }
              label="Real-time updates"
            />
          </Box>
          
          <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 400 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell width="120">Time</TableCell>
                  <TableCell width="80">Level</TableCell>
                  <TableCell>Message</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id} hover>
                    <TableCell>
                      <Typography variant="caption">
                        {formatTime(log.timestamp)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={log.level}
                        size="small"
                        color={log.level === 'ERROR' ? 'error' : log.level === 'WARNING' ? 'warning' : 'default'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {log.message}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          {logs.length === 0 && (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                No logs available yet
              </Typography>
            </Paper>
          )}
        </CardContent>
      </Card>

      {/* Cancel Session Dialog */}
      <Dialog
        open={cancelDialogOpen}
        onClose={() => setCancelDialogOpen(false)}
      >
        <DialogTitle>Cancel Scan Session</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to cancel this scan session?
            Any progress will be lost and the session cannot be resumed.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialogOpen(false)} disabled={cancelling}>
            Keep Running
          </Button>
          <Button
            onClick={handleCancelSession}
            color="error"
            variant="contained"
            disabled={cancelling}
            startIcon={cancelling ? <CircularProgress size={20} /> : <CancelIcon />}
          >
            {cancelling ? 'Cancelling...' : 'Cancel Session'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SessionMonitor;
