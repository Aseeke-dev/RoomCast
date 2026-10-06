import { z } from "zod";

export const JoinSessionSchema = z.object({
    type: z.literal("JOIN_SESSION"),
    sessionId: z.string(),
    peerId: z.string(),
});

export const PeerJoinedSchema = z.object({
    type: z.literal("PEER_JOINED"),
    peerId: z.string(),
});

export const OfferSchema = z.object({
    type: z.literal("OFFER"),
    targetPeerId: z.string(),
    senderPeerId: z.string(),
    sdp: z.string(),
});

export const AnswerSchema = z.object({
    type: z.literal("ANSWER"),
    targetPeerId: z.string(),
    senderPeerId: z.string(),
    sdp: z.string(),
});

export const IceCandidateSchema = z.object({
    type: z.literal("ICE_CANDIDATE"),
    targetPeerId: z.string(),
    senderPeerId: z.string(),
    candidate: z.object({
        candidate: z.string(),
        sdpMid: z.string().nullable().optional(),
        sdpMLineIndex: z.number().nullable().optional(),
    }),
});

export const PeerLeftSchema = z.object({
    type: z.literal("PEER_LEFT"),
    peerId: z.string(),
});

// Discriminated union for parsing incoming WebSocket signals
export const SignalingMessageSchema = z.discriminatedUnion("type", [
    JoinSessionSchema,
    PeerJoinedSchema,
    OfferSchema,
    AnswerSchema,
    IceCandidateSchema,
    PeerLeftSchema,
]);

export type SignalingMessage = z.infer<typeof SignalingMessageSchema>;
export type JoinSessionMessage = z.infer<typeof JoinSessionSchema>;
export type OfferMessage = z.infer<typeof OfferSchema>;
export type AnswerMessage = z.infer<typeof AnswerSchema>;
export type IceCandidateMessage = z.infer<typeof IceCandidateSchema>;