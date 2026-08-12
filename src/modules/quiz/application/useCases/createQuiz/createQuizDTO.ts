import { QuestionDTO } from "../shared/QuestionDTO";

export interface SectionInputDTO {
    name: string;
    questionIds?: string[];
}

export interface CreateQuizDTO {
    title: string;
    questions?: QuestionDTO[];
    sections?: SectionInputDTO[];
}
