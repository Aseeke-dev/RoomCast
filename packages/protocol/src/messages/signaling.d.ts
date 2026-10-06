import { z } from "zod";
export declare const JoinSessionSchema: z.ZodObject<{
    type: z.ZodLiteral<"JOIN_SESSION">;
    sessionId: z.ZodString;
    peerId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "JOIN_SESSION";
    sessionId: string;
    peerId: string;
}, {
    type: "JOIN_SESSION";
    sessionId: string;
    peerId: string;
}>;
export declare const PeerJoinedSchema: z.ZodObject<{
    type: z.ZodLiteral<"PEER_JOINED">;
    peerId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "PEER_JOINED";
    peerId: string;
}, {
    type: "PEER_JOINED";
    peerId: string;
}>;
export declare const OfferSchema: z.ZodObject<{
    type: z.ZodLiteral<"OFFER">;
    targetPeerId: z.ZodString;
    senderPeerId: z.ZodString;
    sdp: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "OFFER";
    targetPeerId: string;
    senderPeerId: string;
    sdp: string;
}, {
    type: "OFFER";
    targetPeerId: string;
    senderPeerId: string;
    sdp: string;
}>;
export declare const AnswerSchema: z.ZodObject<{
    type: z.ZodLiteral<"ANSWER">;
    targetPeerId: z.ZodString;
    senderPeerId: z.ZodString;
    sdp: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "ANSWER";
    targetPeerId: string;
    senderPeerId: string;
    sdp: string;
}, {
    type: "ANSWER";
    targetPeerId: string;
    senderPeerId: string;
    sdp: string;
}>;
export declare const IceCandidateSchema: z.ZodObject<{
    type: z.ZodLiteral<"ICE_CANDIDATE">;
    targetPeerId: z.ZodString;
    senderPeerId: z.ZodString;
    candidate: z.ZodObject<{
        candidate: z.ZodString;
        sdpMid: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        sdpMLineIndex: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    }, "strip", z.ZodTypeAny, {
        candidate: string;
        sdpMid?: string | null | undefined;
        sdpMLineIndex?: number | null | undefined;
    }, {
        candidate: string;
        sdpMid?: string | null | undefined;
        sdpMLineIndex?: number | null | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "ICE_CANDIDATE";
    targetPeerId: string;
    senderPeerId: string;
    candidate: {
        candidate: string;
        sdpMid?: string | null | undefined;
        sdpMLineIndex?: number | null | undefined;
    };
}, {
    type: "ICE_CANDIDATE";
    targetPeerId: string;
    senderPeerId: string;
    candidate: {
        candidate: string;
        sdpMid?: string | null | undefined;
        sdpMLineIndex?: number | null | undefined;
    };
}>;
export declare const PeerLeftSchema: z.ZodObject<{
    type: z.ZodLiteral<"PEER_LEFT">;
    peerId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "PEER_LEFT";
    peerId: string;
}, {
    type: "PEER_LEFT";
    peerId: string;
}>;
export declare const SignalingMessageSchema: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
    type: z.ZodLiteral<"JOIN_SESSION">;
    sessionId: z.ZodString;
    peerId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "JOIN_SESSION";
    sessionId: string;
    peerId: string;
}, {
    type: "JOIN_SESSION";
    sessionId: string;
    peerId: string;
}>, z.ZodObject<{
    type: z.ZodLiteral<"PEER_JOINED">;
    peerId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "PEER_JOINED";
    peerId: string;
}, {
    type: "PEER_JOINED";
    peerId: string;
}>, z.ZodObject<{
    type: z.ZodLiteral<"OFFER">;
    targetPeerId: z.ZodString;
    senderPeerId: z.ZodString;
    sdp: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "OFFER";
    targetPeerId: string;
    senderPeerId: string;
    sdp: string;
}, {
    type: "OFFER";
    targetPeerId: string;
    senderPeerId: string;
    sdp: string;
}>, z.ZodObject<{
    type: z.ZodLiteral<"ANSWER">;
    targetPeerId: z.ZodString;
    senderPeerId: z.ZodString;
    sdp: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "ANSWER";
    targetPeerId: string;
    senderPeerId: string;
    sdp: string;
}, {
    type: "ANSWER";
    targetPeerId: string;
    senderPeerId: string;
    sdp: string;
}>, z.ZodObject<{
    type: z.ZodLiteral<"ICE_CANDIDATE">;
    targetPeerId: z.ZodString;
    senderPeerId: z.ZodString;
    candidate: z.ZodObject<{
        candidate: z.ZodString;
        sdpMid: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        sdpMLineIndex: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    }, "strip", z.ZodTypeAny, {
        candidate: string;
        sdpMid?: string | null | undefined;
        sdpMLineIndex?: number | null | undefined;
    }, {
        candidate: string;
        sdpMid?: string | null | undefined;
        sdpMLineIndex?: number | null | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "ICE_CANDIDATE";
    targetPeerId: string;
    senderPeerId: string;
    candidate: {
        candidate: string;
        sdpMid?: string | null | undefined;
        sdpMLineIndex?: number | null | undefined;
    };
}, {
    type: "ICE_CANDIDATE";
    targetPeerId: string;
    senderPeerId: string;
    candidate: {
        candidate: string;
        sdpMid?: string | null | undefined;
        sdpMLineIndex?: number | null | undefined;
    };
}>, z.ZodObject<{
    type: z.ZodLiteral<"PEER_LEFT">;
    peerId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "PEER_LEFT";
    peerId: string;
}, {
    type: "PEER_LEFT";
    peerId: string;
}>]>;
export type SignalingMessage = z.infer<typeof SignalingMessageSchema>;
export type JoinSessionMessage = z.infer<typeof JoinSessionSchema>;
export type OfferMessage = z.infer<typeof OfferSchema>;
export type AnswerMessage = z.infer<typeof AnswerSchema>;
export type IceCandidateMessage = z.infer<typeof IceCandidateSchema>;
//# sourceMappingURL=signaling.d.ts.map