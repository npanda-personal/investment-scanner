/**
 * SourceListRail — the reusable, scrollable right-hand rail on the Stock Workspace
 * Chart tab. Renders the "source list" (the list the user clicked from) read from the
 * workspace source-list store, highlights the current stock, and lets the user jump to
 * any sibling stock without leaving the chart. Reads from the store only — no fetching.
 */
import { useEffect, useRef } from 'react';
import {
  Box,
  List,
  ListItemButton,
  Paper,
  Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useWorkspaceSourceListStore } from './workspaceSourceListStore';

interface SourceListRailProps {
  /** Instrument id of the stock currently open — highlighted and scrolled into view. */
  activeInstrumentId?: string;
  /** Matches the chart height so the two columns align. */
  height?: number | string;
}

export default function SourceListRail({ activeInstrumentId, height = 620 }: SourceListRailProps) {
  const navigate = useNavigate();
  const label = useWorkspaceSourceListStore((s) => s.label);
  const items = useWorkspaceSourceListStore((s) => s.items);
  const activeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest' });
  }, [activeInstrumentId, items]);

  if (items.length === 0) {
    return (
      <Paper sx={{ p: 2, height }}>
        <Typography variant="subtitle2" gutterBottom>
          Related stocks
        </Typography>
        <Typography variant="body2" color="text.secondary">
          No list context yet. Open a stock from a list — Screener, Watchlist, Market
          Scans — to browse that list here without leaving the chart.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ height, display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 1.5, pb: 1, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="subtitle2" noWrap>
          {label || 'Related stocks'}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {items.length} {items.length === 1 ? 'stock' : 'stocks'}
        </Typography>
      </Box>
      <List dense sx={{ overflowY: 'auto', flex: 1, py: 0 }}>
        {items.map((item) => {
          const active = item.instrumentId === activeInstrumentId;
          return (
            <ListItemButton
              key={item.instrumentId}
              selected={active}
              onClick={() => navigate(`/stocks/${item.instrumentId}`)}
              sx={{ alignItems: 'flex-start', py: 0.75 }}
            >
              <Box ref={active ? activeRef : undefined} sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="body2" fontWeight={700} noWrap>
                  {item.symbol}
                </Typography>
                {item.companyName ? (
                  <Typography variant="caption" color="text.secondary" noWrap display="block">
                    {item.companyName}
                  </Typography>
                ) : null}
              </Box>
            </ListItemButton>
          );
        })}
      </List>
    </Paper>
  );
}
