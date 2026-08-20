import { Result } from "../../../../../shared/core/Result";
import { IRoleRepository } from "../../../domain/IRoleRepository";
import { Permission } from "../../../domain/Permission";

export interface PermissionWithGrant extends Permission {
    granted: boolean;
}

export class GetRolePermissionsUseCase {
    constructor(private repo: IRoleRepository) { }

    async execute(roleId: string): Promise<Result<PermissionWithGrant[]>> {
        try {
            const role = await this.repo.findById(roleId);
            if (!role) return Result.fail("ROLE_NOT_FOUND");

            const catalogue = await this.repo.findAllPermissions();
            const granted = new Set(role.permissions);

            return Result.ok(catalogue.map((permission) => ({ ...permission, granted: granted.has(permission.code) })));
        } catch (err) {
            return Result.fail(err instanceof Error ? err.message : String(err));
        }
    }
}
