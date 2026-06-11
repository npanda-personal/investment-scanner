import { TabbedWorkspace } from '@/shared/components/TabbedWorkspace';
import { StockInterestRadarPage } from '@/features/market-intelligence/components/MarketIntelligencePages';
import { IndexConstituentsPage } from '@/features/market-intelligence/components/IndexConstituentsPage';
import ScreenerPage from './ScreenerPage';
import MarketScansPage from './MarketScansPage';

/**
 * Unified "Discover" workspace — merges the former Screener, Market Scans, Stock Interest Radar,
 * and Index Constituents nav screens (all "filter the universe", differing only by preset) into
 * one tabbed workspace.
 */
export function DiscoverWorkspacePage() {
  return (
    <TabbedWorkspace
      ariaLabel="Discover stocks"
      tabs={[
        { label: 'Screener', render: () => <ScreenerPage /> },
        { label: 'Market Scans', render: () => <MarketScansPage /> },
        { label: 'Stock Interest', render: () => <StockInterestRadarPage /> },
        { label: 'Index Constituents', render: () => <IndexConstituentsPage /> },
      ]}
    />
  );
}

export default DiscoverWorkspacePage;
