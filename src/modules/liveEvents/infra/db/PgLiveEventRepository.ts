import { pgPool } from "../../../../shared/infra/postgres/pgClient";

export interface LiveEventRow {
    id: string;
    event_code: string;
    name: string;
    quiz_id: string;
    session_id: string | null;
    status: "live" | "ended";
    active_question_index: number;
    question_visible: boolean;
    admin_token: string;
    passing_score: number;
    started_at: Date;
    ended_at: Date | null;
    created_at: Date;
    updated_at: Date;
}

export interface QuestionSnapshotInput {
    question: string;
    options: { text: string; correct: boolean }[];
}

export class PgLiveEventRepository {
    async create(params: {
        eventCode: string;
        name: string;
        quizId: string;
        sessionId?: string | null;
        adminToken: string;
    }): Promise<LiveEventRow> {
        const { rows } = await pgPool.query<LiveEventRow>(
            `INSERT INTO live_events (event_code, name, quiz_id, session_id, admin_token)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [params.eventCode, params.name, params.quizId, params.sessionId ?? null, params.adminToken]
        );
        return rows[0];
    }

    async findByEventCode(eventCode: string): Promise<LiveEventRow | null> {
        const { rows } = await pgPool.query<LiveEventRow>("SELECT * FROM live_events WHERE event_code = $1", [
            eventCode,
        ]);
        return rows[0] ?? null;
    }

    async countParticipants(liveEventId: string): Promise<number> {
        const { rows } = await pgPool.query<{ count: string }>(
            "SELECT COUNT(*) FROM live_participants WHERE live_event_id = $1",
            [liveEventId]
        );
        return Number(rows[0]?.count ?? 0);
    }

    async setActiveQuestion(liveEventId: string, questionIndex: number, visible: boolean): Promise<void> {
        await pgPool.query(
            `UPDATE live_events
             SET active_question_index = $1, question_visible = $2, updated_at = now()
             WHERE id = $3`,
            [questionIndex, visible, liveEventId]
        );
    }

    async setQuestionVisible(liveEventId: string, visible: boolean): Promise<void> {
        await pgPool.query(
            `UPDATE live_events SET question_visible = $1, updated_at = now() WHERE id = $2`,
            [visible, liveEventId]
        );
    }

    // Immutable per-event snapshot of the quiz content, zipped positionally
    // against the source quiz's own questions (same order the frontend read
    // them in) so we can keep a join key back to quiz_questions.
    async saveQuestionSnapshot(
        liveEventId: string,
        quizId: string,
        questions: QuestionSnapshotInput[]
    ): Promise<void> {
        const { rows: sourceQuestions } = await pgPool.query<{ id: string }>(
            "SELECT id FROM quiz_questions WHERE quiz_id = $1 ORDER BY display_order",
            [quizId]
        );

        const client = await pgPool.connect();
        try {
            await client.query("BEGIN");
            await client.query("DELETE FROM live_event_questions WHERE live_event_id = $1", [liveEventId]);

            for (let i = 0; i < questions.length; i++) {
                const q = questions[i];
                await client.query(
                    `INSERT INTO live_event_questions (live_event_id, quiz_question_id, question_index, question_text, options)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [liveEventId, sourceQuestions[i]?.id ?? null, i, q.question, JSON.stringify(q.options)]
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

    async addParticipant(liveEventId: string, participantId: string, name?: string): Promise<void> {
        await pgPool.query(
            `INSERT INTO live_participants (live_event_id, participant_id, name)
             VALUES ($1, $2, $3)
             ON CONFLICT (live_event_id, participant_id) DO NOTHING`,
            [liveEventId, participantId, name ?? null]
        );
    }

    // Returns false if this participant already answered this question
    // (unique constraint doubles as the dedup gate — atomic, no separate
    // check-then-set race).
    async recordAnswer(
        liveEventId: string,
        participantId: string,
        questionIndex: number,
        optionIndex: number,
        isCorrect: boolean
    ): Promise<boolean> {
        const { rowCount } = await pgPool.query(
            `INSERT INTO live_responses (live_event_id, participant_id, question_index, option_index, is_correct)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (live_event_id, participant_id, question_index) DO NOTHING`,
            [liveEventId, participantId, questionIndex, optionIndex, isCorrect]
        );
        return (rowCount ?? 0) > 0;
    }

    async getAnswerCountsByOption(
        liveEventId: string,
        questionIndex: number,
        optionCount: number
    ): Promise<number[]> {
        const counts = new Array(optionCount).fill(0);
        const { rows } = await pgPool.query<{ option_index: number; count: string }>(
            `SELECT option_index, COUNT(*) FROM live_responses
             WHERE live_event_id = $1 AND question_index = $2
             GROUP BY option_index`,
            [liveEventId, questionIndex]
        );
        for (const row of rows) {
            if (row.option_index >= 0 && row.option_index < counts.length) {
                counts[row.option_index] = Number(row.count);
            }
        }
        return counts;
    }

    // Ends the event and, if it's linked to a `sessions` row, folds its
    // participants/responses into the generic session_participant/
    // session_attempt/session_response tables the analytics module reads.
    async endEvent(liveEventId: string): Promise<void> {
        const client = await pgPool.connect();
        try {
            await client.query("BEGIN");

            const { rows: eventRows } = await client.query<LiveEventRow>(
                `UPDATE live_events
                 SET status = 'ended', ended_at = now(), updated_at = now()
                 WHERE id = $1 AND status = 'live'
                 RETURNING *`,
                [liveEventId]
            );
            const event = eventRows[0];

            if (event?.session_id) {
                const { rows: totalRows } = await client.query<{ count: string }>(
                    "SELECT COUNT(*) FROM live_event_questions WHERE live_event_id = $1",
                    [liveEventId]
                );
                const totalQuestions = Number(totalRows[0]?.count ?? 0);

                const { rows: participants } = await client.query<{ participant_id: string; name: string | null }>(
                    "SELECT participant_id, name FROM live_participants WHERE live_event_id = $1",
                    [liveEventId]
                );

                for (const participant of participants) {
                    const { rows: participantRows } = await client.query<{ id: string }>(
                        `INSERT INTO session_participant (session_id, display_name)
                         VALUES ($1, $2)
                         RETURNING id`,
                        [event.session_id, participant.name]
                    );
                    const sessionParticipantId = participantRows[0].id;

                    const { rows: correctRows } = await client.query<{ count: string }>(
                        `SELECT COUNT(*) FROM live_responses
                         WHERE live_event_id = $1 AND participant_id = $2 AND is_correct = true`,
                        [liveEventId, participant.participant_id]
                    );
                    const correctCount = Number(correctRows[0]?.count ?? 0);
                    const scorePercentage = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;
                    const passed = scorePercentage >= event.passing_score;

                    const { rows: attemptRows } = await client.query<{ id: string }>(
                        `INSERT INTO session_attempt
                            (session_id, session_participant_id, score_percentage, passed, started_at, completed_at)
                         VALUES ($1, $2, $3, $4, $5, now())
                         RETURNING id`,
                        [event.session_id, sessionParticipantId, scorePercentage, passed, event.started_at]
                    );
                    const attemptId = attemptRows[0].id;

                    const { rows: responses } = await client.query<{
                        question_index: number;
                        is_correct: boolean;
                    }>(
                        `SELECT question_index, is_correct FROM live_responses
                         WHERE live_event_id = $1 AND participant_id = $2`,
                        [liveEventId, participant.participant_id]
                    );

                    for (const response of responses) {
                        const { rows: questionRows } = await client.query<{ quiz_question_id: string | null }>(
                            `SELECT quiz_question_id FROM live_event_questions
                             WHERE live_event_id = $1 AND question_index = $2`,
                            [liveEventId, response.question_index]
                        );
                        const quizQuestionId = questionRows[0]?.quiz_question_id;
                        if (!quizQuestionId) continue; // source question was deleted since — skip, can't attribute

                        await client.query(
                            `INSERT INTO session_response (session_attempt_id, quiz_question_id, is_correct)
                             VALUES ($1, $2, $3)`,
                            [attemptId, quizQuestionId, response.is_correct]
                        );
                    }
                }
            }

            await client.query("COMMIT");
        } catch (err) {
            await client.query("ROLLBACK");
            throw err;
        } finally {
            client.release();
        }
    }
}
