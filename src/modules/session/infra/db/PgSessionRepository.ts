import { ISessionRepository } from "../../domain/ISessionRepository";
import { Session } from "../../domain/Session";
import { SessionMap, SessionRow } from "../../mappers/SessionMap";
import { pgPool } from "../../../../shared/infra/postgres/pgClient";

export class PgSessionRepository implements ISessionRepository {
    async findById(id: string): Promise<Session | null> {
        const { rows } = await pgPool.query<SessionRow>(
            "SELECT * FROM sessions WHERE id = $1",
            [id]
        );
        return rows[0] ? SessionMap.toDomain(rows[0]) : null;
    }

    async findAll(): Promise<Session[]> {
        const { rows } = await pgPool.query<SessionRow>(
            "SELECT * FROM sessions ORDER BY created_at DESC"
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
