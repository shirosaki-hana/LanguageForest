import { useTranslation } from 'react-i18next';
import {
  Card,
  Chip,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
  useTheme,
  alpha,
} from '@mui/material';
import { ErrorOutline as ErrorIcon, Warning as WarningIcon, Info as InfoIcon, BugReport as DebugIcon } from '@mui/icons-material';
import type { LogItem, LogLevel, LogCategory } from '@languageforest/sharedtype';

// 로그 레벨 색상 및 아이콘
const levelConfig: Record<LogLevel, { color: 'error' | 'warning' | 'info' | 'secondary'; icon: React.ReactElement }> = {
  ERROR: { color: 'error', icon: <ErrorIcon fontSize='small' /> },
  WARN: { color: 'warning', icon: <WarningIcon fontSize='small' /> },
  INFO: { color: 'info', icon: <InfoIcon fontSize='small' /> },
  DEBUG: { color: 'secondary', icon: <DebugIcon fontSize='small' /> },
};

interface LogsTableProps {
  logs: LogItem[];
  loading: boolean;
  total: number;
  page: number;
  rowsPerPage: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rowsPerPage: number) => void;
  onLogSelect: (log: LogItem) => void;
}

export default function LogsTable({
  logs,
  loading,
  total,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  onLogSelect,
}: LogsTableProps) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();

  // 카테고리 라벨 (i18n)
  const getCategoryLabel = (category: LogCategory): string => {
    return t(`logs.categories.${category}`, category);
  };

  // 날짜 포맷 (locale 기반)
  const formatDateLocalized = (dateString: string) => {
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
    <Card>
      <TableContainer>
        <Table size='small'>
          <TableHead>
            <TableRow>
              <TableCell width={180}>{t('logs.time')}</TableCell>
              <TableCell width={100}>{t('logs.level')}</TableCell>
              <TableCell width={100}>{t('logs.category')}</TableCell>
              <TableCell>{t('logs.message')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} align='center' sx={{ py: 8 }}>
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align='center' sx={{ py: 8 }}>
                  <Typography color='text.secondary'>{t('logs.empty')}</Typography>
                </TableCell>
              </TableRow>
            ) : (
              logs.map(log => (
                <TableRow key={log.id} hover sx={{ cursor: 'pointer' }} onClick={() => onLogSelect(log)}>
                  <TableCell>
                    <Typography variant='body2' sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                      {formatDateLocalized(log.createdAt)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      icon={levelConfig[log.level].icon}
                      label={log.level}
                      color={levelConfig[log.level].color}
                      size='small'
                      variant='outlined'
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getCategoryLabel(log.category)}
                      size='small'
                      variant='filled'
                      sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant='body2'
                      sx={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: 600,
                        fontFamily: 'monospace',
                        fontSize: '0.85rem',
                      }}
                    >
                      {log.message}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component='div'
        count={total}
        page={page}
        onPageChange={(_, newPage) => onPageChange(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={e => {
          onRowsPerPageChange(parseInt(e.target.value, 10));
        }}
        rowsPerPageOptions={[10, 25, 50, 100]}
        labelRowsPerPage={t('common.rowsPerPage')}
        labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
      />
    </Card>
  );
}
