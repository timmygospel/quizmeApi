import { scoreAttempt } from "./scoreAttempt";

describe("scoreAttempt", () => {
    it("scores 100% and passes when every question is answered correctly", () => {
        const result = scoreAttempt(4, [{ isCorrect: true }, { isCorrect: true }, { isCorrect: true }, { isCorrect: true }], 70);
        expect(result.scorePercentage).toBe(100);
        expect(result.passed).toBe(true);
    });

    it("treats unanswered questions as incorrect", () => {
        // 4 questions total, only 2 answered (both correct) -> 50%, not 100%.
        const result = scoreAttempt(4, [{ isCorrect: true }, { isCorrect: true }], 70);
        expect(result.scorePercentage).toBe(50);
        expect(result.passed).toBe(false);
    });

    it("fails when the score is below pass mark", () => {
        const result = scoreAttempt(2, [{ isCorrect: true }, { isCorrect: false }], 60);
        expect(result.scorePercentage).toBe(50);
        expect(result.passed).toBe(false);
    });

    it("passes when the score exactly meets the pass mark", () => {
        const result = scoreAttempt(2, [{ isCorrect: true }, { isCorrect: false }], 50);
        expect(result.passed).toBe(true);
    });

    it("scores 0 for a totally unanswered attempt", () => {
        const result = scoreAttempt(3, [], 0);
        expect(result.scorePercentage).toBe(0);
        expect(result.passed).toBe(true);
    });

    it("handles an assessment with no questions without dividing by zero", () => {
        const result = scoreAttempt(0, [], 50);
        expect(result.scorePercentage).toBe(0);
        expect(result.passed).toBe(false);
    });
});
