import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CustomThemeProvider } from './contexts/ThemeContext';
import NavigationLayout from './components/Layout/NavigationLayout';
import DashboardPage from './pages/DashboardPage';
import SmartMoneyPage from './pages/SmartMoneyPage';
import SectorPage from './pages/SectorPage';
import MacroPage from './pages/MacroPage';
import Scanner from './components/Scanner';
import SimplifiedScannerDashboard from './components/Scanner/SimpleScanner';
import Backtester from './components/Backtester';
import StockManager from './components/StockManager';
import WatchlistManager from './components/WatchlistManager';
import SettingsPage from './pages/SettingsPage';

function App() {
  return (
    <CustomThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<NavigationLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="smart-money" element={<SmartMoneyPage />} />
            <Route path="sector" element={<SectorPage />} />
            <Route path="macro" element={<MacroPage />} />
            <Route path="stocks" element={<StockManager />} />
            <Route path="watchlists" element={<WatchlistManager />} />
            <Route path="scanner" element={<Scanner />} />
            <Route path="smart-scanner" element={<SimplifiedScannerDashboard />} />
            <Route path="backtester" element={<Backtester />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </CustomThemeProvider>
  );
}

export default App;