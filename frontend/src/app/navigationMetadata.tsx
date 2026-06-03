import type { ReactNode } from 'react';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import AssessmentIcon from '@mui/icons-material/Assessment';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import DashboardIcon from '@mui/icons-material/Dashboard';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import SavedSearchIcon from '@mui/icons-material/SavedSearch';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

export type NavItem = {
  path: string;
  label: string;
  icon: ReactNode;
  matchPrefixes?: string[];
  aliases?: string[];
  operatorOnly?: boolean;
};

export type NavGroup = {
  group: string;
  items: NavItem[];
  operatorOnly?: boolean;
};

export const navGroups: NavGroup[] = [
  {
    group: 'Trader Workflow',
    items: [
      { path: '/', label: 'Market Pulse', icon: <DashboardIcon />, aliases: ['/market-pulse'] },
      { path: '/daily-review-shortlist', label: 'Daily Review Shortlist', icon: <FactCheckIcon /> },
      { path: '/stock-interest-radar', label: 'Stock Interest Radar', icon: <SavedSearchIcon /> },
      { path: '/earnings-intelligence', label: 'Earnings Intelligence', icon: <CalendarMonthIcon /> },
      { path: '/compounder-radar', label: 'Compounder Radar', icon: <TrendingUpIcon /> },
      { path: '/trader-setup-radar', label: 'Trader Setup Radar', icon: <ShowChartIcon /> },
      { path: '/risk-radar', label: 'Risk Radar', icon: <FactCheckIcon /> },
      { path: '/watchlists', label: 'Watchlists', icon: <StarBorderIcon />, matchPrefixes: ['/watchlists/'] },
      { path: '/portfolios', label: 'Portfolios', icon: <AccountBalanceWalletIcon />, matchPrefixes: ['/portfolios/'] },
      { path: '/alerts', label: 'Alerts', icon: <NotificationsNoneIcon /> },
      { path: '/instrument-workspace', label: 'Instrument Workspace', icon: <AssessmentIcon />, matchPrefixes: ['/stocks/', '/research/stocks/'] },
    ],
  },
];

export const adminNavGroups: NavGroup[] = [
  {
    group: 'Admin',
    operatorOnly: true,
    items: [
      { path: '/admin', label: 'Admin Home', icon: <DashboardIcon /> },
    ],
  },
  {
    group: 'Data Ops',
    operatorOnly: true,
    items: [
      { path: '/admin/market-data-foundation', label: 'Market Data Ops', icon: <AssessmentIcon />, matchPrefixes: ['/admin/market-data-foundation/'] },
      { path: '/admin/market-data-foundation/add', label: 'Add Instrument', icon: <SavedSearchIcon /> },
      { path: '/admin/pipeline-ops', label: 'Pipeline Ops', icon: <FactCheckIcon /> },
      { path: '/admin/data-quality', label: 'Data Quality', icon: <FactCheckIcon /> },
      { path: '/admin/context-snapshots', label: 'Historical Context', icon: <CalendarMonthIcon /> },
      { path: '/admin/market-context', label: 'Market Context', icon: <DashboardIcon /> },
    ],
  },
  {
    group: 'Signals And Strategy',
    operatorOnly: true,
    items: [
      { path: '/admin/signals', label: 'Signal Generation', icon: <ShowChartIcon /> },
      { path: '/admin/signals/quality', label: 'Signal Quality Lab', icon: <FactCheckIcon /> },
      { path: '/admin/signals/calibration', label: 'Signal Calibration', icon: <TrendingUpIcon /> },
      { path: '/admin/strategy', label: 'Strategy Decision', icon: <AssessmentIcon /> },
      { path: '/admin/strategies', label: 'Strategy Framework', icon: <SavedSearchIcon /> },
      { path: '/admin/backtests', label: 'Backtesting Lab', icon: <ShowChartIcon /> },
      { path: '/admin/trade-plans', label: 'Trade Plans', icon: <FactCheckIcon />, matchPrefixes: ['/admin/trade-plans/'] },
      { path: '/admin/signal-position-ledger', label: 'Trigger Monitor', icon: <NotificationsNoneIcon /> },
    ],
  },
  {
    group: 'Platform',
    operatorOnly: true,
    items: [
      { path: '/admin/smart-money', label: 'Smart Money', icon: <TrendingUpIcon /> },
      { path: '/admin/billing', label: 'Billing', icon: <AccountBalanceWalletIcon /> },
    ],
  },
];

const navItems = navGroups.flatMap((group) => group.items);
const adminNavItems = adminNavGroups.flatMap((group) => group.items);

export function getNavGroupsForPathname(pathname: string): NavGroup[] {
  return pathname === '/admin' || pathname.startsWith('/admin/') ? adminNavGroups : navGroups;
}

function isPrefixMatch(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(prefix);
}

export function resolveNavItem(pathname: string): NavItem | undefined {
  const items = pathname === '/admin' || pathname.startsWith('/admin/') ? adminNavItems : navItems;
  const exactMatch = items.find((item) => item.path === pathname || item.aliases?.includes(pathname));
  if (exactMatch) return exactMatch;

  return items.find((item) => {
    const prefixes = item.matchPrefixes ?? [];
    return prefixes.some((prefix) => isPrefixMatch(pathname, prefix));
  });
}

export function isNavItemActive(pathname: string, item: NavItem): boolean {
  return resolveNavItem(pathname) === item;
}
