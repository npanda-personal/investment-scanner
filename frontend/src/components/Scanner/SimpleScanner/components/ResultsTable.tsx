import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
} from '@mui/material';
import ResultRow from './ResultRow';
import { SimplifiedOpportunity } from '../../../../types/simple-scanner';

interface ResultsTableProps {
  opportunities: SimplifiedOpportunity[];
  onAddToWatchlist?: (symbol: string) => void;
  isLoading?: boolean;
}

const ResultsTable: React.FC<ResultsTableProps> = ({
  opportunities,
  onAddToWatchlist,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          Loading opportunities...
        </Typography>
      </Box>
    );
  }

  if (opportunities.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          No opportunities found. Try running a scan.
        </Typography>
      </Box>
    );
  }

  // Group opportunities by decision type and sort by conviction DESC, then alignment
  const sortOpportunities = (opps: SimplifiedOpportunity[]) => {
    return [...opps].sort((a, b) => {
      // First by conviction (higher is better)
      const aConviction = a.conviction ?? a.score ?? 0;
      const bConviction = b.conviction ?? b.score ?? 0;
      if (bConviction !== aConviction) {
        return bConviction - aConviction;
      }
      
      // Then by alignment score (higher is better)
      const aAlignment = a.alignmentScore ?? 0;
      const bAlignment = b.alignmentScore ?? 0;
      return bAlignment - aAlignment;
    });
  };

  const buyOpportunities = sortOpportunities(opportunities.filter(opp => opp.decision === 'BUY'));
  const watchOpportunities = sortOpportunities(opportunities.filter(opp => opp.decision === 'WATCH'));
  const avoidOpportunities = sortOpportunities(opportunities.filter(opp => opp.decision === 'AVOID'));

  const renderSection = (title: string, opportunities: SimplifiedOpportunity[], color: string, icon: string) => {
    if (opportunities.length === 0) return null;

    return (
      <>
        <TableRow sx={{ backgroundColor: `${color}10` }}>
          <TableCell colSpan={9} sx={{ py: 1, borderBottom: `2px solid ${color}30` }}>
            <Typography variant="subtitle1" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <span>{icon}</span>
              {title} ({opportunities.length})
            </Typography>
          </TableCell>
        </TableRow>
        {opportunities.map((opportunity, index) => (
          <ResultRow
            key={opportunity.id}
            opportunity={opportunity}
            onAddToWatchlist={onAddToWatchlist}
            rank={index + 1}
            isTopInSection={index === 0}
          />
        ))}
      </>
    );
  };

  return (
    <TableContainer component={Paper} sx={{ maxHeight: 600, overflow: 'auto' }}>
      <Table stickyHeader size="small">
        <TableHead>
          <TableRow>
            <TableCell width={50} />
            <TableCell>
              <Typography variant="subtitle2" fontWeight="bold">
                Symbol
              </Typography>
            </TableCell>
            <TableCell>
              <Typography variant="subtitle2" fontWeight="bold">
                Price
              </Typography>
            </TableCell>
            <TableCell>
              <Typography variant="subtitle2" fontWeight="bold">
                Change
              </Typography>
            </TableCell>
            <TableCell>
              <Typography variant="subtitle2" fontWeight="bold">
                Conviction
              </Typography>
            </TableCell>
            <TableCell>
              <Typography variant="subtitle2" fontWeight="bold">
                Decision
              </Typography>
            </TableCell>
            <TableCell>
              <Typography variant="subtitle2" fontWeight="bold">
                Alignment
              </Typography>
            </TableCell>
            <TableCell>
              <Typography variant="subtitle2" fontWeight="bold">
                Signals
              </Typography>
            </TableCell>
            <TableCell width={50}>
              <Typography variant="subtitle2" fontWeight="bold">
                Actions
              </Typography>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {renderSection('✅ BUY (Top Opportunities)', buyOpportunities, '#10b981', '✅')}
          {renderSection('👀 WATCH (Potential Setups)', watchOpportunities, '#f59e0b', '👀')}
          {renderSection('❌ AVOID (Filtered Out)', avoidOpportunities, '#ef4444', '❌')}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default ResultsTable;