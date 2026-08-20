import { Result } from "../../../../../shared/core/Result";
import { IRoleRepository } from "../../../domain/IRoleRepository";
import { Role } from "../../../domain/Role";

export class GetRoleUseCase {
    constructor(private repo: IRoleRepository) { }

    async execute(id: string): Promise<Result<Role>> {
        try {
            const role = await this.repo.findById(id);
            if (!role) return Result.fail(`Role with id ${id} not found`);
            return Result.ok(role);
        } catch (err) {
            return Result.fail(err instanceof Error ? err.message : String(err));
        }
    }
}
