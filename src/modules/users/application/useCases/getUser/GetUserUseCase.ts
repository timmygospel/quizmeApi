import { Result } from "../../../../../shared/core/Result";
import { IUserRepository } from "../../../domain/IUserRepository";
import { User } from "../../../domain/User";
import { isUserWithinScope } from "../../../domain/userInScope";
import { EffectiveScope } from "../../../../../shared/core/EffectiveScope";

export class GetUserUseCase {
    constructor(private repo: IUserRepository) { }

    async execute(id: string, scope?: EffectiveScope): Promise<Result<User>> {
        try {
            const user = await this.repo.findById(id);
            // Same failure for "doesn't exist" and "exists but outside your
            // scope" — a caller must not be able to distinguish the two by
            // response, per PERMISSIONS.md §11.
            if (!user || !isUserWithinScope(user, scope)) {
                return Result.fail(`User with id ${id} not found`);
            }
            return Result.ok(user);
        } catch (err) {
            return Result.fail(err instanceof Error ? err.message : String(err));
        }
    }
}
