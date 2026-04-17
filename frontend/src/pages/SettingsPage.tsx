import {
  Box,
  Typography,
  Paper,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Switch,
  TextField,
  Button,
  Stack,
  Alert,
} from '@mui/material';
import { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';

const SettingsPage = () => {
  const { themeMode, setThemeMode } = useTheme();
  const [notifications, setNotifications] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState('30');
  const [email, setEmail] = useState('');
  const [saved, setSaved] = useState(false);

  const handleThemeChange = (event: SelectChangeEvent) => {
    setThemeMode(event.target.value as 'light' | 'dark' | 'custom');
  };

  const handleSave = () => {
    // In a real app, you would persist settings to a backend
    console.log('Settings saved', { themeMode, notifications, autoRefresh, refreshInterval, email });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: { xs: 2, md: 4 } }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        User Settings
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Manage your account preferences, theme, and notification settings.
      </Typography>

      {saved && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Settings saved successfully.
        </Alert>
      )}

      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Account & Preferences
        </Typography>
        <Divider sx={{ mb: 3 }} />
        <Stack spacing={3}>
          <Box>
            <Typography variant="subtitle1" fontWeight={500} gutterBottom>
              Email Address
            </Typography>
            <TextField
              fullWidth
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              size="small"
            />
          </Box>
          <Box>
            <Typography variant="subtitle1" fontWeight={500} gutterBottom>
              Notifications
            </Typography>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Switch
                checked={notifications}
                onChange={(e) => setNotifications(e.target.checked)}
                color="primary"
              />
              <Typography variant="body2">
                Receive email notifications for alerts and system updates
              </Typography>
            </Stack>
          </Box>
          <Box>
            <Typography variant="subtitle1" fontWeight={500} gutterBottom>
              Auto‑refresh Data
            </Typography>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Switch
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                color="primary"
              />
              <Typography variant="body2">
                Automatically refresh market data every{' '}
                <TextField
                  select
                  size="small"
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(e.target.value)}
                  sx={{ width: 80, mx: 1 }}
                  disabled={!autoRefresh}
                >
                  <MenuItem value="15">15</MenuItem>
                  <MenuItem value="30">30</MenuItem>
                  <MenuItem value="60">60</MenuItem>
                </TextField>
                seconds
              </Typography>
            </Stack>
          </Box>
        </Stack>
      </Paper>

      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Theme
        </Typography>
        <Divider sx={{ mb: 3 }} />
        <Typography variant="body2" color="text.secondary" paragraph>
          Choose a visual theme for the application. Changes take effect immediately.
        </Typography>
        <FormControl fullWidth size="small">
          <InputLabel id="theme-select-label">Theme</InputLabel>
          <Select
            labelId="theme-select-label"
            value={themeMode}
            label="Theme"
            onChange={handleThemeChange}
          >
            <MenuItem value="light">Light</MenuItem>
            <MenuItem value="dark">Dark</MenuItem>
            <MenuItem value="custom">Custom (coming soon)</MenuItem>
          </Select>
        </FormControl>
        <Box sx={{ mt: 3, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
          <Typography variant="body2">
            <strong>Preview:</strong> The selected theme changes the overall color scheme, contrast, and component styling. Custom theme will allow you to pick primary and secondary colors in a future update.
          </Typography>
        </Box>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Actions
        </Typography>
        <Divider sx={{ mb: 3 }} />
        <Stack direction="row" spacing={2}>
          <Button variant="contained" onClick={handleSave}>
            Save Changes
          </Button>
          <Button variant="outlined" onClick={() => window.location.reload()}>
            Reload Application
          </Button>
          <Button variant="text" color="error">
            Reset to Defaults
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
};

export default SettingsPage;