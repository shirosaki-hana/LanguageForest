import { useTranslation } from 'react-i18next';
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, useTheme } from '@mui/material';
import { ErrorOutline as ErrorIcon, InfoOutlined as InfoIcon, HelpOutline as ConfirmIcon } from '@mui/icons-material';
import { useDialogStore } from '../../stores/dialogStore';

export default function GlobalDialog() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { open, options, close } = useDialogStore();

  if (!options) return null;

  const getIcon = () => {
    switch (options.type) {
      case 'error':
        return <ErrorIcon sx={{ fontSize: 48, color: theme.palette.error.main }} />;
      case 'confirm':
        return <ConfirmIcon sx={{ fontSize: 48, color: theme.palette.warning.main }} />;
      default:
        return <InfoIcon sx={{ fontSize: 48, color: theme.palette.info.main }} />;
    }
  };

  const getDefaultTitle = () => {
    switch (options.type) {
      case 'error':
        return t('common.error');
      case 'confirm':
        return t('dialog.confirm');
      default:
        return t('dialog.notice');
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => close(false)}
      maxWidth='xs'
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          pb: 1,
        }}
      >
        {getIcon()}
        {options.title || getDefaultTitle()}
      </DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ whiteSpace: 'pre-wrap' }}>{options.message}</DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        {options.type === 'confirm' ? (
          <>
            <Button onClick={() => close(false)} color='inherit'>
              {options.cancelText || t('common.cancel')}
            </Button>
            <Button onClick={() => close(true)} variant='contained' autoFocus>
              {options.confirmText || t('dialog.confirmButton')}
            </Button>
          </>
        ) : (
          <Button onClick={() => close(true)} variant='contained' autoFocus>
            {t('common.close')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
