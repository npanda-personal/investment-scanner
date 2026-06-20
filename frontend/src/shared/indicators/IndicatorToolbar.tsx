import React from 'react';
import { Box, Chip, Typography } from '@mui/material';
import { INDICATOR_ORDER, INDICATOR_REGISTRY } from './registry';
import type { IndicatorId } from './types';

interface IndicatorToolbarProps {
  activeIds: IndicatorId[];
  onChange: (ids: IndicatorId[]) => void;
  rightSlot?: React.ReactNode;
}

export default function IndicatorToolbar({ activeIds, onChange, rightSlot }: IndicatorToolbarProps) {
  const toggle = (id: IndicatorId) => {
    onChange(
      activeIds.includes(id) ? activeIds.filter((a) => a !== id) : [...activeIds, id],
    );
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        alignItems: { xs: 'flex-start', md: 'center' },
        gap: 0.75,
        px: 1.5,
        py: 0.75,
        borderBottom: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
        <Typography
          variant="caption"
          color="text.disabled"
          sx={{ fontWeight: 600, letterSpacing: 0.4, mr: 0.5 }}
        >
          INDICATORS
        </Typography>
        {INDICATOR_ORDER.map((id) => {
          const def = INDICATOR_REGISTRY[id];
          const active = activeIds.includes(id);
          return (
            <Chip
              key={id}
              label={def.label}
              size="small"
              clickable
              variant={active ? 'filled' : 'outlined'}
              color={active ? 'primary' : 'default'}
              onClick={() => toggle(id)}
              sx={{ fontSize: '0.72rem', height: 22 }}
            />
          );
        })}
      </Box>
      {rightSlot && <Box sx={{ ml: { xs: 0, md: 'auto' } }}>{rightSlot}</Box>}
    </Box>
  );
}
