import { Result } from "../../../../shared/core/Result";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class UserEmail {
    private constructor(public readonly value: string) { }

    public static create(email: string): Result<UserEmail> {
        if (!email || email.trim().length === 0) {
            return Result.fail<UserEmail>("Email cannot be empty");
        }
        const normalised = email.trim().toLowerCase();
        if (!EMAIL_REGEX.test(normalised)) {
            return Result.fail<UserEmail>("Email is not a valid email address");
        }
        return Result.ok(new UserEmail(normalised));
    }
}
