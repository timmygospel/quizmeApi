import { Result } from "../../../../shared/core/Result";

export class HostName {
    private constructor(public readonly value: string) { }

    public static create(name: string): Result<HostName> {
        if (!name || name.trim().length === 0) {
            return Result.fail<HostName>("Host name cannot be empty");
        }
        if (name.trim().length > 80) {
            return Result.fail<HostName>("Host name cannot exceed 80 characters");
        }
        return Result.ok(new HostName(name.trim()));
    }
}
