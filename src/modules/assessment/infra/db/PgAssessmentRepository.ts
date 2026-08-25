import { randomUUID } from "crypto";
import { PoolClient } from "pg";
import { IAssessmentRepository, AssessmentFilters } from "../../domain/IAssessmentRepository";
import { Assessment } from "../../domain/Assessment";
import { AssessmentMap, AssessmentRow, AssessmentQuestionRow, AssessmentOptionRow } from "../../mappers/AssessmentMap";
import { pgPool } from "../../../../shared/infra/postgres/pgClient";

// List load — a derived, always-accurate question count via LEFT JOIN
// rather than trusting assessments.question_count (a Slice-1 stopgap column,
// now superseded). Deliberately doesn't load question bodies: the list view
// never needs them, and doing so here would reintroduce the N+1 PgQuizRepository's
// findAll has for something the UI never renders.
const LIST_SELECT = `
    SELECT
        a.id, a.name, a.description,
        a.category_id, c.name AS category_name,
        COUNT(aq.id)::int AS question_count,
        a.pass_mark, a.max_attempts, a.duration_minutes,
        a.status,
        a.created_by, (u.first_name || ' ' || u.last_name) AS created_by_name,
        a.created_at, a.updated_at
    FROM assessments a
    LEFT JOIN categories c ON c.id = a.category_id
    LEFT JOIN users u ON u.id = a.created_by
    LEFT JOIN assessment_questions aq ON aq.assessment_id = a.id
`;
const LIST_GROUP_BY = "GROUP BY a.id, c.name, u.first_name, u.last_name";

const DETAIL_SELECT = `
    SELECT
        a.id, a.name, a.description,
        a.category_id, c.name AS category_name,
        0 AS question_count,
        a.pass_mark, a.max_attempts, a.duration_minutes,
        a.status,
        a.created_by, (u.first_name || ' ' || u.last_name) AS created_by_name,
        a.created_at, a.updated_at
    FROM assessments a
    LEFT JOIN categories c ON c.id = a.category_id
    LEFT JOIN users u ON u.id = a.created_by
`;

export class PgAssessmentRepository implements IAssessmentRepository {
    async findById(id: string): Promise<Assessment | null> {
        const client = await pgPool.connect();
        try {
            return await this.loadAssessment(client, id);
        } finally {
            client.release();
        }
    }

    async findAll(filters: AssessmentFilters = {}): Promise<Assessment[]> {
        const conditions: string[] = [];
        const params: unknown[] = [];

        if (filters.search) {
            params.push(`%${filters.search}%`);
            conditions.push(`a.name ILIKE $${params.length}`);
        }
        if (filters.status) {
            params.push(filters.status);
            conditions.push(`a.status = $${params.length}`);
        }
        if (filters.categoryId) {
            params.push(filters.categoryId);
            conditions.push(`a.category_id = $${params.length}`);
        }

        const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
        const { rows } = await pgPool.query<AssessmentRow>(
            `${LIST_SELECT} ${whereClause} ${LIST_GROUP_BY} ORDER BY a.created_at DESC`,
            params
        );
        return rows.map((r) => AssessmentMap.toDomain(r));
    }

    async save(assessment: Assessment): Promise<Assessment> {
        if (assessment.id) {
            const client = await pgPool.connect();
            try {
                await client.query("BEGIN");

                await client.query(
                    `UPDATE assessments SET
                        name = $1, description = $2, category_id = $3,
                        pass_mark = $4, max_attempts = $5, duration_minutes = $6,
                        status = $7, updated_at = now()
                     WHERE id = $8`,
                    [
                        assessment.name.value,
                        assessment.description,
                        assessment.categoryId,
                        assessment.passMark,
                        assessment.maxAttempts,
                        assessment.durationMinutes,
                        assessment.status,
                        assessment.id,
                    ]
                );

                // Only UpdateAssessmentUseCase populates `questions` — Create/
                // Duplicate/Archive save an Assessment with it left undefined,
                // so this leaves an assessment's questions untouched for those.
                if (assessment.questions !== undefined) {
                    await client.query("DELETE FROM assessment_questions WHERE assessment_id = $1", [assessment.id]);

                    for (let i = 0; i < assessment.questions.length; i++) {
                        const q = assessment.questions[i];
                        const questionId = q.id ?? randomUUID();

                        await client.query(
                            `INSERT INTO assessment_questions (id, assessment_id, question_text, display_order)
                             VALUES ($1, $2, $3, $4)`,
                            [questionId, assessment.id, q.question.value, i]
                        );

                        for (let j = 0; j < q.options.length; j++) {
                            const o = q.options[j];
                            await client.query(
                                `INSERT INTO assessment_question_options (id, question_id, text, is_correct, display_order)
                                 VALUES ($1, $2, $3, $4, $5)`,
                                [o.id ?? randomUUID(), questionId, o.text.value, o.correct, j]
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

            return (await this.findById(assessment.id))!;
        }

        const { rows } = await pgPool.query(
            `INSERT INTO assessments
                (name, description, category_id, question_count, pass_mark, max_attempts, duration_minutes, status, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING id`,
            [
                assessment.name.value,
                assessment.description,
                assessment.categoryId,
                assessment.questionCount,
                assessment.passMark,
                assessment.maxAttempts,
                assessment.durationMinutes,
                assessment.status,
                assessment.createdBy,
            ]
        );
        return (await this.findById(rows[0].id))!;
    }

    private async loadAssessment(client: PoolClient, id: string): Promise<Assessment | null> {
        const assessmentRes = await client.query<AssessmentRow>(`${DETAIL_SELECT} WHERE a.id = $1`, [id]);
        if (assessmentRes.rows.length === 0) return null;

        const questionsRes = await client.query<AssessmentQuestionRow>(
            "SELECT * FROM assessment_questions WHERE assessment_id = $1 ORDER BY display_order",
            [id]
        );
        const questionIds = questionsRes.rows.map((r) => r.id);

        const optionsRes = questionIds.length
            ? await client.query<AssessmentOptionRow>(
                  "SELECT * FROM assessment_question_options WHERE question_id = ANY($1) ORDER BY question_id, display_order",
                  [questionIds]
              )
            : { rows: [] as AssessmentOptionRow[] };

        return AssessmentMap.toDomainWithQuestions(assessmentRes.rows[0], questionsRes.rows, optionsRes.rows);
    }
}
