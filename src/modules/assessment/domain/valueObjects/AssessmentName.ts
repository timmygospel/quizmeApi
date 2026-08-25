import { Result } from "../../../../shared/core/Result";

export class AssessmentName {
    private constructor(public readonly value: string) { }

    public static create(name: string): Result<AssessmentName> {
        if (!name || name.trim().length === 0) {
            return Result.fail<AssessmentName>("Assessment name cannot be empty");
        }
        if (name.length > 150) {
            return Result.fail<AssessmentName>("Assessment name cannot exceed 150 characters");
        }
        return Result.ok<AssessmentName>(new AssessmentName(name.trim()));
    }
}
