import { OptionDTO } from "./OptionDTO";

export interface QuestionDTO {
    /** Optional client-minted UUID, so a brand-new question can be put in a section in the same save. */
    id?: string;
    question: string;
    options: OptionDTO[];
    /**
     * The question's section. `undefined` = not specified (keep the current
     * assignment), `null` = Unassigned. Only applied when no section in the
     * payload carries `questionIds` — see buildQuizContent.
     */
    sectionId?: string | null;
}
