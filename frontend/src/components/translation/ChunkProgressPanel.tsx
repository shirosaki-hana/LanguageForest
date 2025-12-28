import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Paper, Typography, LinearProgress, Tooltip, IconButton, Chip, alpha, keyframes } from '@mui/material';
import {
  CheckCircle as CompleteIcon,
  Error as ErrorIcon,
  HourglassEmpty as PendingIcon,
  AutorenewRounded as ProcessingIcon,
} from '@mui/icons-material';
import type { TranslationChunk, ProgressInfo } from '@languageforest/sharedtype';

// ============================================
// 애니메이션
// ============================================

const pulseAnimation = keyframes`
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.15); opacity: 0.8; }
  100% { transform: scale(1); opacity: 1; }
`;

const spinAnimation = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

// ============================================
// Props
// ============================================

interface ChunkProgressPanelProps {
  chunks: TranslationChunk[];
  progress: ProgressInfo | null;
  onRetryChunk: (chunkId: string) => void;
}

// ============================================
// 청크 아이콘
// ============================================

interface ChunkIconProps {
  chunk: TranslationChunk;
  onRetry?: () => void;
}

function ChunkIcon({ chunk, onRetry }: ChunkIconProps) {
  const { t } = useTranslation();

  const getIcon = () => {
    switch (chunk.status) {
      case 'completed':
        return <CompleteIcon fontSize='small' sx={{ color: 'success.main' }} />;
      case 'failed':
        return (
          <Tooltip title={t('translation.clickToRetry')}>
            <IconButton
              size='small'
              onClick={onRetry}
              sx={{
                p: 0.25,
                color: 'error.main',
                '&:hover': { bgcolor: alpha('#ef4444', 0.1) },
              }}
            >
              <ErrorIcon fontSize='small' />
            </IconButton>
          </Tooltip>
        );
      case 'processing':
        return (
          <ProcessingIcon
            fontSize='small'
            sx={{
              color: 'primary.main',
              animation: `${spinAnimation} 1s linear infinite`,
            }}
          />
        );
      default:
        return <PendingIcon fontSize='small' sx={{ color: 'text.disabled' }} />;
    }
  };

  const getTooltip = () => {
    const baseInfo = `#${chunk.order + 1}`;
    if (chunk.status === 'completed') {
      const time = chunk.processingTime ? `${(chunk.processingTime / 1000).toFixed(1)}s` : '';
      const tokens = chunk.tokenCount ? `${chunk.tokenCount} tokens` : '';
      const details = [time, tokens].filter(Boolean).join(' · ');
      return details ? `${baseInfo} - ${details}` : baseInfo;
    }
    if (chunk.status === 'failed') {
      return `${baseInfo} - ${chunk.errorMessage || t('translation.failed')}`;
    }
    return baseInfo;
  };

  return (
    <Tooltip title={getTooltip()} arrow>
      <Box
        sx={{
          width: 28,
          height: 28,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 1,
          bgcolor: theme => {
            if (chunk.status === 'completed') return alpha(theme.palette.success.main, 0.1);
            if (chunk.status === 'failed') return alpha(theme.palette.error.main, 0.1);
            if (chunk.status === 'processing') return alpha(theme.palette.primary.main, 0.1);
            return 'action.hover';
          },
          animation: chunk.status === 'processing' ? `${pulseAnimation} 1.5s ease-in-out infinite` : 'none',
        }}
      >
        {getIcon()}
      </Box>
    </Tooltip>
  );
}

// ============================================
// 청크 진행 패널
// ============================================

export default function ChunkProgressPanel({ chunks, progress, onRetryChunk }: ChunkProgressPanelProps) {
  const { t } = useTranslation();

  // 예상 남은 시간 계산
  const estimatedTime = useMemo(() => {
    if (!progress || progress.total === 0) return null;

    const completed = chunks.filter(c => c.status === 'completed');
    if (completed.length === 0) return null;

    const avgTime = completed.reduce((sum, c) => sum + (c.processingTime || 0), 0) / completed.length;
    const remaining = progress.pending;
    const estimatedMs = avgTime * remaining;

    if (estimatedMs < 60000) {
      return t('translation.estimatedSeconds', { count: Math.ceil(estimatedMs / 1000) });
    }
    return t('translation.estimatedMinutes', { count: Math.ceil(estimatedMs / 60000) });
  }, [chunks, progress, t]);

  if (chunks.length === 0) {
    return null;
  }

  const percent = progress?.percent || 0;

  return (
    <Paper elevation={0} sx={{ p: 2 }}>
      {/* 헤더 */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant='subtitle2' fontWeight={600}>
          {t('translation.chunkProgress')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip
            size='small'
            label={t('translation.completed')}
            icon={<CompleteIcon sx={{ fontSize: 14 }} />}
            color='success'
            variant='outlined'
          />
          <Chip size='small' label={progress?.completed || 0} />
          {(progress?.failed || 0) > 0 && (
            <Chip size='small' label={`${progress?.failed} ${t('translation.failed')}`} color='error' variant='outlined' />
          )}
        </Box>
      </Box>

      {/* 프로그레스 바 */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant='caption' color='text.secondary'>
            {progress?.completed || 0} / {progress?.total || chunks.length} {t('translation.chunks')}
          </Typography>
          <Typography variant='caption' fontWeight={600}>
            {percent}%
          </Typography>
        </Box>
        <LinearProgress
          variant='determinate'
          value={percent}
          sx={{
            height: 8,
            borderRadius: 4,
            bgcolor: 'action.hover',
            '& .MuiLinearProgress-bar': {
              borderRadius: 4,
              background: theme => `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.success.main})`,
            },
          }}
        />
      </Box>

      {/* 청크 그리드 */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 0.5,
          mb: estimatedTime ? 2 : 0,
        }}
      >
        {chunks.map(chunk => (
          <ChunkIcon key={chunk.id} chunk={chunk} onRetry={chunk.status === 'failed' ? () => onRetryChunk(chunk.id) : undefined} />
        ))}
      </Box>

      {/* 예상 시간 */}
      {estimatedTime && progress && progress.pending > 0 && (
        <Typography variant='caption' color='text.secondary'>
          ⏱️ {t('translation.estimatedRemaining')}: {estimatedTime}
        </Typography>
      )}
    </Paper>
  );
}
