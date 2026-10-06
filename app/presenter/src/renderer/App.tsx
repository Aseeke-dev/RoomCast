import React, { useEffect, useState, useRef } from "react";
import QRCode from "react-qr-code";
import { WebRTCBroadcaster } from "@roomcast/networking";
import type { SignalingMessage } from "@roomcast/protocol";
import logo from "./img/logo.png";

// ============================================================================
// 1. APP SPLASH SCREEN AND ROUTER
// ============================================================================

export function App() {
  const [view, setView] = useState<"splash" | "studio">("splash");

  useEffect(() => {
    const splashTimeout = window.setTimeout(() => setView("studio"), 10_000);
    return () => window.clearTimeout(splashTimeout);
  }, []);

  return view === "splash" ? <SplashPage /> : <StudioPage />;
}

function SplashPage() {
  return (
    <div style={studioStyles.splashScreen}>
      <style>{`
        @keyframes roomcastSplashGlow {
          0%, 100% { transform: translate3d(-3%, -2%, 0) scale(1); opacity: 0.7; }
          50% { transform: translate3d(4%, 3%, 0) scale(1.14); opacity: 1; }
        }
      `}</style>
      <div aria-hidden="true" style={studioStyles.splashGlow} />
      <img src={logo} alt="RoomCast" style={studioStyles.splashLogo} />
    </div>
  );
}

// ============================================================================
// 2. PRESENTER WORKFLOW
// ============================================================================

interface DisplaySource {
  id: string;
  name: string;
  thumbnail: string;
}

interface ElectronDesktopCaptureConstraints {
  audio: false | (MediaTrackConstraints & {
    mandatory: {
      chromeMediaSource: "desktop";
    };
  });
  video: MediaTrackConstraints & {
    mandatory: {
      chromeMediaSource: "desktop";
      chromeMediaSourceId: string;
      minWidth: number;
      maxWidth: number;
      minHeight: number;
      maxHeight: number;
      maxFrameRate: number;
    };
  };
}

function StudioPage() {
  const [stage, setStage] = useState<"welcome" | "connect" | "source" | "live">("welcome");
  const [sources, setSources] = useState<DisplaySource[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState<string>("");
  const [shareAudio, setShareAudio] = useState(false);
  const [captureMessage, setCaptureMessage] = useState("");
  const [networkInfo, setNetworkInfo] = useState<{ localIp: string; port: number }>({ localIp: "127.0.0.1", port: 8080 });
  const [isStartingShare, setIsStartingShare] = useState(false);
  const [connectedPeers, setConnectedPeers] = useState<Set<string>>(new Set());

  const videoRef = useRef<HTMLVideoElement>(null);
  const broadcasterRef = useRef<WebRTCBroadcaster | null>(null);
  const activeStreamRef = useRef<MediaStream | null>(null);

  const presenterPeerId = "presenter-host";
  const sessionId = "ROOM1";
  const audienceUrl = `http://${networkInfo.localIp}:${networkInfo.port}/view/${sessionId}`;

  useEffect(() => {
    if (window.desktop) {
      window.desktop.getDisplays().then((displays) => {
        setSources(displays);
        if (displays.length > 0) setSelectedSourceId(displays[0].id);
      });
      window.desktop.getNetworkInfo().then(setNetworkInfo);
    }

    const signalingHost = window.location.protocol === "file:"
      ? "127.0.0.1"
      : window.location.hostname || "localhost";
    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${wsProtocol}//${signalingHost}:8080/signaling`);

    const broadcaster = new WebRTCBroadcaster({
      onSignal: (msg) => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
      },
      onPeerConnected: (id) => setConnectedPeers((prev) => new Set(prev).add(id)),
      onPeerDisconnected: (id) =>
        setConnectedPeers((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        }),
    });
    broadcasterRef.current = broadcaster;

    ws.onopen = () => ws.send(JSON.stringify({ type: "JOIN_SESSION", sessionId, peerId: presenterPeerId }));

    ws.onmessage = async (event) => {
      const msg: SignalingMessage = JSON.parse(event.data);
      switch (msg.type) {
        case "PEER_JOINED":
          if (activeStreamRef.current) broadcaster.setStream(activeStreamRef.current);
          await broadcaster.handlePeerJoined(msg.peerId, presenterPeerId);
          break;
        case "ANSWER": await broadcaster.handleAnswer(msg.senderPeerId, msg.sdp); break;
        case "ICE_CANDIDATE": await broadcaster.handleIceCandidate(msg.senderPeerId, msg.candidate); break;
        case "PEER_LEFT": broadcaster.removePeer(msg.peerId); break;
      }
    };

    return () => {
      ws.close();
      broadcaster.stopAll();
    };
  }, []);

  useEffect(() => {
    if (stage === "live" && videoRef.current && activeStreamRef.current) {
      videoRef.current.srcObject = activeStreamRef.current;
    }
  }, [stage]);

  const startScreenCapture = async () => {
    if (!selectedSourceId || isStartingShare) return;
    setCaptureMessage("");
    setIsStartingShare(true);

    const createCaptureConstraints = (includeAudio: boolean): ElectronDesktopCaptureConstraints => ({
      audio: includeAudio
        ? {
            mandatory: {
              chromeMediaSource: "desktop",
            },
          }
        : false,
      video: {
        mandatory: {
          chromeMediaSource: "desktop",
          chromeMediaSourceId: selectedSourceId,
          minWidth: 1280,
          maxWidth: 1920,
          minHeight: 720,
          maxHeight: 1080,
          maxFrameRate: 30,
        },
      },
    });

    try {
      let stream: MediaStream;
      let audioCaptureFallback = false;
      try {
        stream = await navigator.mediaDevices.getUserMedia(createCaptureConstraints(shareAudio));
      } catch (audioCaptureError) {
        if (!shareAudio) throw audioCaptureError;

        console.error("System audio capture failed; retrying screen capture without audio:", audioCaptureError);
        stream = await navigator.mediaDevices.getUserMedia(createCaptureConstraints(false));
        audioCaptureFallback = true;
        setCaptureMessage("System audio capture failed. The screen is being shared without audio.");
      }

      const audioTrack = stream.getAudioTracks()[0];
      if (shareAudio && !audioTrack && !audioCaptureFallback) {
        setCaptureMessage("System audio was not captured. The screen is still being shared without audio.");
      } else if (audioTrack && !audioCaptureFallback) {
        setCaptureMessage("System audio captured. Unmute the viewer to hear it.");
      }
      activeStreamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      broadcasterRef.current?.setStream(stream);
      setStage("live");
    } catch (err) {
      console.error("Failed to capture screen:", err);
      setCaptureMessage(err instanceof Error ? err.message : "Failed to capture the screen.");
    } finally {
      setIsStartingShare(false);
    }
  };

  const stopScreenCapture = () => {
    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach((track) => track.stop());
      activeStreamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setStage("welcome");
  };

  return (
    <div style={studioStyles.container}>
      <style>{`
        @keyframes roomcastLightDrift {
          0%, 100% { transform: translate3d(-4%, -3%, 0) scale(1); opacity: 0.72; }
          50% { transform: translate3d(5%, 4%, 0) scale(1.16); opacity: 1; }
        }
      `}</style>
      <div aria-hidden="true" style={studioStyles.ambientLight} />

      {stage === "welcome" && (
        <>
          <header style={studioStyles.welcomeHeader}>
            <img src={logo} alt="RoomCast" style={studioStyles.headerLogo} />
          </header>
          <main style={studioStyles.centerStage}>
            <button onClick={() => setStage("connect")} style={studioStyles.primaryButton()}>
              Start
            </button>
          </main>
        </>
      )}

      {stage === "connect" && (
        <>
          <header style={studioStyles.stageHeader}>
            <img src={logo} alt="RoomCast" style={studioStyles.headerLogo} />
          </header>
          <main style={studioStyles.centerStage}>
            <section style={studioStyles.stageCard}>
              <h1 style={studioStyles.heading}>Invite viewers</h1>
              <p style={studioStyles.description}>Scan the code or open this link to join. Your broadcast has not started yet.</p>
              <div style={studioStyles.qrFrame}>
                <QRCode value={audienceUrl} size={220} />
              </div>
              <div style={studioStyles.meetingLink}>{audienceUrl}</div>
              <button onClick={() => setStage("source")} style={studioStyles.primaryButton()}>
                Continue
              </button>
            </section>
          </main>
        </>
      )}

      {stage === "source" && (
        <>
          <header style={studioStyles.stageHeader}>
            <img src={logo} alt="RoomCast" style={studioStyles.headerLogo} />
          </header>
          <main style={studioStyles.centerStage}>
            <section style={{ ...studioStyles.stageCard, ...studioStyles.sourceStageCard }}>
              <h1 style={studioStyles.heading}>Choose what to share</h1>
              <p style={studioStyles.description}>Select a window or screen. Your broadcast starts when you continue.</p>
              {sources.length > 0 ? (
                <div style={studioStyles.sourceGrid}>
                  {sources.map((source) => {
                    const selected = selectedSourceId === source.id;
                    return (
                      <button
                        key={source.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setSelectedSourceId(source.id)}
                        style={studioStyles.sourceCard(selected)}
                      >
                        <img src={source.thumbnail} alt="" style={studioStyles.sourceThumbnail} />
                        <span style={studioStyles.sourceName}>{source.name}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p role="status" style={studioStyles.description}>No screens or windows are available to share.</p>
              )}

              <button
                type="button"
                aria-pressed={shareAudio}
                onClick={() => setShareAudio((enabled) => !enabled)}
                style={studioStyles.audioButton(shareAudio)}
              >
                {shareAudio ? "Audio enabled" : "Enable audio"}
              </button>
              {captureMessage && <p role="status" style={studioStyles.captureMessage}>{captureMessage}</p>}
              <button
                onClick={startScreenCapture}
                disabled={!selectedSourceId || isStartingShare}
                style={studioStyles.primaryButton(!selectedSourceId || isStartingShare)}
              >
                {isStartingShare ? "Starting…" : "Continue"}
              </button>
            </section>
          </main>
        </>
      )}

      {stage === "live" && (
        <>
          <header style={studioStyles.liveHeader}>
            <div style={studioStyles.audienceCount}>
              <span style={studioStyles.liveDot} />
              {connectedPeers.size} {connectedPeers.size === 1 ? "viewer" : "viewers"}
            </div>
            <div style={studioStyles.liveMeetingLink}>{audienceUrl}</div>
            <img src={logo} alt="RoomCast" style={{ ...studioStyles.headerLogo, ...studioStyles.liveLogo }} />
          </header>
          <main style={studioStyles.liveStage}>
            <video ref={videoRef} autoPlay playsInline muted style={studioStyles.liveVideo} />
            {captureMessage && <p role="status" style={studioStyles.liveMessage}>{captureMessage}</p>}
            <button onClick={stopScreenCapture} style={studioStyles.stopButton}>Stop sharing</button>
          </main>
        </>
      )}
    </div>
  );
}

// ============================================================================
// 4. DESIGN STYLES (Landing + Studio)
// ============================================================================

const studioStyles: { [key: string]: any } = {
  splashScreen: { height: "100vh", width: "100vw", background: "#020207", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative" },
  splashGlow: { position: "absolute", width: "70vw", height: "75vh", minWidth: "500px", minHeight: "400px", top: "8%", left: "15%", borderRadius: "50%", background: "radial-gradient(ellipse, rgba(28, 51, 175, 0.32) 0%, rgba(45, 28, 133, 0.16) 38%, rgba(2, 2, 7, 0) 72%)", filter: "blur(24px)", pointerEvents: "none", animation: "roomcastSplashGlow 12s ease-in-out infinite" },
  splashLogo: { width: "clamp(140px, 20vw, 220px)", height: "auto", borderRadius: "22%", filter: "drop-shadow(0 0 34px rgba(48, 77, 255, 0.24))" },
  container: { minHeight: "100vh", width: "100%", boxSizing: "border-box", background: "#020207", color: "#F8FAFC", fontFamily: "'Inter', sans-serif", position: "relative", overflow: "hidden" },
  ambientLight: { position: "absolute", width: "70vw", height: "75vh", minWidth: "500px", minHeight: "400px", top: "8%", left: "15%", borderRadius: "50%", background: "radial-gradient(ellipse, rgba(28, 51, 175, 0.32) 0%, rgba(45, 28, 133, 0.16) 38%, rgba(2, 2, 7, 0) 72%)", filter: "blur(24px)", pointerEvents: "none", animation: "roomcastLightDrift 12s ease-in-out infinite" },
  welcomeHeader: { position: "absolute", zIndex: 1, top: "24px", left: "32px" },
  stageHeader: { position: "absolute", zIndex: 1, top: "24px", left: "32px" },
  headerLogo: { display: "block", width: "54px", height: "54px", objectFit: "contain", borderRadius: "14px", filter: "drop-shadow(0 0 16px rgba(48, 77, 255, 0.24))" },
  centerStage: { position: "relative", zIndex: 1, minHeight: "100vh", boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", padding: "96px 24px 32px" },
  primaryButton: (disabled = false) => ({ minWidth: "190px", padding: "16px 40px", borderRadius: "14px", border: "1px solid rgba(154, 170, 255, 0.42)", background: disabled ? "rgba(74, 82, 120, 0.45)" : "linear-gradient(135deg, #4169F5 0%, #5939D8 100%)", boxShadow: disabled ? "none" : "0 0 38px rgba(60, 83, 255, 0.32)", color: "#FFF", fontSize: "17px", fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.55 : 1 }),
  stageCard: { width: "min(540px, 100%)", boxSizing: "border-box", padding: "32px", display: "flex", flexDirection: "column", alignItems: "center", gap: "18px", background: "rgba(8, 10, 25, 0.72)", border: "1px solid rgba(126, 145, 255, 0.2)", borderRadius: "24px", boxShadow: "0 20px 80px rgba(20, 30, 100, 0.2)", backdropFilter: "blur(18px)", textAlign: "center" },
  sourceStageCard: { width: "min(820px, 100%)", maxHeight: "calc(100vh - 48px)", overflowY: "auto" },
  heading: { margin: 0, color: "#FFF", fontSize: "clamp(24px, 3vw, 32px)", fontWeight: 750 },
  description: { maxWidth: "460px", margin: 0, color: "#A7AEC7", fontSize: "14px", lineHeight: 1.6 },
  qrFrame: { padding: "14px", background: "#FFF", borderRadius: "18px", boxShadow: "0 0 40px rgba(47, 73, 255, 0.24)" },
  meetingLink: { maxWidth: "100%", color: "#C7D2FE", fontSize: "14px", overflowWrap: "anywhere", textDecoration: "underline", textUnderlineOffset: "4px" },
  sourceGrid: { width: "100%", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "14px" },
  sourceCard: (selected: boolean) => ({ minWidth: 0, padding: "9px", borderRadius: "14px", border: selected ? "2px solid #7189FF" : "1px solid rgba(255, 255, 255, 0.14)", background: selected ? "rgba(69, 91, 220, 0.2)" : "rgba(255, 255, 255, 0.04)", cursor: "pointer", textAlign: "left", color: "#F8FAFC" }),
  sourceThumbnail: { display: "block", width: "100%", height: "112px", objectFit: "cover", borderRadius: "8px", background: "#080A15" },
  sourceName: { display: "block", marginTop: "9px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "13px", fontWeight: 600 },
  audioButton: (enabled: boolean) => ({ width: "100%", padding: "13px 16px", borderRadius: "12px", border: enabled ? "1px solid rgba(105, 229, 185, 0.55)" : "1px solid rgba(255, 255, 255, 0.16)", background: enabled ? "rgba(16, 185, 129, 0.16)" : "rgba(255, 255, 255, 0.06)", color: enabled ? "#8EF0C3" : "#E2E8F0", fontSize: "14px", fontWeight: 650, cursor: "pointer" }),
  captureMessage: { margin: 0, color: "#FBBF24", fontSize: "13px", lineHeight: 1.5 },
  liveHeader: { position: "relative", zIndex: 1, height: "86px", boxSizing: "border-box", padding: "16px 26px", display: "grid", gridTemplateColumns: "1fr minmax(0, 2fr) 1fr", alignItems: "center", gap: "16px", borderBottom: "1px solid rgba(255, 255, 255, 0.1)", background: "rgba(3, 4, 12, 0.58)", backdropFilter: "blur(16px)" },
  audienceCount: { justifySelf: "start", display: "flex", alignItems: "center", gap: "9px", color: "#E2E8F0", fontSize: "14px", fontWeight: 650 },
  liveDot: { width: "9px", height: "9px", borderRadius: "50%", background: "#50E3A4", boxShadow: "0 0 12px rgba(80, 227, 164, 0.8)" },
  liveMeetingLink: { justifySelf: "center", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#C7D2FE", fontSize: "14px", textDecoration: "none" },
  liveLogo: { justifySelf: "end" },
  liveStage: { position: "relative", zIndex: 1, minHeight: "calc(100vh - 86px)", boxSizing: "border-box", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "20px", padding: "28px" },
  liveVideo: { display: "block", width: "min(100%, 1120px)", maxHeight: "calc(100vh - 190px)", aspectRatio: "16 / 9", objectFit: "contain", background: "rgba(0, 0, 0, 0.72)", border: "1px solid rgba(143, 159, 255, 0.3)", borderRadius: "16px", boxShadow: "0 20px 80px rgba(0, 0, 0, 0.48)" },
  liveMessage: { margin: 0, color: "#FBBF24", fontSize: "13px", textAlign: "center" },
  stopButton: { padding: "13px 28px", borderRadius: "12px", border: "1px solid rgba(255, 114, 130, 0.46)", background: "linear-gradient(135deg, #D83F5C, #A92247)", boxShadow: "0 0 26px rgba(230, 50, 86, 0.2)", color: "#FFF", fontSize: "14px", fontWeight: 700, cursor: "pointer" },
};