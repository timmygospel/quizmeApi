import { QuizTitle } from "./QuizTitle";

describe("QuizTitle", () => {
    it("accepts a valid title and trims it", () => {
        const result = QuizTitle.create("  Fire Safety Training  ");
        expect(result.isSuccess).toBe(true);
        expect(result.getValue().value).toBe("Fire Safety Training");
    });

    it("rejects an empty title", () => {
        const result = QuizTitle.create("   ");
        expect(result.isFailure).toBe(true);
    });

    it("rejects a title over 100 characters", () => {
        const result = QuizTitle.create("a".repeat(101));
        expect(result.isFailure).toBe(true);
    });
});
