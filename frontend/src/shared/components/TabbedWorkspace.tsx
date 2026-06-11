import { useState, type ReactNode, type SyntheticEvent } from 'react';
import { Box, Tab, Tabs } from '@mui/material';

export interface WorkspaceTab {
  /** Tab label shown in the tab strip. */
  label: string;
  /** Lazily-rendered tab content. Only the active tab is mounted (so each sub-page
   *  fetches its own data only when viewed — no loading the whole cluster at once). */
  render: () => ReactNode;
}

/**
 * Lightweight tabbed container used to merge several previously-separate nav screens into a
 * single workspace (e.g. Market = Health/Sectors/Events). It renders ONLY the active tab so the
 * merge does not multiply data fetches. Each embedded page keeps its own header/loading/state.
 */
export function TabbedWorkspace({ tabs, ariaLabel }: { tabs: WorkspaceTab[]; ariaLabel?: string }) {
  const [active, setActive] = useState(0);
  const handleChange = (_event: SyntheticEvent, value: number) => setActive(value);
  const current = tabs[active] ?? tabs[0];

  return (
    <Box>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', px: { xs: 1, md: 2 } }}>
        <Tabs
          value={active}
          onChange={handleChange}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          aria-label={ariaLabel}
        >
          {tabs.map((tab, index) => (
            <Tab key={tab.label} label={tab.label} id={`workspace-tab-${index}`} aria-controls={`workspace-panel-${index}`} />
          ))}
        </Tabs>
      </Box>
      <Box role="tabpanel" id={`workspace-panel-${active}`} aria-labelledby={`workspace-tab-${active}`}>
        {current?.render()}
      </Box>
    </Box>
  );
}

export default TabbedWorkspace;
