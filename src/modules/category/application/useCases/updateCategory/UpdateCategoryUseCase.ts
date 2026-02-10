import { Result } from "../../../../shared/core/Result"
import { UseCase } from "../../../../shared/core/UseCase"

import { ICategoryRepository } from "../../..//category/domain/ICategoryRepository";
import { Category } from "../../../category/domain/Category";
import { CategoryName } from "../../../category/domain/valueObjects/CategoryName";
import { UpdateCategoryDTO } from "./UpdateCategoryDTO";

export class UpdateCategoryUseCase
    implements UseCase<UpdateCategoryDTO, Promise<Result<Category>>> {
    constructor(private repo: ICategoryRepository) { }

    async execute(dto: UpdateCategoryDTO): Promise<Result<Category>> {
        try {
            const existing = await this.repo.findById(dto.id);
            if (!existing) {
                return Result.fail<Category>(`Category with id ${dto.id} not found`);
            }

            const nameOrError = CategoryName.create(dto.name);
            if (nameOrError.isFailure) return Result.fail<Category>(nameOrError.errorValue());

            const updated = new Category(
                {
                    ...existing.props,
                    name: nameOrError.getValue(),
                },
                dto.id
            );

            const saved = await this.repo.save(updated);
            return Result.ok(saved);
        } catch (err) {
            return Result.fail<Category>(err instanceof Error ? err.message : String(err));
        }
    }
}