export interface QuestionBankOptionDTO {
    text: string;
    correct: boolean;
}

export interface QuestionBankDTO {
    id?: string;
    question: string;
    options: QuestionBankOptionDTO[];
    categoryId?: string;

    createdAt?: string;
    updatedAt?: string;
}
