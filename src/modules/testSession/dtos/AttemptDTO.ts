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

export interface StartAttemptResponseDTO extends AttemptDTO {
    questions: AttemptQuestionDTO[];
}

export interface AttemptResponseAckDTO {
    id: string;
    testAttemptId: string;
    assessmentQuestionId: string;
    selectedOptionId: string | null;
    answeredAt: string;
}
