import type { RouteObject } from 'react-router-dom';
import {
  CompounderRadarPage,
  EarningsIntelligencePage,
  InstrumentWorkspaceLandingPage,
  MarketIntelligenceCompatibilityPage,
  MarketPulsePage,
  RiskRadarPage,
  StockInterestRadarPage,
  TraderSetupRadarPage,
} from './components/MarketIntelligencePages';
import { DailyReviewShortlistPage } from './components/DailyReviewShortlistPage';
import { SectorRotationPage } from './components/SectorRotationPage';
import { MarketEventsPage } from './components/MarketEventsPage';
import { IndexConstituentsPage } from './components/IndexConstituentsPage';

export const marketIntelligenceRoutes: RouteObject[] = [
  { path: 'market-pulse', element: <MarketPulsePage /> },
  { path: 'sector-rotation', element: <SectorRotationPage /> },
  { path: 'market-events', element: <MarketEventsPage /> },
  { path: 'daily-review-shortlist', element: <DailyReviewShortlistPage /> },
  { path: 'stock-interest-radar', element: <StockInterestRadarPage /> },
  { path: 'earnings-intelligence', element: <EarningsIntelligencePage /> },
  { path: 'compounder-radar', element: <CompounderRadarPage /> },
  { path: 'trader-setup-radar', element: <TraderSetupRadarPage /> },
  { path: 'risk-radar', element: <RiskRadarPage /> },
  { path: 'instrument-workspace', element: <InstrumentWorkspaceLandingPage /> },
  { path: 'index-constituents', element: <IndexConstituentsPage /> },
  { path: 'indices', element: <MarketIntelligenceCompatibilityPage title="Indices Workspace" /> },
  { path: 'breadth', element: <MarketIntelligenceCompatibilityPage title="Breadth" /> },
  { path: 'institutional-flow', element: <MarketIntelligenceCompatibilityPage title="Institutional Flow" /> },
  { path: 'derivatives-context', element: <MarketIntelligenceCompatibilityPage title="Derivatives Context" /> },
  { path: 'market-map', element: <MarketIntelligenceCompatibilityPage title="Market Map" /> },
];
