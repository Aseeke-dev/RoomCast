import { contextBridge, ipcRenderer } from "electron";

const desktopAPI = {
    getDisplays: () => ipcRenderer.invoke("desktop:get-displays"),
    getNetworkInfo: () => ipcRenderer.invoke("desktop:get-network-info"),
    startServer: (port?: number) => ipcRenderer.invoke("desktop:start-server", port),
    stopServer: () => ipcRenderer.invoke("desktop:stop-server"),
};

try {
    contextBridge.exposeInMainWorld("desktop", desktopAPI);
    console.log("[Preload] Successfully exposed window.desktop bridge");
} catch (error) {
    console.error("[Preload] Error exposing context bridge:", error);
}