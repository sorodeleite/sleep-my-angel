const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1080,
    height: 880,
    minWidth: 840,
    minHeight: 640,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#f5f5f6',
    icon: path.join(__dirname, 'assets', 'icon', '38f3b2b5d4fcc838e12253d7235e8e65.jpg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false
    }
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.on('window-control', (event, action) => {
  if (!mainWindow) return;
  if (action === 'minimize') mainWindow.minimize();
  if (action === 'maximize') {
    mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
  }
  if (action === 'close') mainWindow.close();
});

ipcMain.handle('get-audios', async () => {
  const audiosDir = path.join(__dirname, 'audios');
  const categories = ['chuva', 'meditacao', 'ondas'];
  const list = [];

  for (const cat of categories) {
    const dir = path.join(audiosDir, cat);
    if (!fs.existsSync(dir)) continue;

    const files = fs.readdirSync(dir);
    for (const f of files) {
      if (!f.match(/\.(m4a|mp3|wav|ogg)$/i)) continue;
      const fullPath = path.join(dir, f);
      const cleanName = f
        .replace(/\.(m4a|mp3|wav|ogg)$/i, '')
        .replace(/_/g, ' ');
      
      list.push({
        id: `${cat}-${f}`,
        title: cleanName,
        category: cat,
        filePath: fullPath,
        fileUrl: `file://${fullPath.replace(/\\/g, '/')}`,
        fileName: f
      });
    }
  }

  return list;
});

ipcMain.handle('select-audio-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const targetDir = result.filePaths[0];
  const files = fs.readdirSync(targetDir);
  return files
    .filter(f => f.match(/\.(m4a|mp3|wav|ogg)$/i))
    .map(f => {
      const fullPath = path.join(targetDir, f);
      return {
        id: `custom-${f}`,
        title: f.replace(/\.(m4a|mp3|wav|ogg)$/i, '').replace(/_/g, ' '),
        category: 'custom',
        filePath: fullPath,
        fileUrl: `file://${fullPath.replace(/\\/g, '/')}`,
        fileName: f
      };
    });
});

ipcMain.handle('save-script-file', async (event, content) => {
  const filePath = path.join(__dirname, 'script_offline.json');
  fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf-8');
  return true;
});

ipcMain.handle('get-script-file', async () => {
  const filePath = path.join(__dirname, 'script_offline.json');
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
});
