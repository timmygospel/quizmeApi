import { resolveTestSessionStatus } from "./resolveTestSessionStatus";

const from = new Date("2026-01-01T09:00:00Z");
const until = new Date("2026-01-01T17:00:00Z");

describe("resolveTestSessionStatus", () => {
    it("resolves SCHEDULED to OPEN once within the availability window", () => {
        const now = new Date("2026-01-01T10:00:00Z");
        expect(resolveTestSessionStatus("SCHEDULED", from, until, now)).toBe("OPEN");
    });

    it("resolves SCHEDULED to SCHEDULED before the window opens", () => {
        const now = new Date("2026-01-01T08:00:00Z");
        expect(resolveTestSessionStatus("SCHEDULED", from, until, now)).toBe("SCHEDULED");
    });

    it("resolves OPEN to CLOSED once the window has passed", () => {
        const now = new Date("2026-01-01T18:00:00Z");
        expect(resolveTestSessionStatus("OPEN", from, until, now)).toBe("CLOSED");
    });

    it("leaves manually-set terminal states untouched", () => {
        const now = new Date("2026-01-01T10:00:00Z");
        expect(resolveTestSessionStatus("CANCELLED", from, until, now)).toBe("CANCELLED");
        expect(resolveTestSessionStatus("CLOSED", from, until, now)).toBe("CLOSED");
        expect(resolveTestSessionStatus("COMPLETED", from, until, now)).toBe("COMPLETED");
        expect(resolveTestSessionStatus("DRAFT", from, until, now)).toBe("DRAFT");
    });
});
