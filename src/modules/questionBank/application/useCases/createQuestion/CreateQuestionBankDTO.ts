import { QuestionBankOptionDTO } from "../../../dtos/QuestionBankDTO";

export interface CreateQuestionBankDTO {
    question: string;
    options: QuestionBankOptionDTO[];
    categoryId?: string;
}
