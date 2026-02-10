import { QuestionBankQuestion } from "./QuestionBankQuestion";

export interface IQuestionBankRepository {
    findById(id: string): Promise<QuestionBankQuestion | null>;
    findAll(categoryId?: string): Promise<QuestionBankQuestion[]>;
    save(question: QuestionBankQuestion): Promise<QuestionBankQuestion>;
    delete(id: string): Promise<void>;
}
