import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Chip,
  Tooltip,
  LinearProgress,
  Card,
  CardContent,
  IconButton,
  Divider,
  Stack,
  useTheme,
} from '@mui/material';
import {
  PlayCircle,
  PauseCircle,
  CheckCircle,
  Error,
  Schedule,
  Speed,
  GridView,
  Timeline,
  BarChart,
  ZoomIn,
} from '@mui/icons-material';
import { BatchScanVisualizationProps, ChunkStatus } from '../../../../../types/real-time-scanner';

const BatchScanVisualization: React.FC<BatchScanVisualizationProps> = ({
  chunks,
  totalSymbols,
  processingRate,
  onChunkClick,
}) => {
  const theme = useTheme();

  const getStatusColor = (status: ChunkStatus['status']): 'success' | 'primary' | 'warning' | 'error' | 'info' => {
    switch (status) {
      case 'COMPLETED':
        return 'success';
      case 'PROCESSING':
        return 'primary';
      case 'PENDING':
        return 'warning';
      case 'FAILED':
        return 'error';
      default:
        return 'info';
    }
  };

  const getStatusIcon = (status: ChunkStatus['status']) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle />;
      case 'PROCESSING':
        return <PlayCircle />;
      case 'PENDING':
        return <Schedule />;
      case 'FAILED':
        return <Error />;
      default:
        return <Schedule />;
    }
  };

  const calculateOverallProgress = () => {
    if (chunks.length === 0) return 0;
    const totalProcessed = chunks.reduce((sum, chunk) => sum + chunk.processed, 0);
    const total = chunks.reduce((sum, chunk) => sum + chunk.total, 0);
    return total > 0 ? (totalProcessed / total) * 100 : 0;
  };

  const getChunkEfficiency = (chunk: ChunkStatus) => {
    if (!chunk.startedAt || chunk.status !== 'COMPLETED') return null;
    
    const startTime = new Date(chunk.startedAt).getTime();
    const endTime = chunk.completedAt ? new Date(chunk.completedAt).getTime() : Date.now();
    const duration = (endTime - startTime) / 1000; // seconds
    
    return duration > 0 ? chunk.total / duration : 0;
  };

  const overallProgress = calculateOverallProgress();
  const completedChunks = chunks.filter(chunk => chunk.status === 'COMPLETED').length;
  const processingChunks = chunks.filter(chunk => chunk.status === 'PROCESSING').length;
  const pendingChunks = chunks.filter(chunk => chunk.status === 'PENDING').length;
  const failedChunks = chunks.filter(chunk => chunk.status === 'FAILED').length;

  // Calculate average symbols per chunk
  const avgSymbolsPerChunk = chunks.length > 0 
    ? chunks.reduce((sum, chunk) => sum + chunk.symbols.length, 0) / chunks.length 
    : 0;

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      {/* Header with overall stats */}
      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <GridView color="primary" />
            <Box>
              <Typography variant="h6" fontWeight="medium">
                Batch Scan Visualization
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Parallel processing across {chunks.length} chunks
              </Typography>
            </Box>
          </Box>
          <Stack direction="row" spacing={1}>
            <Chip
              icon={<CheckCircle />}
              label={`${completedChunks} completed`}
              size="small"
              color="success"
              variant="outlined"
            />
            <Chip
              icon={<PlayCircle />}
              label={`${processingChunks} processing`}
              size="small"
              color="primary"
              variant="outlined"
            />
            {pendingChunks > 0 && (
              <Chip
                icon={<Schedule />}
                label={`${pendingChunks} pending`}
                size="small"
                color="warning"
                variant="outlined"
              />
            )}
            {failedChunks > 0 && (
              <Chip
                icon={<Error />}
                label={`${failedChunks} failed`}
                size="small"
                color="error"
                variant="outlined"
              />
            )}
          </Stack>
        </Box>

        {/* Overall progress bar */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Overall Progress
            </Typography>
            <Typography variant="caption" fontWeight="medium">
              {overallProgress.toFixed(1)}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={overallProgress}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>

        {/* Stats grid */}
        <Grid container spacing={2}>
          <Grid item xs={6} sm={3}>
            <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                Total Symbols
              </Typography>
              <Typography variant="h6" fontWeight="bold">
                {totalSymbols}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                Processing Rate
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                <Speed fontSize="small" />
                <Typography variant="h6" fontWeight="bold">
                  {processingRate.toFixed(1)}/s
                </Typography>
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                Chunk Size
              </Typography>
              <Typography variant="h6" fontWeight="bold">
                {avgSymbolsPerChunk.toFixed(0)}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                Parallelism
              </Typography>
              <Typography variant="h6" fontWeight="bold">
                {processingChunks}/{chunks.length}
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Paper>

      {/* Chunk visualization grid */}
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography variant="subtitle1" fontWeight="medium" sx={{ mb: 3 }}>
          Parallel Processing Chunks
        </Typography>

        {chunks.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">
              No chunks available for visualization
            </Typography>
          </Paper>
        ) : (
          <Grid container spacing={2}>
            {chunks.map((chunk) => {
              const chunkProgress = chunk.total > 0 ? (chunk.processed / chunk.total) * 100 : 0;
              const efficiency = getChunkEfficiency(chunk);
              
              return (
                <Grid item xs={12} sm={6} md={4} key={chunk.index}>
                  <Card
                    variant="outlined"
                    sx={{
                      cursor: onChunkClick ? 'pointer' : 'default',
                      borderColor: theme.palette[getStatusColor(chunk.status)].main,
                      '&:hover': onChunkClick ? {
                        borderColor: theme.palette[getStatusColor(chunk.status)].dark,
                        boxShadow: 1,
                      } : {},
                    }}
                    onClick={() => onChunkClick && onChunkClick(chunk.index)}
                  >
                    <CardContent sx={{ p: 2 }}>
                      {/* Chunk header */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getStatusIcon(chunk.status)}
                          <Typography variant="subtitle2" fontWeight="medium">
                            Chunk {chunk.index + 1}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip
                            label={chunk.status}
                            size="small"
                            color={getStatusColor(chunk.status)}
                            variant="outlined"
                          />
                          {onChunkClick && (
                            <Tooltip title="View details">
                              <IconButton size="small">
                                <ZoomIn fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </Box>

                      {/* Progress bar */}
                      <Box sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            {chunk.processed} / {chunk.total} symbols
                          </Typography>
                          <Typography variant="caption" fontWeight="medium">
                            {chunkProgress.toFixed(0)}%
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={chunkProgress}
                          color={getStatusColor(chunk.status)}
                          sx={{ height: 6, borderRadius: 3 }}
                        />
                      </Box>

                      {/* Chunk details */}
                      <Grid container spacing={1}>
                        <Grid item xs={6}>
                          <Paper variant="outlined" sx={{ p: 1, textAlign: 'center' }}>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              Symbols
                            </Typography>
                            <Typography variant="body2" fontWeight="medium">
                              {chunk.symbols.length}
                            </Typography>
                          </Paper>
                        </Grid>
                        <Grid item xs={6}>
                          <Paper variant="outlined" sx={{ p: 1, textAlign: 'center' }}>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              Progress
                            </Typography>
                            <Typography variant="body2" fontWeight="medium">
                              {chunkProgress.toFixed(0)}%
                            </Typography>
                          </Paper>
                        </Grid>
                      </Grid>

                      {/* Efficiency metrics */}
                      {efficiency !== null && (
                        <Paper variant="outlined" sx={{ p: 1, mt: 2, bgcolor: 'action.hover' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Speed fontSize="small" />
                            <Typography variant="caption">
                              Efficiency: {efficiency.toFixed(1)} symbols/sec
                            </Typography>
                          </Box>
                        </Paper>
                      )}

                      {/* Symbol preview */}
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                          Symbol Preview
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {chunk.symbols.slice(0, 5).map((symbol, idx) => (
                            <Chip
                              key={idx}
                              label={symbol}
                              size="small"
                              variant="outlined"
                              sx={{ fontSize: '0.7rem' }}
                            />
                          ))}
                          {chunk.symbols.length > 5 && (
                            <Chip
                              label={`+${chunk.symbols.length - 5}`}
                              size="small"
                              variant="outlined"
                              sx={{ fontSize: '0.7rem' }}
                            />
                          )}
                        </Box>
                      </Box>

                      {/* Timeline info */}
                      {(chunk.startedAt || chunk.completedAt) && (
                        <Box sx={{ mt: 2 }}>
                          <Divider sx={{ mb: 1 }} />
                          <Grid container spacing={1}>
                            {chunk.startedAt && (
                              <Grid item xs={6}>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                  Started
                                </Typography>
                                <Typography variant="caption">
                                  {new Date(chunk.startedAt).toLocaleTimeString([], { 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  })}
                                </Typography>
                              </Grid>
                            )}
                            {chunk.completedAt && (
                              <Grid item xs={6}>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                  Completed
                                </Typography>
                                <Typography variant="caption">
                                  {new Date(chunk.completedAt).toLocaleTimeString([], { 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  })}
                                </Typography>
                              </Grid>
                            )}
                          </Grid>
                        </Box>
                      )}

                      {/* Error message */}
                      {chunk.error && (
                        <Paper 
                          variant="outlined" 
                          sx={{ 
                            p: 1, 
                            mt: 2, 
                            bgcolor: 'error.light', 
                            borderColor: 'error.main' 
                          }}
                        >
                          <Typography variant="caption" color="error.dark">
                            Error: {chunk.error}
                          </Typography>
                        </Paper>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Paper>

      {/* Visualization legend */}
      <Paper variant="outlined" sx={{ p: 2, mt: 3 }}>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
          Legend
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'success.main' }} />
            <Typography variant="caption">Completed</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'primary.main' }} />
            <Typography variant="caption">Processing</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'warning.main' }} />
            <Typography variant="caption">Pending</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'error.main' }} />
            <Typography variant="caption">Failed</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Timeline fontSize="small" />
            <Typography variant="caption">Click chunk for details</Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default BatchScanVisualization;