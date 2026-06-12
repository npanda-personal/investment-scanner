import React, { useState } from 'react';
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
import {
  sendAlertDigest,
  sendDailyDigest,
  sendTestEmail,
  sendWeeklyDigest,
  updateNotificationPreferences,
} from '../api/notificationsDeliveryService';
import { useNotificationsDelivery } from '../hooks';
import type { NotificationEvent, NotificationPreferences, NotificationStatus } from '../types';

const statusColor = (status: NotificationStatus) => {
  if (status === 'SENT') return 'success';
  if (status === 'FAILED') return 'error';
  if (status === 'SKIPPED') return 'warning';
  return 'default';
};

const formatDate = (value: string | null) => value ? new Date(value).toLocaleString() : 'N/A';

const PreferenceSwitch: React.FC<{
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}> = ({ label, checked, onChange }) => (
  <FormControlLabel
    control={<Switch checked={checked} onChange={(event) => onChange(event.target.checked)} />}
    label={label}
  />
);

const EventHistory: React.FC<{ events: NotificationEvent[] }> = ({ events }) => (
  <Paper sx={{ p: 2, overflowX: 'auto' }}>
    <Typography variant="h6" sx={{ mb: 2 }}>Recent Delivery History</Typography>
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
              <TableCell><Chip size="small" label={event.status} color={statusColor(event.status)} /></TableCell>
              <TableCell>{event.title}</TableCell>
              <TableCell>{event.error || 'N/A'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )}
  </Paper>
);

const NotificationsDeliveryPage: React.FC = () => {
  const { preferences, events, providerStatus, loading, error, reload } = useNotificationsDelivery();
  const [saving, setSaving] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const patchPreference = async (patch: Partial<NotificationPreferences>) => {
    if (!preferences) return;
    setSaving(true);
    setActionError(null);
    try {
      await updateNotificationPreferences(patch);
      await reload();
      setActionMessage('Notification preferences updated.');
    } catch (err: any) {
      setActionError(err.response?.data?.error || err.message || 'Failed to update preferences');
    } finally {
      setSaving(false);
    }
  };

  const runAction = async (label: string, action: () => Promise<NotificationEvent>) => {
    setSaving(true);
    setActionMessage(null);
    setActionError(null);
    try {
      const result = await action();
      await reload();
      setActionMessage(`${label}: ${result.status.toLowerCase()} via ${result.channel}.`);
    } catch (err: any) {
      setActionError(err.response?.data?.error || err.message || `${label} failed`);
    } finally {
      setSaving(false);
    }
  };

  if (loading && !preferences) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1300, mx: 'auto' }}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2} sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4">Notifications</Typography>
          <Typography color="text.secondary">Configure local delivery, email-style digests, and notification history.</Typography>
        </Box>
        {providerStatus && <Chip label={providerStatus.activeChannel} color="primary" variant="outlined" />}
      </Stack>

      {(error || actionError) && <Alert severity="error" sx={{ mb: 2 }}>{error || actionError}</Alert>}
      {actionMessage && <Alert severity="success" sx={{ mb: 2 }}>{actionMessage}</Alert>}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3, mb: 3 }}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Notification Preferences</Typography>
          {!preferences ? (
            <Typography color="text.secondary">Preferences are unavailable.</Typography>
          ) : (
            <Stack spacing={1}>
              <PreferenceSwitch label="Enable email notifications" checked={preferences.emailNotificationsEnabled} onChange={(value) => patchPreference({ emailNotificationsEnabled: value })} />
              <PreferenceSwitch label="Alert email digests" checked={preferences.alertEmailsEnabled} onChange={(value) => patchPreference({ alertEmailsEnabled: value })} />
              <PreferenceSwitch label="Daily digest" checked={preferences.dailyDigestEnabled} onChange={(value) => patchPreference({ dailyDigestEnabled: value })} />
              <PreferenceSwitch label="Weekly digest" checked={preferences.weeklyDigestEnabled} onChange={(value) => patchPreference({ weeklyDigestEnabled: value })} />
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ pt: 1 }}>
                <TextField
                  label="Quiet hours start"
                  value={preferences.quietHoursStart || ''}
                  placeholder="22:00"
                  size="small"
                  onChange={(event) => patchPreference({ quietHoursStart: event.target.value || null })}
                />
                <TextField
                  label="Quiet hours end"
                  value={preferences.quietHoursEnd || ''}
                  placeholder="07:00"
                  size="small"
                  onChange={(event) => patchPreference({ quietHoursEnd: event.target.value || null })}
                />
              </Stack>
            </Stack>
          )}
        </Paper>

        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Provider Status</Typography>
          {providerStatus ? (
            <Stack spacing={1.5}>
              <Typography>{providerStatus.message}</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Chip label={`Provider: ${providerStatus.providerName}`} />
                <Chip label={`SMTP configured: ${providerStatus.smtpConfigured ? 'Yes' : 'No'}`} color={providerStatus.smtpConfigured ? 'warning' : 'default'} />
                <Chip label={`SMTP active: ${providerStatus.smtpAvailable ? 'Yes' : 'No'}`} color={providerStatus.smtpAvailable ? 'success' : 'default'} />
              </Stack>
              <Alert severity="info">Local email delivery is free and requires no paid email service — deliveries are recorded locally.</Alert>
            </Stack>
          ) : (
            <Typography color="text.secondary">Provider status is unavailable.</Typography>
          )}
        </Paper>
      </Box>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Manual Sends</Typography>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
          <Button variant="contained" disabled={saving} onClick={() => runAction('Test notification', sendTestEmail)}>Send Test Email</Button>
          <Button variant="outlined" disabled={saving} onClick={() => runAction('Alert digest', sendAlertDigest)}>Send Alert Digest</Button>
          <Button variant="outlined" disabled={saving} onClick={() => runAction('Daily digest', sendDailyDigest)}>Send Daily Digest</Button>
          <Button variant="outlined" disabled={saving} onClick={() => runAction('Weekly digest', sendWeeklyDigest)}>Send Weekly Digest</Button>
        </Stack>
      </Paper>

      <EventHistory events={events} />
    </Box>
  );
};

export default NotificationsDeliveryPage;
