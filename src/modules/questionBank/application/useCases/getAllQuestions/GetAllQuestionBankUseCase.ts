import { Result } from "../../../../../shared/core/Result";
import { IQuestionBankRepository } from "../../../domain/IQuestionBankRepository";
import { QuestionBankQuestion } from "../../../domain/QuestionBankQuestion";

export class GetAllQuestionBankUseCase {
    constructor(private repo: IQuestionBankRepository) { }

    async execute(categoryId?: string): Promise<Result<QuestionBankQuestion[]>> {
        try {
            const items = await this.repo.findAll(categoryId);
            return Result.ok(items);
        } catch (err) {
            return Result.fail(err instanceof Error ? err.message : String(err));
        }
    }
}
