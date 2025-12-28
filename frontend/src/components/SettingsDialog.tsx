import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Typography,
  Box,
  ToggleButtonGroup,
  ToggleButton,
  Divider,
  Stack,
  Tabs,
  Tab,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Slider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  CircularProgress,
} from '@mui/material';
import {
  Close as CloseIcon,
  LightMode,
  DarkMode,
  SettingsBrightness,
  Palette as AppIcon,
  Translate as TranslationIcon,
  ExpandMore as ExpandMoreIcon,
  Tune as TuneIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../stores/settingsStore';
import { useThemeStore, type ThemeMode } from '../stores/themeStore';

// ============================================
// Tab Panel
// ============================================

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div role='tabpanel' hidden={value !== index}>
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

// ============================================
// Settings Dialog
// ============================================

export default function SettingsDialog() {
  const { t, i18n } = useTranslation();
  const { isOpen, closeSettings, initialTab, translationProps } = useSettingsStore();
  const { mode: themeMode, setMode: setThemeMode } = useThemeStore();

  // 탭 상태
  const [tabIndex, setTabIndex] = useState(0);

  // 번역 설정 상태
  const [model, setModel] = useState('gemini-2.5-flash');
  const [chunkSize, setChunkSize] = useState(2000);
  const [temperature, setTemperature] = useState(1.0);
  const [maxOutputTokens, setMaxOutputTokens] = useState<number | undefined>(32000);
  const [topP, setTopP] = useState<number | undefined>(undefined);
  const [topK, setTopK] = useState<number | undefined>(undefined);
  const [advancedExpanded, setAdvancedExpanded] = useState(false);
  const [saving, setSaving] = useState(false);

  // 다이얼로그가 열릴 때 초기 탭 설정
  useEffect(() => {
    if (isOpen) {
      setTabIndex(initialTab);
    }
  }, [isOpen, initialTab]);

  // 번역 설정 초기화
  useEffect(() => {
    if (isOpen && translationProps?.config) {
      const config = translationProps.config;
      setModel(config.model);
      setChunkSize(config.chunkSize);
      setTemperature(config.temperature ?? 1.0);
      setMaxOutputTokens(config.maxOutputTokens ?? undefined);
      setTopP(config.topP ?? undefined);
      setTopK(config.topK ?? undefined);
    }
  }, [isOpen, translationProps?.config]);

  // 모델 목록 로드
  useEffect(() => {
    if (isOpen && tabIndex === 1 && translationProps) {
      const { models, modelsLoading, onLoadModels } = translationProps;
      if (models.length === 0 && !modelsLoading) {
        onLoadModels();
      }
    }
  }, [isOpen, tabIndex, translationProps]);

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

  const handleSaveTranslationSettings = async () => {
    if (!translationProps?.onSave) return;
    setSaving(true);
    try {
      await translationProps.onSave({
        model,
        chunkSize,
        temperature,
        maxOutputTokens,
        topP,
        topK,
      });
      closeSettings();
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    closeSettings();
    // 다이얼로그 닫을 때 초기화
    setAdvancedExpanded(false);
  };

  // 선택된 모델 정보
  const selectedModel = translationProps?.models.find(m => m.id === model);

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      maxWidth='sm'
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          minHeight: 400,
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
        <IconButton edge='end' color='inherit' onClick={handleClose} aria-label='close' size='small'>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}>
        <Tabs value={tabIndex} onChange={(_, v) => setTabIndex(v)}>
          <Tab icon={<AppIcon />} iconPosition='start' label={t('settings.tabs.app')} sx={{ minHeight: 48 }} />
          <Tab icon={<TranslationIcon />} iconPosition='start' label={t('settings.tabs.translation')} sx={{ minHeight: 48 }} />
        </Tabs>
      </Box>

      <DialogContent sx={{ pt: 0 }}>
        {/* 앱 설정 탭 */}
        <TabPanel value={tabIndex} index={0}>
          <Stack spacing={3}>
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
        </TabPanel>

        {/* 번역 설정 탭 */}
        <TabPanel value={tabIndex} index={1}>
          {translationProps ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* 모델 선택 */}
              <FormControl fullWidth>
                <InputLabel>{t('translation.model')}</InputLabel>
                <Select
                  value={model}
                  label={t('translation.model')}
                  onChange={e => setModel(e.target.value)}
                  disabled={translationProps.modelsLoading}
                  startAdornment={translationProps.modelsLoading ? <CircularProgress size={20} sx={{ mr: 1 }} /> : undefined}
                >
                  {translationProps.models.map(m => (
                    <MenuItem key={m.id} value={m.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {m.name}
                        {m.isExperimental && (
                          <Chip label='Experimental' size='small' color='warning' sx={{ height: 20, fontSize: '0.7rem' }} />
                        )}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* 청크 크기 */}
              <Box>
                <Typography variant='subtitle2' gutterBottom>
                  {t('translation.chunkSize')}: {chunkSize.toLocaleString()} {t('translation.characters')}
                </Typography>
                <Typography variant='caption' color='text.secondary' gutterBottom sx={{ display: 'block', mb: 2 }}>
                  {t('translation.chunkSizeHelp')}
                </Typography>
                <Slider
                  value={chunkSize}
                  onChange={(_, value) => setChunkSize(value as number)}
                  min={500}
                  max={5000}
                  step={100}
                  marks={[
                    { value: 500, label: '500' },
                    { value: 2000, label: '2000' },
                    { value: 5000, label: '5000' },
                  ]}
                  valueLabelDisplay='auto'
                />
              </Box>

              {/* 고급 설정 */}
              <Accordion expanded={advancedExpanded} onChange={(_, exp) => setAdvancedExpanded(exp)}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TuneIcon fontSize='small' />
                    <Typography>{t('translation.advancedSettings')}</Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {/* Temperature */}
                    <Box>
                      <Typography variant='subtitle2' gutterBottom>
                        {t('translation.temperature')}: {temperature.toFixed(2)}
                      </Typography>
                      <Typography variant='caption' color='text.secondary' gutterBottom sx={{ display: 'block', mb: 2 }}>
                        {t('translation.temperatureHelp')}
                      </Typography>
                      <Slider
                        value={temperature}
                        onChange={(_, value) => setTemperature(value as number)}
                        min={0}
                        max={2}
                        step={0.05}
                        marks={[
                          { value: 0, label: '0' },
                          { value: 1, label: '1' },
                          { value: 2, label: '2' },
                        ]}
                        valueLabelDisplay='auto'
                      />
                    </Box>

                    {/* Max Output Tokens */}
                    <TextField
                      label={t('translation.maxOutputTokens')}
                      type='number'
                      value={maxOutputTokens ?? ''}
                      onChange={e => {
                        const val = e.target.value;
                        setMaxOutputTokens(val ? parseInt(val, 10) : undefined);
                      }}
                      helperText={t('translation.maxOutputTokensHelp')}
                      fullWidth
                      InputProps={{
                        inputProps: { min: 1, max: selectedModel?.maxOutputTokens ?? 65536 },
                      }}
                    />

                    {/* Top-P */}
                    <Box>
                      <Typography variant='subtitle2' gutterBottom>
                        Top-P: {topP?.toFixed(2) ?? t('translation.default')}
                      </Typography>
                      <Typography variant='caption' color='text.secondary' gutterBottom sx={{ display: 'block', mb: 2 }}>
                        {t('translation.topPHelp')}
                      </Typography>
                      <Slider
                        value={topP ?? 0.95}
                        onChange={(_, value) => setTopP(value as number)}
                        min={0}
                        max={1}
                        step={0.01}
                        marks={[
                          { value: 0, label: '0' },
                          { value: 0.5, label: '0.5' },
                          { value: 1, label: '1' },
                        ]}
                        valueLabelDisplay='auto'
                        disabled={topP === undefined}
                      />
                      <Button size='small' onClick={() => setTopP(topP === undefined ? 0.95 : undefined)} sx={{ mt: 1 }}>
                        {topP === undefined ? t('translation.enable') : t('translation.useDefault')}
                      </Button>
                    </Box>

                    {/* Top-K */}
                    <TextField
                      label='Top-K'
                      type='number'
                      value={topK ?? ''}
                      onChange={e => {
                        const val = e.target.value;
                        setTopK(val ? parseInt(val, 10) : undefined);
                      }}
                      helperText={t('translation.topKHelp')}
                      fullWidth
                      InputProps={{
                        inputProps: { min: 1, max: 100 },
                      }}
                    />
                  </Box>
                </AccordionDetails>
              </Accordion>
            </Box>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
              <Typography>{t('settings.translationNotAvailable')}</Typography>
            </Box>
          )}
        </TabPanel>
      </DialogContent>

      {/* 번역 설정 탭일 때만 저장 버튼 표시 */}
      {tabIndex === 1 && translationProps && (
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button variant='contained' onClick={handleSaveTranslationSettings} disabled={saving}>
            {t('common.save')}
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
}
