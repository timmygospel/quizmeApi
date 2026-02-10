import { Result } from "../../../../shared/core/Result";

export class QuestionText {
    private constructor(public readonly value: string) { }

    public static create(value: string): Result<QuestionText> {
        console.log(`value ${value}`)
        if (!value || value.trim().length < 1) {
            return Result.fail<QuestionText>("Question text must be at least 5 characters long.");
        }

        return Result.ok<QuestionText>(new QuestionText(value.trim()));
    }
}
