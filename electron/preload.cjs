const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    toggleFloating: (shouldFloat) => ipcRenderer.invoke('toggle-floating', shouldFloat),
    isElectron: true
});
