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
