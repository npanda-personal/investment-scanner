import React from 'react';
import {
  Box,
  Button,
  Menu,
  MenuItem,
  Typography,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import PublicIcon from '@mui/icons-material/Public';
import LanguageIcon from '@mui/icons-material/Language';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import CurrencyBitcoinIcon from '@mui/icons-material/CurrencyBitcoin';
import { Divider } from '@mui/material';
import { useMarketScope, MarketRegion, AssetType } from '@/contexts/MarketScopeContext';

const REGIONS: { value: MarketRegion; label: string; icon: React.ReactNode }[] = [
  { value: 'IN', label: 'India', icon: <LanguageIcon fontSize="small" /> },
  { value: 'US', label: 'United States', icon: <LanguageIcon fontSize="small" /> },
  { value: 'EU', label: 'Europe', icon: <LanguageIcon fontSize="small" /> },
  { value: 'GLOBAL', label: 'Global', icon: <PublicIcon fontSize="small" /> },
];

const ASSET_CLASSES: { value: AssetType; label: string; icon: React.ReactNode }[] = [
  { value: 'STOCK', label: 'Equities', icon: <ShowChartIcon fontSize="small" /> },
  { value: 'CRYPTO', label: 'Crypto', icon: <CurrencyBitcoinIcon fontSize="small" /> },
];

export const MarketScopeSelector: React.FC = () => {
  const { scope, setRegion, setAssetType } = useMarketScope();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSelect = (region: MarketRegion) => {
    setRegion(region);
    handleClose();
  };

  const handleSelectAssetClass = (assetType: AssetType) => {
    setAssetType(assetType);
    handleClose();
  };

  const currentRegion = REGIONS.find(r => r.value === scope.region) || REGIONS[0];
  const isCrypto = scope.assetType === 'CRYPTO';
  const currentAssetClass = ASSET_CLASSES.find(a => a.value === scope.assetType);

  return (
    <Box>
      <Button
        id="market-scope-button"
        aria-controls={open ? 'market-scope-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
        variant="outlined"
        size="small"
        disableElevation
        onClick={handleClick}
        endIcon={<KeyboardArrowDownIcon />}
        startIcon={isCrypto ? (currentAssetClass?.icon ?? <CurrencyBitcoinIcon fontSize="small" />) : currentRegion.icon}
        sx={{
          borderColor: 'divider',
          color: 'text.primary',
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 2,
          px: 2,
          '&:hover': {
            borderColor: 'primary.main',
            backgroundColor: 'action.hover',
          },
        }}
      >
        <Typography variant="body2" component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
          {isCrypto ? 'Market: Crypto' : `Market: ${currentRegion.label}`}
        </Typography>
        <Typography variant="body2" component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>
          {isCrypto ? 'CRYPTO' : currentRegion.value}
        </Typography>
      </Button>
      <Menu
        id="market-scope-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          'aria-labelledby': 'market-scope-button',
        }}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          elevation: 3,
          sx: {
            mt: 1,
            borderRadius: 2,
            minWidth: 180,
          },
        }}
      >
        <Typography
          variant="overline"
          sx={{ px: 2, py: 0.5, display: 'block', color: 'text.secondary', fontWeight: 700 }}
        >
          Asset Class
        </Typography>
        {ASSET_CLASSES.map((option) => (
          <MenuItem
            key={option.value}
            selected={option.value === scope.assetType}
            onClick={() => handleSelectAssetClass(option.value)}
            sx={{ py: 1 }}
            data-testid={`asset-class-${option.value.toLowerCase()}`}
          >
            <ListItemIcon>{option.icon}</ListItemIcon>
            <ListItemText
              primary={option.label}
              primaryTypographyProps={{ variant: 'body2', fontWeight: option.value === scope.assetType ? 700 : 400 }}
            />
          </MenuItem>
        ))}
        <Divider sx={{ my: 0.5 }} />
        <Typography
          variant="overline"
          sx={{ px: 2, py: 0.5, display: 'block', color: 'text.secondary', fontWeight: 700 }}
        >
          Select Market Region
        </Typography>
        {REGIONS.map((option) => (
          <MenuItem
            key={option.value}
            selected={option.value === scope.region}
            disabled={isCrypto && option.value !== 'GLOBAL'}
            onClick={() => handleSelect(option.value)}
            sx={{ py: 1 }}
          >
            <ListItemIcon>{option.icon}</ListItemIcon>
            <ListItemText
              primary={option.label}
              primaryTypographyProps={{ variant: 'body2', fontWeight: option.value === scope.region ? 700 : 400 }}
            />
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
};
