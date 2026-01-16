import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import GlobalDialog from './components/common/GlobalDialog';
import GlobalSnackbar from './components/common/GlobalSnackbar';
import LogsPage from './pages/LogsPage';
import TranslationPage from './pages/TranslationPage';

function App() {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  );
}

export default App;
