// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  notifyTimerFinished: () => ipcRenderer.send('timer-finished'),
  // Allow renderer to listen to tray/menu events
  onTrayStart: (cb) => ipcRenderer.on('tray:start-timer', cb),
  onTrayStop: (cb) => ipcRenderer.on('tray:stop-timer', cb),
  onMenuNewTask: (cb) => ipcRenderer.on('menu:new-task', cb),
  requestStartTimer: () => ipcRenderer.send('renderer:request-start-timer'),
  requestStopTimer: () => ipcRenderer.send('renderer:request-stop-timer'),
  saveRecap: (text) => ipcRenderer.invoke('save-recap', text),
  platform: process.platform
});
