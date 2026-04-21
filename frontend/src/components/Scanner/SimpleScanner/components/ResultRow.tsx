import React, { useState } from 'react';
import {
  TableRow,
  TableCell,
  IconButton,
  Collapse,
  Box,
  Typography,
  Button,
  Chip,
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import AddIcon from '@mui/icons-material/Add';
import SignalBadge from './SignalBadge';
import { SimplifiedOpportunity } from '../../../../types/simple-scanner';

interface ResultRowProps {
  opportunity: SimplifiedOpportunity;
  onAddToWatchlist?: (symbol: string) => void;
}

const ResultRow: React.FC<ResultRowProps> = ({ opportunity, onAddToWatchlist }) => {
  const [expanded, setExpanded] = useState(false);

  // Format price with 2 decimal places
  const formatPrice = (price: number) => {
    return `$${price.toFixed(2)}`;
  };

  // Format percentage change with sign
  const formatChange = (change: number) => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}%`;
  };

  // Get color for change
  const getChangeColor = (change: number) => {
    return change >= 0 ? 'success.main' : 'error.main';
  };

  // Get score badge color
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
  };

  // Get score badge text
  const getScoreText = (score: number) => {
    if (score >= 80) return '🔥 Hot';
    if (score >= 60) return '⚡ Strong';
    return '📈 Watch';
  };

  return (
    <>
      <TableRow
        sx={{
          '& > *': { borderBottom: 'unset' },
          backgroundColor: expanded ? 'action.hover' : 'inherit',
          cursor: 'pointer',
          '&:hover': {
            backgroundColor: 'action.hover',
          },
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <TableCell>
          <IconButton
            aria-label="expand row"
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
          >
            {expanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell>
          <Box>
            <Typography variant="body1" fontWeight="bold">
              {opportunity.symbol}
            </Typography>
            {opportunity.companyName && (
              <Typography variant="caption" color="text.secondary">
                {opportunity.companyName}
              </Typography>
            )}
          </Box>
        </TableCell>
        <TableCell>
          <Typography variant="body1" fontWeight="medium">
            {formatPrice(opportunity.price)}
          </Typography>
        </TableCell>
        <TableCell>
          <Typography
            variant="body1"
            color={getChangeColor(opportunity.changePct)}
            fontWeight="medium"
          >
            {formatChange(opportunity.changePct)}
          </Typography>
        </TableCell>
        <TableCell>
          <Chip
            label={`${getScoreText(opportunity.score)} (${opportunity.score.toFixed(0)})`}
            color={getScoreColor(opportunity.score)}
            size="small"
            variant="outlined"
          />
        </TableCell>
        <TableCell>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {opportunity.signals.slice(0, 3).map((signal, index) => (
              <SignalBadge key={index} signal={signal} compact />
            ))}
            {opportunity.signals.length > 3 && (
              <Chip
                size="small"
                label={`+${opportunity.signals.length - 3}`}
                variant="outlined"
              />
            )}
          </Box>
        </TableCell>
        <TableCell>
          {onAddToWatchlist && (
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onAddToWatchlist(opportunity.symbol);
              }}
              color="primary"
              title="Add to watchlist"
            >
              <AddIcon />
            </IconButton>
          )}
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={7}>
          <Collapse in={expanded} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 2 }}>
              <Typography variant="h6" gutterBottom>
                Why this stock?
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" paragraph>
                  This stock has been identified based on the following signals:
                </Typography>
                
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                  {opportunity.signals.map((signal, index) => (
                    <SignalBadge key={index} signal={signal} />
                  ))}
                </Box>
              </Box>
              
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Confidence
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {opportunity.confidence.toFixed(0)}%
                  </Typography>
                </Box>
                
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Rank
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    #{opportunity.rank}
                  </Typography>
                </Box>
                
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Volume
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {(opportunity.volume / 1000000).toFixed(1)}M
                  </Typography>
                </Box>
                
                {opportunity.sector && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Sector
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {opportunity.sector}
                    </Typography>
                  </Box>
                )}
              </Box>
              
              <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                {onAddToWatchlist && (
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={() => onAddToWatchlist(opportunity.symbol)}
                  >
                    Add to Watchlist
                  </Button>
                )}
                <Button size="small" variant="text">
                  View Details
                </Button>
              </Box>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

export default ResultRow;