import { Result } from "../../../../../shared/core/Result";
import { IRoleRepository } from "../../../domain/IRoleRepository";
import { Permission } from "../../../domain/Permission";

export class GetAllPermissionsUseCase {
    constructor(private repo: IRoleRepository) { }

    async execute(): Promise<Result<Permission[]>> {
        try {
            const permissions = await this.repo.findAllPermissions();
            return Result.ok(permissions);
        } catch (err) {
            return Result.fail(err instanceof Error ? err.message : String(err));
        }
    }
}
