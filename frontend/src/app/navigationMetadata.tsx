import type { ReactNode } from 'react';
import DashboardIcon from '@mui/icons-material/Dashboard';
import InventoryIcon from '@mui/icons-material/Inventory';
import InsightsIcon from '@mui/icons-material/Insights';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import PublicIcon from '@mui/icons-material/Public';
import TimelineIcon from '@mui/icons-material/Timeline';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import PsychologyIcon from '@mui/icons-material/Psychology';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import TuneIcon from '@mui/icons-material/Tune';

export type NavItem = {
  path: string;
  label: string;
  icon: ReactNode;
  matchPrefixes?: string[];
  aliases?: string[];
};

export type NavGroup = {
  group: string;
  items: NavItem[];
};

export const navGroups: NavGroup[] = [
  {
    group: 'Daily Work',
    items: [
      { path: '/', label: 'Daily Overview', icon: <DashboardIcon /> },
      { path: '/today-review', label: 'Today Review', icon: <CalendarMonthIcon />, matchPrefixes: ['/today-review/'] },
      { path: '/research', label: 'Research Command Center', icon: <DashboardIcon />, matchPrefixes: ['/research/', '/research/stocks/'] },
    ],
  },
  {
    group: 'Foundation',
    items: [
      {
        path: '/market-data-foundation',
        label: 'Market Data Foundation',
        icon: <InventoryIcon />,
        matchPrefixes: ['/market-data-foundation/', '/stocks/'],
        aliases: ['/stocks'],
      },
      { path: '/data-quality', label: 'Data Quality', icon: <FactCheckIcon /> },
      { path: '/context-snapshots', label: 'Context Snapshots', icon: <CalendarMonthIcon /> },
    ],
  },
  {
    group: 'Signal Chain',
    items: [
      { path: '/signals', label: 'Raw Signals', icon: <InsightsIcon /> },
      { path: '/signals/quality', label: 'Signal Quality', icon: <FactCheckIcon /> },
      { path: '/signals/calibration', label: 'Signal Calibration', icon: <TuneIcon /> },
      { path: '/smart-money', label: 'Smart Money', icon: <AccountTreeIcon /> },
      { path: '/market-context', label: 'Market Context', icon: <PublicIcon /> },
    ],
  },
  {
    group: 'Decision and Proof',
    items: [
      { path: '/strategy', label: 'Strategy', icon: <FactCheckIcon /> },
      { path: '/strategies', label: 'Strategies', icon: <AccountTreeIcon /> },
      { path: '/backtests', label: 'Backtests', icon: <TimelineIcon /> },
      { path: '/trade-plans', label: 'Trade Plans', icon: <FactCheckIcon />, matchPrefixes: ['/trade-plans/'] },
    ],
  },
  {
    group: 'Portfolio Ops',
    items: [
      { path: '/portfolios', label: 'Portfolios', icon: <AccountBalanceWalletIcon /> },
      { path: '/watchlists', label: 'Watchlists', icon: <StarBorderIcon /> },
      { path: '/alerts', label: 'Alerts', icon: <NotificationsNoneIcon /> },
    ],
  },
  {
    group: 'Account and Support',
    items: [
      { path: '/copilot', label: 'AI Copilot', icon: <PsychologyIcon /> },
      { path: '/billing', label: 'Billing', icon: <WorkspacePremiumIcon /> },
      { path: '/notifications', label: 'Notifications', icon: <MarkEmailReadIcon /> },
      { path: '/account', label: 'Account', icon: <AccountCircleIcon /> },
    ],
  },
];

const navItems = navGroups.flatMap((group) => group.items);

function isPrefixMatch(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(prefix);
}

export function resolveNavItem(pathname: string): NavItem | undefined {
  const exactMatch = navItems.find((item) => item.path === pathname || item.aliases?.includes(pathname));
  if (exactMatch) {
    return exactMatch;
  }

  return navItems.find((item) => {
    const prefixes = item.matchPrefixes ?? [];
    return prefixes.some((prefix) => isPrefixMatch(pathname, prefix));
  });
}

export function isNavItemActive(pathname: string, item: NavItem): boolean {
  return resolveNavItem(pathname) === item;
}
