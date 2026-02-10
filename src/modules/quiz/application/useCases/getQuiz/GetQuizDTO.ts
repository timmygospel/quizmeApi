// src/modules/quiz/application/useCases/getQuiz/GetQuizDTO.ts

export interface OptionDTO {
    text: string;
    correct: boolean;
}

export interface QuestionDTO {
    question: string;
    options: OptionDTO[];
}

export interface QuizDTO {
    id: string;
    title: string;
    questions: QuestionDTO[];
    createdAt?: string;
    updatedAt?: string;
}
