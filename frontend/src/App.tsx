import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import { useAuthStore } from './stores/authStore';
import Layout from './components/Layout';
import GlobalDialog from './components/common/GlobalDialog';
import GlobalSnackbar from './components/common/GlobalSnackbar';
import SetupPasswordPage from './pages/SetupPasswordPage';
import LoginPage from './pages/LoginPage';
import LogsPage from './pages/LogsPage';
import TranslationPage from './pages/TranslationPage';

// 인증 상태에 따른 라우팅 로직
function AuthRouter() {
  const { isSetup, isAuthenticated, isLoading, checkStatus } = useAuthStore();

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // 로딩 중일 때
  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
        }}
      >
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Routes>
      {/* 비밀번호가 설정되지 않은 경우 */}
      {!isSetup && (
        <>
          <Route element={<Layout />}>
            <Route path='/' element={<SetupPasswordPage />} />
          </Route>
          <Route path='*' element={<Navigate to='/' replace />} />
        </>
      )}

      {/* 비밀번호는 설정되었지만 로그인하지 않은 경우 */}
      {isSetup && !isAuthenticated && (
        <>
          <Route element={<Layout />}>
            <Route path='/' element={<LoginPage />} />
          </Route>
          <Route path='*' element={<Navigate to='/' replace />} />
        </>
      )}

      {/* 로그인된 경우 */}
      {isSetup && isAuthenticated && (
        <>
          <Route element={<Layout />}>
            <Route path='/logs' element={<LogsPage />} />
            <Route path='/translation' element={<TranslationPage />} />
            <Route path='/' element={<Navigate to='/translation' replace />} />
          </Route>
          <Route path='*' element={<Navigate to='/translation' replace />} />
        </>
      )}
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthRouter />
      <GlobalDialog />
      <GlobalSnackbar />
    </BrowserRouter>
  );
}

export default App;
