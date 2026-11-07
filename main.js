const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

const AUDIO_PATTERN = /\.(m4a|mp3|wav|ogg|flac|opus|aac)$/i;
const CATEGORIES = ['meditacao', 'ondas'];
const WINDOW_WIDTH = 1180;
const WINDOW_HEIGHT = 900;

app.setAppUserModelId('com.u3unicornios.sleepmyangel');

let mainWindow = null;

function trackFromFile(category, filePath, prefix) {
  const fileName = path.basename(filePath);
  const title = fileName
    .replace(AUDIO_PATTERN, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return {
    id: prefix + '-' + fileName,
    title: title,
    category: category,
    fileName: fileName,
    filePath: filePath,
    fileUrl: pathToFileURL(filePath).href
  };
}

function tracksFromDirectory(category, directory, prefix) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory)
    .filter((fileName) => AUDIO_PATTERN.test(fileName))
    .sort((a, b) => a.localeCompare(b, 'pt-BR'))
    .map((fileName) => trackFromFile(category, path.join(directory, fileName), prefix));
}

function booksRoot() {
  return path.join(__dirname, 'assets', 'books');
}

function safeBookPath(relativePath) {
  if (typeof relativePath !== 'string') return null;
  const root = booksRoot();
  const target = path.resolve(__dirname, relativePath);
  if (target !== root && !target.startsWith(root + path.sep)) return null;
  if (!/\.(epub|pdf|txt|md)$/i.test(target)) return null;
  return target;
}

function scriptFile() {
  return path.join(app.getPath('userData'), 'script-da-noite.json');
}

function legacyScriptFile() {
  return path.join(__dirname, 'script_offline.json');
}

function readScript() {
  const candidates = [scriptFile(), legacyScriptFile()];
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    try {
      const parsed = JSON.parse(fs.readFileSync(file, 'utf-8'));
      if (parsed && typeof parsed.text === 'string') return parsed;
    } catch (error) {
      continue;
    }
  }
  return null;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    minWidth: 860,
    minHeight: 620,
    show: false,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#f4f4f5',
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'assets', 'icon', 'icon-512.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      spellcheck: false,
      backgroundThrottling: false
    }
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://')) event.preventDefault();
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.on('window-control', (event, action) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (!window) return;
  if (action === 'minimize') window.minimize();
  if (action === 'maximize') {
    if (window.isMaximized()) {
      window.unmaximize();
    } else {
      window.maximize();
    }
  }
  if (action === 'close') window.close();
});

ipcMain.handle('get-audios', () => {
  const tracks = [];
  CATEGORIES.forEach((category) => {
    tracks.push.apply(tracks, tracksFromDirectory(category, path.join(__dirname, 'audios', category), category));
  });
  return tracks;
});

ipcMain.handle('select-audio-folder', async () => {
  if (!mainWindow) return [];
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'escolha uma pasta de áudios',
    properties: ['openDirectory', 'multiSelections']
  });
  if (result.canceled) return [];
  const tracks = [];
  result.filePaths.forEach((directory) => {
    tracks.push.apply(tracks, tracksFromDirectory('custom', directory, 'custom-' + path.basename(directory)));
  });
  return tracks;
});

ipcMain.handle('save-script-file', (event, content) => {
  if (!content || typeof content.text !== 'string') return false;
  const target = scriptFile();
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const temporary = target + '.tmp';
  fs.writeFileSync(temporary, JSON.stringify({
    text: content.text,
    updated: typeof content.updated === 'string' ? content.updated : new Date().toISOString()
  }, null, 2), 'utf-8');
  fs.renameSync(temporary, target);
  return true;
});

ipcMain.handle('get-script-file', () => {
  return readScript();
});

ipcMain.handle('read-books-manifest', () => {
  const manifestPath = path.join(booksRoot(), 'manifest.json');
  if (!fs.existsSync(manifestPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  } catch (error) {
    return null;
  }
});

ipcMain.handle('read-book-file', (event, relativePath) => {
  const target = safeBookPath(relativePath);
  if (!target || !fs.existsSync(target)) return null;
  try {
    return fs.readFileSync(target);
  } catch (error) {
    return null;
  }
});
