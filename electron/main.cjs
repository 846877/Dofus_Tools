// Processus principal Electron : ouvre l'application Dofus Tools dans une fenêtre de bureau.
const { app, BrowserWindow, shell, Menu, ipcMain, net } = require('electron');
const path = require('node:path');

const DEV_URL = process.env.VITE_DEV_SERVER_URL;

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: 'Dofus Tools',
    backgroundColor: '#14161b',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  // Les liens externes (guides, encyclopédie…) s'ouvrent dans le navigateur par défaut.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  if (DEV_URL) win.loadURL(DEV_URL);
  else win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

// Requêtes vers les API de données Dofus, faites depuis le processus principal.
const ALLOWED_HOSTS = new Set(['api.dofusdu.de', 'api.dofusdb.fr']);
ipcMain.handle('fetch-json', async (_event, url) => {
  const u = new URL(url);
  if (u.protocol !== 'https:' || !ALLOWED_HOSTS.has(u.hostname)) {
    return { ok: false, status: 0, error: `Hôte non autorisé : ${u.hostname}` };
  }
  try {
    const res = await net.fetch(u.toString(), { headers: { Accept: 'application/json' } });
    const text = await res.text();
    if (!res.ok) return { ok: false, status: res.status, error: `${res.status} ${res.statusText} ${text.slice(0, 200)}` };
    return { ok: true, status: res.status, data: JSON.parse(text) };
  } catch (e) {
    return { ok: false, status: 0, error: String(e && e.message ? e.message : e) };
  }
});

// Une seule instance de l'application à la fois.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const [win] = BrowserWindow.getAllWindows();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    createWindow();
    app.on('activate', () => BrowserWindow.getAllWindows().length === 0 && createWindow());
  });
  app.on('window-all-closed', () => process.platform !== 'darwin' && app.quit());
}
