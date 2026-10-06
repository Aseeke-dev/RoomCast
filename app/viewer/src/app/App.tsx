import React, { useEffect, useState, useRef } from "react";
import { WebRTCReceiver } from "../features/receiver/receiver";
import { SignalingMessage } from "@roomcast/protocol";
import logo from "../../../presenter/src/renderer/img/logo.png";

export function App() {
    const [status, setStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");
    const [peerId] = useState(() => `audience-${Math.random().toString(36).substring(2, 9)}`);
    const [hasAudio, setHasAudio] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const [playbackBlocked, setPlaybackBlocked] = useState(false);
    
    const videoRef = useRef<HTMLVideoElement>(null);
    const receiverRef = useRef<WebRTCReceiver | null>(null);

    const pathSegments = window.location.pathname.split("/");
    const sessionId = pathSegments[pathSegments.length - 1] || "ROOM1";

    useEffect(() => {
        const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${wsProtocol}//${window.location.host}/signaling`;
        const ws = new WebSocket(wsUrl);

        const receiver = new WebRTCReceiver(peerId, {
            onSignal: (msg) => ws.send(JSON.stringify(msg)),
            onStreamReceived: (stream) => {
                if (videoRef.current) {
                    const video = videoRef.current;
                    const streamChanged = video.srcObject !== stream;
                    if (streamChanged) video.srcObject = stream;

                    // Detect if the presenter included an audio track
                    setHasAudio(stream.getAudioTracks().length > 0);
                    setStatus("connected");

                    if (streamChanged || video.paused) {
                        video
                            .play()
                            .then(() => setPlaybackBlocked(false))
                            .catch((err) => {
                                console.error("[Viewer] Play error:", err);
                                setPlaybackBlocked(true);
                            });
                    }
                } else {
                    setStatus("connected");
                }
            },
            onDisconnected: () => setStatus("disconnected"),
        });
        receiverRef.current = receiver;

        ws.onopen = () => ws.send(JSON.stringify({ type: "JOIN_SESSION", sessionId, peerId }));

        ws.onmessage = async (event) => {
            const msg: SignalingMessage = JSON.parse(event.data);
            switch (msg.type) {
                case "OFFER": await receiver.handleOffer(msg.sdp, msg.senderPeerId); break;
                case "ICE_CANDIDATE": await receiver.handleIceCandidate(msg.candidate); break;
            }
        };

        return () => {
            ws.close();
            receiver.disconnect();
        };
    }, [peerId, sessionId]);

    const toggleMute = () => {
        if (videoRef.current) {
            const nextMuted = !isMuted;
            videoRef.current.muted = nextMuted;
            setIsMuted(nextMuted);
        }
    };

    const startPlayback = () => {
        if (videoRef.current) {
            videoRef.current
                .play()
                .then(() => setPlaybackBlocked(false))
                .catch((err) => {
                    console.error("[Viewer] Play error:", err);
                    setPlaybackBlocked(true);
                });
        }
    };

    return (
        <div style={viewerStyles.container}>
            {status === "connecting" && (
                <div style={viewerStyles.waiting}>
                    <img src={logo} alt="RoomCast" style={viewerStyles.logo} />
                </div>
            )}

            {status === "disconnected" && (
                <div style={viewerStyles.disconnected}>
                    <h2>Presentation Disconnected</h2>
                    <p style={{ color: "#9CA3AF" }}>The presenter has ended the session.</p>
                </div>
            )}

            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted={isMuted}
                style={viewerStyles.video(status === "connected")}
            />

            {status === "connected" && playbackBlocked && (
                <button
                    onClick={startPlayback}
                    style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        background: "rgba(16, 185, 129, 0.9)",
                        border: "none",
                        borderRadius: "12px",
                        color: "#FFF",
                        padding: "14px 22px",
                        fontSize: "16px",
                        fontWeight: "bold",
                        cursor: "pointer",
                        zIndex: 40,
                    }}
                >
                    Tap to Start Video
                </button>
            )}

            {/* Floating Audio Control */}
            {status === "connected" && hasAudio && (
                <button 
                    onClick={toggleMute}
                    style={{
                        position: "absolute",
                        bottom: "32px",
                        background: isMuted ? "rgba(220, 38, 38, 0.8)" : "rgba(16, 185, 129, 0.8)",
                        backdropFilter: "blur(12px)",
                        border: "1px solid rgba(255, 255, 255, 0.2)",
                        color: "#FFF",
                        padding: "12px 24px",
                        borderRadius: "30px",
                        fontWeight: "bold",
                        fontSize: "14px",
                        cursor: "pointer",
                        boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
                        zIndex: 50,
                        display: "flex",
                        alignItems: "center",
                        gap: "8px"
                    }}
                >
                    {isMuted ? "🔇 Tap to Unmute" : "🔊 Audio Live"}
                </button>
            )}
        </div>
    );
}

const viewerStyles: {
    container: React.CSSProperties;
    waiting: React.CSSProperties;
    logo: React.CSSProperties;
    disconnected: React.CSSProperties;
    video: (isVisible: boolean) => React.CSSProperties;
} = {
    container: {
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        overflow: "hidden",
        backgroundColor: "#000",
        color: "#FFF",
        margin: 0,
        padding: 0,
    },
    waiting: {
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(ellipse 55% 50% at 50% 50%, rgba(25, 39, 122, 0.28) 0%, rgba(10, 15, 48, 0.14) 44%, rgba(0, 0, 0, 0) 100%), #020207",
    },
    logo: {
        display: "block",
        width: "min(54vw, 220px)",
        height: "auto",
        borderRadius: "22%",
        filter: "drop-shadow(0 0 28px rgba(48, 77, 255, 0.25))",
    },
    disconnected: {
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        boxSizing: "border-box",
        color: "#EF4444",
        fontFamily: "sans-serif",
        textAlign: "center",
        backgroundColor: "#000",
    },
    video: (isVisible: boolean) => ({
        position: "absolute",
        inset: 0,
        display: isVisible ? "block" : "none",
        width: "100%",
        height: "100%",
        objectFit: "contain",
        backgroundColor: "#000",
    }),
};