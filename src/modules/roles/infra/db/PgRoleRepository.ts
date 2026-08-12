import { IRoleRepository } from "../../domain/IRoleRepository";
import { Role } from "../../domain/Role";
import { RoleMap, RoleRow } from "../../mappers/RoleMap";
import { pgPool } from "../../../../shared/infra/postgres/pgClient";

export class PgRoleRepository implements IRoleRepository {
    async findById(id: string): Promise<Role | null> {
        const { rows } = await pgPool.query<RoleRow>(
            `SELECT r.*, COUNT(ur.user_id) AS user_count
             FROM roles r
             LEFT JOIN user_roles ur ON ur.role_id = r.id
             WHERE r.id = $1
             GROUP BY r.id`,
            [id]
        );
        return rows[0] ? RoleMap.toDomain(rows[0]) : null;
    }

    async findAll(): Promise<Role[]> {
        const { rows } = await pgPool.query<RoleRow>(
            `SELECT r.*, COUNT(ur.user_id) AS user_count
             FROM roles r
             LEFT JOIN user_roles ur ON ur.role_id = r.id
             GROUP BY r.id
             ORDER BY r.name ASC`
        );
        return rows.map((r) => RoleMap.toDomain(r));
    }
}
