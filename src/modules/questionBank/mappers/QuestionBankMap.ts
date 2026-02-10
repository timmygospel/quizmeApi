import { QuestionBankQuestion } from "../domain/QuestionBankQuestion";
import { QuestionText } from "../domain/valueObjects/QuestionText";
//import { QuestionOption } from "../domain/valueObjects/QuestionOption";
import { QuestionOption } from "../domain/valueObjects/QuestionOptions";
import { QuestionBankDTO } from "../dtos/QuestionBankDTO";
import { IQuestionBankDocument } from "../infra/db/QuestionBankModel";


export class QuestionBankMap {
    public static toDTO(q: QuestionBankQuestion): QuestionBankDTO {
        return {
            id: q.id,
            question: q.question,
            options: q.options,
            categoryId: q.categoryId,
        };
    }

    public static toDomain(raw: IQuestionBankDocument): QuestionBankQuestion {
        const questionOrError = QuestionText.create(raw.question);
        if (questionOrError.isFailure) throw new Error(questionOrError.errorValue());

        const optionResults = raw.options.map((o) =>
            QuestionOption.create({ text: o.text, correct: o.correct })
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
                categoryId: raw.categoryId ? String(raw.categoryId) : undefined,
                createdAt: raw.createdAt,
                updatedAt: raw.updatedAt,
            },
            String(raw._id)
        );
    }

    public static toPersistence(q: QuestionBankQuestion): any {
        return {
            question: q.question,
            options: q.options,
            categoryId: q.categoryId ?? null,
        };
    }
}
