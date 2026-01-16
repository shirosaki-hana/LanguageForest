import { useEffect } from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { useThemeStore } from './stores/themeStore';
import App from './App';
import { createAppTheme } from './theme/createAppTheme';

export function ThemedApp() {
  const { effectiveMode } = useThemeStore();
  const theme = createAppTheme(effectiveMode);

  // 테마 변경 시 body 배경색도 업데이트
  useEffect(() => {
    document.body.style.backgroundColor = theme.palette.background.default;
  }, [theme.palette.background.default]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  );
}
