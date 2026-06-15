import { TabbedWorkspace } from '@/shared/components/TabbedWorkspace';
import { StockInterestRadarPage } from '@/features/market-intelligence/components/MarketIntelligencePages';
import { IndexConstituentsPage } from '@/features/market-intelligence/components/IndexConstituentsPage';
import { useMarketScope } from '@/contexts/MarketScopeContext';
import ScreenerPage from './ScreenerPage';
import ConvictionPage from './ConvictionPage';
import MarketScansPage from './MarketScansPage';
import CryptoSignalBoard from './CryptoSignalBoard';

/**
 * Unified "Discover" workspace — merges the former Screener, Market Scans, Stock Interest Radar,
 * and Index Constituents nav screens (all "filter the universe", differing only by preset) into
 * one tabbed workspace.
 *
 * Under the crypto scope the equity-only tabs (Screener / Stock Interest / Index Constituents)
 * are replaced by the Crypto Signal Board; Market Scans stays (it carries crypto coverage).
 */
export function DiscoverWorkspacePage() {
  const { profile } = useMarketScope();

  const tabs = profile.isCrypto
    ? [
        { label: 'Signal Board', render: () => <CryptoSignalBoard /> },
        { label: 'Market Scans', render: () => <MarketScansPage /> },
      ]
    : [
        { label: 'Screener', render: () => <ScreenerPage /> },
        { label: 'Conviction', render: () => <ConvictionPage /> },
        { label: 'Market Scans', render: () => <MarketScansPage /> },
        { label: 'Stock Interest', render: () => <StockInterestRadarPage /> },
        { label: 'Index Constituents', render: () => <IndexConstituentsPage /> },
      ];

  return <TabbedWorkspace ariaLabel="Discover" tabs={tabs} />;
}

export default DiscoverWorkspacePage;
