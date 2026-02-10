import { Category } from "../domain/Category";
import { CategoryName } from "../domain/valueObjects/CategoryName";
import { CategoryDTO } from "../dtos/CategoryDTO";
import { ICategoryDocument } from "../infra/db/CategoryModel";

export class CategoryMap {
    public static toDTO(category: Category): CategoryDTO {
        return {
            id: category.id,
            name: category.name,
        };
    }

    public static toDomain(raw: ICategoryDocument): Category {
        const nameOrError = CategoryName.create(raw.name);
        if (nameOrError.isFailure) {
            throw new Error(nameOrError.errorValue());
        }

        return new Category(
            {
                name: nameOrError.getValue(),
                createdAt: raw.createdAt,
                updatedAt: raw.updatedAt,
            },
            String(raw._id)
        );
    }

    public static toPersistence(category: Category): any {
        return {
            name: category.name,
        };
    }
}
