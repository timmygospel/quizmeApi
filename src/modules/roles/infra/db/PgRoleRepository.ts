import { CreateRoleInput, IRoleRepository, UpdateRoleInput } from "../../domain/IRoleRepository";
import { Permission } from "../../domain/Permission";
import { Role } from "../../domain/Role";
import { RoleMap, RoleRow } from "../../mappers/RoleMap";
import { pgPool } from "../../../../shared/infra/postgres/pgClient";

const BASE_SELECT = `
    SELECT
        r.*,
        COALESCE(uc.user_count, 0) AS user_count,
        COALESCE(rp.permission_codes, '[]'::json) AS permission_codes
    FROM roles r
    LEFT JOIN LATERAL (
        SELECT COUNT(*) AS user_count
        FROM user_roles ur
        WHERE ur.role_id = r.id
    ) uc ON true
    LEFT JOIN LATERAL (
        SELECT json_agg(permission_code ORDER BY permission_code) AS permission_codes
        FROM role_permissions rp2
        WHERE rp2.role_id = r.id
    ) rp ON true
`;

export class PgRoleRepository implements IRoleRepository {
    async findById(id: string): Promise<Role | null> {
        const { rows } = await pgPool.query<RoleRow>(`${BASE_SELECT} WHERE r.id = $1`, [id]);
        return rows[0] ? RoleMap.toDomain(rows[0]) : null;
    }

    async findByCode(code: string): Promise<Role | null> {
        const { rows } = await pgPool.query<RoleRow>(`${BASE_SELECT} WHERE r.code = $1`, [code]);
        return rows[0] ? RoleMap.toDomain(rows[0]) : null;
    }

    async findAll(): Promise<Role[]> {
        const { rows } = await pgPool.query<RoleRow>(`${BASE_SELECT} ORDER BY r.name ASC`);
        return rows.map((r) => RoleMap.toDomain(r));
    }

    async create(input: CreateRoleInput): Promise<Role> {
        const client = await pgPool.connect();
        try {
            await client.query("BEGIN");

            const { rows } = await client.query<{ id: string }>(
                `INSERT INTO roles (code, name, description, type) VALUES ($1, $2, $3, 'CUSTOM') RETURNING id`,
                [input.code, input.name, input.description]
            );
            const roleId = rows[0].id;

            for (const permissionCode of input.permissionCodes) {
                await client.query(`INSERT INTO role_permissions (role_id, permission_code) VALUES ($1, $2)`, [
                    roleId,
                    permissionCode,
                ]);
            }

            await client.query("COMMIT");

            const { rows: hydrated } = await client.query<RoleRow>(`${BASE_SELECT} WHERE r.id = $1`, [roleId]);
            return RoleMap.toDomain(hydrated[0]);
        } catch (err: any) {
            await client.query("ROLLBACK");
            if (err?.code === "23505") {
                throw new Error("ROLE_CODE_ALREADY_EXISTS");
            }
            throw err;
        } finally {
            client.release();
        }
    }

    async update(id: string, input: UpdateRoleInput): Promise<Role> {
        const sets: string[] = [];
        const params: unknown[] = [];

        if (input.name !== undefined) {
            params.push(input.name);
            sets.push(`name = $${params.length}`);
        }
        if (input.description !== undefined) {
            params.push(input.description);
            sets.push(`description = $${params.length}`);
        }

        if (sets.length) {
            params.push(id);
            await pgPool.query(`UPDATE roles SET ${sets.join(", ")}, updated_at = now() WHERE id = $${params.length}`, params);
        }

        const hydrated = await this.findById(id);
        if (!hydrated) throw new Error("ROLE_NOT_FOUND");
        return hydrated;
    }

    async archive(id: string): Promise<Role> {
        const { rows } = await pgPool.query<{ id: string }>(
            `UPDATE roles SET archived_at = now(), updated_at = now() WHERE id = $1 RETURNING id`,
            [id]
        );
        if (!rows[0]) throw new Error("ROLE_NOT_FOUND");

        const hydrated = await this.findById(id);
        if (!hydrated) throw new Error("ROLE_NOT_FOUND");
        return hydrated;
    }

    async setPermissions(roleId: string, permissionCodes: string[]): Promise<Role> {
        const client = await pgPool.connect();
        try {
            await client.query("BEGIN");
            await client.query(`DELETE FROM role_permissions WHERE role_id = $1`, [roleId]);
            for (const permissionCode of permissionCodes) {
                await client.query(`INSERT INTO role_permissions (role_id, permission_code) VALUES ($1, $2)`, [
                    roleId,
                    permissionCode,
                ]);
            }
            await client.query("COMMIT");
        } catch (err) {
            await client.query("ROLLBACK");
            throw err;
        } finally {
            client.release();
        }

        const hydrated = await this.findById(roleId);
        if (!hydrated) throw new Error("ROLE_NOT_FOUND");
        return hydrated;
    }

    async findAllPermissions(): Promise<Permission[]> {
        const { rows } = await pgPool.query<Permission>(
            `SELECT code, name, description, category FROM permissions ORDER BY category ASC, name ASC`
        );
        return rows;
    }
}
