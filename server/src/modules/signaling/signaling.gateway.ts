import { FastifyInstance } from "fastify";
import { WebSocket } from "ws";
import { SignalingMessageSchema } from "@roomcast/protocol";
import { SessionService } from "../session/session.service.js";

export function registerSignalingGateway(
    fastify: FastifyInstance,
    sessionService: SessionService
) {
    fastify.get("/signaling", { websocket: true }, (socket: WebSocket /*, req */) => {
        let currentSessionId: string | null = null;
        let currentPeerId: string | null = null;

        socket.on("message", (rawMessage: Buffer | string) => {
            try {
                const json = JSON.parse(rawMessage.toString());
                const parseResult = SignalingMessageSchema.safeParse(json);

                if (!parseResult.success) {
                    socket.send(
                        JSON.stringify({
                            type: "ERROR",
                            message: "Invalid protocol message format",
                            details: parseResult.error.issues,
                        })
                    );
                    return;
                }

                const msg = parseResult.data;

                switch (msg.type) {
                    case "JOIN_SESSION": {
                        currentSessionId = msg.sessionId;
                        currentPeerId = msg.peerId;

                        let session = sessionService.getSession(msg.sessionId);

                        // First peer to join becomes the Presenter session host
                        if (!session) {
                            session = sessionService.createSession(msg.sessionId, msg.peerId, socket);
                        } else {
                            sessionService.addPeer(msg.sessionId, msg.peerId, socket);

                            // Notify presenter that a new audience peer has joined
                            const presenter = session.peers.get(session.presenterPeerId);
                            if (presenter && presenter.socket.readyState === WebSocket.OPEN) {
                                presenter.socket.send(
                                    JSON.stringify({
                                        type: "PEER_JOINED",
                                        peerId: msg.peerId,
                                    })
                                );
                            }
                        }
                        break;
                    }

                    case "OFFER":
                    case "ANSWER":
                    case "ICE_CANDIDATE": {
                        if (!currentSessionId) return;
                        const session = sessionService.getSession(currentSessionId);
                        if (!session) return;

                        // Direct signaling payload route to target peer socket
                        const targetPeer = session.peers.get(msg.targetPeerId);
                        if (targetPeer && targetPeer.socket.readyState === WebSocket.OPEN) {
                            targetPeer.socket.send(JSON.stringify(msg));
                        }
                        break;
                    }
                }
            } catch (err) {
                socket.send(
                    JSON.stringify({ type: "ERROR", message: "Failed to parse JSON payload" })
                );
            }
        });

        socket.on("close", () => {
            if (currentSessionId && currentPeerId) {
                const session = sessionService.getSession(currentSessionId);
                if (session) {
                    sessionService.removePeer(currentSessionId, currentPeerId);

                    // Notify presenter if an audience peer leaves
                    const presenter = session.peers.get(session.presenterPeerId);
                    if (presenter && presenter.socket.readyState === WebSocket.OPEN) {
                        presenter.socket.send(
                            JSON.stringify({
                                type: "PEER_LEFT",
                                peerId: currentPeerId,
                            })
                        );
                    }
                }
            }
        });
    });
}