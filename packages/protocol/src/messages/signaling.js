"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SignalingMessageSchema = exports.PeerLeftSchema = exports.IceCandidateSchema = exports.AnswerSchema = exports.OfferSchema = exports.PeerJoinedSchema = exports.JoinSessionSchema = void 0;
const zod_1 = require("zod");
exports.JoinSessionSchema = zod_1.z.object({
    type: zod_1.z.literal("JOIN_SESSION"),
    sessionId: zod_1.z.string(),
    peerId: zod_1.z.string(),
});
exports.PeerJoinedSchema = zod_1.z.object({
    type: zod_1.z.literal("PEER_JOINED"),
    peerId: zod_1.z.string(),
});
exports.OfferSchema = zod_1.z.object({
    type: zod_1.z.literal("OFFER"),
    targetPeerId: zod_1.z.string(),
    senderPeerId: zod_1.z.string(),
    sdp: zod_1.z.string(),
});
exports.AnswerSchema = zod_1.z.object({
    type: zod_1.z.literal("ANSWER"),
    targetPeerId: zod_1.z.string(),
    senderPeerId: zod_1.z.string(),
    sdp: zod_1.z.string(),
});
exports.IceCandidateSchema = zod_1.z.object({
    type: zod_1.z.literal("ICE_CANDIDATE"),
    targetPeerId: zod_1.z.string(),
    senderPeerId: zod_1.z.string(),
    candidate: zod_1.z.object({
        candidate: zod_1.z.string(),
        sdpMid: zod_1.z.string().nullable().optional(),
        sdpMLineIndex: zod_1.z.number().nullable().optional(),
    }),
});
exports.PeerLeftSchema = zod_1.z.object({
    type: zod_1.z.literal("PEER_LEFT"),
    peerId: zod_1.z.string(),
});
// Discriminated union for parsing incoming WebSocket signals
exports.SignalingMessageSchema = zod_1.z.discriminatedUnion("type", [
    exports.JoinSessionSchema,
    exports.PeerJoinedSchema,
    exports.OfferSchema,
    exports.AnswerSchema,
    exports.IceCandidateSchema,
    exports.PeerLeftSchema,
]);
//# sourceMappingURL=signaling.js.map