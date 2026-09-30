export interface CreateAssessmentDTO {
    name: string;
    description?: string;
    categoryId?: string | null;
    passMark: number;
    maxAttempts?: number | null;
    durationMinutes?: number | null;
    /** NONE | PASS_FAIL | SCORE | FULL_REVIEW — omitted = SCORE. */
    resultVisibility?: string;
    createdBy: string | null;
}
