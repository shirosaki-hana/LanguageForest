import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import GlobalDialog from './components/common/GlobalDialog';
import GlobalSnackbar from './components/common/GlobalSnackbar';
import LogsPage from './pages/LogsPage';
import TranslationPage from './pages/TranslationPage';

function App() {
  return (
    // Electron에서는 HashRouter 사용 (파일 기반 라우팅)
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path='/logs' element={<LogsPage />} />
          <Route path='/translation' element={<TranslationPage />} />
          <Route path='/' element={<Navigate to='/translation' replace />} />
        </Route>
        <Route path='*' element={<Navigate to='/translation' replace />} />
      </Routes>
      <GlobalDialog />
      <GlobalSnackbar />
    </HashRouter>
  );
}

export default App;
