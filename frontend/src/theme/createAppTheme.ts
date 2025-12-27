import { createTheme } from '@mui/material';

export function createAppTheme(mode: 'light' | 'dark') {
  return createTheme({
    palette: {
      mode,
      primary: {
        main: mode === 'light' ? '#2563eb' : '#3b82f6',
        light: mode === 'light' ? '#3b82f6' : '#60a5fa',
        dark: mode === 'light' ? '#1e40af' : '#1d4ed8',
      },
      secondary: {
        main: mode === 'light' ? '#7c3aed' : '#8b5cf6',
        light: mode === 'light' ? '#8b5cf6' : '#a78bfa',
        dark: mode === 'light' ? '#6d28d9' : '#7c3aed',
      },
      success: {
        main: mode === 'light' ? '#10b981' : '#34d399',
        light: mode === 'light' ? '#34d399' : '#6ee7b7',
        dark: mode === 'light' ? '#059669' : '#10b981',
      },
      error: {
        main: mode === 'light' ? '#ef4444' : '#f87171',
        light: mode === 'light' ? '#f87171' : '#fca5a5',
        dark: mode === 'light' ? '#dc2626' : '#ef4444',
      },
      background: {
        default: mode === 'light' ? '#f8fafc' : '#0b1220',
        paper: mode === 'light' ? 'rgba(255,255,255,0.65)' : 'rgba(2,6,23,0.55)',
      },
      text: {
        primary: mode === 'light' ? '#0f172a' : '#e2e8f0',
        secondary: mode === 'light' ? '#64748b' : '#94a3b8',
      },
      divider: mode === 'light' ? 'rgba(2,6,23,0.08)' : 'rgba(148,163,184,0.16)',
    },
    typography: {
      fontFamily: [
        '-apple-system',
        'BlinkMacSystemFont',
        '"Segoe UI"',
        'Roboto',
        '"Helvetica Neue"',
        'Arial',
        'sans-serif',
        '"Apple Color Emoji"',
        '"Segoe UI Emoji"',
        '"Segoe UI Symbol"',
      ].join(','),
      h1: { fontWeight: 700 },
      h2: { fontWeight: 700 },
      h3: { fontWeight: 600 },
      h4: { fontWeight: 600 },
      h5: { fontWeight: 600 },
      h6: { fontWeight: 600 },
      button: { fontWeight: 600 },
    },
    shape: {
      borderRadius: 12,
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundImage:
              mode === 'light'
                ? 'radial-gradient(40rem 40rem at -10% -20%, rgba(37, 99, 235, 0.08), transparent), radial-gradient(50rem 40rem at 120% -10%, rgba(147, 51, 234, 0.08), transparent)'
                : 'radial-gradient(40rem 40rem at -10% -20%, rgba(37, 99, 235, 0.15), transparent), radial-gradient(50rem 40rem at 120% -10%, rgba(147, 51, 234, 0.12), transparent)',
            backgroundAttachment: 'fixed',
          },
          '::selection': {
            backgroundColor: mode === 'light' ? 'rgba(37,99,235,0.2)' : 'rgba(59,130,246,0.25)',
          },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: 10,
          },
          sizeLarge: { paddingTop: 10, paddingBottom: 10 },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 12,
          },
          input: {
            paddingTop: 14,
            paddingBottom: 14,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            backgroundImage: 'none',
            backdropFilter: 'saturate(160%) blur(12px)',
          },
        },
      },
      MuiAppBar: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backdropFilter: 'saturate(150%) blur(10px)',
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: { borderRadius: 16, backgroundImage: 'none', backdropFilter: 'blur(12px)' },
        },
      },
      MuiToggleButtonGroup: {
        styleOverrides: {
          grouped: { borderRadius: 10 },
        },
      },
    },
  });
}
