import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { useSubscriptionBilling } from '../hooks';
import { useAuthIdentity } from '@/features/auth-identity';
import { humanizeCode } from '@/shared/format/enumLabels';
import type { FeatureLimit, SubscriptionPlan } from '../types';

const planColor = (code: string) => code === 'ADMIN' ? 'secondary' : code === 'PRO' ? 'primary' : 'default';

export default function SubscriptionBillingPage() {
  const { me, plans, loading, saving, error, setError, changePlan } = useSubscriptionBilling();
  const { user } = useAuthIdentity();

  if (loading) {
    return <Stack alignItems="center" sx={{ py: 8 }}><CircularProgress /></Stack>;
  }

  return (
    <Box sx={{ maxWidth: 1180 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={2} sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Subscription & Billing</Typography>
          <Typography color="text.secondary">MVP plan readiness, feature limits, and usage metering. Billing provider is manual/disabled by default.</Typography>
        </Box>
        <Chip label={me?.plan.name || humanizeCode(me?.subscription.planCode || 'FREE')} color={planColor(me?.subscription.planCode || 'FREE')} />
      </Stack>

      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '360px 1fr' }, gap: 2 }}>
        <Stack spacing={2}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6">My Plan</Typography>
            <Typography variant="h4" fontWeight={700}>{me?.plan.name || 'Free'}</Typography>
            <Typography color="text.secondary">Status: {me?.subscription.status || 'ACTIVE'}</Typography>
            <Typography variant="body2" color="text.secondary">
              Account: {user?.email || user?.name || me?.userId || '—'}
            </Typography>
          </Paper>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>Available Plans</Typography>
            <Stack spacing={1}>
              {plans.map((plan) => (
                <PlanCard
                  key={plan.code}
                  plan={plan}
                  current={me?.subscription.planCode === plan.code}
                  saving={saving}
                  onSelect={() => void changePlan(plan.code)}
                />
              ))}
            </Stack>
          </Paper>
        </Stack>

        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Feature Limits</Typography>
          {!me || me.features.length === 0 ? <Typography color="text.secondary">No feature usage available yet.</Typography> : (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 1.5 }}>
              {me.features.map((feature) => <FeatureUsage key={feature.feature} feature={feature} />)}
            </Box>
          )}
          <Alert severity="info" sx={{ mt: 2 }}>
            Upgrade prompts are returned by backend gating errors when a limit is reached. Future UI flows can show those as modals near the blocked action.
          </Alert>
        </Paper>
      </Box>
    </Box>
  );
}

function PlanCard({ plan, current, saving, onSelect }: { plan: SubscriptionPlan; current: boolean; saving: boolean; onSelect: () => void }) {
  return (
    <Paper variant="outlined" sx={{ p: 1.5 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
        <Box>
          <Typography fontWeight={700}>{plan.name || humanizeCode(plan.code)}</Typography>
          <Typography variant="body2" color="text.secondary">{plan.active ? 'Active plan option' : 'Inactive'}</Typography>
        </Box>
        <Button size="small" variant={current ? 'outlined' : 'contained'} disabled={saving || current || !plan.active} onClick={onSelect}>
          {current ? 'Current' : plan.code === 'FREE' ? 'Downgrade' : 'Select'}
        </Button>
      </Stack>
    </Paper>
  );
}

function FeatureUsage({ feature }: { feature: FeatureLimit }) {
  const pct = feature.limit === null ? 0 : Math.min(100, (feature.used / Math.max(1, feature.limit)) * 100);
  const atLimit = !feature.allowed;
  return (
    <Paper variant="outlined" sx={{ p: 1.5, borderColor: atLimit ? 'warning.main' : undefined }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Typography fontWeight={700}>{feature.label}</Typography>
        {feature.limit === null
          ? <Chip size="small" label="Unlimited" color="success" variant="outlined" />
          : <Chip size="small" label={atLimit ? 'Limit reached' : 'Available'} color={atLimit ? 'warning' : 'success'} />
        }
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {feature.used} / {feature.limit === null ? 'Unlimited' : feature.limit}
      </Typography>
      {feature.limit !== null && (
        <LinearProgress
          variant="determinate"
          value={pct}
          color={atLimit ? 'warning' : pct >= 80 ? 'warning' : 'primary'}
        />
      )}
      {atLimit && (
        <Alert severity="warning" sx={{ mt: 1, py: 0 }}>
          Usage limit reached for <strong>{feature.label}</strong>. Upgrade your plan to continue using this feature.
        </Alert>
      )}
    </Paper>
  );
}
