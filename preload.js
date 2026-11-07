const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  platform: 'desktop',
  windowControl: (action) => ipcRenderer.send('window-control', action),
  getAudios: () => ipcRenderer.invoke('get-audios'),
  selectAudioFolder: () => ipcRenderer.invoke('select-audio-folder'),
  saveScriptFile: (content) => ipcRenderer.invoke('save-script-file', content),
  getScriptFile: () => ipcRenderer.invoke('get-script-file')
});
