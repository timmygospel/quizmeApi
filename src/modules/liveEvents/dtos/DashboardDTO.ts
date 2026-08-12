export interface SessionSummaryDTO {
    sessionId: string;
    eventCode: string;
    title: string;
    status: string;
    startedAt: string;
    endedAt: string | null;
    totalParticipants: number;
    completedParticipants: number;
    completionRate: number;
    averageScore: number | null;
    passRate: number | null;
    passingScore: number;
}

export interface ParticipantRowDTO {
    attemptId: string;
    displayName: string;
    totalScore: number | null;
    passed: boolean | null;
    status: string;
    answeredQuestions: number;
    startedAt: string;
    completedAt: string | null;
}

export interface ParticipantTableDTO {
    rows: ParticipantRowDTO[];
    total: number;
    page: number;
    pageSize: number;
}

export interface QuestionAnalysisDTO {
    questionId: string;
    text: string;
    correctRate: number;
    difficulty: "Easy" | "Medium" | "Hard";
    totalAnswers: number;
}

export interface QuestionAnalysisTableDTO {
    questions: QuestionAnalysisDTO[];
}
