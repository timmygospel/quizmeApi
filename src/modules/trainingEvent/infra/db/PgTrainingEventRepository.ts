import { PoolClient } from "pg";
import { pgPool } from "../../../../shared/infra/postgres/pgClient";
import {
    AttendeeResultRow,
    ITrainingEventRepository,
    NewCheckInput,
    SnapshotQuestionInput,
} from "../../domain/ITrainingEventRepository";
import {
    Attendee,
    CheckAttempt,
    CheckQuestion,
    CheckResponse,
    CheckStatus,
    KnowledgeCheck,
    TrainingEvent,
    TrainingEventStatus,
} from "../../domain/TrainingEvent";

interface EventRow {
    id: string; name: string; quiz_id: string; owner_id: string; join_code: string;
    event_date: string | null; status: TrainingEventStatus; created_at: Date; ended_at: Date | null;
}
interface CheckRow {
    id: string; training_event_id: string; quiz_section_id: string | null; name: string; position: number;
    status: CheckStatus; opened_at: Date | null; closed_at: Date | null;
}
interface AttendeeRow {
    id: string; training_event_id: string; display_name: string; user_id: string | null;
    merged_into_id: string | null; created_at: Date;
}
interface AttemptRow {
    id: string; check_id: string; attendee_id: string; started_at: Date; submitted_at: Date | null;
    score_percentage: string | number | null;
}

// event_date comes back as a string (DATE is fetched as text so no timezone shifts it)
const EVENT_COLUMNS = `id, name, quiz_id, owner_id, join_code, to_char(event_date, 'YYYY-MM-DD') AS event_date, status, created_at, ended_at`;

const toEvent = (r: EventRow): TrainingEvent => ({
    id: r.id, name: r.name, quizId: r.quiz_id, ownerId: r.owner_id, joinCode: r.join_code,
    eventDate: r.event_date, status: r.status, createdAt: r.created_at, endedAt: r.ended_at,
});
const toCheck = (r: CheckRow): KnowledgeCheck => ({
    id: r.id, trainingEventId: r.training_event_id, quizSectionId: r.quiz_section_id, name: r.name,
    position: r.position, status: r.status, openedAt: r.opened_at, closedAt: r.closed_at,
});
const toAttendee = (r: AttendeeRow): Attendee => ({
    id: r.id, trainingEventId: r.training_event_id, displayName: r.display_name, userId: r.user_id,
    mergedIntoId: r.merged_into_id, createdAt: r.created_at,
});
const toAttempt = (r: AttemptRow): CheckAttempt => ({
    id: r.id, checkId: r.check_id, attendeeId: r.attendee_id, startedAt: r.started_at, submittedAt: r.submitted_at,
    scorePercentage: r.score_percentage != null ? Number(r.score_percentage) : null,
});

async function inTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await pgPool.connect();
    try {
        await client.query("BEGIN");
        const result = await fn(client);
        await client.query("COMMIT");
        return result;
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
}

// Closing a check submits every unsubmitted attempt on it, scored on what was answered
// (unanswered = wrong), so nobody's work is lost when the trainer moves on.
async function closeCheckWithin(client: PoolClient, checkId: string, at: Date): Promise<void> {
    await client.query(
        `UPDATE training_event_attempts a
         SET submitted_at = $2,
             score_percentage = COALESCE(ROUND(
                 100.0 * (SELECT COUNT(*) FROM training_event_responses r WHERE r.attempt_id = a.id AND r.is_correct)
                 / NULLIF((SELECT COUNT(*) FROM training_event_check_questions q WHERE q.check_id = a.check_id), 0)
             , 2), 0)
         WHERE a.check_id = $1 AND a.submitted_at IS NULL`,
        [checkId, at]
    );
    await client.query(
        `UPDATE training_event_checks SET status = 'CLOSED', closed_at = $2 WHERE id = $1 AND status = 'OPEN'`,
        [checkId, at]
    );
}

export class PgTrainingEventRepository implements ITrainingEventRepository {
    async create(
        event: Omit<TrainingEvent, "id" | "createdAt" | "endedAt" | "status">,
        checks: NewCheckInput[]
    ): Promise<TrainingEvent> {
        return inTransaction(async (client) => {
            const { rows } = await client.query<EventRow>(
                `INSERT INTO training_events (name, quiz_id, owner_id, join_code, event_date)
                 VALUES ($1, $2, $3, $4, $5)
                 RETURNING ${EVENT_COLUMNS}`,
                [event.name, event.quizId, event.ownerId, event.joinCode, event.eventDate]
            );
            for (const c of checks) {
                await client.query(
                    `INSERT INTO training_event_checks (training_event_id, quiz_section_id, name, position)
                     VALUES ($1, $2, $3, $4)`,
                    [rows[0].id, c.quizSectionId, c.name, c.position]
                );
            }
            return toEvent(rows[0]);
        });
    }

    async joinCodeExists(joinCode: string): Promise<boolean> {
        const { rows } = await pgPool.query(`SELECT 1 FROM training_events WHERE join_code = $1`, [joinCode]);
        return rows.length > 0;
    }

    async findById(id: string): Promise<TrainingEvent | null> {
        const { rows } = await pgPool.query<EventRow>(`SELECT ${EVENT_COLUMNS} FROM training_events WHERE id = $1`, [id]);
        return rows[0] ? toEvent(rows[0]) : null;
    }

    async findByJoinCode(joinCode: string): Promise<TrainingEvent | null> {
        const { rows } = await pgPool.query<EventRow>(`SELECT ${EVENT_COLUMNS} FROM training_events WHERE join_code = $1`, [joinCode]);
        return rows[0] ? toEvent(rows[0]) : null;
    }

    async list(ownerId?: string): Promise<TrainingEvent[]> {
        const { rows } = ownerId
            ? await pgPool.query<EventRow>(`SELECT ${EVENT_COLUMNS} FROM training_events WHERE owner_id = $1 ORDER BY created_at DESC`, [ownerId])
            : await pgPool.query<EventRow>(`SELECT ${EVENT_COLUMNS} FROM training_events ORDER BY created_at DESC`);
        return rows.map(toEvent);
    }

    async endEvent(id: string, at: Date): Promise<void> {
        await inTransaction(async (client) => {
            const { rows } = await client.query<{ id: string }>(
                `SELECT id FROM training_event_checks WHERE training_event_id = $1 AND status = 'OPEN'`, [id]
            );
            for (const r of rows) await closeCheckWithin(client, r.id, at);
            await client.query(`UPDATE training_events SET status = 'ENDED', ended_at = $2 WHERE id = $1 AND status = 'OPEN'`, [id, at]);
        });
    }

    async findChecks(eventId: string): Promise<KnowledgeCheck[]> {
        const { rows } = await pgPool.query<CheckRow>(
            `SELECT * FROM training_event_checks WHERE training_event_id = $1 ORDER BY position`, [eventId]
        );
        return rows.map(toCheck);
    }

    async findCheck(checkId: string): Promise<KnowledgeCheck | null> {
        const { rows } = await pgPool.query<CheckRow>(`SELECT * FROM training_event_checks WHERE id = $1`, [checkId]);
        return rows[0] ? toCheck(rows[0]) : null;
    }

    async openCheck(checkId: string, snapshot: SnapshotQuestionInput[], at: Date): Promise<void> {
        await inTransaction(async (client) => {
            // One check open at a time: opening the next one closes (and submits) the previous.
            const { rows: others } = await client.query<{ id: string }>(
                `SELECT o.id FROM training_event_checks o
                 JOIN training_event_checks c ON c.training_event_id = o.training_event_id
                 WHERE c.id = $1 AND o.id <> $1 AND o.status = 'OPEN'`,
                [checkId]
            );
            for (const o of others) await closeCheckWithin(client, o.id, at);

            const { rows: existing } = await client.query(
                `SELECT 1 FROM training_event_check_questions WHERE check_id = $1 LIMIT 1`, [checkId]
            );
            if (existing.length === 0) {
                for (let i = 0; i < snapshot.length; i++) {
                    const q = snapshot[i];
                    await client.query(
                        `INSERT INTO training_event_check_questions (check_id, source_question_id, position, question_text, options)
                         VALUES ($1, $2, $3, $4, $5)`,
                        [checkId, q.sourceQuestionId, i, q.question, JSON.stringify(q.options)]
                    );
                }
            }
            await client.query(
                `UPDATE training_event_checks SET status = 'OPEN', opened_at = COALESCE(opened_at, $2), closed_at = NULL WHERE id = $1`,
                [checkId, at]
            );
        });
    }

    async closeCheck(checkId: string, at: Date): Promise<void> {
        await inTransaction((client) => closeCheckWithin(client, checkId, at));
    }

    async hasSnapshot(checkId: string): Promise<boolean> {
        const { rows } = await pgPool.query(`SELECT 1 FROM training_event_check_questions WHERE check_id = $1 LIMIT 1`, [checkId]);
        return rows.length > 0;
    }

    async findCheckQuestions(checkId: string): Promise<CheckQuestion[]> {
        const { rows } = await pgPool.query<{ id: string; check_id: string; position: number; question_text: string; options: { text: string; correct: boolean }[] }>(
            `SELECT id, check_id, position, question_text, options FROM training_event_check_questions WHERE check_id = $1 ORDER BY position`,
            [checkId]
        );
        return rows.map((r) => ({ id: r.id, checkId: r.check_id, position: r.position, question: r.question_text, options: r.options }));
    }

    async countSubmissions(eventId: string): Promise<Record<string, { started: number; submitted: number }>> {
        const { rows } = await pgPool.query<{ check_id: string; started: string; submitted: string }>(
            `SELECT a.check_id, COUNT(*) AS started, COUNT(a.submitted_at) AS submitted
             FROM training_event_attempts a
             JOIN training_event_checks c ON c.id = a.check_id
             JOIN training_event_attendees t ON t.id = a.attendee_id AND t.merged_into_id IS NULL
             WHERE c.training_event_id = $1
             GROUP BY a.check_id`,
            [eventId]
        );
        return Object.fromEntries(rows.map((r) => [r.check_id, { started: Number(r.started), submitted: Number(r.submitted) }]));
    }

    async createAttendee(eventId: string, displayName: string, userId: string | null): Promise<Attendee> {
        const { rows } = await pgPool.query<AttendeeRow>(
            `INSERT INTO training_event_attendees (training_event_id, display_name, user_id) VALUES ($1, $2, $3) RETURNING *`,
            [eventId, displayName, userId]
        );
        return toAttendee(rows[0]);
    }

    async findAttendee(id: string): Promise<Attendee | null> {
        const { rows } = await pgPool.query<AttendeeRow>(`SELECT * FROM training_event_attendees WHERE id = $1`, [id]);
        return rows[0] ? toAttendee(rows[0]) : null;
    }

    async listGuests(eventId: string): Promise<Attendee[]> {
        const { rows } = await pgPool.query<AttendeeRow>(
            `SELECT * FROM training_event_attendees
             WHERE training_event_id = $1 AND user_id IS NULL AND merged_into_id IS NULL
             ORDER BY created_at`,
            [eventId]
        );
        return rows.map(toAttendee);
    }

    async countAttendees(eventId: string): Promise<number> {
        const { rows } = await pgPool.query<{ n: string }>(
            `SELECT COUNT(*) AS n FROM training_event_attendees WHERE training_event_id = $1 AND merged_into_id IS NULL`, [eventId]
        );
        return Number(rows[0].n);
    }

    async addToken(attendeeId: string, tokenHash: string): Promise<void> {
        await pgPool.query(`INSERT INTO training_event_attendee_tokens (attendee_id, token_hash) VALUES ($1, $2)`, [attendeeId, tokenHash]);
    }

    async findAttendeeByTokenHash(tokenHash: string): Promise<Attendee | null> {
        const { rows } = await pgPool.query<AttendeeRow>(
            `SELECT COALESCE(m.id, a.id) AS id, COALESCE(m.training_event_id, a.training_event_id) AS training_event_id,
                    COALESCE(m.display_name, a.display_name) AS display_name,
                    CASE WHEN m.id IS NOT NULL THEN m.user_id ELSE a.user_id END AS user_id,
                    CASE WHEN m.id IS NOT NULL THEN m.merged_into_id ELSE a.merged_into_id END AS merged_into_id,
                    COALESCE(m.created_at, a.created_at) AS created_at
             FROM training_event_attendee_tokens t
             JOIN training_event_attendees a ON a.id = t.attendee_id
             LEFT JOIN training_event_attendees m ON m.id = a.merged_into_id
             WHERE t.token_hash = $1`,
            [tokenHash]
        );
        return rows[0] ? toAttendee(rows[0]) : null;
    }

    async touchAttendee(attendeeId: string, at: Date): Promise<void> {
        await pgPool.query(`UPDATE training_event_attendees SET last_seen_at = $2 WHERE id = $1`, [attendeeId, at]);
    }

    async mergeAttendees(fromId: string, intoId: string): Promise<void> {
        await inTransaction(async (client) => {
            await client.query(`UPDATE training_event_attendee_tokens SET attendee_id = $2 WHERE attendee_id = $1`, [fromId, intoId]);
            // Keep `into`'s attempt where both answered the same check; move the rest.
            await client.query(
                `UPDATE training_event_attempts SET attendee_id = $2
                 WHERE attendee_id = $1 AND check_id NOT IN (SELECT check_id FROM training_event_attempts WHERE attendee_id = $2)`,
                [fromId, intoId]
            );
            await client.query(`UPDATE training_event_attendees SET merged_into_id = $2 WHERE merged_into_id = $1`, [fromId, intoId]);
            await client.query(`UPDATE training_event_attendees SET merged_into_id = $2 WHERE id = $1`, [fromId, intoId]);
        });
    }

    async findAttempt(checkId: string, attendeeId: string): Promise<CheckAttempt | null> {
        const { rows } = await pgPool.query<AttemptRow>(
            `SELECT * FROM training_event_attempts WHERE check_id = $1 AND attendee_id = $2`, [checkId, attendeeId]
        );
        return rows[0] ? toAttempt(rows[0]) : null;
    }

    async findAttemptsForAttendee(attendeeId: string): Promise<CheckAttempt[]> {
        const { rows } = await pgPool.query<AttemptRow>(`SELECT * FROM training_event_attempts WHERE attendee_id = $1`, [attendeeId]);
        return rows.map(toAttempt);
    }

    async saveResponse(checkId: string, attendeeId: string, response: CheckResponse): Promise<void> {
        await inTransaction(async (client) => {
            const { rows } = await client.query<{ id: string }>(
                `INSERT INTO training_event_attempts (check_id, attendee_id) VALUES ($1, $2)
                 ON CONFLICT (check_id, attendee_id) DO UPDATE SET check_id = EXCLUDED.check_id
                 RETURNING id`,
                [checkId, attendeeId]
            );
            await client.query(
                `INSERT INTO training_event_responses (attempt_id, check_question_id, option_index, is_correct)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (attempt_id, check_question_id)
                 DO UPDATE SET option_index = EXCLUDED.option_index, is_correct = EXCLUDED.is_correct, answered_at = now()`,
                [rows[0].id, response.checkQuestionId, response.optionIndex, response.isCorrect]
            );
        });
    }

    async findResponses(checkId: string, attendeeId: string): Promise<CheckResponse[]> {
        const { rows } = await pgPool.query<{ check_question_id: string; option_index: number; is_correct: boolean }>(
            `SELECT r.check_question_id, r.option_index, r.is_correct
             FROM training_event_responses r JOIN training_event_attempts a ON a.id = r.attempt_id
             WHERE a.check_id = $1 AND a.attendee_id = $2`,
            [checkId, attendeeId]
        );
        return rows.map((r) => ({ checkQuestionId: r.check_question_id, optionIndex: r.option_index, isCorrect: r.is_correct }));
    }

    async submitAttempt(checkId: string, attendeeId: string, scorePercentage: number, at: Date): Promise<CheckAttempt> {
        // Submitting with nothing answered still records the attempt (a score of 0).
        const { rows } = await pgPool.query<AttemptRow>(
            `INSERT INTO training_event_attempts (check_id, attendee_id, submitted_at, score_percentage)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (check_id, attendee_id) DO UPDATE
                 SET submitted_at = EXCLUDED.submitted_at, score_percentage = EXCLUDED.score_percentage
                 WHERE training_event_attempts.submitted_at IS NULL
             RETURNING *`,
            [checkId, attendeeId, at, scorePercentage]
        );
        if (rows[0]) return toAttempt(rows[0]);
        return (await this.findAttempt(checkId, attendeeId))!; // already submitted: unchanged
    }

    async getResults(eventId: string): Promise<AttendeeResultRow[]> {
        const { rows } = await pgPool.query<AttendeeRow & { check_id: string | null; submitted_at: Date | null; score_percentage: string | null }>(
            `SELECT t.*, a.check_id, a.submitted_at, a.score_percentage
             FROM training_event_attendees t
             LEFT JOIN training_event_attempts a ON a.attendee_id = t.id
             WHERE t.training_event_id = $1 AND t.merged_into_id IS NULL
             ORDER BY t.display_name, t.created_at`,
            [eventId]
        );
        const byAttendee = new Map<string, AttendeeResultRow>();
        for (const r of rows) {
            let row = byAttendee.get(r.id);
            if (!row) {
                row = { attendeeId: r.id, displayName: r.display_name, isGuest: r.user_id === null, joinedAt: r.created_at, checks: {} };
                byAttendee.set(r.id, row);
            }
            if (r.check_id) {
                row.checks[r.check_id] = {
                    submitted: r.submitted_at !== null,
                    scorePercentage: r.score_percentage != null ? Number(r.score_percentage) : null,
                };
            }
        }
        return [...byAttendee.values()];
    }
}
