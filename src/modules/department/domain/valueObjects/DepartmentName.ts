import { Result } from "../../../../shared/core/Result";

export class DepartmentName {
    private constructor(public readonly value: string) { }

    public static create(name: string): Result<DepartmentName> {
        if (!name || name.trim().length === 0) {
            return Result.fail<DepartmentName>("Department name cannot be empty");
        }
        if (name.trim().length > 50) {
            return Result.fail<DepartmentName>("Department name cannot exceed 50 characters");
        }
        return Result.ok(new DepartmentName(name.trim()));
    }
}
