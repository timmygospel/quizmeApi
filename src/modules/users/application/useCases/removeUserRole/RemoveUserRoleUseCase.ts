import { Result } from "../../../../../shared/core/Result";
import { IUserRepository } from "../../../domain/IUserRepository";
import { IRoleRepository } from "../../../../roles/domain/IRoleRepository";
import { EffectiveAccessDTO } from "../../../dtos/EffectiveAccessDTO";
import { buildEffectiveAccess } from "../shared/buildEffectiveAccess";

export class RemoveUserRoleUseCase {
    constructor(
        private userRepo: IUserRepository,
        private roleRepo: IRoleRepository
    ) { }

    async execute(userId: string, roleId: string): Promise<Result<EffectiveAccessDTO>> {
        try {
            const user = await this.userRepo.findById(userId);
            if (!user) return Result.fail("USER_NOT_FOUND");

            const hasRole = await this.userRepo.hasRole(userId, roleId);
            if (!hasRole) return Result.fail("ROLE_NOT_ASSIGNED");

            // Final-admin protection (USERS_ROLES.md §36): removing the
            // Administrator role from the organisation's last active
            // Administrator is blocked, same as suspend/archive.
            const role = await this.roleRepo.findById(roleId);
            if (role?.code === "ADMINISTRATOR" && (await this.userRepo.isSoleActiveAdministrator(userId))) {
                return Result.fail("LAST_ACTIVE_ADMINISTRATOR");
            }

            await this.userRepo.removeRole(userId, roleId);

            const effectiveAccess = await buildEffectiveAccess(userId, this.userRepo, this.roleRepo);
            return Result.ok(effectiveAccess);
        } catch (err) {
            return Result.fail(err instanceof Error ? err.message : String(err));
        }
    }
}
