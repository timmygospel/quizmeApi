import { randomUUID } from "crypto";
import { pgPool } from "../../../../shared/infra/postgres/pgClient";
import { IAttemptRepository } from "../../domain/IAttemptRepository";
import { Attempt, AttemptStatus } from "../../domain/Attempt";
import { AttemptResponse } from "../../domain/AttemptResponse";
import { AttemptMap, AttemptRow, AttemptResponseRow } from "../../mappers/AttemptMap";

export class PgAttemptRepository implements IAttemptRepository {
    async findById(id: string): Promise<Attempt | null> {
        const { rows } = await pgPool.query<AttemptRow>(`SELECT * FROM test_attempts WHERE id = $1`, [id]);
        return rows[0] ? AttemptMap.toDomain(rows[0]) : null;
    }

    async countForParticipant(participantId: string): Promise<number> {
        const { rows } = await pgPool.query<{ count: string }>(
            `SELECT COUNT(*) FROM test_attempts WHERE test_session_participant_id = $1`,
            [participantId]
        );
        return Number(rows[0].count);
    }

    async create(attempt: Attempt): Promise<Attempt> {
        const { rows } = await pgPool.query<AttemptRow>(
            `INSERT INTO test_attempts (
                test_session_id, test_session_participant_id, attempt_number, started_at, expires_at, status
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *`,
            [
                attempt.testSessionId,
                attempt.testSessionParticipantId,
                attempt.attemptNumber,
                attempt.startedAt,
                attempt.expiresAt,
                attempt.status,
            ]
        );
        return AttemptMap.toDomain(rows[0]);
    }

    private async finalize(
        id: string,
        status: AttemptStatus,
        scorePercentage: number,
        passed: boolean,
        submittedAt: Date
    ): Promise<Attempt> {
        // Only an IN_PROGRESS attempt is finalized: expired attempts are also finalized when results are
        // read, so a participant's own submit/save can race with that. Whoever loses gets the row as it is.
        const { rows } = await pgPool.query<AttemptRow>(
            `UPDATE test_attempts SET status = $2, score_percentage = $3, passed = $4, submitted_at = $5
             WHERE id = $1 AND status = 'IN_PROGRESS' RETURNING *`,
            [id, status, scorePercentage, passed, submittedAt]
        );
        if (rows[0]) return AttemptMap.toDomain(rows[0]);
        const current = await this.findById(id);
        if (!current) throw new Error(`Attempt ${id} not found`);
        return current;
    }

    async markSubmitted(id: string, scorePercentage: number, passed: boolean, submittedAt: Date): Promise<Attempt> {
        return this.finalize(id, "SUBMITTED", scorePercentage, passed, submittedAt);
    }

    async markTimedOut(id: string, scorePercentage: number, passed: boolean, submittedAt: Date): Promise<Attempt> {
        return this.finalize(id, "TIMED_OUT", scorePercentage, passed, submittedAt);
    }

    async upsertResponse(
        attemptId: string,
        assessmentQuestionId: string,
        selectedOptionId: string
    ): Promise<AttemptResponse | null> {
        const { rows: optionRows } = await pgPool.query<{ is_correct: boolean }>(
            `SELECT is_correct FROM assessment_question_options WHERE id = $1 AND question_id = $2`,
            [selectedOptionId, assessmentQuestionId]
        );
        if (optionRows.length === 0) return null;
        const isCorrect = optionRows[0].is_correct;

        const { rows } = await pgPool.query<AttemptResponseRow>(
            `INSERT INTO test_attempt_responses (id, test_attempt_id, assessment_question_id, selected_option_id, is_correct, answered_at)
             VALUES ($1, $2, $3, $4, $5, now())
             ON CONFLICT (test_attempt_id, assessment_question_id)
             DO UPDATE SET selected_option_id = EXCLUDED.selected_option_id, is_correct = EXCLUDED.is_correct, answered_at = now()
             RETURNING *`,
            [randomUUID(), attemptId, assessmentQuestionId, selectedOptionId, isCorrect]
        );
        return AttemptMap.responseToDomain(rows[0]);
    }

    async findResponses(attemptId: string): Promise<AttemptResponse[]> {
        const { rows } = await pgPool.query<AttemptResponseRow>(
            `SELECT * FROM test_attempt_responses WHERE test_attempt_id = $1`,
            [attemptId]
        );
        return rows.map((r) => AttemptMap.responseToDomain(r));
    }

    async findInProgressForParticipant(participantId: string): Promise<Attempt | null> {
        const { rows } = await pgPool.query<AttemptRow>(
            `SELECT * FROM test_attempts
             WHERE test_session_participant_id = $1 AND status = 'IN_PROGRESS'
             ORDER BY attempt_number DESC LIMIT 1`,
            [participantId]
        );
        return rows[0] ? AttemptMap.toDomain(rows[0]) : null;
    }

    async setMarkedForReview(attemptId: string, assessmentQuestionId: string, marked: boolean): Promise<boolean> {
        // The question must belong to the assessment this attempt's session delivers.
        const { rows } = await pgPool.query(
            `INSERT INTO test_attempt_responses (id, test_attempt_id, assessment_question_id, marked_for_review)
             SELECT $1, ta.id, aq.id, $4
             FROM test_attempts ta
             JOIN test_sessions ts ON ts.id = ta.test_session_id
             JOIN assessment_questions aq ON aq.assessment_id = ts.assessment_id AND aq.id = $3
             WHERE ta.id = $2
             ON CONFLICT (test_attempt_id, assessment_question_id)
             DO UPDATE SET marked_for_review = EXCLUDED.marked_for_review
             RETURNING id`,
            [randomUUID(), attemptId, assessmentQuestionId, marked]
        );
        return rows.length > 0;
    }

    async findExpiredInProgress(testSessionIds: string[], now: Date): Promise<Attempt[]> {
        if (testSessionIds.length === 0) return [];
        const { rows } = await pgPool.query<AttemptRow>(
            `SELECT * FROM test_attempts
             WHERE test_session_id = ANY($1::uuid[]) AND status = 'IN_PROGRESS' AND expires_at <= $2`,
            [testSessionIds, now]
        );
        return rows.map((r) => AttemptMap.toDomain(r));
    }
}
