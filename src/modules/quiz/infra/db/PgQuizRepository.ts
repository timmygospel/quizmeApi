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

    // Preserves explicit ids for questions/options/sections (round-tripped
    // from a prior load) — new items get a fresh id minted here, up front,
    // so sections can reference brand-new questions within the same save.
    async save(quiz: Quiz): Promise<Quiz> {
        const client = await pgPool.connect();
        const quizId = quiz.id ?? randomUUID();

        try {
            await client.query("BEGIN");

            await client.query(
                `INSERT INTO quizzes (id, title)
                 VALUES ($1, $2)
                 ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, updated_at = now()`,
                [quizId, quiz.title.value]
            );

            await client.query("DELETE FROM quiz_questions WHERE quiz_id = $1", [quizId]);

            const resolvedQuestionIds: string[] = [];
            for (let i = 0; i < quiz.questions.length; i++) {
                const q = quiz.questions[i];
                const questionId = q.id ?? randomUUID();
                resolvedQuestionIds.push(questionId);

                await client.query(
                    `INSERT INTO quiz_questions (id, quiz_id, question_text, display_order)
                     VALUES ($1, $2, $3, $4)`,
                    [questionId, quizId, q.question.value, i]
                );

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

            await client.query("DELETE FROM quiz_sections WHERE quiz_id = $1", [quizId]);

            for (let i = 0; i < quiz.sections.length; i++) {
                const s = quiz.sections[i];
                const sectionId = s.id ?? randomUUID();

                await client.query(
                    `INSERT INTO quiz_sections (id, quiz_id, name, display_order)
                     VALUES ($1, $2, $3, $4)`,
                    [sectionId, quizId, s.name, i]
                );

                for (const questionId of s.questionIds) {
                    if (resolvedQuestionIds.includes(questionId)) {
                        await client.query(
                            `INSERT INTO quiz_section_questions (section_id, question_id) VALUES ($1, $2)`,
                            [sectionId, questionId]
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

        const saved = await this.findById(quizId);
        if (!saved) throw new Error("Quiz not found after save");
        return saved;
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
        const sectionIds = sectionsRes.rows.map((r) => r.id);

        const sectionQuestionsRes = sectionIds.length
            ? await client.query("SELECT * FROM quiz_section_questions WHERE section_id = ANY($1)", [sectionIds])
            : { rows: [] as any[] };

        return QuizMap.toDomain({
            quiz: quizRes.rows[0],
            questions: questionsRes.rows,
            options: optionsRes.rows,
            sections: sectionsRes.rows,
            sectionQuestions: sectionQuestionsRes.rows,
        });
    }
}
