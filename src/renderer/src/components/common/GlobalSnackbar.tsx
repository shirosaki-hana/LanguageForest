import { useTranslation } from 'react-i18next';
import { Snackbar, Alert } from '@mui/material';
import { useSnackbarStore } from '../../stores/snackbarStore';

export default function GlobalSnackbar() {
  const { t } = useTranslation();
  const { open, options, close } = useSnackbarStore();

  if (!options) return null;

  // 동적 키 사용 시 타입 체크 우회
  const message = options.translationKey ? (t as (key: string) => string)(options.message) : options.message;

  return (
    <Snackbar open={open} autoHideDuration={options.duration} onClose={close} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
      <Alert
        onClose={close}
        severity={options.severity}
        variant='filled'
        elevation={6}
        sx={{
          width: '100%',
          minWidth: 300,
          '& .MuiAlert-message': {
            fontSize: '0.95rem',
          },
        }}
      >
        {message}
      </Alert>
    </Snackbar>
  );
}
