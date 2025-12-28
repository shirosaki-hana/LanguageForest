import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Paper, Typography, Button, CircularProgress, alpha, Chip } from '@mui/material';
import { CloudUpload as UploadIcon, InsertDriveFile as FileIcon, CheckCircle as SuccessIcon } from '@mui/icons-material';
import type { TranslationSession } from '@languageforest/sharedtype';

// ============================================
// Props
// ============================================

interface FileUploadZoneProps {
  session: TranslationSession;
  isUploading: boolean;
  onUpload: (file: File) => Promise<void>;
  disabled?: boolean;
}

// ============================================
// 파일 업로드 영역
// ============================================

export default function FileUploadZone({ session, isUploading, onUpload, disabled = false }: FileUploadZoneProps) {
  const { t } = useTranslation();
  const [isDragOver, setIsDragOver] = useState(false);

  // 파일이 있는지 확인: originalFileName이 있거나, sourceText가 있거나, 청크가 있는 경우
  const hasFile = session.status !== 'draft' && (session.originalFileName || session.sourceText || session.totalChunks > 0);

  // 드래그 이벤트 핸들러
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      if (disabled || isUploading) return;

      const file = e.dataTransfer.files[0];
      if (file && file.name.endsWith('.txt')) {
        await onUpload(file);
      }
    },
    [disabled, isUploading, onUpload]
  );

  // 파일 선택 핸들러
  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && file.name.endsWith('.txt')) {
        await onUpload(file);
      }
      // input 초기화
      e.target.value = '';
    },
    [onUpload]
  );

  // 이미 파일이 업로드된 경우
  if (hasFile) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          bgcolor: theme => alpha(theme.palette.success.main, 0.05),
          border: 1,
          borderColor: 'success.main',
          borderStyle: 'solid',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <SuccessIcon color='success' />
          <Box>
            <Typography variant='subtitle2' fontWeight={600}>
              {session.originalFileName || session.title}
            </Typography>
            <Typography variant='caption' color='text.secondary'>
              {session.totalChunks > 0 && t('translation.totalChunks', { count: session.totalChunks })}
              {session.totalChunks > 0 && session.sourceText && ' • '}
              {session.sourceText && t('translation.charCount', { count: session.sourceText.length })}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            size='small'
            label={t(`translation.sessionStatus.${session.status}`)}
            color={session.status === 'completed' ? 'success' : session.status === 'failed' ? 'error' : 'default'}
          />
          <Button
            component='label'
            variant='outlined'
            size='small'
            disabled={disabled || isUploading || session.status === 'translating'}
          >
            {t('translation.replaceFile')}
            <input type='file' accept='.txt' hidden onChange={handleFileSelect} />
          </Button>
        </Box>
      </Paper>
    );
  }

  // 파일 업로드 대기 상태
  return (
    <Paper
      elevation={0}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      sx={{
        p: 6,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        border: 2,
        borderStyle: 'dashed',
        borderColor: isDragOver ? 'primary.main' : 'divider',
        bgcolor: isDragOver ? theme => alpha(theme.palette.primary.main, 0.05) : 'background.paper',
        transition: 'all 0.2s ease',
        cursor: disabled || isUploading ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {isUploading ? (
        <>
          <CircularProgress size={48} />
          <Typography color='text.secondary'>{t('translation.uploading')}</Typography>
        </>
      ) : (
        <>
          <Box
            sx={{
              p: 2,
              borderRadius: '50%',
              bgcolor: theme => alpha(theme.palette.primary.main, 0.1),
            }}
          >
            <UploadIcon sx={{ fontSize: 48, color: 'primary.main' }} />
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant='h6' gutterBottom>
              {t('translation.dropFileHere')}
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              {t('translation.dropFileDescription')}
            </Typography>
          </Box>
          <Button component='label' variant='contained' startIcon={<FileIcon />} disabled={disabled}>
            {t('translation.selectFile')}
            <input type='file' accept='.txt' hidden onChange={handleFileSelect} />
          </Button>
          <Typography variant='caption' color='text.disabled'>
            {t('translation.supportedFormats')}
          </Typography>
        </>
      )}
    </Paper>
  );
}

