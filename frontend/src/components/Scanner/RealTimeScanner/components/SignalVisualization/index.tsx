import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  LinearProgress,
  Paper,
  Grid,
  IconButton,
  Tooltip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Switch,
  FormControlLabel,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import InfoIcon from '@mui/icons-material/Info';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import {
  SignalVisualizationProps,
  Signal,
  SignalType,
} from '../../../../../types/real-time-scanner';

const SignalVisualization: React.FC<SignalVisualizationProps> = ({
  signals,
  opportunity,
  showConfidence = true,
  interactive = true,
  onSignalClick,
}) => {
  const [expandedSignal, setExpandedSignal] = useState<Signal | null>(null);
  const [visualizationType, setVisualizationType] = useState<'compact' | 'detailed'>('compact');
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const getSignalColor = (signalType: SignalType) => {
    switch (signalType) {
      case 'RSI': return 'primary';
      case 'EMA': return 'secondary';
      case 'MACD': return 'success';
      case 'VOLUME': return 'warning';
      case 'PRICE_CHANGE': return 'error';
      case 'BB': return 'info';
      case 'STOCH': return 'primary';
      case 'ADX': return 'secondary';
      case 'ATR': return 'success';
      case 'OBV': return 'warning';
      default: return 'default';
    }
  };

  const getDirectionIcon = (direction: Signal['direction']) => {
    switch (direction) {
      case 'bullish': return <TrendingUpIcon color="success" fontSize="small" />;
      case 'bearish': return <TrendingDownIcon color="error" fontSize="small" />;
      case 'neutral': return <TrendingFlatIcon color="action" fontSize="small" />;
      default: return null;
    }
  };

  const getSignalDescription = (signal: Signal) => {
    switch (signal.type) {
      case 'RSI':
        return `RSI ${signal.value.toFixed(1)} (Threshold: ${signal.threshold}) - ${signal.direction} signal`;
      case 'EMA':
        return `EMA Crossover - ${signal.direction} momentum`;
      case 'MACD':
        return `MACD ${signal.value.toFixed(3)} - ${signal.direction} divergence`;
      case 'VOLUME':
        return `Volume ${signal.value.toFixed(1)}x average - ${signal.direction} pressure`;
      case 'PRICE_CHANGE':
        return `Price change ${signal.value.toFixed(1)}% - ${signal.direction} trend`;
      default:
        return `${signal.type} signal - ${signal.direction}`;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'success';
    if (confidence >= 60) return 'warning';
    return 'error';
  };

  const handleSignalClick = (signal: Signal) => {
    if (interactive) {
      setExpandedSignal(expandedSignal?.type === signal.type ? null : signal);
      if (onSignalClick) {
        onSignalClick(signal);
      }
    }
  };

  const handleViewAllDetails = () => {
    setDetailDialogOpen(true);
  };

  const renderCompactView = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle1">
          Detected Signals ({signals.length})
        </Typography>
        {interactive && (
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={visualizationType === 'detailed'}
                onChange={(e) => setVisualizationType(e.target.checked ? 'detailed' : 'compact')}
              />
            }
            label="Detailed"
          />
        )}
      </Box>
      
      <Grid container spacing={2}>
        {signals.map((signal, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Paper 
              variant="outlined" 
              sx={{ 
                p: 2,
                cursor: interactive ? 'pointer' : 'default',
                borderColor: expandedSignal?.type === signal.type ? 'primary.main' : 'divider',
                bgcolor: expandedSignal?.type === signal.type ? 'primary.50' : 'background.paper',
              }}
              onClick={() => handleSignalClick(signal)}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip
                    label={signal.type}
                    size="small"
                    color={getSignalColor(signal.type)}
                  />
                  {getDirectionIcon(signal.direction)}
                </Box>
                {interactive && (
                  <IconButton size="small">
                    {expandedSignal?.type === signal.type ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </IconButton>
                )}
              </Box>
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {signal.description}
              </Typography>
              
              {showConfidence && (
                <Box sx={{ mb: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      Confidence
                    </Typography>
                    <Typography variant="caption" fontWeight="medium">
                      {signal.confidence}%
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={signal.confidence} 
                    color={getConfidenceColor(signal.confidence)}
                    sx={{ height: 6, borderRadius: 3 }}
                  />
                </Box>
              )}
              
              {expandedSignal?.type === signal.type && (
                <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Value: {signal.value.toFixed(3)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Threshold: {signal.threshold.toFixed(2)}
                  </Typography>
                  {signal.parameters && Object.keys(signal.parameters).length > 0 && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      Parameters: {Object.entries(signal.parameters).map(([k, v]) => `${k}: ${v}`).join(', ')}
                    </Typography>
                  )}
                </Box>
              )}
            </Paper>
          </Grid>
        ))}
      </Grid>
      
      {interactive && signals.length > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Button 
            variant="outlined" 
            size="small"
            onClick={handleViewAllDetails}
            startIcon={<InfoIcon />}
          >
            View All Signal Details
          </Button>
        </Box>
      )}
    </Box>
  );

  const renderDetailedView = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">
          Signal Analysis
        </Typography>
        <Button 
          size="small" 
          onClick={() => setVisualizationType('compact')}
        >
          Back to Compact View
        </Button>
      </Box>
      
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Signal</TableCell>
              <TableCell>Direction</TableCell>
              <TableCell>Value</TableCell>
              <TableCell>Threshold</TableCell>
              <TableCell>Confidence</TableCell>
              <TableCell>Description</TableCell>
              {interactive && <TableCell>Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {signals.map((signal, index) => (
              <TableRow key={index} hover={interactive}>
                <TableCell>
                  <Chip
                    label={signal.type}
                    size="small"
                    color={getSignalColor(signal.type)}
                  />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {getDirectionIcon(signal.direction)}
                    <Typography variant="body2">
                      {signal.direction}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {signal.value.toFixed(3)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {signal.threshold.toFixed(2)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2">
                      {signal.confidence}%
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={signal.confidence} 
                      color={getConfidenceColor(signal.confidence)}
                      sx={{ width: 60, height: 6, borderRadius: 3 }}
                    />
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {signal.description}
                  </Typography>
                </TableCell>
                {interactive && (
                  <TableCell>
                    <Tooltip title="View details">
                      <IconButton 
                        size="small"
                        onClick={() => handleSignalClick(signal)}
                      >
                        <InfoIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      
      {signals.length === 0 && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            No signals detected
          </Typography>
        </Paper>
      )}
    </Box>
  );

  const renderSignalDetailDialog = () => (
    <Dialog
      open={detailDialogOpen}
      onClose={() => setDetailDialogOpen(false)}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        Signal Details for {opportunity.symbol}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Opportunity Summary
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6} sm={3}>
              <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                  Score
                </Typography>
                <Typography variant="h6">
                  {opportunity.score.toFixed(1)}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                  Confidence
                </Typography>
                <Typography variant="h6">
                  {opportunity.confidence}%
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                  Signals
                </Typography>
                <Typography variant="h6">
                  {signals.length}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                  Rank
                </Typography>
                <Typography variant="h6">
                  #{opportunity.rank}
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Box>
        
        <Typography variant="subtitle1" gutterBottom>
          Individual Signal Analysis
        </Typography>
        <Grid container spacing={2}>
          {signals.map((signal, index) => (
            <Grid item xs={12} sm={6} key={index}>
              <Card variant="outlined">
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip
                        label={signal.type}
                        color={getSignalColor(signal.type)}
                      />
                      {getDirectionIcon(signal.direction)}
                    </Box>
                    <Typography variant="h6">
                      {signal.confidence}%
                    </Typography>
                  </Box>
                  
                  <Typography variant="body2" paragraph>
                    {getSignalDescription(signal)}
                  </Typography>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Signal Value: {signal.value.toFixed(3)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Threshold: {signal.threshold.toFixed(2)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Detected: {new Date(signal.timestamp).toLocaleString()}
                    </Typography>
                  </Box>
                  
                  <LinearProgress 
                    variant="determinate" 
                    value={signal.confidence} 
                    color={getConfidenceColor(signal.confidence)}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setDetailDialogOpen(false)}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <Box>
      {visualizationType === 'compact' ? renderCompactView() : renderDetailedView()}
      {renderSignalDetailDialog()}
    </Box>
  );
};

export default SignalVisualization;