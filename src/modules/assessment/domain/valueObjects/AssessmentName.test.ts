import { AssessmentName } from "./AssessmentName";

describe("AssessmentName", () => {
    it("accepts a trimmed non-empty name", () => {
        const result = AssessmentName.create("  Fire Safety Assessment  ");
        expect(result.isSuccess).toBe(true);
        expect(result.getValue().value).toBe("Fire Safety Assessment");
    });

    it("rejects an empty name", () => {
        const result = AssessmentName.create("   ");
        expect(result.isFailure).toBe(true);
    });

    it("rejects a name over 150 characters", () => {
        const result = AssessmentName.create("a".repeat(151));
        expect(result.isFailure).toBe(true);
    });
});
