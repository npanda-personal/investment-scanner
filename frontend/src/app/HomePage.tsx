import { Box, Button, Paper, Typography } from '@mui/material';
import { Link } from 'react-router-dom';

export default function HomePage() {
  return (
    <Box sx={{ maxWidth: 1100 }}>
      <Typography variant="h4" sx={{ mb: 1 }}>Investment Scanner</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Modular market data, stock research, and signal generation workspace.
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6">Market Data Foundation</Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>Explore instruments, prices, fundamentals, corporate actions, and FX metadata.</Typography>
          <Button component={Link} to="/market-data-foundation">Open</Button>
        </Paper>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6">Stock Research Workbench</Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>Open a stock from Market Data Foundation to view research analytics.</Typography>
          <Button component={Link} to="/market-data-foundation">Find Stock</Button>
        </Paper>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6">Signal Generation Engine</Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>Review generated bullish, neutral, and bearish stock signals.</Typography>
          <Button component={Link} to="/signals">Open</Button>
        </Paper>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6">Portfolio Management</Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>Track manual portfolios, holdings, valuation, allocation, and transactions.</Typography>
          <Button component={Link} to="/portfolios">Open</Button>
        </Paper>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6">Watchlist Management</Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>Track stock ideas with price, signal, notes, and research links.</Typography>
          <Button component={Link} to="/watchlists">Open</Button>
        </Paper>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6">Alerts & Monitoring</Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>Review alert rules and in-app monitoring events.</Typography>
          <Button component={Link} to="/alerts">Open</Button>
        </Paper>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6">Market Context Intelligence</Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>Understand regime, sector rotation, breadth, country strength, and macro context.</Typography>
          <Button component={Link} to="/market-context">Open</Button>
        </Paper>
      </Box>
    </Box>
  );
}
