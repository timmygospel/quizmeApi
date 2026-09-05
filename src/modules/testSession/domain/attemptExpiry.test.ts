import { computeAttemptExpiry } from "./attemptExpiry";

describe("computeAttemptExpiry", () => {
    it("expires after the time limit when the session closes later", () => {
        const startedAt = new Date("2026-01-01T10:12:00Z");
        const availableUntil = new Date("2026-01-01T17:00:00Z");

        const expiresAt = computeAttemptExpiry(startedAt, 30, availableUntil);

        expect(expiresAt.toISOString()).toBe("2026-01-01T10:42:00.000Z");
    });

    it("caps expiry at the session's availableUntil when starting close to the deadline", () => {
        // Session closes at 17:00, 30-minute limit, participant starts at
        // 16:50 -> expires at 17:00, not 17:20 (the spec's own example).
        const startedAt = new Date("2026-01-01T16:50:00Z");
        const availableUntil = new Date("2026-01-01T17:00:00Z");

        const expiresAt = computeAttemptExpiry(startedAt, 30, availableUntil);

        expect(expiresAt.toISOString()).toBe("2026-01-01T17:00:00.000Z");
    });

    it("expires immediately when starting exactly at the deadline", () => {
        const startedAt = new Date("2026-01-01T17:00:00Z");
        const availableUntil = new Date("2026-01-01T17:00:00Z");

        const expiresAt = computeAttemptExpiry(startedAt, 30, availableUntil);

        expect(expiresAt.toISOString()).toBe("2026-01-01T17:00:00.000Z");
    });
});
