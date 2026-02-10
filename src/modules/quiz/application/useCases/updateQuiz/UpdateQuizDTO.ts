import { QuestionDTO } from "../../../dtos/QuestionDTO";

export interface UpdateQuizDTO {
    id: string; // ✅ must exist
    title: string;
    questions: {
        question: string;
        options: { text: string; correct: boolean }[];
    }[];
}
