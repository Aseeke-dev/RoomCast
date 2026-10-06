import { app, BrowserWindow, ipcMain, Menu } from "electron";
import { createMainWindow } from "./window.js";
import { enforceAppSecurity } from "./security.js";
import { registerPermissionHandlers } from "./permissions.js";
import { startEmbeddedServer, stopEmbeddedServer, getLocalHostIp } from "./server-manager.js";

app.disableHardwareAcceleration();
app.whenReady().then(async () => {
    Menu.setApplicationMenu(null);
    enforceAppSecurity();
    registerPermissionHandlers();

    // IPC Handlers for server control
    ipcMain.handle("desktop:start-server", async (_, port) => startEmbeddedServer(port));
    ipcMain.handle("desktop:stop-server", async () => stopEmbeddedServer());
    ipcMain.handle("desktop:get-network-info", async () => ({
        localIp: getLocalHostIp(),
        port: 8080,
    }));

    // Auto-start embedded Fastify server
    await startEmbeddedServer(8080);

    createMainWindow();

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createMainWindow();
        }
    });
});

app.on("window-all-closed", async () => {
    await stopEmbeddedServer();
    if (process.platform !== "darwin") {
        app.quit();
    }
});