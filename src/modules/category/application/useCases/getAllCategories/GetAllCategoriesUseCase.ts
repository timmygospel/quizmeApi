import { Result } from "../../../../shared/core/Result";
import { ICategoryRepository } from "../../../category/domain/ICategoryRepository";
import { Category } from "../../../category/domain/Category";

export class GetAllCategoriesUseCase {
    constructor(private repo: ICategoryRepository) { }

    async execute(): Promise<Result<Category[]>> {
        try {
            const categories = await this.repo.findAll();
            return Result.ok(categories);
        } catch (err) {
            return Result.fail(err instanceof Error ? err.message : String(err));
        }
    }
}
