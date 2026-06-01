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

const drawerWidth = 260;
const collapsedWidth = 72;

export default function NavigationLayout() {
  const theme = useTheme();
  const { themeMode, toggleTheme } = useThemeMode();
  const { user, logout } = useAuthIdentity();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [open, setOpen] = useState(!isMobile);
  const location = useLocation();

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
            {group.items.map((item) => {
              const isActive = isNavItemActive(location.pathname, item);
              return (
                <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
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
                    <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
                    {open && <ListItemText primary={item.label} primaryTypographyProps={{ variant: 'body2' }} />}
                  </ListItemButton>
                </ListItem>
              );
            })}
            {groupIndex < currentNavGroups.length - 1 && open && <Divider sx={{ my: 1, mx: 1 }} />}
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
      <Box component="main" sx={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <Toolbar />
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
