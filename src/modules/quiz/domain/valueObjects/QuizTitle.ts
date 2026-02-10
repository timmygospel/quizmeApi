import { Result } from "../../../../shared/core/Result";

export class QuizTitle {
    private constructor(public readonly value: string) { }

    public static create(title: string): Result<QuizTitle> {
        if (!title || title.trim().length === 0) {
            return Result.fail<QuizTitle>("Quiz title cannot be empty");
        }
        if (title.length > 100) {
            return Result.fail<QuizTitle>("Quiz title cannot exceed 100 characters");
        }
        return Result.ok<QuizTitle>(new QuizTitle(title.trim()));
    }
}
