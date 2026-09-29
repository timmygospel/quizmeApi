import { Quiz } from "./Quiz";

export interface IQuizRepository {
    findById(id: string): Promise<Quiz | null>;
    findAll(): Promise<Quiz[]>;
    save(quiz: Quiz): Promise<Quiz>;
    delete(id: string): Promise<void>;
    /** Owning quiz id for each of the given question ids that exists (any quiz). */
    findQuestionQuizIds(questionIds: string[]): Promise<Map<string, string>>;
    /** Owning quiz id for each of the given section ids that exists (any quiz). */
    findSectionQuizIds(sectionIds: string[]): Promise<Map<string, string>>;
}
