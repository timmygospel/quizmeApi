import { Quiz } from "./Quiz";

export interface IQuizRepository {
    findById(id: string): Promise<Quiz | null>;
    findAll(): Promise<Quiz[]>;
    save(quiz: Quiz): Promise<Quiz>;
    delete(id: string): Promise<void>;
}
