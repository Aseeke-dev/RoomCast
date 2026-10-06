import { app, WebContents } from "electron";

export function setupSecurityHandlers(contents: WebContents) {
    // Deny opening unexpected new windows
    contents.setWindowOpenHandler(() => {
        return { action: "deny" };
    });

    // Prevent navigation outside local web content
    contents.on("will-navigate", (event, url) => {
        if (!url.startsWith("http://localhost") && !url.startsWith("file://")) {
            event.preventDefault();
        }
    });
}

export function enforceAppSecurity() {
    // Disable hardware acceleration or unnecessary global flags if needed
    app.on("web-contents-created", (_, contents) => {
        setupSecurityHandlers(contents);
    });
}