import { deriveMyTestSessionStatus } from "./myTestSessionStatus";

const from = new Date("2026-01-01T09:00:00Z");
const until = new Date("2026-01-01T17:00:00Z");

describe("deriveMyTestSessionStatus", () => {
    it("returns UPCOMING before the window opens", () => {
        const now = new Date("2026-01-01T08:00:00Z");
        expect(deriveMyTestSessionStatus("ASSIGNED", from, until, now)).toBe("UPCOMING");
    });

    it("returns AVAILABLE within the window when not yet started", () => {
        const now = new Date("2026-01-01T10:00:00Z");
        expect(deriveMyTestSessionStatus("ASSIGNED", from, until, now)).toBe("AVAILABLE");
    });

    it("returns IN_PROGRESS while an attempt is underway", () => {
        const now = new Date("2026-01-01T10:00:00Z");
        expect(deriveMyTestSessionStatus("IN_PROGRESS", from, until, now)).toBe("IN_PROGRESS");
    });

    it("returns SUBMITTED once completed", () => {
        const now = new Date("2026-01-01T10:00:00Z");
        expect(deriveMyTestSessionStatus("COMPLETED", from, until, now)).toBe("SUBMITTED");
    });

    it("returns EXPIRED for a timed-out attempt", () => {
        const now = new Date("2026-01-01T10:00:00Z");
        expect(deriveMyTestSessionStatus("TIMED_OUT", from, until, now)).toBe("EXPIRED");
    });

    it("returns EXPIRED once the window has passed and nothing was started", () => {
        const now = new Date("2026-01-01T18:00:00Z");
        expect(deriveMyTestSessionStatus("ASSIGNED", from, until, now)).toBe("EXPIRED");
    });
});
