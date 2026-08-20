import { Result } from "../../../../../shared/core/Result";
import { IUserRepository } from "../../../domain/IUserRepository";
import { User } from "../../../domain/User";

export class ResendInvitationUseCase {
    constructor(private repo: IUserRepository) { }

    async execute(id: string): Promise<Result<User>> {
        try {
            const user = await this.repo.findById(id);
            if (!user) return Result.fail("USER_NOT_FOUND");

            if (user.status !== "INVITED") return Result.fail("USER_NOT_INVITED");

            const updated = await this.repo.markInvitationSent(id);
            return Result.ok(updated);
        } catch (err) {
            return Result.fail(err instanceof Error ? err.message : String(err));
        }
    }
}
