import { WebSocket } from "ws";
export class SessionService {
    sessions = new Map();
    createSession(sessionId, presenterPeerId, socket) {
        const session = {
            sessionId,
            presenterPeerId,
            peers: new Map(),
            createdAt: Date.now(),
        };
        session.peers.set(presenterPeerId, {
            peerId: presenterPeerId,
            socket,
            isPresenter: true,
        });
        this.sessions.set(sessionId, session);
        return session;
    }
    getSession(sessionId) {
        return this.sessions.get(sessionId);
    }
    addPeer(sessionId, peerId, socket) {
        const session = this.sessions.get(sessionId);
        if (!session)
            return null;
        const peer = {
            peerId,
            socket,
            isPresenter: false,
        };
        session.peers.set(peerId, peer);
        return peer;
    }
    removePeer(sessionId, peerId) {
        const session = this.sessions.get(sessionId);
        if (!session)
            return;
        session.peers.delete(peerId);
        // If presenter leaves, destroy session and notify all remaining peers
        if (peerId === session.presenterPeerId) {
            session.peers.forEach((peer) => {
                if (peer.socket.readyState === WebSocket.OPEN) {
                    peer.socket.send(JSON.stringify({ type: "SESSION_ENDED" }));
                }
            });
            this.sessions.delete(sessionId);
        }
    }
}
//# sourceMappingURL=session.service.js.map