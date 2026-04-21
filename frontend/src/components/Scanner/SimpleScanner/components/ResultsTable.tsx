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
                Score
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
          {opportunities.map((opportunity) => (
            <ResultRow
              key={opportunity.id}
              opportunity={opportunity}
              onAddToWatchlist={onAddToWatchlist}
            />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default ResultsTable;