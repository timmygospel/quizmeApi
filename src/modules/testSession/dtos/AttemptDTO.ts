export interface AttemptOptionDTO {
    id: string;
    text: string;
}

export interface AttemptQuestionDTO {
    id: string;
    question: string;
    options: AttemptOptionDTO[];
}

export interface AttemptDTO {
    id: string;
    testSessionId: string;
    attemptNumber: number;
    startedAt: string;
    expiresAt: string;
    submittedAt?: string | null;
    status: string;
    scorePercentage: number | null;
    passed: boolean | null;
}

/** What the participant has saved so far on a question — returned when resuming an attempt. */
export interface SavedResponseDTO {
    questionId: string;
    selectedOptionId: string | null;
    markedForReview: boolean;
}

export interface StartAttemptResponseDTO extends AttemptDTO {
    questions: AttemptQuestionDTO[];
    /** Previously saved answers/flags; empty for a brand-new attempt. */
    responses: SavedResponseDTO[];
    /** True when this call picked up an attempt already in progress rather than starting one. */
    resumed: boolean;
}

export interface AttemptResponseAckDTO {
    id: string;
    testAttemptId: string;
    assessmentQuestionId: string;
    selectedOptionId: string | null;
    answeredAt: string;
}
