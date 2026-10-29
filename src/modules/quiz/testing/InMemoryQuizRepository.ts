import { randomUUID } from "crypto";
import { IQuizRepository, QuizUsage } from "../domain/IQuizRepository";
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
    /** Seed per-quiz usage to simulate runs that reference a quiz. */
    public readonly usage = new Map<string, QuizUsage>();

    async findById(id: string): Promise<Quiz | null> {
        return this.quizzes.get(id) ?? null;
    }

    async findAll(options: { includeArchived?: boolean } = {}): Promise<Quiz[]> {
        return [...this.quizzes.values()].filter((q) => options.includeArchived || !q.isArchived);
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

        const archivedAt = this.quizzes.get(id)?.archivedAt ?? null;
        const saved = new Quiz({ id, title: quiz.title, questions, sections, createdAt: quiz.createdAt, archivedAt });
        this.quizzes.set(id, saved);
        return saved;
    }

    async findUsage(id: string): Promise<QuizUsage> {
        return this.usage.get(id) ?? { assessmentSessions: 0, liveKnowledgeChecks: 0, trainingSessions: 0 };
    }

    async setArchived(id: string, archived: boolean): Promise<void> {
        const quiz = this.quizzes.get(id);
        if (!quiz) return;
        const archivedAt = archived ? quiz.archivedAt ?? new Date() : null;
        this.quizzes.set(id, new Quiz({ ...quiz, archivedAt }));
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
