import { alpha } from '@mui/material/styles';
import type { Components, Theme } from '@mui/material/styles';

export function createComponentOverrides(theme: Theme): Components<Theme> {
  return {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          letterSpacing: 0,
        },
      },
    },
    MuiPaper: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          minHeight: theme.visualTokens.density.controlHeight,
          borderRadius: 8,
        },
        sizeSmall: {
          minHeight: theme.visualTokens.density.compactControlHeight,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 600,
        },
        sizeSmall: {
          fontSize: `${theme.visualTokens.typography.meta.fontSize}px`,
          height: 24,
        },
      },
    },
    MuiTableContainer: {
      styleOverrides: {
        root: {
          overflowX: 'auto',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: theme.palette.divider,
          fontSize: `${theme.visualTokens.typography.tableBody.fontSize}px`,
          lineHeight: theme.visualTokens.typography.tableBody.lineHeight,
          letterSpacing: 0,
          paddingTop: 10,
          paddingBottom: 10,
        },
        head: {
          backgroundColor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.16 : 0.08),
          color: theme.palette.text.primary,
          fontSize: `${theme.visualTokens.typography.tableHeader.fontSize}px`,
          lineHeight: theme.visualTokens.typography.tableHeader.lineHeight,
          fontWeight: theme.visualTokens.typography.tableHeader.fontWeight,
          letterSpacing: 0,
          textTransform: 'none',
        },
      },
    },
    MuiTablePagination: {
      styleOverrides: {
        toolbar: {
          minHeight: 46,
        },
        selectLabel: {
          fontSize: `${theme.visualTokens.typography.meta.fontSize}px`,
        },
        displayedRows: {
          fontSize: `${theme.visualTokens.typography.meta.fontSize}px`,
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&.MuiTableRow-hover:hover': {
            backgroundColor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.16 : 0.07),
          },
        },
      },
    },
  };
}
