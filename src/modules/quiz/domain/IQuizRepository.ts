import { Quiz } from "./Quiz";

/** How many run records still reference a quiz (each blocks deleting it). */
export interface QuizUsage {
    assessmentSessions: number;
    liveKnowledgeChecks: number;
    trainingSessions: number;
}

export interface IQuizRepository {
    findById(id: string): Promise<Quiz | null>;
    /** Archived quizzes are left out unless includeArchived is set. */
    findAll(options?: { includeArchived?: boolean }): Promise<Quiz[]>;
    save(quiz: Quiz): Promise<Quiz>;
    delete(id: string): Promise<void>;
    findUsage(id: string): Promise<QuizUsage>;
    setArchived(id: string, archived: boolean): Promise<void>;
    /** Owning quiz id for each of the given question ids that exists (any quiz). */
    findQuestionQuizIds(questionIds: string[]): Promise<Map<string, string>>;
    /** Owning quiz id for each of the given section ids that exists (any quiz). */
    findSectionQuizIds(sectionIds: string[]): Promise<Map<string, string>>;
}
