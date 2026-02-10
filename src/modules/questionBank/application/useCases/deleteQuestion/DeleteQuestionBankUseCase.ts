import { Result } from "../../../../../shared/core/Result";
import { IQuestionBankRepository } from "../../../domain/IQuestionBankRepository";
import { DeleteQuestionBankDTO } from "./DeleteQuestionBankDTO";

export class DeleteQuestionBankUseCase {
    constructor(private repo: IQuestionBankRepository) { }

    async execute(dto: DeleteQuestionBankDTO): Promise<Result<void>> {
        try {
            const existing = await this.repo.findById(dto.id);
            if (!existing) return Result.fail(`Question with id ${dto.id} not found`);

            await this.repo.delete(dto.id);
            return Result.ok<void>();
        } catch (err) {
            return Result.fail(err instanceof Error ? err.message : String(err));
        }
    }
}
