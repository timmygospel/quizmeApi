import { randomUUID } from "crypto";
import { PoolClient } from "pg";
import { IQuestionBankRepository } from "../../domain/IQuestionBankRepository";
import { QuestionBankQuestion } from "../../domain/QuestionBankQuestion";
import { QuestionBankMap } from "../../mappers/QuestionBankMap";
import { pgPool } from "../../../../shared/infra/postgres/pgClient";

export class PgQuestionBankRepository implements IQuestionBankRepository {
    async findById(id: string): Promise<QuestionBankQuestion | null> {
        const client = await pgPool.connect();
        try {
            return await this.loadQuestion(client, id);
        } finally {
            client.release();
        }
    }

    async findAll(categoryId?: string): Promise<QuestionBankQuestion[]> {
        const client = await pgPool.connect();
        try {
            const { rows } = categoryId
                ? await client.query(
                      "SELECT id FROM question_bank_questions WHERE category_id = $1 ORDER BY created_at DESC",
                      [categoryId]
                  )
                : await client.query("SELECT id FROM question_bank_questions ORDER BY created_at DESC");

            const questions: QuestionBankQuestion[] = [];
            for (const row of rows) {
                const question = await this.loadQuestion(client, row.id);
                if (question) questions.push(question);
            }
            return questions;
        } finally {
            client.release();
        }
    }

    async save(question: QuestionBankQuestion): Promise<QuestionBankQuestion> {
        const client = await pgPool.connect();
        const questionId = question.id ?? randomUUID();

        try {
            await client.query("BEGIN");

            await client.query(
                `INSERT INTO question_bank_questions (id, question_text, category_id)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (id) DO UPDATE SET
                    question_text = EXCLUDED.question_text,
                    category_id = EXCLUDED.category_id,
                    updated_at = now()`,
                [questionId, question.question, question.categoryId ?? null]
            );

            await client.query("DELETE FROM question_bank_options WHERE question_id = $1", [questionId]);

            const options = question.options;
            for (let i = 0; i < options.length; i++) {
                const o = options[i];
                await client.query(
                    `INSERT INTO question_bank_options (question_id, text, is_correct, display_order)
                     VALUES ($1, $2, $3, $4)`,
                    [questionId, o.text, o.correct, i]
                );
            }

            await client.query("COMMIT");
        } catch (err) {
            await client.query("ROLLBACK");
            throw err;
        } finally {
            client.release();
        }

        const saved = await this.findById(questionId);
        if (!saved) throw new Error("Question not found after save");
        return saved;
    }

    async delete(id: string): Promise<void> {
        await pgPool.query("DELETE FROM question_bank_questions WHERE id = $1", [id]);
    }

    private async loadQuestion(client: PoolClient, id: string): Promise<QuestionBankQuestion | null> {
        const questionRes = await client.query("SELECT * FROM question_bank_questions WHERE id = $1", [id]);
        if (questionRes.rows.length === 0) return null;

        const optionsRes = await client.query(
            "SELECT * FROM question_bank_options WHERE question_id = $1 ORDER BY display_order",
            [id]
        );

        return QuestionBankMap.toDomain({
            question: questionRes.rows[0],
            options: optionsRes.rows,
        });
    }
}
