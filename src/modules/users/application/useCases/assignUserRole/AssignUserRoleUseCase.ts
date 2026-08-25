import { Result } from "../../../../../shared/core/Result";
import { IUserRepository } from "../../../domain/IUserRepository";
import { IRoleRepository } from "../../../../roles/domain/IRoleRepository";
import { IDepartmentRepository } from "../../../../department/domain/IDepartmentRepository";
import { ILocationRepository } from "../../../../location/domain/ILocationRepository";
import { isOrgWideRole } from "../../../../roles/domain/orgWideRoles";
import { EffectiveAccessDTO } from "../../../dtos/EffectiveAccessDTO";
import { buildEffectiveAccess } from "../shared/buildEffectiveAccess";
import { isUserWithinScope } from "../../../domain/userInScope";
import { EffectiveScope } from "../../../../../shared/core/EffectiveScope";
import { AssignUserRoleDTO } from "./AssignUserRoleDTO";

export class AssignUserRoleUseCase {
    constructor(
        private userRepo: IUserRepository,
        private roleRepo: IRoleRepository,
        private departmentRepo: IDepartmentRepository,
        private locationRepo: ILocationRepository
    ) { }

    async execute(dto: AssignUserRoleDTO, scope?: EffectiveScope): Promise<Result<EffectiveAccessDTO>> {
        try {
            const user = await this.userRepo.findById(dto.userId);
            if (!user || !isUserWithinScope(user, scope)) return Result.fail("USER_NOT_FOUND");
            if (user.status === "ARCHIVED") return Result.fail("USER_ARCHIVED");

            const role = await this.roleRepo.findById(dto.roleId);
            if (!role) return Result.fail("ROLE_NOT_FOUND");
            if (role.archivedAt) return Result.fail("ROLE_ARCHIVED");

            const allLocations = dto.allLocations ?? false;
            const locationIds = dto.locationIds ?? [];
            const departmentIds = dto.departmentIds ?? [];

            if (isOrgWideRole(role.code)) {
                if (allLocations || locationIds.length || departmentIds.length) {
                    return Result.fail("ORG_WIDE_ROLE_CANNOT_BE_SCOPED");
                }
            } else if (!allLocations && locationIds.length === 0 && departmentIds.length === 0) {
                return Result.fail("SCOPE_REQUIRED");
            }

            for (const locationId of locationIds) {
                const location = await this.locationRepo.findById(locationId);
                if (!location) return Result.fail(`LOCATION_NOT_FOUND:${locationId}`);
            }
            for (const departmentId of departmentIds) {
                const department = await this.departmentRepo.findById(departmentId);
                if (!department) return Result.fail(`DEPARTMENT_NOT_FOUND:${departmentId}`);
            }

            await this.userRepo.assignRole(dto.userId, dto.roleId, { allLocations, locationIds, departmentIds });

            const effectiveAccess = await buildEffectiveAccess(dto.userId, this.userRepo, this.roleRepo);
            return Result.ok(effectiveAccess);
        } catch (err) {
            return Result.fail(err instanceof Error ? err.message : String(err));
        }
    }
}
