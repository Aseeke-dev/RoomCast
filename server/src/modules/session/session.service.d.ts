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
export declare class SessionService {
    private sessions;
    createSession(sessionId: string, presenterPeerId: string, socket: WebSocket): Session;
    getSession(sessionId: string): Session | undefined;
    addPeer(sessionId: string, peerId: string, socket: WebSocket): SessionPeer | null;
    removePeer(sessionId: string, peerId: string): void;
}
//# sourceMappingURL=session.service.d.ts.map