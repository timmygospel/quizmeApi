import {
    ITestSessionRepository,
    AudienceMatch,
    AudiencePreviewResult,
    ParticipantAssignmentInput,
    ResultsSummary,
    AnalyticsGroup,
    AnalyticsGroupBy,
    MyTestSessionRow,
} from "../../domain/ITestSessionRepository";
import { TestSession, TestSessionStatus } from "../../domain/TestSession";
import { TestSessionParticipant, ParticipantStatus } from "../../domain/TestSessionParticipant";
import { AudienceRule } from "../../domain/AudienceRule";
import { TestSessionMap, TestSessionRow, AudienceRow } from "../../mappers/TestSessionMap";
import { TestSessionParticipantMap, ParticipantRow } from "../../mappers/TestSessionParticipantMap";
import { pgPool } from "../../../../shared/infra/postgres/pgClient";
import { EffectiveScope } from "../../../../shared/core/EffectiveScope";

// PERMISSIONS.md §3 scope enforcement for `test_sessions`. Pure (given the
// same `params` array reference to push onto) so it's unit testable without
// a database — mirrors PgUserRepository.buildScopeConditions' "empty array
// means unrestricted on that axis" semantics. Unlike a plain users/sessions
// query, a Test Session's owner is always allowed through regardless of
// scope (isTestSessionWithinScope mirrors this for the single-record case).
export function buildTestSessionScopeCondition(scope: EffectiveScope | undefined, params: unknown[]): string | null {
    if (!scope || scope.type === "ORGANISATION") return null;

    params.push(scope.userId);
    const ownerIdx = params.length;

    if (scope.type === "SELF") {
        return `ts.owner_id = $${ownerIdx}`;
    }

    const audienceConditions: string[] = [];
    if (!scope.allLocations && scope.locationIds.length > 0) {
        params.push(scope.locationIds);
        audienceConditions.push(`a.location_id = ANY($${params.length})`);
    }
    if (scope.departmentIds.length > 0) {
        params.push(scope.departmentIds);
        audienceConditions.push(`a.department_id = ANY($${params.length})`);
    }
    const audienceWhere = audienceConditions.length ? `AND ${audienceConditions.join(" AND ")}` : "";

    return `(ts.owner_id = $${ownerIdx} OR EXISTS (
        SELECT 1 FROM test_session_audiences a WHERE a.test_session_id = ts.id ${audienceWhere}
    ))`;
}

const SESSION_SELECT = `
    SELECT ts.*, (SELECT COUNT(*) FROM test_session_participants p WHERE p.test_session_id = ts.id) AS participant_count
    FROM test_sessions ts
`;

function participantRowToDomain(row: ParticipantRow): TestSessionParticipant {
    return TestSessionParticipantMap.toDomain(row);
}

export class PgTestSessionRepository implements ITestSessionRepository {
    async findById(id: string): Promise<TestSession | null> {
        const { rows } = await pgPool.query<TestSessionRow>(`${SESSION_SELECT} WHERE ts.id = $1`, [id]);
        if (!rows[0]) return null;

        const { rows: audienceRows } = await pgPool.query<AudienceRow>(
            `SELECT location_id, department_id, team_id FROM test_session_audiences WHERE test_session_id = $1`,
            [id]
        );
        return TestSessionMap.toDomain(rows[0], audienceRows);
    }

    async findAll(scope?: EffectiveScope): Promise<TestSession[]> {
        const params: unknown[] = [];
        const condition = buildTestSessionScopeCondition(scope, params);
        const whereClause = condition ? `WHERE ${condition}` : "";

        const { rows } = await pgPool.query<TestSessionRow>(
            `${SESSION_SELECT} ${whereClause} ORDER BY ts.created_at DESC`,
            params
        );
        if (rows.length === 0) return [];

        const ids = rows.map((r) => r.id);
        const { rows: audienceRows } = await pgPool.query<AudienceRow & { test_session_id: string }>(
            `SELECT test_session_id, location_id, department_id, team_id FROM test_session_audiences WHERE test_session_id = ANY($1)`,
            [ids]
        );
        const audienceBySession = new Map<string, AudienceRow[]>();
        for (const a of audienceRows) {
            const list = audienceBySession.get(a.test_session_id) ?? [];
            list.push(a);
            audienceBySession.set(a.test_session_id, list);
        }

        return rows.map((r) => TestSessionMap.toDomain(r, audienceBySession.get(r.id) ?? []));
    }

    async create(session: TestSession, participants: ParticipantAssignmentInput[]): Promise<TestSession> {
        const client = await pgPool.connect();
        let id = "";
        try {
            await client.query("BEGIN");

            const { rows } = await client.query<{ id: string }>(
                `INSERT INTO test_sessions (
                    assessment_id, name, owner_id, available_from, available_until,
                    time_limit_minutes, max_attempts, status
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id`,
                [
                    session.assessmentId,
                    session.name,
                    session.ownerId,
                    session.availableFrom,
                    session.availableUntil,
                    session.timeLimitMinutes,
                    session.maxAttempts,
                    session.status,
                ]
            );
            id = rows[0].id;

            for (const rule of session.audience) {
                await client.query(
                    `INSERT INTO test_session_audiences (test_session_id, location_id, department_id, team_id)
                     VALUES ($1, $2, $3, $4)`,
                    [id, rule.locationId, rule.departmentId, rule.teamId ?? null]
                );
            }

            for (const p of participants) {
                await client.query(
                    `INSERT INTO test_session_participants (
                        test_session_id, user_id, location_id, location_name_snapshot,
                        department_id, department_name_snapshot, team_id, team_name_snapshot, status
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'ASSIGNED')
                    ON CONFLICT (test_session_id, user_id) DO NOTHING`,
                    [id, p.userId, p.locationId, p.locationName, p.departmentId, p.departmentName, p.teamId, p.teamName]
                );
            }

            await client.query("COMMIT");
        } catch (err) {
            await client.query("ROLLBACK");
            throw err;
        } finally {
            client.release();
        }

        return (await this.findById(id))!;
    }

    async updateStatus(
        id: string,
        status: TestSessionStatus,
        timestamps?: { startedAt?: Date; closedAt?: Date }
    ): Promise<TestSession> {
        await pgPool.query(
            `UPDATE test_sessions
             SET status = $2,
                 started_at = COALESCE($3, started_at),
                 closed_at = COALESCE($4, closed_at),
                 updated_at = now()
             WHERE id = $1`,
            [id, status, timestamps?.startedAt ?? null, timestamps?.closedAt ?? null]
        );
        return (await this.findById(id))!;
    }

    async resolveActiveUsers(rules: AudienceRule[]): Promise<AudienceMatch[]> {
        if (rules.length === 0) return [];

        const pairsClause = rules.map((_, i) => `($${i * 2 + 1}::uuid, $${i * 2 + 2}::uuid)`).join(", ");
        const params = rules.flatMap((r) => [r.locationId, r.departmentId]);

        const { rows } = await pgPool.query<{
            user_id: string;
            location_id: string;
            location_name: string;
            department_id: string;
            department_name: string;
        }>(
            `SELECT u.id AS user_id, u.location_id, l.name AS location_name, u.department_id, d.name AS department_name
             FROM users u
             JOIN locations l ON l.id = u.location_id
             JOIN departments d ON d.id = u.department_id
             WHERE u.status = 'ACTIVE'
               AND (u.location_id, u.department_id) IN (${pairsClause})`,
            params
        );

        return rows.map((r) => ({
            userId: r.user_id,
            locationId: r.location_id,
            locationName: r.location_name,
            departmentId: r.department_id,
            departmentName: r.department_name,
        }));
    }

    async previewAudience(rules: AudienceRule[]): Promise<AudiencePreviewResult> {
        const matches = await this.resolveActiveUsers(rules);

        const byPair = new Map<
            string,
            { locationId: string; locationName: string; departmentId: string; departmentName: string; count: number }
        >();
        for (const m of matches) {
            const key = `${m.locationId}:${m.departmentId}`;
            const existing = byPair.get(key);
            if (existing) {
                existing.count += 1;
            } else {
                byPair.set(key, {
                    locationId: m.locationId,
                    locationName: m.locationName,
                    departmentId: m.departmentId,
                    departmentName: m.departmentName,
                    count: 1,
                });
            }
        }

        return { total: matches.length, groups: [...byPair.values()] };
    }

    async findParticipantForUser(testSessionId: string, userId: string): Promise<TestSessionParticipant | null> {
        const { rows } = await pgPool.query<ParticipantRow>(
            `SELECT * FROM test_session_participants WHERE test_session_id = $1 AND user_id = $2`,
            [testSessionId, userId]
        );
        return rows[0] ? participantRowToDomain(rows[0]) : null;
    }

    async findParticipantById(id: string): Promise<TestSessionParticipant | null> {
        const { rows } = await pgPool.query<ParticipantRow>(`SELECT * FROM test_session_participants WHERE id = $1`, [id]);
        return rows[0] ? participantRowToDomain(rows[0]) : null;
    }

    async updateParticipantStatus(
        id: string,
        status: ParticipantStatus,
        timestamps?: { startedAt?: Date; completedAt?: Date }
    ): Promise<void> {
        await pgPool.query(
            `UPDATE test_session_participants
             SET status = $2,
                 started_at = COALESCE($3, started_at),
                 completed_at = COALESCE($4, completed_at)
             WHERE id = $1`,
            [id, status, timestamps?.startedAt ?? null, timestamps?.completedAt ?? null]
        );
    }

    async findMyTestSessions(userId: string): Promise<MyTestSessionRow[]> {
        const { rows } = await pgPool.query<
            TestSessionRow & {
                participant_id: string;
                participant_user_id: string;
                participant_status: ParticipantStatus;
                participant_location_id: string | null;
                location_name_snapshot: string | null;
                participant_department_id: string | null;
                department_name_snapshot: string | null;
                participant_team_id: string | null;
                team_name_snapshot: string | null;
                participant_assigned_at: Date;
                participant_started_at: Date | null;
                participant_completed_at: Date | null;
            }
        >(
            `SELECT ts.*,
                    p.id AS participant_id,
                    p.user_id AS participant_user_id,
                    p.status AS participant_status,
                    p.location_id AS participant_location_id,
                    p.location_name_snapshot,
                    p.department_id AS participant_department_id,
                    p.department_name_snapshot,
                    p.team_id AS participant_team_id,
                    p.team_name_snapshot,
                    p.assigned_at AS participant_assigned_at,
                    p.started_at AS participant_started_at,
                    p.completed_at AS participant_completed_at
             FROM test_session_participants p
             JOIN test_sessions ts ON ts.id = p.test_session_id
             WHERE p.user_id = $1
             ORDER BY ts.available_from DESC`,
            [userId]
        );

        return rows.map((r) => ({
            session: TestSessionMap.toDomain(r, []),
            participant: participantRowToDomain({
                id: r.participant_id,
                test_session_id: r.id,
                user_id: r.participant_user_id,
                location_id: r.participant_location_id,
                location_name_snapshot: r.location_name_snapshot,
                department_id: r.participant_department_id,
                department_name_snapshot: r.department_name_snapshot,
                team_id: r.participant_team_id,
                team_name_snapshot: r.team_name_snapshot,
                status: r.participant_status,
                assigned_at: r.participant_assigned_at,
                started_at: r.participant_started_at,
                completed_at: r.participant_completed_at,
            }),
        }));
    }

    async getResults(testSessionId: string): Promise<ResultsSummary> {
        const { rows } = await pgPool.query<{
            assigned: string;
            started: string;
            completed: string;
            passed: string;
            failed: string;
            timed_out: string;
            average_score: string | null;
        }>(
            `SELECT
                COUNT(p.id) AS assigned,
                COUNT(*) FILTER (WHERE p.started_at IS NOT NULL) AS started,
                COUNT(*) FILTER (WHERE p.status = 'COMPLETED') AS completed,
                COUNT(*) FILTER (WHERE a.passed = true) AS passed,
                COUNT(*) FILTER (WHERE p.status = 'COMPLETED' AND a.passed = false) AS failed,
                COUNT(*) FILTER (WHERE p.status = 'TIMED_OUT') AS timed_out,
                AVG(a.score_percentage) FILTER (WHERE a.score_percentage IS NOT NULL) AS average_score
             FROM test_session_participants p
             LEFT JOIN LATERAL (
                 SELECT * FROM test_attempts ta
                 WHERE ta.test_session_participant_id = p.id AND ta.status IN ('SUBMITTED', 'TIMED_OUT')
                 ORDER BY ta.attempt_number DESC LIMIT 1
             ) a ON true
             WHERE p.test_session_id = $1`,
            [testSessionId]
        );

        const r = rows[0];
        const assigned = Number(r?.assigned ?? 0);
        const completed = Number(r?.completed ?? 0);
        const passed = Number(r?.passed ?? 0);

        return {
            assigned,
            started: Number(r?.started ?? 0),
            completed,
            passed,
            failed: Number(r?.failed ?? 0),
            timedOut: Number(r?.timed_out ?? 0),
            averageScore: r?.average_score != null ? Math.round(Number(r.average_score) * 100) / 100 : 0,
            completionRate: assigned > 0 ? Math.round((completed / assigned) * 10000) / 100 : 0,
            passRate: completed > 0 ? Math.round((passed / completed) * 10000) / 100 : 0,
        };
    }

    async getAnalyticsBreakdown(testSessionId: string, groupBy: AnalyticsGroupBy): Promise<AnalyticsGroup[]> {
        const nameCol =
            groupBy === "location" ? "p.location_name_snapshot" :
            groupBy === "department" ? "p.department_name_snapshot" :
            "p.team_name_snapshot";

        const { rows } = await pgPool.query<{
            name: string;
            assigned: string;
            completed: string;
            passed: string;
            average_score: string | null;
        }>(
            `SELECT
                ${nameCol} AS name,
                COUNT(p.id) AS assigned,
                COUNT(*) FILTER (WHERE p.status = 'COMPLETED') AS completed,
                COUNT(*) FILTER (WHERE a.passed = true) AS passed,
                AVG(a.score_percentage) FILTER (WHERE a.score_percentage IS NOT NULL) AS average_score
             FROM test_session_participants p
             LEFT JOIN LATERAL (
                 SELECT * FROM test_attempts ta
                 WHERE ta.test_session_participant_id = p.id AND ta.status IN ('SUBMITTED', 'TIMED_OUT')
                 ORDER BY ta.attempt_number DESC LIMIT 1
             ) a ON true
             WHERE p.test_session_id = $1 AND ${nameCol} IS NOT NULL
             GROUP BY ${nameCol}
             ORDER BY ${nameCol}`,
            [testSessionId]
        );

        return rows.map((r) => {
            const assigned = Number(r.assigned);
            const completed = Number(r.completed);
            const passed = Number(r.passed);
            return {
                name: r.name,
                assigned,
                completed,
                averageScore: r.average_score != null ? Math.round(Number(r.average_score) * 100) / 100 : 0,
                passRate: completed > 0 ? Math.round((passed / completed) * 10000) / 100 : 0,
            };
        });
    }
}
