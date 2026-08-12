import { QuestionDTO } from "../../../dtos/QuestionDTO";

export interface UpdateSectionInputDTO {
    id?: string;
    name: string;
    questionIds?: string[];
}

export interface UpdateQuizDTO {
    id: string; // ✅ must exist
    title: string;
    questions: {
        id?: string;
        question: string;
        options: { id?: string; text: string; correct: boolean }[];
    }[];
    sections?: UpdateSectionInputDTO[];
}
