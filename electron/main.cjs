const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
// if (require('electron-squirrel-startup')) {
//    app.quit();
// }

const createWindow = () => {
    // Determine if we are in development mode
    const isDev = !app.isPackaged;

    // Create the browser window.
    const mainWindow = new BrowserWindow({
        width: 1000,
        height: 800,
        minWidth: 400,
        minHeight: 300,
        // FLOAT MODE CONFIGURATION
        frame: false,           // No standard title bar
        transparent: true,      // Allow transparency
        alwaysOnTop: false,     // Default to false, toggleable
        hasShadow: false,       // Remove shadow for tighter icon feel
        // titleBarStyle: 'hiddenInset', // REMOVED: We want zero chrome
        // vibrancy: 'under-window', // REMOVED: We want pure transparency for the shape
        visualEffectState: 'active',
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    // Toggle Floating Mode IPC
    ipcMain.handle('toggle-floating', (event, shouldFloat) => {
        mainWindow.setAlwaysOnTop(shouldFloat, 'floating');
        mainWindow.setVisibleOnAllWorkspaces(shouldFloat); // Visible on all desktops
        // We might want to adjust the size or look here too
        if (shouldFloat) {
            // Initial float size - matched to collapsed state for now, or expanded?
            // Let's default to a reasonable "Expanded" size for initial float toggle if we don't have partial state
            // Actually, the widget will immediately resize it likely.
            // mainWindow.setSize(350, 600); 
        } else {
            mainWindow.setSize(1000, 800);
            mainWindow.center();
        }
        return true;
    });

    // Resize Window IPC
    ipcMain.handle('resize-window', (event, width, height) => {
        mainWindow.setSize(width, height, true); // true = animate on mac
        return true;
    });

    if (isDev) {
        // In dev, wait for vite server
        console.log('Running in development mode');
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools({ mode: 'detach' });
    } else {
        // In prod, load the local index.html
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
