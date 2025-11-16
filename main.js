// main.js
const { app, BrowserWindow, Tray, Menu, ipcMain, Notification, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let tray;
const isMac = process.platform === 'darwin';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile('buddy.html');

  // optional: open devtools in dev
  // mainWindow.webContents.openDevTools();
}

function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'icon.png');
  tray = new Tray(iconPath);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Start Timer',
      click: () => {
        if (mainWindow) mainWindow.webContents.send('tray:start-timer');
      }
    },
    {
      label: 'Stop Timer',
      click: () => {
        if (mainWindow) mainWindow.webContents.send('tray:stop-timer');
      }
    },
    { type: 'separator' },
    {
      label: 'Show/Hide',
      click: () => {
        if (!mainWindow) return;
        if (mainWindow.isVisible()) mainWindow.hide();
        else mainWindow.show();
      }
    },
    {
      label: 'Always on Top',
      type: 'checkbox',
      checked: false,
      click: (menuItem) => {
        if (mainWindow) mainWindow.setAlwaysOnTop(menuItem.checked);
      }
    },
    { type: 'separator' },
    {
      label: 'Quit Buddy',
      role: 'quit'
    }
  ]);

  tray.setContextMenu(contextMenu);
  tray.setToolTip('Buddy — Stay Accountable, Learn Smarter');

  // double-click toggles the window
  tray.on('double-click', () => {
    if (!mainWindow) return;
    if (mainWindow.isVisible()) mainWindow.hide();
    else mainWindow.show();
  });
}

function setupAppMenu() {
  const template = [
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'quit' }
      ]
    }] : []),
    {
      label: 'File',
      submenu: [
        { label: 'New Task', click: () => mainWindow.webContents.send('menu:new-task') },
        { role: 'quit' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggledevtools' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Open docs',
          click: () => mainWindow.webContents.openExternal('https://your-docs-or-help-url.example')
        }
      ]
    }
  ];
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Handle "timer finished" coming from renderer
ipcMain.on('timer-finished', () => {
  new Notification({
    title: 'Buddy',
    body: '⏱️ Your study timer finished! Great work 🎉'
  }).show();

  if (mainWindow) {
    mainWindow.flashFrame(true);
    setTimeout(() => mainWindow.flashFrame(false), 3000);
  }
});

// Tray->renderer controls (if renderer wants to start/stop)
ipcMain.on('renderer:request-start-timer', () => {
  if (mainWindow) mainWindow.webContents.send('tray:start-timer');
});
ipcMain.on('renderer:request-stop-timer', () => {
  if (mainWindow) mainWindow.webContents.send('tray:stop-timer');
});

// Save recap (invoked from renderer)
ipcMain.handle('save-recap', async (_, recapData) => {
  try {
    // ask user where to save or default to Documents
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Save Recap',
      defaultPath: path.join(app.getPath('documents'), `recap-${Date.now()}.txt`),
      filters: [{ name: 'Text', extensions: ['txt'] }]
    });

    if (canceled || !filePath) return { success: false, message: 'Save canceled' };

    const content = `Recap Session\nTime: ${new Date().toLocaleString()}\n\n${recapData}\n`;
    fs.writeFileSync(filePath, content, 'utf8');
    return { success: true, filePath };
  } catch (err) {
    console.error('Error saving recap:', err);
    return { success: false, message: err.message };
  }
});

// Auto-launch (enable at first run)
function enableAutoLaunch() {
  try {
    if (process.platform === 'win32' || process.platform === 'linux') {
      app.setLoginItemSettings({
        openAtLogin: true,
        path: process.execPath
      });
    } else if (process.platform === 'darwin') {
      app.setLoginItemSettings({
        openAtLogin: true
      });
    }
  } catch (e) {
    console.warn('Auto launch setup failed', e);
  }
}

app.whenReady().then(() => {
  createWindow();
  createTray();
  setupAppMenu();
  enableAutoLaunch();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
