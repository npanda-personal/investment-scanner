/**
 * workspaceSourceListStore — carries the "source list" (the instrument list a user
 * clicked from) into the Stock Workspace so the Chart tab's rail can render it.
 *
 * Set at click time by StockWorkspaceLink; read by SourceListRail. Persisted to
 * sessionStorage so the rail survives a page refresh / direct re-render, and is scoped
 * to the browser session (not localStorage — the "list you came from" is session state,
 * not a durable preference).
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { StockListItem } from './types';

interface WorkspaceSourceListState {
  label: string;
  items: StockListItem[];
  setSource: (label: string, items: StockListItem[]) => void;
  clearSource: () => void;
}

export const useWorkspaceSourceListStore = create<WorkspaceSourceListState>()(
  persist(
    (set) => ({
      label: '',
      items: [],
      setSource: (label, items) => set({ label, items }),
      clearSource: () => set({ label: '', items: [] }),
    }),
    {
      name: 'workspace_source_list',
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);
