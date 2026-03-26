import { QuestionBankQuestion } from "../domain/QuestionBankQuestion";
import { QuestionText } from "../domain/valueObjects/QuestionText";
import { QuestionOption } from "../domain/valueObjects/QuestionOptions";
import { QuestionBankDTO } from "../dtos/QuestionBankDTO";

type PrismaOption = { id: string; text: string; correct: boolean; index: number };
type PrismaQuestion = {
    id: string;
    question: string;
    categoryId: string | null;
    createdAt: Date;
    updatedAt: Date;
    options: PrismaOption[];
};

export class QuestionBankMap {
    public static toDTO(q: QuestionBankQuestion): QuestionBankDTO {
        return { id: q.id, question: q.question, options: q.options, categoryId: q.categoryId };
    }

    public static toDomain(raw: PrismaQuestion): QuestionBankQuestion {
        const questionOrError = QuestionText.create(raw.question);
        if (questionOrError.isFailure) throw new Error(questionOrError.errorValue());

        const optionResults = [...(raw.options ?? [])]
            .sort((a, b) => a.index - b.index)
            .map((o) => QuestionOption.create({ text: o.text, correct: o.correct }));

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
                categoryId: raw.categoryId ?? undefined,
                createdAt: raw.createdAt,
                updatedAt: raw.updatedAt,
            },
            raw.id,
        );
    }
}
