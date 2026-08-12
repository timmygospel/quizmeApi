import { Result } from "../../../../shared/core/Result";

export class SessionName {
    private constructor(public readonly value: string) { }

    public static create(name: string): Result<SessionName> {
        if (!name || name.trim().length === 0) {
            return Result.fail<SessionName>("Session name cannot be empty");
        }
        if (name.trim().length > 150) {
            return Result.fail<SessionName>("Session name cannot exceed 150 characters");
        }
        return Result.ok(new SessionName(name.trim()));
    }
}
