import { Box, Container, Paper, Stack, Typography } from '@mui/material';

interface AuthPageLayoutProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

export default function AuthPageLayout({ icon, title, subtitle, children }: AuthPageLayoutProps) {
  return (
    <Container component='main' maxWidth='sm'>
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
          <Stack spacing={3} alignItems='center'>
            {/* 아이콘 */}
            <Box
              sx={{
                width: 72,
                height: 72,
                borderRadius: '16px',
                background: 'linear-gradient(135deg, rgba(59,130,246,0.9), rgba(124,58,237,0.9))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {icon}
            </Box>

            {/* 타이틀 */}
            <Box sx={{ textAlign: 'center' }}>
              <Typography
                component='h1'
                variant='h4'
                sx={{
                  fontWeight: 800,
                  background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 60%, #10b981 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
                gutterBottom
              >
                {title}
              </Typography>
              <Typography variant='body1' color='text.secondary'>
                {subtitle}
              </Typography>
            </Box>

            {/* 콘텐츠 */}
            {children}
          </Stack>
        </Paper>
      </Box>
    </Container>
  );
}
