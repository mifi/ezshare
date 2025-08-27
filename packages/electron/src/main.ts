// eslint-disable-next-line import/no-extraneous-dependencies
import { app, BrowserWindow, ipcMain } from 'electron';
import { join } from 'node:path';

import Ezshare, { parseArgs } from '@ezshare/lib';


declare global {
  const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
  const MAIN_WINDOW_VITE_NAME: string;
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: true,
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(join(__dirname, '..', 'renderer', MAIN_WINDOW_VITE_NAME, 'index.html'));
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

(async () => {
  await app.whenReady();

  const ignoreFirstArgs = process.defaultApp ? 2 : 1;
  // production: First arg is the LosslessCut executable
  // dev: First 2 args are electron and the index.js
  const argsWithoutAppName = process.argv.length > ignoreFirstArgs ? process.argv.slice(ignoreFirstArgs) : [];

  const args = parseArgs(argsWithoutAppName);
  const webPath = app.isPackaged ? join(process.resourcesPath, 'dist') : join(__dirname, '..', '..', '..', 'web', 'dist');
  const { start, runStartupCheck, getUrls } = Ezshare({ ...args, webPath });

  const urls = getUrls();
  if (urls.length === 0) {
    console.warn('No network interfaces detected.');
  } else {
    await runStartupCheck();

    await start();

    console.log('Server listening');

    ipcMain.handle('getData', async () => ({
      urls,
    }));

    createWindow();
  }
// eslint-disable-next-line unicorn/prefer-top-level-await
})().catch((err) => console.error(err));
