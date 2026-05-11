import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  CssBaseline,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useTheme,
  useMediaQuery,
  Divider,
  Stack,
  Switch,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
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
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { useThemeMode } from './ThemeContext';
import { useAuthIdentity } from '@/features/auth-identity';
import { MarketScopeSelector } from '@/shared/components/MarketScopeSelector';

const drawerWidth = 260;
const collapsedWidth = 72;

const navGroups = [
  {
    group: 'Overview',
    items: [
      { path: '/today-review', label: 'Today’s Review', icon: <CalendarMonthIcon /> },
      { path: '/', label: 'Dashboard', icon: <DashboardIcon /> },
      { path: '/market-data-foundation', label: 'Market Data Foundation', icon: <InventoryIcon /> },
    ],
  },
  {
    group: 'Research',
    items: [
      { path: '/research', label: 'Overview', icon: <DashboardIcon /> },
      { path: '/signals', label: 'Raw Signals', icon: <InsightsIcon /> },
      { path: '/strategies', label: 'Strategies', icon: <AccountTreeIcon /> },
      { path: '/strategy', label: 'Strategy', icon: <FactCheckIcon /> },
      { path: '/smart-money', label: 'Smart Money', icon: <AccountTreeIcon /> },
      { path: '/market-context', label: 'Market Context', icon: <PublicIcon /> },
    ],
  },
  {
    group: 'Portfolio',
    items: [
      { path: '/portfolios', label: 'Portfolios', icon: <AccountBalanceWalletIcon /> },
      { path: '/trade-plans', label: 'Trade Plans', icon: <FactCheckIcon /> },
      { path: '/watchlists', label: 'Watchlists', icon: <StarBorderIcon /> },
      { path: '/alerts', label: 'Alerts', icon: <NotificationsNoneIcon /> },
    ],
  },
  {
    group: 'Intelligence Lab',
    items: [
      { path: '/signals/quality', label: 'Signal Quality', icon: <FactCheckIcon /> },
      { path: '/signals/calibration', label: 'Signal Calibration', icon: <TuneIcon /> },
      { path: '/data-quality', label: 'Data Quality', icon: <FactCheckIcon /> },
      { path: '/backtests', label: 'Backtests', icon: <TimelineIcon /> },
      { path: '/context-snapshots', label: 'Context Snapshots', icon: <CalendarMonthIcon /> },
    ],
  },
  {
    group: 'Account',
    items: [
      { path: '/copilot', label: 'AI Copilot', icon: <PsychologyIcon /> },
      { path: '/billing', label: 'Billing', icon: <WorkspacePremiumIcon /> },
      { path: '/notifications', label: 'Notifications', icon: <MarkEmailReadIcon /> },
      { path: '/account', label: 'Account', icon: <AccountCircleIcon /> },
    ],
  },
];

export default function NavigationLayout() {
  const theme = useTheme();
  const { themeMode, toggleTheme } = useThemeMode();
  const { user, logout } = useAuthIdentity();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [open, setOpen] = useState(!isMobile);
  const location = useLocation();

  const handleDrawerToggle = () => setOpen(!open);
  const activeLabel = navGroups.flatMap(g => g.items).find((item) => item.path === location.pathname)?.label || 'Investment Scanner';

  const drawer = (
    <>
      <Toolbar sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, minHeight: '64px' }}>
        {open ? (
          <>
            <Typography variant="h6" fontWeight={700} noWrap>Investment Scanner</Typography>
            <IconButton onClick={handleDrawerToggle} size="small"><ChevronLeftIcon /></IconButton>
          </>
        ) : (
          <IconButton onClick={handleDrawerToggle} size="small"><MenuIcon /></IconButton>
        )}
      </Toolbar>
      <Divider />
      <List sx={{ px: 1, py: 1 }}>
        {navGroups.map((group, groupIndex) => (
          <React.Fragment key={group.group}>
            {open && (
              <Typography variant="overline" sx={{ px: 2, mt: groupIndex > 0 ? 1 : 0, mb: 0.5, display: 'block', color: 'text.secondary', lineHeight: 1 }}>
                {group.group}
              </Typography>
            )}
            {group.items.map((item) => {
              const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
              return (
                <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
                  <ListItemButton component={Link} to={item.path} selected={isActive} sx={{ borderRadius: 2, py: 1 }}>
                    <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
                    {open && <ListItemText primary={item.label} primaryTypographyProps={{ variant: 'body2' }} />}
                  </ListItemButton>
                </ListItem>
              );
            })}
            {groupIndex < navGroups.length - 1 && open && <Divider sx={{ my: 1, mx: 1 }} />}
          </React.Fragment>
        ))}
      </List>
      <Divider sx={{ mt: 'auto' }} />
      <Box sx={{ p: 2 }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          {open && <Typography variant="body2" color="text.secondary">Theme</Typography>}
          <IconButton size="small" onClick={toggleTheme}>
            {themeMode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>
        </Stack>
      </Box>
    </>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <CssBaseline />
      <AppBar position="fixed" sx={{ zIndex: theme.zIndex.drawer + 1, backgroundColor: 'background.paper', color: 'text.primary', boxShadow: 'none', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            {!open && <IconButton color="inherit" edge="start" onClick={handleDrawerToggle} sx={{ mr: 2 }}><MenuIcon /></IconButton>}
            <Typography variant="h6" noWrap sx={{ fontWeight: 700 }}>{activeLabel}</Typography>
          </Stack>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <MarketScopeSelector />
            <Divider orientation="vertical" flexItem sx={{ height: 24, alignSelf: 'center', mx: 0.5 }} />
            <Switch checked={themeMode === 'dark'} onChange={toggleTheme} size="small" icon={<Brightness4Icon fontSize="small" />} checkedIcon={<Brightness7Icon fontSize="small" />} />
            {user && <Typography variant="body2" color="text.secondary" sx={{ ml: 1, display: { xs: 'none', lg: 'block' } }}>{user.email}</Typography>}
            {user && <IconButton color="inherit" size="small" onClick={() => void logout()} title="Log out"><AccountCircleIcon fontSize="small" /></IconButton>}
          </Stack>
        </Toolbar>
      </AppBar>
      <Drawer variant={isMobile ? 'temporary' : 'persistent'} open={open} onClose={() => setOpen(false)} sx={{ width: open ? drawerWidth : collapsedWidth, flexShrink: 0, '& .MuiDrawer-paper': { width: open ? drawerWidth : collapsedWidth, boxSizing: 'border-box', borderRight: '1px solid', borderColor: 'divider' } }}>
        {drawer}
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: 3, width: { md: `calc(100% - ${open ? drawerWidth : collapsedWidth}px)` } }}>
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}
