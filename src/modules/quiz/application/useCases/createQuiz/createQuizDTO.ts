import { QuestionDTO } from "../shared/QuestionDTO";

export interface CreateQuizDTO {
    title: string;
    questions?: QuestionDTO[];
}
