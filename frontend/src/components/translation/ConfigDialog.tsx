import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  CircularProgress,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import TuneIcon from '@mui/icons-material/Tune';
import type { TranslationConfig, GeminiModelInfo, UpdateTranslationConfigRequest } from '@languageforest/sharedtype';

// ============================================
// Props
// ============================================

interface ConfigDialogProps {
  open: boolean;
  config: TranslationConfig | null;
  models: GeminiModelInfo[];
  modelsLoading: boolean;
  onClose: () => void;
  onSave: (data: UpdateTranslationConfigRequest) => Promise<void>;
  onLoadModels: () => Promise<void>;
}

// ============================================
// 설정 다이얼로그
// ============================================

export default function ConfigDialog({
  open,
  config,
  models,
  modelsLoading,
  onClose,
  onSave,
  onLoadModels,
}: ConfigDialogProps) {
  const { t } = useTranslation();

  // 기본 설정
  const [model, setModel] = useState('gemini-2.5-flash');
  const [chunkSize, setChunkSize] = useState(2000);

  // GenerationConfig
  const [temperature, setTemperature] = useState(1.0);
  const [maxOutputTokens, setMaxOutputTokens] = useState<number | undefined>(32000);
  const [topP, setTopP] = useState<number | undefined>(undefined);
  const [topK, setTopK] = useState<number | undefined>(undefined);

  const [loading, setLoading] = useState(false);
  const [advancedExpanded, setAdvancedExpanded] = useState(false);

  // 모델 목록 로드
  useEffect(() => {
    if (open && models.length === 0 && !modelsLoading) {
      onLoadModels();
    }
  }, [open, models.length, modelsLoading, onLoadModels]);

  // 설정 초기화
  useEffect(() => {
    if (open && config) {
      setModel(config.model);
      setChunkSize(config.chunkSize);
      setTemperature(config.temperature ?? 1.0);
      setMaxOutputTokens(config.maxOutputTokens ?? undefined);
      setTopP(config.topP ?? undefined);
      setTopK(config.topK ?? undefined);
    }
  }, [open, config]);

  // 선택된 모델 정보
  const selectedModel = models.find(m => m.id === model);

  const handleSave = async () => {
    setLoading(true);
    try {
      await onSave({
        model,
        chunkSize,
        temperature,
        maxOutputTokens,
        topP,
        topK,
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth='sm' fullWidth>
      <DialogTitle>{t('translation.settings')}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
          {/* 모델 선택 */}
          <FormControl fullWidth>
            <InputLabel>{t('translation.model')}</InputLabel>
            <Select
              value={model}
              label={t('translation.model')}
              onChange={e => setModel(e.target.value)}
              disabled={modelsLoading}
              startAdornment={modelsLoading ? <CircularProgress size={20} sx={{ mr: 1 }} /> : undefined}
            >
              {models.map(m => (
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

          {/* 고급 설정 (GenerationConfig) */}
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
                  <Button
                    size='small'
                    onClick={() => setTopP(topP === undefined ? 0.95 : undefined)}
                    sx={{ mt: 1 }}
                  >
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
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={loading}>
          {t('common.cancel')}
        </Button>
        <Button variant='contained' onClick={handleSave} disabled={loading}>
          {t('common.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
