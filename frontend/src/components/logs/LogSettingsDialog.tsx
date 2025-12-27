import { useTranslation } from 'react-i18next';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from '@mui/material';
import type { LogSettings } from '@templateforest/types';

interface LogSettingsDialogProps {
  open: boolean;
  settings: LogSettings;
  saving: boolean;
  onClose: () => void;
  onSettingsChange: (settings: LogSettings) => void;
  onSave: () => void;
}

export default function LogSettingsDialog({ open, settings, saving, onClose, onSettingsChange, onSave }: LogSettingsDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onClose={onClose} maxWidth='sm' fullWidth>
      <DialogTitle>{t('logs.settings')}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={3} sx={{ pt: 1 }}>
          <TextField
            label={t('logs.retentionDays')}
            type='number'
            value={settings.retentionDays}
            onChange={e => onSettingsChange({ ...settings, retentionDays: parseInt(e.target.value, 10) || 7 })}
            helperText={t('logs.retentionDaysHelp')}
            inputProps={{ min: 1, max: 365 }}
            fullWidth
          />
          <TextField
            label={t('logs.maxLogs')}
            type='number'
            value={settings.maxLogs}
            onChange={e => onSettingsChange({ ...settings, maxLogs: parseInt(e.target.value, 10) || 10000 })}
            helperText={t('logs.maxLogsHelp')}
            inputProps={{ min: 100, max: 1000000 }}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        <Button variant='contained' onClick={onSave} disabled={saving}>
          {saving ? t('common.saving') : t('common.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
