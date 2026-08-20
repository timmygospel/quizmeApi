import { Result } from "../../../../../shared/core/Result";
import { Guard } from "../../../../../shared/core/Guard";
import { IRoleRepository } from "../../../domain/IRoleRepository";
import { Role } from "../../../domain/Role";
import { CreateRoleDTO } from "./CreateRoleDTO";

// Custom roles don't take a code from the caller (per USERS_ROLES.md §14,
// "Never expose API permission codes to normal users" — the same spirit
// applies to role codes, which are an internal identifier) — it's derived
// from the name instead.
function deriveRoleCode(name: string): string {
    return name
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
}

export class CreateRoleUseCase {
    constructor(private repo: IRoleRepository) { }

    async execute(dto: CreateRoleDTO): Promise<Result<Role>> {
        try {
            Guard.againstEmptyString(dto.name, "name");

            const code = deriveRoleCode(dto.name);
            if (!code) return Result.fail("A role name must contain at least one letter or number");

            const existingByCode = await this.repo.findByCode(code);
            if (existingByCode) return Result.fail(`ROLE_CODE_ALREADY_EXISTS:${existingByCode.id}`);

            const permissionCodes = dto.permissionCodes ?? [];
            if (permissionCodes.length) {
                const catalogue = await this.repo.findAllPermissions();
                const known = new Set(catalogue.map((p) => p.code));
                for (const permissionCode of permissionCodes) {
                    if (!known.has(permissionCode)) return Result.fail(`PERMISSION_NOT_FOUND:${permissionCode}`);
                }
            }

            const role = await this.repo.create({
                code,
                name: dto.name.trim(),
                description: dto.description?.trim() ?? "",
                permissionCodes,
            });

            return Result.ok(role);
        } catch (err) {
            return Result.fail(err instanceof Error ? err.message : String(err));
        }
    }
}
