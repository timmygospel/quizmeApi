import { QuestionDTO } from "./QuestionDTO";

export interface QuizDTO {
    id?: string;
    title: string;
    questions: QuestionDTO[];
    createdAt?: Date;
    updatedAt?: Date;
}
