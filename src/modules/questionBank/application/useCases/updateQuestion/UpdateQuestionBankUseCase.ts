import { Result } from "../../../../../shared/core/Result";
import { UseCase } from "../../../../../shared/core/UseCase";

import { IQuestionBankRepository } from "../../../domain/IQuestionBankRepository";
import { QuestionBankQuestion } from "../../../domain/QuestionBankQuestion";
import { QuestionText } from "../../../domain/valueObjects/QuestionText";
import { QuestionOption } from "../../../domain/valueObjects/QuestionOptions";
import { UpdateQuestionBankDTO } from "./UpdateQuestionBankDTO";

export class UpdateQuestionBankUseCase
    implements UseCase<UpdateQuestionBankDTO, Promise<Result<QuestionBankQuestion>>> {
    constructor(private repo: IQuestionBankRepository) { }

    async execute(dto: UpdateQuestionBankDTO): Promise<Result<QuestionBankQuestion>> {
        try {
            const existing = await this.repo.findById(dto.id);
            if (!existing) return Result.fail(`Question with id ${dto.id} not found`);

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

            const updated = new QuestionBankQuestion(
                {
                    ...existing.props,
                    question: questionOrError.getValue(),
                    options,
                    categoryId: dto.categoryId,
                },
                dto.id
            );

            const saved = await this.repo.save(updated);
            return Result.ok(saved);
        } catch (err) {
            return Result.fail(err instanceof Error ? err.message : String(err));
        }
    }
}
