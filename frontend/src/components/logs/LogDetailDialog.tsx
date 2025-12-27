import { useTranslation } from 'react-i18next';
import { Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Paper, Stack, Typography } from '@mui/material';
import { ErrorOutline as ErrorIcon, Warning as WarningIcon, Info as InfoIcon, BugReport as DebugIcon } from '@mui/icons-material';
import type { LogItem, LogLevel, LogCategory } from '@languageforest/sharedtype';

// 로그 레벨 색상 및 아이콘
const levelConfig: Record<LogLevel, { color: 'error' | 'warning' | 'info' | 'secondary'; icon: React.ReactElement }> = {
  ERROR: { color: 'error', icon: <ErrorIcon fontSize='small' /> },
  WARN: { color: 'warning', icon: <WarningIcon fontSize='small' /> },
  INFO: { color: 'info', icon: <InfoIcon fontSize='small' /> },
  DEBUG: { color: 'secondary', icon: <DebugIcon fontSize='small' /> },
};

interface LogDetailDialogProps {
  log: LogItem | null;
  onClose: () => void;
}

export default function LogDetailDialog({ log, onClose }: LogDetailDialogProps) {
  const { t, i18n } = useTranslation();

  // 카테고리 라벨 (i18n)
  const getCategoryLabel = (category: LogCategory): string => {
    return t(`logs.categories.${category}`, category);
  };

  // 날짜 포맷 (locale 기반)
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString(i18n.language === 'ko' ? 'ko-KR' : 'en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <Dialog open={!!log} onClose={onClose} maxWidth='md' fullWidth>
      <DialogTitle>
        {t('logs.detail')}
        {log && (
          <Chip icon={levelConfig[log.level].icon} label={log.level} color={levelConfig[log.level].color} size='small' sx={{ ml: 2 }} />
        )}
      </DialogTitle>
      <DialogContent dividers>
        {log && (
          <Stack spacing={2}>
            <Box>
              <Typography variant='caption' color='text.secondary'>
                {t('logs.time')}
              </Typography>
              <Typography variant='body1' fontFamily='monospace'>
                {formatDate(log.createdAt)}
              </Typography>
            </Box>
            <Divider />
            <Box>
              <Typography variant='caption' color='text.secondary'>
                {t('logs.category')}
              </Typography>
              <Typography variant='body1'>{getCategoryLabel(log.category)}</Typography>
            </Box>
            <Divider />
            <Box>
              <Typography variant='caption' color='text.secondary'>
                {t('logs.message')}
              </Typography>
              <Paper variant='outlined' sx={{ p: 2, mt: 1, bgcolor: 'background.default' }}>
                <Typography variant='body2' sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {log.message}
                </Typography>
              </Paper>
            </Box>
            {log.meta && (
              <>
                <Divider />
                <Box>
                  <Typography variant='caption' color='text.secondary'>
                    {t('logs.metadata')}
                  </Typography>
                  <Paper variant='outlined' sx={{ p: 2, mt: 1, bgcolor: 'background.default' }}>
                    <Typography
                      component='pre'
                      variant='body2'
                      sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all', m: 0 }}
                    >
                      {JSON.stringify(JSON.parse(log.meta), null, 2)}
                    </Typography>
                  </Paper>
                </Box>
              </>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.close')}</Button>
      </DialogActions>
    </Dialog>
  );
}
