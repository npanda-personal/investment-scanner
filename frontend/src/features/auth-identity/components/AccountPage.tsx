import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControlLabel,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useAuthIdentity } from '../hooks';
import { useNotificationsDelivery } from '../../notifications-delivery/hooks';
import {
  sendAlertDigest,
  sendDailyDigest,
  sendTestEmail,
  sendWeeklyDigest,
  updateNotificationPreferences,
} from '../../notifications-delivery/api/notificationsDeliveryService';
import type { NotificationEvent, NotificationPreferences, NotificationStatus } from '../../notifications-delivery/types';

// ── helpers shared only by the Notifications section ──────────────────────────

const notifStatusColor = (status: NotificationStatus) => {
  if (status === 'SENT') return 'success' as const;
  if (status === 'FAILED') return 'error' as const;
  if (status === 'SKIPPED') return 'warning' as const;
  return 'default' as const;
};

const formatDate = (value: string | null) => value ? new Date(value).toLocaleString() : 'N/A';

// ── AccountPage ────────────────────────────────────────────────────────────────

export default function AccountPage() {
  // — Profile section —
  const { user, updateName, logout, error, setError } = useAuthIdentity();
  const [name, setName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await updateName(name);
    } finally {
      setSaving(false);
    }
  };

  // — Notifications section —
  const { preferences, events, providerStatus, loading: notifLoading, error: notifError, reload: notifReload } = useNotificationsDelivery();
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifActionMessage, setNotifActionMessage] = useState<string | null>(null);
  const [notifActionError, setNotifActionError] = useState<string | null>(null);

  const patchPreference = async (patch: Partial<NotificationPreferences>) => {
    if (!preferences) return;
    setNotifSaving(true);
    setNotifActionError(null);
    try {
      await updateNotificationPreferences(patch);
      await notifReload();
      setNotifActionMessage('Notification preferences updated.');
    } catch (err: any) {
      setNotifActionError(err.response?.data?.error || err.message || 'Failed to update preferences');
    } finally {
      setNotifSaving(false);
    }
  };

  const runNotifAction = async (label: string, action: () => Promise<NotificationEvent>) => {
    setNotifSaving(true);
    setNotifActionMessage(null);
    setNotifActionError(null);
    try {
      const result = await action();
      await notifReload();
      setNotifActionMessage(`${label}: ${result.status.toLowerCase()} via ${result.channel}.`);
    } catch (err: any) {
      setNotifActionError(err.response?.data?.error || err.message || `${label} failed`);
    } finally {
      setNotifSaving(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 720 }}>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 2 }}>Account</Typography>

      {/* ── Profile card ── */}
      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}
      <Paper sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Typography color="text.secondary">Signed in as {user?.email}</Typography>
          <TextField label="Name" value={name} onChange={(event) => setName(event.target.value)} />
          <Stack direction="row" spacing={1}>
            <Button variant="contained" disabled={saving} onClick={() => void save()}>{saving ? 'Saving...' : 'Save profile'}</Button>
            <Button color="error" variant="outlined" onClick={() => void logout()}>Log out</Button>
          </Stack>
        </Stack>
      </Paper>

      {/* ── Notifications section ── */}
      <Typography variant="h5" fontWeight={600} sx={{ mt: 4, mb: 2 }}>Notifications</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Configure delivery preferences, email digests, and notification history.
      </Typography>

      {(notifError || notifActionError) && (
        <Alert severity="error" sx={{ mb: 2 }}>{notifError || notifActionError}</Alert>
      )}
      {notifActionMessage && (
        <Alert severity="success" sx={{ mb: 2 }}>{notifActionMessage}</Alert>
      )}

      {notifLoading && !preferences ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Stack spacing={2}>
          {/* Preferences */}
          <Paper sx={{ p: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
              <Typography variant="h6">Preferences</Typography>
              {providerStatus && <Chip label={providerStatus.activeChannel} color="primary" variant="outlined" size="small" />}
            </Stack>
            {!preferences ? (
              <Typography color="text.secondary">Preferences are unavailable.</Typography>
            ) : (
              <Stack spacing={1}>
                <FormControlLabel
                  control={<Switch checked={preferences.emailNotificationsEnabled} onChange={(e) => void patchPreference({ emailNotificationsEnabled: e.target.checked })} />}
                  label="Enable email notifications"
                />
                <FormControlLabel
                  control={<Switch checked={preferences.alertEmailsEnabled} onChange={(e) => void patchPreference({ alertEmailsEnabled: e.target.checked })} />}
                  label="Alert email digests"
                />
                <FormControlLabel
                  control={<Switch checked={preferences.dailyDigestEnabled} onChange={(e) => void patchPreference({ dailyDigestEnabled: e.target.checked })} />}
                  label="Daily digest"
                />
                <FormControlLabel
                  control={<Switch checked={preferences.weeklyDigestEnabled} onChange={(e) => void patchPreference({ weeklyDigestEnabled: e.target.checked })} />}
                  label="Weekly digest"
                />
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ pt: 1 }}>
                  <TextField
                    label="Quiet hours start"
                    value={preferences.quietHoursStart || ''}
                    placeholder="22:00"
                    size="small"
                    onChange={(e) => void patchPreference({ quietHoursStart: e.target.value || null })}
                  />
                  <TextField
                    label="Quiet hours end"
                    value={preferences.quietHoursEnd || ''}
                    placeholder="07:00"
                    size="small"
                    onChange={(e) => void patchPreference({ quietHoursEnd: e.target.value || null })}
                  />
                </Stack>
              </Stack>
            )}
          </Paper>

          {/* Provider status */}
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 1.5 }}>Provider Status</Typography>
            {providerStatus ? (
              <Stack spacing={1.5}>
                <Typography>{providerStatus.message}</Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <Chip label={`Provider: ${providerStatus.providerName}`} size="small" />
                  <Chip label={`SMTP configured: ${providerStatus.smtpConfigured ? 'Yes' : 'No'}`} color={providerStatus.smtpConfigured ? 'warning' : 'default'} size="small" />
                  <Chip label={`SMTP active: ${providerStatus.smtpAvailable ? 'Yes' : 'No'}`} color={providerStatus.smtpAvailable ? 'success' : 'default'} size="small" />
                </Stack>
                <Alert severity="info" sx={{ mt: 0.5 }}>Local email delivery is free and requires no paid email service — deliveries are recorded locally.</Alert>
              </Stack>
            ) : (
              <Typography color="text.secondary">Provider status is unavailable.</Typography>
            )}
          </Paper>

          {/* Manual sends */}
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 1.5 }}>Manual Sends</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} flexWrap="wrap">
              <Button variant="contained" disabled={notifSaving} onClick={() => void runNotifAction('Test notification', sendTestEmail)}>Send Test Email</Button>
              <Button variant="outlined" disabled={notifSaving} onClick={() => void runNotifAction('Alert digest', sendAlertDigest)}>Send Alert Digest</Button>
              <Button variant="outlined" disabled={notifSaving} onClick={() => void runNotifAction('Daily digest', sendDailyDigest)}>Send Daily Digest</Button>
              <Button variant="outlined" disabled={notifSaving} onClick={() => void runNotifAction('Weekly digest', sendWeeklyDigest)}>Send Weekly Digest</Button>
            </Stack>
          </Paper>

          {/* Delivery history */}
          <Paper sx={{ p: 2, overflowX: 'auto' }}>
            <Typography variant="h6" sx={{ mb: 1.5 }}>Recent Delivery History</Typography>
            {events.length === 0 ? (
              <Typography color="text.secondary">No notification delivery records yet.</Typography>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Created</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Channel</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Title</TableCell>
                    <TableCell>Error</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {events.map((event) => (
                    <TableRow key={event.id} hover>
                      <TableCell>{formatDate(event.createdAt)}</TableCell>
                      <TableCell>{event.type}</TableCell>
                      <TableCell>{event.channel}</TableCell>
                      <TableCell><Chip size="small" label={event.status} color={notifStatusColor(event.status)} /></TableCell>
                      <TableCell>{event.title}</TableCell>
                      <TableCell>{event.error || 'N/A'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Paper>
        </Stack>
      )}
    </Box>
  );
}
