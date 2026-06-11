import type { RouteObject } from 'react-router-dom';
import { Navigate } from 'react-router-dom';
import {
  CompounderRadarPage,
  EarningsIntelligencePage,
  InstrumentWorkspaceLandingPage,
  MarketIntelligenceCompatibilityPage,
  RiskRadarPage,
  TraderSetupRadarPage,
} from './components/MarketIntelligencePages';

// Alias routes: formerly standalone nav screens that are now TABS inside a
// merged workspace. They resolve for deep-link / bookmark compat but redirect
// to the workspace root (TabbedWorkspace uses local state, not URL params).
//
//   /market-pulse, /sector-rotation, /market-events  → / (Market workspace on HomePage)
//   /daily-review-shortlist                           → /today-review (Today workspace)
//   /stock-interest-radar, /index-constituents        → /screener (Discover workspace)

export const marketIntelligenceRoutes: RouteObject[] = [
  // — Redirected aliases (deep-link compat) —
  { path: 'market-pulse', element: <Navigate to="/" replace /> },
  { path: 'sector-rotation', element: <Navigate to="/" replace /> },
  { path: 'market-events', element: <Navigate to="/" replace /> },
  // /daily-review-shortlist is a tab inside Today (/today-review)
  { path: 'daily-review-shortlist', element: <Navigate to="/today-review" replace /> },
  // /stock-interest-radar and /index-constituents are tabs inside Discover (/screener)
  { path: 'stock-interest-radar', element: <Navigate to="/screener" replace /> },
  { path: 'index-constituents', element: <Navigate to="/screener" replace /> },

  // — Active standalone routes —
  { path: 'earnings-intelligence', element: <EarningsIntelligencePage /> },
  { path: 'compounder-radar', element: <CompounderRadarPage /> },
  { path: 'trader-setup-radar', element: <TraderSetupRadarPage /> },
  { path: 'risk-radar', element: <RiskRadarPage /> },
  { path: 'instrument-workspace', element: <InstrumentWorkspaceLandingPage /> },

  // — Compat stubs for old routes not yet assigned a real page —
  { path: 'indices', element: <MarketIntelligenceCompatibilityPage title="Indices Workspace" /> },
  { path: 'breadth', element: <MarketIntelligenceCompatibilityPage title="Breadth" /> },
  { path: 'institutional-flow', element: <MarketIntelligenceCompatibilityPage title="Institutional Flow" /> },
  { path: 'derivatives-context', element: <MarketIntelligenceCompatibilityPage title="Derivatives Context" /> },
  { path: 'market-map', element: <MarketIntelligenceCompatibilityPage title="Market Map" /> },
];
