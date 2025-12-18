export interface ElectronAPI {
    toggleFloating: (shouldFloat: boolean) => Promise<boolean>;
    isElectron: boolean;
}

declare global {
    interface Window {
        electronAPI?: ElectronAPI;
    }
}
