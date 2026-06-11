import { TabbedWorkspace } from '@/shared/components/TabbedWorkspace';
import { DailyReviewShortlistPage } from '@/features/market-intelligence/components/DailyReviewShortlistPage';
import { DailyOverviewDashboardPage } from '@/features/daily-overview-dashboard';
import { TodayReviewPage } from './TodayReviewPage';

/**
 * Unified "Today" home — merges the former Daily Review, Review Shortlist, and Daily Overview
 * nav screens (three overlapping answers to "what do I look at today?") into one tabbed workspace.
 */
export function TodayHomePage() {
  return (
    <TabbedWorkspace
      ariaLabel="Today workflow"
      tabs={[
        { label: 'Daily Review', render: () => <TodayReviewPage /> },
        { label: 'Shortlist', render: () => <DailyReviewShortlistPage /> },
        { label: 'Overview', render: () => <DailyOverviewDashboardPage /> },
      ]}
    />
  );
}

export default TodayHomePage;
