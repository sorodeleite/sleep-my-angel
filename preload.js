const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  platform: 'desktop',
  windowControl: (action) => ipcRenderer.send('window-control', action),
  getAudios: () => ipcRenderer.invoke('get-audios'),
  selectAudioFolder: () => ipcRenderer.invoke('select-audio-folder'),
  saveScriptFile: (content) => ipcRenderer.invoke('save-script-file', content),
  getScriptFile: () => ipcRenderer.invoke('get-script-file'),
  readBooksManifest: () => ipcRenderer.invoke('read-books-manifest'),
  readBookFile: (relativePath) => ipcRenderer.invoke('read-book-file', relativePath),
  fetchPinterest: (url) => ipcRenderer.invoke('fetch-pinterest', url),
  fetchPinterestImage: (url) => ipcRenderer.invoke('fetch-pinterest-image', url),
  fetchPinterestResource: (payload) => ipcRenderer.invoke('fetch-pinterest-resource', payload)
});
