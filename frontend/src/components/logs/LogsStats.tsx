import { useTranslation } from 'react-i18next';
import { Box, Card, CardContent, Typography, useTheme, alpha } from '@mui/material';

interface LogStats {
  total: number;
  byLevel: Record<string, number>;
  byCategory: Record<string, number>;
  last24h: number;
  last7d: number;
}

interface LogsStatsProps {
  stats: LogStats;
}

export default function LogsStats({ stats }: LogsStatsProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 2, mb: 4 }}>
      <Card sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }}>
        <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
          <Typography variant='h4' fontWeight='bold'>
            {stats.total.toLocaleString()}
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            {t('logs.stats.total')}
          </Typography>
        </CardContent>
      </Card>
      <Card sx={{ bgcolor: alpha(theme.palette.error.main, 0.1) }}>
        <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
          <Typography variant='h4' fontWeight='bold' color='error'>
            {(stats.byLevel.ERROR || 0).toLocaleString()}
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            {t('logs.stats.errors')}
          </Typography>
        </CardContent>
      </Card>
      <Card sx={{ bgcolor: alpha(theme.palette.warning.main, 0.1) }}>
        <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
          <Typography variant='h4' fontWeight='bold' color='warning.main'>
            {(stats.byLevel.WARN || 0).toLocaleString()}
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            {t('logs.stats.warnings')}
          </Typography>
        </CardContent>
      </Card>
      <Card sx={{ bgcolor: alpha(theme.palette.info.main, 0.1) }}>
        <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
          <Typography variant='h4' fontWeight='bold'>
            {stats.last24h.toLocaleString()}
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            {t('logs.stats.last24h')}
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
