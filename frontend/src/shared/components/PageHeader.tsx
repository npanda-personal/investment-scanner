import React from 'react';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Box, Button, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';

type PageHeaderProps = {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  backTo?: string;
  backLabel?: string;
  badges?: React.ReactNode;
  primaryAction?: React.ReactNode;
  secondaryActions?: React.ReactNode;
};

export function PageHeader({
  title,
  subtitle,
  backTo,
  backLabel = 'Back',
  badges,
  primaryAction,
  secondaryActions,
}: PageHeaderProps) {
  const navigate = useNavigate();

  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      justifyContent="space-between"
      alignItems={{ xs: 'stretch', md: 'flex-start' }}
      spacing={2}
      sx={{ mb: 3 }}
    >
      <Stack spacing={1} sx={{ minWidth: 0 }}>
        {backTo && (
          <Box>
            <Button
              size="small"
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate(backTo)}
              sx={{ px: 0 }}
            >
              {backLabel}
            </Button>
          </Box>
        )}
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Typography variant="h4" fontWeight={700} sx={{ minWidth: 0 }}>
            {title}
          </Typography>
          {badges}
        </Stack>
        {subtitle && (
          <Typography color="text.secondary" sx={{ maxWidth: 860 }}>
            {subtitle}
          </Typography>
        )}
      </Stack>
      {(primaryAction || secondaryActions) && (
        <Stack direction="row" spacing={1} justifyContent={{ xs: 'flex-start', md: 'flex-end' }} flexWrap="wrap">
          {secondaryActions}
          {primaryAction}
        </Stack>
      )}
    </Stack>
  );
}
