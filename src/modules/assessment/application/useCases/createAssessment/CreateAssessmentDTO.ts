export interface CreateAssessmentDTO {
    name: string;
    description?: string;
    categoryId?: string | null;
    passMark: number;
    maxAttempts?: number | null;
    durationMinutes?: number | null;
    createdBy: string | null;
}
