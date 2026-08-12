import { QuestionBankQuestion } from "../domain/QuestionBankQuestion";
import { QuestionText } from "../domain/valueObjects/QuestionText";
import { QuestionOption } from "../domain/valueObjects/QuestionOptions";
import { QuestionBankDTO } from "../dtos/QuestionBankDTO";

export interface QuestionBankQuestionRow {
    id: string;
    question_text: string;
    category_id: string | null;
    created_at: Date;
    updated_at: Date;
}

export interface QuestionBankOptionRow {
    id: string;
    question_id: string;
    text: string;
    is_correct: boolean;
    display_order: number;
}

export interface QuestionBankRows {
    question: QuestionBankQuestionRow;
    options: QuestionBankOptionRow[];
}

export class QuestionBankMap {
    public static toDTO(q: QuestionBankQuestion): QuestionBankDTO {
        return {
            id: q.id,
            question: q.question,
            options: q.options,
            categoryId: q.categoryId,
        };
    }

    public static toDomain(raw: QuestionBankRows): QuestionBankQuestion {
        const questionOrError = QuestionText.create(raw.question.question_text);
        if (questionOrError.isFailure) throw new Error(questionOrError.errorValue());

        const sortedOptions = [...raw.options].sort((a, b) => a.display_order - b.display_order);
        const optionResults = sortedOptions.map((o) =>
            QuestionOption.create({ text: o.text, correct: o.is_correct })
        );

        for (const r of optionResults) {
            if (r.isFailure) throw new Error(r.errorValue());
        }

        const options = optionResults.map((r) => r.getValue());

        const optionsValid = QuestionBankQuestion.validateOptions(options);
        if (optionsValid.isFailure) throw new Error(optionsValid.errorValue());

        return new QuestionBankQuestion(
            {
                question: questionOrError.getValue(),
                options,
                categoryId: raw.question.category_id ?? undefined,
                createdAt: raw.question.created_at,
                updatedAt: raw.question.updated_at,
            },
            raw.question.id
        );
    }
}
