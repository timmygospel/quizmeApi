import { QuestionDTO } from "../shared/QuestionDTO";
import { SectionInputDTO } from "../shared/SectionInputDTO";

export interface UpdateQuizDTO {
    id: string; // ✅ must exist
    title?: string;
    questions?: QuestionDTO[];
    sections?: SectionInputDTO[];
}
