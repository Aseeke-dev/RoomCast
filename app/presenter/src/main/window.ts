import { app, BrowserWindow } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createMainWindow(): BrowserWindow {
    const preloadPath = path.resolve(__dirname, "../preload/index.cjs");
    const iconPath = app.isPackaged
        ? path.join(process.resourcesPath, "icon.ico")
        : path.resolve(__dirname, "../../build/icon.ico");

    const mainWindow = new BrowserWindow({
        width: 1100,
        height: 750,
        minWidth: 900,
        minHeight: 600,
        title: "RoomCast - Presenter Studio",
        icon: iconPath,
        webPreferences: {
            preload: preloadPath,
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
        },
    });

    mainWindow.webContents.on("preload-error", (_event, pathUsed, error) => {
        console.error(`[Preload Error] Failed to load ${pathUsed}:`, error);
    });

    if (process.env.NODE_ENV === "development") {
        mainWindow.loadURL("http://localhost:5173");
        mainWindow.webContents.openDevTools({ mode: "detach" });
    } else {
        mainWindow.loadFile(path.resolve(__dirname, "../renderer/index.html"));
    }

    return mainWindow;
}