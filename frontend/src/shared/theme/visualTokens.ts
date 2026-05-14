import type { ThemeOptions } from '@mui/material/styles';

export type ThemeMode = 'light' | 'dark';

export type TypographyScale = {
  workspaceTitle: { fontSize: number; lineHeight: number; fontWeight: number };
  sectionTitle: { fontSize: number; lineHeight: number; fontWeight: number };
  panelTitle: { fontSize: number; lineHeight: number; fontWeight: number };
  body: { fontSize: number; lineHeight: number; fontWeight: number };
  meta: { fontSize: number; lineHeight: number; fontWeight: number };
  tableBody: { fontSize: number; lineHeight: number; fontWeight: number };
  tableHeader: { fontSize: number; lineHeight: number; fontWeight: number };
};

export type DensityScale = {
  spacingUnit: number;
  compactSectionGap: number;
  standardSectionGap: number;
  controlHeight: number;
  compactControlHeight: number;
};

export type ContainerTiers = {
  hub: number;
  workspace: number;
  detail: number;
};

export type VisualTokens = {
  typography: TypographyScale;
  density: DensityScale;
  containerTiers: ContainerTiers;
};

declare module '@mui/material/styles' {
  interface Theme {
    visualTokens: VisualTokens;
  }
  interface ThemeOptions {
    visualTokens?: VisualTokens;
  }
}

const typography: TypographyScale = {
  workspaceTitle: { fontSize: 28, lineHeight: 34 / 28, fontWeight: 600 },
  sectionTitle: { fontSize: 20, lineHeight: 28 / 20, fontWeight: 600 },
  panelTitle: { fontSize: 16, lineHeight: 24 / 16, fontWeight: 600 },
  body: { fontSize: 14, lineHeight: 20 / 14, fontWeight: 400 },
  meta: { fontSize: 12, lineHeight: 18 / 12, fontWeight: 400 },
  tableBody: { fontSize: 13, lineHeight: 18 / 13, fontWeight: 400 },
  tableHeader: { fontSize: 12, lineHeight: 16 / 12, fontWeight: 600 },
};

const density: DensityScale = {
  spacingUnit: 8,
  compactSectionGap: 16,
  standardSectionGap: 24,
  controlHeight: 36,
  compactControlHeight: 32,
};

const containerTiers: ContainerTiers = {
  hub: 1600,
  workspace: 1500,
  detail: 1200,
};

export const visualTokens: VisualTokens = {
  typography,
  density,
  containerTiers,
};

export function createVisualThemeOptions(mode: ThemeMode): ThemeOptions {
  const isDark = mode === 'dark';

  return {
    visualTokens,
    spacing: density.spacingUnit,
    shape: { borderRadius: 8 },
    palette: {
      mode,
      primary: {
        main: isDark ? '#66a7ff' : '#1d4ed8',
        dark: isDark ? '#3b82f6' : '#1e40af',
        light: isDark ? '#93c5fd' : '#60a5fa',
        contrastText: '#ffffff',
      },
      success: {
        main: isDark ? '#22c55e' : '#15803d',
        dark: isDark ? '#16a34a' : '#166534',
        light: isDark ? '#4ade80' : '#22c55e',
        contrastText: '#ffffff',
      },
      warning: {
        main: isDark ? '#f59e0b' : '#b45309',
        dark: isDark ? '#d97706' : '#92400e',
        light: isDark ? '#fbbf24' : '#d97706',
        contrastText: '#111827',
      },
      error: {
        main: isDark ? '#ef4444' : '#b91c1c',
        dark: isDark ? '#dc2626' : '#991b1b',
        light: isDark ? '#f87171' : '#ef4444',
        contrastText: '#ffffff',
      },
      background: {
        default: isDark ? '#0b1220' : '#f4f6fb',
        paper: isDark ? '#131b2b' : '#ffffff',
      },
      text: {
        primary: isDark ? '#f3f6ff' : '#0f172a',
        secondary: isDark ? '#c6d1e6' : '#334155',
      },
      divider: isDark ? '#263244' : '#d6deec',
    },
    typography: {
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif",
      fontSize: typography.body.fontSize,
      h4: {
        fontSize: `${typography.workspaceTitle.fontSize}px`,
        lineHeight: typography.workspaceTitle.lineHeight,
        fontWeight: typography.workspaceTitle.fontWeight,
        letterSpacing: 0,
      },
      h5: {
        fontSize: `${typography.sectionTitle.fontSize}px`,
        lineHeight: typography.sectionTitle.lineHeight,
        fontWeight: typography.sectionTitle.fontWeight,
        letterSpacing: 0,
      },
      h6: {
        fontSize: `${typography.panelTitle.fontSize}px`,
        lineHeight: typography.panelTitle.lineHeight,
        fontWeight: typography.panelTitle.fontWeight,
        letterSpacing: 0,
      },
      subtitle1: {
        fontSize: `${typography.body.fontSize}px`,
        lineHeight: typography.body.lineHeight,
        fontWeight: typography.body.fontWeight,
        letterSpacing: 0,
      },
      body1: {
        fontSize: `${typography.body.fontSize}px`,
        lineHeight: typography.body.lineHeight,
        fontWeight: typography.body.fontWeight,
        letterSpacing: 0,
      },
      body2: {
        fontSize: `${typography.tableBody.fontSize}px`,
        lineHeight: typography.tableBody.lineHeight,
        fontWeight: typography.tableBody.fontWeight,
        letterSpacing: 0,
      },
      caption: {
        fontSize: `${typography.meta.fontSize}px`,
        lineHeight: typography.meta.lineHeight,
        fontWeight: typography.meta.fontWeight,
        letterSpacing: 0,
      },
      overline: {
        fontSize: `${typography.meta.fontSize}px`,
        lineHeight: typography.meta.lineHeight,
        fontWeight: 600,
        letterSpacing: 0,
        textTransform: 'none',
      },
      button: {
        textTransform: 'none',
        letterSpacing: 0,
        fontWeight: 600,
      },
    },
  };
}
