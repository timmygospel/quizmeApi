// src/modules/quiz/application/useCases/getQuiz/GetQuizDTO.ts

export interface OptionDTO {
    id?: string;
    text: string;
    correct: boolean;
}

export interface QuestionDTO {
    id?: string;
    question: string;
    options: OptionDTO[];
}

export interface SectionDTO {
    id: string;
    name: string;
    questionIds: string[];
}

export interface QuizDTO {
    id: string;
    title: string;
    questions: QuestionDTO[];
    sections: SectionDTO[];
    createdAt?: string;
    updatedAt?: string;
}
