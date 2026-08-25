import { Result } from "../../../../shared/core/Result";

export class AssessmentQuestionText {
    private constructor(public readonly value: string) { }

    public static create(value: string): Result<AssessmentQuestionText> {
        if (!value || value.trim().length < 1) {
            return Result.fail<AssessmentQuestionText>("Question text must be at least 5 characters long.");
        }
        return Result.ok<AssessmentQuestionText>(new AssessmentQuestionText(value.trim()));
    }
}
