import { Result } from "../../../../shared/core/Result";

export class LocationName {
    private constructor(public readonly value: string) { }

    public static create(name: string): Result<LocationName> {
        if (!name || name.trim().length === 0) {
            return Result.fail<LocationName>("Location name cannot be empty");
        }
        if (name.trim().length > 50) {
            return Result.fail<LocationName>("Location name cannot exceed 50 characters");
        }
        return Result.ok(new LocationName(name.trim()));
    }
}
