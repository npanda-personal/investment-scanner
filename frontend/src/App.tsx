import { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  AppBar,
  Toolbar,
  Tabs,
  Tab,
} from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import DataIngestion from './components/DataIngestion';
import WatchlistManager from './components/WatchlistManager';
import Scanner from './components/Scanner';
import Backtester from './components/Backtester';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#2563eb',
    },
    secondary: {
      main: '#7c3aed',
    },
    background: {
      default: '#f8fafc',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
});

function App() {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 0: // Dashboard
        return (
          <>
            <Box sx={{ p: 3, borderRadius: 2, backgroundColor: 'white', boxShadow: 1, mb: 4 }}>
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
              <Box sx={{ p: 3, borderRadius: 2, backgroundColor: 'white', boxShadow: 1 }}>
                <Typography variant="h6" gutterBottom>Real‑time Monitoring</Typography>
                <Typography variant="body2">Track prices, alerts, and portfolio performance.</Typography>
              </Box>
              <Box sx={{ p: 3, borderRadius: 2, backgroundColor: 'white', boxShadow: 1 }}>
                <Typography variant="h6" gutterBottom>Advanced Scanning</Typography>
                <Typography variant="body2">Scan thousands of instruments with custom criteria.</Typography>
              </Box>
            </Box>
          </>
        );
      case 1: // Scanner
        return <Scanner />;
      case 2: // Backtester
        return <Backtester />;
      default:
        return null;
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ flexGrow: 1 }}>
        <AppBar position="static" elevation={0} sx={{ backgroundColor: 'white', color: 'primary.main' }}>
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 700 }}>
              Investment Scanner
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mr: 4 }}>
              v1.0.0
            </Typography>
            <Tabs value={activeTab} onChange={handleTabChange} textColor="primary" indicatorColor="primary">
              <Tab label="Dashboard" />
              <Tab label="Real‑Time Scanner" />
              <Tab label="Strategy Backtester" />
            </Tabs>
          </Toolbar>
        </AppBar>
        <Container maxWidth="xl" sx={{ mt: 4 }}>
          {renderContent()}
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;