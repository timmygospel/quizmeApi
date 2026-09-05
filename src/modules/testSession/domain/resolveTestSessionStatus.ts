import { TestSessionStatus } from "./TestSession";

// DRAFT/CLOSED/CANCELLED/COMPLETED are explicit, manually-set states and
// pass through unchanged. SCHEDULED/OPEN are derived from the availability
// window at read time, rather than written on every tick of the clock —
// close()/cancel() are the only endpoints that persist a status.
export function resolveTestSessionStatus(
    stored: TestSessionStatus,
    availableFrom: Date,
    availableUntil: Date,
    now: Date = new Date()
): TestSessionStatus {
    if (stored !== "SCHEDULED" && stored !== "OPEN") return stored;
    if (now < availableFrom) return "SCHEDULED";
    if (now > availableUntil) return "CLOSED";
    return "OPEN";
}
