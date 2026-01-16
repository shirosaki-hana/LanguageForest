import { useTranslation } from 'react-i18next';
import {
  Box,
  Button,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  CircularProgress,
  Paper,
  Typography,
  useTheme,
} from '@mui/material';
import {
  PlayArrow as StartIcon,
  Pause as PauseIcon,
  Refresh as RetryIcon,
  ArrowBack as BackIcon,
} from '@mui/icons-material';
import ChunkListView from './ChunkListView';
import type { TranslationChunk, TranslationChunkStatus, PromptTemplate, ProgressInfo } from '@shared/types';

// ============================================
// Props
// ============================================

interface ChunksTabProps {
  // 청크 데이터
  chunks: TranslationChunk[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null;
  progress: ProgressInfo | null;
  filter: TranslationChunkStatus | null;

  // 템플릿
  templates: PromptTemplate[];
  selectedTemplateId: string | null;
  onSelectTemplate: (id: string) => void;

  // 번역 상태
  isTranslating: boolean;
  isPaused: boolean;
  hasFailedChunks: boolean;

  // 액션
  onPageChange: (page: number) => void;
  onFilterChange: (status: TranslationChunkStatus | null) => void;
  onRetryChunk: (chunkId: string) => void;
  onTranslateChunk: (chunkId: string) => void;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onRetryFailed: () => void;
  onBackToSource: () => void;
}

// ============================================
// 청크 탭
// ============================================

export default function ChunksTab({
  chunks,
  pagination,
  progress,
  filter,
  templates,
  selectedTemplateId,
  onSelectTemplate,
  isTranslating,
  isPaused,
  hasFailedChunks,
  onPageChange,
  onFilterChange,
  onRetryChunk,
  onTranslateChunk,
  onStart,
  onPause,
  onResume,
  onRetryFailed,
  onBackToSource,
}: ChunksTabProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  // 상태 계산
  const canStart = !isTranslating && !isPaused && selectedTemplateId && chunks.length > 0;
  const canPause = isTranslating && !isPaused;
  const canResume = isPaused && selectedTemplateId;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 2 }}>
      {/* 툴바 */}
      <Paper
        elevation={0}
        sx={{
          p: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          bgcolor: theme.custom.glassmorphism.light,
          border: 1,
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* 소스로 돌아가기 */}
          <Button
            variant='text'
            color='inherit'
            startIcon={<BackIcon />}
            onClick={onBackToSource}
            disabled={isTranslating}
            size='small'
          >
            {t('translation.backToSource')}
          </Button>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
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

          {/* 실패 청크 재시도 */}
          {hasFailedChunks && !isTranslating && (
            <Button variant='outlined' color='error' startIcon={<RetryIcon />} onClick={onRetryFailed} size='small'>
              {t('translation.retryFailed')}
            </Button>
          )}

          {/* 시작 버튼 */}
          {canStart && (
            <Button variant='contained' color='primary' startIcon={<StartIcon />} onClick={onStart}>
              {t('translation.startTranslation')}
            </Button>
          )}

          {/* 일시정지 버튼 */}
          {canPause && (
            <Button variant='contained' color='warning' startIcon={<PauseIcon />} onClick={onPause}>
              {t('translation.pause')}
            </Button>
          )}

          {/* 재개 버튼 */}
          {canResume && (
            <Button variant='contained' color='success' startIcon={<StartIcon />} onClick={onResume}>
              {t('translation.resume')}
            </Button>
          )}

          {/* 번역 중 표시 */}
          {isTranslating && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={20} />
              <Typography variant='body2' color='text.secondary'>
                {t('translation.translating')}
              </Typography>
            </Box>
          )}
        </Box>
      </Paper>

      {/* 청크 리스트 */}
      <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <ChunkListView
          chunks={chunks}
          pagination={pagination}
          progress={progress}
          filter={filter}
          isTranslating={isTranslating}
          onPageChange={onPageChange}
          onFilterChange={onFilterChange}
          onRetryChunk={onRetryChunk}
          onTranslateChunk={onTranslateChunk}
        />
      </Box>
    </Box>
  );
}
