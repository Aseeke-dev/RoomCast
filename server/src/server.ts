import { buildApp } from "./app.js";

const app = buildApp();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;
const HOST = "0.0.0.0"; // Bind to all network interfaces for LAN reachability

app.listen({ port: PORT, host: HOST }, (err, address) => {
    if (err) {
        app.log.error(err);
        process.exit(1);
    }
    app.log.info(`RoomCast Server listening on ${address}`);
});