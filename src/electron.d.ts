export interface ElectronAPI {
    toggleFloating: (shouldFloat: boolean) => Promise<boolean>;
    resizeWindow: (width: number, height: number) => Promise<boolean>;
    findLexiconPort: () => Promise<number | null>;
    isElectron: boolean;
}

declare global {
    interface Window {
        electronAPI?: ElectronAPI;
    }
}
