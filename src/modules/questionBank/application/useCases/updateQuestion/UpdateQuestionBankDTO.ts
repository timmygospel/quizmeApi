import { QuestionBankOptionDTO } from "../../../dtos/QuestionBankDTO";

export interface UpdateQuestionBankDTO {
    id: string;
    question: string;
    options: QuestionBankOptionDTO[];
    categoryId?: string;
}
