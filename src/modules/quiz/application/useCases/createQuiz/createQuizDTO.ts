import { QuestionDTO } from "../shared/QuestionDTO";
import { SectionInputDTO } from "../shared/SectionInputDTO";

export { SectionInputDTO };

export interface CreateQuizDTO {
    title: string;
    questions?: QuestionDTO[];
    sections?: SectionInputDTO[];
}
