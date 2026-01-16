import { useTranslation } from 'react-i18next';
import { Box, Button, Tooltip, CircularProgress, FormControl, Select, MenuItem, InputLabel } from '@mui/material';
import {
  PlayArrow as StartIcon,
  Pause as PauseIcon,
  Refresh as RetryIcon,
  Settings as SettingsIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import type { TranslationSessionStatus, PromptTemplate } from '@shared/types';

// ============================================
// Props
// ============================================

interface ControlPanelProps {
  sessionStatus: TranslationSessionStatus | null;
  isTranslating: boolean;
  isPaused: boolean;
  hasFile: boolean;
  hasCompletedChunks: boolean;
  hasFailedChunks: boolean;
  templates: PromptTemplate[];
  selectedTemplateId: string | null;
  onSelectTemplate: (id: string) => void;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onRetryFailed: () => void;
  onDownload: () => void;
  onOpenSettings: () => void;
}

// ============================================
// 제어 패널
// ============================================

export default function ControlPanel({
  sessionStatus,
  isTranslating,
  isPaused,
  hasFile,
  hasCompletedChunks,
  hasFailedChunks,
  templates,
  selectedTemplateId,
  onSelectTemplate,
  onStart,
  onPause,
  onResume,
  onRetryFailed,
  onDownload,
  onOpenSettings,
}: ControlPanelProps) {
  const { t } = useTranslation();

  // 시작/재개 버튼 표시 조건
  const canStart =
    !isTranslating && !isPaused && hasFile && (sessionStatus === 'ready' || sessionStatus === 'failed') && selectedTemplateId;
  const canPause = isTranslating && !isPaused;
  const canResume = isPaused && selectedTemplateId;
  const canDownload = hasCompletedChunks && !isTranslating;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
      }}
    >
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        {/* 템플릿 선택 */}
        <FormControl size='small' sx={{ minWidth: 200 }} disabled={isTranslating}>
          <InputLabel id='template-select-label'>{t('translation.template')}</InputLabel>
          <Select
            labelId='template-select-label'
            value={selectedTemplateId || ''}
            label={t('translation.template')}
            onChange={e => onSelectTemplate(e.target.value)}
          >
            {templates.map(template => (
              <MenuItem key={template.id} value={template.id}>
                {template.title} ({template.sourceLanguage} → {template.targetLanguage})
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* 시작 버튼 */}
        {canStart && (
          <Button variant='contained' color='primary' startIcon={<StartIcon />} onClick={onStart} size='large'>
            {t('translation.startTranslation')}
          </Button>
        )}

        {/* 일시정지 버튼 */}
        {canPause && (
          <Button variant='contained' color='warning' startIcon={<PauseIcon />} onClick={onPause} size='large'>
            {t('translation.pause')}
          </Button>
        )}

        {/* 재개 버튼 */}
        {canResume && (
          <Button variant='contained' color='success' startIcon={<StartIcon />} onClick={onResume} size='large'>
            {t('translation.resume')}
          </Button>
        )}

        {/* 번역 중 표시 */}
        {isTranslating && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 2 }}>
            <CircularProgress size={20} />
            <Box sx={{ color: 'text.secondary' }}>{t('translation.translating')}</Box>
          </Box>
        )}

        {/* 실패 청크 재시도 */}
        {hasFailedChunks && !isTranslating && (
          <Button variant='outlined' color='error' startIcon={<RetryIcon />} onClick={onRetryFailed}>
            {t('translation.retryFailed')}
          </Button>
        )}

        {/* 다운로드 버튼 */}
        {canDownload && (
          <Button variant='contained' color='success' startIcon={<DownloadIcon />} onClick={onDownload}>
            {t('translation.download')}
          </Button>
        )}
      </Box>

      {/* 설정 버튼 */}
      <Tooltip title={t('translation.settings')}>
        <Button variant='outlined' color='inherit' onClick={onOpenSettings} sx={{ minWidth: 'auto', px: 1.5 }}>
          <SettingsIcon />
        </Button>
      </Tooltip>
    </Box>
  );
}
