import { Paper, Stack, Typography } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useMarketScope } from '@/contexts/MarketScopeContext';

/**
 * Graceful-degradation panel shown when a feature does not apply to the selected
 * market scope (e.g. fundamentals/delivery for crypto, or FII-DII/derivatives/
 * breadth for non-India equities).
 *
 * The label is derived from the ACTUAL selected scope (crypto assets / US equities
 * / EU equities / Indian equities) so US/EU users never see a "crypto assets"
 * message. Pass `assetClass` only to force a specific label. Honest empty state —
 * never blanks, errors, or fabricated data. Driven by MarketProfile capability
 * flags (see frontend/src/shared/marketProfile.ts).
 */
export function NotApplicableForAssetClass({
  feature,
  assetClass,
  detail,
}: {
  feature: string;
  /** Optional override for the label noun (e.g. 'crypto'). Defaults to the live scope. */
  assetClass?: string;
  detail?: string;
}) {
  const { scope, profile } = useMarketScope();

  let label: string;
  if (assetClass) {
    label = assetClass.toUpperCase() === 'CRYPTO' ? 'crypto assets' : assetClass;
  } else if (profile.isCrypto) {
    label = 'crypto assets';
  } else if (scope.region === 'IN') {
    label = 'Indian equities';
  } else if (scope.region === 'US') {
    label = 'US equities';
  } else if (scope.region === 'EU') {
    label = 'EU equities';
  } else {
    label = 'this market';
  }

  return (
    <Paper variant="outlined" sx={{ p: 3 }} data-testid="not-applicable-asset-class">
      <Stack direction="row" spacing={1.5} alignItems="flex-start">
        <InfoOutlinedIcon color="disabled" sx={{ mt: 0.25 }} />
        <Stack spacing={0.5}>
          <Typography variant="subtitle1" fontWeight={700}>
            {feature} is not applicable to {label}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {detail ??
              `This panel relies on data that does not exist for ${label}.`}
          </Typography>
        </Stack>
      </Stack>
    </Paper>
  );
}
