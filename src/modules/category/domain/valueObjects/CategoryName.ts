import { Result } from "../../../../shared/core/Result";

export class CategoryName {
    private constructor(public readonly value: string) { }

    public static create(name: string): Result<CategoryName> {
        if (!name || name.trim().length === 0) {
            return Result.fail<CategoryName>("Category name cannot be empty");
        }
        if (name.trim().length > 50) {
            return Result.fail<CategoryName>("Category name cannot exceed 50 characters");
        }
        return Result.ok(new CategoryName(name.trim()));
    }
}
