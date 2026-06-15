import { MarketOverviewPage } from '@/features/market-intelligence/components/MarketOverviewPage';
import CryptoMarketOverviewPage from '@/features/market-data-foundation/components/CryptoMarketOverviewPage';
import { useMarketScope } from '@/contexts/MarketScopeContext';

export default function HomePage() {
  const { profile } = useMarketScope();
  // Crypto scope gets the crypto-native landing surface (24/7, USD); equity scopes
  // keep the merged Market workspace (Health / Sectors / Events).
  if (profile.isCrypto) return <CryptoMarketOverviewPage />;
  return <MarketOverviewPage />;
}
