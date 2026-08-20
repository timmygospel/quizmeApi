import { Result } from "../../../../../shared/core/Result";
import { IUserRepository } from "../../../domain/IUserRepository";
import { IRoleRepository } from "../../../../roles/domain/IRoleRepository";
import { EffectiveAccessDTO } from "../../../dtos/EffectiveAccessDTO";
import { buildEffectiveAccess } from "../shared/buildEffectiveAccess";

export class GetUserEffectiveAccessUseCase {
    constructor(
        private userRepo: IUserRepository,
        private roleRepo: IRoleRepository
    ) { }

    async execute(userId: string): Promise<Result<EffectiveAccessDTO>> {
        try {
            const user = await this.userRepo.findById(userId);
            if (!user) return Result.fail("USER_NOT_FOUND");

            const effectiveAccess = await buildEffectiveAccess(userId, this.userRepo, this.roleRepo);
            return Result.ok(effectiveAccess);
        } catch (err) {
            return Result.fail(err instanceof Error ? err.message : String(err));
        }
    }
}
