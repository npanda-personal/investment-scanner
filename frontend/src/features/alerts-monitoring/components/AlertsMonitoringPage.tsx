import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography
} from '@mui/material';
import {
  LaunchOutlined,
  CheckCircleOutline,
  HighlightOffOutlined,
  DeleteOutline,
  PowerSettingsNewOutlined,
  PlayCircleOutlined,
} from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { deleteAlertRule, dismissAlert, evaluateAlerts, markAlertRead, markAllAlertsRead, updateAlertRule } from '../api/alertsMonitoringService';
import { useAlertsMonitoring } from '../hooks';
import { CreateAlertDialog } from './CreateAlertDialog';
import type { AlertEvent } from '../types';
import { useMarketScope } from '@/contexts/MarketScopeContext';

const severityColor = (severity: string) => severity === 'CRITICAL' ? 'error' : severity === 'WARNING' ? 'warning' : 'info';
const contextLink = (event: AlertEvent) => event.instrumentId ? `/research/stocks/${event.instrumentId}` : event.portfolioId ? `/portfolios/${event.portfolioId}` : event.watchlistId ? `/watchlists/${event.watchlistId}` : '/alerts';

export const AlertsMonitoringPage: React.FC = () => {
  const { scope } = useMarketScope();
  const { rules, events, loading, error, reload } = useAlertsMonitoring();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [evaluateMessage, setEvaluateMessage] = useState<string | null>(null);
  const [inboxFilter, setInboxFilter] = useState<'all' | 'unread'>('all');

  const handleEvaluateNow = async () => {
    setEvaluating(true);
    setEvaluateMessage(null);
    try {
      const result = await evaluateAlerts();
      await reload();
      setEvaluateMessage(`Evaluation complete — ${result.created} new event${result.created !== 1 ? 's' : ''} generated (${result.evaluated} rules checked).`);
    } catch (err: any) {
      setEvaluateMessage(`Evaluation failed: ${err.response?.data?.error || err.message || 'Unknown error'}`);
    } finally {
      setEvaluating(false);
    }
  };

  const visibleEvents = events
    .filter((event) => !event.dismissedAt)
    .filter((event) => inboxFilter === 'unread' ? !event.readAt : true);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2} sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4">Alerts</Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography color="text.secondary">Personal alert rules and alert inbox for stocks, triggers, portfolios, and watchlists.</Typography>
            <Chip label={`Scope: ${scope.region}`} size="small" variant="outlined" color="info" />
          </Stack>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="contained" onClick={() => setDialogOpen(true)}>Create Alert</Button>
        </Stack>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} action={<Button color="inherit" size="small" onClick={() => void reload()}>Retry</Button>}>
          {error}
        </Alert>
      )}
      {evaluateMessage && (
        <Alert
          severity={evaluateMessage.startsWith('Evaluation failed') ? 'error' : 'success'}
          sx={{ mb: 2 }}
          onClose={() => setEvaluateMessage(null)}
        >
          {evaluateMessage}
        </Alert>
      )}

      <CreateAlertDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onCreated={reload} />

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: '1.4fr 1fr' }, gap: 3 }}>
        <Paper sx={{ p: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }} flexWrap="wrap" gap={1}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="h6">Alert Inbox</Typography>
              <ToggleButtonGroup
                size="small"
                value={inboxFilter}
                exclusive
                onChange={(_event, value) => { if (value) setInboxFilter(value); }}
              >
                <ToggleButton value="all">All</ToggleButton>
                <ToggleButton value="unread">Unread</ToggleButton>
              </ToggleButtonGroup>
            </Stack>
            <Stack direction="row" spacing={1}>
              <Tooltip title="Run alert rules now and check for new events" arrow>
                <span>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={evaluating ? <CircularProgress size={14} /> : <PlayCircleOutlined fontSize="small" />}
                    onClick={() => void handleEvaluateNow()}
                    disabled={evaluating}
                  >
                    {evaluating ? 'Evaluating…' : 'Evaluate Now'}
                  </Button>
                </span>
              </Tooltip>
              <Button size="small" onClick={async () => { await markAllAlertsRead(); await reload(); }}>Mark All Read</Button>
            </Stack>
          </Stack>

          {visibleEvents.length === 0 ? (
            <Typography color="text.secondary">
              {inboxFilter === 'unread' ? 'No unread alert events.' : 'No alert events yet. Create rules and check alerts when you want a local review.'}
            </Typography>
          ) : (
            <Stack spacing={1.5}>
              {visibleEvents.map((event) => (
                <Paper key={event.id} variant="outlined" sx={{ p: 1.5, bgcolor: event.readAt ? 'background.paper' : 'action.hover' }}>
                  <Stack direction="row" justifyContent="space-between" spacing={1}>
                    <Box>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip size="small" color={severityColor(event.severity)} label={event.severity} />
                        <Typography fontWeight={700}>{event.title}</Typography>
                      </Stack>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{event.message}</Typography>
                      <Typography variant="caption" color="text.secondary">{new Date(event.triggeredAt).toLocaleString()}</Typography>
                    </Box>
                    <Stack direction="row" spacing={0.5}>
                      <Tooltip title="Open Context" arrow>
                        <IconButton size="small" component={Link} to={contextLink(event)}>
                          <LaunchOutlined fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {!event.readAt && (
                        <Tooltip title="Mark as Read" arrow>
                          <IconButton size="small" onClick={async () => { await markAlertRead(event.id); await reload(); }}>
                            <CheckCircleOutline fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Dismiss Alert" arrow>
                        <IconButton size="small" color="error" onClick={async () => { await dismissAlert(event.id); await reload(); }}>
                          <HighlightOffOutlined fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}
        </Paper>

        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Alert Rules</Typography>
          {rules.length === 0 ? (
            <Typography color="text.secondary">No alert rules yet.</Typography>
          ) : (
            <Stack spacing={1.5}>
              {rules.map((rule) => (
                <Paper key={rule.id} variant="outlined" sx={{ p: 1.5 }}>
                  <Stack direction="row" justifyContent="space-between" spacing={1}>
                    <Box>
                      <Typography fontWeight={700}>{rule.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {rule.type} · {rule.scope}
                        {rule.type !== 'SIGNAL_DIRECTION_CHANGED' && ` · Threshold ${rule.condition.threshold ?? 'N/A'}`}
                      </Typography>
                    </Box>
                    <Chip size="small" color={rule.enabled ? 'success' : 'default'} label={rule.enabled ? 'Enabled' : 'Disabled'} />
                  </Stack>
                  <Stack direction="row" spacing={0.5} sx={{ mt: 1 }}>
                    <Tooltip title={rule.enabled ? "Disable Rule" : "Enable Rule"} arrow>
                      <IconButton size="small" onClick={async () => { await updateAlertRule(rule.id, { enabled: !rule.enabled }); await reload(); }}>
                        <PowerSettingsNewOutlined fontSize="small" color={rule.enabled ? "success" : "action"} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Rule" arrow>
                      <IconButton size="small" color="error" onClick={async () => { await deleteAlertRule(rule.id); await reload(); }}>
                        <DeleteOutline fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}
        </Paper>
      </Box>
    </Box>
  );
};

export default AlertsMonitoringPage;
