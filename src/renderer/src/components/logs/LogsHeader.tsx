import { useTranslation } from 'react-i18next';
import { Box, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import {
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  ArrowBack as ArrowBackIcon,
  CleaningServices as CleanupIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

interface LogsHeaderProps {
  onRefresh: () => void;
  onCleanup: () => void;
  onSettingsOpen: () => void;
}

export default function LogsHeader({ onRefresh, onCleanup, onSettingsOpen }: LogsHeaderProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton onClick={() => navigate('/media')} sx={{ mr: 1 }}>
          <ArrowBackIcon />
        </IconButton>
        <Box>
          <Typography variant='h4' fontWeight='bold'>
            {t('logs.title')}
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            {t('logs.subtitle')}
          </Typography>
        </Box>
      </Box>
      <Stack direction='row' spacing={1}>
        <Tooltip title={t('common.refresh')}>
          <IconButton onClick={onRefresh}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title={t('logs.cleanup')}>
          <IconButton onClick={onCleanup}>
            <CleanupIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title={t('logs.settings')}>
          <IconButton onClick={onSettingsOpen}>
            <SettingsIcon />
          </IconButton>
        </Tooltip>
      </Stack>
    </Box>
  );
}
