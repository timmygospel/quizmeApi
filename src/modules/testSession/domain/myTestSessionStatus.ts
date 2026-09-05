import { ParticipantStatus } from "./TestSessionParticipant";

export type MyTestSessionStatus = "UPCOMING" | "AVAILABLE" | "IN_PROGRESS" | "SUBMITTED" | "EXPIRED";

// Participant discovery view (GET /me/test-sessions) — the five statuses
// SESSION-BE-002 asks for, derived from participant state + the Session's
// own availability window.
export function deriveMyTestSessionStatus(
    participantStatus: ParticipantStatus,
    availableFrom: Date,
    availableUntil: Date,
    now: Date = new Date()
): MyTestSessionStatus {
    if (participantStatus === "COMPLETED") return "SUBMITTED";
    if (participantStatus === "TIMED_OUT" || participantStatus === "EXPIRED") return "EXPIRED";
    if (participantStatus === "IN_PROGRESS") return "IN_PROGRESS";
    if (now < availableFrom) return "UPCOMING";
    if (now > availableUntil) return "EXPIRED";
    return "AVAILABLE";
}
