import { Result } from "../../../../../shared/core/Result";
import { IUserRepository } from "../../../domain/IUserRepository";
import { User } from "../../../domain/User";
import { canTransitionUserStatus } from "../../../domain/userStatusTransitions";
import { isUserWithinScope } from "../../../domain/userInScope";
import { EffectiveScope } from "../../../../../shared/core/EffectiveScope";

export class SuspendUserUseCase {
    constructor(private repo: IUserRepository) { }

    async execute(id: string, scope?: EffectiveScope): Promise<Result<User>> {
        try {
            const user = await this.repo.findById(id);
            if (!user || !isUserWithinScope(user, scope)) return Result.fail("USER_NOT_FOUND");

            if (!canTransitionUserStatus(user.status, "SUSPENDED")) {
                return Result.fail(`INVALID_STATUS_TRANSITION:${user.status}`);
            }

            if (await this.repo.isSoleActiveAdministrator(id)) {
                return Result.fail("LAST_ACTIVE_ADMINISTRATOR");
            }

            const updated = await this.repo.updateStatus(id, "SUSPENDED");
            return Result.ok(updated);
        } catch (err) {
            return Result.fail(err instanceof Error ? err.message : String(err));
        }
    }
}
