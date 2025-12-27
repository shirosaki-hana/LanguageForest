import { Box } from '@mui/material';
import { Outlet } from 'react-router-dom';
import SettingsDialog from './SettingsDialog';

export default function Layout() {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Outlet />
      </Box>
      <SettingsDialog />
    </Box>
  );
}
