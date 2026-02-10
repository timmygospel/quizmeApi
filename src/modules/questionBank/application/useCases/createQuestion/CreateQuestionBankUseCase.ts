import { Result } from "../../../../../shared/core/Result";
import { UseCase } from "../../../../../shared/core/UseCase";

import { IQuestionBankRepository } from "../../../domain/IQuestionBankRepository";
import { QuestionBankQuestion } from "../../../domain/QuestionBankQuestion";
import { QuestionText } from "../../../domain/valueObjects/QuestionText";
import { QuestionOption } from "../../../domain/valueObjects/QuestionOptions";
import { CreateQuestionBankDTO } from "./CreateQuestionBankDTO";

export class CreateQuestionBankUseCase
    implements UseCase<CreateQuestionBankDTO, Promise<Result<QuestionBankQuestion>>> {
    constructor(private repo: IQuestionBankRepository) { }

    async execute(dto: CreateQuestionBankDTO): Promise<Result<QuestionBankQuestion>> {
        try {
            const questionOrError = QuestionText.create(dto.question);
            if (questionOrError.isFailure) return Result.fail(questionOrError.errorValue());

            const optionResults = (dto.options ?? []).map((o) =>
                QuestionOption.create({ text: o.text, correct: o.correct })
            );

            for (const r of optionResults) {
                if (r.isFailure) return Result.fail(r.errorValue());
            }

            const options = optionResults.map((r) => r.getValue());
            const optionsValid = QuestionBankQuestion.validateOptions(options);
            if (optionsValid.isFailure) return Result.fail(optionsValid.errorValue());

            const question = new QuestionBankQuestion({
                question: questionOrError.getValue(),
                options,
                categoryId: dto.categoryId,
            });

            const saved = await this.repo.save(question);
            return Result.ok(saved);
        } catch (err) {
            return Result.fail(err instanceof Error ? err.message : String(err));
        }
    }
}
