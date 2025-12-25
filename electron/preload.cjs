const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    toggleFloating: (shouldFloat) => ipcRenderer.invoke('toggle-floating', shouldFloat),
    resizeWindow: (width, height) => ipcRenderer.invoke('resize-window', width, height),
    findLexiconPort: () => ipcRenderer.invoke('find-lexicon-port'),
    isElectron: true
});
