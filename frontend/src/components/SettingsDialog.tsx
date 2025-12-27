import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Box,
  ToggleButtonGroup,
  ToggleButton,
  Divider,
  Stack,
} from '@mui/material';
import { Close as CloseIcon, LightMode, DarkMode, SettingsBrightness } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../stores/settingsStore';
import { useThemeStore, type ThemeMode } from '../stores/themeStore';

export default function SettingsDialog() {
  const { t, i18n } = useTranslation();
  const { isOpen, closeSettings } = useSettingsStore();
  const { mode: themeMode, setMode: setThemeMode } = useThemeStore();

  const handleThemeChange = (_event: React.MouseEvent<HTMLElement>, newMode: ThemeMode | null) => {
    if (newMode !== null) {
      setThemeMode(newMode);
    }
  };

  const handleLanguageChange = (_event: React.MouseEvent<HTMLElement>, newLang: string | null) => {
    if (newLang !== null) {
      i18n.changeLanguage(newLang);
      localStorage.setItem('language', newLang);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={closeSettings}
      maxWidth='sm'
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 1,
        }}
      >
        <Typography variant='h6' component='div'>
          {t('settings.title')}
        </Typography>
        <IconButton edge='end' color='inherit' onClick={closeSettings} aria-label='close' size='small'>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={3} sx={{ py: 1 }}>
          {/* 테마 설정 */}
          <Box>
            <Typography variant='subtitle2' gutterBottom sx={{ fontWeight: 600 }}>
              {t('settings.theme.title')}
            </Typography>
            <ToggleButtonGroup value={themeMode} exclusive onChange={handleThemeChange} fullWidth size='medium' sx={{ mt: 1.5 }}>
              <ToggleButton value='light' aria-label='light mode'>
                <LightMode sx={{ mr: 1 }} />
                {t('settings.theme.light')}
              </ToggleButton>
              <ToggleButton value='dark' aria-label='dark mode'>
                <DarkMode sx={{ mr: 1 }} />
                {t('settings.theme.dark')}
              </ToggleButton>
              <ToggleButton value='system' aria-label='system mode'>
                <SettingsBrightness sx={{ mr: 1 }} />
                {t('settings.theme.system')}
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <Divider />

          {/* 언어 설정 */}
          <Box>
            <Typography variant='subtitle2' gutterBottom sx={{ fontWeight: 600 }}>
              {t('settings.language.title')}
            </Typography>
            <ToggleButtonGroup value={i18n.language} exclusive onChange={handleLanguageChange} fullWidth size='medium' sx={{ mt: 1.5 }}>
              <ToggleButton value='ko' aria-label='korean'>
                {t('settings.language.ko')}
              </ToggleButton>
              <ToggleButton value='en' aria-label='english'>
                {t('settings.language.en')}
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
