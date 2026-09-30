import { randomUUID } from "crypto";
import { PoolClient } from "pg";
import { IQuizRepository } from "../../domain/IQuizRepository";
import { Quiz } from "../../domain/Quiz";
import { QuizMap } from "../../mappers/QuizMap";
import { pgPool } from "../../../../shared/infra/postgres/pgClient";

export class PgQuizRepository implements IQuizRepository {
    async findById(id: string): Promise<Quiz | null> {
        const client = await pgPool.connect();
        try {
            return await this.loadQuiz(client, id);
        } finally {
            client.release();
        }
    }

    async findAll(): Promise<Quiz[]> {
        const client = await pgPool.connect();
        try {
            const { rows } = await client.query("SELECT id FROM quizzes ORDER BY created_at DESC");
            const quizzes: Quiz[] = [];
            for (const row of rows) {
                const quiz = await this.loadQuiz(client, row.id);
                if (quiz) quizzes.push(quiz);
            }
            return quizzes;
        } finally {
            client.release();
        }
    }

    // Updates the quiz in place rather than delete-and-reinsert: existing questions and sections
    // keep their rows (so nothing referencing them — live_event_questions, session_response —
    // is disturbed), new ones are inserted, and only ones left out of the save are deleted.
    // Explicit ids (round-tripped from a prior load, or client-minted) are preserved; items
    // without one get a fresh id here. A deleted section's questions come back Unassigned; a
    // deleted question's recorded answers are kept, unlinked (session_response → ON DELETE SET NULL).
    async save(quiz: Quiz): Promise<Quiz> {
        const client = await pgPool.connect();
        const quizId = quiz.id ?? randomUUID();
        const sectionIds = quiz.sections.map((s) => s.id ?? randomUUID());
        const questionIds = quiz.questions.map((q) => q.id ?? randomUUID());

        try {
            await client.query("BEGIN");

            await client.query(
                `INSERT INTO quizzes (id, title)
                 VALUES ($1, $2)
                 ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, updated_at = now()`,
                [quizId, quiz.title.value]
            );

            // Move every existing row out of the way of the UNIQUE (quiz_id, display_order) and
            // (section_id, section_position) constraints, so rows can be renumbered one at a time
            // below without colliding. Clearing section_id also frees sections for deletion.
            await client.query(
                `UPDATE quiz_questions
                 SET display_order = -1 - display_order, section_id = NULL, section_position = NULL
                 WHERE quiz_id = $1`,
                [quizId]
            );
            await client.query(
                "UPDATE quiz_sections SET display_order = -1 - display_order WHERE quiz_id = $1",
                [quizId]
            );

            await client.query(
                "DELETE FROM quiz_questions WHERE quiz_id = $1 AND NOT (id = ANY($2::uuid[]))",
                [quizId, questionIds]
            );
            await client.query(
                "DELETE FROM quiz_sections WHERE quiz_id = $1 AND NOT (id = ANY($2::uuid[]))",
                [quizId, sectionIds]
            );

            // questionId -> its section and position within that section
            const placement = new Map<string, { sectionId: string; position: number }>();
            for (let i = 0; i < quiz.sections.length; i++) {
                const s = quiz.sections[i];
                const sectionId = sectionIds[i];

                // The WHERE never lets an upsert take over another quiz's section (the use case
                // already rejects those ids; this is the database-level backstop).
                const sectionRes = await client.query(
                    `INSERT INTO quiz_sections (id, quiz_id, name, display_order)
                     VALUES ($1, $2, $3, $4)
                     ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, display_order = EXCLUDED.display_order
                     WHERE quiz_sections.quiz_id = EXCLUDED.quiz_id`,
                    [sectionId, quizId, s.name, i]
                );
                if (sectionRes.rowCount === 0) throw new Error(`Section ${sectionId} belongs to another quiz`);

                s.questionIds.forEach((questionId, position) => placement.set(questionId, { sectionId, position }));
            }

            // Options aren't referenced from anywhere else, so they're simply replaced.
            await client.query("DELETE FROM quiz_question_options WHERE question_id = ANY($1::uuid[])", [questionIds]);

            for (let i = 0; i < quiz.questions.length; i++) {
                const q = quiz.questions[i];
                const questionId = questionIds[i];
                const place = q.id ? placement.get(q.id) : undefined;

                const questionRes = await client.query(
                    `INSERT INTO quiz_questions (id, quiz_id, question_text, display_order, section_id, section_position)
                     VALUES ($1, $2, $3, $4, $5, $6)
                     ON CONFLICT (id) DO UPDATE SET
                         question_text = EXCLUDED.question_text,
                         display_order = EXCLUDED.display_order,
                         section_id = EXCLUDED.section_id,
                         section_position = EXCLUDED.section_position
                     WHERE quiz_questions.quiz_id = EXCLUDED.quiz_id`,
                    [questionId, quizId, q.question.value, i, place?.sectionId ?? null, place?.position ?? null]
                );
                if (questionRes.rowCount === 0) throw new Error(`Question ${questionId} belongs to another quiz`);

                for (let j = 0; j < q.options.length; j++) {
                    const o = q.options[j];
                    const optionId = o.id ?? randomUUID();
                    await client.query(
                        `INSERT INTO quiz_question_options (id, question_id, text, is_correct, display_order)
                         VALUES ($1, $2, $3, $4, $5)`,
                        [optionId, questionId, o.text.value, o.correct, j]
                    );
                }
            }

            await client.query("COMMIT");
        } catch (err) {
            await client.query("ROLLBACK");
            throw err;
        } finally {
            client.release();
        }

        const saved = await this.findById(quizId);
        if (!saved) throw new Error("Quiz not found after save");
        return saved;
    }

    async findQuestionQuizIds(questionIds: string[]): Promise<Map<string, string>> {
        if (questionIds.length === 0) return new Map();
        const { rows } = await pgPool.query<{ id: string; quiz_id: string }>(
            "SELECT id, quiz_id FROM quiz_questions WHERE id = ANY($1::uuid[])",
            [questionIds]
        );
        return new Map(rows.map((r) => [r.id, r.quiz_id]));
    }

    async findSectionQuizIds(sectionIds: string[]): Promise<Map<string, string>> {
        if (sectionIds.length === 0) return new Map();
        const { rows } = await pgPool.query<{ id: string; quiz_id: string }>(
            "SELECT id, quiz_id FROM quiz_sections WHERE id = ANY($1::uuid[])",
            [sectionIds]
        );
        return new Map(rows.map((r) => [r.id, r.quiz_id]));
    }

    async delete(id: string): Promise<void> {
        await pgPool.query("DELETE FROM quizzes WHERE id = $1", [id]);
    }

    private async loadQuiz(client: PoolClient, id: string): Promise<Quiz | null> {
        const quizRes = await client.query("SELECT * FROM quizzes WHERE id = $1", [id]);
        if (quizRes.rows.length === 0) return null;

        const questionsRes = await client.query(
            "SELECT * FROM quiz_questions WHERE quiz_id = $1 ORDER BY display_order",
            [id]
        );
        const questionIds = questionsRes.rows.map((r) => r.id);

        const optionsRes = questionIds.length
            ? await client.query(
                  "SELECT * FROM quiz_question_options WHERE question_id = ANY($1) ORDER BY question_id, display_order",
                  [questionIds]
              )
            : { rows: [] as any[] };

        const sectionsRes = await client.query(
            "SELECT * FROM quiz_sections WHERE quiz_id = $1 ORDER BY display_order",
            [id]
        );

        return QuizMap.toDomain({
            quiz: quizRes.rows[0],
            questions: questionsRes.rows,
            options: optionsRes.rows,
            sections: sectionsRes.rows,
        });
    }
}
