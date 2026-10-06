import Fastify from "fastify";
import fastifyWebsocket from "@fastify/websocket";
import fastifyStatic from "@fastify/static";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SessionService } from "./modules/session/session.service.js";
import { registerSignalingGateway } from "./modules/signaling/signaling.gateway.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export function buildApp() {
    const app = Fastify({ logger: true });
    const sessionService = new SessionService();
    // Register WebSocket plugin
    app.register(fastifyWebsocket);
    // Serve Audience Receiver SPA static assets
    const viewerDistPath = path.join(__dirname, "../../apps/viewer/dist");
    app.register(fastifyStatic, {
        root: viewerDistPath,
        prefix: "/",
        wildcard: false,
    });
    // Health check endpoint
    app.get("/health", async () => {
        return { status: "ok", service: "RoomCast Signaling Server" };
    });
    // Catch-all route serving viewer SPA index.html for client-side routing
    app.get("/view/*", async (request, reply) => {
        return reply.sendFile("index.html");
    });
    // Register WebRTC signaling routes
    app.after(() => {
        registerSignalingGateway(app, sessionService);
    });
    return app;
}
//# sourceMappingURL=app.js.map