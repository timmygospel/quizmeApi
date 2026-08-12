import { Result } from "../../../../../shared/core/Result";
import { IRoleRepository } from "../../../domain/IRoleRepository";
import { Role } from "../../../domain/Role";

export class GetAllRolesUseCase {
    constructor(private repo: IRoleRepository) { }

    async execute(): Promise<Result<Role[]>> {
        try {
            const roles = await this.repo.findAll();
            return Result.ok(roles);
        } catch (err) {
            return Result.fail(err instanceof Error ? err.message : String(err));
        }
    }
}
