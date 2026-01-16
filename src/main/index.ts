import { app, BrowserWindow, shell } from 'electron';
import { join } from 'path';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import { initializeDatabase, disconnectDatabase } from './database/client';
import { registerIpcHandlers } from './ipc';

// 앱 아이콘 경로 (플랫폼별)
const getIconPath = (): string => {
  if (is.dev) {
    // 개발 환경: 프로젝트 루트의 build 폴더
    return join(__dirname, '../../build/icon.png');
  }
  // 프로덕션: 리소스 폴더
  return join(process.resourcesPath, 'icon.png');
};

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    icon: getIconPath(),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
    },
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.webContents.setWindowOpenHandler(details => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  // HMR for renderer
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

// App lifecycle
app.whenReady().then(async () => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.languageforest');

  // Default open or close DevTools by F12 in development
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  // Initialize database
  await initializeDatabase();

  // Register IPC handlers (로거 초기화 포함 - DB 준비 전 큐에 쌓인 로그들 flush)
  await registerIpcHandlers();

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', async () => {
  await disconnectDatabase();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Export mainWindow for IPC events
export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}
