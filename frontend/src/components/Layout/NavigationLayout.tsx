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
  Avatar,
  Stack,
  Switch,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import DashboardIcon from '@mui/icons-material/Dashboard';
import SearchIcon from '@mui/icons-material/Search';
import TimelineIcon from '@mui/icons-material/Timeline';
import InventoryIcon from '@mui/icons-material/Inventory';
import SettingsIcon from '@mui/icons-material/Settings';
import ListIcon from '@mui/icons-material/List';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import { useTheme as useCustomTheme } from '../../contexts/ThemeContext';

const drawerWidth = 260;
const collapsedWidth = 72;

const navItems = [
  { path: '/', label: 'Dashboard', icon: <DashboardIcon /> },
  { path: '/smart-money', label: 'Smart Money', icon: <AccountBalanceIcon /> },
  { path: '/sector', label: 'Sector Analysis', icon: <ShowChartIcon /> },
  { path: '/macro', label: 'Macro Indicators', icon: <AnalyticsIcon /> },
  { path: '/stocks', label: 'Stock Management', icon: <InventoryIcon /> },
  { path: '/watchlists', label: 'Watchlists', icon: <ListIcon /> },
  { path: '/scanner', label: 'Real‑Time Scanner', icon: <SearchIcon /> },
  { path: '/backtester', label: 'Strategy Backtester', icon: <TimelineIcon /> },
  { path: '/settings', label: 'User Settings', icon: <SettingsIcon /> },
];

export default function NavigationLayout() {
  const theme = useTheme();
  const { themeMode, toggleTheme } = useCustomTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [open, setOpen] = useState(!isMobile);
  const location = useLocation();

  const handleDrawerToggle = () => {
    setOpen(!open);
  };

  const drawer = (
    <>
      <Toolbar
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          minHeight: '64px',
        }}
      >
        {open ? (
          <>
            <Typography variant="h6" fontWeight={700} noWrap>
              Investment Scanner
            </Typography>
            <IconButton onClick={handleDrawerToggle} size="small">
              <ChevronLeftIcon />
            </IconButton>
          </>
        ) : (
          <IconButton onClick={handleDrawerToggle} size="small">
            <MenuIcon />
          </IconButton>
        )}
      </Toolbar>
      <Divider />
      <List sx={{ px: 1 }}>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                component={Link}
                to={item.path}
                selected={isActive}
                sx={{
                  borderRadius: 2,
                  py: 1.25,
                  '&.Mui-selected': {
                    backgroundColor: 'primary.light',
                    color: 'primary.contrastText',
                    '&:hover': {
                      backgroundColor: 'primary.light',
                    },
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 40,
                    color: isActive ? 'primary.contrastText' : 'inherit',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                {open && <ListItemText primary={item.label} />}
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
      <Divider sx={{ mt: 'auto' }} />
      <Box sx={{ p: 2 }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>U</Avatar>
          {open && (
            <>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" fontWeight={500}>
                  User Name
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Administrator
                </Typography>
              </Box>
              <IconButton size="small" onClick={toggleTheme}>
                {themeMode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
              </IconButton>
            </>
          )}
        </Stack>
      </Box>
    </>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          zIndex: theme.zIndex.drawer + 1,
          backgroundColor: 'background.paper',
          color: 'text.primary',
          boxShadow: 'none',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            {!open && (
              <IconButton
                color="inherit"
                edge="start"
                onClick={handleDrawerToggle}
                sx={{ mr: 2 }}
              >
                <MenuIcon />
              </IconButton>
            )}
            <Typography variant="h6" noWrap sx={{ fontWeight: 700 }}>
              {navItems.find((item) => item.path === location.pathname)?.label || 'Dashboard'}
            </Typography>
          </Stack>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Typography variant="body2" color="text.secondary">
              v1.0.0
            </Typography>
            <Switch
              checked={themeMode === 'dark'}
              onChange={toggleTheme}
              size="small"
              icon={<Brightness4Icon fontSize="small" />}
              checkedIcon={<Brightness7Icon fontSize="small" />}
            />
          </Stack>
        </Toolbar>
      </AppBar>
      <Drawer
        variant={isMobile ? 'temporary' : 'persistent'}
        open={open}
        onClose={() => setOpen(false)}
        sx={{
          width: open ? drawerWidth : collapsedWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: open ? drawerWidth : collapsedWidth,
            boxSizing: 'border-box',
            borderRight: '1px solid',
            borderColor: 'divider',
            transition: theme.transitions.create(['width'], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.standard,
            }),
          },
        }}
      >
        {drawer}
      </Drawer>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${open ? drawerWidth : collapsedWidth}px)` },
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.standard,
          }),
        }}
      >
        <Toolbar /> {/* Spacer for AppBar */}
        <Outlet />
      </Box>
    </Box>
  );
}