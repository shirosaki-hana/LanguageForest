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
} from '@mui/material';
import type { TranslationConfig } from '@languageforest/sharedtype';

// ============================================
// Props
// ============================================

interface ConfigDialogProps {
  open: boolean;
  config: TranslationConfig | null;
  onClose: () => void;
  onSave: (data: { model?: string; chunkSize?: number }) => Promise<void>;
}

// ============================================
// 모델 목록
// ============================================

const MODELS = [
  { value: 'gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash (Experimental)' },
  { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
];

// ============================================
// 설정 다이얼로그
// ============================================

export default function ConfigDialog({ open, config, onClose, onSave }: ConfigDialogProps) {
  const { t } = useTranslation();
  const [model, setModel] = useState('gemini-2.0-flash-exp');
  const [chunkSize, setChunkSize] = useState(2000);
  const [loading, setLoading] = useState(false);

  // 설정 초기화
  useEffect(() => {
    if (open && config) {
      setModel(config.model);
      setChunkSize(config.chunkSize);
    }
  }, [open, config]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await onSave({ model, chunkSize });
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
            <Select value={model} label={t('translation.model')} onChange={e => setModel(e.target.value)}>
              {MODELS.map(m => (
                <MenuItem key={m.value} value={m.value}>
                  {m.label}
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
