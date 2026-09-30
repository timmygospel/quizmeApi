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

export interface ReviewOptionDTO {
    id: string;
    text: string;
    correct: boolean;
}

export interface ReviewQuestionDTO {
    id: string;
    question: string;
    options: ReviewOptionDTO[];
    /** The participant's answer; null = not answered. */
    selectedOptionId: string | null;
    isCorrect: boolean;
}

/**
 * A finished attempt as the participant may see it, filtered by the assessment's result
 * visibility. Fields the participant isn't allowed to see are null (never omitted), and
 * `review` is present only for FULL_REVIEW.
 */
export interface ParticipantResultDTO extends AttemptDTO {
    resultVisibility: "NONE" | "PASS_FAIL" | "SCORE" | "FULL_REVIEW";
    review?: ReviewQuestionDTO[];
}
