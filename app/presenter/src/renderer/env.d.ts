import type { DesktopAPI } from "../preload/api.js";

declare global {
    interface Window {
        desktop: DesktopAPI;
    }
}

export { };