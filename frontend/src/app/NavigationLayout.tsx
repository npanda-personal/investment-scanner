import React, { useEffect, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  AppBar,
  Badge,
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
  Tooltip,
  Typography,
  useTheme,
  useMediaQuery,
  Divider,
  Stack,
  Switch,
  Chip,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { useThemeMode } from './ThemeContext';
import { useAuthIdentity } from '@/features/auth-identity';
import { MarketScopeSelector } from '@/shared/components/MarketScopeSelector';
import { getNavGroupsForPathname, isNavItemActive, resolveNavItem } from './navigationMetadata';
import { fetchAlertEvents } from '@/features/alerts-monitoring';
import { fetchCapitalPosture } from '@/features/market-context-intelligence';
import { useMarketScope } from '@/contexts/MarketScopeContext';

const drawerWidth = 260;
const collapsedWidth = 72;

// GitHub Pages demo build (VITE_DEMO=1): hide account-bound nav items (My Workspace
// except Instrument) that have no demo-relevant data. Real builds show everything.
const isDemo = import.meta.env.VITE_DEMO === '1';

function useUnreadAlertCount() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let cancelled = false;
    fetchAlertEvents()
      .then((events) => {
        if (!cancelled) setCount(events.filter((e) => !e.readAt && !e.dismissedAt).length);
      })
      .catch(() => { /* best-effort; badge stays 0 */ });
    return () => { cancelled = true; };
  }, []);
  return count;
}

const POSTURE_HUMAN: Record<string, string> = {
  RISK_ON: 'Risk-On',
  RISK_OFF: 'Risk-Off',
  NEUTRAL: 'Neutral',
};

function humanizePosture(raw: string): string {
  return POSTURE_HUMAN[raw] ?? raw.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function useCapitalPosture() {
  const [posture, setPosture] = useState<{ label: string; humanLabel: string; color: 'success' | 'warning' | 'error' | 'default'; band: string } | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetchCapitalPosture()
      .then((dto) => {
        if (cancelled) return;
        if (dto.availability !== 'READY' || !dto.postureLabel) {
          setPosture({ label: 'unavailable', humanLabel: 'Unavailable', color: 'default', band: '' });
          return;
        }
        const color: 'success' | 'warning' | 'error' =
          dto.postureLabel === 'RISK_ON' ? 'success' :
          dto.postureLabel === 'RISK_OFF' ? 'error' : 'warning';
        const band = dto.suggestedExposureBand
          ? `${dto.suggestedExposureBand.minPct}–${dto.suggestedExposureBand.maxPct}%`
          : '';
        setPosture({ label: dto.postureLabel, humanLabel: humanizePosture(dto.postureLabel), color, band });
      })
      .catch(() => {
        if (!cancelled) setPosture({ label: 'unavailable', humanLabel: 'Unavailable', color: 'default', band: '' });
      });
    return () => { cancelled = true; };
  }, []);
  return posture;
}

export default function NavigationLayout() {
  const theme = useTheme();
  const { themeMode, toggleTheme } = useThemeMode();
  const { user, logout } = useAuthIdentity();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [open, setOpen] = useState(!isMobile);
  const location = useLocation();
  const unreadAlerts = useUnreadAlertCount();
  const capitalPosture = useCapitalPosture();
  const { profile, scope } = useMarketScope();

  const handleDrawerToggle = () => setOpen(!open);
  const activeLabel = resolveNavItem(location.pathname)?.label || 'Investment Scanner';
  const currentNavGroups = getNavGroupsForPathname(location.pathname);

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
        {currentNavGroups.map((group, groupIndex) => (
          <React.Fragment key={group.group}>
            {open && (
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2, mt: groupIndex > 0 ? 1 : 0, mb: 0.5 }}>
                <Typography variant="overline" sx={{ color: group.operatorOnly ? 'warning.main' : 'text.secondary', lineHeight: 1 }}>
                  {group.group}
                </Typography>
                {group.operatorOnly && <Chip size="small" label="Admin" color="warning" variant="outlined" sx={{ height: 20 }} />}
              </Stack>
            )}
            {group.items
              .filter((item) => !(profile.isCrypto && item.hiddenForCrypto) && !(scope.region !== 'IN' && item.hiddenForNonIndia) && !(isDemo && item.hiddenInDemo))
              .map((item) => {
              const isActive = isNavItemActive(location.pathname, item);
              const isAlertsItem = item.path === '/alerts';
              return (
                <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
                  <Tooltip title={item.label} placement="right" disableHoverListener={open} arrow>
                    <ListItemButton
                      component={Link}
                      to={item.path}
                      selected={isActive}
                      sx={{
                        borderRadius: 2,
                        py: 1,
                        border: item.operatorOnly ? '1px solid' : '1px solid transparent',
                        borderColor: item.operatorOnly ? 'divider' : 'transparent',
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 40 }}>
                        {isAlertsItem && unreadAlerts > 0 ? (
                          <Badge badgeContent={unreadAlerts > 99 ? '99+' : unreadAlerts} color="error">
                            {item.icon}
                          </Badge>
                        ) : item.icon}
                      </ListItemIcon>
                      {open && <ListItemText primary={item.label} primaryTypographyProps={{ variant: 'body2' }} />}
                    </ListItemButton>
                  </Tooltip>
                </ListItem>
              );
            })}
            {groupIndex < currentNavGroups.length - 1 && open && <Divider sx={{ my: 1, mx: 1 }} />}
          </React.Fragment>
        ))}
      </List>
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
            {!profile.isCrypto && capitalPosture && (
              <Tooltip
                title={
                  `Capital posture blends market regime, breadth, and health — distinct from the Market Pulse health gauge.` +
                  (capitalPosture.band ? ` Suggested exposure: ${capitalPosture.band}.` : '')
                }
                arrow
              >
                <Chip
                  label={`Posture: ${capitalPosture.humanLabel}`}
                  color={capitalPosture.color}
                  size="small"
                  variant="outlined"
                  sx={{ fontWeight: 700 }}
                />
              </Tooltip>
            )}
            <MarketScopeSelector />
            <Divider orientation="vertical" flexItem sx={{ height: 24, alignSelf: 'center', mx: 0.5 }} />
            <Switch
              checked={themeMode === 'dark'}
              onChange={toggleTheme}
              size="small"
              icon={<Brightness4Icon fontSize="small" />}
              checkedIcon={<Brightness7Icon fontSize="small" />}
              inputProps={{ 'aria-label': themeMode === 'dark' ? 'Switch to light theme' : 'Switch to dark theme' }}
            />
            {user && <Typography variant="body2" color="text.secondary" sx={{ ml: 1, display: { xs: 'none', lg: 'block' } }}>{user.email}</Typography>}
            {user && <IconButton color="inherit" size="small" onClick={() => void logout()} title="Log out"><AccountCircleIcon fontSize="small" /></IconButton>}
          </Stack>
        </Toolbar>
      </AppBar>
      <Drawer variant={isMobile ? 'temporary' : 'persistent'} open={open} onClose={() => setOpen(false)} sx={{ width: open ? drawerWidth : collapsedWidth, flexShrink: 0, '& .MuiDrawer-paper': { width: open ? drawerWidth : collapsedWidth, boxSizing: 'border-box', borderRight: '1px solid', borderColor: 'divider' } }}>
        {drawer}
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <Toolbar />
        {/* Key on market scope so switching region/asset-class REMOUNTS the active
            page — re-firing its data fetches with the new scope. Without this,
            pages that fetch on mount/filters (not on scope) keep showing the
            previous market's data, just re-formatted with the new currency. */}
        <Box key={`${scope.region}-${scope.assetType}`} sx={{ flexGrow: 1, minWidth: 0 }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
