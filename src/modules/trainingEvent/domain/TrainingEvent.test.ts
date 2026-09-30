import { cleanDisplayName, scoreCheck } from "./TrainingEvent";
import { JOIN_CODE_LENGTH, hashAttendeeToken, newAttendeeToken, newJoinCode, normaliseJoinCode } from "./credentials";

describe("cleanDisplayName", () => {
    it("trims and collapses spaces", () => expect(cleanDisplayName("  Jo   Smith ")).toBe("Jo Smith"));
    it("rejects blank, too long and non-strings", () => {
        expect(cleanDisplayName("   ")).toBeNull();
        expect(cleanDisplayName("x".repeat(61))).toBeNull();
        expect(cleanDisplayName(42)).toBeNull();
    });
});

describe("scoreCheck", () => {
    it("counts unanswered questions as wrong", () => {
        expect(scoreCheck(3, [{ checkQuestionId: "a", optionIndex: 0, isCorrect: true }])).toBe(33.33);
    });
    it("is 0 for an empty check", () => expect(scoreCheck(0, [])).toBe(0));
});

describe("credentials", () => {
    it("tokens are long, random and only their hash is comparable", () => {
        const a = newAttendeeToken();
        const b = newAttendeeToken();
        expect(a).not.toBe(b);
        expect(a.length).toBeGreaterThanOrEqual(43); // 32 bytes base64url
        expect(hashAttendeeToken(a)).toMatch(/^[0-9a-f]{64}$/);
        expect(hashAttendeeToken(a)).toBe(hashAttendeeToken(a));
        expect(hashAttendeeToken(a)).not.toBe(a);
    });

    it("join codes avoid characters that are easy to misread", () => {
        for (let i = 0; i < 200; i++) {
            const code = newJoinCode();
            expect(code).toHaveLength(JOIN_CODE_LENGTH);
            expect(code).not.toMatch(/[01OIL]/);
        }
    });

    it("normalises what people type", () => expect(normaliseJoinCode(" k7m 9qx ")).toBe("K7M9QX"));
});
