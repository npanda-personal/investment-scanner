import React, { createContext, useContext, useMemo, useState } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

type ThemeMode = 'light' | 'dark';

interface ThemeContextValue {
  themeMode: ThemeMode;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const CustomThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');
  const theme = useMemo(() => createTheme({ palette: { mode: themeMode } }), [themeMode]);

  const value = useMemo(() => ({
    themeMode,
    toggleTheme: () => setThemeMode((mode) => mode === 'light' ? 'dark' : 'light'),
  }), [themeMode]);

  return (
    <ThemeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
};

export function useThemeMode() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useThemeMode must be used within CustomThemeProvider');
  return context;
}

