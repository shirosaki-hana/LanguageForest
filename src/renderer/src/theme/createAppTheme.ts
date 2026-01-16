import { createTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';

// ============================================
// MUI 테마 타입 확장
// ============================================

// 상태별 배경색 타입 정의
interface StateBackground {
  subtle: string; // 0.03 - 매우 미세한 배경
  light: string; // 0.08 - 기본 배경
  medium: string; // 0.12 - 선택/호버 상태
  strong: string; // 0.18 - 강조 상태
}

declare module '@mui/material/styles' {
  interface Theme {
    custom: {
      gradient: {
        primary: string;
        primaryHover: string;
        // 프로그레스바용 수평 그라디언트
        progress: string;
      };
      glassmorphism: {
        light: string;
        medium: string;
        heavy: string;
      };
      subtle: {
        background: string;
        hover: string;
      };
      // 상태별 투명 배경색
      stateBackground: {
        primary: StateBackground;
        secondary: StateBackground;
        success: StateBackground;
        error: StateBackground;
        warning: StateBackground;
        info: StateBackground;
      };
    };
  }
  interface ThemeOptions {
    custom?: {
      gradient?: {
        primary?: string;
        primaryHover?: string;
        progress?: string;
      };
      glassmorphism?: {
        light?: string;
        medium?: string;
        heavy?: string;
      };
      subtle?: {
        background?: string;
        hover?: string;
      };
      stateBackground?: {
        primary?: Partial<StateBackground>;
        secondary?: Partial<StateBackground>;
        success?: Partial<StateBackground>;
        error?: Partial<StateBackground>;
        warning?: Partial<StateBackground>;
        info?: Partial<StateBackground>;
      };
    };
  }
}

// ============================================
// 기본 색상 상수 정의
// ============================================
const colors = {
  // Primary 계열 (Forest Green)
  primary: {
    light: { main: '#1b5e20', light: '#2e7d32', dark: '#0b3d1a' },
    dark: { main: '#4ade80', light: '#86efac', dark: '#22c55e' },
  },
  // Secondary 계열 (Wood / Amber)
  secondary: {
    light: { main: '#b45309', light: '#d97706', dark: '#92400e' },
    dark: { main: '#f59e0b', light: '#fbbf24', dark: '#b45309' },
  },
  // Success (Emerald)
  success: {
    light: '#10b981',
    dark: '#34d399',
  },
  // Error (Red)
  error: {
    light: '#ef4444',
    dark: '#f87171',
  },
  // Warning (Amber)
  warning: {
    light: '#f59e0b',
    dark: '#fbbf24',
  },
  // Info (Blue)
  info: {
    light: '#3b82f6',
    dark: '#60a5fa',
  },
  // 다크모드 기본 배경색
  darkBase: 'rgb(7,19,13)',
} as const;

// 상태별 배경색 생성 헬퍼
function createStateBackground(color: string): StateBackground {
  return {
    subtle: alpha(color, 0.03),
    light: alpha(color, 0.08),
    medium: alpha(color, 0.12),
    strong: alpha(color, 0.18),
  };
}

export function createAppTheme(mode: 'light' | 'dark') {
  const primary = colors.primary[mode];
  const secondary = colors.secondary[mode];
  const success = colors.success[mode];
  const error = colors.error[mode];
  const warning = colors.warning[mode];
  const info = colors.info[mode];

  return createTheme({
    palette: {
      mode,
      primary: {
        main: primary.main,
        light: primary.light,
        dark: primary.dark,
      },
      secondary: {
        main: secondary.main,
        light: secondary.light,
        dark: secondary.dark,
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
        default: mode === 'light' ? '#f6fbf6' : '#07130d',
        paper: mode === 'light' ? 'rgba(255,255,255,0.68)' : 'rgba(7,19,13,0.55)',
      },
      text: {
        primary: mode === 'light' ? '#0f172a' : '#e2e8f0',
        secondary: mode === 'light' ? '#64748b' : '#94a3b8',
      },
      divider: mode === 'light' ? 'rgba(2,6,23,0.08)' : 'rgba(148,163,184,0.16)',
    },
    // 커스텀 색상 정의
    custom: {
      // 그라디언트 (Primary → Secondary)
      gradient: {
        primary: `linear-gradient(135deg, ${primary.main}, ${secondary.main})`,
        primaryHover: `linear-gradient(135deg, ${primary.dark}, ${secondary.dark})`,
        // 프로그레스바용 (Primary → Success)
        progress: `linear-gradient(90deg, ${primary.main}, ${success})`,
      },
      // 글래스모피즘 배경 (투명도 변형)
      glassmorphism: {
        light: mode === 'light' ? 'rgba(255,255,255,0.7)' : 'rgba(7,19,13,0.55)',
        medium: mode === 'light' ? 'rgba(255,255,255,0.8)' : 'rgba(7,19,13,0.7)',
        heavy: mode === 'light' ? 'rgba(255,255,255,0.9)' : 'rgba(7,19,13,0.85)',
      },
      // 미세한 구분용 배경
      subtle: {
        background: mode === 'light' ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)',
        hover: mode === 'light' ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)',
      },
      // 상태별 투명 배경색
      stateBackground: {
        primary: createStateBackground(primary.main),
        secondary: createStateBackground(secondary.main),
        success: createStateBackground(success),
        error: createStateBackground(error),
        warning: createStateBackground(warning),
        info: createStateBackground(info),
      },
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
                ? `radial-gradient(40rem 40rem at -10% -20%, ${alpha(primary.main, 0.1)}, transparent), radial-gradient(50rem 40rem at 120% -10%, ${alpha(secondary.main, 0.1)}, transparent)`
                : `radial-gradient(40rem 40rem at -10% -20%, ${alpha(primary.main, 0.18)}, transparent), radial-gradient(50rem 40rem at 120% -10%, ${alpha(secondary.main, 0.14)}, transparent)`,
            backgroundAttachment: 'fixed',
          },
          '::selection': {
            backgroundColor: alpha(primary.main, mode === 'light' ? 0.22 : 0.28),
          },
          // 스크롤바 스타일 (WebKit 기반 브라우저: Chrome, Safari, Edge)
          '*::-webkit-scrollbar': {
            width: '12px',
            height: '12px',
          },
          '*::-webkit-scrollbar-track': {
            background: mode === 'light' ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.03)',
            borderRadius: '6px',
          },
          '*::-webkit-scrollbar-thumb': {
            background: mode === 'light' ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)',
            borderRadius: '6px',
            border: mode === 'light' ? '2px solid rgba(255,255,255,0.5)' : '2px solid rgba(0,0,0,0.3)',
            transition: 'background 0.2s ease',
          },
          '*::-webkit-scrollbar-thumb:hover': {
            background: mode === 'light' ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.25)',
          },
          '*::-webkit-scrollbar-thumb:active': {
            background: alpha(primary.main, 0.4),
          },
          // Firefox 스크롤바 스타일
          '*': {
            scrollbarWidth: 'thin',
            scrollbarColor: mode === 'light' ? 'rgba(0,0,0,0.15) rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.15) rgba(255,255,255,0.03)',
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
