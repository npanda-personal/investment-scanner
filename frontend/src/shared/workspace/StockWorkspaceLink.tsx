/**
 * StockWorkspaceLink — the single source-aware link into the Stock Workspace.
 *
 * Replaces the per-page `SymbolLink` copies. Visually identical to the old SymbolLink
 * (primary, semibold, underline-on-hover) but, on click, it also records the list the
 * user is navigating from into the workspace source-list store, so the Chart tab's rail
 * can render that exact list. Pure navigation + a store write — no fetching.
 *
 * Structural outliers (a Button-styled cell, a row-level navigate) don't need this
 * component — they can call `useWorkspaceSourceListStore(s => s.setSource)` directly
 * before their own navigation.
 */
import type { ReactNode } from 'react';
import { Typography } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import type { WorkspaceSource } from './types';
import { useWorkspaceSourceListStore } from './workspaceSourceListStore';

interface StockWorkspaceLinkProps {
  instrumentId: string;
  symbol: string;
  /** The list this link belongs to — captured so the workspace rail can show it. */
  source: WorkspaceSource;
  sx?: SxProps<Theme>;
  children?: ReactNode;
}

const baseSx: SxProps<Theme> = {
  fontWeight: 600,
  textDecoration: 'none',
  '&:hover': { textDecoration: 'underline' },
};

export function StockWorkspaceLink({ instrumentId, symbol, source, sx, children }: StockWorkspaceLinkProps) {
  const setSource = useWorkspaceSourceListStore((s) => s.setSource);
  return (
    <Typography
      component={RouterLink}
      to={`/stocks/${instrumentId}`}
      onClick={() => setSource(source.label, source.items)}
      variant="body2"
      color="primary"
      sx={[baseSx, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}
    >
      {children ?? symbol}
    </Typography>
  );
}
