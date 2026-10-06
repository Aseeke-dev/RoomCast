export interface DesktopAPI {
    getDisplays: () => Promise<Array<{ id: string; name: string; thumbnail: string }>>;
    getNetworkInfo: () => Promise<{ localIp: string; port: number }>;
    startServer: (port?: number) => Promise<{ success: boolean; port: number; localIp: string }>;
    stopServer: () => Promise<{ success: boolean }>;
}