import { ISessionRepository } from "../../domain/ISessionRepository";
import { Session } from "../../domain/Session";
import { SessionMap, SessionRow } from "../../mappers/SessionMap";
import { pgPool } from "../../../../shared/infra/postgres/pgClient";
import { EffectiveScope } from "../../../../shared/core/EffectiveScope";

// PERMISSIONS.md §3 scope enforcement for a `sessions` query. Pure (given the
// same `params` array reference to push onto) so it's unit testable without
// a database — see PgSessionRepository.test.ts. Mirrors
// PgUserRepository.buildScopeConditions, but a session's audience is an
// array (department_ids/location_ids), so matching is overlap (`&&`) rather
// than equality, and an empty audience array means "unrestricted on that
// axis" rather than "no one".
//
// `columnPrefix` lets callers apply this to an aliased `sessions` join
// (e.g. "s." when the query is `... JOIN sessions s ON ...`) — used by
// PgAnalyticsRepository, which joins into `sessions` rather than querying it
// directly. Defaults to "" for a bare/unaliased `sessions` table.
export function buildSessionScopeConditions(
    scope: EffectiveScope | undefined,
    params: unknown[],
    columnPrefix = ""
): string[] {
    if (!scope || scope.type === "ORGANISATION") return [];

    // No session is ever "self" scoped — see sessionInScope.ts.
    if (scope.type === "SELF") return ["1 = 0"];

    const conditions: string[] = [];
    if (!scope.allLocations && scope.locationIds.length > 0) {
        params.push(scope.locationIds);
        conditions.push(`(${columnPrefix}all_locations = true OR ${columnPrefix}location_ids && $${params.length})`);
    }
    if (scope.departmentIds.length > 0) {
        params.push(scope.departmentIds);
        conditions.push(
            `(cardinality(${columnPrefix}department_ids) = 0 OR ${columnPrefix}department_ids && $${params.length})`
        );
    }
    return conditions;
}

export class PgSessionRepository implements ISessionRepository {
    async findById(id: string): Promise<Session | null> {
        const { rows } = await pgPool.query<SessionRow>(
            "SELECT * FROM sessions WHERE id = $1",
            [id]
        );
        return rows[0] ? SessionMap.toDomain(rows[0]) : null;
    }

    async findAll(scope?: EffectiveScope): Promise<Session[]> {
        const params: unknown[] = [];
        const conditions = buildSessionScopeConditions(scope, params);
        const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

        const { rows } = await pgPool.query<SessionRow>(
            `SELECT * FROM sessions ${whereClause} ORDER BY created_at DESC`,
            params
        );
        return rows.map((r) => SessionMap.toDomain(r));
    }

    async save(session: Session): Promise<Session> {
        const raw = SessionMap.toPersistence(session);

        const { rows } = await pgPool.query<SessionRow>(
            `INSERT INTO sessions (
                template_id, name, department_ids, location_ids, all_locations,
                section_ids, host, session_type, pass_threshold,
                allow_multiple_attempts, additional_notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *`,
            [
                raw.template_id,
                raw.name,
                raw.department_ids,
                raw.location_ids,
                raw.all_locations,
                raw.section_ids,
                raw.host,
                raw.session_type,
                raw.pass_threshold,
                raw.allow_multiple_attempts,
                raw.additional_notes,
            ]
        );

        return SessionMap.toDomain(rows[0]);
    }
}
