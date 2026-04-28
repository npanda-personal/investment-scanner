import { useState } from 'react';
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
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { useThemeMode } from './ThemeContext';

const drawerWidth = 260;
const collapsedWidth = 72;

const navItems = [
  { path: '/', label: 'Dashboard', icon: <DashboardIcon /> },
  { path: '/market-data-foundation', label: 'Market Data Foundation', icon: <InventoryIcon /> },
  { path: '/signals', label: 'Signals', icon: <InsightsIcon /> },
  { path: '/portfolios', label: 'Portfolios', icon: <AccountBalanceWalletIcon /> },
  { path: '/watchlists', label: 'Watchlists', icon: <StarBorderIcon /> },
];

export default function NavigationLayout() {
  const theme = useTheme();
  const { themeMode, toggleTheme } = useThemeMode();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [open, setOpen] = useState(!isMobile);
  const location = useLocation();

  const handleDrawerToggle = () => setOpen(!open);
  const activeLabel = navItems.find((item) => item.path === location.pathname)?.label || 'Investment Scanner';

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
      <List sx={{ px: 1 }}>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton component={Link} to={item.path} selected={isActive} sx={{ borderRadius: 2, py: 1.25 }}>
                <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
                {open && <ListItemText primary={item.label} />}
              </ListItemButton>
            </ListItem>
          );
        })}
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
          <Switch checked={themeMode === 'dark'} onChange={toggleTheme} size="small" icon={<Brightness4Icon fontSize="small" />} checkedIcon={<Brightness7Icon fontSize="small" />} />
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
