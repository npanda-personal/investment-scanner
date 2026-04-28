import React from 'react';
import { Alert, Box, Button, Paper, Snackbar, Typography } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { SignalBadge } from './SignalBadge';
import { AddSignalToPortfolioDialog } from './AddSignalToPortfolioDialog';
import type { SignalResult } from '../types';

const formatDateTime = (value: string) => new Date(value).toLocaleString();

export const SignalCard: React.FC<{ signal: SignalResult }> = ({ signal }) => {
  const navigate = useNavigate();
  const reasons = signal.triggered_signals.length > 0 ? signal.triggered_signals : signal.negative_signals;
  const [portfolioDialogOpen, setPortfolioDialogOpen] = React.useState(false);
  const [successPortfolioId, setSuccessPortfolioId] = React.useState<string | null>(null);

  return (
    <>
      <Paper variant="outlined" sx={{ p: 1.5, height: '100%' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mb: 1 }}>
          <Box>
            <Typography fontWeight={700}>{signal.symbol}</Typography>
            <Typography variant="body2" color="text.secondary">{signal.company_name || 'Unknown company'}</Typography>
          </Box>
          <SignalBadge direction={signal.direction} />
        </Box>
        <Typography variant="h5">{signal.score}</Typography>
        <Typography variant="caption" color="text.secondary">Confidence: {signal.confidence}</Typography>
        <Box component="ul" sx={{ pl: 2, my: 1 }}>
          {reasons.slice(0, 3).map((reason) => (
            <Typography key={reason.code} component="li" variant="body2">{reason.label}</Typography>
          ))}
        </Box>
        <Typography variant="caption" color="text.secondary">{formatDateTime(signal.generated_at)}</Typography>
        <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button size="small" onClick={() => navigate(`/research/stocks/${signal.instrument_id}`)}>Research</Button>
          <Button size="small" variant="outlined" onClick={() => setPortfolioDialogOpen(true)}>Add to Portfolio</Button>
        </Box>
      </Paper>
      <AddSignalToPortfolioDialog
        open={portfolioDialogOpen}
        signal={signal}
        onClose={() => setPortfolioDialogOpen(false)}
        onAdded={(portfolioId) => setSuccessPortfolioId(portfolioId)}
      />
      <Snackbar open={Boolean(successPortfolioId)} autoHideDuration={5000} onClose={() => setSuccessPortfolioId(null)}>
        <Alert severity="success" variant="filled" onClose={() => setSuccessPortfolioId(null)}>
          Added {signal.symbol} to portfolio. <Button color="inherit" component={Link} to={successPortfolioId ? `/portfolios/${successPortfolioId}` : '/portfolios'} size="small">Open</Button>
        </Alert>
      </Snackbar>
    </>
  );
};
