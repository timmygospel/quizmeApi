import { Result } from "../../../../shared/core/Result";

export interface QuestionOptionProps {
    text: string;
    correct: boolean;
}

export class QuestionOption {
    private constructor(public readonly props: QuestionOptionProps) { }

    get text(): string {
        return this.props.text;
    }

    get correct(): boolean {
        return this.props.correct;
    }

    public static create(props: QuestionOptionProps): Result<QuestionOption> {
        const text = String(props.text ?? "").trim();
        const correct = !!props.correct;

        if (!text) {
            return Result.fail<QuestionOption>("Option text cannot be empty");
        }

        if (text.length > 200) {
            return Result.fail<QuestionOption>("Option text cannot exceed 200 characters");
        }

        return Result.ok(new QuestionOption({ text, correct }));
    }
}
