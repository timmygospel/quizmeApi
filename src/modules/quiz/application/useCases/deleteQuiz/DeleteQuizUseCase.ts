import { IQuizRepository } from "../../../domain/IQuizRepository";
import { DeleteQuizDTO } from "./DeleteQuizDTO";
import { Result } from "../../../../../shared/core/Result";

export class DeleteQuizUseCase {
    constructor(private quizRepo: IQuizRepository) { }

    async execute(dto: DeleteQuizDTO): Promise<Result<void>> {
        try {
            const existing = await this.quizRepo.findById(dto.id);

            if (!existing) {
                return Result.fail(`Quiz with id ${dto.id} not found`);
            }

            await this.quizRepo.delete(dto.id);
            return Result.ok();
        } catch (err) {
            return Result.fail(err instanceof Error ? err.message : String(err));
        }
    }
}
