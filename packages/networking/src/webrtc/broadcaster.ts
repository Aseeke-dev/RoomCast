import type { SignalingMessage } from "@roomcast/protocol";

export interface PeerConnectionCallbacks {
    onSignal: (msg: SignalingMessage) => void;
    onPeerConnected?: (peerId: string) => void;
    onPeerDisconnected?: (peerId: string) => void;
}

export class WebRTCBroadcaster {
    private peers = new Map<string, RTCPeerConnection>();
    private pendingIceCandidates = new Map<string, RTCIceCandidateInit[]>();
    private mediaStream: MediaStream | null = null;
    private callbacks: PeerConnectionCallbacks;

    constructor(callbacks: PeerConnectionCallbacks) {
        this.callbacks = callbacks;
    }

    setStream(stream: MediaStream) {
        this.mediaStream = stream;
        // Replace tracks on existing peer connections if stream changes
        this.peers.forEach((peer) => {
            const senders = peer.getSenders();
            stream.getTracks().forEach((track) => {
                const sender = senders.find((s) => s.track?.kind === track.kind);
                if (sender) {
                    sender.replaceTrack(track);
                } else {
                    peer.addTrack(track, stream);
                }
            });
        });
    }

    async handlePeerJoined(peerId: string, presenterPeerId: string) {
        if (this.peers.has(peerId)) return;

        const pc = new RTCPeerConnection({
            iceServers: [], // LAN environment - zero external STUN/TURN servers required
        });

        this.peers.set(peerId, pc);

        pc.onnegotiationneeded = async () => {
            try {
                if (pc.signalingState !== "stable") return;

                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);

                const sdp = pc.localDescription?.sdp;
                if (!sdp) {
                    throw new Error("WebRTC offer did not contain an SDP description");
                }

                this.callbacks.onSignal({
                    type: "OFFER",
                    targetPeerId: peerId,
                    senderPeerId: presenterPeerId,
                    sdp,
                });
            } catch (error) {
                console.error(`Failed to negotiate WebRTC connection for peer ${peerId}:`, error);
            }
        };

        // Attach active media tracks to peer connection
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach((track) => {
                pc.addTrack(track, this.mediaStream!);
            });
        }

        // ICE Candidate Gathering
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                console.info(`[Presenter] Local ICE candidate for ${peerId}:`, event.candidate.candidate);
                this.callbacks.onSignal({
                    type: "ICE_CANDIDATE",
                    targetPeerId: peerId,
                    senderPeerId: presenterPeerId,
                    candidate: {
                        candidate: event.candidate.candidate,
                        sdpMid: event.candidate.sdpMid,
                        sdpMLineIndex: event.candidate.sdpMLineIndex,
                    },
                });
            }
        };

        pc.onconnectionstatechange = () => {
            console.info(`[Presenter] WebRTC connection state for ${peerId}:`, pc.connectionState);
            if (pc.connectionState === "connected") {
                this.callbacks.onPeerConnected?.(peerId);
            } else if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
                this.removePeer(peerId);
            }
        };
        pc.oniceconnectionstatechange = () => {
            console.info(`[Presenter] ICE connection state for ${peerId}:`, pc.iceConnectionState);
        };
    }

    async handleAnswer(peerId: string, sdp: string) {
        const pc = this.peers.get(peerId);
        if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription({ type: "answer", sdp }));
            for (const candidate of this.pendingIceCandidates.get(peerId) ?? []) {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
            }
            this.pendingIceCandidates.delete(peerId);
        }
    }

    async handleIceCandidate(peerId: string, candidate: RTCIceCandidateInit) {
        const pc = this.peers.get(peerId);
        if (!pc || !pc.remoteDescription) {
            const candidates = this.pendingIceCandidates.get(peerId) ?? [];
            candidates.push(candidate);
            this.pendingIceCandidates.set(peerId, candidates);
            return;
        }

        await pc.addIceCandidate(new RTCIceCandidate(candidate));
    }

    removePeer(peerId: string) {
        const pc = this.peers.get(peerId);
        if (pc) {
            pc.close();
            this.peers.delete(peerId);
            this.pendingIceCandidates.delete(peerId);
            this.callbacks.onPeerDisconnected?.(peerId);
        }
    }

    stopAll() {
        this.peers.forEach((pc) => pc.close());
        this.peers.clear();
        this.pendingIceCandidates.clear();
    }
}