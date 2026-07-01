import { Box, Tab, Tabs, Tooltip } from '@mui/material';
import type { Dispatch, SetStateAction, SyntheticEvent } from 'react';
import type { ScreenerFilters, ScreenerSetup } from '../../types';
import type { SortKey } from '../screener-sort';
import {
  setupsForDirection,
  ALL_DIRECTION_DESCRIPTION,
  type ScreenerDirectionTab,
} from './screener-setups';

interface ScreenerDirectionTabsProps {
  filters: ScreenerFilters;
  setFilters: Dispatch<SetStateAction<ScreenerFilters>>;
  setPage: (page: number) => void;
  setSortKey: (key: SortKey) => void;
  setSortDir: (dir: 'asc' | 'desc') => void;
}

/**
 * The Screener's All/Bullish/Bearish direction selector plus the direction-specific setup
 * sub-tabs. Drives `signalDirection` and `setup` together; other filters compose within the
 * active tab. Each setup tab carries a hover tooltip describing what it matches (the labels
 * alone don't convey the selection logic). Kept as its own component so ScreenerPage stays
 * within the file-size cap and the tooltip copy lives beside the setup taxonomy it mirrors.
 */
export function ScreenerDirectionTabs({
  filters,
  setFilters,
  setPage,
  setSortKey,
  setSortDir,
}: ScreenerDirectionTabsProps) {
  // Direction selector + setup sub-tabs drive `signalDirection` and `setup` together. NEUTRAL is
  // not a tab (the legacy dropdown's NEUTRAL option is dropped) — it collapses to the "All" tab.
  const directionTab: ScreenerDirectionTab =
    filters.signalDirection === 'BULLISH' ? 'BULLISH'
      : filters.signalDirection === 'BEARISH' ? 'BEARISH'
        : 'ALL';
  const setupOptions = setupsForDirection(directionTab);

  const handleDirectionChange = (_e: SyntheticEvent, dir: ScreenerDirectionTab) => {
    setPage(0);
    // Default the score sort to match the tab's polarity: `score` is a directional 0-100
    // scale (>=60 bullish, <=40 bearish), so "strongest conviction first" is score DESC for
    // Bullish/All but ASC for Bearish (lowest score = most bearish). Mirrors the backend's
    // direction-aware ORDER BY so the client re-sort doesn't undo it. A manual column click
    // still overrides within the tab; this only sets the default on each tab switch.
    setSortKey('signalScore');
    setSortDir(dir === 'BEARISH' ? 'asc' : 'desc');
    setFilters((prev) => {
      const next = { ...prev };
      if (dir === 'ALL') delete next.signalDirection;
      else next.signalDirection = dir;
      // Setups are direction-specific — reset when the direction changes.
      delete next.setup;
      return next;
    });
  };

  const handleSetupChange = (_e: SyntheticEvent, value: ScreenerSetup | '') => {
    setPage(0);
    // Default the sort to the tab's primary evidence. Smart-money setups rank by the smart-money
    // score (itself directional: high = accumulation → DESC, low = distribution → ASC); every
    // other setup falls back to the direction-aware signal-score default. Mirrors the backend's
    // setup-aware ORDER BY so the client re-sort doesn't undo it. A manual column click still
    // overrides within the tab; this only sets the default when the sub-tab changes.
    if (value === 'SMART_MONEY_ACCUMULATION' || value === 'SMART_MONEY_DISTRIBUTION') {
      setSortKey('smartMoneyScore');
      setSortDir(value === 'SMART_MONEY_DISTRIBUTION' ? 'asc' : 'desc');
    } else {
      setSortKey('signalScore');
      setSortDir(directionTab === 'BEARISH' ? 'asc' : 'desc');
    }
    setFilters((prev) => {
      const next = { ...prev };
      if (value) next.setup = value;
      else delete next.setup;
      return next;
    });
  };

  return (
    <>
      {/* Direction selector + setup sub-tabs — drive signalDirection / setup; other filters
          (sector, cap, score, RS, delivery, F&O) compose within the active tab. */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: setupOptions.length > 0 ? 0 : 2 }}>
        <Tabs value={directionTab} onChange={handleDirectionChange} aria-label="Signal direction">
          <Tab label="All" value="ALL" />
          <Tab label="Bullish" value="BULLISH" />
          <Tab label="Bearish" value="BEARISH" />
        </Tabs>
      </Box>
      {setupOptions.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Tabs
            value={filters.setup ?? ''}
            onChange={handleSetupChange}
            variant="scrollable"
            scrollButtons="auto"
            aria-label="Trade setup"
            sx={{ minHeight: 40 }}
          >
            {/* Tooltip wraps the label (not the Tab): MUI Tabs requires Tab as a direct child to
                propagate selection/indicator state, so the hover target is the label content.
                `describeChild` makes the tooltip DESCRIBE the tab (aria-describedby) rather than
                relabel it — the tab keeps its short label as its accessible name. */}
            <Tab
              label={
                <Tooltip describeChild title={ALL_DIRECTION_DESCRIPTION[directionTab === 'BULLISH' ? 'BULLISH' : 'BEARISH']}>
                  <span>{directionTab === 'BULLISH' ? 'All Bullish' : 'All Bearish'}</span>
                </Tooltip>
              }
              value=""
              sx={{ minHeight: 40 }}
            />
            {setupOptions.map((o) => (
              <Tab
                key={o.code}
                label={
                  <Tooltip describeChild title={o.description}>
                    <span>{o.label}</span>
                  </Tooltip>
                }
                value={o.code}
                sx={{ minHeight: 40 }}
              />
            ))}
          </Tabs>
        </Box>
      )}
    </>
  );
}
