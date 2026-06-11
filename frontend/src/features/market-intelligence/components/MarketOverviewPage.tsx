import { TabbedWorkspace } from '@/shared/components/TabbedWorkspace';
import { MarketPulsePage } from './MarketIntelligencePages';
import { SectorRotationPage } from './SectorRotationPage';
import { MarketEventsPage } from './MarketEventsPage';

/**
 * Unified "Market" overview — merges the former Market Pulse, Sector Rotation, and Market Events
 * nav screens (all market-context renders of overlapping data) into one tabbed workspace.
 */
export function MarketOverviewPage() {
  return (
    <TabbedWorkspace
      ariaLabel="Market overview"
      tabs={[
        { label: 'Health', render: () => <MarketPulsePage /> },
        { label: 'Sectors', render: () => <SectorRotationPage /> },
        { label: 'Events', render: () => <MarketEventsPage /> },
      ]}
    />
  );
}

export default MarketOverviewPage;
