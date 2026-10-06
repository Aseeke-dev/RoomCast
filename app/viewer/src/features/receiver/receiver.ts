import type { SignalingMessage } from "@roomcast/protocol";

export interface ReceiverCallbacks {
    onSignal: (msg: SignalingMessage) => void;
    onStreamReceived: (stream: MediaStream) => void;
    onDisconnected?: () => void;
}

export class WebRTCReceiver {
    private pc: RTCPeerConnection | null = null;
    private callbacks: ReceiverCallbacks;
    private peerId: string;
    private presenterPeerId: string = "presenter-host";
    private pendingIceCandidates: RTCIceCandidateInit[] = [];
    private remoteStream: MediaStream | null = null;

    constructor(peerId: string, callbacks: ReceiverCallbacks) {
        this.peerId = peerId;
        this.callbacks = callbacks;
    }

    private ensurePeerConnection(): RTCPeerConnection {
        if (this.pc) return this.pc;

        const pc = new RTCPeerConnection({ iceServers: [] });

        pc.ontrack = (event) => {
            this.remoteStream ??= new MediaStream();
            if (!this.remoteStream.getTracks().includes(event.track)) {
                this.remoteStream.addTrack(event.track);
            }
            this.callbacks.onStreamReceived(this.remoteStream);
        };

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                console.info("[Viewer] Local ICE candidate:", event.candidate.candidate);
                this.callbacks.onSignal({
                    type: "ICE_CANDIDATE",
                    targetPeerId: this.presenterPeerId,
                    senderPeerId: this.peerId,
                    candidate: {
                        candidate: event.candidate.candidate,
                        sdpMid: event.candidate.sdpMid,
                        sdpMLineIndex: event.candidate.sdpMLineIndex,
                    },
                });
            }
        };

        pc.onconnectionstatechange = () => {
            console.info("[Viewer] WebRTC connection state:", pc.connectionState);
            if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
                this.callbacks.onDisconnected?.();
            }
        };
        pc.oniceconnectionstatechange = () => {
            console.info("[Viewer] ICE connection state:", pc.iceConnectionState);
        };

        this.pc = pc;
        return pc;
    }

    async handleOffer(offerSdp: string, senderPeerId: string) {
        this.presenterPeerId = senderPeerId;
        const pc = this.ensurePeerConnection();

        await pc.setRemoteDescription(new RTCSessionDescription({ type: "offer", sdp: offerSdp }));

        for (const candidate of this.pendingIceCandidates.splice(0)) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        this.callbacks.onSignal({
            type: "ANSWER",
            targetPeerId: this.presenterPeerId,
            senderPeerId: this.peerId,
            sdp: answer.sdp!,
        });
    }

    async handleIceCandidate(candidate: RTCIceCandidateInit) {
        if (!this.pc || !this.pc.remoteDescription) {
            this.pendingIceCandidates.push(candidate);
            return;
        }

        await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
    }

    disconnect() {
        if (this.pc) {
            this.pc.close();
            this.pc = null;
        }
        this.pendingIceCandidates = [];
        this.remoteStream = null;
    }
}