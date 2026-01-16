import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Button,
  Paper,
  Typography,
  Chip,
  useTheme,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  Download as DownloadIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  HourglassEmpty as PendingIcon,
  Refresh as RetryIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material';
import { EditorView, lineNumbers, highlightActiveLine, drawSelection } from '@codemirror/view';
import { EditorState, Compartment } from '@codemirror/state';
import type { ProgressInfo, TranslationSessionStatus } from '@shared/types';
import { snackbar } from '../../stores/snackbarStore';
import { createCodeMirrorTheme } from '../../theme/codemirrorTheme';

// ============================================
// Props
// ============================================

interface ResultTabProps {
  sessionStatus: TranslationSessionStatus | null;
  progress: ProgressInfo | null;
  isTranslating: boolean;
  hasCompletedChunks: boolean;
  hasFailedChunks: boolean;
  translatedText: string;
  onDownload: () => void;
  onRetryFailed: () => void;
}

// ============================================
// 통계 칩
// ============================================

interface StatChipProps {
  label: string;
  value: number;
  color: 'success' | 'error' | 'info' | 'default';
  icon: React.ReactNode;
}

function StatChip({ label, value, color, icon }: StatChipProps) {
  return (
    <Chip
      size='small'
      color={color}
      icon={<Box sx={{ display: 'flex', alignItems: 'center' }}>{icon}</Box>}
      label={`${label}: ${value}`}
      sx={{ fontWeight: 600, height: 24 }}
    />
  );
}

// ============================================
// 결과 탭
// ============================================

export default function ResultTab({
  sessionStatus,
  progress,
  isTranslating,
  hasCompletedChunks,
  hasFailedChunks,
  translatedText,
  onDownload,
  onRetryFailed,
}: ResultTabProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const themeCompartment = useRef(new Compartment());

  const total = progress?.total || 0;
  const completed = progress?.completed || 0;
  const failed = progress?.failed || 0;
  const pending = progress?.pending || 0;

  const isCompleted = sessionStatus === 'completed';
  const canDownload = hasCompletedChunks && !isTranslating;

  // 에디터 초기화
  useEffect(() => {
    if (!editorRef.current) return;

    const editorTheme = createCodeMirrorTheme(theme, { readOnly: true });

    const state = EditorState.create({
      doc: translatedText,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        drawSelection(),
        themeCompartment.current.of(editorTheme),
        EditorView.lineWrapping,
        EditorState.readOnly.of(true),
        EditorView.editable.of(false),
      ],
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  // 테마 변경 시 업데이트
  useEffect(() => {
    if (!viewRef.current) return;

    const editorTheme = createCodeMirrorTheme(theme, { readOnly: true });

    viewRef.current.dispatch({
      effects: themeCompartment.current.reconfigure(editorTheme),
    });
  }, [theme]);

  // translatedText 변경 시 에디터 업데이트
  useEffect(() => {
    if (!viewRef.current) return;
    const currentText = viewRef.current.state.doc.toString();
    if (currentText !== translatedText) {
      viewRef.current.dispatch({
        changes: {
          from: 0,
          to: currentText.length,
          insert: translatedText,
        },
      });
    }
  }, [translatedText]);

  // 복사 핸들러
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(translatedText);
      snackbar.success('common.copied', true);
    } catch {
      snackbar.error('translation.errors.copyFailed', true);
    }
  };

  // 통계
  const charCount = translatedText.length;
  const lineCount = translatedText ? translatedText.split('\n').length : 0;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 1 }}>
      {/* 상단 상태 바 */}
      <Paper
        elevation={0}
        sx={{
          px: 1.5,
          py: 0.75,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1.5,
          bgcolor: isCompleted
            ? theme.custom.stateBackground.success.light
            : isTranslating
              ? theme.custom.stateBackground.primary.light
              : theme.custom.glassmorphism.light,
          border: 1,
          borderColor: isCompleted ? 'success.main' : isTranslating ? 'primary.main' : 'divider',
          borderRadius: 1,
        }}
      >
        {/* 상태 텍스트 & 통계 칩들 */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant='subtitle2' fontWeight={600}>
            {isCompleted
              ? t('translation.translationComplete')
              : isTranslating
                ? t('translation.translatingDesc', { completed, total })
                : hasFailedChunks
                  ? t('translation.hasFailedChunks')
                  : t('translation.ready')}
          </Typography>

          {/* 통계 칩들 */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <StatChip
              label={t('translation.completed')}
              value={completed}
              color='success'
              icon={<SuccessIcon sx={{ fontSize: 14 }} />}
            />
            {failed > 0 && (
              <StatChip
                label={t('translation.failed')}
                value={failed}
                color='error'
                icon={<ErrorIcon sx={{ fontSize: 14 }} />}
              />
            )}
            {pending > 0 && (
              <StatChip
                label={t('translation.pending')}
                value={pending}
                color='info'
                icon={<PendingIcon sx={{ fontSize: 14 }} />}
              />
            )}
          </Box>
        </Box>

        {/* 액션 버튼들 */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {hasFailedChunks && !isTranslating && (
            <Button variant='outlined' color='error' startIcon={<RetryIcon />} onClick={onRetryFailed} size='small'>
              {t('translation.retryFailed')}
            </Button>
          )}

          {canDownload && (
            <Button variant='contained' color='success' startIcon={<DownloadIcon />} onClick={onDownload} size='small'>
              {t('translation.downloadResult')}
            </Button>
          )}
        </Box>
      </Paper>

      {/* 번역문 뷰어 */}
      <Paper
        elevation={0}
        sx={{
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          border: 1,
          borderColor: 'divider',
          borderRadius: 2,
        }}
      >
        {/* 뷰어 헤더 */}
        <Box
          sx={{
            px: 1.5,
            py: 0.75,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: theme.custom.glassmorphism.light,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography variant='subtitle2' fontWeight={600}>
              {t('translation.translatedText')}
            </Typography>
            <Chip size='small' label={t('translation.charCount', { count: charCount })} variant='outlined' />
            <Chip size='small' label={t('translation.lineCount', { count: lineCount })} variant='outlined' />
          </Box>

          <Tooltip title={t('common.copy')}>
            <IconButton size='small' onClick={handleCopy} disabled={!translatedText}>
              <CopyIcon fontSize='small' />
            </IconButton>
          </Tooltip>
        </Box>

        {/* 에디터 영역 */}
        {translatedText ? (
          <Box
            ref={editorRef}
            sx={{
              flex: 1,
              overflow: 'hidden',
              '& .cm-editor': {
                height: '100%',
                outline: 'none',
              },
            }}
          />
        ) : (
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'text.disabled',
            }}
          >
            <Typography variant='body1'>
              {isTranslating ? t('translation.translatingPreview') : t('translation.noTranslatedTextYet')}
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
