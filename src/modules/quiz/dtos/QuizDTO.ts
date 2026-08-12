import { QuestionDTO } from "./QuestionDTO";

export interface SectionDTO {
    id: string;
    name: string;
    questionIds: string[];
}

export interface QuizDTO {
    id?: string;
    title: string;
    questions: QuestionDTO[];
    sections: SectionDTO[];
    createdAt?: Date;
    updatedAt?: Date;
}
