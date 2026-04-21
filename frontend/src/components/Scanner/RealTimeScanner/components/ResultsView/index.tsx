import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Paper,
  Chip,
  LinearProgress,
  IconButton,
  Tooltip,
  TextField,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormGroup,
  FormControlLabel,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Pagination,
  SelectChangeEvent,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import FilterListIcon from '@mui/icons-material/FilterList';
import DownloadIcon from '@mui/icons-material/Download';
import SortIcon from '@mui/icons-material/Sort';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CloseIcon from '@mui/icons-material/Close';
import {
  ResultsViewProps,
  ScoredOpportunity,
  ScanSession,
  ResultFilters,
  SignalType,
  generateMockOpportunity,
} from '../../../../../types/real-time-scanner';

// Mock data for development
const MOCK_OPPORTUNITIES: ScoredOpportunity[] = Array.from({ length: 25 }, (_, i) => 
  generateMockOpportunity({ 
    symbol: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX', 'AMD', 'INTC'][i % 10],
    score: 85 - i * 2 + Math.random() * 10,
    confidence: 70 + Math.random() * 25,
    rank: i + 1,
  })
);

const SECTORS = [
  'Technology',
  'Healthcare',
  'Financials',
  'Consumer Discretionary',
  'Consumer Staples',
  'Energy',
  'Industrials',
  'Utilities',
  'Real Estate',
  'Materials',
];

const DEFAULT_FILTERS: ResultFilters = {
  confidenceMin: 60,
  confidenceMax: 100,
  signalTypes: ['RSI', 'EMA', 'MACD', 'VOLUME', 'PRICE_CHANGE'],
  sectors: [],
  marketCapMin: 0,
  marketCapMax: 1000000000000, // 1 trillion
};

type SortField = 'score' | 'confidence' | 'rank' | 'symbol' | 'price' | 'change';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

const ResultsView: React.FC<ResultsViewProps> = ({
  sessionId,
  userId,
  initialFilters,
  onOpportunitySelect,
}) => {
  const [opportunities, setOpportunities] = useState<ScoredOpportunity[]>([]);
  const [filteredOpportunities, setFilteredOpportunities] = useState<ScoredOpportunity[]>([]);
  const [filters, setFilters] = useState<ResultFilters>(initialFilters || DEFAULT_FILTERS);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'rank', direction: 'asc' });
  const [selectedOpportunity, setSelectedOpportunity] = useState<ScoredOpportunity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [session, setSession] = useState<ScanSession | null>(null);

  // Load results data
  const loadResultsData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // TODO: Replace with actual API calls
      // For now, use mock data
      await new Promise(resolve => setTimeout(resolve, 800)); // Simulate API delay
      
      setOpportunities(MOCK_OPPORTUNITIES);
      
      // Mock session data
      const mockSession: ScanSession = {
        id: sessionId,
        userId: userId || 'user-1',
        name: 'S&P 500 Technical Scan',
        status: 'COMPLETED',
        scopeType: 'preset',
        scopeData: { presetId: 'preset-1' },
        signals: [],
        rankingConfig: {
          signalWeight: 60,
          volumeWeight: 20,
          changeWeight: 15,
          recencyWeight: 5,
          confidenceThreshold: 60,
          maxResults: 50,
        },
        totalSymbols: 200,
        symbolsProcessed: 200,
        opportunitiesFound: MOCK_OPPORTUNITIES.length,
        startedAt: '2024-01-01T12:00:00Z',
        completedAt: '2024-01-01T12:25:00Z',
        createdAt: '2024-01-01T11:55:00Z',
        updatedAt: '2024-01-01T12:25:00Z',
      };
      setSession(mockSession);
    } catch (err: any) {
      setError(`Failed to load results: ${err.message}`);
      console.error('Error loading results:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadResultsData();
  }, [sessionId, userId]);

  // Apply filters and sorting
  useEffect(() => {
    if (opportunities.length === 0) {
      setFilteredOpportunities([]);
      return;
    }

    let filtered = [...opportunities];

    // Apply confidence filter
    filtered = filtered.filter(
      opp => opp.confidence >= filters.confidenceMin && opp.confidence <= filters.confidenceMax
    );

    // Apply signal types filter
    if (filters.signalTypes && filters.signalTypes.length > 0) {
      filtered = filtered.filter(opp =>
        opp.signals.some(signal => filters.signalTypes!.includes(signal.type))
      );
    }

    // Apply sector filter
    if (filters.sectors && filters.sectors.length > 0) {
      filtered = filtered.filter(opp =>
        opp.metadata.sector && filters.sectors!.includes(opp.metadata.sector)
      );
    }

    // Apply market cap filter
    filtered = filtered.filter(opp => {
      const marketCap = opp.metadata.marketCap || 0;
      const minCap = filters.marketCapMin || 0;
      const maxCap = filters.marketCapMax || Infinity;
      return marketCap >= minCap && marketCap <= maxCap;
    });

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortConfig.field) {
        case 'score':
          aValue = a.score;
          bValue = b.score;
          break;
        case 'confidence':
          aValue = a.confidence;
          bValue = b.confidence;
          break;
        case 'rank':
          aValue = a.rank;
          bValue = b.rank;
          break;
        case 'symbol':
          aValue = a.symbol;
          bValue = b.symbol;
          break;
        case 'price':
          aValue = a.metadata.price;
          bValue = b.metadata.price;
          break;
        case 'change':
          aValue = a.metadata.change;
          bValue = b.metadata.change;
          break;
        default:
          return 0;
      }

      if (sortConfig.direction === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    setFilteredOpportunities(filtered);
    setPage(1); // Reset to first page when filters change
  }, [opportunities, filters, sortConfig]);

  const handleSort = (field: SortField) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleFilterChange = (updates: Partial<ResultFilters>) => {
    setFilters(prev => ({ ...prev, ...updates }));
  };

  const handleResetFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  const handleOpportunityClick = (opportunity: ScoredOpportunity) => {
    setSelectedOpportunity(opportunity);
    setDetailDialogOpen(true);
    
    if (onOpportunitySelect) {
      onOpportunitySelect(opportunity);
    }
  };

  const handleExportCSV = () => {
    // TODO: Implement CSV export
    alert('CSV export would be implemented here');
  };

  const handleExportJSON = () => {
    // TODO: Implement JSON export
    alert('JSON export would be implemented here');
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  const handleRowsPerPageChange = (event: SelectChangeEvent<number>) => {
    setRowsPerPage(Number(event.target.value));
    setPage(1);
  };

  const getSignalColor = (signalType: SignalType) => {
    switch (signalType) {
      case 'RSI': return 'primary';
      case 'EMA': return 'secondary';
      case 'MACD': return 'success';
      case 'VOLUME': return 'warning';
      case 'PRICE_CHANGE': return 'error';
      default: return 'default';
    }
  };

  const formatMarketCap = (value: number | undefined) => {
    if (!value) return 'N/A';
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    return `$${value.toFixed(0)}`;
  };

  // Calculate pagination
  const startIndex = (page - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedOpportunities = filteredOpportunities.slice(startIndex, endIndex);
  const totalPages = Math.ceil(filteredOpportunities.length / rowsPerPage);

  if (loading && opportunities.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && opportunities.length === 0) {
    return (
      <Alert severity="error" sx={{ m: 3 }}>
        {error}
        <Button onClick={loadResultsData} sx={{ ml: 2 }} size="small">
          Retry
        </Button>
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Scan Results
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {session?.name || 'Session Results'} • {filteredOpportunities.length} opportunities found
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Tooltip title="Refresh">
            <IconButton onClick={loadResultsData}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Filters">
            <IconButton 
              onClick={() => setShowFilters(!showFilters)}
              color={showFilters ? 'primary' : 'default'}
            >
              <FilterListIcon />
            </IconButton>
          </Tooltip>
          
          <Button
            startIcon={<DownloadIcon />}
            onClick={handleExportCSV}
            variant="outlined"
          >
            Export CSV
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Filter Panel */}
      {showFilters && (
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">
                Filters
              </Typography>
              <Button onClick={handleResetFilters} size="small">
                Reset All
              </Button>
            </Box>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Confidence Range
                </Typography>
                <Box sx={{ px: 2 }}>
                  <Slider
                    value={[filters.confidenceMin, filters.confidenceMax]}
                    onChange={(_, value) => handleFilterChange({
                      confidenceMin: (value as number[])[0],
                      confidenceMax: (value as number[])[1],
                    })}
                    min={0}
                    max={100}
                    valueLabelDisplay="auto"
                  />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                    <Typography variant="caption">{filters.confidenceMin}%</Typography>
                    <Typography variant="caption">{filters.confidenceMax}%</Typography>
                  </Box>
                </Box>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Signal Types
                </Typography>
                <FormGroup row>
                  {['RSI', 'EMA', 'MACD', 'VOLUME', 'PRICE_CHANGE'].map((type) => (
                    <FormControlLabel
                      key={type}
                      control={
                        <Checkbox
                          checked={filters.signalTypes?.includes(type as SignalType) || false}
                          onChange={(e) => {
                            const newTypes = e.target.checked
                              ? [...(filters.signalTypes || []), type as SignalType]
                              : (filters.signalTypes || []).filter(t => t !== type);
                            handleFilterChange({ signalTypes: newTypes });
                          }}
                          size="small"
                        />
                      }
                      label={type}
                    />
                  ))}
                </FormGroup>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Sectors</InputLabel>
                  <Select
                    multiple
                    value={filters.sectors || []}
                    onChange={(e) => handleFilterChange({ sectors: e.target.value as string[] })}
                    label="Sectors"
                    renderValue={(selected) => (selected as string[]).join(', ')}
                  >
                    {SECTORS.map((sector) => (
                      <MenuItem key={sector} value={sector}>
                        <Checkbox checked={(filters.sectors || []).includes(sector)} />
                        {sector}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Market Cap Range
                </Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    label="Min"
                    type="number"
                    size="small"
                    value={filters.marketCapMin || 0}
                    onChange={(e) => handleFilterChange({ marketCapMin: Number(e.target.value) })}
                    fullWidth
                  />
                  <TextField
                    label="Max"
                    type="number"
                    size="small"
                    value={filters.marketCapMax || 1000000000000}
                    onChange={(e) => handleFilterChange({ marketCapMax: Number(e.target.value) })}
                    fullWidth
                  />
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Results Table */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6">
              Opportunities ({filteredOpportunities.length} total)
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Rows per page:
              </Typography>
              <Select
                value={rowsPerPage}
                onChange={handleRowsPerPageChange}
                size="small"
                sx={{ minWidth: 80 }}
              >
                <MenuItem value={5}>5</MenuItem>
                <MenuItem value={10}>10</MenuItem>
                <MenuItem value={25}>25</MenuItem>
                <MenuItem value={50}>50</MenuItem>
              </Select>
            </Box>
          </Box>
          
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>
                    <TableSortLabel
                      active={sortConfig.field === 'rank'}
                      direction={sortConfig.field === 'rank' ? sortConfig.direction : 'asc'}
                      onClick={() => handleSort('rank')}
                    >
                      Rank
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sortConfig.field === 'symbol'}
                      direction={sortConfig.field === 'symbol' ? sortConfig.direction : 'asc'}
                      onClick={() => handleSort('symbol')}
                    >
                      Symbol
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sortConfig.field === 'score'}
                      direction={sortConfig.field === 'score' ? sortConfig.direction : 'asc'}
                      onClick={() => handleSort('score')}
                    >
                      Score
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sortConfig.field === 'confidence'}
                      direction={sortConfig.field === 'confidence' ? sortConfig.direction : 'asc'}
                      onClick={() => handleSort('confidence')}
                    >
                      Confidence
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sortConfig.field === 'price'}
                      direction={sortConfig.field === 'price' ? sortConfig.direction : 'asc'}
                      onClick={() => handleSort('price')}
                    >
                      Price
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sortConfig.field === 'change'}
                      direction={sortConfig.field === 'change' ? sortConfig.direction : 'asc'}
                      onClick={() => handleSort('change')}
                    >
                      Change
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>Signals</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedOpportunities.map((opportunity) => (
                  <TableRow
                    key={opportunity.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => handleOpportunityClick(opportunity)}
                  >
                    <TableCell>
                      <Chip
                        label={`#${opportunity.rank}`}
                        size="small"
                        color={opportunity.rank <= 3 ? 'success' : 'default'}
                        variant="outlined"
                      />
                    </TableCell>
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
                        <LinearProgress
                          variant="determinate"
                          value={opportunity.score}
                          sx={{ width: 40, height: 6, borderRadius: 3 }}
                        />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2">
                          {opportunity.confidence}%
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={opportunity.confidence}
                          sx={{ width: 40, height: 6, borderRadius: 3 }}
                          color={opportunity.confidence > 80 ? 'success' : opportunity.confidence > 60 ? 'warning' : 'error'}
                        />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        ${opportunity.metadata.price.toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        color={opportunity.metadata.change >= 0 ? 'success.main' : 'error.main'}
                        fontWeight="medium"
                      >
                        {opportunity.metadata.change >= 0 ? '+' : ''}{opportunity.metadata.change.toFixed(2)}
                        ({opportunity.metadata.change >= 0 ? '+' : ''}{(opportunity.metadata.change / opportunity.metadata.price * 100).toFixed(1)}%)
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {opportunity.signals.slice(0, 3).map((signal, idx) => (
                          <Chip
                            key={idx}
                            label={signal.type}
                            size="small"
                            color={getSignalColor(signal.type)}
                            variant="outlined"
                            sx={{ fontSize: '0.7rem' }}
                          />
                        ))}
                        {opportunity.signals.length > 3 && (
                          <Chip
                            label={`+${opportunity.signals.length - 3}`}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.7rem' }}
                          />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Tooltip title="View details">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpportunityClick(opportunity);
                          }}
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          {filteredOpportunities.length === 0 && (
            <Paper sx={{ p: 4, textAlign: 'center', mt: 2 }}>
              <Typography variant="body1" color="text.secondary">
                No opportunities match the current filters
              </Typography>
              <Button
                onClick={handleResetFilters}
                sx={{ mt: 1 }}
                size="small"
              >
                Reset Filters
              </Button>
            </Paper>
          )}
          
          {filteredOpportunities.length > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3 }}>
              <Typography variant="body2" color="text.secondary">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredOpportunities.length)} of {filteredOpportunities.length} opportunities
              </Typography>
              
              <Pagination
                count={totalPages}
                page={page}
                onChange={handlePageChange}
                color="primary"
                size="small"
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Opportunity Detail Dialog */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              {selectedOpportunity?.symbol} - Opportunity Details
            </Typography>
            <IconButton onClick={() => setDetailDialogOpen(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedOpportunity && (
            <Box>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Overview
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">Rank:</Typography>
                        <Typography variant="body2" fontWeight="medium">#{selectedOpportunity.rank}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">Score:</Typography>
                        <Typography variant="body2" fontWeight="medium">{selectedOpportunity.score.toFixed(1)}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">Confidence:</Typography>
                        <Typography variant="body2" fontWeight="medium">{selectedOpportunity.confidence}%</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">Sector:</Typography>
                        <Typography variant="body2" fontWeight="medium">{selectedOpportunity.metadata.sector || 'N/A'}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">Market Cap:</Typography>
                        <Typography variant="body2" fontWeight="medium">{formatMarketCap(selectedOpportunity.metadata.marketCap)}</Typography>
                      </Box>
                    </Box>
                  </Paper>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Price Information
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">Current Price:</Typography>
                        <Typography variant="body2" fontWeight="medium">${selectedOpportunity.metadata.price.toFixed(2)}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">Daily Change:</Typography>
                        <Typography
                          variant="body2"
                          fontWeight="medium"
                          color={selectedOpportunity.metadata.change >= 0 ? 'success.main' : 'error.main'}
                        >
                          {selectedOpportunity.metadata.change >= 0 ? '+' : ''}{selectedOpportunity.metadata.change.toFixed(2)}
                          ({selectedOpportunity.metadata.change >= 0 ? '+' : ''}{(selectedOpportunity.metadata.change / selectedOpportunity.metadata.price * 100).toFixed(1)}%)
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">Volume:</Typography>
                        <Typography variant="body2" fontWeight="medium">
                          {selectedOpportunity.metadata.volume >= 1e6
                            ? `${(selectedOpportunity.metadata.volume / 1e6).toFixed(1)}M`
                            : `${(selectedOpportunity.metadata.volume / 1e3).toFixed(1)}K`}
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>
                </Grid>
                
                <Grid item xs={12}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Detected Signals ({selectedOpportunity.signals.length})
                    </Typography>
                    <Grid container spacing={1}>
                      {selectedOpportunity.signals.map((signal, idx) => (
                        <Grid item xs={12} sm={6} md={4} key={idx}>
                          <Paper variant="outlined" sx={{ p: 1.5 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Chip
                                label={signal.type}
                                size="small"
                                color={getSignalColor(signal.type)}
                              />
                              <Typography variant="body2" fontWeight="medium">
                                {signal.confidence}%
                              </Typography>
                            </Box>
                            <Typography variant="caption" color="text.secondary">
                              {signal.description}
                            </Typography>
                            <Typography variant="caption" display="block" color="text.secondary">
                              Direction: {signal.direction}
                            </Typography>
                          </Paper>
                        </Grid>
                      ))}
                    </Grid>
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>
            Close
          </Button>
          <Button
            variant="contained"
            onClick={handleExportJSON}
          >
            Export as JSON
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ResultsView;