import { OptionDTO } from "./OptionDTO";

export interface QuestionDTO {
    question: string;
    options: OptionDTO[];
}
