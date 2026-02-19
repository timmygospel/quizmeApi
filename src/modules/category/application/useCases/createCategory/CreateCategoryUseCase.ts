
import { Result } from "../../../../../shared/core/Result";
import { UseCase } from "../../../../../shared/core/UseCase";
import { ICategoryRepository } from "../../../domain/ICategoryRepository";
import { Category } from "../../../domain/Category";
import { CategoryName } from "../../../domain/valueObjects/CategoryName";
import { CreateCategoryDTO } from "./CreateCategoryDTO";

export class CreateCategoryUseCase implements UseCase<CreateCategoryDTO, Promise<Result<Category>>> {
    constructor(private repo: ICategoryRepository) { }

    async execute(dto: CreateCategoryDTO): Promise<Result<Category>> {
        try {
            const nameOrError = CategoryName.create(dto.name);
            if (nameOrError.isFailure) return Result.fail(nameOrError.errorValue());

            const category = new Category({ name: nameOrError.getValue() });

            const saved = await this.repo.save(category);
            return Result.ok(saved);
        } catch (err) {
            return Result.fail(err instanceof Error ? err.message : String(err));
        }
    }
}
