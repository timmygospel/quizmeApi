export interface TestSessionAudienceDTO {
    locationId: string;
    departmentId: string;
    teamId: string | null;
}

export interface TestSessionDTO {
    id: string;
    assessmentId: string;
    name: string;
    ownerId: string;
    availableFrom: string;
    availableUntil: string;
    timeLimitMinutes: number;
    maxAttempts: number;
    status: string;
    audience: TestSessionAudienceDTO[];
    participantCount?: number;
    createdAt?: string;
    startedAt?: string | null;
    closedAt?: string | null;
    updatedAt?: string;
}

// GET /test-sessions/:id/participants — one row per assigned participant,
// admin/trainer-facing (session.manage), for the Participants tab.
export interface ParticipantRowDTO {
    id: string;
    userId: string;
    name: string;
    location: string | null;
    department: string | null;
    team: string | null;
    status: string;
    assignedAt: string;
    startedAt: string | null;
    completedAt: string | null;
    scorePercentage: number | null;
    passed: boolean | null;
}
