import { Result } from "../../../../../shared/core/Result";
import { IRoleRepository } from "../../../domain/IRoleRepository";
import { Role } from "../../../domain/Role";

export class ArchiveRoleUseCase {
    constructor(private repo: IRoleRepository) { }

    async execute(id: string): Promise<Result<Role>> {
        try {
            const role = await this.repo.findById(id);
            if (!role) return Result.fail("ROLE_NOT_FOUND");
            if (role.type === "SYSTEM") return Result.fail("CANNOT_ARCHIVE_SYSTEM_ROLE");
            if (role.archivedAt) return Result.fail("ROLE_ALREADY_ARCHIVED");

            const archived = await this.repo.archive(id);
            return Result.ok(archived);
        } catch (err) {
            return Result.fail(err instanceof Error ? err.message : String(err));
        }
    }
}
