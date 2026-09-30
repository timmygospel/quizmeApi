import { ParticipantStatus } from "./TestSessionParticipant";

// TIMED_OUT = the timer ran out and the answers were submitted automatically (scored like a
// submission); EXPIRED = never started in time.
export type MyTestSessionStatus = "UPCOMING" | "AVAILABLE" | "IN_PROGRESS" | "SUBMITTED" | "TIMED_OUT" | "EXPIRED";

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
    if (participantStatus === "TIMED_OUT") return "TIMED_OUT";
    if (participantStatus === "EXPIRED") return "EXPIRED";
    if (participantStatus === "IN_PROGRESS") return "IN_PROGRESS";
    if (now < availableFrom) return "UPCOMING";
    if (now > availableUntil) return "EXPIRED";
    return "AVAILABLE";
}
