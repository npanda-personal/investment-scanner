import { Box, Typography } from '@mui/material';
import { DataIngestion } from '@/features/market-data-foundation';
import WatchlistManager from '../components/WatchlistManager';

const DashboardPage = () => {
  return (
    <>
      <Box sx={{ p: 3, borderRadius: 2, backgroundColor: 'background.paper', boxShadow: 1, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Welcome to Investment Scanner
        </Typography>
        <Typography variant="body1" paragraph>
          A professional‑grade investment scanning application for multiple asset classes.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          The frontend is successfully set up. Connect to the backend API to start scanning markets.
        </Typography>
      </Box>

      {/* Data Ingestion Section */}
      <DataIngestion />

      {/* Watchlist Management Section */}
      <Box sx={{ mt: 4 }}>
        <WatchlistManager />
      </Box>

      {/* Feature Highlights */}
      <Box sx={{ mt: 4, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
        <Box sx={{ p: 3, borderRadius: 2, backgroundColor: 'background.paper', boxShadow: 1 }}>
          <Typography variant="h6" gutterBottom>Real‑time Monitoring</Typography>
          <Typography variant="body2">Track prices, alerts, and portfolio performance.</Typography>
        </Box>
        <Box sx={{ p: 3, borderRadius: 2, backgroundColor: 'background.paper', boxShadow: 1 }}>
          <Typography variant="h6" gutterBottom>Advanced Scanning</Typography>
          <Typography variant="body2">Scan thousands of instruments with custom criteria.</Typography>
        </Box>
      </Box>
    </>
  );
};

export default DashboardPage;
