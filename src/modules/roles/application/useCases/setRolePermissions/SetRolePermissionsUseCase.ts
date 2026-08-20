import { Result } from "../../../../../shared/core/Result";
import { Guard } from "../../../../../shared/core/Guard";
import { IRoleRepository } from "../../../domain/IRoleRepository";
import { Role } from "../../../domain/Role";
import { SetRolePermissionsDTO } from "./SetRolePermissionsDTO";

export class SetRolePermissionsUseCase {
    constructor(private repo: IRoleRepository) { }

    async execute(dto: SetRolePermissionsDTO): Promise<Result<Role>> {
        try {
            const role = await this.repo.findById(dto.roleId);
            if (!role) return Result.fail("ROLE_NOT_FOUND");
            if (role.archivedAt) return Result.fail("ROLE_ARCHIVED");

            Guard.againstNullOrUndefined(dto.permissionCodes, "permissionCodes");

            const catalogue = await this.repo.findAllPermissions();
            const known = new Set(catalogue.map((p) => p.code));
            for (const permissionCode of dto.permissionCodes) {
                if (!known.has(permissionCode)) return Result.fail(`PERMISSION_NOT_FOUND:${permissionCode}`);
            }

            const updated = await this.repo.setPermissions(dto.roleId, dto.permissionCodes);
            return Result.ok(updated);
        } catch (err) {
            return Result.fail(err instanceof Error ? err.message : String(err));
        }
    }
}
