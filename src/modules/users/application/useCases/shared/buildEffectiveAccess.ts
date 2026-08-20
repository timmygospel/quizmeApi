import { IUserRepository } from "../../../domain/IUserRepository";
import { IRoleRepository } from "../../../../roles/domain/IRoleRepository";
import { isOrgWideRole } from "../../../../roles/domain/orgWideRoles";
import { EffectiveAccessDTO } from "../../../dtos/EffectiveAccessDTO";

export async function buildEffectiveAccess(
    userId: string,
    userRepo: IUserRepository,
    roleRepo: IRoleRepository
): Promise<EffectiveAccessDTO> {
    const roleScopes = await userRepo.findEffectiveAccess(userId);

    const permissions = new Set<string>();
    const roles = [];
    for (const roleScope of roleScopes) {
        const role = await roleRepo.findById(roleScope.role.id);
        role?.permissions.forEach((p) => permissions.add(p));

        roles.push({
            role: roleScope.role,
            organisationWide: isOrgWideRole(roleScope.role.code),
            allLocations: roleScope.allLocations,
            locations: roleScope.locations,
            departments: roleScope.departments,
        });
    }

    return { userId, roles, permissions: [...permissions] };
}
