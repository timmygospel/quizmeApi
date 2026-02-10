import { OptionDTO } from "./OptionDTO";

export interface QuestionDTO {
    id?: string;
    question: string;
    options: OptionDTO[];
}
