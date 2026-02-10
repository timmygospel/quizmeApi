import { Result } from "../../../../shared/core/Result";
import { ICategoryRepository } from "../../../category/domain/ICategoryRepository";
import { DeleteCategoryDTO } from "./DeleteCategoryDTO";

export class DeleteCategoryUseCase {
    constructor(private repo: ICategoryRepository) { }

    async execute(dto: DeleteCategoryDTO): Promise<Result<void>> {
        try {
            const existing = await this.repo.findById(dto.id);
            if (!existing) return Result.fail(`Category with id ${dto.id} not found`);

            await this.repo.delete(dto.id);
            return Result.ok();
        } catch (err) {
            return Result.fail(err instanceof Error ? err.message : String(err));
        }
    }
}
