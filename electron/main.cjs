const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { exec } = require('child_process');

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

    // State for Window Positioning
    let lastCollapsedBounds = null;
    let initialExpandedBounds = null;

    // Toggle Floating Mode IPC
    ipcMain.handle('toggle-floating', (event, shouldFloat) => {
        if (shouldFloat) {
            // Remove minimum size constraints to allow icon sizing
            mainWindow.setMinimumSize(1, 1);
            mainWindow.setAlwaysOnTop(true, 'floating');
            mainWindow.setVisibleOnAllWorkspaces(true);
            // Default to a small size if none provided, though widget usually resizes immediately
            mainWindow.setSize(60, 60, true);
        } else {
            // Restore standard constraints
            mainWindow.setMinimumSize(400, 300);
            mainWindow.setAlwaysOnTop(false);
            mainWindow.setVisibleOnAllWorkspaces(false);
            mainWindow.setSize(1000, 800, true);
            mainWindow.center();
        }
        return true;
    });

    // Resize Window IPC with Position Memory
    ipcMain.handle('resize-window', (event, width, height) => {
        const isExpanding = width > 120; // Heuristic: Icon is usually 60-80px
        const isCollapsing = width <= 120;
        const currentBounds = mainWindow.getBounds();

        if (isExpanding) {
            // 1. Save current small position
            lastCollapsedBounds = currentBounds;

            // 2. Calculate Safe Bounds (Keep on screen)
            const display = require('electron').screen.getDisplayMatching(currentBounds);
            const workArea = display.workArea; // Taking into account dock/menubar

            let newX = currentBounds.x;
            let newY = currentBounds.y;

            // Clamp Right
            if (newX + width > workArea.x + workArea.width) {
                newX = (workArea.x + workArea.width) - width - 10; // 10px padding
            }
            // Clamp Left
            if (newX < workArea.x) {
                newX = workArea.x + 10;
            }
            // Clamp Bottom
            if (newY + height > workArea.y + workArea.height) {
                newY = (workArea.y + workArea.height) - height - 10;
            }
            // Clamp Top
            if (newY < workArea.y) {
                newY = workArea.y + 10;
            }

            // 3. Apply New Bounds
            mainWindow.setBounds({ x: newX, y: newY, width, height }, true);
            initialExpandedBounds = { x: newX, y: newY };

        } else if (isCollapsing) {
            // 1. Check if user moved the window significantly
            let hasMoved = false;
            if (initialExpandedBounds) {
                const limit = 20; // Tolerance pixels
                if (Math.abs(currentBounds.x - initialExpandedBounds.x) > limit ||
                    Math.abs(currentBounds.y - initialExpandedBounds.y) > limit) {
                    hasMoved = true;
                }
            }

            if (!hasMoved && lastCollapsedBounds) {
                // Restore to original icon position
                mainWindow.setBounds({
                    x: lastCollapsedBounds.x,
                    y: lastCollapsedBounds.y,
                    width,
                    height
                }, true);
            } else {
                // Standard Resize (stays at current top-left)
                mainWindow.setSize(width, height, true);
            }
        } else {
            // Fallback for standard resize
            mainWindow.setSize(width, height, true);
        }

        return true;
    });

    // Find Lexicon Port IPC
    ipcMain.handle('find-lexicon-port', async () => {
        return new Promise((resolve) => {
            // Command to find processes named "Lexicon" listening on TCP ports
            // Mac-specific primarily but grep is general
            const cmd = `lsof -n -iTCP -sTCP:LISTEN -P | grep Lexicon`;

            exec(cmd, (error, stdout, stderr) => {
                if (error || !stdout) {
                    console.log('Lexicon discovery failed:', error?.message);
                    resolve(null);
                    return;
                }

                // Output format example:
                // Lexicon ... TCP *:48624 (LISTEN)
                // We need to extract the port number
                const lines = stdout.split('\n');
                for (const line of lines) {
                    if (line.includes('LISTEN')) {
                        // Regex to find port at end of address (e.g., *:48624 or 127.0.0.1:1337)
                        const match = line.match(/:(\d+)\s+\(LISTEN\)/);
                        if (match && match[1]) {
                            const port = parseInt(match[1], 10);
                            // Avoid standard ports if they happen to appear? No, trust the listen.
                            console.log('Found Lexicon port:', port);
                            resolve(port);
                            return;
                        }
                    }
                }
                resolve(null);
            });
        });
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
