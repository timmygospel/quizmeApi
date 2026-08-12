import { IUserRepository, UserListFilters, UserListResult } from "../../domain/IUserRepository";
import { User } from "../../domain/User";
import { UserMap, UserRow } from "../../mappers/UserMap";
import { pgPool } from "../../../../shared/infra/postgres/pgClient";

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
}
