import { AssessmentQuestionText } from "./AssessmentQuestionText";

describe("AssessmentQuestionText", () => {
    it("accepts a trimmed non-empty question", () => {
        const result = AssessmentQuestionText.create("  What is fire?  ");
        expect(result.isSuccess).toBe(true);
        expect(result.getValue().value).toBe("What is fire?");
    });

    it("rejects an empty question", () => {
        const result = AssessmentQuestionText.create("   ");
        expect(result.isFailure).toBe(true);
    });
});
