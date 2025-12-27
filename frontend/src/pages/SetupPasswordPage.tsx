import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Box, Button } from '@mui/material';
import { Lock } from '@mui/icons-material';
import { useAuthStore } from '../stores/authStore';
import { PasswordSchema } from '@languageforest/sharedtype';
import AuthPageLayout from '../components/common/AuthPageLayout';
import PasswordField from '../components/common/PasswordField';
import { snackbar } from '../stores/snackbarStore';

export default function SetupPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setup, isLoading } = useAuthStore();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 비밀번호 확인 검증
    if (password !== confirmPassword) {
      snackbar.warning(t('auth.setup.passwordMismatch'));
      return;
    }

    // Zod 스키마로 비밀번호 검증
    try {
      PasswordSchema.parse(password);
    } catch (err) {
      const zodError = err as { errors?: Array<{ message: string }> };
      snackbar.warning(zodError.errors?.[0]?.message || t('auth.setup.invalidFormat'));
      return;
    }

    try {
      await setup({ password });
      navigate('/');
    } catch {
      // 에러는 snackbar로 표시됨
    }
  };

  return (
    <AuthPageLayout icon={<Lock sx={{ fontSize: 32, color: 'white' }} />} title={t('common.appName')} subtitle={t('auth.setup.subtitle')}>
      <Box component='form' onSubmit={handleSubmit} sx={{ width: '100%' }}>
        <PasswordField
          margin='normal'
          required
          fullWidth
          name='password'
          label={t('auth.setup.password')}
          id='password'
          autoComplete='new-password'
          value={password}
          onChange={e => setPassword(e.target.value)}
          helperText={t('auth.setup.passwordHelper')}
        />

        <PasswordField
          margin='normal'
          required
          fullWidth
          name='confirmPassword'
          label={t('auth.setup.confirmPassword')}
          id='confirmPassword'
          autoComplete='new-password'
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
        />

        <Button type='submit' fullWidth size='large' variant='contained' sx={{ mt: 2 }} disabled={isLoading}>
          {isLoading ? t('auth.setup.submitting') : t('auth.setup.submit')}
        </Button>
      </Box>
    </AuthPageLayout>
  );
}
