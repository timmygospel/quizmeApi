import { Result } from "../../../../shared/core/Result";

export class QuestionText {
    private constructor(public readonly value: string) { }

    public static create(text: string): Result<QuestionText> {
        if (!text || text.trim().length === 0) {
            return Result.fail<QuestionText>("Question text cannot be empty");
        }
        if (text.trim().length > 500) {
            return Result.fail<QuestionText>("Question text cannot exceed 500 characters");
        }
        return Result.ok(new QuestionText(text.trim()));
    }
}
