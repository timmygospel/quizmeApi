import {
    AssignedRoleScope,
    CreateUserInput,
    IUserRepository,
    RoleScopeInput,
    UserListFilters,
    UserListResult,
} from "../../domain/IUserRepository";
import { User, UserStatus } from "../../domain/User";
import { UserMap, UserRow } from "../../mappers/UserMap";
import { pgPool } from "../../../../shared/infra/postgres/pgClient";
import { EffectiveScope } from "../../../../shared/core/EffectiveScope";

// PERMISSIONS.md §3 scope enforcement for a `users` list query. Pure (given
// the same `params` array reference to push onto, for $n numbering to stay
// consistent with whatever conditions were built before it) so it's unit
// testable without a database — see PgUserRepository.test.ts.
//
// ORGANISATION applies no restriction. SELF restricts to the caller's own
// row. SCOPED restricts to the union of the caller's role scopes: location
// is unrestricted when allLocations is set or no role granted specific
// locations, department is unrestricted when no role granted specific
// departments — both conditions apply (AND) when both are present, since
// locations and departments are independent axes on a user row, not nested.
export function buildScopeConditions(scope: EffectiveScope | undefined, params: unknown[]): string[] {
    if (!scope || scope.type === "ORGANISATION") return [];

    if (scope.type === "SELF") {
        params.push(scope.userId);
        return [`u.id = $${params.length}`];
    }

    const conditions: string[] = [];
    if (!scope.allLocations && scope.locationIds.length > 0) {
        params.push(scope.locationIds);
        conditions.push(`u.location_id = ANY($${params.length})`);
    }
    if (scope.departmentIds.length > 0) {
        params.push(scope.departmentIds);
        conditions.push(`u.department_id = ANY($${params.length})`);
    }
    return conditions;
}

const BASE_SELECT = `
    SELECT
        u.*,
        d.name AS department_name,
        l.name AS location_name,
        COALESCE(ur.roles, '[]'::json) AS roles
    FROM users u
    LEFT JOIN departments d ON d.id = u.department_id
    LEFT JOIN locations l ON l.id = u.location_id
    LEFT JOIN LATERAL (
        SELECT json_agg(json_build_object('id', r.id, 'name', r.name) ORDER BY r.name) AS roles
        FROM user_roles uro
        JOIN roles r ON r.id = uro.role_id
        WHERE uro.user_id = u.id
    ) ur ON true
`;

export class PgUserRepository implements IUserRepository {
    async findById(id: string): Promise<User | null> {
        const { rows } = await pgPool.query<UserRow>(`${BASE_SELECT} WHERE u.id = $1`, [id]);
        return rows[0] ? UserMap.toDomain(rows[0]) : null;
    }

    async findByEmail(email: string): Promise<User | null> {
        const { rows } = await pgPool.query<UserRow>(`${BASE_SELECT} WHERE u.email = $1`, [email]);
        return rows[0] ? UserMap.toDomain(rows[0]) : null;
    }

    async findAll(filters: UserListFilters): Promise<UserListResult> {
        const conditions: string[] = [];
        const params: unknown[] = [];

        if (filters.search) {
            params.push(`%${filters.search}%`);
            conditions.push(
                `(u.first_name ILIKE $${params.length} OR u.last_name ILIKE $${params.length} OR u.email ILIKE $${params.length})`
            );
        }
        if (filters.status) {
            params.push(filters.status);
            conditions.push(`u.status = $${params.length}`);
        }
        if (filters.departmentId) {
            params.push(filters.departmentId);
            conditions.push(`u.department_id = $${params.length}`);
        }
        if (filters.locationId) {
            params.push(filters.locationId);
            conditions.push(`u.location_id = $${params.length}`);
        }
        if (filters.roleId) {
            params.push(filters.roleId);
            conditions.push(
                `EXISTS (SELECT 1 FROM user_roles ur2 WHERE ur2.user_id = u.id AND ur2.role_id = $${params.length})`
            );
        }
        conditions.push(...buildScopeConditions(filters.scope, params));

        const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

        const countResult = await pgPool.query<{ count: string }>(
            `SELECT COUNT(*) FROM users u ${whereClause}`,
            params
        );
        const totalItems = parseInt(countResult.rows[0].count, 10);

        const listParams = [...params, filters.pageSize, (filters.page - 1) * filters.pageSize];

        const { rows } = await pgPool.query<UserRow>(
            `${BASE_SELECT} ${whereClause}
             ORDER BY u.last_name ASC, u.first_name ASC
             LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
            listParams
        );

        return {
            items: rows.map((r) => UserMap.toDomain(r)),
            totalItems,
        };
    }

    async create(input: CreateUserInput): Promise<User> {
        const client = await pgPool.connect();
        try {
            await client.query("BEGIN");

            const { rows } = await client.query<{ id: string }>(
                `INSERT INTO users (first_name, last_name, email, status, department_id, location_id, invitation_sent_at)
                 VALUES ($1, $2, $3, 'INVITED', $4, $5, now())
                 RETURNING id`,
                [input.firstName, input.lastName, input.email, input.departmentId, input.locationId]
            );
            const userId = rows[0].id;

            for (const roleId of input.roleIds) {
                await client.query(`INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`, [userId, roleId]);
            }

            await client.query("COMMIT");

            const { rows: hydrated } = await client.query<UserRow>(`${BASE_SELECT} WHERE u.id = $1`, [userId]);
            return UserMap.toDomain(hydrated[0]);
        } catch (err: any) {
            await client.query("ROLLBACK");
            if (err?.code === "23505") {
                throw new Error("USER_EMAIL_ALREADY_EXISTS");
            }
            throw err;
        } finally {
            client.release();
        }
    }

    async markInvitationSent(id: string): Promise<User> {
        const { rows } = await pgPool.query<{ id: string }>(
            `UPDATE users SET invitation_sent_at = now(), updated_at = now() WHERE id = $1 RETURNING id`,
            [id]
        );
        if (!rows[0]) throw new Error("USER_NOT_FOUND");

        const hydrated = await this.findById(id);
        if (!hydrated) throw new Error("USER_NOT_FOUND");
        return hydrated;
    }

    async updateStatus(id: string, status: UserStatus): Promise<User> {
        const { rows } = await pgPool.query<{ id: string }>(
            `UPDATE users SET status = $2, updated_at = now() WHERE id = $1 RETURNING id`,
            [id, status]
        );
        if (!rows[0]) throw new Error("USER_NOT_FOUND");

        const hydrated = await this.findById(id);
        if (!hydrated) throw new Error("USER_NOT_FOUND");
        return hydrated;
    }

    // True when this user is currently an ACTIVE Administrator and no other
    // ACTIVE Administrator exists — the final-admin self-protection check
    // from USERS_ROLES.md §36.
    async isSoleActiveAdministrator(id: string): Promise<boolean> {
        const { rows } = await pgPool.query<{ is_sole: boolean }>(
            `SELECT
                EXISTS (
                    SELECT 1 FROM users u
                    JOIN user_roles ur ON ur.user_id = u.id
                    JOIN roles r ON r.id = ur.role_id
                    WHERE u.id = $1 AND u.status = 'ACTIVE' AND r.code = 'ADMINISTRATOR'
                )
                AND NOT EXISTS (
                    SELECT 1 FROM users u2
                    JOIN user_roles ur2 ON ur2.user_id = u2.id
                    JOIN roles r2 ON r2.id = ur2.role_id
                    WHERE u2.id != $1 AND u2.status = 'ACTIVE' AND r2.code = 'ADMINISTRATOR'
                ) AS is_sole`,
            [id]
        );
        return rows[0]?.is_sole ?? false;
    }

    async hasRole(userId: string, roleId: string): Promise<boolean> {
        const { rows } = await pgPool.query(`SELECT 1 FROM user_roles WHERE user_id = $1 AND role_id = $2`, [
            userId,
            roleId,
        ]);
        return rows.length > 0;
    }

    async assignRole(userId: string, roleId: string, scope: RoleScopeInput): Promise<void> {
        const client = await pgPool.connect();
        try {
            await client.query("BEGIN");

            await client.query(
                `INSERT INTO user_roles (user_id, role_id, all_locations)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (user_id, role_id) DO UPDATE SET all_locations = EXCLUDED.all_locations`,
                [userId, roleId, scope.allLocations]
            );

            await client.query(`DELETE FROM user_role_locations WHERE user_id = $1 AND role_id = $2`, [
                userId,
                roleId,
            ]);
            for (const locationId of scope.locationIds) {
                await client.query(
                    `INSERT INTO user_role_locations (user_id, role_id, location_id) VALUES ($1, $2, $3)`,
                    [userId, roleId, locationId]
                );
            }

            await client.query(`DELETE FROM user_role_departments WHERE user_id = $1 AND role_id = $2`, [
                userId,
                roleId,
            ]);
            for (const departmentId of scope.departmentIds) {
                await client.query(
                    `INSERT INTO user_role_departments (user_id, role_id, department_id) VALUES ($1, $2, $3)`,
                    [userId, roleId, departmentId]
                );
            }

            await client.query("COMMIT");
        } catch (err) {
            await client.query("ROLLBACK");
            throw err;
        } finally {
            client.release();
        }
    }

    async removeRole(userId: string, roleId: string): Promise<void> {
        await pgPool.query(`DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2`, [userId, roleId]);
    }

    async findEffectiveAccess(userId: string): Promise<AssignedRoleScope[]> {
        const { rows } = await pgPool.query<{
            role_id: string;
            role_code: string;
            role_name: string;
            all_locations: boolean;
            locations: { id: string; name: string }[] | null;
            departments: { id: string; name: string }[] | null;
        }>(
            `SELECT
                r.id AS role_id,
                r.code AS role_code,
                r.name AS role_name,
                ur.all_locations,
                COALESCE(loc.locations, '[]'::json) AS locations,
                COALESCE(dep.departments, '[]'::json) AS departments
             FROM user_roles ur
             JOIN roles r ON r.id = ur.role_id
             LEFT JOIN LATERAL (
                 SELECT json_agg(json_build_object('id', l.id, 'name', l.name) ORDER BY l.name) AS locations
                 FROM user_role_locations url
                 JOIN locations l ON l.id = url.location_id
                 WHERE url.user_id = ur.user_id AND url.role_id = ur.role_id
             ) loc ON true
             LEFT JOIN LATERAL (
                 SELECT json_agg(json_build_object('id', d.id, 'name', d.name) ORDER BY d.name) AS departments
                 FROM user_role_departments urd
                 JOIN departments d ON d.id = urd.department_id
                 WHERE urd.user_id = ur.user_id AND urd.role_id = ur.role_id
             ) dep ON true
             WHERE ur.user_id = $1
             ORDER BY r.name ASC`,
            [userId]
        );

        return rows.map((row) => ({
            role: { id: row.role_id, code: row.role_code, name: row.role_name },
            allLocations: row.all_locations,
            locations: row.locations ?? [],
            departments: row.departments ?? [],
        }));
    }

    async findByAuthProviderUserId(provider: string, providerUserId: string): Promise<User | null> {
        const { rows } = await pgPool.query<UserRow>(
            `${BASE_SELECT} WHERE u.auth_provider = $1 AND u.auth_provider_user_id = $2`,
            [provider, providerUserId]
        );
        return rows[0] ? UserMap.toDomain(rows[0]) : null;
    }

    async linkAuthProviderIdentity(userId: string, provider: string, providerUserId: string): Promise<void> {
        await pgPool.query(
            `UPDATE users SET auth_provider = $2, auth_provider_user_id = $3, updated_at = now() WHERE id = $1`,
            [userId, provider, providerUserId]
        );
    }

    async touchLastLogin(id: string): Promise<void> {
        await pgPool.query(`UPDATE users SET last_login_at = now() WHERE id = $1`, [id]);
    }
}
