import {
    ITestSessionRepository,
    AudienceMatch,
    AudiencePreviewResult,
    ParticipantAssignmentInput,
    ResultsSummary,
    AnalyticsGroup,
    ActivityEntry,
    AnalyticsGroupBy,
    MyTestSessionRow,
    QuestionAnalysis,
    QuestionAnalysisRow,
} from "../../domain/ITestSessionRepository";
import { ParticipantRowDTO } from "../../dtos/TestSessionDTO";
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

// The attempt that counts for a participant's result, joined as `a`: with retakes allowed, their
// best finished attempt (highest score; latest wins a tie). NULL columns = nothing finished yet.
const COUNTED_ATTEMPT_JOIN = `LEFT JOIN LATERAL (
                 SELECT * FROM test_attempts ta
                 WHERE ta.test_session_participant_id = p.id AND ta.status IN ('SUBMITTED', 'TIMED_OUT')
                 ORDER BY ta.score_percentage DESC NULLS LAST, ta.attempt_number DESC LIMIT 1
             ) a ON true`;

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

    async expireUnstartedParticipants(testSessionIds: string[], now: Date): Promise<void> {
        if (testSessionIds.length === 0) return;
        await pgPool.query(
            `UPDATE test_session_participants p
             SET status = 'EXPIRED'
             FROM test_sessions s
             WHERE s.id = p.test_session_id
               AND s.id = ANY($1::uuid[])
               AND p.status IN ('ASSIGNED', 'NOT_STARTED')
               AND (s.available_until <= $2 OR s.status IN ('CLOSED', 'COMPLETED'))`,
            [testSessionIds, now]
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
                attempts_used: number;
                assessment_name: string;
                question_count: number;
                pass_mark: number;
                trainer_name: string | null;
                counted_attempt_id: string | null;
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
                    p.completed_at AS participant_completed_at,
                    (SELECT COUNT(*) FROM test_attempts ta WHERE ta.test_session_participant_id = p.id)::int AS attempts_used,
                    asm.name AS assessment_name,
                    asm.pass_mark,
                    (SELECT COUNT(*) FROM assessment_questions aq WHERE aq.assessment_id = asm.id)::int AS question_count,
                    NULLIF(TRIM(COALESCE(o.first_name, '') || ' ' || COALESCE(o.last_name, '')), '') AS trainer_name,
                    a.id AS counted_attempt_id
             FROM test_session_participants p
             JOIN test_sessions ts ON ts.id = p.test_session_id
             JOIN assessments asm ON asm.id = ts.assessment_id
             LEFT JOIN users o ON o.id = ts.owner_id
             ${COUNTED_ATTEMPT_JOIN}
             WHERE p.user_id = $1
             ORDER BY ts.available_from DESC`,
            [userId]
        );

        return rows.map((r) => ({
            attemptsUsed: Number(r.attempts_used),
            details: {
                assessmentName: r.assessment_name,
                questionCount: Number(r.question_count),
                passMark: Number(r.pass_mark),
                trainerName: r.trainer_name,
                resultAttemptId: r.counted_attempt_id,
            },
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

    // Reporting definitions, shared with getAnalyticsBreakdown so no two screens disagree:
    //   Each participant is judged on the attempt that counts (COUNTED_ATTEMPT_JOIN: their best).
    //   completed = has a scored result — submitted, or auto-submitted when the timer ran out —
    //               even while retaking (timedOut = the counted attempt ran out of time)
    //   passed / failed = completed and the counted attempt did / didn't reach the pass mark
    //   completionRate = completed / assigned;  passRate = passed / completed
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
                COUNT(a.id) AS completed,
                COUNT(*) FILTER (WHERE a.passed = true) AS passed,
                COUNT(*) FILTER (WHERE a.passed = false) AS failed,
                COUNT(*) FILTER (WHERE a.status = 'TIMED_OUT') AS timed_out,
                AVG(a.score_percentage) FILTER (WHERE a.score_percentage IS NOT NULL) AS average_score
             FROM test_session_participants p
             ${COUNTED_ATTEMPT_JOIN}
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

    // Per question and option, over each participant's counted attempt (see getResults).
    async getQuestionAnalysis(testSessionId: string, assessmentId: string): Promise<QuestionAnalysis> {
        const counted = `SELECT a.id FROM test_session_participants p
             ${COUNTED_ATTEMPT_JOIN}
             WHERE p.test_session_id = $1 AND a.id IS NOT NULL`;
        const [{ rows: countRows }, { rows }] = await Promise.all([
            pgPool.query<{ completed: string }>(`SELECT COUNT(*) AS completed FROM (${counted}) c`, [testSessionId]),
            pgPool.query<{
                question_id: string;
                question_text: string;
                question_order: number;
                option_id: string;
                option_text: string;
                is_correct: boolean;
                picked: string;
            }>(
                `WITH counted AS (${counted})
                 SELECT q.id AS question_id, q.question_text, q.display_order AS question_order,
                        o.id AS option_id, o.text AS option_text, o.is_correct,
                        COUNT(r.id) AS picked
                 FROM assessment_questions q
                 JOIN assessment_question_options o ON o.question_id = q.id
                 LEFT JOIN test_attempt_responses r
                        ON r.selected_option_id = o.id AND r.test_attempt_id IN (SELECT id FROM counted)
                 WHERE q.assessment_id = $2
                 GROUP BY q.id, q.question_text, q.display_order, o.id, o.text, o.is_correct, o.display_order
                 ORDER BY q.display_order, o.display_order`,
                [testSessionId, assessmentId]
            ),
        ]);

        const byQuestion = new Map<string, QuestionAnalysisRow>();
        for (const r of rows) {
            let q = byQuestion.get(r.question_id);
            if (!q) {
                q = { questionId: r.question_id, number: byQuestion.size + 1, question: r.question_text, answered: 0, correct: 0, options: [] };
                byQuestion.set(r.question_id, q);
            }
            const picked = Number(r.picked);
            q.options.push({ id: r.option_id, text: r.option_text, isCorrect: r.is_correct, picked });
            q.answered += picked;
            if (r.is_correct) q.correct += picked;
        }
        return { completed: Number(countRows[0]?.completed ?? 0), questions: [...byQuestion.values()] };
    }

    async getAnalyticsBreakdown(testSessionId: string, groupBy: AnalyticsGroupBy, locationId?: string): Promise<AnalyticsGroup[]> {
        const nameCol =
            groupBy === "location" ? "p.location_name_snapshot" :
            groupBy === "department" ? "p.department_name_snapshot" :
            "p.team_name_snapshot";
        const idCol =
            groupBy === "location" ? "p.location_id" :
            groupBy === "department" ? "p.department_id" :
            "p.team_id";
        const params: unknown[] = [testSessionId];
        const locationFilter = locationId ? `AND p.location_id = $${params.push(locationId)}` : "";

        const { rows } = await pgPool.query<{
            id: string | null;
            name: string;
            assigned: string;
            completed: string;
            passed: string;
            average_score: string | null;
        }>(
            `SELECT
                ${idCol} AS id,
                ${nameCol} AS name,
                COUNT(p.id) AS assigned,
                COUNT(a.id) AS completed,
                COUNT(*) FILTER (WHERE a.passed = true) AS passed,
                AVG(a.score_percentage) FILTER (WHERE a.score_percentage IS NOT NULL) AS average_score
             FROM test_session_participants p
             ${COUNTED_ATTEMPT_JOIN}
             WHERE p.test_session_id = $1 AND ${nameCol} IS NOT NULL ${locationFilter}
             GROUP BY ${idCol}, ${nameCol}
             ORDER BY ${nameCol}`,
            params
        );

        return rows.map((r) => {
            const assigned = Number(r.assigned);
            const completed = Number(r.completed);
            const passed = Number(r.passed);
            return {
                id: r.id,
                name: r.name,
                assigned,
                completed,
                averageScore: r.average_score != null ? Math.round(Number(r.average_score) * 100) / 100 : 0,
                passRate: completed > 0 ? Math.round((passed / completed) * 10000) / 100 : 0,
            };
        });
    }

    async getActivity(testSessionId: string): Promise<ActivityEntry[]> {
        const { rows } = await pgPool.query<{
            id: string;
            event_type: string;
            created_at: Date;
            actor_name: string | null;
            attempt_number: number | null;
        }>(
            `SELECT e.id, e.event_type, e.created_at,
                    NULLIF(TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')), '') AS actor_name,
                    ta.attempt_number
             FROM audit_events e
             LEFT JOIN users u ON u.id = e.actor_user_id
             LEFT JOIN test_attempts ta ON e.entity_type = 'test_attempt' AND ta.id = e.entity_id
             WHERE (e.entity_type = 'test_session' AND e.entity_id = $1)
                OR (e.entity_type = 'test_attempt' AND ta.test_session_id = $1)
             ORDER BY e.created_at DESC
             LIMIT 200`,
            [testSessionId]
        );
        return rows.map((r) => ({
            id: r.id,
            eventType: r.event_type,
            occurredAt: r.created_at,
            actorName: r.actor_name,
            attemptNumber: r.attempt_number,
        }));
    }

    async getParticipants(testSessionId: string): Promise<ParticipantRowDTO[]> {
        const { rows } = await pgPool.query<{
            id: string;
            user_id: string;
            first_name: string;
            last_name: string;
            location_name_snapshot: string | null;
            department_name_snapshot: string | null;
            team_name_snapshot: string | null;
            status: ParticipantStatus;
            assigned_at: Date;
            started_at: Date | null;
            completed_at: Date | null;
            score_percentage: string | number | null;
            passed: boolean | null;
        }>(
            `SELECT
                p.id, p.user_id,
                u.first_name, u.last_name,
                p.location_name_snapshot, p.department_name_snapshot, p.team_name_snapshot,
                p.status, p.assigned_at, p.started_at, p.completed_at,
                a.score_percentage, a.passed
             FROM test_session_participants p
             JOIN users u ON u.id = p.user_id
             ${COUNTED_ATTEMPT_JOIN}
             WHERE p.test_session_id = $1
             ORDER BY u.last_name, u.first_name`,
            [testSessionId]
        );

        return rows.map((r) => ({
            id: r.id,
            userId: r.user_id,
            name: `${r.first_name} ${r.last_name}`.trim(),
            location: r.location_name_snapshot,
            department: r.department_name_snapshot,
            team: r.team_name_snapshot,
            status: r.status,
            assignedAt: r.assigned_at.toISOString(),
            startedAt: r.started_at ? r.started_at.toISOString() : null,
            completedAt: r.completed_at ? r.completed_at.toISOString() : null,
            scorePercentage: r.score_percentage != null ? Number(r.score_percentage) : null,
            passed: r.passed,
        }));
    }
}
