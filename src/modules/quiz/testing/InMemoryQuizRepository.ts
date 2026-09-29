import { randomUUID } from "crypto";
import { IQuizRepository } from "../domain/IQuizRepository";
import { Quiz } from "../domain/Quiz";
import { Question } from "../domain/Question";
import { Option } from "../domain/Option";

/**
 * Test double for IQuizRepository with PgQuizRepository.save()'s semantics:
 * ids are minted for new quizzes/questions/options/sections, the whole
 * aggregate is replaced on save, and a section's membership is only kept for
 * questions that are part of the saved quiz.
 */
export class InMemoryQuizRepository implements IQuizRepository {
    public readonly quizzes = new Map<string, Quiz>();

    async findById(id: string): Promise<Quiz | null> {
        return this.quizzes.get(id) ?? null;
    }

    async findAll(): Promise<Quiz[]> {
        return [...this.quizzes.values()];
    }

    async save(quiz: Quiz): Promise<Quiz> {
        const id = quiz.id ?? randomUUID();
        const questions = quiz.questions.map(
            (q) =>
                new Question({
                    id: q.id ?? randomUUID(),
                    question: q.question,
                    options: q.options.map((o) => new Option({ id: o.id ?? randomUUID(), text: o.text, correct: o.correct })),
                })
        );
        const questionIds = new Set(quiz.questions.map((q) => q.id).filter(Boolean));
        const sections = quiz.sections.map((s) => ({
            id: s.id ?? randomUUID(),
            name: s.name,
            questionIds: s.questionIds.filter((qid) => questionIds.has(qid)),
        }));

        const saved = new Quiz({ id, title: quiz.title, questions, sections, createdAt: quiz.createdAt });
        this.quizzes.set(id, saved);
        return saved;
    }

    async delete(id: string): Promise<void> {
        this.quizzes.delete(id);
    }

    async findQuestionQuizIds(questionIds: string[]): Promise<Map<string, string>> {
        const owners = new Map<string, string>();
        for (const quiz of this.quizzes.values()) {
            for (const q of quiz.questions) {
                if (q.id && questionIds.includes(q.id)) owners.set(q.id, quiz.id!);
            }
        }
        return owners;
    }

    async findSectionQuizIds(sectionIds: string[]): Promise<Map<string, string>> {
        const owners = new Map<string, string>();
        for (const quiz of this.quizzes.values()) {
            for (const s of quiz.sections) {
                if (s.id && sectionIds.includes(s.id)) owners.set(s.id, quiz.id!);
            }
        }
        return owners;
    }
}
