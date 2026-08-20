import { Result } from "../../../../../shared/core/Result";
import { Guard } from "../../../../../shared/core/Guard";
import { IRoleRepository } from "../../../domain/IRoleRepository";
import { Role } from "../../../domain/Role";
import { UpdateRoleDTO } from "./UpdateRoleDTO";

export class UpdateRoleUseCase {
    constructor(private repo: IRoleRepository) { }

    async execute(dto: UpdateRoleDTO): Promise<Result<Role>> {
        try {
            const role = await this.repo.findById(dto.id);
            if (!role) return Result.fail("ROLE_NOT_FOUND");
            if (role.archivedAt) return Result.fail("ROLE_ARCHIVED");

            if (dto.name !== undefined) Guard.againstEmptyString(dto.name, "name");

            const updated = await this.repo.update(dto.id, {
                name: dto.name?.trim(),
                description: dto.description?.trim(),
            });

            return Result.ok(updated);
        } catch (err) {
            return Result.fail(err instanceof Error ? err.message : String(err));
        }
    }
}
