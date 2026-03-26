import { Category } from "../domain/Category";
import { CategoryName } from "../domain/valueObjects/CategoryName";
import { CategoryDTO } from "../dtos/CategoryDTO";

type PrismaCategory = { id: string; name: string; createdAt: Date; updatedAt: Date };

export class CategoryMap {
    public static toDTO(category: Category): CategoryDTO {
        return { id: category.id!, name: category.name };
    }

    public static toDomain(raw: PrismaCategory): Category {
        const nameOrError = CategoryName.create(raw.name);
        if (nameOrError.isFailure) throw new Error(nameOrError.errorValue());
        return new Category(
            { name: nameOrError.getValue(), createdAt: raw.createdAt, updatedAt: raw.updatedAt },
            raw.id,
        );
    }
}
