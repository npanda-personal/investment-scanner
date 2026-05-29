import type { ReactNode } from 'react';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import AssessmentIcon from '@mui/icons-material/Assessment';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import DashboardIcon from '@mui/icons-material/Dashboard';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import InventoryIcon from '@mui/icons-material/Inventory';
import MapIcon from '@mui/icons-material/Map';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import PsychologyIcon from '@mui/icons-material/Psychology';
import PublicIcon from '@mui/icons-material/Public';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import TimelineIcon from '@mui/icons-material/Timeline';
import TuneIcon from '@mui/icons-material/Tune';
import VisibilityIcon from '@mui/icons-material/Visibility';

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
    group: 'Market Intelligence',
    items: [
      { path: '/', label: 'Market Pulse', icon: <DashboardIcon />, aliases: ['/market-pulse'] },
      { path: '/today-review', label: 'Daily Review', icon: <CalendarMonthIcon />, matchPrefixes: ['/today-review/'] },
      { path: '/market-map', label: 'Market Map', icon: <MapIcon /> },
      { path: '/indices', label: 'Indices', icon: <AccountBalanceIcon /> },
      { path: '/breadth', label: 'Breadth', icon: <AssessmentIcon /> },
      { path: '/institutional-flow', label: 'Institutional Flow', icon: <ShowChartIcon /> },
      { path: '/derivatives-context', label: 'Derivatives Context', icon: <TimelineIcon /> },
    ],
  },
  {
    group: 'Research Workflow',
    items: [
      { path: '/research', label: 'Research Workbench', icon: <VisibilityIcon />, matchPrefixes: ['/research/', '/stocks/'] },
    ],
  },
  {
    group: 'Personal Workspace',
    items: [
      { path: '/portfolios', label: 'Portfolios', icon: <AccountBalanceWalletIcon />, matchPrefixes: ['/portfolios/'] },
      { path: '/watchlists', label: 'Watchlists', icon: <StarBorderIcon />, matchPrefixes: ['/watchlists/'] },
      { path: '/alerts', label: 'Alerts', icon: <NotificationsNoneIcon /> },
    ],
  },
  {
    group: 'Account and Support',
    items: [
      { path: '/copilot', label: 'Copilot Brief', icon: <PsychologyIcon /> },
      { path: '/notifications', label: 'Notifications', icon: <NotificationsNoneIcon /> },
      { path: '/account', label: 'Account', icon: <AccountCircleIcon /> },
    ],
  },
  {
    group: 'Admin / Data Ops',
    operatorOnly: true,
    items: [
      { path: '/admin/market-data-foundation', label: 'Market Data Ops', icon: <InventoryIcon />, matchPrefixes: ['/admin/market-data-foundation/'], operatorOnly: true },
      { path: '/admin/pipeline-ops', label: 'Pipeline Ops', icon: <PrecisionManufacturingIcon />, operatorOnly: true },
      { path: '/admin/data-quality', label: 'Data Quality Ops', icon: <FactCheckIcon />, operatorOnly: true },
      { path: '/admin/context-snapshots', label: 'Snapshot Ops', icon: <CalendarMonthIcon />, operatorOnly: true },
      { path: '/admin/signals', label: 'Signal Generation', icon: <ShowChartIcon />, operatorOnly: true },
      { path: '/admin/signals/quality', label: 'Signal Quality Ops', icon: <FactCheckIcon />, operatorOnly: true },
      { path: '/admin/signals/calibration', label: 'Signal Calibration', icon: <TuneIcon />, operatorOnly: true },
      { path: '/admin/smart-money', label: 'Smart Money Ops', icon: <PublicIcon />, operatorOnly: true },
      { path: '/admin/strategy', label: 'Strategy Decisions', icon: <FactCheckIcon />, operatorOnly: true },
      { path: '/admin/strategies', label: 'Strategy Library Ops', icon: <AdminPanelSettingsIcon />, operatorOnly: true },
      { path: '/admin/backtests', label: 'Backtests', icon: <TimelineIcon />, operatorOnly: true },
      { path: '/admin/signal-position-ledger', label: 'Ledger Ops', icon: <FactCheckIcon />, operatorOnly: true },
      { path: '/admin/trade-plans', label: 'Trade Plan Ops', icon: <FactCheckIcon />, matchPrefixes: ['/admin/trade-plans/'], operatorOnly: true },
      { path: '/admin/billing', label: 'Billing Admin', icon: <AdminPanelSettingsIcon />, operatorOnly: true },
    ],
  },
];

const navItems = navGroups.flatMap((group) => group.items);

function isPrefixMatch(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(prefix);
}

export function resolveNavItem(pathname: string): NavItem | undefined {
  const exactMatch = navItems.find((item) => item.path === pathname || item.aliases?.includes(pathname));
  if (exactMatch) return exactMatch;

  return navItems.find((item) => {
    const prefixes = item.matchPrefixes ?? [];
    return prefixes.some((prefix) => isPrefixMatch(pathname, prefix));
  });
}

export function isNavItemActive(pathname: string, item: NavItem): boolean {
  return resolveNavItem(pathname) === item;
}
