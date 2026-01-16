import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Paper, Typography, TextField, IconButton, Tooltip, Chip, useTheme } from '@mui/material';
import { ContentCopy as CopyIcon, SwapHoriz as SwapIcon } from '@mui/icons-material';
import type { TranslationChunk } from '@shared/types';
import { snackbar } from '../../stores/snackbarStore';

// ============================================
// Props
// ============================================

interface TranslationEditorProps {
  sourceText: string;
  onSourceTextChange: (text: string) => void;
  chunks: TranslationChunk[];
  disabled?: boolean;
  readonly?: boolean;
}

// ============================================
// 통계 계산
// ============================================

function countChars(text: string): number {
  return text.length;
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// ============================================
// 에디터 헤더
// ============================================

interface EditorHeaderProps {
  title: string;
  charCount: number;
  wordCount: number;
  onCopy?: () => void;
  extra?: React.ReactNode;
}

function EditorHeader({ title, charCount, wordCount, onCopy, extra }: EditorHeaderProps) {
  const { t } = useTranslation();

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 2,
        py: 1.5,
        borderBottom: 1,
        borderColor: 'divider',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant='subtitle2' fontWeight={600}>
          {title}
        </Typography>
        {extra}
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Chip size='small' label={t('translation.charCount', { count: charCount })} variant='outlined' />
        <Chip size='small' label={t('translation.wordCount', { count: wordCount })} variant='outlined' />
        {onCopy && (
          <Tooltip title={t('common.copy')}>
            <IconButton size='small' onClick={onCopy}>
              <CopyIcon fontSize='small' />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </Box>
  );
}

// ============================================
// 번역 에디터
// ============================================

export default function TranslationEditor({
  sourceText,
  onSourceTextChange,
  chunks,
  disabled = false,
  readonly = false,
}: TranslationEditorProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  // 번역문 조립
  const translatedText = useMemo(() => {
    const completedChunks = chunks.filter(c => c.status === 'completed' && c.translatedText).sort((a, b) => a.order - b.order);
    return completedChunks.map(c => c.translatedText).join('\n\n');
  }, [chunks]);

  // 통계
  const sourceStats = useMemo(
    () => ({
      chars: countChars(sourceText),
      words: countWords(sourceText),
    }),
    [sourceText]
  );

  const translatedStats = useMemo(
    () => ({
      chars: countChars(translatedText),
      words: countWords(translatedText),
    }),
    [translatedText]
  );

  // 복사 핸들러
  const handleCopySource = () => {
    navigator.clipboard.writeText(sourceText);
    snackbar.success('common.copied', true);
  };

  const handleCopyTranslation = () => {
    navigator.clipboard.writeText(translatedText);
    snackbar.success('common.copied', true);
  };

  // 청크 상태 표시
  const chunkStatusExtra = useMemo(() => {
    if (chunks.length === 0) return null;
    const completed = chunks.filter(c => c.status === 'completed').length;
    return <Chip size='small' label={`${completed}/${chunks.length}`} color={completed === chunks.length ? 'success' : 'default'} />;
  }, [chunks]);

  return (
    <Box
      sx={{
        display: 'flex',
        flex: 1,
        gap: 2,
        minHeight: 0,
      }}
    >
      {/* 원문 입력 */}
      <Paper
        elevation={0}
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <EditorHeader
          title={t('translation.sourceText')}
          charCount={sourceStats.chars}
          wordCount={sourceStats.words}
          onCopy={sourceText ? handleCopySource : undefined}
        />
        <Box sx={{ flex: 1, p: 2, overflow: 'auto' }}>
          <TextField
            fullWidth
            multiline
            placeholder={t('translation.sourceTextPlaceholder')}
            value={sourceText}
            onChange={e => onSourceTextChange(e.target.value)}
            disabled={disabled || readonly}
            sx={{
              '& .MuiInputBase-root': {
                height: '100%',
                alignItems: 'flex-start',
              },
              '& .MuiInputBase-input': {
                height: '100% !important',
                overflow: 'auto !important',
                fontFamily: 'inherit',
                fontSize: '0.95rem',
                lineHeight: 1.7,
              },
              '& fieldset': { border: 'none' },
            }}
          />
        </Box>
      </Paper>

      {/* 구분선 */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          color: 'text.disabled',
        }}
      >
        <SwapIcon />
      </Box>

      {/* 번역 결과 */}
      <Paper
        elevation={0}
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          bgcolor: theme.custom.stateBackground.success.subtle,
        }}
      >
        <EditorHeader
          title={t('translation.translatedText')}
          charCount={translatedStats.chars}
          wordCount={translatedStats.words}
          onCopy={translatedText ? handleCopyTranslation : undefined}
          extra={chunkStatusExtra}
        />
        <Box
          sx={{
            flex: 1,
            p: 2,
            overflow: 'auto',
            fontFamily: 'inherit',
            fontSize: '0.95rem',
            lineHeight: 1.7,
            whiteSpace: 'pre-wrap',
            color: translatedText ? 'text.primary' : 'text.disabled',
          }}
        >
          {translatedText || t('translation.translatedTextPlaceholder')}
        </Box>
      </Paper>
    </Box>
  );
}
