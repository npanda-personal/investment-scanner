import { Box, Button, Paper, Typography } from '@mui/material';
import { Link } from 'react-router-dom';

export default function HomePage() {
  return (
    <Box sx={{ maxWidth: 1100 }}>
      <Typography variant="h4" sx={{ mb: 1 }}>Investment Scanner</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Launch primary workflows.
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6">Today Review</Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>Review today&apos;s publish status and candidate queue.</Typography>
          <Button component={Link} to="/today-review">Open</Button>
        </Paper>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6">Research Command Center</Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>Investigate stock-level research context and evidence.</Typography>
          <Button component={Link} to="/research">Open</Button>
        </Paper>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6">Market Data Foundation</Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>Explore instruments, prices, fundamentals, corporate actions, and FX metadata.</Typography>
          <Button component={Link} to="/market-data-foundation">Open</Button>
        </Paper>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6">Trade Plans</Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>Generate and inspect risk-aware trade plans.</Typography>
          <Button component={Link} to="/trade-plans">Open</Button>
        </Paper>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6">Portfolios</Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>Track holdings, valuation, and allocation.</Typography>
          <Button component={Link} to="/portfolios">Open</Button>
        </Paper>
      </Box>
    </Box>
  );
}
