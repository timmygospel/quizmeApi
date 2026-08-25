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
    questions: UpdateAssessmentQuestionInputDTO[];
}
