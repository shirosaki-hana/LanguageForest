import { useTranslation } from 'react-i18next';
import { Box, Button, Tooltip, CircularProgress } from '@mui/material';
import { PlayArrow as StartIcon, Pause as PauseIcon, Refresh as RetryIcon, Settings as SettingsIcon } from '@mui/icons-material';
import type { TranslationSessionStatus } from '@languageforest/sharedtype';

// ============================================
// Props
// ============================================

interface ControlPanelProps {
  sessionStatus: TranslationSessionStatus | null;
  isTranslating: boolean;
  isPaused: boolean;
  hasSourceText: boolean;
  hasFailedChunks: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onRetryFailed: () => void;
  onOpenSettings: () => void;
}

// ============================================
// 제어 패널
// ============================================

export default function ControlPanel({
  sessionStatus,
  isTranslating,
  isPaused,
  hasSourceText,
  hasFailedChunks,
  onStart,
  onPause,
  onResume,
  onRetryFailed,
  onOpenSettings,
}: ControlPanelProps) {
  const { t } = useTranslation();

  // 시작/재개 버튼 표시 조건
  const canStart = !isTranslating && !isPaused && hasSourceText && sessionStatus !== 'completed';
  const canPause = isTranslating && !isPaused;
  const canResume = isPaused;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
      }}
    >
      <Box sx={{ display: 'flex', gap: 1 }}>
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
