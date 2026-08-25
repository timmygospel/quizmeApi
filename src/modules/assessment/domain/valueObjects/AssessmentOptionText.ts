import { Result } from "../../../../shared/core/Result";

export class AssessmentOptionText {
    private constructor(public readonly value: string) { }

    public static create(value: string): Result<AssessmentOptionText> {
        if (!value || value.trim().length === 0) {
            return Result.fail<AssessmentOptionText>("Option text cannot be empty.");
        }
        return Result.ok<AssessmentOptionText>(new AssessmentOptionText(value.trim()));
    }
}
