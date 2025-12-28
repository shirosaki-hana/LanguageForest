import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  Pagination,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  LinearProgress,
  Collapse,
  alpha,
} from '@mui/material';
import {
  Refresh as RetryIcon,
  PlayArrow as TranslateIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  HourglassEmpty as PendingIcon,
  AutorenewRounded as ProcessingIcon,
} from '@mui/icons-material';
import type { TranslationChunk, TranslationChunkStatus, ProgressInfo } from '@languageforest/sharedtype';

// ============================================
// Props
// ============================================

interface ChunkListViewProps {
  chunks: TranslationChunk[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null;
  progress: ProgressInfo | null;
  filter: TranslationChunkStatus | null;
  isTranslating: boolean;
  onPageChange: (page: number) => void;
  onFilterChange: (status: TranslationChunkStatus | null) => void;
  onRetryChunk: (chunkId: string) => void;
  onTranslateChunk: (chunkId: string) => void;
}

// ============================================
// 상태 칩
// ============================================

function StatusChip({ status }: { status: TranslationChunkStatus }) {
  const { t } = useTranslation();

  const config = {
    pending: { color: 'default' as const, icon: <PendingIcon sx={{ fontSize: 16 }} /> },
    processing: { color: 'primary' as const, icon: <ProcessingIcon sx={{ fontSize: 16 }} /> },
    completed: { color: 'success' as const, icon: <SuccessIcon sx={{ fontSize: 16 }} /> },
    failed: { color: 'error' as const, icon: <ErrorIcon sx={{ fontSize: 16 }} /> },
  };

  const { color, icon } = config[status];

  return <Chip size='small' color={color} icon={icon} label={t(`translation.chunkStatus.${status}`)} />;
}

// ============================================
// 청크 행
// ============================================

interface ChunkRowProps {
  chunk: TranslationChunk;
  isTranslating: boolean;
  onRetry: () => void;
  onTranslate: () => void;
}

function ChunkRow({ chunk, isTranslating, onRetry, onTranslate }: ChunkRowProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const previewLength = 100;
  const sourcePreview =
    chunk.sourceText.length > previewLength ? chunk.sourceText.slice(0, previewLength) + '...' : chunk.sourceText;
  const translatedPreview = chunk.translatedText
    ? chunk.translatedText.length > previewLength
      ? chunk.translatedText.slice(0, previewLength) + '...'
      : chunk.translatedText
    : '-';

  return (
    <>
      <TableRow
        hover
        sx={{
          cursor: 'pointer',
          bgcolor: chunk.status === 'processing' ? theme => alpha(theme.palette.primary.main, 0.05) : 'inherit',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <TableCell>
          <Typography variant='body2' fontWeight={600}>
            #{chunk.order + 1}
          </Typography>
        </TableCell>
        <TableCell>
          <StatusChip status={chunk.status as TranslationChunkStatus} />
        </TableCell>
        <TableCell>
          <Typography variant='body2' noWrap sx={{ maxWidth: 200 }}>
            {sourcePreview}
          </Typography>
        </TableCell>
        <TableCell>
          <Typography variant='body2' noWrap sx={{ maxWidth: 200, color: chunk.translatedText ? 'inherit' : 'text.disabled' }}>
            {translatedPreview}
          </Typography>
        </TableCell>
        <TableCell align='right'>
          {chunk.processingTime && (
            <Typography variant='caption' color='text.secondary'>
              {(chunk.processingTime / 1000).toFixed(1)}s
            </Typography>
          )}
        </TableCell>
        <TableCell align='right'>
          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
            {chunk.status === 'failed' && (
              <Tooltip title={t('translation.retryChunk')}>
                <IconButton size='small' onClick={e => { e.stopPropagation(); onRetry(); }} disabled={isTranslating}>
                  <RetryIcon fontSize='small' />
                </IconButton>
              </Tooltip>
            )}
            {(chunk.status === 'pending' || chunk.status === 'failed') && (
              <Tooltip title={t('translation.translateChunk')}>
                <IconButton size='small' onClick={e => { e.stopPropagation(); onTranslate(); }} disabled={isTranslating}>
                  <TranslateIcon fontSize='small' />
                </IconButton>
              </Tooltip>
            )}
            {chunk.status === 'completed' && (
              <Tooltip title={t('translation.retranslateChunk')}>
                <IconButton size='small' onClick={e => { e.stopPropagation(); onTranslate(); }} disabled={isTranslating}>
                  <RetryIcon fontSize='small' />
                </IconButton>
              </Tooltip>
            )}
            <IconButton size='small'>
              {expanded ? <CollapseIcon fontSize='small' /> : <ExpandIcon fontSize='small' />}
            </IconButton>
          </Box>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={6} sx={{ py: 0, borderBottom: expanded ? 1 : 0, borderColor: 'divider' }}>
          <Collapse in={expanded} timeout='auto' unmountOnExit>
            <Box sx={{ py: 2 }}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant='caption' color='text.secondary' gutterBottom display='block'>
                    {t('translation.sourceText')}
                  </Typography>
                  <Paper variant='outlined' sx={{ p: 1.5, maxHeight: 200, overflow: 'auto' }}>
                    <Typography variant='body2' sx={{ whiteSpace: 'pre-wrap' }}>
                      {chunk.sourceText}
                    </Typography>
                  </Paper>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant='caption' color='text.secondary' gutterBottom display='block'>
                    {t('translation.translatedText')}
                  </Typography>
                  <Paper
                    variant='outlined'
                    sx={{
                      p: 1.5,
                      maxHeight: 200,
                      overflow: 'auto',
                      bgcolor: chunk.translatedText ? 'inherit' : 'action.disabledBackground',
                    }}
                  >
                    <Typography
                      variant='body2'
                      sx={{ whiteSpace: 'pre-wrap', color: chunk.translatedText ? 'inherit' : 'text.disabled' }}
                    >
                      {chunk.translatedText || t('translation.notTranslatedYet')}
                    </Typography>
                  </Paper>
                </Box>
              </Box>
              {chunk.errorMessage && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant='caption' color='error'>
                    {t('translation.error')}: {chunk.errorMessage}
                  </Typography>
                </Box>
              )}
              <Box sx={{ mt: 1, display: 'flex', gap: 2 }}>
                <Typography variant='caption' color='text.secondary'>
                  {t('translation.charCount', { count: chunk.sourceText.length })}
                </Typography>
                {chunk.tokenCount && (
                  <Typography variant='caption' color='text.secondary'>
                    {chunk.tokenCount} tokens
                  </Typography>
                )}
                {chunk.retryCount > 0 && (
                  <Typography variant='caption' color='warning.main'>
                    {t('translation.retryCount', { count: chunk.retryCount })}
                  </Typography>
                )}
              </Box>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

// ============================================
// 청크 리스트 뷰
// ============================================

export default function ChunkListView({
  chunks,
  pagination,
  progress,
  filter,
  isTranslating,
  onPageChange,
  onFilterChange,
  onRetryChunk,
  onTranslateChunk,
}: ChunkListViewProps) {
  const { t } = useTranslation();

  if (!pagination || pagination.total === 0) {
    return (
      <Paper elevation={0} sx={{ p: 4, textAlign: 'center' }}>
        <Typography color='text.secondary'>{t('translation.noChunks')}</Typography>
      </Paper>
    );
  }

  const progressPercent = progress ? progress.percent : 0;

  return (
    <Paper elevation={0} sx={{ overflow: 'hidden' }}>
      {/* 헤더 */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant='subtitle1' fontWeight={600}>
            {t('translation.chunkList')} ({pagination.total})
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            {progress && (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Chip size='small' color='success' label={`${progress.completed} ${t('translation.completed')}`} />
                {progress.failed > 0 && (
                  <Chip size='small' color='error' label={`${progress.failed} ${t('translation.failed')}`} />
                )}
                <Chip size='small' label={`${progress.pending} ${t('translation.pending')}`} />
              </Box>
            )}
            <FormControl size='small' sx={{ minWidth: 120 }}>
              <InputLabel>{t('translation.filter')}</InputLabel>
              <Select
                value={filter || ''}
                label={t('translation.filter')}
                onChange={e => onFilterChange((e.target.value as TranslationChunkStatus) || null)}
              >
                <MenuItem value=''>{t('translation.all')}</MenuItem>
                <MenuItem value='pending'>{t('translation.chunkStatus.pending')}</MenuItem>
                <MenuItem value='processing'>{t('translation.chunkStatus.processing')}</MenuItem>
                <MenuItem value='completed'>{t('translation.chunkStatus.completed')}</MenuItem>
                <MenuItem value='failed'>{t('translation.chunkStatus.failed')}</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>

        {/* 프로그레스 바 */}
        <LinearProgress
          variant='determinate'
          value={progressPercent}
          sx={{
            height: 6,
            borderRadius: 3,
            bgcolor: 'action.hover',
            '& .MuiLinearProgress-bar': {
              borderRadius: 3,
            },
          }}
        />
        <Typography variant='caption' color='text.secondary' sx={{ mt: 0.5, display: 'block' }}>
          {progressPercent}% {t('translation.complete')}
        </Typography>
      </Box>

      {/* 테이블 */}
      <TableContainer sx={{ maxHeight: 500 }}>
        <Table stickyHeader size='small'>
          <TableHead>
            <TableRow>
              <TableCell width={60}>#</TableCell>
              <TableCell width={120}>{t('translation.status')}</TableCell>
              <TableCell>{t('translation.sourceText')}</TableCell>
              <TableCell>{t('translation.translatedText')}</TableCell>
              <TableCell width={80} align='right'>
                {t('translation.time')}
              </TableCell>
              <TableCell width={100} align='right'>
                {t('translation.actions')}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {chunks.map(chunk => (
              <ChunkRow
                key={chunk.id}
                chunk={chunk}
                isTranslating={isTranslating}
                onRetry={() => onRetryChunk(chunk.id)}
                onTranslate={() => onTranslateChunk(chunk.id)}
              />
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 페이지네이션 */}
      {pagination.totalPages > 1 && (
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'center', borderTop: 1, borderColor: 'divider' }}>
          <Pagination
            count={pagination.totalPages}
            page={pagination.page}
            onChange={(_, page) => onPageChange(page)}
            color='primary'
          />
        </Box>
      )}
    </Paper>
  );
}

