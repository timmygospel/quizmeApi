import { Result } from "../../../shared/core/Result";
import { QuestionText } from "./valueObjects/QuestionText";
import { QuestionOption } from "./valueObjects/QuestionOptions";

export interface QuestionBankQuestionProps {
    question: QuestionText;
    options: QuestionOption[];
    categoryId?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export class QuestionBankQuestion {
    public readonly id?: string;
    public readonly props: QuestionBankQuestionProps;

    constructor(props: QuestionBankQuestionProps, id?: string) {
        this.props = props;
        this.id = id;
    }

    get question(): string {
        return this.props.question.value;
    }

    get options(): { text: string; correct: boolean }[] {
        return this.props.options.map((o) => ({ text: o.text, correct: o.correct }));
    }

    get categoryId(): string | undefined {
        return this.props.categoryId;
    }

    public static validateOptions(options: QuestionOption[]): Result<void> {
        if (!options || options.length < 2) {
            return Result.fail<void>("At least 2 options are required");
        }

        const correctCount = options.filter((o) => o.correct).length;
        if (correctCount !== 1) {
            return Result.fail<void>("Exactly one option must be marked correct");
        }

        return Result.ok<void>();
    }
}
