import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box, Typography } from '@mui/material';
import type { TranslationSession, CreateSessionRequest, UpdateSessionRequest } from '@languageforest/sharedtype';

// ============================================
// Props
// ============================================

interface SessionDialogProps {
  open: boolean;
  session?: TranslationSession | null; // null = 새로 생성
  onClose: () => void;
  onCreate?: (data: CreateSessionRequest) => Promise<void>;
  onUpdate?: (id: string, data: UpdateSessionRequest) => Promise<void>;
}

// ============================================
// 세션 다이얼로그
// ============================================

export default function SessionDialog({ open, session, onClose, onCreate, onUpdate }: SessionDialogProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [memo, setMemo] = useState('');
  const [customDict, setCustomDict] = useState('');
  const [loading, setLoading] = useState(false);

  const isEdit = Boolean(session);

  // 세션 데이터로 폼 초기화
  useEffect(() => {
    if (open) {
      if (session) {
        setTitle(session.title);
        setMemo(session.memo || '');
        setCustomDict(session.customDict || '');
      } else {
        setTitle('');
        setMemo('');
        setCustomDict('');
      }
    }
  }, [open, session]);

  const handleSubmit = async () => {
    if (!title.trim()) return;

    setLoading(true);
    try {
      if (isEdit && session && onUpdate) {
        await onUpdate(session.id, {
          title: title.trim(),
          memo: memo.trim() || undefined,
          customDict: customDict.trim() || undefined,
        });
      } else if (onCreate) {
        await onCreate({
          title: title.trim(),
          memo: memo.trim() || undefined,
          customDict: customDict.trim() || undefined,
        });
      }
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth='sm' fullWidth>
      <DialogTitle>{isEdit ? t('translation.editSession') : t('translation.newSession')}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
          {/* 제목 */}
          <TextField
            label={t('translation.sessionTitle')}
            value={title}
            onChange={e => setTitle(e.target.value)}
            fullWidth
            required
            autoFocus
            inputProps={{ maxLength: 200 }}
          />

          {/* 메모 */}
          <TextField
            label={t('translation.sessionMemo')}
            value={memo}
            onChange={e => setMemo(e.target.value)}
            fullWidth
            multiline
            rows={2}
            placeholder={t('translation.sessionMemoPlaceholder')}
          />

          {/* 사용자 사전 */}
          <Box>
            <Typography variant='subtitle2' gutterBottom>
              {t('translation.customDict')}
            </Typography>
            <Typography variant='caption' color='text.secondary' gutterBottom sx={{ display: 'block', mb: 1 }}>
              {t('translation.customDictHelp')}
            </Typography>
            <TextField
              value={customDict}
              onChange={e => setCustomDict(e.target.value)}
              fullWidth
              multiline
              rows={4}
              placeholder={t('translation.customDictPlaceholder')}
              sx={{
                '& .MuiInputBase-input': {
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                },
              }}
            />
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={loading}>
          {t('common.cancel')}
        </Button>
        <Button variant='contained' onClick={handleSubmit} disabled={!title.trim() || loading}>
          {isEdit ? t('common.save') : t('common.create')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
