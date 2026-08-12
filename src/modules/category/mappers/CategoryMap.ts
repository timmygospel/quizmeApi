import { Category } from "../domain/Category";
import { CategoryName } from "../domain/valueObjects/CategoryName";
import { CategoryDTO } from "../dtos/CategoryDTO";

export interface CategoryRow {
    id: string;
    name: string;
    created_at: Date;
    updated_at: Date;
}

export class CategoryMap {
    public static toDTO(category: Category): CategoryDTO {
        return {
            id: category.id,
            name: category.name,
        };
    }

    public static toDomain(raw: CategoryRow): Category {
        const nameOrError = CategoryName.create(raw.name);
        if (nameOrError.isFailure) {
            throw new Error(nameOrError.errorValue());
        }

        return new Category(
            {
                name: nameOrError.getValue(),
                createdAt: raw.created_at,
                updatedAt: raw.updated_at,
            },
            raw.id
        );
    }
}
