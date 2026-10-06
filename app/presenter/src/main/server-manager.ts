import os from "node:os";
import path from "node:path";
import { app } from "electron";
import { buildApp } from "server/app";

let serverInstance: ReturnType<typeof buildApp> | null = null;
let activePort = 8080;

export function getLocalHostIp(): string {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        if (name.toLowerCase().includes("veth") || name.toLowerCase().includes("docker") || name.toLowerCase().includes("wsl")) {
            continue;
        }

        for (const iface of interfaces[name] || []) {
            if (iface.family === "IPv4" && !iface.internal) {
                return iface.address;
            }
        }
    }
    return "127.0.0.1";
}

export async function startEmbeddedServer(port = 8080) {
    if (serverInstance) {
        return { success: true, port: activePort, localIp: getLocalHostIp() };
    }

    const viewerDistPath = app.isPackaged
        ? path.join(process.resourcesPath, "viewer")
        : undefined;
    serverInstance = viewerDistPath ? buildApp(viewerDistPath) : buildApp();
    activePort = port;

    await serverInstance.listen({ port, host: "0.0.0.0" });
    return { success: true, port, localIp: getLocalHostIp() };
}

export async function stopEmbeddedServer() {
    if (serverInstance) {
        await serverInstance.close();
        serverInstance = null;
    }
    return { success: true };
}