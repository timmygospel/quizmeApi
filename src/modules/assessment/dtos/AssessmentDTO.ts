export interface AssessmentDTO {
    id: string;
    name: string;
    description: string;
    categoryId: string | null;
    categoryName: string | null;
    questionCount: number;
    passMark: number;
    maxAttempts: number | null;
    durationMinutes: number | null;
    status: string;
    createdBy: string | null;
    createdByName: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface AssessmentOptionDTO {
    id?: string;
    text: string;
    correct: boolean;
}

export interface AssessmentQuestionDTO {
    id?: string;
    question: string;
    options: AssessmentOptionDTO[];
}

// GET /assessments/:id — the list endpoint returns AssessmentDTO (no
// question bodies, just questionCount); this is the single-assessment
// detail shape the editor page needs.
export interface AssessmentDetailDTO extends AssessmentDTO {
    questions: AssessmentQuestionDTO[];
}
