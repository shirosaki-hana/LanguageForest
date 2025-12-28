import { useTranslation } from 'react-i18next';
import { Box, Container, Paper, Stack, Typography, Button, IconButton } from '@mui/material';
import { Home as HomeIcon, Logout as LogoutIcon, Settings as SettingsIcon, Terminal as TerminalIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useSettingsStore } from '../stores/settingsStore';

export default function WelcomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const { openSettings } = useSettingsStore();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <Container component='main' maxWidth='md'>
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: 6,
        }}
      >
        <Paper
          elevation={0}
          sx={theme => ({
            px: { xs: 3, sm: 6 },
            py: { xs: 4, sm: 6 },
            width: '100%',
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: theme.palette.mode === 'light' ? 'rgba(255,255,255,0.7)' : 'rgba(2,6,23,0.55)',
          })}
        >
          <Stack spacing={4} alignItems='center'>
            {/* 아이콘 */}
            <Box
              sx={{
                width: 96,
                height: 96,
                borderRadius: '20px',
                background: 'linear-gradient(135deg, rgba(59,130,246,0.9), rgba(124,58,237,0.9))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <HomeIcon sx={{ fontSize: 48, color: 'white' }} />
            </Box>

            {/* 타이틀 */}
            <Box sx={{ textAlign: 'center' }}>
              <Typography
                component='h1'
                variant='h3'
                sx={{
                  fontWeight: 800,
                  background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 60%, #10b981 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
                gutterBottom
              >
                {t('common.appName')}
              </Typography>
              <Typography variant='h6' color='text.secondary'>
                {t('welcome.subtitle')}
              </Typography>
            </Box>

            {/* 설명 */}
            <Paper
              variant='outlined'
              sx={{
                p: 3,
                width: '100%',
                bgcolor: 'background.default',
              }}
            >
              <Typography variant='body1' color='text.secondary' align='center'>
                {t('welcome.description')}
              </Typography>
            </Paper>

            {/* 빠른 링크 */}
            <Stack direction='row' spacing={2}>
              <Button variant='outlined' startIcon={<TerminalIcon />} onClick={() => navigate('/logs')} size='large'>
                {t('logs.title')}
              </Button>
              <IconButton onClick={openSettings} color='primary' size='large'>
                <SettingsIcon />
              </IconButton>
              <IconButton onClick={handleLogout} color='error' size='large'>
                <LogoutIcon />
              </IconButton>
            </Stack>
          </Stack>
        </Paper>
      </Box>
    </Container>
  );
}
