export interface UpdateAssessmentQuestionInputDTO {
    id?: string;
    question: string;
    options: { id?: string; text: string; correct: boolean }[];
}

export interface UpdateAssessmentDTO {
    id: string;
    name: string;
    description?: string;
    categoryId?: string | null;
    passMark: number;
    maxAttempts?: number | null;
    durationMinutes?: number | null;
    /** NONE | PASS_FAIL | SCORE | FULL_REVIEW — omitted = keep the current setting. */
    resultVisibility?: string;
    questions: UpdateAssessmentQuestionInputDTO[];
}
