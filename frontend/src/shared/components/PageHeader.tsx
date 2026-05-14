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
  density?: 'compact' | 'standard';
};

export function PageHeader({
  title,
  subtitle,
  backTo,
  backLabel = 'Back',
  badges,
  primaryAction,
  secondaryActions,
  density = 'compact',
}: PageHeaderProps) {
  const navigate = useNavigate();
  const isCompact = density === 'compact';

  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      justifyContent="space-between"
      alignItems={{ xs: 'stretch', md: 'flex-start' }}
      spacing={2}
      useFlexGap
      flexWrap="wrap"
      sx={{
        mb: isCompact ? 2 : 3,
        maxWidth: '100%',
        rowGap: isCompact ? 1.5 : 2,
      }}
    >
      <Stack spacing={1} sx={{ minWidth: 0, flex: { xs: '0 1 auto', md: '1 1 420px' } }}>
        {backTo && (
          <Box>
            <Button
              size="small"
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate(backTo)}
              sx={{ px: 0, minHeight: 28 }}
            >
              {backLabel}
            </Button>
          </Box>
        )}
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ maxWidth: '100%', minWidth: 0 }}>
          <Typography
            variant="h4"
            sx={(theme) => ({
              flex: '1 1 100%',
              maxWidth: '100%',
              minWidth: 0,
              whiteSpace: 'normal',
              overflowWrap: 'anywhere',
              wordBreak: 'break-word',
              fontSize: isCompact
                ? `${theme.visualTokens.typography.sectionTitle.fontSize}px`
                : `${theme.visualTokens.typography.workspaceTitle.fontSize}px`,
              lineHeight: isCompact
                ? theme.visualTokens.typography.sectionTitle.lineHeight
                : theme.visualTokens.typography.workspaceTitle.lineHeight,
              fontWeight: isCompact
                ? theme.visualTokens.typography.sectionTitle.fontWeight
                : theme.visualTokens.typography.workspaceTitle.fontWeight,
              letterSpacing: 0,
            })}
          >
            {title}
          </Typography>
          {badges}
        </Stack>
        {subtitle && (
          <Typography
            color="text.secondary"
            sx={(theme) => ({
              maxWidth: 860,
              minWidth: 0,
              overflowWrap: 'anywhere',
              fontSize: `${theme.visualTokens.typography.body.fontSize}px`,
              lineHeight: theme.visualTokens.typography.body.lineHeight,
            })}
          >
            {subtitle}
          </Typography>
        )}
      </Stack>
      {(primaryAction || secondaryActions) && (
        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          justifyContent={{ xs: 'flex-start', md: 'flex-end' }}
          alignItems="center"
          flexWrap="wrap"
          sx={{
            maxWidth: '100%',
            minWidth: 0,
            flex: { xs: '0 1 auto', md: '1 1 320px' },
            rowGap: 1,
            '& > *': {
              minWidth: 0,
            },
            '& .MuiButton-root': {
              maxWidth: '100%',
              whiteSpace: 'normal',
              minHeight: isCompact ? 32 : 36,
            },
            '& .MuiTextField-root': {
              maxWidth: '100%',
            },
          }}
        >
          {secondaryActions}
          {primaryAction}
        </Stack>
      )}
    </Stack>
  );
}
