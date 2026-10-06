import { WebSocket } from "ws";

export interface SessionPeer {
    peerId: string;
    socket: WebSocket;
    isPresenter: boolean;
}

export interface Session {
    sessionId: string;
    presenterPeerId: string;
    peers: Map<string, SessionPeer>;
    createdAt: number;
}

export class SessionService {
    private sessions = new Map<string, Session>();

    createSession(sessionId: string, presenterPeerId: string, socket: WebSocket): Session {
        const session: Session = {
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

    getSession(sessionId: string): Session | undefined {
        return this.sessions.get(sessionId);
    }

    addPeer(sessionId: string, peerId: string, socket: WebSocket): SessionPeer | null {
        const session = this.sessions.get(sessionId);
        if (!session) return null;

        const peer: SessionPeer = {
            peerId,
            socket,
            isPresenter: false,
        };

        session.peers.set(peerId, peer);
        return peer;
    }

    removePeer(sessionId: string, peerId: string): void {
        const session = this.sessions.get(sessionId);
        if (!session) return;

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