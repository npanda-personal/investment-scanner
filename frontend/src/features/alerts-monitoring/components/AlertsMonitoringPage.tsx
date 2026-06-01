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
  Tooltip, 
  Typography 
} from '@mui/material';
import { 
  LaunchOutlined, 
  CheckCircleOutline, 
  HighlightOffOutlined, 
  DeleteOutline,
  PowerSettingsNewOutlined
} from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { deleteAlertRule, dismissAlert, markAlertRead, markAllAlertsRead, updateAlertRule } from '../api/alertsMonitoringService';
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
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <CreateAlertDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onCreated={reload} />

      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>Planned Radar Alert States</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          These states appear after persisted alert read models exist. This trader page does not evaluate shared alert conditions.
        </Typography>
        <Stack direction="row" gap={1} flexWrap="wrap" useFlexGap>
          {['Entered Radar', 'Upcoming Result', 'Risk Radar Entry', 'Sector Weakness', '52W High', 'Delivery Accumulation'].map((item) => (
            <Chip key={item} label={item} variant="outlined" />
          ))}
        </Stack>
      </Paper>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: '1.4fr 1fr' }, gap: 3 }}>
        <Paper sx={{ p: 2 }}>
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 2 }}>
            <Typography variant="h6">Alert Inbox</Typography>
            <Button size="small" onClick={async () => { await markAllAlertsRead(); await reload(); }}>Mark All Read</Button>
          </Stack>
          {events.length === 0 ? (
            <Typography color="text.secondary">No alert events yet. Create rules and check alerts when you want a local review.</Typography>
          ) : (
            <Stack spacing={1.5}>
              {events.filter((event) => !event.dismissedAt).map((event) => (
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
                      <Typography variant="body2" color="text.secondary">{rule.type} · {rule.scope} · Threshold {rule.condition.threshold ?? 'N/A'}</Typography>
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
